/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const zlib = require('zlib');

const dataMapping = require('./dataMapping');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const memConverter = require('./multiMetricEventConverter');
const httpUtil = require('../shared/httpUtil');


const MAX_CHUNK_SIZE = 99000;
const HEC_EVENTS_URI = '/services/collector/event';
const HEC_METRICS_URI = '/services/collector';
const DATA_FORMATS = {
    DEFAULT: 'default',
    LEGACY: 'legacy',
    METRICS: 'multiMetric'
};

/**
 * See {@link ../README.md#context} for documentation
 *
 * @returns {Promise} resolved once data sent to destination (never rejects)
 */
module.exports = function (context) {
    return transformData(context)
        .then(data => forwardData(data, context))
        .catch((err) => {
            context.logger.exception('Splunk data processing error', err);
        });
};

/**
 * Add transformed data
 *
 * @param {Object} ctx - context object
 * @param {Object} newData - transformed data
 */
function appendData(ctx, newData) {
    const results = ctx.results;
    const newDataStr = JSON.stringify(newData, ctx.results.jsonReplacer);

    results.currentChunkLength += newDataStr.length;
    results.dataLength += newDataStr.length;

    if (results.currentChunkLength >= MAX_CHUNK_SIZE) {
        results.currentChunkLength = 0;
        results.numberOfRequests += 1;
    }
    results.translatedData.push(newDataStr);
}

/**
 * Transform data using provided callback
 *
 * @param {Function(object):object} cb - callback function to transform
 * @param {Object} ctx - context object
 *
 * @returns {Promise} resolved once data transformed
 */
function safeDataTransform(cb, ctx) {
    return Promise.resolve()
        .then(() => cb(ctx))
        .then((data) => {
            if (data) {
                if (Array.isArray(data)) {
                    data.forEach(part => appendData(ctx, part));
                } else {
                    appendData(ctx, data);
                }
            }
        }).catch((err) => {
            ctx.globalCtx.logger.exception('Splunk.safeDataTransform error', err);
        });
}

/**
 * Convert data to default format
 *
 * @param {Object} ctx - context object
 *
 * @returns {Promise<Array<String>>} resolved once default format applied to data
 */
function defaultDataFormat(ctx) {
    return Promise.resolve([JSON.stringify(dataMapping.defaultFormat(ctx))]);
}

/**
 * Convert data to multi metric format
 *
 * @param {Object} ctx - context object
 *
 * @returns {Promise<Array<String>} resolved with transformed data
 */
function multiMetricDataFormat(ctx) {
    return Promise.resolve()
        .then(() => {
            const events = [];
            memConverter(ctx.event.data, event => events.push(JSON.stringify(event)));
            return events;
        });
}

/**
 * Transform incoming data
  *
 * @param {Object} globalCtx - global context
 *
 * @returns {Promise<Array<String>>} resolved with transformed data
 */
function transformData(globalCtx) {
    if (globalCtx.config.format === DATA_FORMATS.METRICS) {
        if (globalCtx.event.type === EVENT_TYPES.SYSTEM_POLLER && !globalCtx.event.isCustom) {
            return multiMetricDataFormat(globalCtx);
        }
        return Promise.resolve([]);
    }
    if (globalCtx.config.format !== DATA_FORMATS.LEGACY) {
        return defaultDataFormat(globalCtx);
    }

    const requestCtx = {
        globalCtx,
        results: {
            dataLength: 0,
            currentChunkLength: 0,
            numberOfRequests: 1,
            translatedData: []
        },
        cache: {
            dataTimestamp: (new Date()).getTime()
        }
    };
    if (globalCtx.config.dumpUndefinedValues) {
        requestCtx.results.jsonReplacer = function (key, value) {
            return value === undefined ? 'UNDEFINED' : value;
        };
    }
    let p = null;
    if (globalCtx.event.type === EVENT_TYPES.SYSTEM_POLLER && !globalCtx.event.isCustom) {
        requestCtx.cache.dataTimestamp = Date.parse(globalCtx.event.data.system.systemTimestamp);
        p = Promise.all(dataMapping.stats.map(func => safeDataTransform(func, requestCtx)))
            .then(() => safeDataTransform(dataMapping.overall, requestCtx));
    } else if (globalCtx.event.type === EVENT_TYPES.IHEALTH_POLLER) {
        p = safeDataTransform(dataMapping.ihealth, requestCtx);
    }

    if (!p) {
        return Promise.resolve([]);
    }
    return p.then(() => requestCtx.results.translatedData);
}

