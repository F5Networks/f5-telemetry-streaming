/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const requestUtil = require('./../shared/requestUtil');

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
    const headers = requestUtil.processHeaders(context.config.headers); // no defaults - provide all headers needed
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
    return requestUtil.sendToConsumer({
        body,
        hosts: [host].concat(fallbackHosts),
        headers,
        logger: context.logger,
        method,
        port,
        protocol,
        strictSSL,
        uri
    }).catch((err) => {
        context.logger.exception(`Unexpected error: ${err}`, err);
    });
};
