/*
 * Copyright 2024. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable consistent-return, no-unused-expressions */

const filter = require('lodash/filter');
const find = require('lodash/find');
const groupBy = require('lodash/groupBy');
const path = require('path');

const assert = require('../utils/assert');
const CONFIG_CLASSES = require('../constants').CONFIG_CLASSES;
const configUtil = require('../utils/config');
const metadataUtil = require('../utils/metadata');
const miscUtil = require('../utils/misc');
const moduleLoader = require('../utils/moduleLoader').ModuleLoader;
const Service = require('../utils/service');
const tracerMgr = require('../tracerManager');

/**
 * @module consumers
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('./api').ConsumerCallback} ConsumerCallback
 * @typedef {import('../utils/config').Configuration} Configuration
 * @typedef {import('../utils/config').ConsumerComponent} ConsumerComponent
 * @typedef {import('../dataPipeline').DataEventCtxV1} DataEventCtxV1
 * @typedef {import('../dataPipeline').DataEventCtxV2} DataEventCtxV2
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('../utils/tracer').Tracer} Tracer
 */

const EE_NAMESPACE = 'consumers'; // namespace for global events
const ENTRY_FILE = 'index.js'; // plug-in's entry point

/**
 * Dummy function when 'tracer' not configured
 */
function dummyTracerWrite() {}

/**
 * Consumers Service Class
 *
 * @fires consumers.updated - aka 'consumers.change' as global event
 * @fires config.applied - aka 'consumers.done' as global event
 */
class ConsumersService extends Service {
    /** @param {string} [pluginsDir] - path to directory with plug-ins */
    constructor(pluginsDir = __dirname) {
        super();

        assert.string(pluginsDir, 'pluginsDir');

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            pluginsDir: {
                value: pluginsDir
            }
        });

        this._consumers = {};
        this._modules = {};
        this._supportedModules = [];
    }

    /** @returns {integer} number of active consumers */
    get numberOfConsumers() {
        return Object.keys(this._consumers).length;
    }

    /** @returns {integer} number of active consumer plug-ins */
    get numberOfModules() {
        return Object.keys(this._modules).length;
    }

    /** @returns {string[]} arary of recognized plug-ins */
    get supportedModules() {
        return this._supportedModules.slice();
    }

    /** @inheritdoc */
    async _onStart() {
        this._consumers = {};
        this._modules = {};
        this._supportedModules = [];

        this._registerEvents();

        await init.call(this);
    }

    /** @inheritdoc */
    async _onStop() {
        // stop receiving config updates
        this._configListener.off();
        this._configListener = null;

        await freeConsumers.call(this);
        await freeModules.call(this);
        await emitConsumersUpdate.call(this);

        // stop public events
        this._offMyEvents.off();
        this._offMyEvents = null;

        this._consumers = null;
        this._modules = null;
        this._supportedModules = null;
    }

    /** @param {ApplicationEvents} appEvents - global event emitter */
    initialize(appEvents) {
        // function to register subscribers
        this._registerEvents = () => {
            this._configListener = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
            this.logger.debug('Subscribed to Configuration updates.');

            this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
                { 'consumers.updated': 'change' },
                { 'config.applied': 'config.done' }
            ]);
        };
    }
}

/**
 * Free consumer instances
 *
 * Due `config` implementation there is no option like
 * partial update - e.g. to guess what property was updated and etc.
 * So, as first step all consumers should be removed first.
 * Exception is only situation when namespace was updated, then
 * only consumers that belong to that namespace should be removed
 *
 * @this ConsumersService
 *
 * @param {ConsumerComponent[]} consumers - configured consumers
 *
 * @returns {Promise} resolved once desired consumers freed
 */
function freeConsumers(consumers) {
    return Promise.resolve()
        .then(() => {
            consumers = consumers || [];
            // it might be empty if entire declaration was updated -> free all then
            const toKeep = filter(consumers, (consumerCfg) => consumerCfg.skipUpdate && consumerCfg.enable);
            const toRemove = filter(this._consumers, (consumerCtx) => typeof find(toKeep, ['id', consumerCtx.id]) === 'undefined');
            return Promise.all(toRemove.map((consumerCtx) => Promise.resolve()
                .then(() => {
                    this.logger.debug(`Freeing consumer "${consumerCtx.fullName}" (${consumerCtx.type})`);

                    delete this._consumers[consumerCtx.id];
                    return consumerCtx.v2 && Promise.resolve()
                        .then(() => consumerCtx.instanceCtx.onUnload())
                        .catch((err) => this.logger.exception(
                            `Uncaught exception on attemp to call ".onUnload()" method for consumer "${consumerCtx.fullName}" (${consumerCtx.type})`,
                            err
                        ))
                        .then(() => this._modules[consumerCtx.type].instanceCtx.deleteConsumer(consumerCtx.instanceCtx))
                        .catch((err) => this.logger.exception(
                            `Uncaught exception on attemp to call ".deleteConsumer()" method for consumer "${consumerCtx.fullName}" (${consumerCtx.type})`,
                            err
                        ));
                })
                .then(() => this.logger.debug(`Consumer "${consumerCtx.fullName}" (${consumerCtx.type}) freed!`))
                .catch((err) => this.logger.exception(`Uncaught exception on attemp to free consumer "${consumerCtx.fullName}" (${consumerCtx.type})`, err))));
        })
        .catch((err) => this.logger.exception('Uncaught exception on attemp to free consumers', err));
}

