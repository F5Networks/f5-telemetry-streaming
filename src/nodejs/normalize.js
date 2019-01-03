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
const util = require('./util.js');
const normalizeUtil = require('./normalizeUtil.js');

/**
 * Format as JSON - assume data looks similar to this: KEY1="value",KEY2="value"
 *
 * @param {Object} data - data
 *
 * @returns {Object} Returns data as JSON
 */
function formatAsJson(data) {
    const ret = {};
    // place in try/catch in case this event is malformed
    try {
        const dataToFormat = data.trim(); // remove new line char or whitespace from end of line
        const baseSplit = dataToFormat.split('",'); // don't split on just comma, that may appear inside a specific key
        baseSplit.forEach((i) => {
            const keySplit = i.split('=');
            const keyValue = keySplit[1].replace(/"/g, '');
            ret[keySplit[0]] = keyValue;
        });
    } catch (e) {
        logger.error(`formatAsJson error: ${e}`);
    }
    return ret;
}

/**
 * Run custom function
 *
 * @param {Object} data             - data
 * @param {Object} options          - optional arguments
 * @param {Function} [options.func] - function to run
 * @param {Object} [options.args]   - args to provide to function
 *
 * @returns {Object} Returns function result
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
        // should possibly just return an empty string/object instead
        throw new Error(`runCustomFunction failed: ${e}`);
    }
}

/**
 * Get data using provided key
 *
 * @param {Object} data - data
 * @param {String} key  - key to use when accessing item in data
 *
 * @returns {Object} Returns data in key
 */
function getDataByKey(data, key) {
    const keys = key.split(constants.STATS_KEY_SEP);
    let ret = data;

    keys.forEach((i) => {
        if (typeof ret === 'object' && i in ret) {
            ret = ret[i];
        } else {
            // do not throw error as some keys do not exist if not configured with a value on BIG-IP
            ret = 'missing data';
        }
    });
    return ret;
}

/**
 * Check for a match
 *
 * @param {String} data           - data
 * @param {String} pattern        - pattern to match on
 * @param {Integer} group         - group to choose from match
 * @param {String} excludePattern - even if 'pattern' has a match, optionally check for exclude pattern
 *
 * @returns {String} Returns matched key
 */
const checkForMatch = (data, pattern, group, excludePattern) => {
    let ret;
    const g = group || 0;
    let match = data.match(pattern);
    if (match && match[g]) ret = match[g];
    if (excludePattern) {
        match = data.match(excludePattern);
        if (match) ret = false;
    }
    return ret;
};

/**
 * Rename keys in object using regex or constant
 *
 * @param {Object} data     - data
 * @param {Object} patterns - map of patterns
 *
 * @returns {Object} Returns renamed data
 */
function renameKeysInData(data, patterns) {
    let ret = Array.isArray(data) ? [] : {};

    const rename = (key, childPatterns) => {
        let retKey = key;
        Object.keys(childPatterns).forEach((pK) => {
            // first check if key contains base match pattern
            if (key.includes(pK)) {
                // support constant keyword
                if (childPatterns[pK].constant) {
                    retKey = childPatterns[pK].constant;
                } else if (childPatterns[pK].replaceCharacter) {
                    // support replaceCharacter keyword
                    retKey = retKey.replace(new RegExp(pK, 'g'), childPatterns[pK].replaceCharacter);
                } else {
                    // assume a pattern, either in .pattern or as the value
                    const match = checkForMatch(
                        retKey,
                        childPatterns[pK].pattern || childPatterns[pK],
                        childPatterns[pK].group
                    );
                    if (match) retKey = match;
                }
            }
        });
        return retKey;
    };

    // only process non array objects
    if (typeof data === 'object' && !Array.isArray(data)) {
        Object.keys(data).forEach((k) => {
            let renamedKey = k;
            // if patterns is an array assume it contains 1+ maps to process
            // this provides a means to guarantee order
            if (Array.isArray(patterns)) {
                patterns.forEach((i) => {
                    renamedKey = rename(renamedKey, i);
                });
            } else {
                renamedKey = rename(renamedKey, patterns);
            }
            ret[renamedKey] = renameKeysInData(data[k], patterns);
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
 * @param {Object} [options.includeFirstEntry] - include first item in 'entries' at the top level
 *
 * @returns {Object} Returns reduced object
 */
function reduceData(data, options) {
    let ret = Array.isArray(data) ? [] : {};

    // reduce down the nested structure for some well known keys - assuming only one in object
    const keysToReduce = ['nestedStats', 'value', 'description', 'color'];
    for (let i = 0; i < keysToReduce.length; i += 1) {
        const item = data[keysToReduce[i]];
        if (item !== undefined && Object.keys(data).length === 1) return reduceData(item, options);
    }

    // .entries evaluates to true if data is an array
    const entries = 'entries';
    if (data[entries] && !Array.isArray(data)) {
        // entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats, we should simplify this somewhat
        const simplifyKey = key => key.replace('https://localhost/', '').replace('mgmt/tm/', '');

        const iFE = options.includeFirstEntry;
        const entryKey = Object.keys(data[entries])[0];
        if (iFE && checkForMatch(entryKey, iFE.pattern, iFE.group, iFE.excludePattern)) {
            data = Object.assign(data[entries][entryKey], data);
            delete data[entries];
            Object.keys(data).forEach((k) => {
                ret[simplifyKey(k)] = reduceData(data[k], options);
            });
            return reduceData(ret, options);
        }
        // standard entries reduce
        Object.keys(data[entries]).forEach((k) => {
            ret[simplifyKey(k)] = reduceData(data[entries][k], options);
        });
        return reduceData(ret, options);
    }

    // simply include and then recurse
    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            // convert array to map if required, otherwise just include
            const catm = options.convertArrayToMap;
            if (catm && catm.keyName) {
                ret = util.convertArrayToMap(data, catm.keyName, { keyPrefix: catm.keyNamePrefix });
                ret = reduceData(ret, options);
            } else {
                data.forEach((i) => {
                    ret.push(reduceData(i, options));
                });
            }
        } else {
            Object.keys(data).forEach((k) => {
                if (k === 'nestedStats') {
                    Object.keys(data[k]).forEach((cK) => {
                        ret[cK] = reduceData(data[k][cK], options);
                    });
                } else {
                    ret[k] = reduceData(data[k], options);
                }
            });
        }
        return ret;
    }
    return data; // just return data
}

/**
 * Add key to object by tag(s)
 *
 * @param {Object} data                    - data
 * @param {Object} tags                    - map of tags
 * @param {Object} definitions             - map of standard definitions
 * @param {Object} options                 - options
 * @param {Array} [options.skip]           - array of child object keys to skip
 * @param {Array} [options.classifyByKeys] - classify by specific keys (used by events)
 *
 * @returns {Object} Returns data with added tags
 */
function addKeysByTag(data, tags, definitions, options) {
    const tagKeys = Object.keys(tags);
    const skip = options.skip || [];
    const def = definitions || {};

    const processTags = (thisData, key) => {
        tagKeys.forEach((t) => {
            let val = ''; // default value

            // certain tag values will contain standard definitions like '`T`', check for those
            // then check if the tag value contains 'pattern'
            // otherwise assume the tag value is a 'constant'
            let tagValue = tags[t];
            if (tagValue in def) tagValue = def[tagValue]; // overwrite with def value

            if (tagValue.pattern) {
                const match = checkForMatch(key, tagValue.pattern, tagValue.group);
                if (match) val = match;
            } else {
                val = tagValue;
            }
            thisData[t] = val;
        });
        return thisData;
    };

    if (typeof data === 'object' && !Array.isArray(data)) {
        // if we are classifying by keys (already defined) assume we are processing a flat
        // data structure
        if (options.classifyByKeys) {
            options.classifyByKeys.forEach((i) => {
                if (i in data) {
                    data = processTags(data, data[i]);
                }
            });
        } else {
            // assume we are adding keys to child object based on value of parent key
            Object.keys(data).forEach((k) => {
                if (skip.length && skip.indexOf(k) !== -1) return; // skip
                if (tagKeys.length && k.indexOf(tagKeys) !== -1) return; // already exists, skip
                if (typeof data[k] === 'object') {
                    data[k] = processTags(data[k], k);
                    data[k] = addKeysByTag(data[k], tags, def, options); // may require introspection
                }
            });
        }
    }
    return data;
}

/**
 * Normalize event
 *
 * @param {Object} data - data to normalize
 *
 * @param {Object} options                       - options
 * @param {Object} [options.renameKeysByPattern] - map of keys to rename
 * @param {Array} [options.addKeysByTag]         - add key to data based on tag(s)
 *
 * @returns {Object} Returns normalized event
 */
function normalizeEvent(data, options) {
    let ret = formatAsJson(data);
    ret = renameKeysInData(ret, options.renameKeysByPattern);
    if (options.addKeysByTag) {
        ret = addKeysByTag(
            ret,
            options.addKeysByTag.tags,
            options.addKeysByTag.definitions,
            options.addKeysByTag.opts
        );
    }
    return ret;
}

/**
 * Normalize data - standardize and reduce complexity
 *
 * @param {Object} data                          - data to normalize
 * @param {Object} options                       - options
 * @param {String} [options.key]                 - key to drill down into data, using a defined notation
 * @param {Array} [options.filterByKeys]         - list of keys to filter data further
 * @param {Object} [options.renameKeysByPattern] - map of keys to rename by pattern
 * @param {Object} [options.convertArrayToMap]   - convert array to map using defined key name
 * @param {Object} [options.includeFirstEntry]   - include first item in 'entries' at the top level
 * @param {Object} [options.runCustomFunction]   - run custom function on data
 * @param {Object} [options.addKeysByTag]        - add key to data based on tag(s)
 *
 * @returns {Object} Returns normalized data
 */
function normalizeData(data, options) {
    // standard reduce first
    const reduceDataOptions = {
        convertArrayToMap: options.convertArrayToMap,
        includeFirstEntry: options.includeFirstEntry
    };
    let ret = reduceData(data, reduceDataOptions);

    // additional normalization may be required - the order here matters
    ret = options.key ? getDataByKey(ret, options.key) : ret;
    ret = options.filterByKeys ? util.filterDataByKeys(ret, options.filterByKeys) : ret;
    ret = options.renameKeysByPattern ? renameKeysInData(ret, options.renameKeysByPattern) : ret;
    if (options.runCustomFunction) {
        const rCFOptions = {
            func: options.runCustomFunction.name,
            args: options.runCustomFunction.args
        };
        ret = runCustomFunction(ret, rCFOptions);
    }
    // add keys by tag - after custom function runs
    if (options.addKeysByTag) {
        ret = addKeysByTag(
            ret,
            options.addKeysByTag.tags,
            options.addKeysByTag.definitions,
            options.addKeysByTag.opts
        );
    }

    return ret;
}

module.exports = {
    data: normalizeData,
    event: normalizeEvent
};
