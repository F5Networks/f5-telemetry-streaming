/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('../logger'); // eslint-disable-line no-unused-vars
const util = require('./misc');
const constants = require('../constants');


module.exports = {
    /**
     * Format MAC address
     *
     * @param {String} mac - MAC address
     *
     * @returns {String} formatted MAC address
     */
    _formatMACAddress(mac) {
        // expect ':' in mac addr - aa:b:cc:d:ee:f
        if (mac.indexOf(':') === -1) {
            return mac;
        }
        return mac.split(':').map((item) => {
            item = item.toUpperCase();
            if (item.length === 1) {
                item = `0${item}`;
            }
            return item;
        }).join(':');
    },

    /**
     * Convert array to map using provided options
     *
     * @param {Object} data                - data
     * @param {String|Array} key           - one or more fields to use as the keyName for the map
     * @param {Object} options             - optional arguments
     * @param {String} [options.keyNamePrefix] - prefix for key
     * @param {Boolean} [options.skipWhenKeyMissing] - skip conversion when key does not exist
     * @param {String} [options.keyNamesSeparator] - default underscore - character used to concatenate keyNames
     *                                          when there is more than one key to use (compound key)
     * @returns {Object} Converted data
     */
    _convertArrayToMap(data, key, options) {
        if (!Array.isArray(data)) {
            throw new Error(`convertArrayToMap() array required: ${util.stringify(data)}`);
        }

        const ret = {};
        options = options || {};
        const keyNamesSeparator = options.keyNamesSeparator ? options.keyNamesSeparator : '_';
        const isCompoundKey = Array.isArray(key);
        data.forEach((i) => {
            let keyName = '';
            if (isCompoundKey) {
                key.forEach((k) => {
                    keyName += `${keyNamesSeparator}${i[k]}`;
                });
                // remove separator from beginning
                keyName = keyName.substring(1);
                if (options.keyNamePrefix) {
                    keyName = `${options.keyNamePrefix}${keyName}`;
                }
            } else {
                keyName = options.keyNamePrefix ? `${options.keyNamePrefix}${i[key]}` : i[key];
            }

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
     * Restructure host-info to collect CPU statistics for the host(s) and cpu(s)
     * that match the provided key pattern.
     * This function depends upon the exact output from the host-info endpoint, and will requires
     * that every object key is unique.
     *
     * @param {Object} args                 - args object
     * @param {Object} [args.data]          - data to process (always included)
     * @param {Object} [args.keyPattern]    - pattern used to traverse object keys
     *
     * @returns {Object} Returns matching sub-properties
     */
    restructureHostCpuInfo(args) {
        if (!args.keyPattern) {
            throw new Error('Argument keyPattern required');
        }
        const data = args.data;
        if (typeof data !== 'object') {
            return data;
        }
        const keys = args.keyPattern.split(constants.STATS_KEY_SEP);

        const findMatches = (inputData) => {
            if (keys.length === 0) {
                return inputData;
            }
            const keyExp = new RegExp(keys.splice(0, 1));
            const matchedData = {};

            Object.keys(inputData).forEach((dataItem) => {
                if (keyExp.test(dataItem)) {
                    // Capture ALL sub-properties if property matches, instead of iterating over object keys
                    // Will overwrite matching keys in 'matchedData' - assumption is that *EVERY* key is unique
                    Object.assign(matchedData, inputData[dataItem]);
                }
            });
            return findMatches(matchedData);
        };
        const result = findMatches(data);
        return Object.keys(result).length === 0 ? 'missing data' : result;
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
        if (!args.keyWithValue) {
            throw new Error('Argument keyWithValue required');
        }
        const data = args.data;
        if (typeof data !== 'object') {
            return data;
        }
        const values = [];

        // for now assume in object, could also be provided an array and just average that
        Object.keys(data).forEach((k) => {
            const key = args.keyWithValue;
            // throw error if key is missing
            if (!(key in data[k])) {
                throw new Error(`Expecting key: ${key} in object: ${util.stringify(data[k])}`);
            }
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
     * @param {Object} args                     - args object
     * @param {Object} [args.data]              - data to process (always included)
     * @param {Object} [args.totalKey]          - key containing total (max) value
     * @param {Object} [args.partialKey]        - key containing partial value, such as free or used
     * @param {Object} [args.inverse]           - inverse percentage
     * @param {Object} [args.nestedObjects]     - whether or not to traverse sub-objects for keys
     *
     * @returns {Object} Returns calculated percentage
     */
    getPercentFromKeys(args) {
        const data = args.data;

        const accumulateSubKeys = (arg, dataKeys) => dataKeys
            .map(key => data[key][arg])
            .reduce((acc, val) => acc + val);

        if (args.nestedObjects && typeof data === 'object') {
            // Get object keys before modifying the data object
            const dataKeys = Object.keys(data);
            [args.partialKey, args.totalKey].forEach((arg) => {
                data[arg] = accumulateSubKeys(arg, dataKeys);
            });
        }

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
            ret = args.mapKey ? this._convertArrayToMap(ret, args.mapKey, {}) : ret;
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
            const ruleItem = args.data[key];
            const tmName = ruleItem.tmName;
            newRules[tmName] = newRules[tmName] || {};
            newRules[tmName].events = newRules[tmName].events || {};
            newRules[tmName].events[ruleItem.eventType] = ruleItem;
        });
        return newRules;
    },

    /**
     * Convert map to array using provided options
     *
     * @param {Object} data - data
     *
     * @returns {Object} Converted data
     */
    convertMapToArray(data) {
        const ret = [];
        data = data.data;

        if (typeof data !== 'object') {
            throw new Error(`convertMapToArray() object required: ${util.stringify(data)}`);
        }

        Object.keys(data).forEach(key => ret.push(data[key]));
        return ret;
    },

    /**
     * restructureGslbPool
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     *
     * @returns {Object} Returns formatted data
     */
    restructureGslbPool(args) {
        const data = args.data;
        if (data.membersReference) {
            if (data.membersReference.entries) {
                const statsKeys = Object.keys(data.membersReference.entries);
                statsKeys.forEach((key) => {
                    const statsEntry = data.membersReference.entries[key];
                    const vsAndServer = statsEntry.nestedStats.selfLink.split('/members/')[1].split('/stats')[0];
                    const vs = vsAndServer.split(':')[0];
                    const server = vsAndServer.split(':')[1];
                    const item = data.membersReference.items.find(i => i.selfLink.includes(`${server}:${vs}`));
                    Object.assign(data.membersReference.entries[key].nestedStats.entries, item);
                });
            } else {
                delete data.membersReference.items;
            }
        }
        return data;
    },

    /**
     * restructureGslbWideIp
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     *
     * @returns {Object} Returns formatted data
     */
    restructureGslbWideIp(args) {
        const data = args.data;

        const buildFullPath = (pool) => {
            const subPath = pool.subPath ? `/${pool.subPath}` : '';
            return `/${pool.partition}${subPath}/${pool.name}`;
        };

        Object.keys(data).forEach((key) => {
            const item = data[key];
            if (item.pools) {
                item.pools = item.pools.map(p => buildFullPath(p));
            }

            if (item.poolsCname) {
                item.pools = item.pools || [];
                item.pools = item.pools.concat(item.poolsCname.map(p => buildFullPath(p)));
            }

            if (item.lastResortPool) {
                item.lastResortPool = item.lastResortPool.split(' ')[1];
            }
            delete item.poolsCname;
        });

        return data;
    },

    /**
     * Normalize MAC Address - upper case and etc.
     *
     * @param {Object} args                      - args object
     * @param {Object} [args.data]               - data to process (always included)
     * @param {Array.<String>} [args.properties] - list of properties to format
     *
     * @returns {Object} Returns formatted data
     */
    normalizeMACAddress(args) {
        let data = args.data;
        if (data) {
            if (typeof args.properties === 'undefined') {
                data = this._formatMACAddress(data);
            } else {
                const properties = args.properties;
                const stack = [data];
                let obj;

                const forKey = (key) => {
                    const val = obj[key];
                    if (typeof val === 'object') {
                        if (val !== null) {
                            stack.push(val);
                        }
                    } else if (properties.indexOf(key) !== -1 && typeof val === 'string') {
                        obj[key] = this._formatMACAddress(val);
                    }
                };

                while (stack.length) {
                    obj = stack[0];
                    Object.keys(obj).forEach(forKey);
                    stack.shift();
                }
            }
        }
        return data;
    },

    /**
     * Restructure Virtual Server Profiles
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     *
     * @returns {Object} Returns formatted data
     */
    restructureVirtualServerProfiles(args) {
        /**
         * Possible issues:
         * profiles: {
         *      name: 'profiles', <---- should be removed
         *      items: { <---- should be removed
         *         name: 'items', <---- should be removed
         *         profile1: { <---- should be moved one level up
         *             name: 'profile1',
         *             .....
         *         }
         *      }
         * }
         */
        const data = args.data;
        if (data) {
            Object.keys(data).forEach((vsName) => {
                const vsObj = data[vsName];
                if (vsObj.profiles) {
                    const profiles = vsObj.profiles;
                    delete profiles.name;

                    if (profiles.items) {
                        delete profiles.items.name;

                        Object.keys(profiles.items).forEach((profileName) => {
                            profiles[profileName] = profiles.items[profileName];
                        });
                        delete profiles.items;
                    }
                }
            });
        }
        return data;
    },

    /**
     * Get value by key/path
     *
     * @param {Object} args               - args object
     * @param {Object} [args.data]        - data to process (always included)
     * @param {Array<String>} [args.path] - path to fetch data from
     *
     * @returns {Object} Returns value that belongs to key/path
     */
    getValue(args) {
        let data = args.data;
        if (data && args.path) {
            args.path.every((key) => {
                data = data[key];
                if (typeof data === 'undefined') {
                    data = 'missing data';
                    return false;
                }
                return true;
            });
        }
        return data;
    },

    /**
     * Convert empty data to empty Object
     *
     * @param {Object} args               - args object
     * @param {Object} [args.data]        - data to process (always included)
     *
     * @returns {Object} original data or empty object
     */
    convertEmptyToObject(args) {
        return util.isObjectEmpty(args.data) ? {} : args.data;
    },

    /**
     * Add Capacity_Float property
     *
     * @param {Object} args               - args object
     * @param {Object} [args.data]        - data to process (always included)
     * @param {Array<String>} [args.path] - path to fetch data from
     *
     * @returns {Object} Returns updated data
     */
    diskStoragePercentsToFloating(args) {
        const diskStorage = args.data;
        Object.keys(diskStorage).forEach((diskName) => {
            diskStorage[diskName].Capacity_Float = parseFloat(diskStorage[diskName].Capacity) / 100.0;
        });
        return args.data;
    },

    /**
     * Convert ConfigSync color status to boolean
     *
     * @param {Object} args               - args object
     * @param {Object} [args.data]        - data to process (always included)
     * @param {Array<String>} [args.path] - path to fetch data from
     *
     * @returns {Object} Returns updated data
     */
    configSyncColorToBool(args) {
        return args.data === 'green';
    }
};
