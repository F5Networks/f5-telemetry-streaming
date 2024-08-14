/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const logger = require('./logger'); // eslint-disable-line no-unused-vars
const constants = require('./constants');
const normalizeUtil = require('./utils/normalize');

/**
 * RegExp for syslog message detection.
 */
const SYSLOG_REGEX = new RegExp([
    /^(<[0-9]+>)?/, // priority
    /([a-z]{3})\s+/, // month
    /([0-9]{1,2})\s+/, // date
    /([0-9]{2}):/, // hours
    /([0-9]{2}):/, // minutes
    /([0-9]{2})/, // seconds
    /\s+([\w\-.0-9/]+)?/, // host
    /\s+(?:([\w\-().0-9/]+)\s+)?/, // severity
    /([\w\-().0-9/]+)/, // process
    /(?:\[([a-z0-9-.]+)\])?:/, // pid
    /(.+)/ // message
].map((regex) => regex.source).join(''), 'i');

/*
 * Lumen might set "$F5TelemetryEventCategory" to "raw", to indicate that the processing is not required
 * Lumen is well-formed JSON, so looking for " , not '
 */
const F5_TELEMETRY_EVT_CAT_REGEX = /"\$F5TelemetryEventCategory"\s*:\s*"([^"]*)"/;

const SYSLOG_HOSTNAME_IDX = 7;
const SYSLOG_MSG_IDX = 11;

const USELESS_MESSAGE_PREFIX = /^((?:BigIP|ASM):)/;

