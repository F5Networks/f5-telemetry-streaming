/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const http = require('http');
const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

const defaultOptions = {
    host: 'localhost',
    port: 8100,
    path: '/',
    method: 'GET',
    headers: {
        Authorization: `Basic ${new Buffer('admin:').toString('base64')}`
    }
};

/**
 * Perform GET request
 *
 * @param {String} uri - uri to use
 *
 * @returns {Object}
 */
function get(uri) {
    const options = defaultOptions;
    options.path = uri;

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', (e) => {
            reject(e);
        });
        req.end();
    });
}

/**
 * Perform POST request
 *
 * @param {String} uri  - uri to use
 * @param {String} body - body to use
 *
 * @returns {Object}
 */
function post(uri, body) {
    const options = defaultOptions;
    options.path = uri;
    options.method = 'POST';

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', (e) => {
            reject(e);
        });
        // write body
        if (body) { req.write(body); }
        req.end();
    });
}

module.exports = {
    get: get, // eslint-disable-line object-shorthand
    post: post // eslint-disable-line object-shorthand
};
