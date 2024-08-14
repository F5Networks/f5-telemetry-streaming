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

const querystring = require('querystring');

const assert = require('../utils/assert');
const constants = require('../constants');
const defaultLogger = require('../logger');
const deviceUtil = require('../utils/device');
const promiseUtil = require('../utils/promise');
const retryPromise = require('../utils/promise').retry;
const TaskQueue = require('../utils/taskQueue');
const util = require('../utils/misc');

/**
 * @module systemPoller/loader
 *
 * @typedef {import('../../logger').Logger} Logger
 * @typedef {import('../../utils/config').Connection} Connection
 * @typedef {import('../../utils/config').Credentials} Credentials
 * @typedef {import('../../utils/taskQueue').TaskInfo} TaskInfo
 * @typedef {import('../../utils/taskQueue').TaskQueue} TaskQueue
 * @typedef {import('../../utils/taskQueue').TaskCallback} TaskCallback
 */

/**
 * F5 BIG-IP REST API Endpoint Loader
 *
 * @property {number} chunkSize
 * @property {Connection} connection
 * @property {Credentials} credentials
 * @property {string} host
 * @property {Logger} logger
 */
class Loader {
    /**
     * Constructor
     *
     * @param {string} host - host
     * @param {object} options - options
     * @param {Logger} options.logger - parent logger
     * @param {HttpAgent} [options.agent] - HTTP agent
     * @param {number} [options.chunkSize = constants.SYSTEM_POLLER.CHUNK_SIZE] - number of items in response
     * @param {Credentials} [options.credentials] - F5 Device credentials
     * @param {null | string} [options.credentials.token] - F5 Device authorization token
     * @param {Connection} [options.connection] - F5 Device connection settings
     * @param {number} [options.workers = constants.SYSTEM_POLLER.WORKERS] - number of workers
     */
    constructor(host, {
        agent = undefined,
        chunkSize = constants.SYSTEM_POLLER.CHUNK_SIZE,
        connection = undefined,
        credentials = undefined,
        logger = undefined,
        workers = constants.SYSTEM_POLLER.WORKERS
    } = {}) {
        assert.string(host, 'target host');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');
        assert.safeNumberBetweenInclusive(chunkSize, 1, Number.MAX_SAFE_INTEGER, 'chunkSize');
        assert.safeNumberBetweenInclusive(workers, 1, Number.MAX_SAFE_INTEGER, 'workers');
        assert.bigip.credentials(host, credentials, 'credentials');

        if (connection) {
            assert.bigip.connection(connection, 'connection');
        }

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            _agent: {
                value: agent
            },
            chunkSize: {
                value: chunkSize
            },
            connection: {
                value: util.deepFreeze(util.deepCopy(connection))
            },
            credentials: {
                value: util.deepCopy(credentials || {})
            },
            host: {
                value: host
            },
            logger: {
                value: logger.getChild(`${this.constructor.name}[${host}]`)
            }
        });
        Object.defineProperties(this, {
            _taskQueue: {
                value: new TaskQueue(processTask.bind(this), {
                    concurrency: workers,
                    logger: this.logger,
                    usePriority: true
                })
            }
        });

        this.logger.debug(`Task queue "${this._taskQueue.name}" configured with concurrency = ${this._taskQueue.concurrency}`);

        this._endpoints = {};
        this.eraseCache();
    }

    /** @returns {void} once successfully authenticated */
    async auth() {
        if (typeof this.credentials.token !== 'undefined') {
            return;
        }
        // in case of optimization, replace with Object.assign
        this.credentials.token = (await deviceUtil.getAuthToken(
            this.host,
            this.credentials.username,
            this.credentials.passphrase,
            cloneConnectionOptions.call(this)
        )).token;
        util.deepFreeze(this.credentials);
    }

    /** Erases cached response */
    eraseCache() {
        this._cache = {};
    }

    /**
     * Sending request to REST API endpoint and parses response
     *
     * @param {string} endpoint - endpoint name/key to fetch data from
     * @param {object} [options] - function options
     * @param {object} [options.replaceStrings] - key/value pairs that replace matching strings in request body
     *
     * @returns {FetchedData} FetchedData object once response processed
     */
    async loadEndpoint(endpoint, { replaceStrings = undefined } = {}) {
        let endpointObj = this._endpoints[endpoint];
        assert.defined(endpointObj, 'endpointObj');

        // copy top-level properties to avoid mutation of original object
        endpointObj = Object.assign({}, endpointObj);
        if (endpointObj.pagination) {
            endpointObj.query = Object.assign({
                $top: this.chunkSize
            }, endpointObj.query || {});
        }

        if (endpointObj.query) {
            const query = querystring.stringify(endpointObj.query);
            endpointObj.path = `${endpointObj.path}?${query}`;
            delete endpointObj.query;
        }

        if (typeof replaceStrings === 'object') {
            endpointObj.body = replaceBodyVars(endpointObj.body, replaceStrings);
        }

        /**
         * works well for custom and default endpoints:
         * - ignoreCached !== false always evaluates to `true` for custom endpoints
         */
        const allowCachedData = !(
            endpointObj.pagination
            || !!endpointObj.ignoreCached !== false
            || endpointObj.body
        );
        let response;

        if (allowCachedData && typeof this._cache[endpointObj.path] !== 'undefined') {
            response = this._cache[endpointObj.path];
        }
        if (response && typeof response.data !== 'undefined') {
            this.logger.verbose(`Using cached data for "${endpoint}"`);
            // cached response
            return response.data;
        }

        response = response || {};
        if (!response.promise) {
            response.promise = getAndExpandData.call(this, endpointObj)
                .then((data) => {
                    delete response.promise;
                    response.data = data;
                })
                .catch((error) => {
                    if (allowCachedData) {
                        delete this._cache[endpointObj.path];
                    }
                    error.message = `Unable to get response from endpoint "${endpoint}": ${error.message}`;
                    return Promise.reject(error);
                });

            if (allowCachedData) {
                this._cache[endpointObj.path] = response;
            }
        } else {
            this.logger.verbose(`Using cached data for "${endpoint}"`);
        }

        await response.promise;
        return response.data;
    }

    /**
     * Set endpoints definition
     *
     * @param {Endpoint[]} newEndpoints - list of endpoints to add
     */
    setEndpoints(newEndpoints) {
        assert.array(newEndpoints);

        this._endpoints = {};
        newEndpoints.forEach((endpoint) => {
            assert.bigip.endpoint(endpoint, 'endpoint');
            // if 'name' presented then use it as unique ID
            // otherwise use path prop
            const key = endpoint.name || endpoint.path;
            if (typeof this._endpoints[key] !== 'undefined') {
                this.logger.debug(`Endpoint with key "${key}" exists already!`);
            }
            this._endpoints[key] = endpoint;
        });
    }
}

