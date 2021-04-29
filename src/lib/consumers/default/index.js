/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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

    logger.info(`Data type '${event.type}' processed`);
    if (tracer) {
        // pretty JSON dump
        tracer.write(event.data);
    }
    // nothing to do, default plugin
    return Promise.resolve();
};
