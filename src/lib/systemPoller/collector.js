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

const assert = require('../utils/assert');
const collectorUtils = require('./utils');
const defaultLogger = require('../logger');
const Loader = require('./loader');
const miscUtils = require('../utils/misc');
const normalize = require('../normalize');
const TaskQueue = require('../utils/taskQueue');

/**
 * @module systemPoller/collector
 *
 * @typedef {import('./loader').Loader} Loader
 * @typedef {import('../../logger').Logger} Logger
 * @typedef {import('../../utils/taskQueue').TaskCallback} TaskCallback
 */

/**
 * System Stats Class
 *
 * @property {boolean} isCustom
 * @property {Loader} loader
 * @property {Logger} logger
 * @property {object} properties
 */
class Collector {
    /**
     * Constructor
     *
     * @param {Loader} loader - data loader
     * @param {object} properties - properties to load
     * @param {object} options - data options
     * @param {Logger} options.logger - parent logger
     * @param {boolean} [options.isCustom = false] - `true` when properties are created by a user
     * @param {number} [options.workers = 1] - number of workers
     */
    constructor(loader, properties, {
        isCustom = false,
        logger = undefined,
        workers = 1
    } = {}) {
        assert.instanceOf(loader, Loader, 'loader');
        assert.object(properties, 'properties');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');
        assert.boolean(isCustom, 'isCustom');
        assert.safeNumberBetweenInclusive(workers, 1, Number.MAX_SAFE_INTEGER, 'workers');

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            isCustom: {
                value: isCustom
            },
            loader: {
                value: loader
            },
            logger: {
                value: logger.getChild(this.constructor.name)
            },
            properties: {
                value: properties
            },
            workers: {
                value: workers
            }
        });
    }

    /** @returns {boolean} true when instance is active */
    isActive() {
        return !!this._stopPromise;
    }

    /**
     * Collect stats
     *
     * @returns {Promise<CollectionResults>} resolve with collected and processed stats
     */
    collect() {
        this.logger.debug('Starting stats collection');

        let resolve;
        this._stopPromise = (new Promise((done) => {
            resolve = done;
        }))
            .then(() => {
                this._stopPromise = null;
                this.logger.verbose('Stopped');
            });

        this._stopPromise.resolve = resolve;
        this._stopPromise.stopRequested = false;

        return collect.call(this)
            .catch(async (error) => {
                if (this._stopPromise.inLoop !== true) {
                    this._stopPromise.resolve();
                }
                await this.stop();

                error.message = `Collector.collect error: ${error.message}`;
                return Promise.reject(error);
            });
    }

    /** @returns {Promise} resolved once stopped */
    stop() {
        if (!this.isActive()) {
            return Promise.resolve();
        }

        this.logger.debug('Stopping');
        this._stopPromise.stopRequested = true;

        return this._stopPromise;
    }
}

/**
 * @this Collector
 *
 * @returns {CollectionResults} collected stats
 */
async function collect() {
    /** @type {CollectionResults} */
    const results = {
        errors: [],
        stats: {}
    };
    const taskQueue = new TaskQueue(processTask.bind(this, results), {
        concurrency: this.workers,
        logger: this.logger
    });

    this.logger.debug(`Task queue "${taskQueue.name}" configured with concurrency = ${taskQueue.concurrency}`);

    // load all properties to task queue
    Object.entries(this.properties).forEach(([name, property]) => {
        taskQueue.push({
            name,
            property
        });
    });

    this._stopPromise.inLoop = true;

    // process is long enough, simply wait for results
    while (taskQueue.size() && this._stopPromise.stopRequested === false) {
        await miscUtils.sleep(100);
    }

    this._stopPromise.inLoop = false;

    // wait till full stop
    await taskQueue.stop();
    this._stopPromise.resolve();

    return results;
}

/**
 * Load data for property
 *
 * @implements {TaskCallback}
 *
 * @param {CollectionResults} results - object to save processed data to
 * @param {object} task - task
 * @param {string} task.name - property name
 * @param {object} task.property - property config to process
 * @param {function} done - callback to call once task completed
 *
 * @returns {void} once task completed
 */
async function processTask(results, task, done) {
    this.logger.verbose(`Loading data for property "${task.name}`);

    try {
        await processProperty.call(this, results.stats, task);
    } catch (error) {
        error.message = `Collector.collect unexpected error on attemp to collect stats for "${task.name}" (${task.property.key}): ${error.message}`;
        results.errors.push(error);

        if (this.isCustom) {
            // for custom endpoints only, add an empty object to response, to show TS tried to load the endpoint
            results.stats[task.name] = {};
        }
    } finally {
        done();
    }
}

/**
 * @param {obect} stats - collections of stats
 * @param {object} task - task
 * @param {string} task.name - property name
 * @param {object} task.property - property config to process
 *
 * @returns {void} once task processed and the data save (if needed)
 */
async function processProperty(stats, task) {
    const endpoint = collectorUtils.splitKey(task.property.key).rootKey;

    let data = await this.loader.loadEndpoint(endpoint, task.property.keyArgs);
    data = data.data;
    if (data && typeof data === 'object' && typeof data.items === 'undefined'
        && Object.keys(data).length === 2 && data.kind && data.kind.endsWith('state')) {
        data.items = [];
    }

    if (task.property.normalize !== false) {
        data = normalize.data(data, task.property.normalization);
    }
    if (!(typeof data === 'undefined' || (Array.isArray(data) && data.length === 0))) {
        saveStatsData(stats, task.name, data, task.property);
    }
}

/**
 * @param {object} stats - collection of stats
 * @param {string} key - key to use to store stats
 * @param {any} data - stats to save
 * @param {object} property - stat config
 */
function saveStatsData(stats, key, data, property) {
    if (property.structure && property.structure.parentKey) {
        stats[property.structure.parentKey] = stats[property.structure.parentKey] || {};
        stats = stats[property.structure.parentKey];
    }
    stats[key] = data;
}

module.exports = Collector;

/**
 * @typedef {object} CollectionResults
 * @property {Error[]} errors - errors
 * @property {object} stats - collected data
 */
