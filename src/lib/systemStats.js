/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('./utils/misc');
const normalize = require('./normalize');
const defaultProperties = require('./properties.json');
const defaultPaths = require('./paths.json');
const logger = require('./logger');
const EndpointLoader = require('./endpointLoader');
const dataUtil = require('./utils/data');
const systemStatsUtil = require('./utils/systemStats');

/** @module systemStats */

const customEndpointNormalization = [
    {
        renameKeys: {
            patterns: {
                '~': {
                    replaceCharacter: '/',
                    exactMatch: false
                }
            }
        }
    },
    {
        filterKeys: {
            exclude: ['kind', 'selfLink']
        }
    }
];

/**
 * System Stats Class
 *
 * @param {Object}  config                                  - config object
 * @param {Object}  [config.connection]                     - connection info
 * @param {String}  [config.connection.host]                - host to connect to
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
 * @param {String}  [config.name]                           - name
 */
function SystemStats(config) {
    config = util.assignDefaults(config, {
        name: 'UnknownPoller',
        connection: {},
        credentials: {},
        dataOpts: {
            tags: {},
            noTMStats: false,
            actions: []
        }
    });

    this.logger = logger.getChild(`${config.name}`);
    this.noTMStats = config.dataOpts.noTMStats;
    this.tags = config.dataOpts.tags;
    this.actions = config.dataOpts.actions;
    this.collectedData = {};

    this.loader = new EndpointLoader(
        config.connection.host,
        {
            credentials: util.deepCopy(config.credentials),
            connection: util.deepCopy(config.connection),
            logger: this.logger
        }
    );

    const paths = config.paths || defaultPaths;
    const properties = config.properties || defaultProperties;
    this.global = properties.global;

    if (typeof config.endpoints === 'undefined') {
        this.stats = properties.stats;
        this.statsToSkip = null;
        this.definitions = properties.definitions;
        this.endpoints = paths.endpoints;
        this.contextProps = properties.context;
        this.contextData = {};
    } else {
        this.endpoints = config.endpoints;
        this.isCustom = true;
    }
}

SystemStats.prototype._getNormalizationOpts = function (property) {
    if (property.isCustom) {
        return {};
    }

    const options = {};
    const defaultTags = { name: { pattern: '(.*)', group: 1 } };
    const addKeysByTagIsObject = property.normalization
        && property.normalization.find(n => n.addKeysByTag && typeof n.addKeysByTag === 'object');

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
    return options;
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
    // standard options for normalize, these are driven primarily by the properties file
    const options = Object.assign(this._getNormalizationOpts(property), {
        key: systemStatsUtil.splitKey(property.key).childKey,
        propertyKey: key,
        normalization: property.normalization
    });
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
    const endpoint = systemStatsUtil.splitKey(property.key).rootKey;

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
            this.logger.error(`Error: SystemStats._loadData: ${endpoint} (${property.keyArgs}): ${err}`);
            return Promise.reject(err);
        });
};
/**
 * Return parent object to store data
 *
 * @param {Object} property - property
 *
 * @returns {Object} to store data
 */
