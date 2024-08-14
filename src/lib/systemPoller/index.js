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

/* eslint-disable no-continue, no-nested-ternary, no-restricted-syntax, no-use-before-define */

const assert = require('../utils/assert');
const constants = require('../constants');
const errors = require('../errors');
const Poller = require('./poller');
const promiseUtil = require('../utils/promise');
const Service = require('../utils/service');
const util = require('../utils/misc');
// TODO: remove once dataPipeline updated
const dataPipeline = require('../dataPipeline');

// TODO: use tracer to dump pollers stats for debugging

const PRIVATES = new WeakMap();

/**
 * @module systemPoller
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../utils/config').Configuration} Configuration
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('./poller').OnReportCallback} OnReportCallback
 * @typedef {import('./poller').Poller} Poller
 * @typedef {import('./poller').PollerInfo} PollerInfo
 * @typedef {import('../restAPI').Register} RegisterRestApiHandler
 * @typedef {import('../restAPI').Config} RestApiConfig
 * @typedef {import('../restAPI').RequestHandler} RestApiHandler
 * @typedef {import('./poller').StatsReport} StatsReport
 * @typedef {import('../utils/config').SystemPollerComponent} SystemPollerComponent
 */

const EE_NAMESPACE = 'systemPoller';

/**
 * System Poller Service Class
 */
class SystemPollerService extends Service {
    /** @inheritdoc */
    async _onStart() {
        /** @type {Map<Poller, Record>} */
        this._byPoller = new Map();

        /** @type {Object<string, string>} */
        this._hash2id = {};

        /** @type {Object<string, string>} */
        this._id2hash = {};

        this._pstate = null;

        // start listening for events
        this._registerEvents();
    }

    /** @inheritdoc */
    async _onStop() {
        // stop receiving config updates
        this._configListener.off();
        this._configListener = null;

        // stop receiving REST API updates
        this._restApiListener.off();
        this._restApiListener = null;

        if (this._offRestApiHandlers) {
            await this._offRestApiHandlers();
        }

        if (this._configUpdatePromise) {
            this.logger.debug('Waiting for config routine to finish');
            await this._configUpdatePromise;
        }

        await destroyAllPollers.call(this);

        if (this._pstate) {
            this._pstate.destroy();
        }

        this._byPoller = null;
        this._dataRouting = null;
        this._hash2id = null;
        this._id2hash = null;

        // stop public events
        this._offMyEvents.off();
        this._offMyEvents = null;
    }

    /** @returns {number} number of running CLASSIC pollers */
    get numberOfClassicPollers() {
        return countPollers.call(this, (rec) => rec.classic);
    }

    /** @returns {number} number of running PASSIVE pollers */
    get numberOfPassivePollers() {
        return countPollers.call(this, (rec) => rec.passive);
    }

    /** @returns {number} number of running DEMO pollers */
    get numberOfDemoPollers() {
        return countPollers.call(this, (rec) => rec.demo);
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        // function to register subscribers
        this._registerEvents = () => {
            this._configListener = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
            this.logger.debug('Subscribed to configuration updates.');

            this._restApiListener = appEvents.on('restapi.register', onRestApi.bind(this), { objectify: true });
            this.logger.debug('Subscribed to REST API updates.');

            appEvents.on('resmon.pstate', (makePState) => {
                this._pstate = makePState(
                    // on enable
                    updateProcessingState.bind(this),
                    // on disable
                    updateProcessingState.bind(this)
                );
            });
            this.logger.debug('Subscribed to Resource Monitor updates.');

            this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
                { 'config.applied': 'config.applied' },
                'config.decrypt',
                'config.getConfig',
                'config.getHash'
            ]);
            this.logger.debug('Registered public events.');

            this._collectListener = appEvents.on(`*.${EE_NAMESPACE}.collect`, onCollectEvent.bind(this), { objectify: true });
        };
    }

    /** @returns {boolean} true when data processing enabled */
    isProcessingEnabled() {
        return this._pstate ? this._pstate.enabled : true;
    }
}

/**
 * @this SystemPollerService
 *
 * @param {function(rec: Record): boolean} predicate - callback that returns `true` when `rec` satisfies the criteria
 *
 * @returns {number} of pollers
 */
