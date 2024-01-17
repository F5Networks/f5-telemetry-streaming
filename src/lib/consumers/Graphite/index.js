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
    const httpBody = JSON.stringify({
        what: 'f5telemetry',
        tags: [context.event.type],
        data: context.event.data
    });

    const protocol = context.config.protocol || 'http';
    const port = context.config.port ? `:${context.config.port}` : '';
    const uri = context.config.path || '/events/';
    const url = `${protocol}://${context.config.host}${port}${uri}`;
    const httpHeaders = {
        'content-type': 'application/json'
    };
    const requestOptions = {
        url,
        headers: httpHeaders,
        body: httpBody,
        strictSSL: !context.config.allowSelfSignedCert
    };
    if (context.tracer) {
        context.tracer.write(requestOptions);
    }

    // eslint-disable-next-line no-unused-vars
    request.post(requestOptions, (error, response, body) => {
        if (error) {
            context.logger.error(`error: ${error.message ? error.message : error}`);
            if (body) context.logger.error(`response body: ${body}`); // API may provide error text via body
        } else if (response.statusCode === 200) {
            context.logger.verbose('success');
        } else {
            context.logger.verbose(`response: ${response.statusCode} ${response.statusMessage}`);
            if (body) context.logger.verbose(`response body: ${body}`);
        }
    });
};
