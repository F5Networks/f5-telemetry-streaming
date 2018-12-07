/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
        logger.info('No event to process');
        return;
    }

    logger.info(`Data type '${event.type}' processed`);
    if (tracer) {
        // pretty JSON dump
        tracer.write(JSON.stringify(event.data, null, 4));
    }
};
