/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('./constants');
const deviceUtil = require('./utils/device');
const logger = require('./logger');
const promiseUtil = require('./utils/promise');
const retryPromise = require('./utils/promise').retry;
const util = require('./utils/misc');

/** @module EndpointLoader */

/**
 * Options to use to expand reference
 *
 * @typedef {Object} ExpandReferencesOpts
 * @property {String} [endpointSuffix] - URI suffix to use to modify link
 * @property {Boolean} [includeStats] - include response from /stats
 */
/**
 * References to expand
 *
 * @typedef {Object.<string, module:EndpointLoader~ExpandReferencesOpts} ExpandReferences
 */
/**
 * @typedef {Object} Endpoint
 * @param {String}  [path]         - endpoint's URI
 * @param {String}  [name]             - endpoint's name
 * @param {Object|String} [body]       - body to send to endpoint
 * @param {Boolean} [includeStats]     - include stats for each object
 * @param {module:EndpointLoader~ExpandReferences} [expandReferences] - references to expand
 */
/**
 * Fetched data
 *
 * @typedef {Object} FetchedData
 * @param {String} name         - name for this set of data
 * @param {Object} data         - fetched data
 * @param {String} [refKey] - reference key
 */

/**
 * Endpoint Loader class.
 *
 * @example
 * // initialize with host and options
 * new EndpointLoader(host, options)
 * @example
 * // initialize with host only
 * new EndpointLoader(host)
 * @example
 * // initialize with options only (all requests will be sent to localhost)
 * new EndpointLoader(options)
 *
 * @param {String}  [host]                                   - host, by  default localhost
 * @param {Object}  [options]                                - options
 * @param {module:logger~Logger} [options.logger]            - logger
 * @param {String}  [options.credentials.username]           - username for host
 * @param {String}  [options.credentials.passphrase]         - password for host
 * @param {String}  [options.credentials.token]              - auth token
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
    this.options = util.assignDefaults(
        this.options,
        {
            credentials: {},
            connection: {},
            logger
        }
    );

    this.logger = this.options.logger;
    this.endpoints = null;
    this.eraseCache();
}
/**
 * Erase cache
 */
EndpointLoader.prototype.eraseCache = function () {
    this.cachedResponse = {};
};
/**
 * Set endpoints definition
 *
 * @param {Array.<module:EndpointLoader~Endpoint>} newEndpoints - list of endpoints to add
 */
EndpointLoader.prototype.setEndpoints = function (newEndpoints) {
    if (Array.isArray(newEndpoints)) {
        this.endpoints = {};
        newEndpoints.forEach((endpoint) => {
            // if 'name' presented then use it as unique ID
            // otherwise use path prop
            this.endpoints[endpoint.name || endpoint.path] = endpoint;
        });
    } else {
        this.endpoints = newEndpoints;
    }
};
/**
 * Authenticate on target device
 *
 * @returns {Promise} Promise which is resolved when successfully authenticated
 */
EndpointLoader.prototype.auth = function () {
    if (this.options.credentials.token) {
        return Promise.resolve();
    }
    const options = Object.assign({}, this.options.connection);
    return deviceUtil.getAuthToken(
        this.host,
        this.options.credentials.username,
        this.options.credentials.passphrase,
        options
    )
        .then((token) => {
            this.options.credentials.token = token.token;
        });
};
/**
 * Load data from endpoint
 *
 * @param {String} endpoint                 - endpoint name/key to fetch data from
 * @param {Object} [options]                - function options
 * @param {Object} [options.replaceStrings] - key/value pairs that replace matching strings in request body
 *
 * @returns {Promise<module:EndpointLoader~FetchedData>} Promise resolved with FetchedData
 */
EndpointLoader.prototype.loadEndpoint = function (endpoint, options) {
    let endpointObj = this.endpoints[endpoint];
    if (endpointObj === undefined) {
        return Promise.reject(new Error(`Endpoint not defined: ${endpoint}`));
    }
    // TODO: fix it later, right now it doesn't work with multiple concurrent connections
    if (!endpointObj.ignoreCached && typeof this.cachedResponse[endpoint] !== 'undefined') {
        return Promise.resolve(this.cachedResponse[endpoint]);
    }
    if ((options || {}).replaceStrings) {
        endpointObj = Object.assign({}, endpointObj);
        endpointObj.body = this.replaceBodyVars(endpointObj.body, options.replaceStrings);
    }
    return this.getAndExpandData(endpointObj)
        .then((response) => {
            this.cachedResponse[endpoint] = response;
            return Promise.resolve(response);
        })
        .catch((err) => {
            this.logger.error(`Error: EndpointLoader.loadEndpoint: ${endpoint}: ${err}`);
            return Promise.reject(err);
        });
};

