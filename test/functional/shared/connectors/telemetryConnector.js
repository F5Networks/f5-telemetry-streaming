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

const DEFAULT_NAMESPACE = require('../constants').TELEMETRY.NAMESPACE.DEFAULT;
const getArgByType = require('../utils/misc').getArgByType;
const URI_PREFIX = require('../constants').TELEMETRY.API.URI.PREFIX;

/**
 * @module test/functional/shared/connectors/telemetryConnector
 *
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("../remoteHost/icontrolConnector").IControlConnector} IControlConnector
 */

const PRIVATES = new WeakMap();

/**
 * Telemetry Streaming Connector
 *
 * @property {boolean} forceNamespace - force namespace usage even when default one
 * @property {IControlConnector} icontrol - iControl Connector
 * @property {string} namespace - Telemetry Streaming namespace
 */
class TelemetryStreamingConnector {
    /**
     * Constructor
     *
     * @param {IControlConnector} icontrol - iControl Connector
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {string} [options.namespace] - Telemetry Streaming namespace
     */
    constructor(icontrol, options) {
        Object.defineProperties(this, {
            forceNamespace: {
                value: !!options.forceNamespace || false
            },
            icontrol: {
                value: icontrol
            },
            namespace: {
                value: options.namespace || DEFAULT_NAMESPACE
            }
        });

        options = options || {};
        this.logger = (options.logger || this.icontrol.logger).getChild(`f5-telemetry@${this.namespace}`);

        PRIVATES.set(this, {
            parentLogger: options.logger || this.icontrol.logger
        });
    }

    /**
     * Build URI for request
     *
     * @param {string} uri - URI
     * @param {boolean} [ignoreNamespace = false] - ignore configured namespace
     *
     * @returns {string} URI
     */
    buildURI(uri, ignoreNamespace) {
        uri = uri[0] === '/' ? uri : `/${uri}`;
        if (!ignoreNamespace && (this.forceNamespace || this.namespace !== DEFAULT_NAMESPACE)) {
            uri = `/namespace/${this.namespace}${uri}`;
        }
        return `${URI_PREFIX}${uri}`;
    }

    /**
     * Post declaration
     *
     * @param {Object} declaration - declaration
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<Object>} resolved once declaration posted
     */
    declare(declaration, retry) {
        return this.icontrol.makeRequestWithAuth({
            body: declaration,
            json: true,
            method: 'POST',
            retry,
            uri: this.buildURI('declare')
        });
    }

    /**
     * Get declaration
     *
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<Object>} resolved once declaration received
     */
    getDeclaration(retry) {
        return this.icontrol.makeRequestWithAuth({
            method: 'GET',
            retry,
            uri: this.buildURI('declare')
        });
    }

    /**
     * Get iHealth Data
     *
     * @param {string} [system] - system
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<Object>} resolved once data received
     */
    getIHealthData(system, retry) {
        system = '';
        if (arguments.length > 0) {
            system = getArgByType(arguments, 'string', { defaultValue: system }).value;
            retry = getArgByType(arguments, 'object').value;
        }
        system = system ? `/${system}` : '';
        return this.icontrol.makeRequestWithAuth({
            method: 'GET',
            retry,
            uri: this.buildURI(`ihealthpoller${system}`)
        });
    }

    /**
     * Get data from pull consumer
     *
     * @param {string} consumer - consumer
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<Array<Object>>} resolved once data received
     */
    getPullConsumerData(consumer, retry) {
        return this.icontrol.makeRequestWithAuth({
            includeResponseObject: true,
            method: 'GET',
            retry,
            uri: this.buildURI(`pullconsumer/${consumer}`)
        });
    }

    /**
     * Get data from system poller
     *
     * @param {string} system - system
     * @param {string} [poller] - poller
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<Object>} resolved once data received
     */
    getSystemPollerData(system, poller, retry) {
        poller = '';
        if (arguments.length > 1) {
            poller = getArgByType(arguments, 'string', { fromIndex: 1, defaultValue: poller }).value;
            retry = getArgByType(arguments, 'object', { fromIndex: 1 }).value;
        }
        poller = poller ? `/${poller}` : '';
        return this.icontrol.makeRequestWithAuth({
            method: 'GET',
            retry,
            uri: this.buildURI(`systempoller/${system}${poller}`)
        });
    }

    /**
     * Check if f5-telemetry installed on BIG-IP
     *
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<boolean>} resolved with true when installed
     */
    installed(retry) {
        this.logger.info('Request to check f5-telemetry installation');
        return this.icontrol.makeRequestWithAuth({
            continueOnErrorCode: true,
            expectedResponseCode: [200],
            includeResponseObject: true,
            method: 'GET',
            retry,
            uri: this.buildURI('info', true)
        })
            .then((res) => res[1].statusCode === 200);
    }

    /**
     * Send test event to Event Listener
     *
     * @param {any} data - data
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<Object>} resolved once data posted
     */
    sendEvent(data, retry) {
        return this.icontrol.makeRequestWithAuth({
            body: data,
            json: typeof data !== 'string',
            method: 'POST',
            retry,
            uri: this.buildURI('eventlistener')
        });
    }

    /**
     * Get new instance of TelemetryStreamingConnector for 'namespace'
     *
     * @param {string} namespace - namespace
     * @param {boolean} [force = false] - force namespace usage even when default one
     *
     * @returns {TelemetryStreamingConnector} instance
     */
    toNamespace(namespace, force) {
        return new TelemetryStreamingConnector(this.icontrol, {
            forceNamespace: force,
            logger: PRIVATES.get(this).parentLogger,
            namespace
        });
    }

    /**
     * Get application version
     *
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<TSInfo>} resolved with version info
     */
    version(retry) {
        this.logger.info('Request to get f5-telemetry version ');
        return this.icontrol.makeRequestWithAuth({
            method: 'GET',
            retry,
            uri: this.buildURI('info', true)
        });
    }
}

module.exports = {
    TelemetryStreamingConnector
};

/**
 * @typedef TSInfo
 * @type {Object}
 * @property {string} nodeVersion - node.js version on a host
 * @property {string} version - Telemetry Streaming version
 * @property {string} release - Telemetry Streaming release number
 * @property {string} schemaCurrent - Telemetry Streaming schema current version
 * @property {string} schemaMinimum - Telemetry Streaming schema minimum supported version
 */
