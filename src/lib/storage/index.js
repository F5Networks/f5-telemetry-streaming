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

/* eslint-disable no-unused-expressions */

const Service = require('../utils/service');
const Storage = require('./storage');

/**
 * @module storage
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../storage').Key} Key
 * @typedef {import('../../nodejs/restWorker').RestWorker} RestWorker
 */

const EE_NAMESPACE = 'storage';

/**
 * Storage Class
 */
class StorageService extends Service {
    /** @inheritdoc */
    async _onStart() {
        await this._createStorage();
        this._registerEvents();
    }

    /** @inheritdoc */
    async _onStop() {
        if (this._listeners) {
            this._listeners.forEach((listener) => listener.off());
        }

        this._storage = null;
    }

    /**
     * @param {ApplicationEvents} appEvents - application events
     * @param {RestWorker} restWorker - RestWorker instance
     */
    initialize(appEvents, restWorker) {
        // function to register subscribers
        this._registerEvents = () => {
            this._listeners = [
                appEvents.on(`*.${EE_NAMESPACE}.get`, getData.bind(this), { objectify: true }),
                appEvents.on(`*.${EE_NAMESPACE}.remove`, removeData.bind(this), { objectify: true }),
                appEvents.on(`*.${EE_NAMESPACE}.set`, setData.bind(this), { objectify: true })
            ];
            this.logger.debug(`Subscribed to *.${EE_NAMESPACE}.* requests.`);
        };
        this._createStorage = async () => {
            this._storage = new Storage(restWorker, this.logger);
            await this._storage.load();
        };
    }
}

/**
 * @param {Key} key
 * @param {function(error: Error | null, data: any)} callback
 */
async function getData(key, callback) {
    try {
        callback(null, await this._storage.get(key));
    } catch (error) {
        callback(error);
    }
}

/**
 * @param {Key} key
 * @param {any} value
 * @param {function(error: Error | null)} [callback]
 */
async function setData(key, value, callback) {
    let error = null;
    try {
        await this._storage.set(key, value);
    } catch (saveError) {
        error = saveError;
    }

    if (callback) {
        callback(error);
    }
}

/**
 * @param {Key} key
 * @param {function(error: Error | null)} [callback]
 */
async function removeData(key, callback) {
    let error = null;
    try {
        await this._storage.remove(key);
    } catch (removeError) {
        error = removeError;
    }

    if (callback) {
        callback(error);
    }
}

module.exports = StorageService;
