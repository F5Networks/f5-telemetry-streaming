/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const azureUtil = require('../consumers/shared/azureUtil');
const gcpUtil = require('../consumers/shared/gcpUtil');
const logger = require('../logger');
const retryPromise = require('./promise').retry;
const util = require('./misc');

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
        promise = retryPromise(() => azureUtil.getInstanceMetadata(consumerContext), { maxTries: 2 });
    } else if (consumerType.indexOf('Google') > -1) {
        promise = retryPromise(() => gcpUtil.getInstanceMetadata(consumerContext), { maxTries: 2 });
    }

    return promise
        .catch((err) => {
            logger.verbose(`Unable to retrieve instance metadata for consumer ${consumerType}. ${err.messsage}`);
        })
        // ensure this does not cause promise rejection if error occurs
        .then((metadata) => Promise.resolve(util.isObjectEmpty(metadata) ? null : metadata));
}

module.exports = {
    getInstanceMetadata
};
