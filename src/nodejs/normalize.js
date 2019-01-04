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

module.exports = {

    /**
     * Format as JSON - assume data looks similar to this: KEY1="value",KEY2="value"
     *
     * @param {Object} data - data
     *
     * @returns {Object} Returns data as JSON
     */
    _formatAsJson(data) {
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
    },

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
    _runCustomFunction(data, options) {
        options = options || {};
        const args = { data };

        const optionalArgs = options.args || {};
        Object.keys(optionalArgs).forEach((k) => {
            if (k === 'data') { throw new Error('Named argument "data" is not allowed'); }
            args[k] = optionalArgs[k];
        });
        try {
            return normalizeUtil[options.func](args);
        } catch (e) {
            // should possibly just return an empty string/object instead
            throw new Error(`runCustomFunction failed: ${e}`);
        }
    },

    /**
     * Get data using provided key
     *
     * @param {Object} data - data
     * @param {String} key  - key to use when accessing item in data
     *
     * @returns {Object} Returns data in key
     */
    _getDataByKey(data, key) {
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
    },

    /**
     * Check for a match
     *
     * @param {String} data    - data
     * @param {String} pattern - pattern to match on
     * @param {Integer} group  - group to choose from match
     *
     * @returns {String} Returns matched key
     */
    _checkForMatch(data, pattern, group) {
        let ret;
        const g = group || 0;
        const match = data.match(pattern);
        if (match && match[g]) ret = match[g];
        return ret;
    },

    /**
     * Rename keys in object using regex or constant
     *
     * @param {Object} data     - data
     * @param {Object} patterns - map of patterns
     *
     * @returns {Object} Returns renamed data
     */
    _renameKeysInData(data, patterns) {
        patterns = patterns || {};
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
                        const match = this._checkForMatch(
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
                ret[renamedKey] = this._renameKeysInData(data[k], patterns);
            });
            return ret;
        }

        ret = data;
        return ret;
    },

    /**
     * Standardize and reduce complexity of provided data
     *
     * @param {Object} data                        - data to reduce
     * @param {Object} options                     - options
     * @param {Object} [options.convertArrayToMap] - key to drill down into data, using a defined notation
     *
     * @returns {Object} Returns reduced object
     */
    _reduceData(data, options) {
        let ret = Array.isArray(data) ? [] : {};

        // reduce down the nested structure for some well known keys (only one in object)
        const keysToReduce = ['nestedStats', 'value', 'description', 'color'];
        for (let i = 0; i < keysToReduce.length; i += 1) {
            const item = data[keysToReduce[i]];
            if (item !== undefined && Object.keys(data).length === 1) {
                return this._reduceData(item, options);
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
            return this._reduceData(ret, options);
        }

        // simply include and then recurse
        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                // convert array to map if required, otherwise just include
                const catm = options.convertArrayToMap;
                if (catm && catm.keyName) {
                    ret = util.convertArrayToMap(data, catm.keyName, { keyPrefix: catm.keyNamePrefix });
                    // now reduce
                    ret = this._reduceData(ret, options);
                } else {
                    data.forEach((i) => {
                        ret.push(this._reduceData(i, options));
                    });
                }
            } else {
                Object.keys(data).forEach((k) => {
                    const v = data[k];
                    ret[k] = this._reduceData(v, options);
                });
            }

            return ret;
        }
        // just return data
        return data;
    },

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
    _addKeysByTag(data, tags, definitions, options) {
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
                    const match = this._checkForMatch(key, tagValue.pattern, tagValue.group);
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
                        data[k] = this._addKeysByTag(data[k], tags, def, options); // may require introspection
                    }
                });
            }
        }
        return data;
    },

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
    event(data, options) {
        options = options || {};

        let ret = this._formatAsJson(data);
        ret = this._renameKeysInData(ret, options.renameKeysByPattern);
        if (options.addKeysByTag) {
            ret = this._addKeysByTag(
                ret,
                options.addKeysByTag.tags,
                options.addKeysByTag.definitions,
                options.addKeysByTag.opts
            );
        }
        return ret;
    },

    /**
     * Normalize data - standardize and reduce complexity
     *
     * @param {Object} data                          - data to normalize
     * @param {Object} options                       - options
     * @param {String} [options.key]                 - key to drill down into data, using a defined notation
     * @param {Array} [options.filterByKeys]         - list of keys to filter data further
     * @param {Object} [options.renameKeysByPattern] - map of keys to rename by pattern
     * @param {Object} [options.convertArrayToMap]   - convert array to map using defined key name
     * @param {Object} [options.runCustomFunction]   - run custom function on data
     * @param {Object} [options.addKeysByTag]        - add key to data based on tag(s)
     *
     * @returns {Object} Returns normalized data
     */
    data(data, options) {
        options = options || {};

        // standard reduce first
        const reduceDataOptions = { convertArrayToMap: options.convertArrayToMap };
        let ret = this._reduceData(data, reduceDataOptions);

        // additional normalization may be required - the order here matters
        ret = options.key ? this._getDataByKey(ret, options.key) : ret;
        ret = options.filterByKeys ? util.filterDataByKeys(ret, options.filterByKeys) : ret;
        ret = options.renameKeysByPattern ? this._renameKeysInData(ret, options.renameKeysByPattern) : ret;
        if (options.runCustomFunction) {
            const rCFOptions = {
                func: options.runCustomFunction.name,
                args: options.runCustomFunction.args
            };
            ret = this._runCustomFunction(ret, rCFOptions);
        }
        // add keys by tag - after custom function runs
        if (options.addKeysByTag) {
            ret = this._addKeysByTag(
                ret,
                options.addKeysByTag.tags,
                options.addKeysByTag.definitions,
                options.addKeysByTag.opts
            );
        }

        return ret;
    }
};
