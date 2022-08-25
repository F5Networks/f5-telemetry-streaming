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

const https = require('https');
const zlib = require('zlib');

const DEFAULT_HOSTNAME = require('../../constants').DEFAULT_HOSTNAME;
const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const httpUtil = require('../shared/httpUtil');
const metricsUtil = require('../shared/metricsUtil');
const miscUtil = require('../../utils/misc');
const promiseUtil = require('../../utils/promise');

const DATA_DOG_API_ENDPOINTS = {
    LOGS: '/api/v2/logs',
    METRICS: '/api/v2/series'
};
const DATA_DOG_MAX_CHUNK_SIZE = 500 * 1000; // 512 KB
const DATA_DOG_MAX_GZIP_CHUNK_SIZE = 5 * 1000 * 1000; // 5 MB
const DATA_DOG_METRIC_TYPE = 3;
const DATA_DOG_PORT = 443;
const DATA_DOG_PROTOCOL = 'https';
const DATA_DOG_REGIONAL_GATEWAYS = {
    US1: {
        LOGS: 'http-intake.logs.datadoghq.com',
        METRICS: 'api.datadoghq.com'
    },
    US3: {
        LOGS: 'http-intake.logs.us3.datadoghq.com',
        METRICS: 'api.us3.datadoghq.com'
    },
    EU1: {
        LOGS: 'http-intake.logs.datadoghq.eu',
        METRICS: 'api.datadoghq.eu'
    },
    'US1-FED': {
        LOGS: 'http-intake.logs.ddog-gov.com',
        METRICS: 'api.ddog-gov.com'
    }
};

/**
 * Compress data
 *
 * @param {string} zlibMethod - method name from 'zlib'
 * @param {string} data - data to compress
 *
 * @returns {Promise<Buffer>} resolved with compressed data
 */
const compressData = (zlibMethod, data) => new Promise((resolve, reject) => {
    zlib[zlibMethod](data, (err, buffer) => {
        if (err) {
            reject(err);
        } else {
            resolve(buffer);
        }
    });
});

/**
 * Get function to compress data
 *
 * @param {string} type - DataDog data type
 *
 * @returns {function(data):Promise<Buffer>} function
 */
const getCompressionFunc = (type) => compressData.bind(null, type === 'log' ? 'gzip' : 'deflate');

/**
 * Get the correct DataDog Gateway host for the provided DataDog region and  telemetry type
 *
 * @param {string} region - DataDog region
 * @param {string} type - Telemetry type (metrics or log)
 *
 * @returns {string} the correct DataDog Gateway host to send telemetry to
 */
const getDataDogHost = (region, ddType) => DATA_DOG_REGIONAL_GATEWAYS[region][ddType === 'log' ? 'LOGS' : 'METRICS'];

/**
 * Get the correct DataDog API endpoint for the provided telemetry type
 *
 * @param {string} type - Telemetry type (metrics or log)
 *
 * @returns {string} rhe correct DataDog API endpoint to send telemetry to
 */
const getDataDogEndpoint = (type) => (
    type === 'log'
        ? DATA_DOG_API_ENDPOINTS.LOGS
        : DATA_DOG_API_ENDPOINTS.METRICS
);

/**
 * Wrap chunks
 *
 * @param {miscUtil.Chunks} chunks - chunks of data
 * @param {string} ddType - DataDog data type
 *
 * @returns {Array<string>} wrapped chunks of data
 */
const wrapChunks = (chunks, ddType) => {
    chunks = chunks.getAll();
    if (ddType === 'log') {
        return chunks[0];
    }
    return chunks.map((c) => `{"series":[${c.join('')}]}`);
};

/**
 * Fetch custom options for HTTP transport from config
 *
 * @param {Array} customOpts - options from config
 *
 * @returns {Object}
 */
const fetchHttpCustomOpts = (customOpts) => {
    const allowedKeys = [
        'keepAlive',
        'keepAliveMsecs',
        'maxSockets',
        'maxFreeSockets'
    ];
    const ret = {};
    customOpts.filter((opt) => allowedKeys.indexOf(opt.name) !== -1)
        .forEach((opt) => {
            ret[opt.name] = opt.value;
        });
    return ret;
};

const httpAgentsMap = {};
const createHttpAgentOptsKey = (opts) => {
    const keys = Object.keys(opts);
    keys.sort();
    return JSON.stringify(keys.map((k) => [k, opts[k]]));
};

