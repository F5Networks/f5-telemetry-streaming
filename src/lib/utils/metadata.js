/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('./misc');
const azureUtil = require('../consumers/shared/azureUtil');
const logger = require('../logger');

/** @module metadataUtil */
// provides a facade for metadata related methods based on instance environment

/**
 * Gets the metadata if available for the telemetry host
 * Will return null if lookup fails and will not throw error
 *
 * @param {Object} consumerContext - the consumer context
 * @param {Object} consumerContext.config - the consumer config
 *
 * @returns {Promise.<Object>} - Promise resolved with the metadata
 *                              or null if no metadata available
 */
function getInstanceMetadata(consumerContext) {
    const consumerType = consumerContext.config.type;
    let promise = Promise.resolve();
    if (consumerType.indexOf('Azure') > -1) {
        promise = util.retryPromise(() => azureUtil.getInstanceMetadata(consumerContext), { maxTries: 1 });
    }

    return promise
        .catch((err) => {
            logger.debug(`Unable to retrieve instance metadata for consumer ${consumerType}. ${err.messsage}`);
        })
        // ensure this does not cause promise rejection if error occurs
        .then(metadata => Promise.resolve(util.isObjectEmpty(metadata) ? null : metadata));
}

module.exports = {
    getInstanceMetadata
};
