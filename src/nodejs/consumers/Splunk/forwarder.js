/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const http = require('http');
const zlib = require('zlib');

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const constants = require('./constants.js');


function requestOptions(consumer) {
    const options = {
        protocol: `${consumer.destination.protocol}:`,
        host: consumer.destination.address,
        port: consumer.destination.port,
        path: consumer.api.path !== undefined ? consumer.api.path : constants.api.postData,
        method: 'POST',
        headers: {
            Host: `${consumer.destination.address}:${consumer.destination.port}`,
            'Content-Type': 'application/json',
            Authorization: `Splunk ${consumer.api.token}`
        }
    };
    if (consumer.api.gzip) {
        Object.assign(options.headers, {
            'Accept-Encoding': 'gzip',
            'Content-Encoding': 'gzip'
        });
    }
    return options;
}


async function sendDataChunk(dataChunk, consumer) {
    return new Promise((resolve, reject) => {
        const data = dataChunk.join('');
        if (consumer.api.gzip) {
            zlib.gzip(data, (err, buffer) => {
                if (!err) {
                    resolve(buffer);
                } else {
                    err = `sendDataChunk error: ${err}`;
                    logger.error(err);
                    reject(err);
                }
            });
        } else {
            resolve(data);
        }
    }).then((data) => {
        logger.debug('sending data');
        const options = requestOptions(consumer);
        options.headers['Content-Length'] = data.length;

        const buffers = [];
        let gzip = false;
        const req = http.request(options, (res) => {
            res.on('data', (rdata) => {
                buffers.push(rdata);
                if (res.headers['content-encoding'] === 'gzip') {
                    gzip = true;
                }
            });
            res.on('end', () => {
                if (gzip) {
                    zlib.gunzip(Buffer.concat(buffers), (err, buffer) => {
                        if (err) {
                            logger.debug('Response1: gzip error', err);
                        } else {
                            logger.debug('Response1: ', buffer.toString('utf8'));
                        }
                    });
                } else {
                    logger.debug('Response2: ', Buffer.concat(buffers).toString('utf8'));
                }
            });
        });
        req.write(data);
        req.end();
    });
}


async function forwardData(dataToSend, consumer) {
    logger.debug('Incoming data for forwarding');

    let dataChunk = [];
    let chunkSize = 0;
    for (let i = 0; i < dataToSend.length; i++) {
        const data = dataToSend[i];

        if (chunkSize < constants.maxDataChunkSize) {
            chunkSize += data.length;
            dataChunk.push(data);
        }
        if (chunkSize >= constants.maxDataChunkSize
            || i === dataToSend.length - 1) {

            sendDataChunk(dataChunk, consumer);

            if (i !== dataToSend.length) {
                dataChunk = [];
                chunkSize = 0;
            }
        }
    }
}


module.exports = forwardData;
