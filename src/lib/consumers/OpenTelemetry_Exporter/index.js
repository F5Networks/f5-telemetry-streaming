/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const grpc = require('@grpc/grpc-js');
const GrpcMetricExporter = require('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter;
const JsonMetricExporter = require('@opentelemetry/exporter-metrics-otlp-http').OTLPMetricExporter;
const MeterProvider = require('@opentelemetry/sdk-metrics').MeterProvider;
const MetricReader = require('@opentelemetry/sdk-metrics').MetricReader;
const ProtobufMetricExporter = require('@opentelemetry/exporter-metrics-otlp-proto').OTLPMetricExporter;
const OTELApi = require('@opentelemetry/api');

const httpUtil = require('../../utils/http');
const metricsUtil = require('../shared/metricsUtil');
const miscUtil = require('../../utils/misc');

const EVENT_TYPES = require('../../constants').EVENT_TYPES;

// required for gRPC
require('../shared/http2patch');

/**
 * REQUIREMENT: min. node.js version - 8.11.1
 */

const getSslConfig = (config) => {
    if (config.useSSL || config.protocol === 'https') {
        return {
            ca: config.rootCertificate ? Buffer.from(config.rootCertificate) : null,
            key: config.privateKey ? Buffer.from(config.privateKey) : null,
            cert: config.clientCertificate ? Buffer.from(config.clientCertificate) : null
        };
    }
    return {};
};

const getHttpsAgentKeepAlive = (config) => !!(config.allowSelfSignedCert || config.rootCertificate
    || config.privateKey || config.clientCertificate);

const getExporterHttpConfig = (config) => ({
    url: `${config.protocol}://${config.host}:${config.port}${config.metricsPath || ''}`,
    headers: httpUtil.processHeaders(config.headers),
    // 'httpAgentOptions' ignored when 'keepAlive' set to 'false', will be fixed in future TS versions
    keepAlive: getHttpsAgentKeepAlive(config),
    httpAgentOptions: Object.assign({
        rejectUnauthorized: !config.allowSelfSignedCert
    }, getSslConfig(config))
});

const createGRPCExporter = (config) => {
    const sslConf = getSslConfig(config);
    const credentials = config.useSSL
        ? grpc.credentials.createSsl(sslConf.ca, sslConf.key, sslConf.cert)
        : grpc.credentials.createInsecure();

    if (typeof credentials.connectionOptions === 'object') {
        credentials.connectionOptions.rejectUnauthorized = !config.allowSelfSignedCert;
    }
    return new GrpcMetricExporter({
        credentials,
        metadata: grpc.Metadata.fromHttp2Headers(httpUtil.processHeaders(config.headers)),
        url: `${config.host}:${config.port}`
    });
};

const createJsonExporter = (config) => new JsonMetricExporter(getExporterHttpConfig(config));
const createProtobufExporter = (config) => new ProtobufMetricExporter(getExporterHttpConfig(config));

const createMetricExporter = (config) => {
    if (config.exporter === 'grpc') {
        return createGRPCExporter(config);
    }
    if (config.exporter === 'json') {
        return createJsonExporter(config);
    }
    return createProtobufExporter(config);
};

// OpenTelemetry metics must match regex: /^[a-z][a-z0-9_.-]*$/i
// However, the Prometheus exporter will silently convert invalid characters to an '_', so use Prometheus regex
const METRIC_NAME_REGEX = /[^a-zA-Z0-9_:]+/g;

// https://github.com/nodejs/node/issues/17893
const PERF_HOOKS_BUG_EXIST = miscUtil.compareVersionStrings(process.version.substring(1), '<', '8.12.0');

const NANOSECOND_DIGITS = 9;
// eslint-disable-next-line no-restricted-properties
const SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);

/**
 * Convert timestamp in milliseconds to HR timestamp
 *
 * @param {integer} timeMillis - time in milliseconds
 *
 * @returns {Array<Integer>} HR timestamp
 */
function toHighResolutionTimestamp(timeMillis) {
    const timeSeconds = timeMillis / 1000;
    const seconds = Math.trunc(timeSeconds);
    // Round sub-nanosecond accuracy to nanosecond.
    const nanos = Number((timeSeconds - seconds).toFixed(NANOSECOND_DIGITS)) * SECOND_TO_NANOSECONDS;
    return [seconds, nanos];
}

/**
 * Custom Metric Reader class
 */
class CustomMetricReader extends MetricReader {
    /**
     * Constructor
     *
     * @param {object} options - options
     * @param {Object} options.exporter - metrics exporter
     * @param {Array<Integer>} [options.timestamp] - high resolution timestamp [seconds, nanoseconds]
     */
    constructor(options) {
        super();
        this._exporter = options.exporter;
        this._metricTimestamp = options.timestamp;

        let fixMetricsTimestamp = () => {};
        if (PERF_HOOKS_BUG_EXIST) {
            fixMetricsTimestamp = (metrics) => {
                metrics
                    .scopeMetrics[0]
                    .metrics.forEach((metric) => metric
                        .dataPoints.forEach((dataPoint) => {
                            dataPoint.startTime = this._metricTimestamp.slice();
                            dataPoint.endTime = this._metricTimestamp.slice();
                        }));
            };
        }
        Object.defineProperty(this, 'fixMetricsTimestamp', { value: fixMetricsTimestamp });
    }

