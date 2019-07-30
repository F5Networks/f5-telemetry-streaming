/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const util = require('./util.js');


module.exports = {

    /**
     * Convert array to map using provided options
     *
     * @param {Object} data                - data
     * @param {String} key                 - key in array containing value to use as key in map
     * @param {Object} options             - optional arguments
     * @param {String} [options.keyPrefix] - prefix for key
     *
     * @returns {Object} Converted data
     */
    _convertArrayToMap(data, key, options) {
        const ret = {};
        options = options || {};

        if (!Array.isArray(data)) {
            throw new Error(`convertArrayToMap() array required: ${util.stringify(data)}`);
        }

        data.forEach((i) => {
            const keyName = options.keyPrefix ? `${options.keyPrefix}${i[key]}` : i[key];
            ret[keyName] = i;
        });
        return ret;
    },

    /**
     * Check for a match
     *
     * @param {String} data    - data
     * @param {String} pattern - pattern to match on
     * @param {Integer} group  - group to choose from match
     * @param {String} excludePattern - even if 'pattern' has a match, optionally check for exclude pattern
     *
     * @returns {String} Returns matched key
     */
    _checkForMatch(data, pattern, group, excludePattern) {
        let ret;
        const g = group || 0;
        let match = data.match(pattern);
        if (match && match[g]) ret = match[g];
        if (excludePattern) {
            match = data.match(excludePattern);
            if (match) ret = false;
        }
        return ret;
    },

    /**
     * Rename keys in object using regex or constant
     *
     * @param {Object} data                  - data
     * @param {Object} patterns              - map or array of patterns
     * @param {Object} options               - options
     * @param {Boolean} [options.exactMatch] - key must match base pattern exactly
     *
     * @returns {Object} Returns data with keys renamed (as needed)
     */
    _renameKeys(data, patterns, options) {
        patterns = patterns || {};
        options = options || {};
        const ret = Array.isArray(data) ? [] : {};

        const rename = (key, childPatterns) => {
            let retKey = key;
            Object.keys(childPatterns).forEach((pK) => {
                const childPattern = childPatterns[pK];
                // first check if key contains base match pattern
                // exactMatch can be specified at the global or pattern level
                // if specified at the pattern level it should override the global
                const exactMatch = (options.exactMatch === true && childPattern.exactMatch !== false)
                    || childPattern.exactMatch === true;
                const keyMatch = exactMatch ? key === pK : key.includes(pK);
                if (keyMatch) {
                    // support constant keyword
                    if (typeof childPattern.constant === 'string') {
                        retKey = childPattern.constant;
                    } else if (childPattern.replaceCharacter) {
                        // support replaceCharacter keyword
                        retKey = retKey.replace(new RegExp(pK, 'g'), childPattern.replaceCharacter);
                    } else {
                        // assume a pattern, either in .pattern or as the value
                        const patternMatch = this._checkForMatch(
                            retKey,
                            childPattern.pattern || childPattern,
                            childPattern.group
                        );
                        if (patternMatch) retKey = patternMatch;
                    }
                }
            });
            return retKey;
        };

        // only process non array objects
        if (data && typeof data === 'object' && !Array.isArray(data)) {
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
                ret[renamedKey] = this._renameKeys(data[k], patterns, options);
            });
            return ret;
        }
        return data; // just return data
    },

    /**
     * Check if data has keys
     *
     * @param {Object}  data          - data
     * @param {Array}   keys          - keys to check
     * @param {Object}  [options]     - options
     * @param {Boolean} [options.all] - all keys are required
     */
    _checkDataHasKeys(data, keys, options) {
        options = options || {};
        const func = key => data[key] !== undefined;

        if (options.all) {
            return keys.every(func);
        }
        return keys.some(func);
    },

    /**
     * Filter data based on a list of keys - include and exclude are mutually exclusive
     *
     * @param {Object} data             - data
     * @param {Object} options          - function options
     * @param {Array} [options.include] - include matching keys
     * @param {Array} [options.exclude] - exclude matching keys
     *
     * @returns {Object} Filtered data
     */
    _filterDataByKeys(data, options) {
        options = options || {};

        if (options.include && options.exclude) throw new Error('include and exclude both provided');

        if (typeof data !== 'object' || !data) return data;
        if (Array.isArray(data)) return data; // ignore arrays

        const keys = options.include || options.exclude || [];
        Object.keys(data).forEach((k) => {
            let deleteKey = false;
            if (options.include) {
                deleteKey = true; // default to true
                keys.forEach((i) => {
                    if (k.includes(i)) deleteKey = false; // no exact match
                });
            } else if (options.exclude) {
                if (keys.indexOf(k) !== -1) deleteKey = true; // exact match
            }

            if (deleteKey) {
                delete data[k];
            } else {
                data[k] = this._filterDataByKeys(data[k], options);
            }
        });

        return data;
    },

    /**
     * Average values
     *
     * @param {Object} args                - args object
     * @param {Object} [args.data]         - data to process (always included)
     * @param {Object} [args.keyWithValue] - key containing value to average
     *
     * @returns {Object} Returns averaged value
     */
    getAverage(args) {
        if (!args.keyWithValue) { throw new Error('Argument keyWithValue required'); }
        const data = args.data;
        const values = [];

        // for now assume in object, could also be provided an array and just average that
        Object.keys(data).forEach((k) => {
            const key = args.keyWithValue;
            // throw error if key is missing
            if (!(key in data[k])) { throw new Error(`Expecting key: ${key} in object: ${util.stringify(data[k])}`); }
            values.push(data[k][key]);
        });
        const averageFunc = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        return averageFunc(values);
    },

    /**
     * Sum values
     *
     * @param {Object} args            - args object
     * @param {Object} [args.data]     - data to process (always included)
     *
     * @returns {Object} Returns object containing sum
     */
    getSum(args) {
        const data = args.data;
        const values = {};

        // assume we are processing an object which also has a child object containing the keys interested in
        if (data && typeof data === 'object') {
            Object.keys(data).forEach((k) => {
                if (data[k] && typeof data[k] === 'object') {
                    Object.keys(data[k]).forEach((cK) => {
                        if (values[cK] === undefined) {
                            values[cK] = data[k][cK];
                        } else {
                            values[cK] += data[k][cK];
                        }
                    });
                }
            });
        }
        return values;
    },

    /**
     * getFirstKey
     *
     * @param {Object} args                - args object
     * @param {Object} [args.data]         - data to process (always included)
     * @param {Object} [args.splitOnValue] - only get up to a certain character of first key
     * @param {Object} [args.keyPrefix]    - prefix key with value
     *
     * @returns {Object} Returns key (if non-existent, a standard string is returned)
     */
    getFirstKey(args) {
        const data = args.data;
        // standard value returned if object is empty
        let ret = 'null';

        const objKeys = (data && typeof data === 'object') ? Object.keys(data) : [];
        if (objKeys.length) {
            ret = objKeys[0];
            ret = args.splitOnValue ? ret.split(args.splitOnValue)[0] : ret;
            ret = args.keyPrefix ? `${args.keyPrefix}${ret}` : ret;
        }
        return ret;
    },

    /**
     * getPercentFromKeys
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     * @param {Object} [args.totalKey]   - key containing total (max) value
     * @param {Object} [args.partialKey] - key containing partial value, such as free or used
     * @param {Object} [args.inverse]    - inverse percentage
     *
     * @returns {Object} Returns calculated percentage
     */
    getPercentFromKeys(args) {
        const data = args.data;

        // this should result in a number between 0 and 100 (percentage)
        let ret = Math.round(data[args.partialKey] / data[args.totalKey] * 100);
        ret = args.inverse ? 100 - ret : ret;
        return ret;
    },

    /**
     * formatAsJson
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     * @param {String} [args.type]       - type, such as csv
     * @param {String} [args.mapKey]     - key to use during convertArrayToMap
     * @param {Object} [args.renameKeys] - rename keys - see this._renameKeys for format
     * @param {Object} [args.filterKeys] - filter keys - see this._filterDataByKeys for format
     *
     * @returns {Object} Returns formatted data
     */
    formatAsJson(args) {
        const data = args.data;
        let ret = [];

        if (args.type === 'csv') {
            const dataSplit = data.split('\n');
            // assume first row contains headers, save off
            const headers = dataSplit[0].split(',');
            dataSplit.shift();

            dataSplit.forEach((l) => {
                // avoid any empty lines
                if (l !== '') {
                    const iRet = {};
                    // split into each value and add according to headers
                    l = l.split(',');
                    for (let i = 0; i < l.length; i += 1) {
                        iRet[headers[i]] = l[i];
                    }
                    ret.push(iRet);
                }
            });
            // now convert to map
            ret = this._convertArrayToMap(ret, args.mapKey, {});
            // filter keys - if required
            ret = args.filterKeys ? this._filterDataByKeys(ret, args.filterKeys) : ret;
            // rename keys - if required
            ret = args.renameKeys ? this._renameKeys(ret, args.renameKeys.patterns, args.renameKeys.options) : ret;
        } else {
            throw new Error(`Unsupported type: ${args.type}`);
        }
        return ret;
    },

    /**
     * restructureRules
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     *
     * @returns {Object} Returns formatted data
     */
    restructureRules(args) {
        const newRules = {};

        Object.keys(args.data).forEach((key) => {
            newRules[key] = {};
            newRules[key].events = {};
            newRules[key].events[args.data[key].eventType] = {};
            Object.keys(args.data[key]).forEach((k) => {
                if (k !== 'eventType') {
                    newRules[key].events[args.data[key].eventType][k] = args.data[key][k];
                }
            });
        });
        return newRules;
    }
};
