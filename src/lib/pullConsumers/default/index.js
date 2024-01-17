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
 * Apply consumer-specific formatting, and return the reformatted data
 *
 * @param {Object} context                                      - complete context object
 * @param {Object} context.config                               - consumer's config from declaration
 * @param {Object} context.logger                               - logger instance
 * @param {function(string):void} context.logger.info           - log info message
 * @param {function(string):void} context.logger.error          - log error message
 * @param {function(string):void} context.logger.debug          - log debug message
 * @param {function(string, err):void} context.logger.exception - log error message with error's traceback
 * @param {Array} context.event                                 - array of events to process
 * @param {Object} context.event[].data                         - actual data object to process
 * @param {Object|undefined} context.tracer                     - tracer object
 * @param {function(string):void} context.tracer.write          - write data to tracer
 *
 * @returns {Promise} - Promise resolved with the consumer-specific formatting applied,
 *                      or rejected if no events are provided
 */
module.exports = function (context) {
    const logger = context.logger;
    const event = context.event;
    const config = context.config; // eslint-disable-line no-unused-vars
    const tracer = context.tracer;

    if (!Array.isArray(event)) {
        const msg = 'No event data to process';
        logger.error(msg);
        return Promise.reject(new Error(msg));
    }

    // Re-format event data into array of objects
    const formattedData = event
        .filter((d) => (typeof d !== 'undefined' && Object.keys(d).indexOf('data') !== -1))
        .map((d) => d.data);

    logger.verbose('success');
    if (tracer) {
        // pretty JSON dump
        tracer.write(formattedData);
    }
    return Promise.resolve({ data: formattedData });
};