function countPollers(predicate) {
    let count = 0;
    if (this._byPoller) {
        for (const rec of this._byPoller.values()) {
            if (predicate(rec)) {
                count += 1;
            }
        }
    }
    return count;
}

/**
 * @this SystemPollerService
 *
 * @param {SystemPollerComponent | SystemPollerComponent[]} config
 *
 * @returns {SystemPollerComponent | SystemPollerComponent[]} decrypted config
 */
async function decryptConfigs(config) {
    return new Promise((resolve, reject) => {
        this.ee.emitAsync('config.decrypt', util.deepCopy(config), (error, decrypted) => {
            if (error) {
                reject(error);
            } else {
                resolve(decrypted);
            }
        });
    });
}

/**
 * @this SystemPollerService
 *
 * @param {Record} rec
 *
 * @returns {void} once deregistered
 */
function deregisterPoller(rec) {
    PRIVATES.delete(rec.poller);
    this._byPoller.delete(rec.poller);
}

/**
 * @this SystemPollerService
 *
 * @returns {void} once all pollers destroyed
 */
async function destroyAllPollers() {
    this.logger.info('Destroying all registered pollers');

    const promises = [];
    for (const rec of this._byPoller.values()) {
        promises.push(destroyPoller.call(this, rec));
    }

    await promiseUtil.allSettled(promises);
}

/**
 * @this SystemPollerService
 *
 * @param {Record} rec
 *
 * @returns {void} once poller destroyed
 */
async function destroyPoller(rec) {
    try {
        await rec.poller.destroy();
    } catch (error) {
        this.logger.exception(`Uncaught error on attempt to destroy poller "${rec.name}":`, error);
    }
    this.logger.debug(`Poller "${rec.name}" destroyed!`);
    deregisterPoller.call(this, rec);
}

/**
 * @this SystemPollerService
 *
 * @param {object} [options]
 * @param {string} [options.hash] - poller's config hash
 * @param {string} [options.name] - poller's name
 * @param {string} [options.namespace] - namespace
 *
 * @returns {SystemPollerComponent[]} configs
 */
async function getConfigs({ hash = undefined, name = undefined, namespace = undefined } = {}) {
    let id;
    if (hash) {
        id = this._hash2id[hash];
        assert.string(id, 'id');
    }

    return new Promise((resolve) => {
        this.ee.emitAsync('config.getConfig', resolve, {
            class: constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME,
            id,
            name,
            namespace
        });
    });
}

/**
 * @this SystemPollerService
 *
 * @param {SystemPollerComponent | SystemPollerComponent[]} config
 *
 * @returns {string | string[]} hashes
 */
async function getHashes(config) {
    return new Promise((resolve, reject) => {
        this.ee.emitAsync('config.getHash', config, (error, hashes) => {
            if (error) {
                reject(error);
            } else {
                resolve(hashes);
            }
        });
    });
}

/**
 * Collects stats on demand
 *
 * @this SystemPollerService
 *
 * @param {string} id - poller ID
 * @param {CollectCallback} callback
 *
 * @returns {void} once configuration applied
 */
function onCollectEvent(id, callback) {
    (async () => {
        // look up for config hash by ID
        const hash = this._id2hash[id];
        let config = null;

        if (typeof hash !== 'undefined') {
            const configs = await getConfigs.call(this, { hash });
            if (configs.length === 1) {
                config = configs[0];
            }
        }
        if (config === null) {
            throw new errors.ObjectNotFoundInConfigError(`System Poller with ID "${id}" not found`);
        }

        const ret = passivePollerCollect.call(this, `${config.traceName}_Passive`, hash, config);
        ret.rec.passive = true;
        return ret.promise;
    })()
        .then(
            (dataCtx) => callback(null, dataCtx),
            (error) => callback(error, null)
        );
}

/**
 * Apply configuration for classic pollers (inverval > 0)
 *
 * NOTE:
 * - Classic Pollers should store and use original config's hash to be able
 *   be identified for future changes
 * - Demo pollers (via REST API) and Passive pollers (via .collect event) should use
 *   something else (e.g. hash + suffix or prefix) - those pollers are short-living
 *   object and should be removed immediately once died
 *
 * @this SystemPollerService
 *
 * @param {Configuration} newConfig
 *
 * @returns {void} once configuration applied
 */
