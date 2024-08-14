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

const getData = require('lodash/get');
const setData = require('lodash/set');
const unsetData = require('lodash/unset');

const assert = require('../utils/assert');
const logger = require('../logger');
const util = require('../utils/misc');

/**
 * @module persistentStorage/storage
 *
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('../../nodejs/restWorker').RestWorker} RestWorker
 */

/**
 * Rest Storage Interface.
 * 'get'    - not async, reading all data from cache and calls callback immediately.
 * 'set'    - semi-async, saves data to cache immediately, but callback will be called
 *            once data is really saved to Rest Storage. Cache can be not in-sync
 *            with the data in Rest Storage.
 * 'remove' - semi-async, removes data from cache immediately, but callback will
 *            be called once updated data is really saved to Rest Storage. Cache can be
 *            not in-sync with the actual data in Rest Storage.
 */
class RestStorage {
    /**
     * @param {RestWorker} restWorker - RestWorker instance
     * @param {Logger} parentLogger - parent logger
     */
    constructor(restWorker, parentLogger) {
        assert.exist(restWorker, 'restWorker');
        assert.instanceOf(parentLogger, logger.constructor, 'logger');

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            logger: {
                value: parentLogger.getChild('RestStorage')
            },
            restWorker: {
                value: restWorker
            }
        });

        this._cache = getBaseState();
        this._savePromise = null;
        this._inSaveProcess = false;
        this._loadPromise = null;
    }

    /**
     * @param {Key} key
     *
     * @returns {any} data
     */
    async get(key) {
        assert.storage.key(key);
        return getData(this._cache._data_, key);
    }

    /**
     * @param {Key} key
     * @param {any} data
     *
     * @returns {Promise} resolved once data saved
    */
    set(key, data) {
        assert.storage.key(key);
        setData(this._cache._data_, key, data);
        return save.call(this);
    }

    /**
     * @param {Key} key
     *
     * @returns {void} once key removed
     */
    async remove(key) {
        assert.storage.key(key);
        unsetData(this._cache._data_, key);
        await save.call(this);
    }

    /** @returns {void} once data saved */
    async save() {
        await save.call(this);
    }

    /** @returns {void} once data loaded */
    async load() {
        await load.call(this);
    }
}

/**
 * Load all data from Rest Storage.
 * Can be blocked for a while by save operation.
 *
 * @this {RestStorage}
 *
 * @returns {void} once data loaded from Rest Storage
 */
