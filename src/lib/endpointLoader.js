/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const deviceUtil = require('./deviceUtil.js');
const constants = require('./constants.js');
const util = require('./util.js');
const logger = require('./logger.js');

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
 * Load data from endpoint
 *
 * @param {String} endpoint                 - endpoint name/key to fetch data from
 * @param {Object} [options]                - function options
 * @param {Object} [options.replaceStrings] - key/value pairs that replace matching strings in request body
 *
 * @returns {Object} Promise resolved with fetched data
 */
EndpointLoader.prototype.loadEndpoint = function (endpoint, options) {
    const opts = options || {};
    const endpointObj = this.endpoints[endpoint];

    if (endpointObj === undefined) {
        return Promise.reject(new Error(`Endpoint not defined in file: ${endpoint}`));
    }

    let dataIsEmpty = false;
    if (this.cachedResponse[endpoint] === undefined) {
        dataIsEmpty = true;
    }

    if ((endpointObj || {}).ignoreCached) {
        dataIsEmpty = true;
    }

    return Promise.resolve()
        .then(() => {
            if (dataIsEmpty) {
                return this._getAndExpandData(endpointObj, { replaceStrings: opts.replaceStrings });
            }
            return Promise.resolve(this.cachedResponse[endpoint]);
        })
        .then((response) => {
            if (dataIsEmpty) {
                // Cache data for later calls
                this.cachedResponse[endpoint] = response;
            }
            return Promise.resolve(response);
        })
        .catch((err) => {
            logger.error(`Error: EndpointLoader.loadEndpoint: ${endpoint}: ${err}`);
            return Promise.reject(err);
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
 * @param {Object} endpointProperties       - endpoint properties
 * @param {Object} [options]                - function options
 * @param {Object} [options.replaceStrings] - key/value pairs that replace matching strings in request body
 *
 * @returns {Object} Promise which is resolved with data
 */
EndpointLoader.prototype._getAndExpandData = function (endpointProperties, options) {
    const opts = options || {};
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

    const replaceBodyVars = (body, replaceStrings) => {
        let bodyStr = JSON.stringify(body);

        Object.keys(replaceStrings).forEach((key) => {
            bodyStr = bodyStr.replace(new RegExp(key), replaceStrings[key]);
        });

        return JSON.parse(bodyStr);
    };

    const body = opts.replaceStrings ? replaceBodyVars(p.body, opts.replaceStrings) : p.body;

    return this._getData(
        p.endpoint,
        { name: p.name, body, endpointFields: p.endpointFields }
    )
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
            completeData = null;
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

module.exports = EndpointLoader;