    _export() {
        return this.collect()
            .then((ret) => new Promise((resolve, reject) => {
                this.fixMetricsTimestamp(ret.resourceMetrics);
                this._exporter.export(ret.resourceMetrics, (result) => {
                    if (result.code !== 0) {
                        reject(result.error || new Error(`CustomMetricReader: metrics export failed (error ${result.error})`));
                    } else {
                        resolve();
                    }
                });
            }));
    }

    onForceFlush() {
        return this._export()
            .then(() => this._exporter.forceFlush());
    }

    onShutdown() {
        return this._exporter.shutdown();
    }

    selectAggregationTemporality(instrumentType) {
        return this._exporter.selectAggregationTemporality(instrumentType);
    }
}

/**
 * Custom Log Handler to pass to the OpenTelemetry API
 * Implements @opentelemetry/api.DiagLogger interface
 */
class LogHandler {
    /**
     * Constructor
     *
     * @param {Object} logger   - Telemetry Streaming logger object
     */
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Handle an 'error' message and re-route to Telemetry Streaming logger
     *
     * @param {Object}  msg             - Error message object
     * @param {String}  [msg.message]   - Error message string
     */
    error(msg) {
        let message;
        try {
            message = JSON.parse(msg).message;
        } catch (_) {
            message = msg;
        }
        this.logger.error(`error: ${message}`);
    }

    warn() {}

    info() {}

    /**
     * Handle a 'debug' message and re-route to Telemetry Streaming logger
     *
     * @param {String} msg  - Debug message
     */
    debug(msg) {
        if (msg === 'statusCode: 200' || msg === 'Objects sent') {
            this.logger.verbose('success');
        }
    }

    verbose() {}
}

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const eventType = context.event.type;
    const boolsToMetrics = context.config.convertBooleansToMetrics || false;

    // We cannot process ihealth/syslog/raw/event data, so don't even try.
    // Other event types may not contain metrics, but handle later
    const eventsToSkip = [
        EVENT_TYPES.SYSLOG_EVENT, EVENT_TYPES.RAW_EVENT, EVENT_TYPES.EVENT_LISTENER, EVENT_TYPES.IHEALTH_POLLER
    ];
    if (eventsToSkip.indexOf(eventType) > -1) {
        context.logger.verbose('Event known to not contain metrics, skipping');
        return Promise.resolve();
    }

    const metrics = createMetrics(context.event.data, { boolsToMetrics });
    if (Object.keys(metrics).length === 0) {
        context.logger.verbose('Event did not contain any metrics, skipping');
        return Promise.resolve();
    }

    OTELApi.diag.setLogger(new LogHandler(context.logger), OTELApi.DiagLogLevel.ALL);

    const exporter = createMetricExporter(context.config);

    // Register the meter - used to manage/collect/store metrics
    const meterProvider = new MeterProvider({});
    meterProvider.addMetricReader(new CustomMetricReader({
        exporter,
        timestamp: toHighResolutionTimestamp(Date.now())
    }));

    const meter = meterProvider.getMeter('telemetry-streaming');

    if (context.tracer) {
        context.tracer.write(metrics);
    }

    // Create an 'UpDownCounter for all metrics, which:
    //  - allows for values to be incremented/decremented
    //  - corresponds to a 'gauge' in Prometheus metrics
    Object.keys(metrics).forEach((metricName) => {
        const metric = metrics[metricName];
        const counter = meter.createUpDownCounter(metricName, { description: metric.description });
        metric.measurements.forEach((measurement) => {
            counter.add(measurement.value, measurement.tags);
        });
    });

    // Shut down the meter, so it does not publish on its internal interval
    // Note: The meter.shutdown() function also calls the controller.shutdown() function,
    //  which then calls its own private _collect() function; so don't need to explicitly call .collect()
    return meterProvider.forceFlush()
        .catch((err) => context.logger.exception('Error on attempt to send metrics:', err))
        .then(() => meterProvider.shutdown())
        .catch(() => Promise.resolve());
};

/**
 * Convert Telemetry Streaming data into a collection of OpenTelemetry compatible metrics
 *
 * @param {Object}  data                    - Telemetry Streaming metric data
 * @param {Object}  [opts]                  - Options for creating metrics
 * @param {Boolean} [opts.boolsToMetrics]   - Whether to convert booleans values to metrics
 */
function createMetrics(data, opts) {
    opts = opts || {};
    const otelMetrics = {};

    metricsUtil.findMetricsAndTags(data, {
        collectTags: true,
        excludeNameFromPath: true,
        parseMetrics: true,
        boolsToMetrics: opts.boolsToMetrics,
        onMetric: (metricPath, value, tags) => {
            if (typeof tags.port === 'number') {
                tags.port = `${tags.port}`;
            }
            // ignore timestamps and intervals
            if (metricPath[metricPath.length - 1].indexOf('imestamp') === -1
                && metricPath[metricPath.length - 1].indexOf('nterval') === -1) {
                const formatedMetricName = buildMetricName(metricPath);

                // Store and re-use meters that have the same metric name - labels/tags applied later
                if (typeof otelMetrics[formatedMetricName] === 'undefined') {
                    otelMetrics[formatedMetricName] = {
                        description: metricPath.join('.'),
                        measurements: []
                    };
                }
                otelMetrics[formatedMetricName].measurements.push({
                    tags,
                    value
                });
            }
        }
    });

    return otelMetrics;
}

/**
 * Builds metric name from path.
 *
 * @param {Array<string>} mpath - metric' path
 *
 * @returns {string} metric name
 */
function buildMetricName(mpath) {
    return mpath.join('_').replace(METRIC_NAME_REGEX, '_');
}
