/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const request = require('request');
const constants = require('../constants');
const util = require('./misc');


/** @module requestsUtil */
/* Helper functions for making requests
*/

// cleanup options. Update tests (test/unit/utils/requestsTests.js) when adding new value
const MAKE_REQUEST_OPTS_TO_REMOVE = [
    'allowSelfSignedCert',
    'continueOnErrorCode',
    'expectedResponseCode',
    'fullURI',
    'includeResponseObject',
    'json',
    'port',
    'protocol',
    'rawResponseBody'
];

/**
 * Perform HTTP request
 *
 * @example
 * // host only
 * makeRequest(hostStr)
 * @example
 * // options only
 * makeRequest(optionsObj)
 * @example
 * // host and options
 * makeRequest(hostStr, optionsObj)
 * @example
 * // host and uri and options
 * makeRequest(hostStr, uriStr, optionsObj)
 * @example
 * // host and uri
 * makeRequest(hostStr, uriStr)
 *
 * @param {String}  [host]                         - HTTP host
 * @param {String}  [uri]                          - HTTP uri
 * @param {Object}  [options]                      - function options. Copy it before pass to function.
 * @param {String}  [options.fullURI]              - full HTTP URI
 * @param {String}  [options.protocol]             - HTTP protocol, by default http
 * @param {Integer} [options.port]                 - HTTP port, by default 80
 * @param {String}  [options.method]               - HTTP method, by default GET
 * @param {Any}     [options.body]                 - HTTP body, must be a Buffer, String or ReadStream or
 *                                                   JSON-serializable object
 * @param {Boolean} [options.json]                 - sets HTTP body to JSON representation of value and adds
 *                                                   Content-type: application/json header, by default true
 * @param {Object}  [options.headers]              - HTTP headers
 * @param {Object}  [options.continueOnErrorCode]  - continue on non-successful response code, by default false
 * @param {Boolean} [options.allowSelfSignedCert]  - do not require SSL certificates be valid, by default false
 * @param {Object}  [options.rawResponseBody]      - return response as Buffer object with binary data,
 *                                                   by default false
 * @param {Boolean} [options.includeResponseObject] - return [body, responseObject], by default false
 * @param {Array<Integer>|Integer} [options.expectedResponseCode]  - expected response code, by default 200
 * @param {Integer} [options.timeout]              - Milliseconds to wait for a socket timeout. Option
 *                                                    'passes through' to 'request' library
 * @param {String}  [options.proxy]                - proxy URI
 * @param {Boolean} [config.gzip]                  - accept compressed content from the server
 *
 * @returns {Promise.<?any>} Returns promise resolved with response
 */
const makeRequest = function () {
    if (arguments.length === 0) {
        throw new Error('makeRequest: no arguments were passed to function');
    }

    // rest params syntax supported by node 6+ only
    let host;
    let uri;
    let options;

    if (typeof arguments[0] === 'object') {
        options = arguments[0];
    } else if (typeof arguments[1] === 'object') {
        host = arguments[0];
        options = arguments[1];
    } else {
        host = arguments[0];
        uri = arguments[1];
        options = arguments[2];
    }

    options = util.assignDefaults(options, {
        continueOnErrorCode: false,
        expectedResponseCode: [200],
        headers: {},
        includeResponseObject: false,
        json: true,
        method: 'GET',
        port: constants.HTTP_REQUEST.DEFAULT_PORT,
        protocol: constants.HTTP_REQUEST.DEFAULT_PROTOCOL,
        rawResponseBody: false
    });
    options.headers['User-Agent'] = options.headers['User-Agent'] || constants.USER_AGENT;
    options.strictSSL = typeof options.allowSelfSignedCert === 'undefined'
        ? constants.STRICT_TLS_REQUIRED : !options.allowSelfSignedCert;

    if (options.gzip && !options.headers['Accept-Encoding']) {
        options.headers['Accept-Encoding'] = 'gzip';
    }

    if (options.rawResponseBody) {
        options.encoding = null;
    }

    if (options.json && typeof options.body !== 'undefined') {
        options.body = JSON.stringify(options.body);
    }

    uri = host ? `${options.protocol}://${host}:${options.port}${uri || ''}` : options.fullURI;
    if (!uri) {
        throw new Error('makeRequest: no fullURI or host provided');
    }
    options.uri = uri;

    const continueOnErrorCode = options.continueOnErrorCode;
    const expectedResponseCode = Array.isArray(options.expectedResponseCode)
        ? options.expectedResponseCode : [options.expectedResponseCode];
    const includeResponseObject = options.includeResponseObject;
    const rawResponseBody = options.rawResponseBody;

    MAKE_REQUEST_OPTS_TO_REMOVE.forEach((key) => {
        delete options[key];
    });

    return new Promise((resolve, reject) => {
        // using request.get, request.post, etc. - useful during unit test mocking
        request[options.method.toLowerCase()](options, (err, res, body) => {
            if (err) {
                reject(new Error(`HTTP error: ${err}`));
            } else {
                if (!rawResponseBody) {
                    try {
                        body = JSON.parse(body);
                    } catch (parseErr) {
                        // do nothing
                    }
                }
                if (includeResponseObject === true) {
                    body = [body, res];
                }
                if (expectedResponseCode.indexOf(res.statusCode) !== -1 || continueOnErrorCode === true) {
                    resolve(body);
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} for ${uri}`;
                    reject(new Error(msg));
                }
            }
        });
    });
};

module.exports = {
    makeRequest
};
