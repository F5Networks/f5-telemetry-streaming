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
 * Standardize and reduce complexity of provided data
 *
 * @param {Object} obj - object to reduce
 *
 * @returns {Object} Promise which is resolved with the reduced object
 */
function reduceData(obj) {
    let objRet = Array.isArray(obj) ? [] : {};

    // reduce down the nested structure for some well known keys
    const keysToReduce = ['nestedStats', 'value', 'description', 'color'];
    for (let i = 0; i < keysToReduce.length; i += 1) {
        const item = obj[keysToReduce[i]];
        if (item !== undefined) {
            return reduceData(item);
        }
    }

    // .entries evaluates to true if obj is array
    if (obj.entries && !Array.isArray(obj)) {
        Object.keys(obj.entries).forEach((k) => {
            const v = obj.entries[k];

            // child entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats,
            // we should simplify this somewhat
            const kM = k.replace('https://localhost/', '').replace('mgmt/tm/', '');
            objRet[kM] = v;
        });
        return reduceData(objRet);
    }

    // simply include and then recurse
    if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            obj.forEach((i) => {
                objRet.push(reduceData(i));
            });
        } else {
            Object.keys(obj).forEach((k) => {
                const v = obj[k];
                objRet[k] = reduceData(v);
            });
        }

        return objRet;
    }
    // simply return if no previous return
    objRet = obj;
    return objRet;
}

/**
 * Normalize data - standardize and reduce complexity
 *
 * @param {Object} data                   - data to normalize
 * @param {Object} options                - options
 * @param {Object} [options.key]          - key to drill down into data, using a defined notation
 * @param {Object} [options.filterByKeys] - list of keys to filter data further
 *
 * @returns {Object} Promise which is resolved with the normalized data
 */
function normalizeData(data, options) {
    let reducedData = reduceData(data);

    // additional filtering may be required
    reducedData = options.key ? getDataByKey(reducedData, options.key) : reducedData;
    reducedData = options.filterByKeys ? filterDataByKeys(reducedData, options.filterByKeys) : reducedData;

    return reducedData;
}

module.exports = {
    stat: normalizeData
};
