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
* Translate data for consumer
*
* @param {Object} data - data to translate
* @param {Object} consumer - consumer object
* @param {Object} consumer.consumer - consumer's config
* @param {function} consumer.translate - async function to translate data
*
* @returns {Object} Promise object
*/
function translateData(data, consumer) {
    return new Promise(resolve => consumer.translate(data, consumer.consumer).then(resolve));
}


module.exports = translateData;