async function onConfigEvent(newConfig) {
    const applyConfig = async () => {
        this.logger.debug('Config "change" event');

        // TODO: remove once dataPipeline updated
        this._dataRouting = newConfig.mappings;

        // reset mappings
        this._hash2id = {};
        this._id2hash = {};

        const configs = await decryptConfigs.call(this, await getConfigs.call(this));
        configs.forEach((c) => assert.config.systemPoller(c, 'systemPollerConfig'));

        const hashes = configs.length > 0 ? (await getHashes.call(this, configs)) : [];
        hashes.forEach((h) => assert.string(h, 'systemPollerConfigHash'));

        /**
         * Active should satisfy following criterias:
         * - enabled
         * - non-zero polling interval
         * - should have receivers (Push Consumers)
         */
        const activeHashes = hashes.filter((hash, idx) => configs[idx].enable
            && configs[idx].interval > 0
            && Array.isArray(this._dataRouting[configs[idx].id]));

        const destroyPromises = [];
        const runningHashes = [];

        for (const rec of this._byPoller.values()) {
            if (rec.classic) {
                // now it is ClassicRecord
                if (activeHashes.includes(rec.hash)) {
                    runningHashes.push(rec.hash);
                } else {
                    this.logger.debug(`Removing System Poller "${rec.name}". Reason - configuration updated.`);
                    // do not wait because it may take long time to terminated the process (e.g. slow response)
                    destroyPromises.push(destroyPoller.call(this, rec));
                }
            }
        }

        const startPromises = [];
        for (let i = 0; i < hashes.length; i += 1) {
            const hash = hashes[i];
            const config = configs[i];

            this._hash2id[hash] = config.id;
            this._id2hash[config.id] = hash;

            if (runningHashes.includes(hash) || !activeHashes.includes(hash)) {
                this.logger.debug(`No configuration changes for "${config.traceName}"`);
                // poller exists and config didn not changed or poller config is not active
                continue;
            }

            this.logger.info(`Starting System Poller "${config.traceName}"`);

            const cb = processReportSafe.bind(this, {
                dataActions: config.dataOpts.actions,
                ignoreEmptyReport: true,
                noConsumers: false
            });

            const ret = startPoller.call(this, cb, config.traceName, hash, { onePassOnly: false });
            // now it is ClassicRecord
            ret.rec.classic = true;

            startPromises.push(ret.promise);
        }
        promiseUtil.getValues(await promiseUtil.allSettled(startPromises));

        this.logger.info(`${activeHashes.length} System Poller(s) running`);
        this.logger.info(`${this.numberOfDemoPollers} DEMO System Poller(s) registered`);
        this.logger.info(`${this.numberOfPassivePollers} Passive System Poller(s) registered`);
    };

    try {
        this._configUpdatePromise = applyConfig();
        await this._configUpdatePromise;
    } catch (error) {
        this.logger.exception('Error caught on attempt to apply configuration to System Poller Service:', error);
    } finally {
        this._configUpdatePromise = null;
        // - emit in any case to show we are done with config processing
        // - do not wait for results
        this.ee.safeEmitAsync('config.applied');
    }
}

/**
 * Apply REST API configuration
 *
 * @this SystemPollerService
 *
 * @param {RegisterRestApiHandler} register - register handler
 * @param {RestApiConfig} config - config
 */
async function onRestApi(register, config) {
    if (config.debug) {
        // previous handler (if registered) destroyed already
        const requestHandler = makeRequestHandler.call(this);

        const offs = [
            register(['GET'], '/systempoller', requestHandler),
            register(['POST'], '/systempoller/:system/:poller', requestHandler),
            register(['GET'], '/namespace/:namespace/systempoller', requestHandler),
            register(['POST'], '/namespace/:namespace/systempoller/:system/:poller', requestHandler)
        ];
        this._offRestApiHandlers = () => promiseUtil.allSettled(offs.map((off) => off()));
    }
}

/**
 * @this SystemPollerService
 *
 * @param {string} name - name to set to newly created System Poller
 * @param {string} hash - hash
 * @param {SystemPollerComponent} config - config
 *
 * @returns {Promise<DataCtx>} with dataCtx once collected
 */