/**
 * Free consumer plug-ins
 *
 * @this ConsumersService
 *
 * @returns {Promise} resolved once desired consumers plug-ins freed
 */
function freeModules() {
    return Promise.resolve()
        .then(() => {
            const toRemove = filter(this._modules, (moduleCtx) => typeof find(this._consumers, ['type', moduleCtx.type]) === 'undefined');
            return Promise.all(toRemove.map((moduleCtx) => Promise.resolve()
                .then(() => {
                    this.logger.debug(`Unloading consumer plug-in "${moduleCtx.type}"`);

                    delete this._modules[moduleCtx.type];
                    return moduleCtx.v2 && moduleCtx.instanceCtx.onUnload();
                })
                .catch((err) => this.logger.exception(`Uncaught exception on attemp to call ".onUnload()" for plug-in "${moduleCtx.type}":`, err))
                .then(() => {
                    moduleLoader.unload(moduleCtx.path);
                    this.logger.debug(`Consumer plug-in "${moduleCtx.type}" freed!`);
                })));
        })
        .catch((err) => this.logger.exception('Uncaught exception on attemp to free consumer plug-ins', err));
}

/**
 * Initialize ConsumersService
 *
 * @this ConsumersService
 *
 * @returns {Promise} resolve once instance initialzied
 */
function init() {
    const supportedModules = [];
    // build allowed list of consumers
    return miscUtil.fs.readdir(this.pluginsDir)
        .then((content) => {
            const entryPoints = filter(content, (fdir) => !fdir.startsWith('.'))
                .map((fdir) => [fdir, path.join(this.pluginsDir, fdir, ENTRY_FILE)]);
            return Promise.all(entryPoints.map(([fdir, entryPoint]) => Promise.resolve()
                .then(() => miscUtil.fs.access(entryPoint)) // should use `mode`?
                .then(() => miscUtil.fs.stat(entryPoint))
                .then((stats) => {
                    if (stats.isFile()) {
                        supportedModules.push(fdir);
                    }
                })
                .catch((err) => this.logger.debugException(`Unable to access "${entryPoint}"`, err))));
        })
        .then(() => {
            supportedModules.sort((a, b) => {
                /* Storing case insensitive comparison */
                const comparison = a.toLowerCase().localeCompare(b.toLowerCase());
                /* If strings are equal in case insensitive comparison
                 * then return case sensitive comparison instead */
                return comparison === 0
                    ? a.localeCompare(b)
                    : comparison;
            });
            if (supportedModules.length > 0) {
                this.logger.info(`Following consumers detected: ${supportedModules.join(', ')}`);
            } else {
                this.logger.warning('No consumers plug-ins detected!');
            }
            this._supportedModules = supportedModules;
        });
}

/**
 * Load consumer instances
 *
 * @this ConsumersService
 *
 * @param {ConsumerComponent[]} consumers - configured consumers
 *
 * @returns {Promise} resolved once desired consumers loaded
 */
