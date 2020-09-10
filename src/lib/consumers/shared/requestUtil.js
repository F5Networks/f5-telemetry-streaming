/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const request = require('request');

/**
 * Process request headers
 *
 * @param {Array<Object>} headers - headers
 *
 * @returns {Object} headers
 */
function processHeaders(headers) {
    // assume headers is an array that looks like this:
    // [ { name: 'foo', value: 'foo' }]
    const ret = {};
    if (Array.isArray(headers)) {
        headers.forEach((i) => {
            ret[i.name] = i.value;
        });
    }
    return ret;
}

/**
 * Send data via HTTP(s)
 *
 * @param {String} method - HTTP method
 * @param {Object} requestOptions - request options
 */
function makeRequest(method, requestOptions) {
    return new Promise((resolve) => {
        request[method.toLowerCase()](requestOptions, (error, response, body) => {
            resolve({ error, response, body });
        });
    });
}

/**
 * Send data to Consumer(s)
 *
 * @param {Object} config               - config
 * @param {String} config.body          - data to send
 * @param {Array<String>} config.hosts  - list of hosts
 * @param {Object} config.headers       - headers
 * @param {Logger} config.logger        - logger
 * @param {String} config.method        - HTTP method
 * @param {Integer} config.port         - port number
 * @param {String} config.protocol      - http or https
 * @param {Boolean} config.strictSSL    - allow non-signed certs or not
 * @param {String} config.uri           - URI
 *
 * @returns {Promise} resolved once data was sent or no hosts left
 */
function sendToConsumer(config) {
    const hostIdx = config.hostIdx || 0;
    const host = config.hosts[hostIdx];
    const requestOptions = {
        url: `${config.protocol}://${host}${config.port}${config.uri}`,
        headers: config.headers,
        body: config.body,
        strictSSL: config.strictSSL
    };

    return makeRequest(config.method, requestOptions)
        .then((ret) => {
            const httpSuccessCodes = [200, 201, 202];
            if (ret.error || (ret.response && ret.response.statusCode >= 500)) {
                if (ret.error) {
                    config.logger.error(`error: ${ret.error.message ? ret.error.message : ret.error}`);
                    if (ret.body) {
                        config.logger.error(`response body: ${ret.body}`); // API may provide error text via body
                    }
                }

                const nextHostIdx = hostIdx + 1;
                if (nextHostIdx < config.hosts.length) {
                    // fallback to next host
                    config.logger.debug(`Trying next host - ${config.hosts[nextHostIdx]}`);
                    config.hostIdx = nextHostIdx;
                    return sendToConsumer(config);
                }
            } else if (httpSuccessCodes.indexOf(ret.response.statusCode) > -1) {
                config.logger.debug('success');
            } else {
                config.logger.info(`response: ${ret.response.statusCode} ${ret.response.statusMessage}`);
                if (ret.body) {
                    config.logger.info(`response body: ${ret.body}`);
                }
            }
            return Promise.resolve();
        });
}

module.exports = {
    sendToConsumer,
    processHeaders
};