/**
 * @this Loader
 *
 * @returns {Connection | undefined} copied connection options
 */
function cloneConnectionOptions() {
    const opts = this.connection ? Object.assign({}, this.connection) : {};
    opts.agent = this._agent;
    return opts;
}

/**
 * @this Loader
 *
 * @param {Endpoint} endpointObj - endpoint object
 * @param {FetchedData} data - fetched data
 *
 * @returns {FetchedData[]} array of FetchedData
 */
async function expandReferences(endpointObj, data) {
    const promises = [];
    const dataItems = data.data.items;

    if (endpointObj.expandReferences && dataItems && Array.isArray(dataItems) && dataItems.length) {
        // for now let's just support a single reference
        const referenceKey = Object.keys(endpointObj.expandReferences)[0];
        const referenceObj = endpointObj.expandReferences[referenceKey];

        for (let i = 0; i < dataItems.length; i += 1) {
            const item = dataItems[i][referenceKey];
            if (item && item.link) {
                let referenceEndpoint = getURIPath(item.link);
                // Process '/stats' endpoint first, before modifying referenceEndpoint url
                if (referenceObj.includeStats) {
                    promises.push(promisifyTask.call(this, {
                        uri: `${referenceEndpoint}/stats`,
                        options: { name: i, refKey: referenceKey }
                    }));
                }
                if (referenceObj.endpointSuffix) {
                    referenceEndpoint = `${referenceEndpoint}${referenceObj.endpointSuffix}`;
                }
                promises.push(promisifyTask.call(this, {
                    uri: referenceEndpoint,
                    options: { name: i, refKey: referenceKey }
                }));
            }
        }
    }

    return promiseUtil.getValues(await promiseUtil.allSettled(promises));
}

