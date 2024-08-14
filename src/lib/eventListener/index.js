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

const configUtil = require('../utils/config');
const constants = require('../constants');
const dataPipeline = require('../dataPipeline');
const hrtimestamp = require('../utils/datetime').hrtimestamp;
const logger = require('../logger').getChild('eventListener');
const normalize = require('../normalize');
const onApplicationExit = require('../utils/misc').onApplicationExit;
const promiseUtil = require('../utils/promise');
const properties = require('../properties.json');
const StreamService = require('./streamService');
const stringify = require('../utils/misc').stringify;
const tracerMgr = require('../tracerManager');

/**
 * @module EventListener
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 */

const normalizationOpts = {
    global: properties.global,
    events: properties.events,
    definitions: properties.definitions
};

/**
 * Create function to filter events by pattern defined in config
 *
 * @param {Object} config       - listener's config
 * @param {String} config.match - pattern to filter data
 *
 * @returns {Function(Object)} function to filter data, returns boolean value if data matches
 */
function buildFilterFunc(config) {
    if (!config.match || !normalizationOpts.events.classifyByKeys) {
        return null;
    }
    const pattern = new RegExp(config.match, 'i');
    const props = normalizationOpts.events.classifyByKeys;
    logger.debug(`Building events filter function with following params: pattern=${pattern} properties=${stringify(props)}`);

    return function (data) {
        for (let i = 0; i < props.length; i += 1) {
            const val = data[props[i]];
            if (val && pattern.test(val)) {
                return true;
            }
        }
        return false;
    };
}

/**
 * Data Receivers Manager
 *
 * @property {Object} registered - registered receivers
 */
class ReceiversManager {
    constructor() {
        this.registered = {};
    }

    /**
     * Destroy all receivers
     *
     * @returns {Promise} resolved once all receivers destroyed
     */
    destroyAll() {
        return promiseUtil.allSettled(this.getAll().map((receiver) => receiver.destroy()))
            .then((ret) => {
                this.registered = {};
                return ret;
            });
    }

    disableIngress() {
        Object.keys(this.registered).forEach((key) => this.registered[key].disableDataFlow());
    }

    enableIngress() {
        Object.keys(this.registered).forEach((key) => this.registered[key].enableDataFlow());
    }

    /**
     * All registered receivers
     *
     * @returns {Array<Object>} registered receivers
     */
    getAll() {
        return Object.keys(this.registered).map((key) => this.registered[key]);
    }

    /**
     * Get existing or create new MessageStream receiver
     *
     * @param {Number} port - port to listen on
     *
     * @returns {MessageStream} receiver
     */
    getMessageStream(port, parsingMode, bufferingStrategy) {
        const key = `${port}-${parsingMode}-${bufferingStrategy}`;
        if (!this.registered[key]) {
            this.registered[key] = new StreamService(port, {
                bufferingStrategy,
                logger: logger.getChild(`messageStream:${port}`),
                parsingMode
            });
        }
        return this.registered[key];
    }

    /**
     * Start all available instances
     *
     * @returns {Promise} resolved once all instances started
     */
    start() {
        const receivers = [];
        Object.keys(this.registered).forEach((key) => {
            const receiver = this.registered[key];
            if (receiver.ee.hasListeners('messages') && !receiver.isRunning()) {
                receivers.push(receiver);
            }
            if (receiver.ee.hasListeners('rawData')) {
                receiver.enableRawDataForwarding();
            } else {
                receiver.disableRawDataForwarding();
            }
        });
        return promiseUtil.allSettled(
            receivers.map((r) => r.restart({ attempts: 10 }) // without delay for now (REST API is sync)
                .catch((err) => r.stop() // stop to avoid resources leaking
                    .then(() => Promise.reject(err))))
        )
            .then(promiseUtil.getValues);
    }

    /**
     * Stop all inactive instances
     *
     * @returns {Promise} resolved once all inactive instances stopped
     */
    stopAndRemoveInactive() {
        const receivers = [];
        Object.keys(this.registered).forEach((key) => {
            const receiver = this.registered[key];
            if (!receiver.ee.hasListeners('messages')) {
                delete this.registered[key];
                if (!receiver.isDestroyed()) {
                    receivers.push(receiver);
                }
            }
        });
        return promiseUtil.allSettled(receivers.map((r) => r.destroy()
            .catch((destroyErr) => r.logger.exception('unable to stop and destroy receiver', destroyErr))));
    }
}

/**
 * Event Listener Class
 */
class EventListener {
    /**
     * Constructor
     *
     * @param {String} name - listener's name
     * @param {Object} [options = {}] - additional configuration options
     * @param {Array} [options.actions] - list of actions to apply to the event data
     * @param {Array<String>} [options.destinationIds] - data destination IDs
     * @param {Function} [options.filterFunc] - function to filter events
     * @param {String} [options.id] - config unique ID
     * @param {Object} [options.tags] - tags to add to the event data
     * @param {module:util~Tracer} [options.tracer] - tracer
     *
     * @returns {Object} Returns EventListener object
     */
    constructor(name, options) {
        this.name = name;
        this.logger = logger.getChild(this.name);
        this.dataCallback = this.onMessagesHandler.bind(this);
        this.rawDataCallback = this.onRawDataHandler.bind(this);
        this.updateConfig(options);
    }