async function load() {
    let loadPromise = this._loadPromise;

    if (!loadPromise) {
        loadPromise = this._savePromise || Promise.resolve();
        loadPromise = loadPromise.then(() => unsafeLoad.call(this))
            .then((state) => {
                this._loadPromise = null;
                this._cache = validateLoadedState(state || getBaseState());
                this.logger.debug('Application state loaded from the storage');
            })
            .catch((err) => {
                loadPromise.loadError = err;
                this._loadPromise = null;
                this.logger.exception('Unable to load application state from the storage:', err);
            });

        this._loadPromise = loadPromise;
    }

    return new Promise((resolve, reject) => {
        loadPromise.then(() => {
            if (loadPromise.loadError) {
                reject(loadPromise.loadError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Save current data to Rest Storage.
 * Can be blocked for a while by load operation.
 *
 * @this {RestStorage}
 *
 * @returns {void} once data saved to Rest Storage
 */
async function save() {
    assert.exist(this._cache, '_cache');

    let savePromise = this._savePromise;
    if (!savePromise) {
        let copiedData;

        savePromise = this._loadPromise || Promise.resolve();
        savePromise = savePromise.then(() => {
            this._inSaveProcess = true;
            try {
                copiedData = prepareToSave(this._cache);
            } catch (err) {
                return Promise.reject(err);
            }
            return unsafeSave.call(this, copiedData);
        })
            .then(() => {
                /**
                 * Once data passed to restWorker.saveState it might be modified by restWorker.
                 * We need to copy those 'service' properties back to '_cache' to be able to
                 * save data again later. We can't assign data directly like 'this._cache = copiedData'
                 * because '_cache' might be updated by the user already - e.g. new data set.
                 */
                Object.keys(copiedData).forEach((key) => {
                    if (key !== '_data_') {
                        this._cache[key] = copiedData[key];
                    }
                });
                this.logger.debug('Application state saved to the storage');
            })
            .catch((err) => {
                savePromise.saveError = err;
                this.logger.exception('Unable to save application state to the storage:', err);
            })
            .then(() => {
                this._savePromise = null;
                this._inSaveProcess = false;
            });

        this._savePromise = savePromise;
    } else if (this._inSaveProcess) {
        // try again to save later, because we are too late at that time
        savePromise = savePromise.then(() => save.call(this));
    }

    return new Promise((resolve, reject) => {
        savePromise.then(() => {
            if (savePromise.saveError) {
                reject(savePromise.saveError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Save data (override existing one) to Rest Storage without any checks
 *
 * @this {RestStorage}
 *
 * @param {object} data - data to save
 *
 * @returns {void} once data saved to Rest Storage
 */
async function unsafeSave(data) {
    await new Promise((resolve, reject) => {
        this.restWorker.saveState(null, data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Load data from Rest Storage without any checks
 *
 * @this {RestStorage}
 *
 * @returns {object} data loaded from Rest Storage
 */
async function unsafeLoad() {
    return new Promise((resolve, reject) => {
        this.restWorker.loadState(null, (err, state) => {
            if (err) {
                reject(err);
            } else {
                resolve(state);
            }
        });
    });
}

/** @returns {object} base state object */
function getBaseState() {
    return {
        _data_: {}
    };
}

/**
 * Validate loaded data and convert it to appropriate format
 *
 * @param {object} state - object to verify
 *
 * @returns {object} verified object
 */
function validateLoadedState(state) {
    // looks like it is old versions
    if (typeof state._data_ !== 'undefined') {
        if (typeof state._data_ === 'string') {
            state._data_ = JSON.parse(state._data_);
        }
        if (state._data_ === null) {
            // otherwise lodash.set will ignore all operations
            state._data_ = {};
        }
    } else {
        state._data_ = {};
        if (typeof state.config !== 'undefined') {
            state._data_.config = state.config;
            delete state.config;
        }
    }
    return state;
}

/**
 * Prepare data to be saved
 *
 * @param {object} state - current state
 *
 * @returns {object} object ready to be saved
 */
function prepareToSave(state) {
    const newState = Object.assign({}, state);
    newState._data_ = JSON.stringify(state._data_);

    return newState;
}

/**
 * Persistent Storage Proxy
 *
 * @class
 *
 * @property {Storage} storage - storage instance
 */
class PersistentStorage {
    /**
     * Constructor
     *
     * @see {RestWorker} args
     */
    constructor(...args) {
        this.storage = new RestStorage(...args);
    }

    /**
     * @param {Key} key
     *
     * @returns {any} data
     */
    async get(key) {
        let value = await this.storage.get(key);
        if (typeof value === 'object') {
            value = util.deepCopy(value);
        }
        return value;
    }

    /**
     * @param {Key} key
     * @param {any} data
     *
     * @returns {Promise} resolved once data saved
    */
    set(key, data) {
        if (typeof data === 'object') {
            data = util.deepCopy(data);
        }
        return this.storage.set(key, data);
    }

    /**
     * @param {Key} key
     *
     * @returns {void} once key removed
     */
    async remove(key) {
        await this.storage.remove(key);
    }

    /** @returns {void} once data loaded */
    async load() {
        await this.storage.load();
    }

    /** @returns {void} once data saved */
    async save() {
        await this.storage.save();
    }
}

module.exports = PersistentStorage;

/**
 * @typedef {string | string[]} Key
 */
