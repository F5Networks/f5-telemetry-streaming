/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
 * @param {Object} context - context
 * @param {String} body - data to send
 * @param {Array<String>} hosts - list of hosts
 * @param {Object} headers - headers
 * @param {Logger} logger - logger
 * @param {String} method - HTTP method
 * @param {Integer} port - port number
 * @param {String} protocol - http or https
 * @param {Boolean} strictSSL - allow non-signed certs or not
 * @param {String} uri - URI
 *
 * @returns {Promise} resolved once data was sent or no hosts left
 */
function sendToConsumer(context) {
    const hostIdx = context.hostIdx || 0;
    const host = context.hosts[hostIdx];
    const requestOptions = {
        url: `${context.protocol}://${host}${context.port}${context.uri}`,
        headers: context.headers,
        body: context.body,
        strictSSL: context.strictSSL
    };

    return makeRequest(context.method, requestOptions)
        .then((ret) => {
            if (ret.error || (ret.response && ret.response.statusCode >= 500)) {
                if (ret.error) {
                    context.logger.error(`error: ${ret.error.message ? ret.error.message : ret.error}`);
                    if (ret.body) {
                        context.logger.error(`response body: ${ret.body}`); // API may provide error text via body
                    }
                }

                const nextHostIdx = hostIdx + 1;
                if (nextHostIdx < context.hosts.length) {
                    // fallback to next host
                    context.logger.debug(`Trying next host - ${context.hosts[nextHostIdx]}`);
                    context.hostIdx = nextHostIdx;
                    return sendToConsumer(context);
                }
            } else if (ret.response.statusCode === 200) {
                context.logger.debug('success');
            } else {
                context.logger.info(`response: ${ret.response.statusCode} ${ret.response.statusMessage}`);
                if (ret.body) {
                    context.logger.info(`response body: ${ret.body}`);
                }
            }
            return Promise.resolve();
        })
        .catch((err) => {
            context.logger.exception(`Unexpected error: ${err}`, err);
        });
}

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const body = JSON.stringify(context.event.data);
    const method = context.config.method || 'POST';
    const protocol = context.config.protocol || 'https';
    const port = context.config.port ? `:${context.config.port}` : '';
    const uri = context.config.path || '/';
    const host = context.config.host;
    const fallbackHosts = context.config.fallbackHosts || [];
    const headers = processHeaders(context.config.headers); // no defaults - provide all headers needed
    const strictSSL = !context.config.allowSelfSignedCert;

    if (context.tracer) {
        let tracedHeaders = headers;
        // redact Basic Auth passphrase, if provided
        if (Object.keys(headers).indexOf('Authorization') > -1) {
            tracedHeaders = JSON.parse(JSON.stringify(headers));
            tracedHeaders.Authorization = '*****';
        }
        context.tracer.write(JSON.stringify({
            body: JSON.parse(body),
            host,
            fallbackHosts,
            headers: tracedHeaders,
            method,
            port,
            protocol,
            strictSSL,
            uri
        }, null, 4));
    }
    return sendToConsumer({
        body,
        hosts: [host].concat(fallbackHosts),
        headers,
        logger: context.logger,
        method,
        port,
        protocol,
        strictSSL,
        uri
    });
};