/**
 * Fetch stats for each item
 *
 * @this Loader
 *
 * @param {Endpoint} endpointObj - endpoint object
 * @param {FetchedData} data - data
 *
 * @returns {FetchedData[]} array of FetchedData
 */
async function fetchStats(endpointObj, data) {
    const promises = [];
    const dataItems = data.data.items;

    if (endpointObj.includeStats && dataItems && Array.isArray(dataItems) && dataItems.length) {
        for (let i = 0; i < dataItems.length; i += 1) {
            const item = dataItems[i];
            // check for selfLink property
            if (item.selfLink) {
                promises.push(promisifyTask.call(this, {
                    uri: `${getURIPath(item.selfLink)}/stats`,
                    options: {
                        name: i
                    }
                }));
            }
        }
    }

    return promiseUtil.getValues(await promiseUtil.allSettled(promises));
}

/**
 * @this Loader
 *
 * @param {Endpoint} endpointObj - endpoint object
 * @param {string} path - URI path to get data from
 *
 * @returns {Promise<module:Loader~FetchedData>} FetchedData for endpointObj
 */
async function getAndExpandData(endpointObj, path) {
    // baseData in this method is the data fetched from endpointObj.path
    const baseData = await promisifyTask.call(this, {
        uri: path || endpointObj.path,
        options: endpointObj,
        priority: constants.TASK.HIGH_PRIORITY
    });

    const nextLink = baseData.data.nextLink;
    delete baseData.data.nextLink;

    let response = await expandReferences.call(this, endpointObj, baseData);
    substituteData(baseData, response, false);

    response = await fetchStats.call(this, endpointObj, baseData);
    substituteData(baseData, response, true);

    if (!nextLink) {
        return baseData;
    }
    const nextBaseData = await getAndExpandData.call(this, endpointObj, getURIPath(nextLink, true));

    if (typeof baseData.data.entries === 'object' && typeof nextBaseData.data.entries === 'object'
        && !Array.isArray(baseData.data.entries) && !Array.isArray(nextBaseData.data.entries)) {
        Object.assign(baseData.data.entries, nextBaseData.data.entries);
    } else if (Array.isArray(baseData.data.items) && Array.isArray(nextBaseData.data.items)) {
        baseData.data.items.push(...nextBaseData.data.items);
    } else {
        this.logger.warning(`Unable to merge additional data (nextLink=${nextLink})`);
    }
    return baseData;
}

/**
 * Get URI path
 *
 * @param {string} uri - full URI
 * @param {boolean} [keepQueryStr = false] - retain query string as part of the path
 *
 * @returns {string} URI path
 */
function getURIPath(uri, keepQueryStr = false) {
    assert.string(uri, 'uri');
    assert.boolean(keepQueryStr, 'keepQueryStr');

    uri = uri.replace('https://localhost', '');
    return keepQueryStr ? uri : uri.split('?')[0];
}

/**
 * Get data for specific endpoint
 *
 * @implements {TaskCallback}
 * @this Loader
 *
 * @param {EndpointTask} task - current task
 * @param {function} done - callback to call once done
 * @param {TaskInfo} info - task's metadata
 */

async function processTask(task, done, info) {
    const options = task.options;
    const parseDuplicateKeys = options.parseDuplicateKeys === true;

    const retryOpts = {
        maxTries: 3,
        backoff: 100
    };

    this.logger.verbose(`Sending query to "${task.uri}" (${info.taskID})`);

    return retryPromise(() => {
        const httpOptions = cloneConnectionOptions.call(this);
        httpOptions.credentials = this.credentials;

        if (parseDuplicateKeys) {
            httpOptions.rawResponseBody = true;
        }
        if (options.body) {
            httpOptions.method = 'POST';
            httpOptions.body = options.body;
            if (typeof httpOptions.body !== 'object') {
                httpOptions.json = false;
            }
        }

        return deviceUtil.makeDeviceRequest(this.host, task.uri, httpOptions);
    }, retryOpts)
        .then((data) => {
            if (parseDuplicateKeys) {
                data = util.parseJsonWithDuplicateKeys(data.toString());
            }
            const ret = {
                name: options.name !== undefined ? options.name : task.uri,
                data
            };
            if (options.refKey) {
                ret.refKey = options.refKey;
            }
            task.cb(null, ret);
        })
        .catch((err) => task.cb(err, null))
        .then(done);
}

/**
 * @param {EndpointTask} task
 *
 * @returns {Promise<FetchedData>} resolve once task completed
 */
