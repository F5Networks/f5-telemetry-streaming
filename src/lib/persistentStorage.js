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

const logger = require('./logger');
const util = require('./utils/misc');

/** @module persistentStorage */

/**
 * Interface for classes that represents a Storage for data
 *
 * @class
 *
 * Note: when 'key' arg is Array<string> then it should be treated as path - ['a', 'b', 'c'] is eq to 'a.b.c'
 */
class StorageInterface {
    /**
     * Get data by the specified key
     *
     * @param {string|Array<string>} key - key to be searched in the storage
     *
     * @returns {Promise<any>} resolved with copy of a data
     */
    get() {
        throw new Error('Not implemented');
    }

    /**
     * Set data to the specified key
     *
     * @param {string|Array<string} key - key to be used
     * @param {any} data - data to be set to the key
     *
     * @returns {Promise} resolved when copy of a data saved to the storage
     */
    set() {
        throw new Error('Not implemented');
    }

    /**
     * Remove data by the specified key
     *
     * @param {string|Array<string} key - key to be used
     *
     * @returns {Promise} resolved when data saved to the storage
     */
    remove() {
        throw new Error('Not implemented');
    }

    /**
     * Load storage data
     *
     * @returns {Promise<any>} resolved with data loaded from the storage
     */
    load() {
        throw new Error('Not implemented');
    }

    /**
     * Save storage data
     *
     * @returns {Promise} resolved when data saved to the storage
     */
    save() {
        throw new Error('Not implemented');
    }
}

/**
 * Persistent Storage Proxy
 *
 * @class
 *
 * @property {Storage} storage - storage instance
 */
class PersistentStorageProxy extends StorageInterface {
    /**
     * Constructor
     *
     * @param {Storage} storage - instance of persistent storage
     */
    constructor(storage) {
        super();
        this.storage = storage;
    }

    /** @inheritdoc */
    get(key) {
        return this.storage.get(key)
            .then((value) => {
                if (typeof value === 'object') {
                    value = util.deepCopy(value);
                }
                return Promise.resolve(value);
            });
    }

    /** @inheritdoc */
    set(key, data) {
        if (typeof data === 'object') {
            data = util.deepCopy(data);
        }
        return this.storage.set(key, data);
    }

    /** @inheritdoc */
    remove(key) {
        return this.storage.remove(key);
    }

    /** @inheritdoc */
    load() {
        return this.storage.load();
    }

    /** @inheritdoc */
    save() {
        return this.storage.save();
    }
}

/**
 * Rest Storage Interface.
 * 'get'    - not async, reading all data from cache and calls callback immediately.
 * 'set'    - semi-async, saves data to cache immediately, but callback will be called
 *            once data is really saved to Rest Storage. Cache can be not in-sync
 *            with the data in Rest Storage.
 * 'remove' - semi-async, removes data from cache immediately, but callback will
 *            be called once updated data is really saved to Rest Storage. Cache can be
 *            not in-sync with the actual data in Rest Storage.
 *
 * @class
 *
 * @property {module:restWorkers~RestWorker} restWorker - RestWorker instance
 */
class RestStorage extends StorageInterface {
    /**
     * Constructor
     *
     * @param {RestWorker} restWorker - RestWorker instance
     */
    constructor(restWorker) {
        super();
        this.restWorker = restWorker;
        this._cache = this._getBaseState();

        this._savePromise = null;
        this._inSaveProcess = false;
        this._loadPromise = null;
    }

    /** @inheritdoc */
    get(key) {
        return Promise.resolve(getData(this._cache._data_, key));
    }

    /** @inheritdoc */
    set(key, data) {
        setData(this._cache._data_, key, data);
        return this._save();
    }

    /** @inheritdoc */
    remove(key) {
        unsetData(this._cache._data_, key);
        return this._save();
    }

    /** @inheritdoc */
    save() {
        return this._save();
    }

    /** @inheritdoc */
    load() {
        return this._load();
    }

