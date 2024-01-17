/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
        // redact secret from url
        const tracedUrl = (secret === '' ? url : url
            .split('/')
            .slice(0, -1)
            .join('/')
            .concat('/*****'));
        const traceData = { url: tracedUrl, headers: httpHeaders, body: JSON.parse(httpBody) };
        context.tracer.write(traceData);
    }

    // eslint-disable-next-line no-unused-vars
    request.post(requestOptions, (error, response, body) => {
        if (error) {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        } else if (response.statusCode === 200) {
            context.logger.verbose('success');
        } else {
            context.logger.verbose(`response: ${response.statusCode} ${response.statusMessage}`);
        }
    });
};
