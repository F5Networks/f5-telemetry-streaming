/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const requestUtil = require('./../shared/requestUtil');

const GZIP_DATA = true;
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
 */
module.exports = function (context) {
    transformData(context)
        .then(data => forwardData(data, context))
        .catch((err) => {
            context.logger.exception('Splunk data processing error', err);
        });
};

/**
* Add transformed data
*
* @param {Object} ctx     - context object
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
* @param {function(object):object} cb - callback function to transform
* @param {Object} ctx                 - context object
*
* @returns {Object} Promise resolved with undefined
*/
function safeDataTransform(cb, ctx) {
    return new Promise((resolve) => {
        resolve(cb(ctx));
    }).then((data) => {
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
 * @param {Object} ctx - context object
 * @returns {Object} Promise resolved with string (converted data)
 */
function defaultDataFormat(ctx) {
    return Promise.resolve([JSON.stringify(dataMapping.defaultFormat(ctx))]);
}

/**
 * Convert data to multi metric format
 * @param {Object} ctx - context object
 * @returns {Object} Promise resolved with (converted data)
 */
function multiMetricDataFormat(ctx) {
    const events = [];
    memConverter(ctx.event.data, event => events.push(JSON.stringify(event)));
    return Promise.resolve(events);
}

/**
* Transform incoming data
*
* @param {Object} globalCtx - global context
*
* @returns {Object} Promise resolved with transformed data
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
        p = Promise.all(dataMapping.stats.map(func => safeDataTransform(func, requestCtx)));
        p.then(() => safeDataTransform(dataMapping.overall, requestCtx));
    } else if (globalCtx.event.type === EVENT_TYPES.IHEALTH_POLLER) {
        p = safeDataTransform(dataMapping.ihealth, requestCtx);
    }

    if (!p) {
        return Promise.resolve([]);
    }
    return p.then(() => Promise.resolve(requestCtx.results.translatedData));
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
        // yeah, we don't have GZIP option in the schema
        // but it is easier to debug if you can configure it
        gzip: typeof consumer.gzip !== 'undefined' ? consumer.gzip : GZIP_DATA,
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
* @returns {Object} Promise object resolved with response's statusCode
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

        return requestUtil.sendToConsumer(opts)
            .then(response => response[1].statusCode);
    });
}

/**
* Forward data to consumer
*
* @param {string[]} dataToSend - list of strings to send
* @param {Object} globalCtx    - global context object
*
*/
function forwardData(dataToSend, globalCtx) {
    if (!dataToSend || dataToSend.length === 0) {
        globalCtx.logger.debug('No data to forward to Splunk');
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
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

            globalCtx.tracer.write(JSON.stringify({
                dataToSend,
                consumer: tracedConsumerCtx,
                requestOpts: tracedRequestOpts
            }, null, 2));
        }

        let dataChunk = [];
        let chunkSize = 0;

        // eslint-disable-next-line
        for (let i = 0; i < dataToSend.length; i++) {
            const data = dataToSend[i];

            if (chunkSize < MAX_CHUNK_SIZE) {
                chunkSize += data.length;
                dataChunk.push(data);
            }
            if (chunkSize >= MAX_CHUNK_SIZE || i === dataToSend.length - 1) {
                sendDataChunk(dataChunk, context)
                    .then((res) => {
                        globalCtx.logger.debug(`Response status code: ${res}`);
                    }).catch((err) => {
                        globalCtx.logger.error(`Unable to send data chunk: ${err}`);
                    });

                if (i !== dataToSend.length) {
                    dataChunk = [];
                    chunkSize = 0;
                }
            }
        }
        resolve(true);
    });
}
