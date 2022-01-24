/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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

    logger.info('success');
    if (tracer) {
        // pretty JSON dump
        tracer.write(formattedData);
    }
    return Promise.resolve({ data: formattedData });
};