/**
 * Expand references
 *
 * @param {module:EndpointLoader~Endpoint} endpointObj - endpoint object
 * @param {module:EndpointLoader~FetchedData} data     - fetched data
 *
 * @returns {Promise<Array<module:EndpointLoader~FetchedData>>} resolved with array of FetchedData
 */
EndpointLoader.prototype.expandReferences = function (endpointObj, data) {
    const promises = [];
    const dataItems = data.data.items;
    if (endpointObj.expandReferences && dataItems && Array.isArray(dataItems) && dataItems.length) {
        // for now let's just support a single reference
        const referenceKey = Object.keys(endpointObj.expandReferences)[0];
        const referenceObj = endpointObj.expandReferences[referenceKey];
        for (let i = 0; i < dataItems.length; i += 1) {
            const item = dataItems[i][referenceKey];
            if (item && item.link) {
                let referenceEndpoint = this.getURIPath(item.link);
                // Process '/stats' endpoint first, before modifying referenceEndpoint url
                if (referenceObj.includeStats) {
                    promises.push(this.getData(`${referenceEndpoint}/stats`, { name: i, refKey: referenceKey }));
                }
                if (referenceObj.endpointSuffix) {
                    referenceEndpoint = `${referenceEndpoint}${referenceObj.endpointSuffix}`;
                }
                promises.push(this.getData(referenceEndpoint, { name: i, refKey: referenceKey }));
            }
        }
    }
    return promiseUtil.allSettled(promises)
        .then((results) => promiseUtil.getValues(results));
};
/**
 * Fetch stats for each item
 *
 * @param {module:EndpointLoader~Endpoint} endpointObj - endpoint object
 * @param {Object} data                                - data
 * @param {String} data.name                           - name
 * @param {Object} data.data                           - data to process
 *
 * @returns {Promise<Array<module:EndpointLoader~FetchedData>>}} resolved with array of FetchedData
 */
EndpointLoader.prototype.fetchStats = function (endpointObj, data) {
    const promises = [];
    const dataItems = data.data.items;
    if (endpointObj.includeStats && dataItems && Array.isArray(dataItems) && dataItems.length) {
        for (let i = 0; i < dataItems.length; i += 1) {
            const item = dataItems[i];
            // check for selfLink property
            if (item.selfLink) {
                promises.push(this.getData(`${this.getURIPath(item.selfLink)}/stats`, { name: i }));
            }
        }
    }
    return promiseUtil.allSettled(promises)
        .then((results) => promiseUtil.getValues(results));
};
/**
 * Substitute data
 *
 * @param {module:EndpointLoader~FetchedData} baseData         - base data
 * @param {Array<module:EndpointLoader~FetchedData>} dataArray - array of data to use for substitution
 * @param {Boolean} shallowCopy                                - true if shallow copy required else
 *                                                               original object will be used
 */
EndpointLoader.prototype.substituteData = function (baseData, dataArray, shallowCopy) {
    if (!dataArray.length) {
        return;
    }
    const baseDataItems = baseData.data.items;
    dataArray.forEach((data) => {
        try {
            let dataToSubstitute;
            if (shallowCopy === true) {
                dataToSubstitute = Object.assign(data.data, baseDataItems[data.name]);
            } else {
                dataToSubstitute = data.data;
            }
            if (data.refKey) {
                // if this is the first time substituting data, overwrite the containing object with data
                // e.g.
                // itemsRef: {
                //    link: 'http://objLink/objItems',
                //    isSubcollection: true
                // }
                // will become:
                // itemsRef: {
                //    objItemProp1: 123 //data from link
                // }
                if (baseDataItems[data.name][data.refKey].link) {
                    baseDataItems[data.name][data.refKey] = dataToSubstitute;
                } else {
                    // otherwise if same object has been previously substituted
                    // and we're merging new set of props from a different link (e.g. objItems/stats)
                    // then copy over the properties of the new dataToSubstitute
                    // e.g.
                    // itemsRef: {
                    //     objItemProp1: 123
                    //     objItemProp2: true
                    // }
                    Object.assign(baseDataItems[data.name][data.refKey], dataToSubstitute);
                }
            } else {
                baseDataItems[data.name] = dataToSubstitute;
            }
        } catch (e) {
            // just continue
        }
    });
};
/**
 * Get data for specific endpoint
 *
 * @param {String}   uri                            - uri where data resides
 * @param {Object}   [options]                      - function options
 * @param {String}   [options.name]                 - name of key to store as, will override default of uri
 * @param {String}   [options.body]                 - body to send, sent via POST request
 * @param {String}   [options.refKey]               - reference key
 * @param {String[]} [options.endpointFields]       - restrict collection to these fields
 * @param {Boolean}  [options.parseDuplicateKeys]   - whether or not to support parsing JSON with duplicate keys
 *
 * @returns {Promise<module:EndpointLoader~FetchedData>} resolved with FetchedData
 */