const getHttpAgent = (config) => {
    const customOpts = fetchHttpCustomOpts(config.customOpts || []);
    const optsKey = createHttpAgentOptsKey(customOpts);
    if (!httpAgentsMap[config.id] || httpAgentsMap[config.id].key !== optsKey) {
        httpAgentsMap[config.id] = {
            agent: new https.Agent(Object.assign({}, customOpts)),
            key: optsKey
        };
    }
    return httpAgentsMap[config.id].agent;
};

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
    const needGzip = context.config.compressionType === 'gzip';
    const customTags = (context.config.customTags || []).reduce((result, tag) => {
        result[tag.name] = tag.value;
        return result;
    }, {});
    const httpAgentOpts = fetchHttpCustomOpts(context.config.customOpts || []);
    // for now use current time, ideally should try to fetch it from event data
    const timestamp = Math.floor(Date.now() / 1000);
    const maxChunkSize = needGzip ? DATA_DOG_MAX_GZIP_CHUNK_SIZE : DATA_DOG_MAX_CHUNK_SIZE;
    const chunks = new miscUtil.Chunks({
        maxChunkSize,
        serializer(d) {
            d = JSON.stringify(d);
            return `${this.currentChunkSize && (this.currentChunkSize + d.length <= maxChunkSize) ? ',' : ''}${d}`;
        }
    });
    let allowSelfSignedCert = false;
    if (!miscUtil.isObjectEmpty(context.config.proxy) && typeof context.config.proxy.allowSelfSignedCert !== 'undefined') {
        allowSelfSignedCert = context.config.proxy.allowSelfSignedCert;
    }

    let ddType;

    if (eventType === EVENT_TYPES.EVENT_LISTENER || eventType === EVENT_TYPES.SYSLOG_EVENT) {
        ddType = 'log';
        chunks.add({
            ddsource: context.event.type,
            // usually there is nothing along this data that can be used as a tag
            ddtags: buildTags(Object.assign({ telemetryEventCategory: eventType }, customTags), true),
            hostname,
            message: data.data,
            service: ddService
        });
    } else {
        const defaultTags = Object.assign({}, customTags, {
            host: hostname
        });
        ddType = 'metrics';
        metricsUtil.findMetricsAndTags(data, {
            collectTags: true,
            excludeNameFromPath: true,
            parseMetrics: true,
            boolsToMetrics,
            onMetric: (metricPath, metricValue, metricTags) => {
                // ignore timestamps and intervals
                if (metricPath[metricPath.length - 1].indexOf('imestamp') === -1
                    && metricPath[metricPath.length - 1].indexOf('nterval') === -1) {
                    chunks.add({
                        interval,
                        metric: buildMetricName(metricPrefix, metricPath),
                        points: [{
                            timestamp,
                            value: metricValue
                        }],
                        tags: buildTags(Object.assign(metricTags, defaultTags)),
                        type: DATA_DOG_METRIC_TYPE
                    });
                }
            }
        });
    }
    if (chunks.totalSize === 0) {
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
        chunks.add({
            ddsource: context.event.type,
            ddtags: buildTags(Object.assign(ddtags, customTags), true),
            hostname,
            message: JSON.stringify(data),
            service: ddService
        });
    }

    const ddData = wrapChunks(chunks, ddType);

    if (context.tracer) {
        context.tracer.write({
            data: ddData,
            host: getDataDogHost(ddRegion),
            httpAgentOpts,
            type: ddType,
            uri: getDataDogEndpoint(ddType)
        });
    }

    const headers = {
        'Content-Type': 'application/json',
        'DD-API-KEY': context.config.apiKey
    };
    let compressDataFn;
    if (needGzip) {
        const encoding = ddType === 'log' ? 'gzip' : 'deflate';
        compressDataFn = getCompressionFunc(ddType);
        Object.assign(headers, {
            'Accept-Encoding': encoding,
            'Content-Encoding': encoding
        });
    } else {
        compressDataFn = (d) => Promise.resolve(d);
    }

    return promiseUtil.loopForEach(ddData, (dataChunk) => compressDataFn(dataChunk)
        .then((compressedData) => httpUtil.sendToConsumer({
            agent: getHttpAgent(context.config),
            allowSelfSignedCert,
            body: compressedData,
            expectedResponseCode: [200, 202],
            headers: Object.assign({}, headers),
            hosts: [getDataDogHost(ddRegion, ddType)],
            json: false,
            logger: context.logger,
            method: 'POST',
            port: DATA_DOG_PORT,
            protocol: DATA_DOG_PROTOCOL,
            proxy: context.config.proxy,
            uri: getDataDogEndpoint(ddType)
        }))
        .then(() => {
            context.logger.debug(`successfully sent ${dataChunk.length} bytes of data`);
        })
        .catch((err) => {
            context.logger.error(`Unable to send ${dataChunk.length} bytes of data. Error: ${err.message ? err.message : err}`);
        }));
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
