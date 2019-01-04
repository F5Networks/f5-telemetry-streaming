/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const util = require('./util.js');
const forwarder = require('./forwarder.js');

/**
* Pipeline to process data
*
* @param {Object} data - data to process
* @param {Object} type - type of data, such as systemInfo|event
*
* @returns {Void}
*/
function process(data, type) {
    // add telemetryEventCategory to data, fairly verbose name to avoid conflicts
    // TODO: also add a telemetryEventType which would have a value like LTM Request Log/ASM Log/etc.
    data.telemetryEventCategory = type;

    // log events, for now
    if (type === 'event') { logger.debug(`Event: ${util.stringify(data)}`); }
    // no translator, for now
    return forwarder.forward({ type, data })
        .then(() => {
            logger.debug(`Pipeline processed data of type: ${type}`);
        })
        .catch((e) => {
            throw e;
        });
}

module.exports = {
    process
};
