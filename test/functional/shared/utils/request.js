/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assignDefaults = require('lodash/defaults');
const clone = require('lodash/clone');
const request = require('request');
const trimEnd = require('lodash/trimEnd');
const trimStart = require('lodash/trimStart');

const constants = require('../constants');
const getArgByType = require('./misc').getArgByType;
const logger = require('./logger').getChild('request');

/**
 * @module test/functional/shared/utils/request
 */

/*
 * Helper functions for HTTP(s) requests
 */
const MAKE_REQUEST_OPTS_TO_REMOVE = [
    'allowSelfSignedCert',
    'continueOnErrorCode',
    'expectedResponseCode',
    'fullURI',
    'host',
    'includeResponseObject',
    'json',
    'passphrase',
    'port',
    'protocol',
    'rawResponseBody',
    'username'
];

let REQUEST_ID = 0;

/**
 * Build URL
 *
 * @param {URL | string} [urlOpts] - URL config
 * @param {boolean} [isProxy = false] -  true if should build URL for proxy
 *
 * @returns {string} URL as a string
 */
function buildURL(urlOpts, isProxy) {
    let url = '';
    if (typeof urlOpts === 'string') {
        if (urlOpts) {
            // might be a good idea to check for protocol and etc.
            url = urlOpts;
        }
    } else if (typeof urlOpts === 'object' && !Array.isArray(urlOpts)) {
        if (urlOpts.host) {
            let auth = '';
            if (urlOpts.username) {
                auth = urlOpts.username;
                if (urlOpts.passphrase) {
                    auth = `${auth}:${urlOpts.passphrase}`;
                }
                auth = `${auth}@`;
            }
            const protocol = urlOpts.protocol || constants.HTTP_REQUEST.PROTOCOL;
            const port = `:${urlOpts.port || constants.HTTP_REQUEST.PORT}`;
            url = `${protocol}://${auth}${trimEnd(urlOpts.host, '/')}${port}`;

            if (!isProxy && urlOpts.uri) {
                url = `${url}/${trimStart(urlOpts.uri, '/')}`;
            }
        }
    }
    return url;
}

/**
 * Perform HTTP request
 *
 * @public
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
 * @param {string} [host] - HTTP host
 * @param {string} [uri] - HTTP uri
 * @param {RequestOptions} [options] - request options
 *
 * @returns {Promise<any>} resolved with response
 */
module.exports = function makeRequest() {
    if (arguments.length === 0) {
        throw new Error('makeRequest: no arguments were passed to function');
    }

    // rest params syntax supported by node 6+ only
    const host = getArgByType(arguments, 'string', { fromIndex: 0 }).value;
    const uri = getArgByType(arguments, 'string', { fromIndex: 1 }).value;
    let options = getArgByType(arguments, 'object', { defaultValue: {} }).value;

    options = Object.assign({}, options);
    options = assignDefaults(options, {
        continueOnErrorCode: false,
        expectedResponseCode: [200],
        includeResponseObject: false,
        json: true,
        logger,
        method: 'GET',
        port: constants.HTTP_REQUEST.PORT,
        protocol: constants.HTTP_REQUEST.PROTOCOL,
        rawResponseBody: false
    });
    // copy complex objects that may mutate over time during request processing
    options.headers = clone(options.headers);
    options.expectedResponseCode = clone(options.expectedResponseCode);

    if (host) {
        options.host = host;
    }
    if (uri) {
        options.uri = uri;
    }
    options.strictSSL = typeof options.allowSelfSignedCert === 'undefined'
        ? constants.HTTP_REQUEST.STRICT_SSL : !options.allowSelfSignedCert;

    if (options.gzip && !options.headers['Accept-Encoding']) {
        options.headers['Accept-Encoding'] = 'gzip';
    }

    if (options.rawResponseBody) {
        options.encoding = null;
    }

    if (options.json && typeof options.body !== 'undefined') {
        options.body = JSON.stringify(options.body);
    }

    options.uri = options.host ? buildURL(options) : options.fullURI;
    if (!options.uri) {
        throw new Error('makeRequest: no fullURI or host provided');
    }
    if (typeof options.proxy !== 'undefined') {
        options.proxy = buildURL(options.proxy, true);
        if (!options.proxy) {
            delete options.proxy;
        }
    }

    const continueOnErrorCode = options.continueOnErrorCode;
    const expectedResponseCode = Array.isArray(options.expectedResponseCode)
        ? options.expectedResponseCode : [options.expectedResponseCode];
    const includeResponseObject = options.includeResponseObject;
    const rawResponseBody = options.rawResponseBody;

    MAKE_REQUEST_OPTS_TO_REMOVE.forEach((key) => {
        delete options[key];
    });

    const reqId = REQUEST_ID;
    REQUEST_ID += 1;

    return new Promise((resolve, reject) => {
        options.logger.info('Sending request', { reqId, options });

        // using request.get, request.post, etc. - useful during unit test mocking
        request[options.method.toLowerCase()](options, (err, res, body) => {
            if (err) {
                options.logger.error('Request error', { reqId, err });
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
                options.logger.info('Got response', {
                    body,
                    reqId,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage
                });

                if (expectedResponseCode.indexOf(res.statusCode) !== -1 || continueOnErrorCode === true) {
                    resolve(body);
                } else {
                    const resErr = new Error(`Bad status code: ${res.statusCode} ${res.statusMessage || ''} for ${options.uri}`);
                    resErr.statusCode = res.statusCode;
                    resErr.statusMessage = res.statusMessage;
                    resErr.response = res;
                    reject(resErr);
                }
            }
        });
    });
};

/**
 * URL definition
 *
 * @typedef URL
 * @type {Object}
 * @property {string} [host] - host
 * @property {string} [passphrase] - passphrase to sue for auth
 * @property {'http' | 'https'} [protocol = 'https'] - HTTP protocol
 * @property {integer} [port = 443] - port
 * @property {string} [uri] - URI / path
 * @property {string} [username] - username to use for auth
 */
/**
 * @typedef RequestOptions
 * @type {URL}
 * @property {boolean} [allowSelfSignedCert = false]  - do not require SSL certificates be valid
 * @property {any} [body] - HTTP body, must be a Buffer, String or ReadStream or JSON-serializable object
 * @property {boolean} [continueOnErrorCode = false] - continue on non-successful response code
 * @property {Array<integer>|integer} [expectedResponseCode = 200] - expected response code
 * @property {string} [fullURI] - full HTTP URI
 * @property {boolean} [gzip] - accept compressed content from the server
 * @property {Object<string, any>}  [headers] - HTTP headers
 * @property {boolean} [includeResponseObject = false] - return [body, responseObject]
 * @property {boolean} [json = true] - sets HTTP body to JSON representation of value
 * @property {logger.Logger} [logger] - logger
 * @property {string} [method = 'GET'] - HTTP method
 * @property {integer} [port = 443] - HTTP port
 * @property {'http' | 'https'} [protocol = 'https'] - HTTP protocol
 * @property {string | URL} [proxy] - proxy URI or proxy config
 * @property {boolean} [rawResponseBody = false] - return response as Buffer object with binary data
 * @property {integer} [timeout] - milliseconds to wait for a socket timeout (option from 'request' library)
 */