function passivePollerCollect(name, hash, config) {
    const resolvers = promiseUtil.withResolvers();
    const ret = startPoller.call(this, (error, poller, results) => {
        if (error) {
            resolvers.reject(error);
        } else {
            resolvers.resolve({ poller, results });
        }
    }, name, hash, { onePassOnly: true });

    return {
        rec: ret.rec,
        promise: promiseUtil.allSettled([
            // reject second promise if start failed to avoid dead-lock
            ret.promise.then(
                (error) => error && resolvers.reject(error),
                resolvers.reject
            ),
            resolvers.promise
        ])
            .then((results) => {
                destroyPoller.call(this, ret.rec);
                results = promiseUtil.getValues(results);
                return processReport.call(this, {
                    dataActions: config.dataOpts.actions,
                    ignoreEmptyReport: false,
                    noConsumers: true
                }, null, results[1].poller, results[1].results);
            })
    };
}

/**
 * @this SystemPollerService
 *
 * @param {object} options
 * @param {array} options.dataActions
 * @param {boolean} [options.ignoreEmptyReport = false]
 * @param {boolean} options.noConsumers
 * @param {object} error - error if any caught
 * @param {Poller} poller - Poller instance
 * @param {CollectionResults} report - stats report or null when error caught
 *
 * @returns {DataCtx | void} once report processed
 */
async function processReport({
    dataActions = [],
    ignoreEmptyReport = false,
    noConsumers = false
}, error, poller, report) {
    assert.instanceOf(poller, Poller, 'poller');
    assert.assert(this._byPoller.has(poller), 'pollerRegistered');

    const rec = this._byPoller.get(poller);

    if (error) {
        this.logger.exception(`Ignoring stats report from "${rec.name}" due error:'`, error);
        return Promise.resolve();
    }
    if (Object.keys(report.stats).length === 0 && ignoreEmptyReport) {
        this.logger.debug(`Ignoring empty stats report from "${rec.name}"`);
        return Promise.resolve();
    }

    const pollerID = this._hash2id[rec.hash];
    assert.string(pollerID, 'pollerID');

    let dataCtx = {
        data: Object.assign(report.stats, {
            telemetryEventCategory: constants.EVENT_TYPES.SYSTEM_POLLER,
            telemetryServiceInfo: {
                pollingInterval: report.metadata.pollingInterval,
                cycleStart: (new Date(report.metadata.cycleStart)).toISOString(),
                cycleEnd: (new Date(report.metadata.cycleEnd)).toISOString()
            }
        }),
        destinationIds: (!noConsumers && this._dataRouting[pollerID]) || [],
        isCustom: report.metadata.isCustom,
        sourceId: pollerID,
        type: constants.EVENT_TYPES.SYSTEM_POLLER
    };

    dataCtx = await dataPipeline.process(
        dataCtx,
        constants.DATA_PIPELINE.PUSH_EVENT,
        null,
        {
            actions: dataActions,
            catchErrors: !noConsumers,
            deviceContext: report.metadata.deviceContext
        }
    );

    this.ee.safeEmit('report', dataCtx);
    return dataCtx;
}

/**
 * @see processReport
 */
async function processReportSafe() {
    try {
        return await processReport.apply(this, arguments);
    } catch (error) {
        this.logger.exception('Unable to process stats report', error);
    }
    return undefined;
}

/**
 * @this SystemPollerService
 *
 * @param {Record} rec
 *
 * @returns {void} once registered
 */
function registerPoller(rec) {
    this._byPoller.set(rec.poller, rec);
}

/**
 * @this SystemPollerService
 *
 * @param {OnReportCallback} cb
 * @param {string} name - polle's name
 * @param {string} hash - config hash
 * @param {object} [pollerOptions] - poller configuration
 *
 * @returns {{promise: Promise, rec: Record}} poller's record and promise resolved with
 *  null once started or with error (not rejected) when failed to start
 */