module.exports = {
    /**
     * Format as JSON - assume data looks similar to this: KEY1="value",KEY2="value"
     *
     * Note: no whitespace chars allowed in keys
     *
     * @param {Object} data - data
     *
     * @returns {Object} Returns data as JSON
     */
    _formatAsJson(data) {
        const defaultKey = 'data';
        let ret = {};
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
                    if (i === len - 1) {
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
                    if (/\s/.test(key)) {
                        // key SHOULD NOT have whitespace chars
                        ret = {
                            [defaultKey]: dataToFormat
                        };
                        break;
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
                            if (Number.isInteger(+data[k]) && data[k] !== '') {
                                // Probably epoch timestamp, try to convert
                                data[k] = new Date(+data[k] * 1000).toISOString();
                            } else {
                                data[k] = new Date(data[k]).toISOString();
                            }
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
            const errMsg = `runCustomFunction '${options.func}' failed: ${e}`;
            logger.exception(errMsg, e);
            e.message = errMsg;
            throw e;
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
            if (item !== undefined && Object.keys(data).length === 1) {
                return this._reduceData(item, options);
            }
        }

        // .entries evaluates to true if data is an array
        const entries = 'entries';
        if (data && data[entries] && !Array.isArray(data)) {
            // entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats, we should simplify this somewhat
            const simplifyKey = (key) => {
                if (key.startsWith('https://localhost/')) {
                    key = decodeURI(key.replace('https://localhost/', ''));
                }
                return key.replace('mgmt/tm/', '');
            };

            const iFE = options.includeFirstEntry;
            const entryKey = Object.keys(data[entries])[0];
            if (iFE && normalizeUtil._checkForMatch(entryKey, iFE.pattern, iFE.group, iFE.excludePattern)) {
                data = Object.assign(data[entries][entryKey], data);
                delete data[entries]; // delete entries key after merge
                if (iFE.runFunctions) {
                    iFE.runFunctions.forEach((customFunction) => {
                        const rCFOptions = {
                            func: customFunction.name,
                            args: customFunction.args
                        };
                        data = this._runCustomFunction(data, rCFOptions);
                    });
                }

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
                const catmSpecified = catm && catm.keyName;
                const isArrayOfObjects = typeof data[0] === 'object';
                const isKeyPresent = catmSpecified && isArrayOfObjects && typeof data[0][catm.keyName] !== 'undefined';
                if (catmSpecified && ((isArrayOfObjects && isKeyPresent) || !catm.skipWhenKeyMissing)) {
                    ret = normalizeUtil._convertArrayToMap(data, catm.keyName, catm);
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
     * @param {Array} [options.tags]           - tags to apply in addition to "tags"
     *
     * @returns {Object} Returns data with added tags
     */
    _addKeysByTag(data, tags, definitions, options) {
        tags = Object.assign({}, tags);
        if (options && options.tags) {
            Object.keys(options.tags).forEach((key) => {
                if (typeof tags[key] === 'undefined') {
                    tags[key] = options.tags[key];
                }
            });
        }
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
                if (tagValue in def) {
                    tagValue = def[tagValue]; // overwrite with def value
                }
                if (tagValue.pattern) {
                    const match = normalizeUtil._checkForMatch(key, tagValue.pattern, tagValue.group);
                    if (match) {
                        val = match;
                    }
                } else {
                    val = tagValue;
                }
                if (val) {
                    thisData[t] = val;
                }
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
     * Classify event by specific keys
     *
     * @param {Object} data           - data to classify
     * @param {Object} classifyByKeys - classify by specific keys (used by events)
     *
     * @returns {String | Null} Returns event name if matches else null
     */
    _classifyEventCategory(data, classifyByKeys) {
        let category = null;

        // Array.prototype.every will stop when false returned
        Object.keys(classifyByKeys).every((evtName) => {
            classifyByKeys[evtName].keys.every((options) => {
                if (normalizeUtil._checkDataHasKeys(data, options.required, { all: true })
                    && normalizeUtil._checkDataHasKeys(data, options.required, { all: false })) {
                    // required and optional keys matched
                    category = evtName;
                }
                return category === null;
            });
            return category === null;
        });
        return category;
    },

    /**
     * Normalize event
     *
     * @param {String} data                          - data to normalize
     *
     * @param {Object} options                       - options
     * @param {Object} [options.renameKeysByPattern] - contains map or array of keys to rename by pattern
     *                                                 object example: { patterns: {}, options: {}}
     * @param {Array}  [options.addKeysByTag]        - add key to data based on tag(s)
     * @param {Array}  [options.formatTimestamps]    - array containing timestamp keys to format/normalize
     * @param {Object} [options.classifyEventByKeys] - classify event by keys
     * @param {Object} [options.addTimestampForCategories] - array of categories for which we add custom timestamps for
     *
     * @returns {Object} Returns normalized event
     */
    event(data, options) {
        // No processing is required for raw event data
        const F5EventCategory = data.match(F5_TELEMETRY_EVT_CAT_REGEX);
        if (F5EventCategory) {
            if (F5EventCategory[1] === 'raw') {
                return {
                    data,
                    originalRawData: data,
                    telemetryEventCategory: constants.EVENT_TYPES.RAW_EVENT
                };
            }
            logger.warning(`Event property $F5TelemetryEventCategory has unrecognized value "${F5EventCategory[1]}". It is ignored.`);
        }

        options = options || {};
        let hostname;
        let isSyslogMsg = false;
        let isRawData = false;
        const originData = data;
        const parts = SYSLOG_REGEX.exec(data);
        if (parts) {
            isSyslogMsg = true;
            // in case if data doesn't provide such info
            hostname = parts[SYSLOG_HOSTNAME_IDX];
            // log message
            data = parts[SYSLOG_MSG_IDX] || '';
            // remove useless prefix if exists
            data = data.replace(USELESS_MESSAGE_PREFIX, '');
        }

        let ret = this._formatAsJson(data);
        const retKeys = Object.keys(ret);
        // in case data doesn't contain delimiter
        if (retKeys.length === 1 && retKeys[0] === 'data') {
            isRawData = true;
            ret.data = originData;
        } else {
            isSyslogMsg = false;
        }

        ret = options.renameKeysByPattern ? normalizeUtil._renameKeys(ret, options.renameKeysByPattern.patterns) : ret;
        if (options.addKeysByTag && options.addKeysByTag.tags) {
            ret = this._addKeysByTag(
                ret,
                options.addKeysByTag.tags,
                options.addKeysByTag.definitions,
                options.addKeysByTag.opts
            );
        }
        if (options.classifyEventByKeys) {
            ret.telemetryEventCategory = this._classifyEventCategory(ret, options.classifyEventByKeys);
        }
        if (!ret.telemetryEventCategory) {
            // if data has non-default keys - probably LTM event
            if (!isRawData) {
                ret.telemetryEventCategory = constants.EVENT_TYPES.LTM_EVENT;
            } else if (isSyslogMsg) {
                ret.telemetryEventCategory = constants.EVENT_TYPES.SYSLOG_EVENT;
            } else {
                ret.telemetryEventCategory = constants.EVENT_TYPES.EVENT_LISTENER;
            }
        }
        if (options.addTimestampForCategories
            && options.addTimestampForCategories.indexOf(ret.telemetryEventCategory) > -1) {
            ret[constants.EVENT_CUSTOM_TIMESTAMP_KEY] = new Date().toISOString();
        }
        // format timestamps
        const nT = options.formatTimestamps;
        if (nT) {
            ret = this._formatTimestamps(ret, nT);
        }
        /**
         * Data probably has 'hostname' after renaming otherwise
         * try to assign hostname if exists.
         */
        if (!ret.hostname && hostname) {
            ret.hostname = hostname;
        }
        ret.originalRawData = originData;
        return ret;
    },

    /**
     * Normalize data - standardize and reduce complexity
     *
     * @param {Object} data                           - data to normalize
     * @param {Object} options                        - options
     * @param {String} [options.key]                  - key to drill down into data, using a defined notation
     * @param {Array} [options.filterByKeys]          - array contains map of keys to filter data further
     *                                                  example: { exclude: [], include: []}
     * @param {Array} [options.renameKeysByPattern]   - array containing 1+ map(s) of keys to rename by pattern
     *                                                  example: [{ patterns: {}, options: {}}]
     * @param {Object} [options.convertArrayToMap]    - convert array to map using defined key name
     * @param {Object} [options.includeFirstEntry]    - include first item in 'entries' at the top level
     * @param {Array} [options.formatTimestamps]      - array containing timestamp keys to format/normalize
     * @param {Object[]} [options.runCustomFunctions] - run custom function on data
     * @param {Object} [options.addKeysByTag]         - add key to data based on tag(s)
     * @param {String} [options.propertyKey]          - property key associated with data
     *
     * @returns {Object} Returns normalized data
     */
    data(data, options) {
        options = options || {};
        let ret;
        let setReduced = false;

        // get data by key
        ret = this._reduceData(data, {});
        ret = options.key ? this._getDataByKey(ret, options.key) : ret;

        if (options.filterKeys) {
            ret = this._handleFilterByKeys(ret, options.filterKeys);
        }

        if (options.renameKeys) {
            ret = this._handleRenameKeys(ret, options.renameKeys);
        }

        if (options.formatTimestamps) {
            ret = this._handleTimestamps(ret, options.formatTimestamps, options);
        }

        if (options.addKeysByTag) {
            // add keys by tag - after custom functions run
            ret = this._addKeysByTag(
                ret,
                options.addKeysByTag.tags,
                options.addKeysByTag.definitions,
                options.addKeysByTag.opts
            );
        }

        if (options.normalization) {
            options.normalization.forEach((norm) => {
                if ((norm.convertArrayToMap || norm.includeFirstEntry) && !setReduced) {
                    // standard reduce data first
                    const reduceDataOptions = {
                        convertArrayToMap: (options.normalization.find((n) => n.convertArrayToMap)
                            || {}).convertArrayToMap,
                        includeFirstEntry: (options.normalization.find((n) => n.includeFirstEntry)
                            || {}).includeFirstEntry
                    };
                    ret = this._reduceData(norm.useCurrentData ? ret : data, reduceDataOptions);
                    setReduced = true;

                    // get data by key
                    ret = options.key && !norm.keepKey ? this._getDataByKey(ret, options.key) : ret;
                }

                if (norm.filterKeys) {
                    ret = this._handleFilterByKeys(ret, norm.filterKeys);
                }

                if (norm.renameKeys) {
                    ret = this._handleRenameKeys(ret, norm.renameKeys);
                }

                if (norm.runFunctions) {
                    // run custom functions
                    norm.runFunctions.forEach((customFunction) => {
                        const rCFOptions = {
                            func: customFunction.name,
                            args: customFunction.args
                        };
                        ret = this._runCustomFunction(ret, rCFOptions);
                    });
                }

                if (norm.addKeysByTag) {
                    // add keys by tag - after custom functions run
                    ret = this._addKeysByTag(
                        ret,
                        norm.addKeysByTag.tags,
                        norm.addKeysByTag.definitions,
                        norm.addKeysByTag.opts
                    );
                }

                if (norm.formatTimestamps) {
                    ret = this._handleTimestamps(ret, norm.formatTimestamps, options);
                }
            });
        }

        return ret;
    },

    /**
     * This handles the logic for handing off data for timestamp formatting
     *
     * @param {Object} ret - The normalized data that will be returned
     * @param {Array} timestamps - The keys to be formatted
     * @param {Object} options - options
     */
    _handleTimestamps(ret, timestamps, options) {
        // format timestamps
        const propKey = options.propertyKey;
        if (typeof propKey === 'string') {
            ret = this._formatTimestamps({ [propKey]: ret }, timestamps)[propKey];
        } else {
            ret = this._formatTimestamps(ret, timestamps);
        }
        return ret;
    },

    /**
     * This handles checking filterByKeys and passing it along
     *
     * @param {Object} ret - The normalized data that will be returned
     * @param {Object} filterByKeys - The keys to filter
     */
    _handleFilterByKeys(ret, filterByKeys) {
        // filter data by keys - 1+ calls
        const fBK = Array.isArray(filterByKeys) ? filterByKeys : [filterByKeys];
        fBK.forEach((item) => {
            ret = normalizeUtil._filterDataByKeys(ret, item);
        });
        return ret;
    },

    /**
     * This handles checking renameKeys and passing it along
     *
     * @param {Object} ret - The normalized data that will be returned
     * @param {Object} renameKeys - The keys to be renamed
     */
    _handleRenameKeys(ret, renameKeys) {
        // rename keys by pattern - 1+ calls
        const rKBP = Array.isArray(renameKeys) ? renameKeys : [renameKeys];
        rKBP.forEach((item) => {
            ret = normalizeUtil._renameKeys(ret, item.patterns, item.options);
        });
        return ret;
    }
};