function promisifyTask(task) {
    return new Promise((resolve, reject) => {
        assert.string(task.uri, 'task.uri');
        assert.object(task.options, 'task.options');

        if (typeof task.priority === 'undefined') {
            task.priority = constants.TASK.LOW_PRIORITY;
        } else {
            assert.safeNumberGrEq(task.priority, 0, 'task.priority');
        }

        task.cb = (err, ret) => {
            if (err) {
                reject(err);
            } else {
                resolve(ret);
            }
        };
        this._taskQueue.push(task);
    });
}

/**
 * Substitute data
 *
 * @param {FetchedData} baseData - base data
 * @param {FetchedData[]} dataArray - array of data to use for substitution
 * @param {boolean} shallowCopy - true if shallow copy required else original object will be used
 */
function substituteData(baseData, dataArray, shallowCopy) {
    if (!dataArray.length) {
        return;
    }
    const baseDataItems = baseData.data.items;
    dataArray.forEach((data) => {
        try {
            let dataToSubstitute;
            if (shallowCopy === true) {
                dataToSubstitute = Object.assign(data.data, baseDataItems[data.name]);
            } else {
                dataToSubstitute = data.data;
            }
            if (data.refKey) {
                // if this is the first time substituting data, overwrite the containing object with data
                // e.g.
                // itemsRef: {
                //    link: 'http://objLink/objItems',
                //    isSubcollection: true
                // }
                // will become:
                // itemsRef: {
                //    objItemProp1: 123 //data from link
                // }
                if (baseDataItems[data.name][data.refKey].link) {
                    baseDataItems[data.name][data.refKey] = dataToSubstitute;
                } else {
                    // otherwise if same object has been previously substituted
                    // and we're merging new set of props from a different link (e.g. objItems/stats)
                    // then copy over the properties of the new dataToSubstitute
                    // e.g.
                    // itemsRef: {
                    //     objItemProp1: 123
                    //     objItemProp2: true
                    // }
                    Object.assign(baseDataItems[data.name][data.refKey], dataToSubstitute);
                }
            } else {
                baseDataItems[data.name] = dataToSubstitute;
            }
        } catch (e) {
            // just continue
        }
    });
}

/**
 * Replace variables in body with values
 *
 * @param {object | string} body - request body
 * @param {object} keys - keys/vars to replace
 *
 * @returns {object | string} copy of data with replaced pieces
 */
function replaceBodyVars(body, keys) {
    assert.oneOfAssertions(
        () => assert.object(body, 'body'),
        () => assert.string(body, 'body')
    );
    assert.object(keys, 'keys');

    let isObject = false;
    if (typeof body !== 'string') {
        isObject = true;
        body = JSON.stringify(body);
    }
    Object.keys(keys).forEach((key) => {
        body = body.replace(new RegExp(key), keys[key]);
    });
    if (isObject) {
        body = JSON.parse(body);
    }
    return body;
}

module.exports = Loader;

/**
 * Options to use to expand reference
 *
 * @typedef {object} ExpandReferencesOpts
 * @property {string} [endpointSuffix] - URI suffix to use to modify link
 * @property {boolean} [includeStats] - include response from /stats
 */
/**
 * References to expand
 *
 * @typedef {object.<string, ExpandReferencesOpts} ExpandReferences
 */
/**
 * @typedef {object} Endpoint
 * @param {object | string} [body] - body to send to endpoint
 * @param {ExpandReferences} [expandReferences] - references to expand
 * @param {boolean} [includeStats] - include stats for each object
 * @param {string} [name] - endpoint's name
 * @param {string} [path] - endpoint's URI
 */
/**
 * @typedef {object} EndpointTask
 * @property {string} uri - endpoint URI
 * @property {object} [options] - endpoint options
 * @property {string} [options.body] - body to send, sent via POST request
 * @property {string} [options.name] - name of key to store as, will override default of uri
 * @property {boolean} [options.parseDuplicateKeys] - whether or not to support parsing JSON with duplicate keys
 * @property {string} [options.refKey] - reference key
 * @property {number} [priority = LOW] - task priority
 */
/**
 * Fetched data
 *
 * @typedef {object} FetchedData
 * @param {object} data - fetched data
 * @param {string} name - name for this set of data
 * @param {string} [refKey] - reference key
 */
