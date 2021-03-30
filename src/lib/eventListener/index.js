/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const configUtil = require('../utils/config');
const configWorker = require('../config');
const constants = require('../constants');
const dataPipeline = require('../dataPipeline');
const logger = require('../logger');
const messageStream = require('./messageStream');
const normalize = require('../normalize');
const promiseUtil = require('../utils/promise');
const properties = require('../properties.json');
const stringify = require('../utils/misc').stringify;
const tracers = require('../utils/tracer');

/** @module EventListener */


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
        return promiseUtil.allSettled(this.getAll().map(receiver => receiver.destroy()))
            .then((ret) => {
                this.registered = {};
                return ret;
            });
    }

    /**
     * All registered receivers
     *
     * @returns {Array<Object>} registered receivers
     */
    getAll() {
        return Object.keys(this.registered).map(key => this.registered[key]);
    }

    /**
     * Get existing or create new MessageStream receiver
     *
     * @param {Number} port - port to listen on
     *
     * @returns {MessageStream} receiver
     */
    getMessageStream(port) {
        if (!this.registered[port]) {
            this.registered[port] = new messageStream.MessageStream(port, { logger: logger.getChild(`messageStream:${port}`) });
        }
        return this.registered[port];
    }

    /**
     * Start all available instances
     *
     * @returns {Promise} resolved once all instances started
     */
    start() {
        const receivers = [];
        Object.keys(this.registered).forEach((port) => {
            const receiver = this.registered[port];
            if (receiver.hasListeners('messages') && !receiver.isRunning()) {
                receivers.push(receiver);
            }
        });
        return promiseUtil.allSettled(
            receivers.map(r => r.restart({ attempts: 10 }) // without delay for now (REST API is sync)
                .catch(err => r.stop() // stop to avoid resources leaking
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
        Object.keys(this.registered).forEach((port) => {
            const receiver = this.registered[port];
            if (!receiver.hasListeners('messages')) {
                delete this.registered[port];
                if (!receiver.isDestroyed()) {
                    receivers.push(receiver);
                }
            }
        });
        return promiseUtil.allSettled(receivers.map(r => r.destroy()
            .catch(destroyErr => r.logger.exception('unable to stop and destroy receiver', destroyErr))));
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
        this.callback = messages => this.onMessagesHandler(messages);
        this.updateConfig(options);
    }

    attachMessageStream(ms) {
        if (this.messageStream) {
            throw new Error('Message Stream attached already!');
        }
        this.messageStream = ms;
        this.messageStream.on('messages', this.callback);
    }

    detachMessageStream() {
        if (this.messageStream) {
            this.messageStream.removeListener('messages', this.callback);
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
                const p = dataPipeline.process(dataCtx, { tracer: this.tracer, actions: this.actions })
                    .catch(err => this.logger.exception('EventListener:_processEvents unexpected error from dataPipeline:process', err));
                promises.push(p);
            }
        });
        return promiseUtil.allSettled(promises);
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
        this.tracer = config.tracer;
        this.tags = config.tags;
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
EventListener.get = function (name, port) {
    if (!EventListener.instances[name]) {
        EventListener.instances[name] = new EventListener(name);
    }
    const listener = EventListener.instances[name];
    listener.detachMessageStream();
    listener.attachMessageStream(EventListener.receiversManager.getMessageStream(port));
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
    return Object.keys(EventListener.instances).map(key => EventListener.instances[key]);
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
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in eventListener'); // helpful debug
    const configuredListeners = configUtil.getTelemetryListeners(config);

    // stop all removed listeners
    EventListener.getAll().forEach((listener) => {
        const configMatch = configuredListeners.find(n => n.traceName === listener.name);
        if (!configMatch) {
            logger.debug(`Removing event listener - ${listener.name} [port = ${listener.port}]. Reason - removed from configuration.`);
            EventListener.remove(listener);
        }
    });
    // stop all disabled listeners and those that have port updated
    configuredListeners.forEach((listenerConfig) => {
        const listener = EventListener.getByName(listenerConfig.traceName);
        if (listener && listenerConfig.enable === false) {
            logger.debug(`Removing event listener - ${listener.name} [port = ${listener.port}]. Reason - removed from configuration. Reason - disabled.`);
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

        const listener = EventListener.get(name, port);
        listener.updateConfig({
            actions: listenerConfig.actions,
            destinationIds: configUtil.getReceivers(config, listenerConfig).map(r => r.id),
            filterFunc: buildFilterFunc(listenerConfig),
            id: listenerConfig.id,
            tags: listenerConfig.tag,
            tracer: tracers.fromConfig(listenerConfig)
        });
    });

    return EventListener.receiversManager.stopAndRemoveInactive()
        .then(() => EventListener.receiversManager.start())
        .then(() => logger.debug(`${EventListener.getAll().length} event listener(s) listening`))
        .catch(err => logger.exception('Unable to start some (or all) of the event listeners', err));
});

function sendShutdownEvent() {
    EventListener.getAll().map(EventListener.remove);
    EventListener.receiversManager.destroyAll().then(() => logger.info('All Event Listeners and Data Receivers destroyed'));
}
process.on('SIGINT', sendShutdownEvent);
process.on('SIGTERM', sendShutdownEvent);
process.on('SIGHUP', sendShutdownEvent);

module.exports = EventListener;
