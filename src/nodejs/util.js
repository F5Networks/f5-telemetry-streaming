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
 * @returns {Object} Converted data
 */
function convertArrayToMap(data, key, options) {
    const ret = {};

    if (!Array.isArray(data)) {
        throw new Error(`convertArrayToMap() array required: ${stringify(data)}`);
    }

    data.forEach((i) => {
        const keyName = options.keyPrefix ? `${options.keyPrefix}${i[key]}` : i[key];
        ret[keyName] = i;
    });
    return ret;
}

/**
 * Filter data based on a list of keys
 *
 * @param {Object} data - data
 * @param {Object} keys - list of keys to use to filter data
 *
 * @returns {Object} Filtered data
 */
function filterDataByKeys(data, keys) {
    const ret = data;

    if (typeof data === 'object') {
        // for now just ignore arrays
        if (Array.isArray(data)) {
            return ret;
        }

        Object.keys(data).forEach((k) => {
            let deleteKey = true;
            keys.forEach((i) => {
                // simple includes for now - no exact match
                if (k.includes(i)) {
                    deleteKey = false;
                }
            });
            if (deleteKey) {
                delete ret[k];
            } else {
                ret[k] = filterDataByKeys(ret[k], keys);
            }
        });
    }

    return ret;
}

/**
 * Stringify a message
 *
 * @param {Object} msg - message to stringify
 *
 * @returns {Object} Stringified message
 */
function stringify(msg) {
    if (typeof msg === 'object') {
        try {
            msg = JSON.stringify(msg);
        } catch (e) {
            // just leave original message intact
        }
    }
    return msg;
}

module.exports = {
    restOperationResponder,
    convertArrayToMap,
    filterDataByKeys,
    stringify
};
