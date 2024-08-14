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

/* eslint-disable no-continue, no-restricted-syntax, no-use-before-define */

const assert = require('../utils/assert');
const constants = require('../constants');
const errors = require('../errors');
const Poller = require('./poller');
const promiseUtil = require('../utils/promise');
const Service = require('../utils/service');
const util = require('../utils/misc');
// TODO: remove once dataPipeline updated
const dataPipeline = require('../dataPipeline');
const normalize = require('./normalize');

const DEMO_PREFIX = 'DEMO_';
const PRIVATES = new WeakMap();

/**
 * @module ihealth
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../utils/config').Configuration} Configuration
 * @typedef {import('../utils/config').IHealthPollerCompontent} IHealthPollerCompontent
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('./poller').Poller} Poller
 * @typedef {import('./poller').PollerInfo} PollerInfo
 * @typedef {import('./poller').QkviewReport} QkviewReport
 * @typedef {import('../restAPI').Register} RegisterRestApiHandler
 * @typedef {import('../restAPI').Config} RestApiConfig
 * @typedef {import('../restAPI').RequestHandler} RestApiHandler
 * @typedef {import('./poller').StorageState} StorageState
 */

const EE_NAMESPACE = 'ihealth';

/**
 * iHealth Service Class
 */
class IHealthService extends Service {
    /** @inheritdoc */
    async _onStart() {
        /** @type {Map<Poller, Record | DemoRecord>} */
        this._byPoller = new Map();

        /** @type {Object<string, string>} */
        this._hash2id = {};

        /** @type {Object<string, string>} */
        this._id2hash = {};

        scheduleDemoPollersCleanup.call(this);

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

        await stopDemoPollersCleanup.call(this);

        if (this._configUpdatePromise) {
            this.logger.debug('Waiting for config routine to finish');
            await this._configUpdatePromise;
        }

        await destroyAllPollers.call(this);

        this._byPoller = null;
        this._dataRouting = null;
        this._hash2id = null;
        this._id2hash = null;

        // stop public events
        this._offMyEvents.off();
        this._offMyEvents = null;
    }

    /** @returns {number} number of running DEMO pollers */
    get numberOfDemoPollers() {
        let demoPollers = 0;
        if (this._byPoller) {
            for (const rec of this._byPoller.values()) {
                if (rec.poller.isDemo) {
                    demoPollers += 1;
                }
            }
        }
        return demoPollers;
    }

    /** @returns {number} number of running pollers */
    get numberOfPollers() {
        let pollers = 0;
        if (this._byPoller) {
            pollers = this._byPoller.size - this.numberOfDemoPollers;
        }
        return pollers;
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        // function to register subscribers
        this._registerEvents = () => {
            this._configListener = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
            this.logger.debug('Subscribed to Configuration updates.');

            this._restApiListener = appEvents.on('restapi.register', onRestApi.bind(this), { objectify: true });
            this.logger.debug('Subscribed to REST API updates.');

            this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
                { 'config.applied': 'config.applied' },
                'config.decrypt',
                'config.getConfig',
                'config.getHash',
                'storage.get',
                'storage.remove',
                'storage.set'
            ]);
            this.logger.debug('Registered public events.');
        };
    }
}

/**
 * @this IHealthService
 *
 * @param {IHealthPollerCompontent | IHealthPollerCompontent[]} config
 *
 * @returns {IHealthPollerCompontent | IHealthPollerCompontent[]} decrypted config
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
 * @this IHealthService
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
 * @this IHealthService
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
 * @this IHealthService
 *
 * @param {DemoRecord | Record} rec
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
 * @this IHealthService
 *
 * @param {object} [options]
 * @param {string} [options.hash] - poller's config hash
 * @param {string} [options.namespace] - namespace
 *
 * @returns {IHealthPollerCompontent[]} configs
 */
async function getConfigs({ hash = undefined, namespace = undefined } = {}) {
    let id;
    if (hash) {
        id = this._hash2id[hash];
        assert.string(id, 'id');
    }

    return new Promise((resolve) => {
        this.ee.emitAsync('config.getConfig', resolve, {
            class: constants.CONFIG_CLASSES.IHEALTH_POLLER_CLASS_NAME,
            id,
            namespace
        });
    });
}

/**
 * @this IHealthService
 *
 * @param {IHealthPollerCompontent | IHealthPollerCompontent[]} config
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
 * @this IHealthService
 *
 * @property {string} [key]
 *
 * @returns {any} data from the storage service
 */
async function getStorageData(key) {
    const skey = [constants.IHEALTH.STORAGE_KEY];
    if (typeof key !== 'undefined') {
        assert.string(key, 'storageKey');
        skey.push(key);
    }
    return new Promise((resolve, reject) => {
        this.ee.emitAsync('storage.get', skey, (error, value) => {
            if (error) {
                reject(error);
            } else {
                resolve(value);
            }
        });
    });
}