    /**
     * @param {messageStream} ms - message stream to attach
     *
     * @returns {void} once message stream attached to event listener
     */
    attachMessageStream(ms) {
        if (this.messageStream) {
            throw new Error('Message Stream attached already!');
        }
        this.messageStream = ms;
        this.messageStream.ee.on('messages', this.dataCallback);
    }

    /**
     * @returns {void} once message stream detached from event listener
     */
    detachMessageStream() {
        if (this.messageStream) {
            this.messageStream.ee.removeListener('messages', this.dataCallback);
            this.messageStream.ee.removeListener('rawData', this.rawDataCallback);
            this.messageStream = null;
        }
    }

    /**
     * Process events
     *
     * @param {Array<String>} newMessages - events
     *
     * @returns {Promise} resolved once all events processed
     */
    onMessagesHandler(newMessages) {
        // normalize and send to data pipeline
        // note: addKeysByTag uses regex for default tags parsing (tenant/app)
        const options = {
            renameKeysByPattern: normalizationOpts.global.renameKeys,
            addKeysByTag: {
                tags: this.tags,
                definitions: normalizationOpts.definitions,
                opts: {
                    classifyByKeys: normalizationOpts.events.classifyByKeys
                }
            },
            formatTimestamps: normalizationOpts.global.formatTimestamps.keys,
            classifyEventByKeys: normalizationOpts.events.classifyCategoryByKeys,
            addTimestampForCategories: normalizationOpts.events.addTimestampForCategories
        };
        const promises = [];

        newMessages.forEach((event) => {
            event = event.trim();
            if (event.length === 0) {
                return;
            }
            const normalizedData = normalize.event(event, options);
            if (!this.filterFunc || this.filterFunc(normalizedData)) {
                const dataCtx = {
                    data: normalizedData,
                    type: normalizedData.telemetryEventCategory || constants.EVENT_TYPES.EVENT_LISTENER,
                    sourceId: this.id,
                    destinationIds: this.destinationIds
                };
                const p = dataPipeline.process(
                    dataCtx,
                    constants.DATA_PIPELINE.PUSH_EVENT,
                    null,
                    { tracer: this.tracer, actions: this.actions }
                )
                    .catch((err) => this.logger.exception('EventListener:_processEvents unexpected error from dataPipeline:process', err));
                promises.push(p);
            }
        });
        return promiseUtil.allSettled(promises);
    }

    /**
     * @param {RawDataObject} rawData - raw data
     */
    onRawDataHandler(data) {
        if (this.inputTracer) {
            data = Object.assign({}, data);
            data.data = data.data.toString('hex');
            this.inputTracer.write(data);
        }
    }

    /**
     * Update listener's configuration - tracer, tags, actions and etc.
     *
     * @param {Object} [config = {}] - config
     * @param {Array} [config.actions] - list of actions to apply to the event data
     * @param {Array<String>} [config.destinationIds] - data destination IDs
     * @param {Function} [config.filterFunc] - function to filter events
     * @param {String} [config.id] - config unique ID
     * @param {Object} [config.tags] - tags to add to the event data
     * @param {module:util~Tracer} [config.tracer] - tracer
     *
     * @returns {void}
     */
    updateConfig(config) {
        config = config || {};
        this.actions = config.actions;
        this.destinationIds = config.destinationIds;
        this.filterFunc = config.filterFunc;
        this.id = config.id;
        this.inputTracer = config.inputTracer;
        this.tracer = config.tracer;
        this.tags = config.tags;
    }

    /**
     * @returns {void} once event listener enabled/disabled raw data handling
     */
    updateRawDataHandling() {
        const isRegistered = this.messageStream.ee.listeners('rawData').indexOf(this.rawDataCallback) !== -1;
        if (this.inputTracer) {
            if (!isRegistered) {
                this.logger.debug('Enabling input tracing');
                this.messageStream.ee.on('rawData', this.rawDataCallback);
            }
        } else if (isRegistered) {
            this.logger.debug('Disabling input tracing');
            this.messageStream.ee.removeListener('rawData', this.rawDataCallback);
        }
    }
}

/**
 * Instance to manage data receivers
 */
EventListener.receiversManager = new ReceiversManager();

/**
 * All created instances
 */
EventListener.instances = {};

/**
 * Create new Event Listener
 *
 * @see EventListener
 *
 * @returns {EventListener} event listener instance
 */
EventListener.get = function (name, port, parsingMode, bufferingStrategy) {
    if (!EventListener.instances[name]) {
        EventListener.instances[name] = new EventListener(name);
    }
    const listener = EventListener.instances[name];
    listener.detachMessageStream();
    listener.attachMessageStream(EventListener.receiversManager.getMessageStream(port, parsingMode, bufferingStrategy));
    return listener;
};

