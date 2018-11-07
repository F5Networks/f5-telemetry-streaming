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
* @param {Object} consumer.consumer - consumer's function(data, config)
* @param {Object} consumer.config - consumer's config
*
* @returns {Object} Promise object resolved with undefined
*/
function forwardData(data, consumers) {
    logger.debug('Data forwarder');

    return new Promise((resolve) => {
        if (Array.isArray(consumers)) {
            // don't relying on plugins' code, wrap consumer's call to Promise
            consumers.forEach((consumer) => {
                return new Promise((lresolve) => {
                    consumer.consumer(data, consumer.config);
                    lresolve();
                }).catch(err => logger.exception('Error on data forwarding to consumer', err));
            });
        }
        // anyway resolve promise
        resolve();
    });
}


module.exports = forwardData;
