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
* @param {Object} type - type of data, such as stats|event
*
* @returns {Void}
*/
function process(data, type) {
    // log event, for now
    if (type === 'event') { logger.debug(`Event: ${util.stringify(data)}`); }

    // no translator, for now
    forwarder({ type, data })
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
