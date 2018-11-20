/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Default implementation for consumer
 *
 * @param {Object} context                                      - context of execution
 * @param {Object} context.config                               - consumer's config
 * @param {Object} context.logger                               - logger instance
 * @param {function(string):void} context.logger.info           - log info message
 * @param {function(string):void} context.logger.error          - log error message
 * @param {function(string):void} context.logger.debug          - log debug message
 * @param {function(string, err):void} context.logger.exception - log error message with error's traceback
 * @param {Object} context.event                                - event to process
 * @param {Object} context.event.data                           - actual data to process
 * @param {string} context.event.type                           - type of data to process
 * @param {Object|undefined} context.tracer                     - tracer object
 * @param {function(string):void} context.tracer.write          - write data to tracer
 *
 * @returns {void}
 */
module.exports = function (context) {
    const logger = context.logger; // eslint-disable-line no-unused-vars
    const event = context.event; // eslint-disable-line no-unused-vars
    const config = context.config; // eslint-disable-line no-unused-vars
    const tracer = context.tracer; // eslint-disable-line no-unused-vars

    if (!event) {
        logger.info('No event to process');
        return;
    }

    logger.info(`Data type '${event.type}' processed`);
    if (tracer) {
        // pretty JSON dump
        tracer.write(JSON.stringify(event.data, null, 4));
    }
};