/**
 * @this IHealthService
 *
 * @param {Record} rec
 *
 * @returns {void} once registered
 */
function registerPoller(rec) {
    this._byPoller.set(rec.poller, rec);
}

/**
 * @this IHealthService
 *
 * @property {string} key
 *
 * @returns {void} once data from the storage service removed
 */
async function removeStorageData(key) {
    return new Promise((resolve, reject) => {
        this.ee.emitAsync('storage.remove', [constants.IHEALTH.STORAGE_KEY, key], (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

/**
 * @this IHealthService
 *
 * @returns {void} once DEMO pollers cleanup routine scheduled
 */
function scheduleDemoPollersCleanup() {
    const timeout = constants.IHEALTH.DEMO_CLEANUP_TIMEOUT;

    this._demoCleanupTimerID = setTimeout(async () => {
        const destroyPromises = [];
        const now = Date.now();

        this._demoCleanupTimerID = null;

        for (const rec of this._byPoller.values()) {
            if (!rec.poller.isDemo) {
                continue;
            }
            const pinfo = rec.poller.info();
            if (pinfo.terminated === true && !rec.timestamp) {
                rec.timestamp = Date.now();
                continue;
            }
            if (typeof rec.timestamp !== 'undefined' && (now - rec.timestamp) >= timeout) {
                this.logger.debug(`Removing DEMO iHealth Poller "${rec.name}".`);
                destroyPromises.push(destroyPoller.call(this, rec));
            }
        }

        this._demoCleanupPromise = promiseUtil.allSettled(destroyPromises);
        await this._demoCleanupPromise;
        this._demoCleanupPromise = null;

        scheduleDemoPollersCleanup.call(this);
        // end of the function
    }, timeout);
}

/**
 * @this IHealthService
 *
 * @param {Poller} poller
 * @param {QkviewReport} report
 *
 * @returns {void} once report processed
 */
async function sendQkviewReport(poller, report) {
    assert.instanceOf(poller, Poller, 'poller');
    assert.assert(this._byPoller.has(poller), 'pollerRegistered');

    const pollerID = this._hash2id[this._byPoller.get(poller).hash];
    assert.string(pollerID, 'pollerID');

    let dataCtx = {
        data: normalize(report),
        sourceId: pollerID,
        destinationIds: (!poller.isDemo && this._dataRouting[pollerID]) || []
    };
    dataCtx.type = dataCtx.data.telemetryEventCategory;

    dataCtx = await dataPipeline.process(
        dataCtx,
        constants.DATA_PIPELINE.PUSH_EVENT,
        null
    );

    this.ee.safeEmitAsync('report', dataCtx);
}

/**
 * @this IHealthService
 *
 * @property {string} key
 * @property {any} data
 *
 * @returns {void} once data from the storage service removed
 */
async function setStorageData(key, data) {
    assert.string(key, 'storageKey');
    return new Promise((resolve, reject) => {
        this.ee.emitAsync('storage.set', [constants.IHEALTH.STORAGE_KEY, key], data, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

/**
 * @this IHealthService
 *
 * @param {IHealthPollerCompontent} config
 * @param {string} [hash] - config hash
 * @param {boolean} [demo = false] - start in DEMO mode
 */
async function startPoller(config, hash, demo = false) {
    assert.safeNumberGr(arguments.length, 1, 'arguments.length');
    assert.string(hash, 'hash');
    assert.boolean(demo, 'demo');

    const prefix = demo ? DEMO_PREFIX : '';

    const rec = {
        hash,
        name: `${prefix}${config.traceName}`,
        poller: new Poller(pollerHelpers.buildManagerProxy.call(this), {
            demo,
            logger: this.logger.getChild(`${prefix}Poller[${config.traceName}]`)
        })
    };

    registerPoller.call(this, rec);

    try {
        await rec.poller.start();
    } catch (error) {
        deregisterPoller.call(this, rec);
        this.logger.exception(`Uncaught error on attempt to start "${rec.name}":`, error);
    }
}

/**
 * @this IHealthService
 *
 * @returns {void} once DEMO pollers cleanup routine stopped
 */
async function stopDemoPollersCleanup() {
    if (this._demoCleanupPromise) {
        await this._demoCleanupPromise;
    }
    if (this._demoCleanupTimerID) {
        clearTimeout(this._demoCleanupTimerID);
        this._demoCleanupTimerID = null;
    }
}

/**
 * Apply configuration
 *
 * @this IHealthService
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
        configs.forEach((c) => assert.config.ihealthPoller(c, 'ihealthConfig'));

        const hashes = configs.length > 0 ? (await getHashes.call(this, configs)) : [];
        hashes.forEach((h) => assert.string(h, 'ihealthConfigHash'));

        const activeHashes = hashes.filter((hash, idx) => configs[idx].enable
            && Array.isArray(this._dataRouting[configs[idx].id]));

        const destroyPromises = [];
        const runningHashes = [];

        for (const [poller, rec] of this._byPoller) {
            if (!poller.isDemo) {
                if (activeHashes.includes(rec.hash)) {
                    runningHashes.push(rec.hash);
                } else {
                    this.logger.debug(`Removing iHealth Poller "${rec.name}". Reason - configuration updated.`);
                    // do not wait because it may take long time to terminated the process (e.g. qkview download)
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

            this.logger.info(`Staring iHealth Poller "${config.traceName}"`);
            startPromises.push(startPoller.call(this, config, hash));
        }
        promiseUtil.getValues(await promiseUtil.allSettled(startPromises));

        this.logger.info(`${activeHashes.length} iHealth Poller(s) running`);
        this.logger.info(`${this.numberOfDemoPollers} DEMO iHealth Poller(s) registered`);

        promiseUtil.allSettled(destroyPromises)
            .then(async () => {
                const storageData = await getStorageData.call(this);
                if (typeof storageData === 'object' && storageData) {
                    this.logger.debug('Removing obsolete data from the iHealth storage');
                    const storageRemovePromises = [];
                    for (const key in storageData) {
                        if (!activeHashes.includes(key)) {
                            storageRemovePromises.push(removeStorageData.call(this, key));
                        }
                    }
                    promiseUtil.getValues(await promiseUtil.allSettled(storageRemovePromises));
                    this.logger.debug('Removed obsolete data from the iHealth storage');
                }
            });
    };

    try {
        this._configUpdatePromise = applyConfig();
        await this._configUpdatePromise;
    } catch (error) {
        this.logger.exception('Error caught on attempt to apply configuration to iHealth Service:', error);
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
 * @this IHealthService
 *
 * @param {RegisterRestApiHandler} register - register handler
 * @param {RestApiConfig} config - config
 */
async function onRestApi(register, config) {
    if (config.debug) {
        // previous handler (if registered) destroyed already
        const requestHandler = makeRequestHandler.call(this);

        const offs = [
            register(['DELETE', 'GET'], '/ihealthpoller', requestHandler),
            register(['DELETE', 'GET', 'POST'], '/ihealthpoller/:system', requestHandler),
            register(['DELETE', 'GET'], '/namespace/:namespace/ihealthpoller', requestHandler),
            register(['DELETE', 'GET', 'POST'], '/namespace/:namespace/ihealthpoller/:system', requestHandler)
        ];
        this._offRestApiHandlers = () => promiseUtil.allSettled(offs.map((off) => off()));
    }
}

const pollerHelpers = {
    /**
     * @this IHealthService
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
            },
            getStorage: {
                value: pollerHelpers.getStorage.bind(this)
            },
            qkviewReport: {
                value: pollerHelpers.qkviewReport.bind(this)
            },
            saveStorage: {
                value: pollerHelpers.saveStorage.bind(this)
            }
        });
        return proxy;
    },

    /**
     * @this IHealthService
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
     * @this IHealthService
     *
     * @param {Poller} poller
     * @param {boolean} decrypt
     *
     * @returns {IHealthPollerCompontent} poller's configuration
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

        assert.config.ihealthPoller(config.config, 'ihealthConfig');
        // trust to the app's current state - no need to re-verify hash, ID should be enough
        return config.config;
    },

    /**
     * @this IHealthService
     *
     * @param {Poller} poller
     *
     * @returns {any | null} poller's data from the iHealth storage or null when not found
     */
    async getStorage(poller) {
        assert.instanceOf(poller, Poller, 'poller');
        assert.assert(this._byPoller.has(poller), 'pollerRegistered');

        if (poller.isDemo) {
            return null;
        }

        const data = await getStorageData.call(this, this._byPoller.get(poller).hash);
        return data || null;
    },

    /**
     * @this IHealthService
     *
     * @param {Poller} poller
     * @param {QkviewReport} report
     *
     * @returns {void} once poller's Report processed
     */
    async qkviewReport(poller, report) {
        sendQkviewReport.call(this, poller, report)
            .catch((error) => poller.logger.exception('Uncaught error on attempt to process Qkvew report:', error));
    },

    /**
     * @this IHealthService
     *
     * @param {Poller} poller
     * @param {any} storageData
     *
     * @returns {void} once poller's data saved to the iHealth storage
     */
    async saveStorage(poller, storageData) {
        assert.instanceOf(poller, Poller, 'poller');
        assert.assert(this._byPoller.has(poller), 'pollerRegistered');

        if (poller.isDemo) {
            return;
        }

        await setStorageData.call(this, this._byPoller.get(poller).hash, storageData);
    }
};

/**
 * @this IHealthService
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
         * Destroyes all DEMO pollers (within namespace)
         *
         * Query args:
         * - all=true - delete all matching pollers despite namespace (when no namespace set)
         */
        async _deleteDemo(req, res) {
            const pollers = await this._getPollers(req);
            const deletedPollers = [];
            const promises = [];

            for (const rec of pollers) {
                if (rec.poller.isDemo) {
                    deletedPollers.push(rec.name);
                    promises.push(destroyPoller.call(service, rec));
                }
            }

            promiseUtil.allSettled(promises);
            res.code = 200;
            res.contentType = 'application/json';
            res.body = {
                code: res.code,
                numberOfDeletedDemoPollers: deletedPollers.length,
                deletedDemoPollers: deletedPollers
            };
        },

        /**
         * @param {object} [options] - options
         * @param {string} [options.namespace] - namespace
         * @param {string} [options.system] - system's name
         *
         * @returns {IHealthPollerCompontent[]} pollers
         * @throws {ObjectNotFoundInConfigError} error when unable to find config
         */
        async _getConfigs({ namespace = undefined, system = undefined }) {
            let configs = (await getConfigs.call(service, { namespace }));

            if (system) {
                configs = configs.filter(
                    (c) => c.system.name === system
                );
                if (configs.length === 0) {
                    throw new errors.ObjectNotFoundInConfigError('System or iHealth Poller declaration not found');
                }
            }
            return configs;
        },

        /** @returns {Array<Record | DemoRecord>} pollers */
        async _getPollers(req) {
            const uriParams = req.getUriParams();
            const queryParams = req.getQueryParams();

            let pollers = Array.from(service._byPoller.values());

            let namespace = uriParams.namespace;
            if (!namespace && queryParams.all !== 'true') {
                namespace = constants.DEFAULT_UNNAMED_NAMESPACE;
            }

            if (namespace || uriParams.system) {
                const hashes = (await this._getConfigs({
                    namespace,
                    system: uriParams.system
                }))
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
            const numberOfDemoPollers = pollers.reduce((acc, rec) => acc + (rec.poller.isDemo ? 1 : 0), 0);

            if (req.getQueryParams().demo === 'true') {
                pollers = pollers.filter((rec) => rec.poller.isDemo);
            }

            res.code = 200;
            res.contentType = 'application/json';
            res.body = {
                code: res.code,
                numberOfPollersTotal,
                numberOfPollers: numberOfPollersTotal - numberOfDemoPollers,
                numberOfDemoPollers,
                states: pollers.map((rec) => Object.assign({
                    name: rec.name
                }, rec.poller.info()))
            };
        },

        /** Responds to user once demo poller created */
        async _startDemo(req, res) {
            const uriParams = req.getUriParams();
            let config = await this._getConfigs({
                namespace: uriParams.namespace || constants.DEFAULT_UNNAMED_NAMESPACE,
                system: uriParams.system
            });
            assert.assert(config.length === 1, 'config', 'should not have multiple configurations!');

            config = config[0];
            const hash = service._id2hash[config.id];
            assert.defined(hash, 'hash');

            let demoRec;

            for (const rec of service._byPoller.values()) {
                if (rec.hash === hash && rec.poller.isDemo) {
                    demoRec = rec;
                    break;
                }
            }

            if (!demoRec) {
                await startPoller.call(service, config, hash, true);
            }

            res.code = demoRec ? 200 : 201;
            res.contentType = 'application/json';
            res.body = {
                code: res.code,
                message: demoRec
                    ? `DEMO poller "${config.traceName}" exists already. Wait for results or delete it.`
                    : `DEMO poller "${config.traceName}" created.`
            };
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
        name: 'iHealth Service'
    });
}

module.exports = IHealthService;

/**
 * @typedef {object} Record
 * @property {string} hash - config hash
 * @property {string} name - Poller's name
 * @property {Poller} poller - Poller instance
 */
/**
 * @typedef {Record} DemoRecord
 * @property {number} timestamp - timestamp when DEMO poller was created
 */
/**
 * @typedef {object} ManagerProxy
 * @property {async function(poller: Poller)} cleanupConfig
 * @property {async function(poller: Poller, decrypt: boolean): IHealthPollerCompontent} getConfig
 * @property {async function(poller: Poller): StorageState | null} getStorage
 * @property {async function(poller: Poller, report: QkviewReport)} qkviewReport
 * @property {async function(poller: Poller, storageData: StorageState)} saveStorage
 */