/**
 * Return Event Listener
 *
 * @returns {EventListener} event listener instance
 */
EventListener.getByName = function (name) {
    return EventListener.instances[name];
};

/**
 * Returns current listeners
 *
 * @returns {Array<EventListener>} current listeners
 */
EventListener.getAll = function () {
    return Object.keys(EventListener.instances).map((key) => EventListener.instances[key]);
};

/**
 * Stop and remove listener
 *
 * @param {EventListener} listener - event listener to remove
 *
 * @returns {Promise} resolved once listener removed
 */
EventListener.remove = function (listener) {
    listener.detachMessageStream();
    delete EventListener.instances[listener.name];
};

// config worker change event
function onConfigChange(config) {
    Promise.resolve()
        .then(() => {
            logger.debug('configWorker change event in eventListener'); // helpful debug
            const configuredListeners = configUtil.getTelemetryListeners(config);
            const controls = configUtil.getTelemetryControls(config);

            // stop all removed listeners
            EventListener.getAll().forEach((listener) => {
                const configMatch = configuredListeners.find((n) => n.traceName === listener.name);
                if (!configMatch) {
                    logger.debug(`Removing event listener - ${listener.name} [port = ${listener.messageStream.port}]. Reason - removed from configuration.`);
                    EventListener.remove(listener);
                }
            });
            // stop all disabled listeners
            configuredListeners.forEach((listenerConfig) => {
                const listener = EventListener.getByName(listenerConfig.traceName);
                if (listener && listenerConfig.enable === false) {
                    logger.debug(`Removing event listener - ${listener.name} [port = ${listener.port}]. Reason - disabled.`);
                    EventListener.remove(listener);
                }
            });

            configuredListeners.forEach((listenerConfig) => {
                if (listenerConfig.skipUpdate || listenerConfig.enable === false) {
                    return;
                }
                // use name (prefixed if namespace is present)
                const name = listenerConfig.traceName;
                const port = listenerConfig.port;

                const msgPrefix = EventListener.getByName(name) ? 'Updating event' : 'Creating new event';
                logger.debug(`${msgPrefix} listener - ${name} [port = ${port}]`);

                const listener = EventListener.get(name, port, controls.listenerMode || 'buffer', controls.listenerStrategy || 'ring');
                listener.updateConfig({
                    actions: listenerConfig.actions,
                    destinationIds: configUtil.getReceivers(config, listenerConfig).map((r) => r.id),
                    filterFunc: buildFilterFunc(listenerConfig),
                    id: listenerConfig.id,
                    tags: listenerConfig.tag,
                    tracer: tracerMgr.fromConfig(listenerConfig.trace),
                    inputTracer: tracerMgr.fromConfig(listenerConfig.traceInput)
                });
                listener.updateRawDataHandling();
            });

            return EventListener.receiversManager.stopAndRemoveInactive()
                .then(() => EventListener.receiversManager.start())
                .then(() => logger.debug(`${EventListener.getAll().length} event listener(s) listening`))
                .catch((err) => logger.exception('Unable to start some (or all) of the event listeners', err));
        });
}

onApplicationExit(() => {
    EventListener.getAll().map(EventListener.remove);
    EventListener.receiversManager.destroyAll().then(() => logger.info('All Event Listeners and Data Receivers destroyed'));
});

/**
 * TEMP BLOCK OF CODE, REMOVE AFTER REFACTORING
 */
const processingState = {
    enabled: true,
    promise: Promise.resolve(),
    timestamp: hrtimestamp()
};

/** @param {ApplicationEvents} appEvents - application events */
EventListener.initialize = function initialize(appEvents) {
    appEvents.on('config.change', onConfigChange);
    logger.debug('Subscribed to Configuration updates.');

    appEvents.on('resmon.pstate', (makePState) => makePState(
        // on enable
        () => updateProcessingState(true),
        // on disable
        () => updateProcessingState(false)
    ));
    logger.debug('Subscribed to Resource Monitor updates.');
};

function updateProcessingState(processingEnabledNew) {
    const updateTs = hrtimestamp();
    processingState.timestamp = updateTs;
    processingState.promise = processingState.promise
        .then(() => {
            if (processingState.timestamp !== updateTs || processingState.enabled === processingEnabledNew) {
                // too late or same state
                return;
            }
            processingState.enabled = processingEnabledNew;
            if (processingState.enabled) {
                logger.warning('Restriction ceased.');
                EventListener.receiversManager.enableIngress();
            } else {
                logger.warning('Applying restrictions to incomming data.');
                EventListener.receiversManager.disableIngress();
            }
        })
        .catch((error) => logger.exception(`Unexpected error on attempt to ${processingEnabledNew ? 'enable' : 'disable'} event listeners:`, error));
}

/**
 * Check if systemPoller(s) are running
 * Toggled by monitor checks
 *
 * @returns {Boolean} - whether or not processing is enabled
 */

EventListener.isEnabled = function isEnabled() {
    return processingState.enabled;
};

/**
 * TEMP BLOCK OF CODE END
 */

module.exports = EventListener;
