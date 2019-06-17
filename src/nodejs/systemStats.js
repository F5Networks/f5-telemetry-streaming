/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const mustache = require('mustache');

const constants = require('./constants.js');
const util = require('./util.js');
const deviceUtil = require('./deviceUtil.js');
const normalize = require('./normalize.js');
const properties = require('./config/properties.json');
const paths = require('./config/paths.json');
const logger = require('./logger.js');

const stats = properties.stats;
const context = properties.context;
const definitions = properties.definitions;
const global = properties.global;

const CONDITIONAL_FUNCS = {
    deviceVersionGreaterOrEqual,
    isModuleProvisioned
};

/**
 * Endpoint Loader class
 *
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
function EndpointLoader() {
    /* eslint-disable prefer-rest-params */
    this.host = typeof arguments[0] === 'string' ? arguments[0] : null;
    this.host = this.host || constants.LOCAL_HOST;

    this.options = typeof arguments[0] === 'object' ? arguments[0] : arguments[1];
    this.options = this.options || {};
    // rely on makeDeviceRequest
    this.options.credentials = this.options.credentials || {};
    this.options.connection = this.options.connection || {};

    this.endpoints = null;
    this.cachedResponse = {};
}
/**
 * Set endpoints definition
 *
 * @param {Array} newEndpoints - list of endpoints to add
 */
EndpointLoader.prototype.setEndpoints = function (newEndpoints) {
    this.endpoints = {};
    newEndpoints.forEach((endpoint) => {
        // if 'name' presented then use it as unique ID
        // otherwise using 'endpoint' prop
        this.endpoints[endpoint.name || endpoint.endpoint] = endpoint;
    });
};
/**
 * Authenticate on target device
 *
 * @returns {Object} Promise which is resolved when successfully authenticated
 */
EndpointLoader.prototype.auth = function () {
    if (this.options.credentials.token) {
        return Promise.resolve();
    }
    // in case of optimization, replace with Object.assign
    const options = util.deepCopy(this.options.connection);
    return deviceUtil.getAuthToken(
        this.host, this.options.credentials.username, this.options.credentials.passphrase, options
    )
        .then((token) => {
            this.options.credentials.token = token.token;
        })
        .catch((err) => {
            throw err;
        });
};
/**
 * Notify data listeners
 *
 * @param {String} endpoint    - endpoint name/key
 * @param {Object | null} data - response object or null
 * @param {Error  | null} err  - Error or null
 *
 * @returns (Object) Promise resolved when all listeners were notified
 */
EndpointLoader.prototype._executeCallbacks = function (endpoint, data, err) {
    const callbacks = this.cachedResponse[endpoint][1];
    const promises = [];

    while (callbacks.length) {
        const callback = callbacks.pop();
        promises.push(new Promise((resolve) => {
            callback(data, err);
            resolve();
        }));
    }
    return Promise.all(promises);
};
/**
 * Load data from endpoint
 *
 * @param {String} endpoint            - endpoint name/key to fetch data from
 * @param {Function(Object, Error)} cb - callback function
 */
EndpointLoader.prototype.loadEndpoint = function (endpoint, cb) {
    // eslint-disable-next-line no-unused-vars
    const p = new Promise((resolve, reject) => {
        if (this.endpoints[endpoint] === undefined) {
            reject(new Error(`Endpoint not defined in file: ${endpoint}`));
        } else {
            let dataIsEmpty = false;
            if (this.cachedResponse[endpoint] === undefined) {
                // [loaded, callbacks, data]
                this.cachedResponse[endpoint] = [false, [cb], null];
                dataIsEmpty = true;
            } else {
                this.cachedResponse[endpoint][1].push(cb);
            }
            resolve(dataIsEmpty);
        }
    })
        .then((dataIsEmpty) => {
            if (dataIsEmpty) {
                return this._getAndExpandData(this.endpoints[endpoint])
                    .then((response) => {
                        // cache results
                        this.cachedResponse[endpoint][2] = response;
                        this.cachedResponse[endpoint][0] = true;
                    });
            }
            return Promise.resolve();
        })
        // 1) resolving nested promise with 'reject' to skip follwing 'then'
        // 2) catch HTTP error here to differentiate it from other errors
        .catch(err => this._executeCallbacks(endpoint, null, err)
            .then(Promise.reject()))

        .then(() => {
            if (this.cachedResponse[endpoint][0]) {
                const data = this.cachedResponse[endpoint][2];
                return this._executeCallbacks(endpoint, data, null);
            }
            return Promise.resolve();
        })
        .catch((err) => {
            // error could be empty if Promise was rejected without args.
            if (err) {
                logger.exception(`Error: EndpointLoader.loadEndpoint: ${err}`, err);
            }
        });
};
/**
 * Get data for specific endpoint
 *
 * @param {String}   uri                      - uri where data resides
 * @param {Object}   options                  - function options
 * @param {String}   [options.name]           - name of key to store as, will override default of uri
 * @param {String}   [options.body]           - body to send, sent via POST request
 * @param {String[]} [options.endpointFields] - restrict collection to these fields
 *
 * @returns {Object} Promise which is resolved with data
 */