function loadConsumers(consumers) {
    return Promise.resolve()
        .then(() => {
            const toLoad = filter(consumers, (consumerCfg) => !consumerCfg.skipUpdate && consumerCfg.enable);
            return Promise.all(toLoad.map((consumerCfg) => Promise.resolve()
                .then(() => {
                    if (!this._supportedModules.includes(consumerCfg.type)) {
                        this.logger.warning(`Unable to initialize consumer "${consumerCfg.traceName}" (${consumerCfg.type}): plug-in "${consumerCfg.type}" does not exist!`);
                        return;
                    }
                    const moduleCtx = this._modules[consumerCfg.type];
                    if (typeof moduleCtx === 'undefined') {
                        this.logger.warning(`Unable to initialize consumer "${consumerCfg.traceName}" (${consumerCfg.type}): plug-in "${consumerCfg.type}" not loaded!`);
                        return;
                    }

                    this.logger.debug(`Initializing consumer "${consumerCfg.traceName}" (${consumerCfg.type})`);

                    const cconfig = {
                        fullName: consumerCfg.traceName,
                        id: consumerCfg.id,
                        logger: moduleCtx.logger.getChild(consumerCfg.traceName),
                        name: consumerCfg.name,
                        tracer: tracerMgr.fromConfig(consumerCfg.trace),
                        type: moduleCtx.type
                    };
                    if (moduleCtx.v2) {
                        cconfig.tracer = (cconfig.tracer && cconfig.tracer.write.bind(cconfig.tracer))
                            || dummyTracerWrite;
                    }

                    const getConsumerConfigCtx = () => Object.assign(
                        {}, cconfig, { config: miscUtil.deepCopy(consumerCfg) } // copy to avoid modifications
                    );

                    let instanceCtx = null;
                    let cmetadata = null;
                    let promise = Promise.resolve();

                    if (moduleCtx.v2) {
                        promise = promise.then(() => moduleCtx.instanceCtx.createConsumer(getConsumerConfigCtx()))
                            .then((ctx) => {
                                [
                                    'onData',
                                    'onLoad',
                                    'onUnload'
                                ].forEach((method) => {
                                    if (typeof ctx[method] !== 'function') {
                                        throw new Error(`Consumer plug-in instance "${moduleCtx.type}" has no required method "${method}"!`);
                                    }
                                });

                                instanceCtx = ctx;
                                return instanceCtx.onLoad(getConsumerConfigCtx());
                            });
                    } else {
                        promise = promise.then(() => metadataUtil.getInstanceMetadata(getConsumerConfigCtx()))
                            .then((metadata) => {
                                if (!miscUtil.isObjectEmpty(metadata)) {
                                    cmetadata = metadata;
                                }
                            });
                    }
                    return promise.then(() => {
                        const consumerCtx = Object.assign({}, cconfig, {
                            allowsPull: moduleCtx.v2
                                ? instanceCtx.allowsPull
                                : consumerCfg.class === CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                            allowsPush: moduleCtx.v2
                                ? instanceCtx.allowsPush
                                : consumerCfg.class === CONFIG_CLASSES.CONSUMER_CLASS_NAME,
                            class: consumerCfg.class,
                            config: miscUtil.deepCopy(consumerCfg),
                            consumer: moduleCtx.v2 ? instanceCtx.onData.bind(instanceCtx) : moduleCtx.module,
                            instanceCtx,
                            metadata: cmetadata,
                            v2: moduleCtx.v2
                        });
                        this._consumers[consumerCtx.id] = consumerCtx;
                        this.logger.debug(`Consumer "${consumerCtx.fullName}" (${consumerCtx.type}) initialized!`);
                    });
                })
                .catch((err) => this.logger.exception(`Uncaught exception on attempt to load consumer plug-in instance "${consumerCfg.traceName}" (${consumerCfg.type}):`, err))));
        })
        .catch((err) => this.logger.exception('Uncaught exception on attemp to load consumers', err));
}

/**
 * Load consumer plug-ins
 *
 * @this ConsumersService
 *
 * @param {ConsumerComponent[]} consumers - configured consumers
 *
 * @returns {Promise} resolved once desired consumers plug-ins loaded
 */
function loadModules(consumers) {
    return Promise.resolve()
        .then(() => {
            const toLoad = filter(
                Object.keys(
                    groupBy(
                        filter(consumers, (consumerCfg) => !consumerCfg.skipUpdate && consumerCfg.enable),
                        'type'
                    )
                ),
                (ctype) => typeof this._modules[ctype] === 'undefined'
            );
            return Promise.all(toLoad.map((ctype) => Promise.resolve()
                .then(() => {
                    if (!this._supportedModules.includes(ctype)) {
                        this.logger.warning(`Unable to load consumer plug-in "${ctype}": unknown type`);
                        return;
                    }
                    this.logger.debug(`Load consumer plug-in "${ctype}"`);

                    const cpath = path.join(this.pluginsDir, ctype);
                    const cmodule = moduleLoader.load(cpath);
                    if (cmodule === null) {
                        this.logger.warning(`Unable to load consumer plug-in "${ctype}": can't load "${cpath}" plug-in`);
                        return;
                    }

                    const mlogger = this.logger.getChild(ctype);
                    const v2 = typeof cmodule === 'object' && typeof cmodule.load === 'function';

                    let instanceCtx = null;
                    let promise = Promise.resolve();

                    const mconfig = {
                        logger: mlogger,
                        name: ctype,
                        path: cpath
                    };
                    const getModuleConfig = () => Object.assign({}, mconfig);

                    if (v2) {
                        promise = promise.then(() => cmodule.load(getModuleConfig()))
                            .then((ctx) => {
                                [
                                    'createConsumer',
                                    'deleteConsumer',
                                    'onLoad',
                                    'onUnload'
                                ].forEach((method) => {
                                    if (typeof ctx[method] !== 'function') {
                                        throw new Error(`Consumer plug-in "${ctype}" has no required method "${method}" (API v2)!`);
                                    }
                                });
                                instanceCtx = ctx;
                                return instanceCtx.onLoad(getModuleConfig());
                            });
                    } else if (typeof cmodule !== 'function') {
                        throw new Error(`Consumer plug-in "${ctype}" should export function (API v1)`);
                    }
                    return promise.then(() => {
                        this._modules[ctype] = {
                            instanceCtx,
                            logger: mlogger,
                            module: cmodule,
                            path: cpath,
                            type: ctype,
                            v2
                        };
                        this.logger.debug(`Consumer plug-in "${ctype}" loaded (API v${v2 ? 2 : 1})!`);
                    });
                })
                .catch((err) => {
                    this.logger.exception(`Uncaught exception on attempt to load consumer plug-in "${ctype}":`, err);
                    moduleLoader.unload(path.join(this.pluginsDir, ctype));
                })));
        })
        .catch((err) => this.logger.exception('Uncaught exception on attemp to load consumer plug-ins', err));
}

