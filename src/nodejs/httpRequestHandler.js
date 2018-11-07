/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const http = require('http');
const https = require('https');
const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const constants = require('./constants');

const defaultHttpOptions = {
    host: constants.DEFAULT_HOST,
    port: constants.DEFAULT_PORT,
    path: '/',
    method: 'GET',
    headers: {
        Authorization: `Basic ${new Buffer('admin:').toString('base64')}`
    },
    rejectUnauthorized: false // default to false for TLS cert verification, for now
};

/**
 * Perform GET request
 *
 * @param {String} host              - HTTP host
 * @param {String} uri               - HTTP uri
 * @param {Object} options           - function options
 * @param {Integer} [options.port]   - HTTP port - optional
 * @param {Object} [options.headers] - HTTP headers - optional
 *
 * @returns {Object}
 */
function get(host, uri, options) {
    const httpOptions = Object.assign({}, defaultHttpOptions);
    httpOptions.host = host;
    httpOptions.path = uri;
    httpOptions.method = 'GET';

    const opts = options === undefined ? {} : options;
    if (opts.port) { httpOptions.port = opts.port; }
    if (opts.headers) { httpOptions.headers = opts.headers; }

    const httpRequest = httpOptions.port === 443 ? https : http;
    return new Promise((resolve, reject) => {
        const req = httpRequest.request(httpOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Bad status code: ${res.statusCode} ${res.statusMessage}`));
                }
            });
        }).on('error', (e) => {
            reject(new Error(`HTTP error: ${e}`));
        });
        req.end();
    });
}

/**
 * Perform POST request
 *
 * @param {String} host              - HTTP host
 * @param {String} uri               - HTTP uri
 * @param {String} body              - HTTP body
 * @param {Object} options           - function options
 * @param {Integer} [options.port]   - HTTP port - optional
 * @param {Object} [options.headers] - HTTP headers - optional
 *
 * @returns {Object}
 */
function post(host, uri, body, options) {
    const httpOptions = Object.assign({}, defaultHttpOptions);
    httpOptions.path = uri;
    httpOptions.method = 'POST';

    const opts = options === undefined ? {} : options;
    if (opts.port) { httpOptions.port = opts.port; }
    if (opts.headers) { httpOptions.headers = opts.headers; }

    const httpRequest = httpOptions.port === 443 ? https : http;
    return new Promise((resolve, reject) => {
        const req = httpRequest.request(httpOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Bad status code: ${res.statusCode} ${res.statusMessage}`));
                }
            });
        }).on('error', (e) => {
            reject(new Error(`HTTP error: ${e}`));
        });
        // write body
        if (body) { req.write(body); }
        req.end();
    });
}

/**
 * Get auth token
 *
 * @param {String} host              - HTTP host
 * @param {String} username          - device username
 * @param {String} password          - device password
 * @param {Object} options           - function options
 * @param {Integer} [options.port]   - HTTP port - optional
 *
 * @returns {Object}
 */
function getAuthToken(host, username, password, options) {
    const uri = '/mgmt/shared/authn/login';
    const body = JSON.stringify({
        username,
        password,
        loginProviderName: 'tmos'
    });
    const postOptions = {
        port: options.port
    };

    return post(host, uri, body, postOptions)
        .then((data) => {
            const ret = { token: data.token.token };
            return ret;
        })
        .catch((err) => {
            const msg = `getAuthToken: ${err}`;
            throw new Error(msg);
        });
}

module.exports = {
    get: get, // eslint-disable-line object-shorthand
    post: post, // eslint-disable-line object-shorthand
    getAuthToken: getAuthToken // eslint-disable-line object-shorthand
};
