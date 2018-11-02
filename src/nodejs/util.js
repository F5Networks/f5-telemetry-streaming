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
 * LX rest operation responder
 *
 * @param {Object} restOperation - restOperation to complete
 * @param {Sting} status         - HTTP status
 * @param {Sting} body           - HTTP body
 *
 * @returns {void}
 */
function restOperationResponder(restOperation, status, body) {
    restOperation.setStatusCode(status);
    restOperation.setBody(body);
    restOperation.complete();
}

/**
 * Convert array to map using provided options
 *
 * @param {Object} data                - data
 * @param {Object} key                 - key in array containing value to use as key in map
 * @param {Object} options             - optional arguments
 * @param {Object} [options.keyPrefix] - prefix for key
 *
 * @returns {Object} Promise which is resolved with the data
 */
function convertArrayToMap(data, key, options) {
    const ret = {};

    if (!Array.isArray(data)) {
        throw new Error(`convertArrayToMap() array required: ${JSON.stringify(data)}`);
    }

    data.forEach((i) => {
        const keyName = options.keyPrefix ? `${options.keyPrefix}${i[key]}` : i[key];
        ret[keyName] = i;
    });
    return ret;
}

module.exports = {
    restOperationResponder,
    convertArrayToMap
};
