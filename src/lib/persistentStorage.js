/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger');
const util = require('./utils/misc');

/** @module persistentStorage */

/**
 * Interface for classes that represents a Storage for data
 *
 * @interface Storage
 */
/**
 * Get data by the specified key
 *
 * @async
 * @function
 * @name module:persistentStorage~Storage#get
 *
 * @param {String} key - key to be searched in the storage
 *
 * @returns {Promise.<any>} Promise resolved with copy data
 */
/**
 * Set data to the specified key
 *
 * @async
 * @function
 * @name module:persistentStorage~Storage#set
 *
 * @param {String} key - key to be used
 * @param {} data      - data to be set to the key
 *
 * @returns {Promise} Promise resolved when copy data saved to the storage
 */
/**
 * Remove data by the specified key
 *
 * @async
 * @function
 * @name module:persistentStorage~Storage#remove
 *
 * @param {String} key - key to be used
 *
 * @returns {Promise} Promise resolved when data saved to the storage
 */
/**
 * Load storage data
 *
 * @async
 * @function
 * @name module:persistentStorage~Storage#load
 *
 * @returns {Promise.<?Object>} Promise resolved with data loaded from the storage
 */
/**
 * Save storage data
 *
 * @async
 * @function
 * @name module:persistentStorage~Storage#save
 *
 * @returns {Promise} Promise resolved when data saved to the storage
 */


/**
 * Persistent Storage Proxy
 *
 * @class
 * @implements {module:persistentStorage~Storage}
 *
 * @param {Storage} storage    - instance of persistent storage
 *
 * @property {Storage} storage - storage instance
 */
function PersistentStorageProxy(storage) {
    this.storage = storage;
}

/** @inheritdoc */
PersistentStorageProxy.prototype.get = function (key) {
    return this.storage.get(key)
        .then((value) => {
            if (typeof value === 'object') {
                value = util.deepCopy(value);
            }
            return Promise.resolve(value);
        });
};

/** @inheritdoc */
PersistentStorageProxy.prototype.set = function (key, data) {
    if (typeof data === 'object') {
        data = util.deepCopy(data);
    }
    return this.storage.set(key, data);
};

/** @inheritdoc */
PersistentStorageProxy.prototype.remove = function (key) {
    return this.storage.remove(key);
};

/** @inheritdoc */
PersistentStorageProxy.prototype.load = function () {
    return this.storage.load();
};

/** @inheritdoc */
PersistentStorageProxy.prototype.save = function () {
    return this.storage.save();
};


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
 * @implements {module:persistentStorage~Storage}
 *
 * @param {module:restWorkers~RestWorker} restWorker - RestWorker instance
 *
 * @property {module:restWorkers~RestWorker} restWorker - RestWorker instance
 */
function RestStorage(restWorker) {
    this.restWorker = restWorker;
    this._cache = null;

    this._savePromise = null;
    this._inSaveProcess = false;
    this._loadPromise = null;
}

/** @inheritdoc */
RestStorage.prototype.get = function (key) {
    return Promise.resolve(this._cache._data_[key]);
};

/** @inheritdoc */
RestStorage.prototype.set = function (key, data) {
    this._cache._data_[key] = data;
    return this._save();
};

/** @inheritdoc */
RestStorage.prototype.remove = function (key) {
    delete this._cache._data_[key];
    return this._save();
};

/** @inheritdoc */
RestStorage.prototype.save = function () {
    return this._save();
};

/** @inheritdoc */
RestStorage.prototype.load = function () {
    return this._load();
};

/**
 * Load all data from Rest Storage.
 * Can be blocked for a while by save operation.
 *
 * @async
 * @private
 *
 * @returns {Promise.<Object>} Promise resolved when data loaded from Rest Storage
 */
RestStorage.prototype._load = function () {
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
};

/**
 * Save current data to Rest Storage.
 * Can be blocked for a while by load operation.
 *
 * @async
 * @private
 *
 * @returns {Promise} Promise resolved when data saved to Rest Storage
 */
RestStorage.prototype._save = function () {
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
                // need to update current cache with service data
                // otherwise it will fail future save procedures
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
};

/**
 * Save data (override existing one) to Rest Storage without any checks
 *
 * @async
 * @private
 *
 * @param {Object} data - data to save
 *
 * @returns {Promise} Promise resolved when data saved to Rest Storage
 */
RestStorage.prototype._unsafeSave = function (data) {
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
};

/**
 * Load data from Rest Storage without any checks
 *
 * @async
 * @private
 *
 * @returns {Promise<?Object>} Promise resolved with data loaded from Rest Storage
 */
RestStorage.prototype._unsafeLoad = function () {
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
};

/**
 * Base state
 *
 * @private
 *
 * @returns {Object} base state object
 */
RestStorage.prototype._getBaseState = function () {
    return {
        _data_: {}
    };
};

/**
 * Validate loaded data and convert it to appropriate format
 *
 * @private
 *
 * @param {Object} state - object to verify
 *
 * @returns {Object} verified object
 */
RestStorage.prototype._validateLoadedState = function (state) {
    // looks like it is old versions
    if (state._data_ !== undefined) {
        if (typeof state._data_ === 'string') {
            state._data_ = JSON.parse(state._data_);
        }
    } else {
        state._data_ = {};
        if (state.config !== undefined) {
            state._data_.config = state.config;
            delete state.config;
        }
    }
    return state;
};

/**
 * Prepare data to be saved
 *
 * @private
 *
 * @param {Object} state - current state
 *
 * @returns {Object} object ready to be saved
 */
RestStorage.prototype._prepareToSave = function (state) {
    state = state || {};
    state._data_ = state._data_ || {};

    const newState = Object.assign({}, state);
    newState._data_ = JSON.stringify(state._data_);

    return newState;
};


module.exports = {
    persistentStorage: new PersistentStorageProxy(),
    RestStorage
};
