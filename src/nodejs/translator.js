/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

/**
* Translate data, add additional info if needed
*
* @param {Object} data - data to translate
*
* @returns {Object} Promise object resolved with translated data
*/
function translateData(data) {
    logger.debug('Data translator');
    return new Promise(resolve => resolve(data));
}


module.exports = translateData;
