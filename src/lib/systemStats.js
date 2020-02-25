/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';


const constants = require('./constants.js');
const util = require('./util.js');
const normalize = require('./normalize.js');
const defaultProperties = require('./properties.json');
const defaultPaths = require('./paths.json');
const logger = require('./logger.js');
const EndpointLoader = require('./endpointLoader');
const dataUtil = require('./dataUtil');
const systemStatsUtil = require('./systemStatsUtil');


/**
 * System Stats Class
 * @param {Object}  config                                  - config object
 * @param {Object}  config.connection                       - connection info
 * @param {String}  config.connection.host                  - host to connect to
 * @param {Integer} [config.connection.port]                - port to use
 * @param {String}  [config.connection.protocol]            - protocol to use to connect
 * @param {Boolean} [config.connection.allowSelfSignedCert] - false - requires SSL certificates be valid,
 *                                                            true - allows self-signed certs
 * @param {String}  [config.credentials.username]           - username for host
 * @param {String}  [config.credentials.passphrase]         - password for host
 * @param {Object}  [config.dataOpts]                       - data options
 * @param {Object}  [config.dataOpts.tags]                  - tags to add to the data (each key)
 * @param {Object}  [config.dataOpts.actions]               - actions to apply to the data (each key)
 * @param {Boolean} [config.dataOpts.noTMStats]             - true if don't need to fetch TMSTAT data
 * @param {Object}  [config.endpoints]                      - endpoints to use to fetch data
 * @param {Array}   [config.events]                         - events to produce using endpoints
 */
function SystemStats(config) {
    config = util.assignDefaults(
        config,
        {
            connection: {},
            credentials: {},
            dataOpts: {}
        }
    );

    config.dataOpts = util.assignDefaults(
        config.dataOpts,
        {
            tags: {},
            noTMStats: false,
            actions: []
        }
    );

    this.noTMStats = config.dataOpts.noTMStats;
    this.tags = config.dataOpts.tags;
    this.actions = config.dataOpts.actions;
    this.collectedData = {};

    this.loader = new EndpointLoader(
        config.connection.host,
        {
            credentials: util.deepCopy(config.credentials),
            connection: util.deepCopy(config.connection)
        }
    );

    const paths = config.paths || defaultPaths;
    const properties = config.properties || defaultProperties;
    this.global = properties.global;

    if (typeof config.endpointList === 'undefined') {
        this.stats = properties.stats;
        this.definitions = properties.definitions;
        this.endpoints = paths.endpoints;
        this.contextProps = properties.context;
        this.contextData = {};
    } else {
        this.endpoints = config.endpointList;
        this.isCustom = true;
    }
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
            data = data.data;
            if (data && typeof data === 'object' && typeof data.items === 'undefined'
                && Object.keys(data).length === 2 && data.kind.endsWith('state')) {
                data.items = [];
            }
            return Promise.resolve(data);
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
    if (this.noTMStats && property.structure && property.structure.parentKey === 'tmstats') {
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

    if (Array.isArray(this.contextProps)) {
        if (this.contextProps.length) {
            promise = this._processContext(this.contextProps[0]);
            for (let i = 1; i < this.contextProps.length; i += 1) {
                promise.then(this._processContext(this.contextProps[i]));
            }
        }
    } else if (this.contextProps) {
        promise = this._processContext(this.contextProps);
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
        if (actionCtx.ifAllMatch || actionCtx.ifAnyMatch) {
            // if ifAllMatch or ifAnyMatch points to nonexisting data - VS name, tag or what ever else
            // we have to mark all existing paths with PRESERVE flag
            dataUtil.searchAnyMatches(statsSkeleton, actionCtx.ifAllMatch || actionCtx.ifAnyMatch, (key, item) => {
                item.flag = FLAGS.PRESERVE;
                return nestedKey;
            });
        }
        // if includeData/excludeData paired with ifAllMatch or ifAnyMatch then we can simply ignore it
        // because we can't include/exclude data without conditional check
        if (actionCtx.excludeData && !(actionCtx.ifAllMatch || actionCtx.ifAnyMatch)) {
            dataUtil.removeStrictMatches(statsSkeleton, actionCtx.locations, (key, item, getNestedKey) => {
                if (getNestedKey) {
                    return nestedKey;
                }
                return item.flag !== FLAGS.PRESERVE;
            });
        }
        if (actionCtx.includeData && !(actionCtx.ifAllMatch || actionCtx.ifAnyMatch)) {
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
 * Converts a telemetry_endpoint to a standard property.
 * Only BIG-IP paths currently supported,
 * For e.g. /mgmt/tm/subPath?$select=prop1,prop2
 * (Note that we don't guarantee behavior for all types of query params)
 *
 * @param {String} keyName - property key
 * @param {Object} endpoint - object to convert
 *
 * @returns {Object} Converted property
 */

SystemStats.prototype._convertToProperty = function (keyName, endpoint) {
    let normalization;
    const statsIndex = endpoint.path.indexOf('/stats');
    const bigipBasePath = 'mgmt/tm/';
    if (statsIndex > -1) {
        const mgmtTmIndex = endpoint.path.indexOf(bigipBasePath) + bigipBasePath.length;
        const renameKeys = { patterns: {} };
        const pathMatch = endpoint.path.substring(mgmtTmIndex, statsIndex);

        // eslint-disable-next-line no-useless-escape
        renameKeys.patterns[pathMatch] = { pattern: `${pathMatch}\/(.*)`, group: 1 };
        normalization = [{ renameKeys }];
    }
    return {
        key: keyName,
        normalization
    };
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
 * Collect info based on object provided in paths and properties files (builtin/ defaults)
 *
 * @returns {Object} Promise which is resolved with a map of stats
 */
SystemStats.prototype.collectDefaultPathsProps = function () {
    return this._computeContextData()
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
        });
};

/**
 * Collect info based on object provided in declaration (config from user input)
 * Currently customEndpoints supported are only BIG-IP endpoints
 *
 * @returns {Object} Promise
 */
SystemStats.prototype.collectCustomEndpoints = function () {
    return new Promise((resolve, reject) => {
        const endpKeys = Object.keys(this.endpoints);

        const processEndpoint = (idx) => {
            if (idx >= endpKeys.length) {
                return resolve(this.collectedData);
            }
            const endpointKey = endpKeys[idx];
            const endpoint = this.endpoints[endpointKey];
            const keyName = endpoint.name || endpointKey;

            return Promise.resolve()
                .then(() => this._processProperty(keyName, this._convertToProperty(keyName, endpoint)))
                .then(() => {
                    processEndpoint(idx + 1);
                })
                .catch((err) => {
                    const msg = `Error on attempt to load data from endpoint '${endpoint.name}[${endpoint.path}]': ${err}`;
                    err.message = msg;
                    reject(err);
                });
        };

        processEndpoint(0);
    });
};

/**
 * Collect info
 *
 * @returns {Object} Promise which is resolved with a map of stats
 */
SystemStats.prototype.collect = function () {
    let collectedData;
    let caughtErr;

    return this.loader.auth()
        .then(() => {
            this.loader.setEndpoints(this.endpoints);
            return this.isCustom ? this.collectCustomEndpoints() : this.collectDefaultPathsProps();
        })
        .then((data) => {
            collectedData = data;
        })
        .catch((err) => {
            caughtErr = err;
        })
        .then(() => {
            // erase cached data
            this.loader.eraseCache();
            if (caughtErr) {
                const message = caughtErr.message || `Error: SystemStats.collect: ${caughtErr}`;
                logger.error(message);
                return Promise.reject(caughtErr);
            }
            return Promise.resolve(collectedData);
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
