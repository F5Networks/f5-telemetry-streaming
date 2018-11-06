/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const request = require('request');
const url = require('url');
const zlib = require('zlib');

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const constants = require('./constants.js');


/**
* Create default options for request
*
* @param {Object} consumer             - consumer object
* @param {Object} consumer.destination - destination info
* @param {Object} consumer.api         - API info
*
* @returns {Object} request.defaults instance
*/
function defaultRequest(consumer) {
    const baseURL = new url.URL(`${consumer.destination.protocol}://${consumer.destination.address}`);
    baseURL.port = consumer.destination.port;
    baseURL.pathname = consumer.api.path !== undefined ? consumer.api.path : constants.api.postData;

    const defaults = {
        url: baseURL,
        headers: {
            Authorization: `Splunk ${consumer.api.token}`
        }
    };

    if (consumer.api.gzip) {
        defaults.gzip = true;
        Object.assign(defaults.headers, {
            'Accept-Encoding': 'gzip',
            'Content-Encoding': 'gzip'
        });
    }
    return request.defaults(defaults);
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
async function sendDataChunk(dataChunk, context) {
    return new Promise((resolve, reject) => {
        const data = dataChunk.join('');

        if (context.consumer.api.gzip) {
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
        logger.debug('sending data');

        const opts = {
            body: data,
            headers: {
                'Content-Length': data.length
            }
        };
        context.request.post(opts, async (error, response, body) => {
            if (error || !response || response.statusCode >= 300) {
                logger.error('sendDataChunk::response error:\n', JSON.stringify({
                    error,
                    body,
                    statusCode: response.statusCode
                }, null, 2));
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
* @param {Object} consumer     - consumer object
*
*/
async function forwardData(dataToSend, consumer) {
    logger.debug('Incoming data for forwarding');

    const context = {
        request: defaultRequest(consumer),
        consumer
    };

    let dataChunk = [];
    let chunkSize = 0;

    // eslint-disable-next-line
    for (let i = 0; i < dataToSend.length; i++) {
        const data = dataToSend[i];

        if (chunkSize < constants.maxDataChunkSize) {
            chunkSize += data.length;
            dataChunk.push(data);
        }
        if (chunkSize >= constants.maxDataChunkSize || i === dataToSend.length - 1) {
            sendDataChunk(dataChunk, context).then((res) => {
                logger.debug(`Response status code: ${res}`);
            }).catch((err) => {
                logger.err(`Unable to send data chuck: ${err}`);
            });

            if (i !== dataToSend.length) {
                dataChunk = [];
                chunkSize = 0;
            }
        }
    }
}


module.exports = forwardData;
