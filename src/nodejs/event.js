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
const normalize = require('./normalize.js');

/**
 * Process event
 *
 * @param {Object} data - data to process
 *
 * @returns {void}
 */
function process(data) {
    const normalizedData = normalize.event(data);
    logger.debug(`Event: ${util.stringify(normalizedData)}`);
}

module.exports = {
    process
};
