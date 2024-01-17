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

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const logger = context.logger; // eslint-disable-line no-unused-vars
    const event = context.event; // eslint-disable-line no-unused-vars
    const config = context.config; // eslint-disable-line no-unused-vars
    const tracer = context.tracer; // eslint-disable-line no-unused-vars

    if (!event) {
        const msg = 'No event to process';
        logger.error(msg);
        return Promise.reject(new Error(msg));
    }

    logger.verbose(`Data type '${event.type}' processed`);
    if (tracer) {
        // pretty JSON dump
        tracer.write(event.data);
    }
    // nothing to do, default plugin
    return Promise.resolve();
};
