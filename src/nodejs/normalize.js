/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const constants = require('./constants.js');

/**
 * Get data using provided key
 *
 * @param {Object} data - data
 * @param {Object} key  - key to use when accessing item in data
 *
 * @returns {Object} Promise which is resolved with the data
 */
function getDataByKey(data, key) {
    const keys = key.split(constants.STATS_KEY_SEP);
    let ret = data;

    keys.forEach((i) => {
        if (typeof ret === 'object' && i in ret) {
            ret = ret[i];
        } else {
            const msg = `Incorrect dot notation in key: ${key} data: ${JSON.stringify(data)}`;
            throw new Error(msg);
        }
    });
    return ret;
}

/**
 * Filter data based on a list of keys
 *
 * @param {Object} data - data
 * @param {Object} keys - list of keys to filter data by
 *
 * @returns {Object} Promise which is resolved with the data
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
 * Rename keys in object using regex pattern
 *
 * @param {Object} data     - data
 * @param {Object} patterns - map of patterns
 *
 * @returns {Object} Promise which is resolved with the data
 */
function renameKeysInData(data, patterns) {
    let ret = Array.isArray(data) ? [] : {};

    // only check non array objects
    if (typeof data === 'object' && !Array.isArray(data)) {
        Object.keys(data).forEach((k) => {
            let renameKey = false;
            let renamedKey;
            Object.keys(patterns).forEach((pK) => {
                // check if key contains base match pattern
                if (k.includes(pK)) {
                    // now check if regex pattern matches
                    const checkForMatch = k.match(patterns[pK]);
                    if (checkForMatch) {
                        renameKey = true;
                        renamedKey = checkForMatch[0];
                    }
                }
            });
            if (renameKey) {
                ret[renamedKey] = renameKeysInData(data[k], patterns);
            } else {
                ret[k] = renameKeysInData(data[k], patterns);
            }
        });
        return ret;
    }

    ret = data;
    return ret;
}

/**
 * Standardize and reduce complexity of provided data
 *
 * @param {Object} data - data to reduce
 *
 * @returns {Object} Promise which is resolved with the reduced object
 */
function reduceData(data) {
    let ret = Array.isArray(data) ? [] : {};

    // reduce down the nested structure for some well known keys
    const keysToReduce = ['nestedStats', 'value', 'description', 'color'];
    for (let i = 0; i < keysToReduce.length; i += 1) {
        const item = data[keysToReduce[i]];
        if (item !== undefined) {
            return reduceData(item);
        }
    }

    // .entries evaluates to true if data is array
    if (data.entries && !Array.isArray(data)) {
        Object.keys(data.entries).forEach((k) => {
            const v = data.entries[k];

            // child entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats,
            // we should simplify this somewhat
            const kM = k.replace('https://localhost/', '').replace('mgmt/tm/', '');
            ret[kM] = v;
        });
        return reduceData(ret);
    }

    // simply include and then recurse
    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            data.forEach((i) => {
                ret.push(reduceData(i));
            });
        } else {
            Object.keys(data).forEach((k) => {
                const v = data[k];
                ret[k] = reduceData(v);
            });
        }

        return ret;
    }
    // base case - just return
    ret = data;
    return ret;
}

/**
 * Normalize data - standardize and reduce complexity
 *
 * @param {Object} data                          - data to normalize
 * @param {Object} options                       - options
 * @param {Object} [options.key]                 - key to drill down into data, using a defined notation
 * @param {Object} [options.filterByKeys]        - list of keys to filter data further
 * @param {Object} [options.renameKeysByPattern] - map of keys to rename by pattern
 *
 * @returns {Object} Promise which is resolved with the normalized data
 */
function normalizeData(data, options) {
    // standard reduce first
    let ret = reduceData(data);

    // additional filtering may be required
    ret = options.key ? getDataByKey(ret, options.key) : ret;
    ret = options.filterByKeys ? filterDataByKeys(ret, options.filterByKeys) : ret;
    ret = options.renameKeysByPattern ? renameKeysInData(ret, options.renameKeysByPattern) : ret;

    return ret;
}

module.exports = {
    data: normalizeData
};
