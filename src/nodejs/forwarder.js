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
* Forward data to consumer
*
* @param {Object} data - data to forward
* @param {Object} consumer - consumer object
* @param {Object} consumer.consumer - consumer's config
* @param {function} consumer.forward - async function to forward data
*
* @returns {Object} Promise object
*/
function forwardData(data, consumer) {
    return new Promise(resolve => consumer.forward(data, consumer.consumer).then(resolve));
}


module.exports = forwardData;