function startPoller(cb, name, hash, pollerOptions = {}) {
    assert.safeNumberGrEq(arguments.length, 3, 'arguments.length');
    assert.function(cb, 'callback');
    assert.string(name, 'name');
    assert.string(hash, 'hash');
    assert.oneOfAssertions(
        () => assert.object(pollerOptions, 'pollerOptions'),
        () => assert.emptyObject(pollerOptions, 'pollerOptions')
    );

    const rec = {
        hash,
        name,
        poller: new Poller(
            pollerHelpers.buildManagerProxy.call(this),
            cb,
            {
                logger: this.logger.getChild(`Poller[${name}]`),
                ...pollerOptions
            }
        )
    };

    registerPoller.call(this, rec);

    return {
        rec,
        promise: Promise.resolve()
            .then(async () => {
                await rec.poller.start();
                return null;
            })
            .catch((error) => {
                deregisterPoller.call(this, rec);
                this.logger.exception(`Uncaught error on attempt to start "${rec.name}":`, error);
                return error;
            })
    };
}

/**
 * @this SystemPollerService
 */
function updateProcessingState() {
    if (!this._byPoller) {
        return;
    }

    const enabled = this.isProcessingEnabled();

    for (const rec of this._byPoller.values()) {
        if (!rec.classic) {
            continue;
        }
        if (enabled) {
            this.logger.warning(`Enabling system poller "${rec.name}"`);
            rec.poller.start()
                .catch((error) => this.logger.debugException(`Uncaught error on attempt to start system poller "${rec.name}"`, error));
        } else {
            this.logger.warning(`Temporarily disabling system poller "${rec.name}"`);
            rec.poller.stop()
                .catch((error) => this.logger.debugException(`Uncaught error on attempt to stop system poller "${rec.name}"`, error));
        }
    }
}

const pollerHelpers = {
    /**
     * @this SystemPollerService
     *
     * @returns {ManagerProxy} proxy object
     */
    buildManagerProxy() {
        const proxy = {};
        Object.defineProperties(proxy, {
            cleanupConfig: {
                value: pollerHelpers.cleanupConfig.bind(this)
            },
            getConfig: {
                value: pollerHelpers.getConfig.bind(this)
            }
        });
        return proxy;
    },

    /**
     * @this SystemPollerService
     *
     * @param {Poller} poller
     *
     * @returns {void} once poller's cached config removed
     */
    async cleanupConfig(poller) {
        // demo pollers allowed too
        assert.instanceOf(poller, Poller, 'poller');
        PRIVATES.delete(poller);
    },

    /**
     * @this SystemPollerService
     *
     * @param {Poller} poller
     * @param {boolean} decrypt
     *
     * @returns {SystemPollerComponent} poller's configuration
     */
    async getConfig(poller, decrypt) {
        assert.instanceOf(poller, Poller, 'poller');
        assert.boolean(decrypt, 'decrypt');
        assert.assert(this._byPoller.has(poller), 'pollerRegistered');

        if (!PRIVATES.has(poller)) {
            const config = await getConfigs.call(this, { hash: this._byPoller.get(poller).hash });
            assert.assert(config.length === 1, 'pollerConfig', 'should return a config object by hash');

            PRIVATES.set(poller, {
                config: config[0],
                decrypted: false
            });
        }

        const config = PRIVATES.get(poller);
        if (decrypt && config.decrypted === false) {
            config.config = await decryptConfigs.call(this, config.config);
            config.decrypted = true;
        }

        assert.config.systemPoller(config.config, 'systemPollerConfig');
        return config.config;
    }
};

/**
 * @this SystemPollerService
 *
 * @returns {RestApiHandler}
 */
