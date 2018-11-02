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
const normalizeUtil = require('./normalizeUtil.js');

/**
 * Run custom function
 *
 * @param {Object} data           - data
 * @param {Object} options        - optional arguments
 * @param {Object} [options.func] - function to run
 * @param {Object} [options.args] - args to provide to function
 *
 * @returns {Object} Promise which is resolved with the response
 */
function runCustomFunction(data, options) {
    const args = { data };

    const optionalArgs = options.args;
    if (optionalArgs && typeof optionalArgs === 'object') {
        Object.keys(optionalArgs).forEach((k) => {
            if (k === 'data') { throw new Error('Named argument (data) is not allowed'); }
            args[k] = optionalArgs[k];
        });
    }
    try {
        return normalizeUtil[options.func](args);
    } catch (e) {
        throw new Error(`runCustomFunction failed: ${e}`);
    }
}

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
            // do not throw error as some keys do not exist if not configured with a value on BIG-IP
            // const msg = `Incorrect dot notation in key: ${key} data: ${JSON.stringify(data)}`;
            // throw new Error(msg);
            ret = 'missing key';
        }
    });
    return ret;
}

/**
 * Convert array to map using provided options
 *
 * @param {Object} data                - data
 * @param {Object} keyName             - key in array containing value to use as key in map
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
                    // now check if regex pattern matches - support object with { pattern, group }
                    const pattern = patterns[pK].pattern ? patterns[pK].pattern : patterns[pK];
                    const group = patterns[pK].group ? patterns[pK].group : 0;
                    const checkForMatch = k.match(pattern);
                    if (checkForMatch) {
                        renameKey = true;
                        renamedKey = checkForMatch[group];
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
 * @param {Object} data                        - data to reduce
 * @param {Object} options                     - options
 * @param {Object} [options.convertArrayToMap] - key to drill down into data, using a defined notation
 *
 * @returns {Object} Promise which is resolved with the reduced object
 */
function reduceData(data, options) {
    let ret = Array.isArray(data) ? [] : {};

    // reduce down the nested structure for some well known keys (only one in object)
    const keysToReduce = ['nestedStats', 'value', 'description', 'color'];
    for (let i = 0; i < keysToReduce.length; i += 1) {
        const item = data[keysToReduce[i]];
        if (item !== undefined && Object.keys(data).length === 1) {
            return reduceData(item, options);
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
        return reduceData(ret, options);
    }

    // simply include and then recurse
    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            // convert array to map if required, otherwise just include
            const catm = options.convertArrayToMap;
            if (catm && catm.keyName) {
                ret = convertArrayToMap(data, catm.keyName, { keyPrefix: catm.keyNamePrefix });
                // now reduce
                ret = reduceData(ret, options);
            } else {
                data.forEach((i) => {
                    ret.push(reduceData(i, options));
                });
            }
        } else {
            Object.keys(data).forEach((k) => {
                const v = data[k];
                ret[k] = reduceData(v, options);
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
 * @param {Object} [options.convertArrayToMap]   - convert array to map using defined key name
 * @param {Object} [options.runCustomFunction]   - run custom function on data
 *
 * @returns {Object} Promise which is resolved with the normalized data
 */
function normalizeData(data, options) {
    // standard reduce first
    const reduceDataOptions = { convertArrayToMap: options.convertArrayToMap };
    let ret = reduceData(data, reduceDataOptions);

    // additional normalization may be required - the order here matters
    ret = options.key ? getDataByKey(ret, options.key) : ret;
    ret = options.filterByKeys ? filterDataByKeys(ret, options.filterByKeys) : ret;
    ret = options.renameKeysByPattern ? renameKeysInData(ret, options.renameKeysByPattern) : ret;
    if (options.runCustomFunction) {
        const rCFOptions = {
            func: options.runCustomFunction.name,
            args: options.runCustomFunction.args
        };
        ret = runCustomFunction(ret, rCFOptions);
    }

    return ret;
}

module.exports = {
    data: normalizeData
};