EndpointLoader.prototype._getData = function (uri, options) {
    // remove parse-stringify in case of optimizations
    const httpOptions = Object.assign({}, util.deepCopy(this.options.connection));
    httpOptions.credentials = {
        username: this.options.credentials.username,
        token: this.options.credentials.token
    };
    if (options.body) {
        httpOptions.method = 'POST';
        httpOptions.body = options.body;
    }
    const retryOpts = {
        maxTries: 3,
        backoff: 100
    };

    let fullUri = uri;
    if (options.endpointFields) {
        fullUri = `${fullUri}?$select=${options.endpointFields.join(',')}`;
    }

    return util.retryPromise(() => deviceUtil.makeDeviceRequest(this.host, fullUri, httpOptions), retryOpts)
        .then((data) => {
            // use uri unless name is explicitly provided
            const nameToUse = options.name !== undefined ? options.name : uri;
            const ret = { name: nameToUse, data };
            return ret;
        })
        .catch((err) => {
            throw err;
        });
};
/**
 * Get data for specific endpoint (with some extra logic)
 *
 * @param {Object} endpointProperties - endpoint properties
 *
 * @returns {Object} Promise which is resolved with data
 */
EndpointLoader.prototype._getAndExpandData = function (endpointProperties) {
    const p = endpointProperties;
    let completeData;
    let referenceKey;
    const childItemKey = 'items'; // assume we are looking inside of 'items'

    // remote protocol, host and query params
    const fixEndpoint = i => i.replace('https://localhost', '').split('?')[0];

    const substituteData = (data, childKey, assign) => {
        // this tells us we need to modify the data
        if (completeData) {
            data.forEach((i) => {
                try {
                    let dataToSubstitute;
                    if (assign === true) {
                        dataToSubstitute = Object.assign(i.data, completeData.data[childItemKey][i.name]);
                    } else {
                        dataToSubstitute = i.data;
                    }

                    if (childKey) {
                        completeData.data[childItemKey][i.name][childKey] = dataToSubstitute;
                    } else {
                        completeData.data[childItemKey][i.name] = dataToSubstitute;
                    }
                } catch (e) {
                    // just continue
                }
            });
            return Promise.resolve(completeData); // return substituted data
        }
        return Promise.resolve(data); // return data
    };

    return this._getData(p.endpoint, { name: p.name, body: p.body, endpointFields: p.endpointFields })
        .then((data) => {
            // data: { name: foo, data: bar }
            // check if expandReferences property was specified
            if (p.expandReferences) {
                completeData = data;
                const actualData = data.data;
                // set default value if not exists
                actualData[childItemKey] = actualData[childItemKey] === undefined ? [] : actualData[childItemKey];
                // for now let's just support a single reference
                referenceKey = Object.keys(p.expandReferences)[0];
                const referenceObj = p.expandReferences[Object.keys(p.expandReferences)[0]];

                const promises = [];
                if (typeof actualData === 'object' && Array.isArray(actualData[childItemKey])) {
                    for (let i = 0; i < actualData[childItemKey].length; i += 1) {
                        const item = actualData[childItemKey][i];
                        // first check for reference and then link property
                        if (item[referenceKey] && item[referenceKey].link) {
                            let referenceEndpoint = fixEndpoint(item[referenceKey].link);
                            if (referenceObj.endpointSuffix) {
                                referenceEndpoint = `${referenceEndpoint}${referenceObj.endpointSuffix}`;
                            }
                            promises.push(this._getData(referenceEndpoint, { name: i }));
                        }
                    }
                }
                return Promise.all(promises);
            }
            return Promise.resolve(data); // just return the data
        })
        .then(data => substituteData(data, referenceKey, false))
        .then((data) => {
            // check if includeStats property was specified
            if (p.includeStats) {
                completeData = data;
                const actualData = data.data;

                const promises = [];
                if (typeof actualData === 'object' && Array.isArray(actualData[childItemKey])) {
                    for (let i = 0; i < actualData[childItemKey].length; i += 1) {
                        const item = actualData[childItemKey][i];
                        // check for selfLink property
                        if (item.selfLink) {
                            promises.push(this._getData(`${fixEndpoint(item.selfLink)}/stats`, { name: i }));
                        }
                    }
                }
                return Promise.all(promises);
            }
            return Promise.resolve(data); // just return the data
        })
        .then(data => substituteData(data, null, true))
        .catch((err) => {
            throw err;
        });
};


