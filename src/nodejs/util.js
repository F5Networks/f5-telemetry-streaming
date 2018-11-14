/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const request = require('request');

const constants = require('./constants');

module.exports = {
    /**
     * Start function
     *
     * @returns {Object} setInterval ID (to be used by clearInterval)
     */
    start(func, args, intervalInS) {
        return setInterval(func, intervalInS * 1000, args);
    },

    /**
     * Update function
     *
     * @returns {Object} Result of function start()
     */
    update(setIntervalId, func, args, intervalInS) {
        clearInterval(setIntervalId);
        return this.start(func, args, intervalInS);
    },

    /**
     * Stop function
     *
     * @param {integer} intervalID - interval ID
     */
    stop(intervalID) {
        clearInterval(intervalID);
    },

    /**
     * LX rest operation responder
     *
     * @param {Object} restOperation  - restOperation to complete
     * @param {String} status         - HTTP status
     * @param {String} body           - HTTP body
     *
     * @returns {void}
     */
    restOperationResponder(restOperation, status, body) {
        restOperation.setStatusCode(status);
        restOperation.setBody(body);
        restOperation.complete();
    },

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
    convertArrayToMap(data, key, options) {
        const ret = {};

        if (!Array.isArray(data)) {
            throw new Error(`convertArrayToMap() array required: ${this.stringify(data)}`);
        }

        data.forEach((i) => {
            const keyName = options.keyPrefix ? `${options.keyPrefix}${i[key]}` : i[key];
            ret[keyName] = i;
        });
        return ret;
    },

    /**
     * Filter data based on a list of keys
     *
     * @param {Object} data - data
     * @param {Array} keys  - list of keys to use to filter data
     *
     * @returns {Object} Filtered data
     */
    filterDataByKeys(data, keys) {
        const ret = data;

        if (typeof data === 'object') {
            // for now just ignore arrays
            if (Array.isArray(data)) {
                return ret;
            }

            Object.keys(data).forEach((k) => {
                let deleteKey = true;
                keys.forEach((i) => {
                    // simple includes for now - no exact match
                    if (k.includes(i)) {
                        deleteKey = false;
                    }
                });
                if (deleteKey) {
                    delete ret[k];
                } else {
                    ret[k] = this.filterDataByKeys(ret[k], keys);
                }
            });
        }

        return ret;
    },

    /**
     * Stringify a message
     *
     * @param {Object|String} msg - message to stringify
     *
     * @returns {Object} Stringified message
     */
    stringify(msg) {
        if (typeof msg === 'object') {
            try {
                msg = JSON.stringify(msg);
            } catch (e) {
                // just leave original message intact
            }
        }
        return msg;
    },

    /**
     * Validate data against schema
     *
     * @param {Object} data - data to validate
     * @param {Object} schema - schema(s) to validate against
     * { base: baseSchema, schema1: schema, schema2: schema }
     *
     * @returns {Object} Promise which is resolved with the validated data
     */
    validateAgainstSchema(data, schemas) {
        const ajv = new Ajv({ useDefaults: true, coerceTypes: true });
        Object.keys(schemas).forEach((k) => {
            // ignore base, that will be added later
            if (k !== 'base') {
                ajv.addSchema(schemas[k]);
            }
        });
        const validator = ajv.compile(schemas.base);
        const isValid = validator(data);

        if (!isValid) {
            const error = this.stringify(validator.errors);
            return Promise.reject(new Error(error));
        }
        return Promise.resolve(data);
    },

    /**
     * Format data by class
     *
     * @param {Object} data - data to format
     *
     * @returns {Object} Returns the data formatted by class
     */
    formatDataByClass(data) {
        let ret = {};
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach((k) => {
                const childData = data[k];
                if (typeof childData === 'object' && childData.class) {
                    if (!ret[childData.class]) { ret[childData.class] = {}; }
                    ret[childData.class][k] = childData;
                } else {
                    // might need to introspect child objects
                    ret = this.formatDataByClass(childData);
                }
            });
        }
        return ret;
    },

    /**
     * Format config for easier consumption
     *
     * @param {Object} data - data to format
     *
     * @returns {Object} Returns the formatted config
     */
    formatConfig(data) {
        // for now just format by class
        return this.formatDataByClass(data);
    },

    /**
     * Perform HTTP request
     *
     * @param {String} host              - HTTP host
     * @param {String} uri               - HTTP uri
     * @param {Object} options           - function options
     * @param {Integer} [options.port]   - HTTP port - optional
     * @param {String} [options.method]  - HTTP method - optional
     * @param {String} [options.body]    - HTTP body - optional
     * @param {Object} [options.headers] - HTTP headers - optional
     *
     * @returns {Object} Returns promise resolved with reponse
     */
    makeRequest(host, uri, options) {
        const opts = options === undefined ? {} : options;
        const defaultHeaders = {
            Authorization: `Basic ${new Buffer('admin:').toString('base64')}`,
            'User-Agent': constants.USER_AGENT
        };

        // well, should be more sophisticated than this
        // default to https, unless in defined list of http ports
        let fullUri = [80, 8080, 8100].indexOf(options.port) !== -1 ? `http://${host}` : `https://${host}`;
        fullUri = options.port ? `${fullUri}:${options.port}${uri}` : `${fullUri}:${constants.DEFAULT_PORT}${uri}`;
        const requestOptions = {
            uri: fullUri,
            method: opts.method ? opts.method : 'GET',
            body: opts.body ? String(opts.body) : undefined,
            headers: opts.headers ? opts.headers : defaultHeaders,
            strictSSL: constants.STRICT_TLS_REQUIRED
        };

        return new Promise((resolve, reject) => {
            request(requestOptions, (err, res, body) => {
                if (err) {
                    reject(new Error(`HTTP error: ${err}`));
                } else if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} for ${uri}`;
                    reject(new Error(msg));
                }
            });
        });
    },

    /**
     * Get auth token
     *
     * @param {String} host            - HTTP host
     * @param {String} username        - device username
     * @param {String} password        - device password
     * @param {Object} options         - function options
     * @param {Integer} [options.port] - HTTP port - optional
     *
     * @returns {Object} Returns promise resolved with auth token
     */
    getAuthToken(host, username, password, options) {
        const uri = '/mgmt/shared/authn/login';
        const body = JSON.stringify({
            username,
            password,
            loginProviderName: 'tmos'
        });
        const postOptions = {
            method: 'POST',
            port: options.port,
            body
        };

        return this.makeRequest(host, uri, postOptions)
            .then((data) => {
                const ret = { token: data.token.token };
                return ret;
            })
            .catch((err) => {
                const msg = `getAuthToken: ${err}`;
                throw new Error(msg);
            });
    }
};