EndpointLoader.prototype.getData = function (uri, options) {
    this.logger.debug(`EndpointLoader.getData: loading data from URI = ${uri}`);

    options = options || {};
    const httpOptions = Object.assign({}, this.options.connection);
    const parseDuplicateKeys = options.parseDuplicateKeys === true;

    httpOptions.credentials = {
        username: this.options.credentials.username,
        token: this.options.credentials.token
    };
    if (parseDuplicateKeys) {
        httpOptions.rawResponseBody = options.parseDuplicateKeys;
    }
    if (options.body) {
        httpOptions.method = 'POST';
        httpOptions.body = options.body;
    }
    const retryOpts = {
        maxTries: 3,
        backoff: 100
    };
    const fullUri = options.endpointFields ? `${uri}?$select=${options.endpointFields.join(',')}` : uri;
    return retryPromise(() => deviceUtil.makeDeviceRequest(this.host, fullUri, httpOptions), retryOpts)
        .then((data) => {
            if (parseDuplicateKeys) {
                data = util.parseJsonWithDuplicateKeys(data.toString());
            }
            const ret = {
                name: options.name !== undefined ? options.name : uri,
                data
            };
            if (options.refKey) {
                ret.refKey = options.refKey;
            }
            return ret;
        });
};
/**
 * Get data for specific endpoint (with some extra logic)
 *
 * @param {module:EndpointLoader~Endpoint} endpointObj - endpoint object
 * @param {String} endpointObj.path - URI path to get data from
 * @returns {Promise<module:EndpointLoader~FetchedData>} resolved with FetchedData
 */
EndpointLoader.prototype.getAndExpandData = function (endpointObj) {
    // baseData in this method is the data fetched from endpointObj.path
    return this.getData(endpointObj.path, endpointObj)
        // Promise below will be resolved with array of 2 elements:
        // [ baseData, [refData, refData] ]
        .then((baseData) => promiseUtil.allSettled([
            Promise.resolve(baseData),
            this.expandReferences(endpointObj, baseData)
        ]))
        .then((results) => {
            const dataArray = promiseUtil.getValues(results);
            // dataArray === [ baseData, [refData, refData] ]
            const baseData = dataArray[0];
            this.substituteData(baseData, dataArray[1], false);
            return promiseUtil.allSettled([
                Promise.resolve(baseData),
                this.fetchStats(endpointObj, baseData)
            ]);
        })
        // Promise below will be resolved with array of 2 elements:
        // [ baseData, [statsData, statsData] ]
        .then((results) => {
            const dataArray = promiseUtil.getValues(results);
            // dataArray === [ baseData, [statsData, statsData] ]
            const baseData = dataArray[0];
            this.substituteData(baseData, dataArray[1], true);
            return baseData;
        });
};

/**
 * Replace variables in body with values
 *
 * @param {Object|String} body - request body
 * @param {Object} keys        - keys/vars to replace
 *
 * @returns {Object|String}
 */
EndpointLoader.prototype.replaceBodyVars = function (body, keys) {
    let isObject = false;
    if (typeof body !== 'string') {
        isObject = true;
        body = JSON.stringify(body);
    }
    Object.keys(keys).forEach((key) => {
        body = body.replace(new RegExp(key), keys[key]);
    });
    if (isObject) {
        body = JSON.parse(body);
    }
    return body;
};

/**
 * Get URI path
 *
 * @param {String} uri - URI
 *
 * @returns {String} URI path
 */
EndpointLoader.prototype.getURIPath = function (uri) {
    return uri.replace('https://localhost', '').split('?')[0];
};

module.exports = EndpointLoader;