    /**
     * Load all data from Rest Storage.
     * Can be blocked for a while by save operation.
     *
     * @async
     * @private
     *
     * @returns {Promise<object>} resolved when data loaded from Rest Storage
     */
    _load() {
        if (!this.restWorker) {
            // fatal error
            throw new Error('RestStorage.load: restWorker is not specified');
        }

        let loadPromise = this._loadPromise;

        if (!loadPromise) {
            loadPromise = this._savePromise ? this._savePromise : Promise.resolve();
            loadPromise = loadPromise.then(() => this._unsafeLoad())
                .then((state) => {
                    this._loadPromise = null;
                    this._cache = this._validateLoadedState(state || this._getBaseState());
                    loadPromise.loadResults = this._cache._data_;
                    logger.debug('RestStorage.load: application state loaded');
                })
                .catch((err) => {
                    this._loadPromise = null;
                    loadPromise.loadError = err;
                    logger.exception('RestStorage.load error', err);
                });

            this._loadPromise = loadPromise;
        }

        return new Promise((resolve, reject) => {
            loadPromise.then(() => {
                if (loadPromise.loadError) {
                    reject(loadPromise.loadError);
                } else {
                    resolve(loadPromise.loadResults);
                }
            });
        });
    }

    /**
     * Save current data to Rest Storage.
     * Can be blocked for a while by load operation.
     *
     * @returns {Promise} resolved when data saved to Rest Storage
     */
    _save() {
        if (!this.restWorker) {
            // fatal error
            throw new Error('RestStorage.save: restWorker is not specified');
        }
        if (!this._cache) {
            // fatal error
            throw new Error('RestStorage.save: no loaded state');
        }

        let savePromise = this._savePromise;
        if (!savePromise) {
            let copiedData;

            savePromise = this._loadPromise ? this._loadPromise : Promise.resolve();
            savePromise = savePromise.then(() => {
                this._inSaveProcess = true;
                try {
                    copiedData = this._prepareToSave(this._cache);
                } catch (err) {
                    return Promise.reject(err);
                }
                return this._unsafeSave(copiedData);
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
                    logger.debug('RestStorage.save: application state saved');
                })
                .catch((err) => {
                    savePromise.saveError = err;
                    logger.exception('RestStorage.save error', err);
                })
                .then(() => {
                    this._savePromise = null;
                    this._inSaveProcess = false;
                });

            this._savePromise = savePromise;
        } else if (this._inSaveProcess) {
            // try again to save later, because we are too late at that time
            savePromise = savePromise.then(() => this._save());
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
     * @param {object} data - data to save
     *
     * @returns {Promise} resolved when data saved to Rest Storage
     */
    _unsafeSave(data) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.restWorker.saveState(null, data, (err) => {
                if (err) {
                    logger.error(`RestStorage._unsafeSave: unable to save state: ${err}`);
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
     * @returns {Promise<?object>} resolved with data loaded from Rest Storage
     */
    _unsafeLoad() {
        const self = this;
        return new Promise((resolve, reject) => {
            self.restWorker.loadState(null, (err, state) => {
                if (err) {
                    logger.error(`RestStorage._unsafeLoad: unable to load state: ${err}`);
                    reject(err);
                } else {
                    resolve(state);
                }
            });
        });
    }

    /**
     * Base state
     *
     * @private
     *
     * @returns {object} base state object
     */
    _getBaseState() {
        return {
            _data_: {}
        };
    }

    /**
     * Validate loaded data and convert it to appropriate format
     *
     * @private
     *
     * @param {object} state - object to verify
     *
     * @returns {object} verified object
     */
    _validateLoadedState(state) {
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
     * @private
     *
     * @param {object} state - current state
     *
     * @returns {object} object ready to be saved
     */
    _prepareToSave(state) {
        state = state || {};
        state._data_ = state._data_ || {};

        const newState = Object.assign({}, state);
        newState._data_ = JSON.stringify(state._data_);

        return newState;
    }
}

module.exports = {
    /**
     * Creating singleton instance that will be configured later in restWorker.js and shared across modules
     *
     * Usage:
     * require('./persistentStorage').persistentStorage.get(key)
     */
    persistentStorage: new PersistentStorageProxy(),
    PersistentStorageProxy,
    RestStorage,
    StorageInterface
};
