/*
 * Copyright 2024. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * @module  consumers/api
 *
 * @typedef {import('../utils/config').ConsumerComponent} ConsumerComponent
 * @typedef {import('../dataPipeline').DataEventCtxV2} DataCtx
 * @typedef {import('../logger').Logger} Logger
 */

const NotImplementedError = require('../errors').NotImplementedError;

// TODO: update type imports

const PULL_EVENT = 1;
const PUSH_EVENT = 2;

/**
 * Telemetry Streaming Consumer Interface
 *
 * NOTE:
 * - when both `allowsPull` and `allowsPush` return `true` then Telemetry Streaming
 *   assumes that accepts data as regular `push` consumer and returns cached data on `pull` event
 *
 * @interface
 *
 * @property {string} id - unique ID
 * @property {Logger} logger - instance of Logger
 * @property {ConsumerComponent} originConfig - COPY of original config component
 * @property {string} name - config name
 * @property {string} serviceName - service name
 * @property {string} traceID - trace name from TS declaration
 * @property {Tracer} tracer - Tracer instance
 * @property {Tracer} writeTraceData - writes data to tracer if configured
 */
class ConsumerInterface {
    /**
     * @public
     * @returns {boolean} true if consumer supports 'PULL' method for data
     */
    get allowsPull() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {boolean} true if consumer supports 'PUSH' method for data
     */
    get allowsPush() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {string} unique ID
     */
    get id() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {Logger} instance
     */
    get logger() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {ConsumerComponent} COPY of original config component
     */
    get originConfig() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {string} config name
     */
    get name() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {string} service name
     */
    get serviceName() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {string} trace name from config
     */
    get traceID() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {function} writes data to tracer if configured
     */
    get writeTraceData() {
        throw new NotImplementedError();
    }

    /**
     * Method called when Telemetry Streaming has data ready for processing.
     *
     * Note:
     * - instance is responsible to stop data processing once `.onUnload()` invoked
     * - instance is responsible to catch all errors
     * - for pull consumers 'dataCtx' is array
     *
     * @public
     * @param {DataCtx | DataCtx[]} dataCtx - data context
     * @param {number} emask - event mask
     * @param {null | ConsumerCallback} [callback] - callback to call once data sent or processed
     */
    onData() {
        throw new NotImplementedError();
    }

    /**
     * Method called when Telemetry Streaming need to pass configuration to Consumer instance.
     * Method might be useful to establish connection or etc.
     *
     * @public
     * @param {ConsumerConfig} config - original configuration component
     *
     * @returns {Promise} resolved once instance loaded
     */
    onLoad() {
        throw new NotImplementedError();
    }

    /**
     * Method called before Telemetry Streaming need to stop and remove Consumer instance.
     * Method might be useful to close and cleanup resources and etc.
     *
     * Note: no more data will be passed to 'onData' once this invoked.
     *
     * @public
     * @returns {Promise} resolved once instance unloaded
     */
    onUnload() {
        throw new NotImplementedError();
    }
}

/**
 * Telemetry Streaming Consumer Module Interface
 *
 * @interface
 *
 * @property {Logger} logger - instance of Logger
 * @property {string} name - module name
 * @property {string} path - module path
 */
class ConsumerModuleInterface {
    /**
     * @public
     * @returns {Logger} instance
     */
    get logger() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {string} module name
     */
    get name() {
        throw new NotImplementedError();
    }

    /**
     * @public
     * @returns {string} module path
     */
    get path() {
        throw new NotImplementedError();
    }

    /**
     * Method called when Telemetry Streaming needs to create new Consumer instance according to a declaration.
     * Consumer instance should implement `ConsumerInterface` protocol.
     *
     * @public
     * @param {ConsumerConfig} config - original configuration component
     *
     * @returns {Promise<ConsumerInterface>} resolved with instance of ConsumerInterface
     */
    createConsumer() {
        throw new NotImplementedError();
    }

    /**
     * Method called when Telemetry Streaming needs to delete existing Consumer instance according to a declaration.
     *
     * @public
     * @param {ConsumerInterface} instance
     * @param {Error} [error] - error caught on attempt to call ConsumerInterface.prototype.onUnload
     *
     * @returns {Promise} resolve once ConsumerInterface instance deleted
     */
    deleteConsumer() {
        throw new NotImplementedError();
    }

    /**
     * Method called when Telemetry Streaming needs to load Consumer module.
     * Method might be useful to make call to some slow API to cache result and etc.
     *
     * @public
     * @param {ModuleConfig} config - module config
     *
     * @returns {Promise} resolved once module loaded
     */
    onLoad() {
        throw new NotImplementedError();
    }

    /**
     * Method called when Telemetry Streaming needs to unload Consumer module because no Consumers
     * of such type left in a declaration. Method might be useful to cleanup cached results.
     * Next time when Telemetry Streaming found Consumer(s) of such type in a declaration
     * it will call `ConsumerModuleInterface.prototype.onLoad()`
     *
     * @public
     * @returns {Promise} resolved once module unloaded
     */
    onUnload() {
        throw new NotImplementedError();
    }
}

