/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';


const constants = require('./constants.js');
const util = require('./util.js');
const normalize = require('./normalize.js');
const properties = require('./properties.json');
const paths = require('./paths.json');
const logger = require('./logger.js');
const EndpointLoader = require('./endpointLoader');
const dataUtil = require('./dataUtil');
const systemStatsUtil = require('./systemStatsUtil');


/**
 * System Stats Class
 * @param {String}  host                                     - host
 * @param {Object}  [options]                                - options
 * @param {Object}  [options.tags]                           - tags to add to the data (each key)
 * @param {String}  [options.credentials.username]           - username for host
 * @param {String}  [options.credentials.passphrase]         - password for host
 * @param {String}  [options.connection.protocol]            - protocol for host
 * @param {Integer} [options.connection.port]                - port for host
 * @param {Boolean} [options.connection.allowSelfSignedCert] - false - requires SSL certificates be valid,
 *                                                             true - allows self-signed certs
 */
function SystemStats(host, options) {
    options = options || {};

    const _paths = options.paths || paths;
    const _properties = options.properties || properties;

    this.loader = new EndpointLoader(host, options);
    this.loader.setEndpoints(_paths.endpoints);

    this.noTmstats = options.noTmstats;
    this.tags = options.tags || {};
    this.actions = options.actions || [];
    this.stats = _properties.stats;
    this.context = _properties.context;
    this.definitions = _properties.definitions;
    this.global = _properties.global;

    this.isStatsFilterApplied = false;
    this.contextData = {};
    this.collectedData = {};
}
/**
 * Split key
 *
 * @param {String} key - key to split
 *
 * @returns {Object} Return data formatted like { rootKey: 'key, childKey: 'key' }
 */
SystemStats.prototype._splitKey = function (key) {
    const splitKeys = key.split(constants.STATS_KEY_SEP);
    const rootKey = splitKeys[0];
    // remove root key from splitKeys
    splitKeys.shift();
    const childKey = splitKeys.length > 0 ? splitKeys.join(constants.STATS_KEY_SEP) : undefined;
    return { rootKey, childKey };
};

/**
 * Process loaded data
 *
 * @param {Object} property - property object
 * @param {Object} data     - data object
 * @param {string} key      - property key associated with data
 *
 * @returns {Object} normalized data (if needed)
 */
SystemStats.prototype._processData = function (property, data, key) {
    const defaultTags = { name: { pattern: '(.*)', group: 1 } };
    const addKeysByTagIsObject = property.normalization
        && property.normalization.find(n => n.addKeysByTag && typeof n.addKeysByTag === 'object');
    const options = {
        key: this._splitKey(property.key).childKey,
        propertyKey: key
    };

    if (property.normalization) {
        const filterKeysIndex = property.normalization.findIndex(i => i.filterKeys);
        if (filterKeysIndex > -1) {
            property.normalization[filterKeysIndex] = {
                filterKeys: [
                    property.normalization[filterKeysIndex].filterKeys,
                    this.global.filterKeys
                ]
            };
        } else {
            options.filterKeys = [this.global.filterKeys];
        }

        const renameKeysIndex = property.normalization.findIndex(i => i.renameKeys);
        if (renameKeysIndex > -1) {
            property.normalization[renameKeysIndex] = {
                renameKeys: [
                    property.normalization[renameKeysIndex].renameKeys,
                    this.global.renameKeys
                ]
            };
        } else {
            options.renameKeys = [this.global.renameKeys];
        }

        const addKeysByTagIndex = property.normalization.findIndex(i => i.addKeysByTag);
        if (addKeysByTagIndex > -1) {
            property.normalization[addKeysByTagIndex] = {
                addKeysByTag: {
                    tags: Object.assign(defaultTags, this.tags),
                    definitions: this.definitions,
                    opts: addKeysByTagIsObject ? property.normalization[addKeysByTagIndex]
                        .addKeysByTag : this.global.addKeysByTag
                }
            };
        } else {
            property.normalization.push({
                addKeysByTag: {
                    tags: defaultTags,
                    definitions: this.definitions,
                    opts: this.global.addKeysByTag
                }
            });
        }

        property.normalization.push({ formatTimestamps: this.global.formatTimestamps.keys });
    } else {
        options.filterKeys = [this.global.filterKeys];
        options.renameKeys = [this.global.renameKeys];
        options.formatTimestamps = this.global.formatTimestamps.keys;
        options.addKeysByTag = {
            tags: defaultTags,
            definitions: this.definitions,
            opts: this.global.addKeysByTag
        };
    }

    // standard options for normalize, these are driven primarily by the properties file
    options.normalization = property.normalization;
    return property.normalize === false ? data : normalize.data(data, options);
};
/**
 * Load data for property
 *
 * @param {Object} property             - property object
 * @param {String} [property.key]       - key to identify endpoint to load data from
 * @param {String} [property.keyArgs]   - arguments to pass to the endpoint
 * @returns {Object} Promise resolved with fetched data object
 */