/**
 * System Stats Class
 */
function SystemStats() {
    this.loader = null;
    this.contextData = {};
    this.collectedData = {};
    this.tags = {};
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
 * Evaluate conditional block
 *
 * @param {Object} conditionalBlock - block to evaluate, where object's key - conditional opertor
 *                                    object's value - params for that operator
 *
 * @returns {boolean} conditional result
 */
SystemStats.prototype._resolveConditional = function (conditionalBlock) {
    let ret = true;
    Object.keys(conditionalBlock).forEach((key) => {
        const func = CONDITIONAL_FUNCS[key];
        if (func === undefined) {
            throw new Error(`Unknown property in conditional block ${key}`);
        }
        ret = ret && func(this.contextData, conditionalBlock[key]);
    });
    return ret;
};
/**
 * Property pre-processing to resolve conditionals
 *
 * @param {Object} property - property object
 *
 * @returns {Object} pre-processed deep copy of property object
 */
SystemStats.prototype._preprocessProperty = function (property) {
    if (property.if) {
        const newObj = {};
        // property can result in 'false' when
        // 'else' or 'then' were not defined.
        while (property) {
            // copy all non-conditional data on same level to new object
            // eslint-disable-next-line no-loop-func
            Object.keys(property).forEach((key) => {
                if (!(key === 'if' || key === 'then' || key === 'else')) {
                    newObj[key] = property[key];
                }
            });
            // so, we copied everything we needed.
            // break in case there is no nested 'if' block
            if (!property.if) {
                break;
            }
            // trying to resolve conditional
            property = this._resolveConditional(property.if)
                ? property.then : property.else;
        }
        property = newObj;
    }
    // deep copy
    return util.deepCopy(property);
};
/**
 * Render key using mustache template system
 *
 * @param {Object} property - property object
 *
 * @returns {Object} rendered property object
 */
SystemStats.prototype._renderProperty = function (property) {
    // should be easy to add support for more complex templates like {{ #something }}
    // but not sure we are really need it now.
    // For now just supporting simple templates which
    // generates single string only
    if (property.key) property.key = mustache.render(property.key, this.contextData);
    return property;
};
/**
 * Process loaded data
 *
 * @param {Object} property - property object
 * @param {Object} data     - data object
 *
 * @returns {Object} normalized data (if needed)
 */
SystemStats.prototype._processData = function (property, data) {
    const defaultTags = { name: { pattern: '(.*)', group: 1 } };
    const addKeysByTagIsObject = property.addKeysByTag && typeof property.addKeysByTag === 'object';

    // standard options for normalize, these are driven primarily by the properties file
    const options = {
        key: this._splitKey(property.key).childKey,
        filterByKeys: property.filterKeys ? [property.filterKeys, global.filterKeys] : [global.filterKeys],
        renameKeysByPattern: property.renameKeys ? [property.renameKeys, global.renameKeys] : [global.renameKeys],
        convertArrayToMap: property.convertArrayToMap,
        includeFirstEntry: property.includeFirstEntry,
        formatTimestamps: global.formatTimestamps.keys,
        runCustomFunctions: property.runFunctions,
        addKeysByTag: { // add 'name' + any user configured tags if specified by prop
            tags: property.addKeysByTag ? Object.assign(defaultTags, this.tags) : defaultTags,
            definitions,
            opts: addKeysByTagIsObject ? property.addKeysByTag : global.addKeysByTag
        }
    };
    return property.normalize === false ? data : normalize.data(data, options);
};
/**
 * Load data for property
 *
 * @param {Object} property       - property object
 * @param {String} [property.key] - key to identify endpoint to load data from
 * @returns {Object} Promise resolved with fetched data object
 */
SystemStats.prototype._loadData = function (property) {
    return new Promise((resolve, reject) => {
        const endpoint = this._splitKey(property.key).rootKey;
        this.loader.loadEndpoint(endpoint, (data, err) => {
            if (err) {
                reject(err);
                return;
            }
            if (!data.data.items) {
                data.data.items = [];
            }
            resolve(data.data);
        });
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
    property = this._renderProperty(this._preprocessProperty(property));
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
            this.collectedData[key] = this._processData(property, data);
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
SystemStats.prototype._computeContextData = function (contextData) {
    let promise;

    if (Array.isArray(contextData)) {
        if (contextData.length) {
            promise = this._processContext(contextData[0]);
            for (let i = 1; i < contextData.length; i += 1) {
                promise.then(this._processContext(contextData[i]));
            }
        }
    } else if (contextData) {
        promise = this._processContext(contextData);
    }
    if (!promise) {
        promise = Promise.resolve();
    }
    return promise;
};
/**
 * Compute properties
 *
 * @param {Object} propertiesData - object with properties
 *
 * @returns {Object} Promise resolved when all properties were loaded
 */
SystemStats.prototype._computePropertiesData = function (propertiesData) {
    return Promise.all(Object.keys(propertiesData)
        .map(key => this._processProperty(key, propertiesData[key])));
};
/**
 * Collect info based on object provided in properties
 *
 * @param {String}  host                                     - host
 * @param {Object}  [options]                                - options
 * @param {Object}  [options.tags]                           - tags to add to the data (each key)
 * @param {String}  [options.credentials.username]           - username for host
 * @param {String}  [options.credentials.passphrase]         - password for host
 * @param {String}  [options.connection.protocol]            - protocol for host
 * @param {Integer} [options.connection.port]                - port for host
 * @param {Boolean} [options.connection.allowSelfSignedCert] - false - requires SSL certificates be valid,
 *                                                             true - allows self-signed certs
 *
 * @returns {Object} Promise which is resolved with a map of stats
 */
SystemStats.prototype.collect = function (host, options) {
    if (options.tags) this.tags = options.tags;

    this.loader = new EndpointLoader(host, options);
    this.loader.setEndpoints(paths.endpoints);

    return this.loader.auth()
        .then(() => this._computeContextData(context))
        .then(() => this._computePropertiesData(stats))
        .then(() => {
            // order data according to properties file
            const data = {};
            Object.keys(stats).forEach((key) => {
                data[key] = this.collectedData[key];
            });
            // certain stats require a more complex structure - process those
            Object.keys(data).forEach((key) => {
                const stat = stats[key] || {};
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
 * Comparison functions
 */

/**
 * Compare device versions
 *
 * @param {Object} contextData               - context data
 * @param {Object} contextData.deviceVersion - device's version to compare
 * @param {String} versionToCompare          - version to compare against
 *
 * @returns {boolean} true when device's version is greater or equal
 */
function deviceVersionGreaterOrEqual(contextData, versionToCompare) {
    const deviceVersion = contextData.deviceVersion;
    if (deviceVersion === undefined) {
        throw new Error('deviceVersionGreaterOrEqual: context has no property \'deviceVersion\'');
    }
    return util.compareVersionStrings(deviceVersion, '>=', versionToCompare);
}

/**
 * Compare provisioned modules
 *
 * @param {Object} contextData               - context data
 * @param {Object} contextData.provisioning  - provision state of modules to compare
 * @param {String} moduletoCompare           - module to compare against
 *
 * @returns {boolean} true when device's module is provisioned
 */
function isModuleProvisioned(contextData, moduleToCompare) {
    const provisioning = contextData.provisioning;
    if (provisioning === undefined) {
        throw new Error('isModuleProvisioned: context has no property \'provisioning\'');
    }
    return ((provisioning[moduleToCompare] || {}).level || 'none') !== 'none';
}

module.exports = SystemStats;