/**
 * Create default options for request
 *
 * @param {Object} consumer - consumer's config object
 *
 * @returns {Object} options for requestUtil
 */
function getRequestOptions(consumer) {
    const requestOpts = {
        allowSelfSignedCert: consumer.allowSelfSignedCert,
        gzip: consumer.compressionType === 'gzip',
        headers: {
            Authorization: `Splunk ${consumer.passphrase}`
        },
        hosts: [consumer.host],
        json: false,
        method: 'POST',
        port: consumer.port,
        protocol: consumer.protocol ? consumer.protocol : 'https',
        proxy: consumer.proxy,
        uri: consumer.format === DATA_FORMATS.METRICS ? HEC_METRICS_URI : HEC_EVENTS_URI
    };
    // easier for debug to turn it off
    if (requestOpts.gzip) {
        Object.assign(requestOpts.headers, {
            'Accept-Encoding': 'gzip',
            'Content-Encoding': 'gzip'
        });
    }
    if (requestOpts.proxy && typeof requestOpts.proxy.allowSelfSignedCert !== 'undefined') {
        requestOpts.allowSelfSignedCert = requestOpts.proxy.allowSelfSignedCert;
    }
    return requestOpts;
}

/**
 * Send data to consumer
 *
 * @param {string[]} dataChunk      - list of strings to send
 * @param {Object} context          - context
 * @param {Object} context.request  - request object
 * @param {Object} context.consumer - consumer object
 *
 * @returns {Promise} resolved with complete response
 */
function sendDataChunk(dataChunk, context) {
    const logger = context.globalCtx.logger;

    return new Promise((resolve, reject) => {
        const data = dataChunk.join('');

        if (context.requestOpts.gzip) {
            zlib.gzip(data, (err, buffer) => {
                if (!err) {
                    resolve(buffer);
                } else {
                    err = `sendDataChunk::zlib.gzip error: ${err}`;
                    logger.error(err);
                    reject(err);
                }
            });
        } else {
            resolve(data);
        }
    }).then((data) => {
        logger.debug(`sending data - ${data.length} bytes`);
        const opts = Object.assign({ body: data, logger }, context.requestOpts);
        opts.headers = Object.assign(opts.headers, {
            'Content-Length': data.length
        });
        return httpUtil.sendToConsumer(opts);
    });
}

/**
 * Forward data to consumer
 *
 * @param {Array<String>} dataToSend - list of strings to send
 * @param {Object} globalCtx    - global context object
 *
 * @returns {Promise} resolve once data sent to destination
 */
function forwardData(dataToSend, globalCtx) {
    if (!dataToSend || dataToSend.length === 0) {
        globalCtx.logger.debug('No data to forward to Splunk');
        return Promise.resolve();
    }
    const context = {
        globalCtx,
        requestOpts: getRequestOptions(globalCtx.config),
        consumer: globalCtx.config
    };
    if (globalCtx.tracer) {
        // redact passphrase in consumer config
        const tracedConsumerCtx = JSON.parse(JSON.stringify(context.consumer));
        tracedConsumerCtx.passphrase = '*****';
        // redact passphrase in proxy config
        if (tracedConsumerCtx.proxy && tracedConsumerCtx.proxy.passphrase) {
            tracedConsumerCtx.proxy.passphrase = '*****';
        }
        // redact passphrase in request options
        const tracedRequestOpts = JSON.parse(JSON.stringify(context.requestOpts));
        tracedRequestOpts.headers.Authorization = '*****';
        // redact passphrase in proxy config
        if (tracedRequestOpts.proxy && tracedRequestOpts.proxy.passphrase) {
            tracedRequestOpts.proxy.passphrase = '*****';
        }
        globalCtx.tracer.write({
            dataToSend,
            consumer: tracedConsumerCtx,
            requestOpts: tracedRequestOpts
        });
    }

    return new Promise((resolve) => {
        (function sendNextChunk(startIdx) {
            if (startIdx >= dataToSend.length) {
                return resolve();
            }
            return Promise.resolve()
                .then(() => {
                    const dataChunks = [];
                    let chunksSize = 0;

                    while (chunksSize < MAX_CHUNK_SIZE && startIdx < dataToSend.length) {
                        chunksSize += dataToSend[startIdx].length;
                        dataChunks.push(dataToSend[startIdx]);
                        startIdx += 1;
                    }
                    return sendDataChunk(dataChunks, context);
                }).catch((error) => {
                    globalCtx.logger.exception('Unable to send data chunk', error);
                })
                .then(() => sendNextChunk(startIdx));
        }(0)); // calling the immediate function here and pass 0 as startIdx
    });
}
