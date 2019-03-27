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
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const config = context.config;
    const secret = config.passphrase || '';

    const httpBody = JSON.stringify(context.event.data);

    const protocol = config.protocol || 'https';
    const port = config.port || 443;
    const url = `${protocol}://${config.host}:${port}${config.path}${secret}`;
    const httpHeaders = {
        'content-type': 'application/json'
    };
    const requestOptions = {
        url,
        headers: httpHeaders,
        body: httpBody,
        strictSSL: !config.allowSelfSignedCert
    };
    if (context.tracer) {
        context.tracer.write(JSON.stringify({ url, headers: httpHeaders, body: JSON.parse(httpBody) }, null, 4));
    }

    // eslint-disable-next-line no-unused-vars
    request.post(requestOptions, (error, response, body) => {
        if (error) {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        } else if (response.statusCode === 200) {
            context.logger.debug('success');
        } else {
            context.logger.info(`response: ${response.statusCode} ${response.statusMessage}`);
        }
    });
};
