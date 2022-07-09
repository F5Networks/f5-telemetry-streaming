/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assignDefaults = require('lodash/defaults');
const hasIn = require('lodash/hasIn');

/**
 * @module test/functional/shared/remoteHost/icontrolConnector
 *
 * @typedef {import("./httpConnector").HTTPConnector} HTTPConnector
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost").RemoteHost} RemoteHost
 * @typedef {import("../utils/request").RequestOptions} RequestOptions
 */

const F5_AUTH_HEADER = 'x-f5-auth-token';
const IControlAuthRequiredError = {
    statusCode: 401,
    statusMessage: 'F5 Authorization Required'
};

const PRIVATES = new WeakMap();

/**
 * iControl HTTP Connector
 *
 * @property {string} authToken - current auth token
 * @property {Logger} logger - logger
 * @property {HTTPConnector} transport - HTTP transport
 * @property {string} username - username
 */
class IControlConnector {
    /**
     * Constructor
     *
     * @param {string} username - username
     * @param {string} passphrase - passphrase
     * @param {HTTPConnector} transport - transport
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - logger
     */
    constructor(username, passphrase, transport, options) {
        Object.defineProperties(this, {
            authToken: {
                get() { return PRIVATES.get(this).authToken; }
            },
            transport: {
                value: transport
            },
            username: {
                value: username
            }
        });

        options = options || {};
        this.logger = (options.logger || this.transport.logger).getChild(`iControl@${username}`);

        PRIVATES.set(this, {
            authToken: null,
            passphrase
        });
    }

    /**
     * Send simple 'echo' request to acquire auth token
     *
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once completed
     */
    echo(retry) {
        return this.makeRequestWithAuth({
            method: 'GET',
            retry,
            uri: '/mgmt/shared/echo'
        });
    }

    /**
     * Request auth token
     *
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise<string>} resolved with auth token
     */
    getAuthToken(retry) {
        // remove old auth token
        const headers = this.transport.headers || {};
        delete headers[F5_AUTH_HEADER];

        return this.makeRequest({
            body: {
                username: this.username,
                password: PRIVATES.get(this).passphrase,
                loginProviderName: 'tmos'
            },
            continueOnErrorCode: false,
            expectedResponseCode: 200,
            headers,
            includeResponseObject: false,
            json: true,
            method: 'POST',
            rawResponseBody: false,
            retry,
            uri: '/mgmt/shared/authn/login'
        })
            .then((data) => data.token.token);
    }

    /**
     * Make request to iControl
     *
     * Note: this method doesn't handle HTTP 401
     *
     * @param {RequestOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved with response according to options
     */
    makeRequest(options) {
        return this.transport.makeRequest(options || {});
    }

    /**
     * Make request using auth data
     *
     * Note: this method handles HTTP 401
     *
     * @param {RequestOptions} [options] - request options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved with response according to options
     */
    makeRequestWithAuth(options) {
        options = options || {};
        options.headers = options.headers || this.transport.headers || {};

        const originOptions = Object.assign({}, options);
        const originIncludeResponseObject = options.includeResponseObject;

        options.includeResponseObject = true;
        if (this.authToken) {
            options.headers[F5_AUTH_HEADER] = this.authToken;
        }

        return this.makeRequest(options)
            .then(
                (response) => ({ response }),
                (error) => ({ error })
            )
            .then((ret) => {
                if (ret.error) {
                    if (ret.error.statusCode !== IControlAuthRequiredError.statusCode) {
                        return Promise.reject(ret.error);
                    }
                } else if (ret.response[1].statusCode !== IControlAuthRequiredError.statusCode) {
                    return Promise.resolve(originIncludeResponseObject
                        ? ret.response
                        : ret.response[0]);
                }
                this.logger.info('Need to request/renew auth token');
                // time to request/renew auth token
                return this.getAuthToken()
                    .then((token) => {
                        this.logger.info('Got new auth token!');
                        PRIVATES.get(this).authToken = token;
                        originOptions.headers[F5_AUTH_HEADER] = token;
                        return this.makeRequest(originOptions);
                    });
            });
    }
}

/**
 * iControl Connector Manager
 *
 * @property {Logger} logger - logger
 * @property {HTTPConnector} transport - HTTP transport
 * @property {string} username
 */
class IControlConnectorManager {
    /**
     * Constructor
     *
     * @param {IControlConnectorManagerOptions} options - options
     * @param {HTTPConnector} options.transport - options
     * @param {Logger} [options.logger] - logger
     */
    constructor(options) {
        options = options || {};
        this.logger = (options.logger || options.transport.host.logger);

        Object.defineProperties(this, {
            transport: {
                value: options.transport
            },
            username: {
                value: options.username
            }
        });

        PRIVATES.set(this, {
            passphrase: options.passphrase
        });
    }

    /**
     * Create new iControl Connector instance
     *
     * @param {IControlConnectorManagerOptions} [options] - options
     *
     * @returns {IControlConnector} instance
     */
    create(options) {
        options = assignDefaults(
            Object.assign({}, options || {}),
            {
                passphrase: PRIVATES.get(this).passphrase,
                transport: this.transport,
                username: this.username
            }
        );
        return new IControlConnector(
            options.username,
            options.passphrase,
            options.transport,
            {
                logger: this.logger
            }
        );
    }

    /**
     * Create new iControl Connector instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {IControlConnectorManagerOptions} [options] - options
     *
     * @returns {IControlConnector} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign IControlConnector to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Send simple 'echo' request to check auth
     *
     * @param {IControlConnectorManagerOptions} icOpts - options
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once completed
     */
    echo(icOpts, retry) {
        return this.create(icOpts).echo(retry);
    }

    /**
     * Request auth token
     *
     * @param {IControlConnectorManagerOptions} icOpts - options
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once completed
     */
    getAuthToken(icOpts, retry) {
        return this.create(icOpts).getAuthToken(retry);
    }

    /**
     * Make request to iControl
     *
     * Note: this method doesn't handle HTTP 401
     *
     * @param {IControlConnectorManagerOptions} icOpts - options
     * @param {RequestOptions} [reqOpts] - options
     * @param {PromiseRetryOptions} [reqOpts.retry] - retry options
     *
     * @returns {Promise} resolved with response according to options
     */
    makeRequest(icOpts, reqOpts) {
        return this.create(icOpts).makeRequest(reqOpts);
    }

    /**
     * Make request using auth data
     *
     * Note: this method handles HTTP 401
     *
     * @param {IControlConnectorManagerOptions} icOpts - options
     * @param {RequestOptions} [reqOpts] - options
     * @param {PromiseRetryOptions} [reqOpts.retry] - retry options
     *
     * @returns {Promise} resolved with response according to options
     */
    makeRequestWithAuth(icOpts, reqOpts) {
        return this.create(icOpts).makeRequestWithAuth(reqOpts);
    }
}

module.exports = {
    IControlConnector,
    IControlConnectorManager
};

/**
 * @typedef IControlConnectorManagerOptions
 * @type {Object}
 * @property {string} [passphrase] - passphrase
 * @property {HTTPConnector} [transport] - transport
 * @property {string} [username] - username
 */
