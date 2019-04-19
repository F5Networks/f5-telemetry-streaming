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


module.exports = {

    /**
     * Format as JSON - assume data looks similar to this: KEY1="value",KEY2="value"
     *
     * @param {Object} data - data
     *
     * @returns {Object} Returns data as JSON
     */
    _formatAsJson(data) {
        const defaultKey = 'data';
        const ret = {};
        // place in try/catch in case this event is malformed
        try {
            const dataToFormat = data.trim(); // remove new line char or whitespace from end of line
            /**
             * - split data on '="' is more reliable, because '"' should be never
             *   escaped (like '\"') right after '=' otherwise it is part of value.
             * - split data on '",' is less reliable, because it could be part of
             *   value (e.g. '"' can be escaped)
             */
            const baseSplit = dataToFormat.split('="');

            // some events cannot be parsed as multiple key value pairs, but those can still be processed
            // if no delimiters exist just place the whole string inside a single key
            if (baseSplit.length === 1) {
                ret[defaultKey] = dataToFormat;
            } else {
                let val;
                let nextKey;
                let key = baseSplit[0];
                const len = baseSplit.length;
                // value-key separator
                const sep = '",';

                for (let i = 1; i < len; i += 1) {
                    // leading '"' removed by initial split already
                    const item = baseSplit[i];
                    if (i === len) {
                        // last item is value
                        val = item;
                        // remove trailing '"'
                        if (val.endsWith('"')) {
                            val = val.slice(0, val.length - 1);
                        }
                    } else {
                        const idx = item.lastIndexOf(sep);
                        if (idx === -1) {
                            // that's weird, data malformed
                            val = item;
                            nextKey = key;
                        } else {
                            val = item.slice(0, idx);
                            nextKey = item.slice(idx + sep.length);
                        }
                    }
                    ret[key] = val;
                    key = nextKey;
                }
            }
        } catch (e) {
            logger.error(`formatAsJson error: ${e}`);
        }
        return ret;
    },

    /**
     * Format timestamps - to ISO string like 2019-01-01T01:01:01Z
     *
     * @param {Object} data       - data
     * @param {Object} timestamps - explicit array of timestamp keys
     *
     * @returns {Object} Returns data with formatted timestamps
     */
    _formatTimestamps(data, timestamps) {
        timestamps = timestamps || [];

        // check for timestamp keys, recurse until no longer an object
        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                data.forEach((i) => {
                    this._formatTimestamps(i, timestamps);
                });
            } else {
                Object.keys(data).forEach((k) => {
                    if (timestamps.indexOf(k) !== -1) {
                        // assume value can be parsed by Date(), it is pretty greedy
                        // but still... try/catch
                        try {
                            data[k] = new Date(data[k]).toISOString();
                        } catch (error) {
                            // well, we tried
                        }
                    }
                    this._formatTimestamps(data[k], timestamps);
                });
            }
        }
        return data;
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
            if (ret && typeof ret === 'object' && i in ret) {
                ret = ret[i];
            } else {
                // do not throw error as some keys do not exist if not configured with a value on BIG-IP
                ret = 'missing data';
            }
        });
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

        // reduce down the nested structure for some well known keys - assuming only one in object
        const keysToReduce = ['nestedStats', 'value', 'description', 'color'];
        for (let i = 0; i < keysToReduce.length; i += 1) {
            const item = data[keysToReduce[i]];
            if (item !== undefined && Object.keys(data).length === 1) return this._reduceData(item, options);
        }

        // .entries evaluates to true if data is an array
        const entries = 'entries';
        if (data && data[entries] && !Array.isArray(data)) {
            // entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats, we should simplify this somewhat
            const simplifyKey = key => key.replace('https://localhost/', '').replace('mgmt/tm/', '');

            const iFE = options.includeFirstEntry;
            const entryKey = Object.keys(data[entries])[0];
            if (iFE && normalizeUtil._checkForMatch(entryKey, iFE.pattern, iFE.group, iFE.excludePattern)) {
                data = Object.assign(data[entries][entryKey], data);
                delete data[entries]; // delete entries key after merge
                Object.keys(data).forEach((k) => {
                    ret[simplifyKey(k)] = this._reduceData(data[k], options);
                });
                return this._reduceData(ret, options);
            }
            // standard entries reduce
            Object.keys(data[entries]).forEach((k) => {
                ret[simplifyKey(k)] = this._reduceData(data[entries][k], options);
            });
            return this._reduceData(ret, options);
        }

        // simply include and then recurse
        if (data && typeof data === 'object') {
            if (Array.isArray(data)) {
                // convert array to map if required, otherwise just include
                const catm = options.convertArrayToMap;
                if (catm && catm.keyName) {
                    ret = normalizeUtil._convertArrayToMap(data, catm.keyName, { keyPrefix: catm.keyNamePrefix });
                    ret = this._reduceData(ret, options);
                } else {
                    data.forEach((i) => {
                        ret.push(this._reduceData(i, options));
                    });
                }
            } else {
                Object.keys(data).forEach((k) => {
                    if (k === 'nestedStats') {
                        Object.keys(data[k]).forEach((cK) => {
                            ret[cK] = this._reduceData(data[k][cK], options);
                        });
                    } else {
                        ret[k] = this._reduceData(data[k], options);
                    }
                });
            }
            return ret;
        }
        return data; // just return data
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
                    const match = normalizeUtil._checkForMatch(key, tagValue.pattern, tagValue.group);
                    if (match) val = match;
                } else {
                    val = tagValue;
                }
                thisData[t] = val;
            });
            return thisData;
        };

        if (data && typeof data === 'object' && !Array.isArray(data)) {
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
                    if (data[k] && typeof data[k] === 'object') {
                        data[k] = processTags(data[k], k);
                        data[k] = this._addKeysByTag(data[k], tags, def, options); // may require further introspection
                    }
                });
            }
        }
        return data;
    },

    /**
     * Normalize event
     *
     * @param {Object} data                          - data to normalize
     *
     * @param {Object} options                       - options
     * @param {Object} [options.renameKeysByPattern] - contains map or array of keys to rename by pattern
     *                                                 object example: { patterns: {}, options: {}}
     * @param {Array} [options.addKeysByTag]         - add key to data based on tag(s)
     * @param {Array} [options.formatTimestamps]     - array containing timestamp keys to format/normalize
     *
     * @returns {Object} Returns normalized event
     */
    event(data, options) {
        options = options || {};
        let ret = this._formatAsJson(data);
        ret = options.renameKeysByPattern ? normalizeUtil._renameKeys(ret, options.renameKeysByPattern.patterns) : ret;
        if (options.addKeysByTag) {
            ret = this._addKeysByTag(
                ret,
                options.addKeysByTag.tags,
                options.addKeysByTag.definitions,
                options.addKeysByTag.opts
            );
        }
        // format timestamps
        const nT = options.formatTimestamps;
        if (nT) {
            ret = this._formatTimestamps(ret, nT);
        }
        return ret;
    },

    /**
     * Normalize iHealth data
     *
     * @param {Object} data - data to normalize
     *
     * @param {Object} options                       - options
     * @param {Object} [options.renameKeysByPattern] - contains map or array of keys to rename by pattern
     *                                                 object example: { patterns: {}, options: {}}
     * @param {Array}  [options.filterByKeys]        - array containg map of keys to filter data further
     *                                                 example: { exclude: [], include: []}
     *
     * @returns {Object} Returns normalized event
     */
    ihealth(data, options) {
        options = options || {};

        const normalized = {
            system: {
                hostname: data.system_information.hostname
            },
            diagnostics: []
        };
        const diagnostics = ((data.diagnostics || {}).diagnostic || []);

        diagnostics.forEach((diagnostic) => {
            let ret = options.filterByKeys ? normalizeUtil._filterDataByKeys(diagnostic, options.filterByKeys)
                : diagnostic;

            ret = options.renameKeys
                ? normalizeUtil._renameKeys(ret, options.renameKeys.patterns, options.renameKeys.options) : ret;

            const reduced = {};
            Object.assign(reduced, ret.run_data);
            Object.assign(reduced, ret.results);
            Object.assign(reduced, ret.fixedInVersions);

            if (reduced.version && reduced.version.length === 0) {
                delete reduced.version;
            }
            normalized.diagnostics.push(reduced);
        });

        return normalized;
    },

    /**
     * Normalize data - standardize and reduce complexity
     *
     * @param {Object} data                         - data to normalize
     * @param {Object} options                      - options
     * @param {String} [options.key]                - key to drill down into data, using a defined notation
     * @param {Array} [options.filterByKeys]        - array containg map of keys to filter data further
     *                                                example: { exclude: [], include: []}
     * @param {Array} [options.renameKeysByPattern] - array containing 1+ map(s) of keys to rename by pattern
     *                                                example: [{ patterns: {}, options: {}}]
     * @param {Object} [options.convertArrayToMap]  - convert array to map using defined key name
     * @param {Object} [options.includeFirstEntry]  - include first item in 'entries' at the top level
     * @param {Array} [options.formatTimestamps]    - array containing timestamp keys to format/normalize
     * @param {Object} [options.runCustomFunction]  - run custom function on data
     * @param {Object} [options.addKeysByTag]       - add key to data based on tag(s)
     *
     * @returns {Object} Returns normalized data
     */
    data(data, options) {
        options = options || {};

        // standard reduce data first
        const reduceDataOptions = {
            convertArrayToMap: options.convertArrayToMap,
            includeFirstEntry: options.includeFirstEntry
        };
        let ret = this._reduceData(data, reduceDataOptions);

        // additional normalization may be required - the order here matters

        // get data by key
        ret = options.key ? this._getDataByKey(ret, options.key) : ret;
        // filter data by keys - 1+ calls
        let fBK = options.filterByKeys;
        if (fBK) {
            fBK = Array.isArray(fBK) ? fBK : [fBK];
            fBK.forEach((item) => {
                ret = normalizeUtil._filterDataByKeys(ret, item);
            });
        }
        // rename keys by pattern - 1+ calls
        let rKBP = options.renameKeysByPattern;
        if (rKBP) {
            rKBP = Array.isArray(rKBP) ? rKBP : [rKBP];
            rKBP.forEach((item) => {
                ret = normalizeUtil._renameKeys(ret, item.patterns, item.options);
            });
        }
        // format timestamps
        const nT = options.formatTimestamps;
        if (nT) {
            ret = this._formatTimestamps(ret, nT);
        }
        // run custom function
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