function makeRequestHandler() {
    const service = this;
    /**
     * @implements {RestApiHandler}
     */
    return Object.freeze({
        /**
         * @param {object} [options] - options
         * @param {string} [options.name] - poller's name
         * @param {string} [options.namespace] - namespace
         * @param {string} [options.system] - system's name
         *
         * @returns {SystemPollerComponent[]} pollers
         * @throws {ObjectNotFoundInConfigError} error when unable to find config
         */
        async _getConfigs({ namespace = undefined, name = undefined, system = undefined }) {
            let configs = (await getConfigs.call(service, { name, namespace }));

            if (system) {
                configs = configs.filter(
                    (c) => c.systemName === system
                );
                if (configs.length === 0) {
                    throw new errors.ObjectNotFoundInConfigError('System or System Poller declaration not found');
                }
            }
            return configs;
        },

        /** @returns {Record[]} pollers */
        async _getPollers(req) {
            const uriParams = req.getUriParams();
            const queryParams = req.getQueryParams();

            let pollers = Array.from(service._byPoller.values());

            let namespace = uriParams.namespace;
            if (!namespace && queryParams.all !== 'true') {
                namespace = constants.DEFAULT_UNNAMED_NAMESPACE;
            }

            if (namespace || uriParams.system) {
                const hashes = (await this._getConfigs({ namespace }))
                    .map((c) => service._id2hash[c.id]) // search for config hash by config ID
                    .filter((h) => h); // filter empty results

                // filter by config hash - allows to include demo and regular pollers that shares a config
                pollers = pollers.filter((rec) => hashes.includes(rec.hash));
            }

            return pollers;
        },

        /**
         * Responds to user with states for all DEMO pollers (within namespace)
         *
         * Query args:
         * - demo=true - return demo pollers only
         * - all=true - return all matching  pollers despite namespace (when no namespace set)
         */
        async _getStates(req, res) {
            let pollers = await this._getPollers(req);
            const numberOfPollersTotal = pollers.length;
            const numberOfDemoPollers = pollers.reduce((acc, rec) => acc + (rec.demo ? 1 : 0), 0);

            if (req.getQueryParams().demo === 'true') {
                pollers = pollers.filter((rec) => rec.demo);
            }

            res.code = 200;
            res.contentType = 'application/json';
            res.body = {
                code: res.code,
                numberOfPollersTotal,
                numberOfPollers: numberOfPollersTotal - numberOfDemoPollers,
                numberOfDemoPollers,
                states: pollers.map((rec) => Object.assign({
                    name: rec.name,
                    type: rec.passive ? 'passive' : (rec.demo ? 'demo' : 'classic')
                }, rec.poller.info()))
            };
        },

        /** Responds to user once demo poller created */
        async _startDemo(req, res) {
            const uriParams = req.getUriParams();
            let config = await this._getConfigs({
                name: uriParams.poller,
                namespace: uriParams.namespace || constants.DEFAULT_UNNAMED_NAMESPACE,
                system: uriParams.system
            });

            assert.assert(config.length === 1, 'config', 'should not have multiple configurations!');

            config = config[0];
            const hash = service._id2hash[config.id];
            assert.defined(hash, 'hash');

            let demoRec;

            for (const rec of service._byPoller.values()) {
                if (rec.hash === hash && rec.demo) {
                    demoRec = rec;
                    break;
                }
            }

            if (!demoRec) {
                const ret = passivePollerCollect.call(service, `${config.traceName}_DEMO`, hash, config);
                demoRec = ret.rec;
                demoRec.demo = true;
                demoRec.promise = ret.promise;
            } else {
                service.logger.debug(`${demoRec.name} is running already. Chaining reuqest to existing promise and waiting for results`);
            }

            res.code = 200;
            res.contentType = 'application/json';
            res.body = (await demoRec.promise).data;
        },

        /** @inheritdoc */
        async handle(req, res) {
            if (req.getMethod() === 'GET') {
                return this._getStates(req, res);
            }
            if (req.getMethod() === 'DELETE') {
                return this._deleteDemo(req, res);
            }
            return this._startDemo(req, res);
        },
        name: 'System Poller Service'
    });
}

module.exports = SystemPollerService;

/**
 * @callback CollectCallback
 * @param {Error} error - error or null
 * @param {DataCtx} dataCtx - collected
 */
/**
 * @typedef {object} ManagerProxy
 * @property {async function(poller: Poller)} cleanupConfig
 * @property {async function(poller: Poller, decrypt: boolean): SystemPollerComponent} getConfig
 */
/**
 * @typedef {object} Record
 * @property {string} hash - config hash
 * @property {string} name - Poller's name
 * @property {Poller} poller - Poller instance
 */
/**
 * @typedef {Record} ClassicRecord
 * @property {boolean} classic - set to `true` if poller is long-living instance
 */
/**
 * @typedef {Record} PassiveRecord
 * @property {boolean} passive - set to `true` if poller is short-living passive instance
 */
/**
 * @typedef {Record} DemoRecord
 * @property {boolean} demo - set to `true` if poller is short-living demo instance
 */
