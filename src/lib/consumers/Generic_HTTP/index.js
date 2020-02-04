/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const request = require('request');

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
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const httpBody = JSON.stringify(context.event.data);

    const method = context.config.method || 'POST';
    const protocol = context.config.protocol || 'https';
    const port = context.config.port ? `:${context.config.port}` : '';
    const uri = context.config.path || '/';
    const url = `${protocol}://${context.config.host}${port}${uri}`;

    const headers = processHeaders(context.config.headers);
    const httpHeaders = headers; // no defaults - provide all headers needed
    const requestOptions = {
        url,
        headers: httpHeaders,
        body: httpBody,
        strictSSL: !context.config.allowSelfSignedCert
    };
    if (context.tracer) {
        let tracedHeaders = httpHeaders;
        // redact Basic Auth passphrase, if provided
        if (Object.keys(httpHeaders).indexOf('Authorization') > -1) {
            tracedHeaders = JSON.parse(JSON.stringify(httpHeaders));
            tracedHeaders.Authorization = '*****';
        }

        context.tracer.write(JSON.stringify({
            method, url, headers: tracedHeaders, body: JSON.parse(httpBody)
        }, null, 4));
    }

    // eslint-disable-next-line no-unused-vars
    request[method.toLowerCase()](requestOptions, (error, response, body) => {
        if (error) {
            context.logger.error(`error: ${error.message ? error.message : error}`);
            if (body) context.logger.error(`response body: ${body}`); // API may provide error text via body
        } else if (response.statusCode === 200) {
            context.logger.debug('success');
        } else {
            context.logger.info(`response: ${response.statusCode} ${response.statusMessage}`);
            if (body) context.logger.info(`response body: ${body}`);
        }
    });
};
