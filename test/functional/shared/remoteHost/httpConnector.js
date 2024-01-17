/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const assignDefaults = require('lodash/defaults');
const cloneDeep = require('lodash/cloneDeep');
const hasIn = require('lodash/hasIn');
const hasKey = require('lodash/has');

const constants = require('../constants');
const promiseUtil = require('../utils/promise');
const request = require('../utils/request');

/**
 * @module test/functional/shared/remoteHost/httpConnector
 *
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost").RemoteHost} RemoteHost
 * @typedef {import("../utils/request").RequestOptions} RequestOptions
 */

const DEFAULTS = Object.freeze({
    allowSelfSignedCert: !constants.HTTP_REQUEST.STRICT_SSL,
    continueOnErrorCode: false,
    expectedResponseCode: 200,
    includeResponseObject: false,
    json: false,
    method: 'GET',
    port: constants.HTTP_REQUEST.PORT,
    protocol: constants.HTTP_REQUEST.PROTOCOL,
    rawResponseBody: false
});

/**
 * HTTP Connector to RemoteHost
 *
 * @property {boolean} allowSelfSignedCert  - do not require SSL certificates be valid
 * @property {boolean} continueOnErrorCode - continue on non-successful response code
 * @property {Array<integer>|integer} expectedResponseCode - expected response code
 * @property {boolean} gzip - accept compressed content from the server
 * @property {Object<string, any>} headers - HTTP headers
 * @property {RemoteHost} host - remote host
 * @property {boolean} includeResponseObject - return [body, responseObject]
 * @property {boolean} json - sets HTTP body to JSON representation of value
 * @property {Logger} logger - logger
 * @property {string} method - HTTP method
 * @property {integer} port - HTTP port
 * @property {string} protocol - HTTP protocol
 * @property {string | URL} proxy - proxy URI or proxy config
 * @property {boolean} rawResponseBody - return response as Buffer object with binary data
 * @property {PromiseRetryOptions} retryOptions - retry options
 * @property {integer} timeout - milliseconds to wait for a socket timeout (option from 'request' library)
 */
class HTTPConnector {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {RequestOptions} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {PromiseRetryOptions} [options.retry] - retry options
     */
    constructor(host, options) {
        // need to add cloneDeep in case when DEFAULTS contains complex objects
        options = assignDefaults(
            Object.assign({}, options || {}),
            DEFAULTS
        );
        [
            'allowSelfSignedCert',
            'continueOnErrorCode',
            'gzip',
            'includeResponseObject',
            'json',
            'method',
            'port',
            'protocol',
            'rawResponseBody',
            'timeout'
        ].forEach((propName) => {
            if (hasKey(options, propName)) {
                Object.defineProperty(this, propName, {
                    value: options[propName]
                });
            }
        });
        // copy complex objects
        [
            'expectedResponseCode',
            'headers',
            'proxy'
        ].forEach((propName) => {
            if (hasKey(options, propName)) {
                const originVal = cloneDeep(options[propName]);
                Object.defineProperty(this, propName, {
                    get() { return cloneDeep(originVal); }
                });
            }
        });

        const retryOptions = Object.assign({}, options.retry || {});
        Object.defineProperties(this, {
            host: {
                value: host
            },
            retryOptions: {
                get() { return Object.assign({}, retryOptions); }
            }
        });
        this.logger = (options.logger || this.host.logger).getChild('http');
    }

    /**
     * Get defaults for options
     *
     * @returns {RequestOptions} defaults
     */
    defaults() {
        const defaults = {};
        [
            'allowSelfSignedCert',
            'continueOnErrorCode',
            'expectedResponseCode',
            'gzip',
            'headers',
            'includeResponseObject',
            'json',
            'logger',
            'method',
            'port',
            'protocol',
            'proxy',
            'rawResponseBody',
            'timeout'
        ].forEach((propName) => {
            if (hasKey(this, propName)) {
                defaults[propName] = this[propName];
            }
        });
        return defaults;
    }

    /**
     * Make HTTP request
     *
     * @param {RequestOptions} options - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise<any>} resolved once response received and processed
     */
    makeRequest(options) {
        options = Object.assign({}, options);
        const retryOpts = assignDefaults(
            Object.assign({}, options.retry || {}),
            this.retryOptions
        );
        delete options.retry;

        return promiseUtil.retry(() => new Promise((resolve, reject) => {
            options = assignDefaults(options, this.defaults());
            options.host = undefined;
            options.fullURI = undefined;

            request(this.host.host, options)
                .then(resolve, reject);
        }), retryOpts);
    }
}

/**
 * HTTP Connector Manager
 *
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {RequestOptions} options - SSH options
 * @property {PromiseRetryOptions} retryOptions - retry options
 */
class HTTPConnectorManager {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {RequestOptions} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {PromiseRetryOptions} [options.retry] - retry options
     */
    constructor(host, options) {
        options = assignDefaults(
            Object.assign({}, options || {}),
            DEFAULTS
        );
        const retryOptions = Object.assign({}, options.retry || {});
        delete options.retry;

        this.logger = (options.logger || this.host.logger);
        delete options.logger;

        options = cloneDeep(options);

        Object.defineProperties(this, {
            host: {
                value: host
            },
            retryOptions: {
                get() { return Object.assign({}, retryOptions); }
            },
            options: {
                get() { return Object.assign({}, options); }
            }
        });
    }

    /**
     * Create new HTTP Connector instance
     *
     * @param {RequestOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {HTTPConnector} instance
     */
    create(options) {
        return new HTTPConnector(this.host, assignDefaults(
            Object.assign({}, options || {}),
            Object.assign(this.options, {
                logger: this.logger,
                retry: this.retryOptions
            })
        ));
    }

    /**
     * Create new HTTP Connector instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {RequestOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {HTTPConnector} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign HTTPConnector to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Make HTTP request
     *
     * @param {RequestOptions} options - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise<any>} resolved once response received and processed
     */
    makeRequest(options) {
        return this.create().makeRequest(options);
    }
}

module.exports = {
    HTTPConnector,
    HTTPConnectorManager
};
