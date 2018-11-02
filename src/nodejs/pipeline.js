/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const forwarder = require('./forwarder.js');
const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const translator = require('./translator.js');


/**
* Send data to pipeline
*
* @param {Object} data - data to forward
* @param {Object} consumer - consumer object
* @param {Object} consumer.consumer - consumer's config
*
* @returns {function} Promise object
*/
function pipeline(data, consumer) {
    return translator(data, consumer)
        .then(res => forwarder(res, consumer))
        .catch((err) => {
            logger.error(`pipeline error! Consumer ${consumer.consumer}.\nDetailed error:`, err);
        });
}


module.exports = pipeline;
