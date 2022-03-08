/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const MeterProvider = require('@opentelemetry/sdk-metrics-base').MeterProvider;
const OTLPMetricExporter = require('@opentelemetry/exporter-metrics-otlp-proto').OTLPMetricExporter;
const otelApi = require('@opentelemetry/api');

const metricsUtil = require('../shared/metricsUtil');
const httpUtil = require('../shared/httpUtil');

const EVENT_TYPES = require('../../constants').EVENT_TYPES;

// OpenTelemetry metics must match regex: /^[a-z][a-z0-9_.-]*$/i
// However, the Prometheus exporter will silently convert invalid characters to an '_', so use Prometheus regex
const METRIC_NAME_REGEX = /[^a-zA-Z0-9_:]+/g;

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
        if (msg === 'statusCode: 200') {
            this.logger.debug('success');
        }
    }

    verbose() {}
}

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const eventType = context.event.type;
    const host = context.config.host;
    const port = context.config.port;
    const metricsPath = context.config.metricsPath || '';
    const headers = httpUtil.processHeaders(context.config.headers); // no defaults - provide all headers needed
    const boolsToMetrics = context.config.convertBooleansToMetrics || false;

    // We cannot process ihealth/syslog/raw/event data, so don't even try.
    // Other event types may not contain metrics, but handle later
    const eventsToSkip = [
        EVENT_TYPES.SYSLOG_EVENT, EVENT_TYPES.RAW_EVENT, EVENT_TYPES.EVENT_LISTENER, EVENT_TYPES.IHEALTH_POLLER
    ];
    if (eventsToSkip.indexOf(eventType) > -1) {
        context.logger.debug('Event known to not contain metrics, skipping');
        return Promise.resolve();
    }

    const metrics = createMetrics(context.event.data, { boolsToMetrics });
    if (Object.keys(metrics).length === 0) {
        context.logger.debug('Event did not contain any metrics, skipping');
        return Promise.resolve();
    }

    otelApi.diag.setLogger(new LogHandler(context.logger), otelApi.DiagLogLevel.ALL);

    const exporter = new OTLPMetricExporter({
        url: `http://${host}:${port}${metricsPath}`,
        headers,
        keepAlive: false
    });
    // Register the meter - used to manage/collect/store metrics
    const meter = new MeterProvider({
        exporter,
        interval: 60 * 1000 // give us 60s to initialize/set metric set
    }).getMeter('telemetry-streaming');

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
            counter.bind(measurement.tags).add(measurement.value);
        });
    });

    // Shut down the meter, so it does not publish on its internal interval
    // Note: The meter.shutdown() function also calls the controller.shutdown() function,
    //  which then calls its own private _collect() function; so don't need to explicitly call .collect()
    return meter.shutdown()
        .then(() => Promise.resolve())
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
