/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('../../utils/misc');
const requestsUtil = require('../../utils/requests');
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

function getProxyUrl(proxyOpts) {
    let proxy;
    if (!util.isObjectEmpty(proxyOpts)) {
        let auth;
        if (proxyOpts.username) {
            auth = proxyOpts.username;
            if (proxyOpts.passphrase) {
                auth = `${auth}:${proxyOpts.passphrase}`;
            }
        }
        auth = auth ? `${auth}@` : '';
        const port = proxyOpts.port ? `:${proxyOpts.port}` : '';
        proxy = `${proxyOpts.protocol || 'https'}://${auth}${proxyOpts.host}${port}`;
    }
    return proxy;
}

/**
 * Send data to Consumer(s)
 *
 * Note:
 * - see requestsUtil.makeRequest for available options
 * - all options will be passed through directly to requestsUtil.makeRequest except options below
 * - request will be sent to the next host if response code is >= 500 or another error occurs
 *
 * @param {Object} config               - config
 * @param {Array<String>} config.hosts  - list of hosts
 * @param {Logger} config.logger        - logger
 * @param {Object} [config.proxy]       - proxy settings
 * @param {String} [config.uri]         - URI
 *
 * @returns {Promise<Array<Any, Object>} resolves with array of
 *  2 items - response data and response object
 */
function sendToConsumer(config) {
    const hostIdx = config.hostIdx || 0;
    const host = config.hosts[hostIdx];
    const requestOptions = Object.assign({
        continueOnErrorCode: true
    }, config);
    ['hosts', 'hostIdx', 'logger', 'proxy', 'uri'].forEach((prop) => {
        delete requestOptions[prop];
    });
    requestOptions.proxy = getProxyUrl(config.proxy);
    requestOptions.includeResponseObject = true;

    let response;
    let requestError;

    return requestsUtil.makeRequest(host, config.uri, requestOptions)
        .then((ret) => {
            response = ret;
            config.logger.debug(`request to '${host}${config.uri}' returned HTTP ${response[1].statusCode}`);
            if (response[1].statusCode >= 500) {
                requestError = new Error(`Bad status code: ${response[1].statusCode} ${response[1].statusMessage} for '${host}'`);
            }
        })
        .catch((err) => {
            config.logger.exception(`Error caught on attempt to send request to '${host}${config.uri}'`, err);
            requestError = err;
        })
        .then(() => {
            if (!requestError) {
                config.logger.debug(`response: ${response[1].statusCode} ${response[1].statusMessage}`);
                if (response[0]) {
                    config.logger.debug(`response body: ${typeof response[0] === 'object' ? JSON.stringify(response[0]) : response[0]}`);
                }
                return Promise.resolve(response);
            }
            const nextHostIdx = hostIdx + 1;
            if (nextHostIdx < config.hosts.length) {
                // fallback to next host
                config.logger.debug(`Trying next host - ${config.hosts[nextHostIdx]}`);
                config.hostIdx = nextHostIdx;
                return sendToConsumer(config);
            }
            return Promise.reject(requestError);
        });
}

module.exports = {
    sendToConsumer,
    processHeaders
};