/**
 * @this ConsumersService
 *
 * @param {Configuration} config
 */
function onConfigEvent(config) {
    Promise.resolve()
        .then(() => {
            this.logger.verbose('Config "change" event');

            const consumers = configUtil.getTelemetryConsumers(config);
            consumers.push(...configUtil.getTelemetryPullConsumers(config));

            return Promise.resolve()
                .then(() => loadModules.call(this, consumers))
                .then(() => freeConsumers.call(this, consumers))
                .then(() => loadConsumers.call(this, consumers))
                .then(() => freeModules.call(this));
        })
        .catch((err) => {
            this.logger.exception('Error caught on attempt to apply configuration to Consumers Manager:', err);
        })
        .then(() => emitConsumersUpdate.call(this));
}

/**
 * Emits `consumers.updated` event
 *
 * @this ConsumersService
 */
function emitConsumersUpdate() {
    this.logger.info(`${this.numberOfConsumers} active consumer(s)`);
    this.logger.info(`${this.numberOfModules} consumer plug-in(s) loaded`);

    const consumers = Object.values(this._consumers);

    // notify subscribers once config applied
    this.ee.safeEmitAsync('consumers.updated', () => consumers.map((consumerCtx) => ({
        allowsPull: consumerCtx.allowsPull,
        allowsPush: consumerCtx.allowsPush,
        class: consumerCtx.class,
        config: consumerCtx.config, // TODO: remove later once data pipeline updated
        consumer: consumerCtx.consumer,
        fullName: consumerCtx.fullName,
        id: consumerCtx.id,
        logger: consumerCtx.logger, // TODO: remove later once all consumers updated
        metadata: consumerCtx.metadata, // TODO: remove later once all consumers updated
        name: consumerCtx.name,
        tracer: consumerCtx.tracer, // TODO: remove later once all consumers updated
        type: consumerCtx.type, // TODO: remove later once all consumers updated
        v2: consumerCtx.v2 // TODO: remove later once all consumers updated
    })));

    this.ee.safeEmitAsync('config.applied', {
        consumers: this.numberOfConsumers,
        modules: this.numberOfModules
    });
}

module.exports = ConsumersService;

/**
 * @typedef ConsumerCtx
 * @type {object}
 * @property {boolean} allowsPull - allows PULL events
 * @property {boolean} allowsPush - allows PUSH events
 * @property {'Telemetry_Consumer' | 'Telemetry_Pull_Consumer'} class // TODO: remove later once data pipeline updated
 * @property {configUtil.Configuration} config // TODO: remove later once data pipeline updated
 * @property {ConsumerHandlerV1 | ConsumerHandlerV2} consumer
 * @property {string} fullName
 * @property {string} id
 * @property {Logger} logger // TODO: remove later once all consumers updated
 * @property {null | object} metadata // TODO: remove later once all consumers updated
 * @property {string} name
 * @property {function} tracer // TODO: remove later once all consumers updated
 * @property {string} type // TODO: remove later once all consumers updated
 * @property {boolean} v2 // TODO: remove later once all consumers updated
 */
/**
 * @event consumers.updated
 * @type {GetConsumers}
 */
/**
 * @event config.applied
 * @type {object}
 * @property {integer} consumers - number of active consumers
 * @property {integer} modules - number of loaded modules
 */
/**
 * @callback ConsumerHandlerV1
 * @param {DataEventCtxV1} eventCtx
 */
/**
 * @callback ConsumerHandlerV2
 * @param {DataEventCtxV2 | DataEventCtxV2[]} dataCtx
 * @param {number} eventMask
 * @param {null | ConsumerCallback}
 */
/**
 * @callback GetConsumers
 *
 * @returns {function(): ConsumerCtx[]}
 */