SystemStats.prototype._loadData = function (property) {
    const endpoint = this._splitKey(property.key).rootKey;

    return this.loader.loadEndpoint(endpoint, property.keyArgs)
        .then((data) => {
            if (!data.data.items) {
                data.data.items = [];
            }
            return Promise.resolve(data.data);
        })
        .catch((err) => {
            logger.error(`Error: SystemStats._loadData: ${endpoint} (${property.keyArgs}): ${err}`);
            return Promise.reject(err);
        });
};
/**
 * Process property
 *
 * @param {String} key      - key to store collected data
 * @param {Object} property - property object
 *
 * @returns {Object} Promise resolved when data was successfully colleted
 */
SystemStats.prototype._processProperty = function (key, property) {
    if (this.noTmstats && property.structure && property.structure.parentKey === 'tmstats') {
        return Promise.resolve();
    }

    property = systemStatsUtil.renderProperty(this.contextData, util.deepCopy(property));
    /**
     * if endpoints will have their own 'disabled' flag
     * we will need to add additional check here or simply return empty value.
     * An Empty value will result in 'missing key' after normalization.
     */
    if (property.disabled) {
        return Promise.resolve();
    }

    // support property simply being a folder - add as empty object
    if (property.structure && property.structure.folder === true) {
        this.collectedData[key] = {};
        return Promise.resolve();
    }

    return this._loadData(property)
        .then((data) => {
            const processedData = this._processData(property, data, key);
            // Only add data to collectedData that exists/is not empty
            if (!(processedData === undefined || processedData.length === 0)) {
                this.collectedData[key] = processedData;
            }
        })
        .catch((err) => {
            logger.error(`Error: SystemStats._processProperty: ${key} (${property.key}): ${err}`);
            return Promise.reject(err);
        });
};
/**
 * Process context object
 *
 * @param {Object} contextData         - context object to load
 * @param {String} [contextData.key]   - key to store loaded data
 * @param {Object} [contextData.value] - property object to use to load data
 *
 * @returns {Object} Promise resolved when all context's properties were loaded
 */
SystemStats.prototype._processContext = function (contextData) {
    const promises = Object.keys(contextData)
        .map(key => this._processProperty(key, contextData[key]));

    return Promise.all(promises).then(() => {
        Object.assign(this.contextData, this.collectedData);
        this.collectedData = {};
    });
};
/**
 * Compute all contextual data
 *
 * @param {Object | Array} contextData - context object(s) to load
 *
 * @returns (Object) Promise resolved when contextual data were loaded
 */
SystemStats.prototype._computeContextData = function () {
    let promise;

    if (Array.isArray(this.context)) {
        if (this.context.length) {
            promise = this._processContext(this.context[0]);
            for (let i = 1; i < this.context.length; i += 1) {
                promise.then(this._processContext(this.context[i]));
            }
        }
    } else if (this.context) {
        promise = this._processContext(this.context);
    }
    if (!promise) {
        promise = Promise.resolve();
    }
    return promise;
};
/**
 * Applies all filters from declaration, to the set of System Stat properties that will be collected.
 * Processing of filters occurs sequentially, from top-to-bottom (of the declaration).
 * All filtering of properties / fields by value (ex: VirtualServers matching name of 'test*') must be handled after
 * stats are collected, and will not be filtered by _filterStats().
 *
 * @returns {Object} Promise resolved when all filtering is completed
 */