/**
 * Telemetry Streaming Consumer
 *
 * @implements {ConsumerInterface}
 */
class Consumer extends ConsumerInterface {
    /**
     * Method called when Telemetry Streaming has data ready for processing.
     *
     * Note:
     * - instance is responsible to stop data processing once `.onUnload()` invoked
     * - instance is responsible to catch all errors
     * - for pull consumers 'dataCtx' is array
     *
     * @public
     * @param {DataCtx | DataCtx[]} dataCtx - data context
     * @param {number} emask - event mask
     * @param {null | ConsumerCallback} [callback] - callback to call once data sent or processed
     */
    onData() {}

    /**
     * Method called when Telemetry Streaming need to pass configuration to Consumer instance.
     * Method might be useful to establish connection or etc.
     *
     * @public
     * @param {ConsumerConfig} config - copy of original configuration component
     *
     * @returns {Promise} resolved once instance loaded/initialized
     */
    onLoad(config) {
        return new Promise((resolve) => {
            /**
             * all properties below are read-only
             */
            Object.defineProperties(this, {
                id: {
                    value: config.id
                },
                logger: {
                    value: config.logger
                },
                name: {
                    value: config.name
                },
                originConfig: {
                    value: config.config
                },
                serviceName: {
                    value: config.type
                },
                traceID: {
                    value: config.fullName
                },
                writeTraceData: {
                    value: config.tracer
                }
            });

            this.logger.debug('Basic initialization - done!');
            resolve();
        });
    }

    /**
     * Method called before Telemetry Streaming need to stop and remove Consumer instance.
     * Method might be useful to close and cleanup resources and etc.
     *
     * Note:
     * - no more data will be passed to 'onData' once this invoked.
     * - run cleanup actions when all pending data was processed only
     *   otherwise it may lead to some errors e.g. connection closed earlier
     *   then data was sent
     *
     * @public
     * @returns {Promise} resolved once instance unloaded/de-initialized
     */
    onUnload() {
        return new Promise((resolve) => {
            this.logger.debug('Unloading instance');
            resolve();
        });
    }
}

/**
 * Telemetry Streaming Consumer Module
 *
 * @implements {ConsumerModuleInterface}
 */
class ConsumerModule extends ConsumerModuleInterface {
    /**
     * Method called when Telemetry Streaming needs to create new Consumer instance according to a declaration.
     * Consumer instance should implement `ConsumerInterface` protocol.
     *
     * @public
     * @param {ConsumerConfig} config - original configuration component
     *
     * @returns {Promise<ConsumerInterface>} resolved with instance of ConsumerInterface
     */
    createConsumer() {
        return Promise.resolve(new Consumer());
    }

    /**
     * Method called when Telemetry Streaming needs to delete existing Consumer instance according to a declaration.
     *
     * @public
     * @param {ConsumerInterface} instance
     * @param {Error} [error] - error caught on attempt to call ConsumerInterface.prototype.onUnload
     *
     * @returns {Promise} resolve once ConsumerInterface instance deleted
     */
    deleteConsumer() {
        return Promise.resolve();
    }

    /**
     * Method called when Telemetry Streaming needs to load Consumer module.
     * Method might be useful to make call to some slow API to cache result and etc.
     *
     * @public
     * @param {ModuleConfig} config - module config
     *
     * @returns {Promise} resolved once module loaded
     */
    onLoad({ logger, name, path }) {
        return new Promise((resolve) => {
            Object.defineProperties(this, {
                logger: {
                    value: logger
                },
                name: {
                    value: name
                },
                path: {
                    value: path
                }
            });

            this.logger.debug('Basic initialization - done!');
            resolve();
        });
    }

    /**
     * Method called when Telemetry Streaming needs to unload Consumer module because no Consumers
     * of such type left in a declaration. Method might be useful to cleanup cached results.
     * Next time when Telemetry Streaming found Consumer(s) of such type in a declaration
     * it will call `ConsumerModuleInterface.prototype.onLoad()`
     *
     * @public
     * @returns {Promise} resolved once module unloaded
     */
    onUnload() {
        return Promise.resolve();
    }
}

module.exports = {
    Consumer,
    ConsumerInterface,
    ConsumerModule,
    ConsumerModuleInterface,
    PULL_EVENT,
    PUSH_EVENT
};

/**
 * @callback ConsumerCallback
 * @param {null | object} error - processing error
 * @param {null | object} data - processed data (optional)
 */
/**
 * @typedef ConsumerConfig
 * @type {object}
 * @property {ConsumerComponent} config - consumer's configuration
 * @property {string} fullName - consumer's full name
 * @property {string} id - consumer's id
 * @property {Logger} logger - logger
 * @property {string} name - consumer's name
 * @property {function} tracer
 * @property {string} type - consumer module type
 */
/**
 * @typedef ModuleConfig
 * @type {object}
 * @property {Logger} logger - logger
 * @property {string} name - module name
 * @property {string} path - module path
 */
