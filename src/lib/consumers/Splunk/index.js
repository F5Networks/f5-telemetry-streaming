/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const request = require('request');
const zlib = require('zlib');

const dataMapping = require('./dataMapping');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

const GZIP_DATA = true;
const MAX_CHUNK_SIZE = 99000;
const POST_DATA_URI = '/services/collector/event';


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
* Transform incoming data
*
* @param {Object} globalCtx - global context
*
* @returns {Object} Promise resolved with transformed data
*/
function transformData(globalCtx) {
    if (globalCtx.config.format !== 'legacy') {
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
    if (globalCtx.event.type === EVENT_TYPES.SYSTEM_POLLER) {
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
* @returns {Object} default options for request
*/
function getDefaultRequestOpts(consumer) {
    // we should always get a protocol, but having a default here doesn't hurt
    const protocol = consumer.protocol ? consumer.protocol : 'https';
    let baseURL = `${protocol}://${consumer.host}`;
    if (consumer.port) {
        baseURL = `${baseURL}:${consumer.port}`;
    }
    baseURL = `${baseURL}${POST_DATA_URI}`;
    const defaults = {
        url: baseURL,
        headers: {
            Authorization: `Splunk ${consumer.passphrase}`
        },
        strictSSL: !consumer.allowSelfSignedCert
    };
    // easier for debug to turn it off
    if (consumer.gzip !== undefined ? consumer.gzip : GZIP_DATA) {
        defaults.gzip = true;
        Object.assign(defaults.headers, {
            'Accept-Encoding': 'gzip',
            'Content-Encoding': 'gzip'
        });
    }
    return defaults;
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
    }).then(data => new Promise((resolve, reject) => {
        logger.debug(`sending data - ${data.length} bytes`);

        const opts = {
            body: data,
            headers: {
                'Content-Length': data.length
            }
        };
        context.request.post(opts, (error, response, body) => {
            if (error || !response || response.statusCode >= 300) {
                const errMsg = JSON.stringify({
                    error,
                    body,
                    statusCode: response ? response.statusCode : undefined
                }, null, 2);
                logger.error(`sendDataChunk::response error:\n${errMsg}`);
                reject(new Error('badResponse'));
            } else {
                resolve(response.statusCode);
            }
        });
    }));
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
            requestOpts: getDefaultRequestOpts(globalCtx.config),
            consumer: globalCtx.config
        };
        context.request = request.defaults(context.requestOpts);

        if (globalCtx.tracer) {
            // redact passphrase in consumer config
            const tracedConsumerCtx = JSON.parse(JSON.stringify(context.consumer));
            tracedConsumerCtx.passphrase = '*****';

            // redact passphrase in request options
            const traceRequestOpts = JSON.parse(JSON.stringify(context.requestOpts));
            traceRequestOpts.headers.Authorization = '*****';

            globalCtx.tracer.write(JSON.stringify({
                dataToSend,
                consumer: tracedConsumerCtx,
                requestOpts: traceRequestOpts
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