SystemStats.prototype._getParentObjectForStat = function (property) {
    let parentObj = this.collectedData;
    if (property.structure && property.structure.parentKey) {
        this.collectedData[property.structure.parentKey] = this.collectedData[property.structure.parentKey] || {};
        parentObj = this.collectedData[property.structure.parentKey];
    }
    return parentObj;
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
    property = systemStatsUtil.renderProperty(this.contextData, util.deepCopy(property));
    /**
     * if endpoints will have their own 'disabled' flag
     * we will need to add additional check here or simply return empty value.
     * An Empty value will result in 'missing key' after normalization.
     */
    if (property.disabled) {
        return Promise.resolve();
    }

    // skip folders - no processing required
    if (property.structure && property.structure.folder === true) {
        this.collectedData[key] = this.collectedData[key] || {};
        return Promise.resolve();
    }

    return this._loadData(property)
        .then((data) => {
            const processedData = this._processData(property, data, key);
            // Only add data to collectedData that exists/is not empty
            if (!(processedData === undefined || processedData.length === 0)) {
                this._getParentObjectForStat(property)[key] = processedData;
            }
        })
        .catch((err) => {
            // For custom endpoints only, add an empty object to response, to show TS tried to load the endpoint
            if (property.isCustom) {
                this.collectedData[key] = {};
            }
            this.logger.error(`Error: SystemStats._processProperty: ${key} (${property.key}): ${err}`);
            return Promise.reject(err);
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
    if (this.contextProps) {
        const promises = Object.keys(this.contextProps)
            .map(key => this._processProperty(key, this.contextProps[key]));

        return Promise.all(promises).then(() => {
            Object.assign(this.contextData, this.collectedData);
            this.collectedData = {};
        });
    }
    return Promise.resolve();
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
    if (this.isStatsFilterApplied) {
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
    // endpoints has flat structure for now - no additional processing required
    const stats = this.isCustom ? this.endpoints : this.stats;

    Object.keys(stats).forEach((statKey) => {
        const stat = stats[statKey];
        if (this.noTMStats && stat.structure && stat.structure.parentKey === 'tmstats') {
            return;
        }

        if (!stat.structure) {
            statsSkeleton[statKey] = { flag: FLAGS.UNTOUCHED };
        } else if (stat.structure.folder) {
            if (!statsSkeleton[statKey]) {
                statsSkeleton[statKey] = { flag: FLAGS.UNTOUCHED };
            }
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

    const activeStats = {};
    Object.keys(stats).forEach((statKey) => {
        let skeleton = statsSkeleton;
        // path to stat should exists otherwise we can delete it
        const exists = computeStatPath(stats, statKey).every((key) => {
            skeleton = skeleton[key];
            if (skeleton && skeleton[nestedKey]) {
                skeleton = skeleton[nestedKey];
            }
            return skeleton;
        });
        if (exists) {
            activeStats[statKey] = stats[statKey];
        }
    });

    if (this.isCustom) {
        this.endpoints = activeStats;
    } else {
        this.stats = activeStats;
    }
    this.isStatsFilterApplied = true;
};

/**
 * Converts a Telemetry_Endpoint to a standard property.
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
    const normalization = util.copy(customEndpointNormalization);
    const statsIndex = endpoint.path.indexOf('/stats');
    const bigipBasePath = 'mgmt/tm/';
    if (statsIndex > -1) {
        const mgmtTmIndex = endpoint.path.indexOf(bigipBasePath) + bigipBasePath.length;
        const renameKeys = { patterns: {} };
        const pathMatch = endpoint.path.substring(mgmtTmIndex, statsIndex);

        // eslint-disable-next-line no-useless-escape
        renameKeys.patterns[pathMatch] = { pattern: `${pathMatch}\/(.*)`, group: 1 };
        normalization.push({ renameKeys });
    }
    return {
        key: keyName,
        isCustom: true,
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
        .then(() => this._computePropertiesData())
        .then(() => this.collectedData);
};

/**
 * Collect info based on object provided in declaration (config from user input)
 * Currently customEndpoints supported are only BIG-IP endpoints
 *
 * @returns {Object} Promise
 */
SystemStats.prototype.collectCustomEndpoints = function () {
    return new Promise((resolve) => {
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
                .catch((err) => {
                    this.logger.error(`Error on attempt to load data from endpoint '${endpoint.name}[${endpoint.path}]': ${err}`);
                })
                // Process the next endpoint, even if error processing current endpoint
                .then(() => processEndpoint(idx + 1));
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
    this.logger.debug('Starting stats collection');
    return this.loader.auth()
        .then(() => {
            // apply pre-optimization to skip stats/endpoints that excluded by 'actions'
            // and never be seen - reduce amount of useless requests to device
            this._filterStats();
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
                this.logger.error(message);
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
 *
 * @param {Object} stats   - stats structure
 * @param {String} statKey - stat's key
 *
 * @returns {Array<String>} - path to stat
 */
function computeStatPath(stats, statKey) {
    const path = [statKey];
    const stat = stats[statKey];
    if (stat.structure) {
        if (stat.structure.parentKey) {
            path.push(stat.structure.parentKey);
        }
    }
    return path.reverse();
}

module.exports = SystemStats;
