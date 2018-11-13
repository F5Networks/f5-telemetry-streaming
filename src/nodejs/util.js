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

const logger = require('./logger.js');
const constants = require('./constants');

/**
 * Start poller
 *
 * @returns {Object} setInterval ID (to be used by clearInterval)
 */
function start(func, args, intervalInS) {
    return setInterval(func, intervalInS * 1000, args);
}

/**
 * Update poller
 *
 * @returns {Object} Result of function start()
 */
function update(setIntervalId, func, args, intervalInS) {
    clearInterval(setIntervalId);
    return start(func, args, intervalInS);
}

/**
 * Stop poller
 *
 * @param {integer} intervalID - poller ID
 */
function stop(intervalID) {
    clearInterval(intervalID);
}

/**
 * LX rest operation responder
 *
 * @param {Object} restOperation  - restOperation to complete
 * @param {String} status         - HTTP status
 * @param {String} body           - HTTP body
 *
 * @returns {void}
 */
function restOperationResponder(restOperation, status, body) {
    restOperation.setStatusCode(status);
    restOperation.setBody(body);
    restOperation.complete();
}

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
function convertArrayToMap(data, key, options) {
    const ret = {};

    if (!Array.isArray(data)) {
        throw new Error(`convertArrayToMap() array required: ${stringify(data)}`);
    }

    data.forEach((i) => {
        const keyName = options.keyPrefix ? `${options.keyPrefix}${i[key]}` : i[key];
        ret[keyName] = i;
    });
    return ret;
}

/**
 * Filter data based on a list of keys
 *
 * @param {Object} data - data
 * @param {Array} keys  - list of keys to use to filter data
 *
 * @returns {Object} Filtered data
 */
function filterDataByKeys(data, keys) {
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
                ret[k] = filterDataByKeys(ret[k], keys);
            }
        });
    }

    return ret;
}

/**
 * Stringify a message
 *
 * @param {Object|String} msg - message to stringify
 *
 * @returns {Object} Stringified message
 */
function stringify(msg) {
    if (typeof msg === 'object') {
        try {
            msg = JSON.stringify(msg);
        } catch (e) {
            // just leave original message intact
        }
    }
    return msg;
}

/**
 * Validate schema
 *
 * @param {Object} data - data to validate
 * @param {Object} schema - schema to validate against
 *
 * @returns {Object} Promise which is resolved with the validated schema
 */
function validateSchema(data, schema) {
    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
        const error = stringify(validate.errors);
        logger.error(`validateSchema invalid: ${error}`);
        return Promise.reject(new Error(error));
    }
    return Promise.resolve(data);
}

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
function makeRequest(host, uri, options) {
    const opts = options === undefined ? {} : options;
    const defaultHeaders = {
        Authorization: `Basic ${new Buffer('admin:').toString('base64')}`,
        'User-Agent': constants.USER_AGENT
    };

    // well, should be more sophisticated than this
    let fullUri = options.port === 443 ? `https://${host}` : `http://${host}`;
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
}

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
function getAuthToken(host, username, password, options) {
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

    return makeRequest(host, uri, postOptions)
        .then((data) => {
            const ret = { token: data.token.token };
            return ret;
        })
        .catch((err) => {
            const msg = `getAuthToken: ${err}`;
            throw new Error(msg);
        });
}

module.exports = {
    start,
    stop,
    update,
    restOperationResponder,
    convertArrayToMap,
    filterDataByKeys,
    stringify,
    validateSchema,
    makeRequest,
    getAuthToken
};
