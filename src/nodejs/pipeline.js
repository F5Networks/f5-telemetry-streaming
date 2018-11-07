/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const forwarder = require('./forwarder.js');
const translator = require('./translator.js');
const stats = require('./systemStatsHandler.js');


/**
* Send data to pipeline
*
* @param {Object} data - data to forward
* @param {Object} consumer - consumer object
* @param {Object} consumer.consumer - consumer's config
*
* @returns {function} Promise object
*/
function createPipeline(consumers) {
    logger.info('Initializing pipeline');
    return function () {
        return stats.collect()
            .then(translator)
            .then(data => forwarder(data, consumers))
            .catch((err) => {
                logger.exception('Data pipeline error', err);
            });
    };
}


module.exports = {
    create: createPipeline
};
