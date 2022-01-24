/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
/**
 * THIS IS EXPERIMENTAL VERSION OF DATA DOG CONSUMER. IT MIGHT CRASH,
 * WORK NOT AS YOU EXPECTING AND SUBJECT TO CHANGE IN A FUTURE
 */

'use strict';

const zlib = require('zlib');

const DEFAULT_HOSTNAME = require('../../constants').DEFAULT_HOSTNAME;
const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const metricsUtil = require('../shared/metricsUtil');
const requestsUtil = require('../../utils/requests');

const DATA_DOG_METRIC_TYPE = 'gauge';
const DATA_DOG_REGIONAL_GATEWAYS = {
    US1: {
        LOGS_GATEWAY: 'https://http-intake.logs.datadoghq.com/v1/input',
        METRICS_GATEWAY: 'https://api.datadoghq.com/api/v1/series'
    },
    US3: {
        LOGS_GATEWAY: 'https://http-intake.logs.us3.datadoghq.com/v1/input',
        METRICS_GATEWAY: 'https://api.us3.datadoghq.com/api/v1/series'
    },
    EU1: {
        LOGS_GATEWAY: 'https://http-intake.logs.datadoghq.eu/v1/input',
        METRICS_GATEWAY: 'https://api.datadoghq.eu/api/v1/series'
    },
    'US1-FED': {
        LOGS_GATEWAY: 'https://http-intake.logs.ddog-gov.com/v1/input',
        METRICS_GATEWAY: 'https://api.ddog-gov.com/api/v1/series'
    }
};

/**
 * Get the correct DataDog Gateway URL for the provided DataDog region and telemetry type
 *
 * @param {String} region   - DataDog region
 * @param {String} type     - Telemetry type (metrics or log)
 *
 * @returns {String}    The correct DataDog Gateway URL to send telemetry to
 */
const getDataDogGateway = (region, type) => (
    type === 'log' ? DATA_DOG_REGIONAL_GATEWAYS[region].LOGS_GATEWAY : DATA_DOG_REGIONAL_GATEWAYS[region].METRICS_GATEWAY
);

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    /**
     * Links for more info:
     * - https://docs.datadoghq.com/developers/guide/what-best-practices-are-recommended-for-naming-metrics-and-tags/
     * - https://docs.datadoghq.com/api/latest/logs/#send-logs
     * - https://docs.datadoghq.com/api/latest/metrics/#submit-metrics
     */
    const data = context.event.data;
    const eventType = context.event.type;
    const hostname = (data.system && data.system.hostname) || data.hostname || DEFAULT_HOSTNAME;
    const interval = (data.telemetryServiceInfo && data.telemetryServiceInfo.pollingInterval) || undefined;
    const ddService = context.config.service;
    const ddRegion = context.config.region;
    const metricPrefix = context.config.metricPrefix ? `${context.config.metricPrefix.join('.')}.` : '';
    const boolsToMetrics = context.config.convertBooleansToMetrics || false;
    const customTags = (context.config.customTags || []).reduce((result, tag) => {
        result[tag.name] = tag.value;
        return result;
    }, {});
    // for now use current time, ideally should try to fetch it from event data
    const timestamp = Date.now() / 1000;

    let ddData;
    let ddType;

    if (eventType === EVENT_TYPES.EVENT_LISTENER || eventType === EVENT_TYPES.SYSLOG_EVENT) {
        ddType = 'log';
        ddData = {
            ddsource: context.event.type,
            // usually there is nothing along this data that can be used as a tag
            ddtags: buildTags(Object.assign({ telemetryEventCategory: eventType }, customTags), true),
            hostname,
            message: data.data,
            service: ddService
        };
    } else {
        ddType = 'metrics';
        ddData = {
            series: []
        };
        metricsUtil.findMetricsAndTags(data, {
            collectTags: true,
            excludeNameFromPath: true,
            parseMetrics: true,
            boolsToMetrics,
            onMetric: (metricPath, metricValue, metricTags) => {
                // ignore timestamps and intervals
                if (metricPath[metricPath.length - 1].indexOf('imestamp') === -1
                    && metricPath[metricPath.length - 1].indexOf('nterval') === -1) {
                    ddData.series.push({
                        host: hostname,
                        interval,
                        metric: buildMetricName(metricPrefix, metricPath),
                        points: [[timestamp, metricValue]],
                        tags: buildTags(Object.assign(metricTags, customTags)),
                        type: DATA_DOG_METRIC_TYPE
                    });
                }
            }
        });
        if (ddData.series.length === 0) {
            ddData = null;
        }
    }
    if (!ddData) {
        /**
         * Looks like no metrics were found, then let's
         * transform this event into log message and attach
         * all possible tags to it
         * Ex: LTM data
         */
        let ddtags = { telemetryEventCategory: eventType };
        metricsUtil.findMetricsAndTags(data, {
            collectTags: true,
            maxDepth: 1,
            onTags: (metricPath, metricTags) => {
                ddtags = Object.assign(ddtags, metricTags);
            }
        });

        ddType = 'log';
        ddData = {
            ddsource: context.event.type,
            ddtags: buildTags(Object.assign(ddtags, customTags), true),
            hostname,
            message: JSON.stringify(data),
            service: ddService
        };
    }

    if (context.tracer) {
        context.tracer.write({
            url: getDataDogGateway(ddRegion, ddType),
            data: ddData
        });
    }

    const headers = {
        'Content-Type': 'application/json',
        'DD-API-KEY': context.config.apiKey
    };
    const needGzip = context.config.compressionType === 'gzip';
    let gzipPromise = Promise.resolve(ddData);

    if (needGzip) {
        const encoding = ddType === 'log' ? 'gzip' : 'deflate';
        const zlibMeth = ddType === 'log' ? zlib.gzip : zlib.deflate;

        Object.assign(headers, {
            'Accept-Encoding': encoding,
            'Content-Encoding': encoding
        });
        gzipPromise = gzipPromise.then((payload) => new Promise((resolve, reject) => {
            zlibMeth.call(zlib, JSON.stringify(payload), (err, buffer) => {
                if (!err) {
                    resolve(buffer);
                } else {
                    reject(err);
                }
            });
        }));
    }

    return gzipPromise.then((payload) => requestsUtil.makeRequest({
        body: payload,
        expectedResponseCode: [200, 202],
        fullURI: getDataDogGateway(ddRegion, ddType),
        headers,
        json: !needGzip,
        method: 'POST'
    }))
        .then(() => {
            context.logger.debug('success');
        })
        .catch((err) => {
            context.logger.error(`error: ${err.message ? err.message : err}`);
        });
};

/**
 * Builds metric name from metric prefix and the metric path
 *
 * @param {Array<string>} metricPrefix  - prefix for each metric name
 * @param {Array<string>} metricPath    - metric path
 *
 * @returns {string} metric name
 */
function buildMetricName(metricPrefix, metricPath) {
    return `${metricPrefix}${metricPath.join('.')}`;
}

/**
 * Builds metric tags
 *
 * @param {object} tags - metric tags
 * @param {boolean} [joinAll = false] - join all tags into a string
 *
 * @returns {Array<string> | string} tags
 */
function buildTags(tags, joinAll) {
    tags = Object.keys(tags).map((key) => `${key}:${tags[key]}`);
    if (joinAll) {
        tags = tags.join(',');
    }
    return tags;
}
