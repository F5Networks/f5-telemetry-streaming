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
    const httpBody = JSON.stringify({
        what: 'f5telemetry',
        tags: [context.event.type],
        data: context.event.data
    });

    const protocol = context.config.protocol || 'http';
    const port = context.config.port ? `:${context.config.port}` : '';
    const url = `${protocol}://${context.config.host}${port}/events`;
    const httpHeaders = {
        'content-type': 'application/json'
    };
    const requestOptions = {
        url,
        headers: httpHeaders,
        body: httpBody
    };
    if (context.tracer) {
        context.tracer.write(JSON.stringify({ url, headers: httpHeaders, body: JSON.parse(httpBody) }, null, 4));
    }

    // eslint-disable-next-line no-unused-vars
    request.post(requestOptions, (error, response, body) => {
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