SystemStats.prototype._filterStats = function () {
    /**
     * This function for optimization purpose only - it is not actual data exclusion,
     * it only disables endpoints we are not going to use at all.
     *
     * From the user's point of view this process should be explicit - the user should still think
     * that TS fetches all data.
     *
     * Ideally this function should be ran just once per System Poller's config update but due nature of
     * System Poller and the fact that it runs every 60 secs or more we can compute on demand every time
     * to avoid memory usage.
     */
    // early return
    if (util.isObjectEmpty(this.actions) || this.isStatsFilterApplied) {
        return;
    }
    const FLAGS = {
        UNTOUCHED: 0,
        PRESERVE: 1
    };
    /**
     * Reasons to create tree of stats that mimics actual TS output:
     * - much easier deal with regular expressions (at least can avoid regex comparisons)
     * - all location pointers are object of objects
     */
    const statsSkeleton = {};
    const nestedKey = 'nested';

    Object.keys(this.stats).forEach((statKey) => {
        const stat = this.stats[statKey];
        if (!stat.structure) {
            statsSkeleton[statKey] = { flag: FLAGS.UNTOUCHED };
        } else if (stat.structure.parentKey) {
            if (!statsSkeleton[stat.structure.parentKey]) {
                statsSkeleton[stat.structure.parentKey] = { flag: FLAGS.UNTOUCHED };
            }
            statsSkeleton[stat.structure.parentKey][nestedKey] = statsSkeleton[stat.structure.parentKey][nestedKey]
                || {};
            statsSkeleton[stat.structure.parentKey][nestedKey][statKey] = { flag: FLAGS.UNTOUCHED };
        }
    });
    this.actions.forEach((actionCtx) => {
        if (!actionCtx.enable) {
            return;
        }
        if (actionCtx.ifAllMatch) {
            // if ifAllMatch points to nonexisting data - VS name, tag or what ever else
            // we have to mark all existing paths with PRESERVE flag
            dataUtil.searchAnyMatches(statsSkeleton, actionCtx.ifAllMatch, (key, item) => {
                item.flag = FLAGS.PRESERVE;
                return nestedKey;
            });
        }
        // if includeData/excludeData paired with ifAllMatch then we can simply ignore it
        // because we can't include/exclude data without conditional check
        if (actionCtx.excludeData && !actionCtx.ifAllMatch) {
            dataUtil.removeStrictMatches(statsSkeleton, actionCtx.locations, (key, item, getNestedKey) => {
                if (getNestedKey) {
                    return nestedKey;
                }
                return item.flag !== FLAGS.PRESERVE;
            });
        }
        if (actionCtx.includeData && !actionCtx.ifAllMatch) {
            // strict is false - it is okay to have partial matches because we can't be sure
            // for 100% that such data was not added by previous action
            dataUtil.preserveStrictMatches(statsSkeleton, actionCtx.locations, false, (key, item, getNestedKey) => {
                if (getNestedKey) {
                    return nestedKey;
                }
                return item.flag !== FLAGS.PRESERVE;
            });
        }
    });

    let statsCopy;
    Object.keys(this.stats).forEach((statKey) => {
        let skeleton = statsSkeleton;
        // path to stat should exists otherwise we can delete it
        const exists = computeStatPath.call(this, statKey).every((key) => {
            skeleton = skeleton[key];
            if (skeleton && skeleton[nestedKey]) {
                skeleton = skeleton[nestedKey];
            }
            return skeleton;
        });
        if (!exists) {
            if (!statsCopy) {
                statsCopy = util.deepCopy(this.stats);
            }
            delete statsCopy[statKey];
        }
    });
    if (statsCopy) {
        this.stats = statsCopy;
    }
    this.isStatsFilterApplied = true;
};
/**
 * Compute properties
 *
 * @param {Object} propertiesData - object with properties
 *
 * @returns {Object} Promise resolved when all properties were loaded
 */
SystemStats.prototype._computePropertiesData = function () {
    return Promise.all(Object.keys(this.stats)
        .map(key => this._processProperty(key, this.stats[key])));
};
/**
 * Collect info based on object provided in properties
 *
 * @returns {Object} Promise which is resolved with a map of stats
 */
SystemStats.prototype.collect = function () {
    return this.loader.auth()
        .then(() => this._computeContextData())
        .then(() => {
            this._filterStats();
            return Promise.resolve();
        })
        .then(() => this._computePropertiesData())
        .then(() => {
            // order data according to properties file
            const data = {};
            Object.keys(this.stats).forEach((key) => {
                data[key] = this.collectedData[key];
            });
            // certain stats require a more complex structure - process those
            Object.keys(data).forEach((key) => {
                const stat = this.stats[key] || {};
                if (stat.structure && !stat.structure.folder) {
                    const parentKey = stat.structure.parentKey;
                    data[parentKey][key] = data[key];
                    delete data[key];
                }
            });
            return Promise.resolve(data);
        })
        .catch((err) => {
            logger.error(`Error: SystemStats.collect: ${err}`);
            return Promise.reject(err);
        });
};


/**
 * Helpers for stats filtering
 */

/**
 * Compute stats's path
 * Note: call with .call(this, <args>)
 *
 * @param {String} statKey - stat's key
 *
 * @returns {Array<String>} - path to stat
 */
function computeStatPath(statKey) {
    const path = [statKey];
    const stat = this.stats[statKey];
    if (stat.structure) {
        if (stat.structure.parentKey) {
            path.push(stat.structure.parentKey);
        }
    }
    return path.reverse();
}

module.exports = SystemStats;
