/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const consumersWorker = require('./consumers.js');

/**
* Forward data to consumer
*
* @param {Object} data - data to forward
*
* @returns {Void} Promise object resolved with undefined
*/
function forwardData(data) {
    return new Promise((resolve) => {
        const consumers = consumersWorker.getConsumers();
        if (Array.isArray(consumers)) {
            // don't rely on plugins' code, wrap consumer's call to Promise
            // eslint-disable-next-line
            consumers.forEach((consumer) => {
                // standard context
                const context = {
                    data,
                    config: consumer.config,
                    logger
                };
                // place in try/catch
                try {
                    consumer.consumer(context);
                } catch (err) {
                    logger.exception(`Error forwarding data: ${err}`);
                }
            });
        }
        // anyway resolve promise
        resolve();
    });
}


module.exports = forwardData;
