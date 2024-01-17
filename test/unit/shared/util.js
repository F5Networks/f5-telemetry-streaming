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

const assignDefaults = require('lodash/defaultsDeep');
const deepCopy = require('lodash/cloneDeep');
const fsUtil = require('fs');
const nock = require('nock');
const pathUtil = require('path');
const sinon = require('sinon');
const urllib = require('url');

const assert = require('./assert');
const systemPollerData = require('../../../examples/output/system_poller/output.json');
const avrData = require('../consumers/data/avrData.json');
const ltmData = require('../consumers/data/ltmData.json');

function MockRestOperation(opts) {
    opts = opts || {};
    this.method = opts.method || 'GET';
    this.contentType = opts.contentType || '';
    this.body = opts.body;
    this.headers = opts.headers || null; // according to origin class in restnoded
    this.statusCode = null;
    this.uri = {};
    this.uri.pathname = opts.uri;
}
MockRestOperation.prototype.getBody = function () { return this.body; };
MockRestOperation.prototype.setBody = function (body) { this.body = body; };
MockRestOperation.prototype.getContentType = function () { return this.contentType; };
MockRestOperation.prototype.setContentType = function (ct) { this.contentType = ct; };
MockRestOperation.prototype.getHeaders = function () { return this.headers; };
MockRestOperation.prototype.setHeaders = function (headers) { this.headers = headers; };
MockRestOperation.prototype.getMethod = function () { return this.method; };
MockRestOperation.prototype.setMethod = function (method) { this.method = method; };
MockRestOperation.prototype.getStatusCode = function () { return this.statusCode; };
MockRestOperation.prototype.setStatusCode = function (code) { this.statusCode = code; };
MockRestOperation.prototype.getUri = function () { return this.uri; };
MockRestOperation.prototype.complete = function () { };
MockRestOperation.prototype.parseAndSetURI = function (uri) { this.uri = module.exports.parseURL(uri); };

/**
 * Logger mock object
 *
 * @param {Object} [options]          - options when setting up logger mock
 * @param {String} [options.logLevel] - log level to use. Default=verbose.
 */
function MockLogger(options) {
    const opts = options || {};
    this.logLevel = opts.logLevel || 'verbose';

    this.setLogLevel = function (newLevel) {
        this.logLevel = newLevel;
    };
    // Stubbed functions
    this.error = sinon.stub();
    this.debug = sinon.stub();
    this.info = sinon.stub();
    this.exception = sinon.stub();
    this.verbose = sinon.stub();
    this.warning = sinon.stub();
    // returns() returns the value passed at initialization - callsFake() uses CURRENT value
    this.getLevelName = sinon.stub().callsFake(() => this.logLevel);
}

/**
 * Tracer mock object
 */
function MockTracer() {
    this.write = sinon.stub();
}

// eslint-disable-next-line no-multi-assign
const _module = module.exports = {
    MockRestOperation,
    MockLogger,
    MockTracer,

    /**
     * Assign defaults to object (uses lodash.defaultsDeep under the hood)
     * Note: check when working with arrays, as values may be merged incorrectly
     *
     * @param {Object} obj      - object to assign defaults to
     * @param {...Object} defaults - defaults to assign to object
     *
     * @returns {Object}
     */
    assignDefaults,

    /**
     * Deep copy
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} deep copy of source object
     */
    deepCopy,

    /**
     * Generates a consumer config
     *
     * @param {Object} [options]                     - options to pass to context builder
     * @param {String} [options.eventType]           - which event type to return
     * @param {Object} [options.config]              - optional config to inject into context
     * @param {String} [options.loggerOpts.logLevel] - log level to initialize Logger with
     *
     * @returns {Object} Returns object representing consumer config
     */
    buildConsumerContext(options) {
        let data;
        const opts = options || {};

        switch (opts.eventType) {
        case 'systemInfo':
            data = this.deepCopy(systemPollerData);
            break;
        case 'AVR':
            data = this.deepCopy(avrData);
            break;
        case 'LTM':
            data = this.deepCopy(ltmData);
            break;
        default:
            data = {};
        }
        const context = {
            config: opts.config || {},
            event: {
                data,
                type: opts.eventType || ''
            },
            logger: new MockLogger(opts.loggerOpts),
            tracer: new MockTracer(),
            metadata: opts.metadata
        };
        return context;
    },

    /**
     * FS utils
     */
    fs: {
        /**
         * Reads the contents of a directory
         *
         * @param {string | Array<string>} directory - directory or list of directories
         *  to list (absolute or relative to process.cwd())
         * @param {object} [options] - options
         * @param {boolean} [options.recursive] - read the directory recursively
         *
         * @returns {Array<string>} resolved with list of files in the directory
         */
        listFiles(directory, options) {
            options = assignDefaults({}, options, {
                recursive: true
            });
            const files = [];
            const recursive = !!options.recursive;
            const stack = [];

            function scanDir(path) {
                fsUtil.readdirSync(path).forEach((childNode) => {
                    const nodePath = pathUtil.join(path, childNode);
                    const stat = fsUtil.statSync(nodePath);
                    (stat.isFile() ? files : stack).push(nodePath);
                });
            }

            (Array.isArray(directory) ? directory : [directory]).forEach((path) => {
                if (fsUtil.statSync(path).isFile()) {
                    files.push(path);
                } else {
                    scanDir(path);
                }
            });

            if (recursive) {
                while (stack.length > 0) {
                    scanDir(stack.shift());
                }
            }
            return files;
        }
    },

    /**
     * Returns mocha's 'it' or 'it.only'
     *
     * @param {Object} testConf - test config
     * @param {Object} [testConf.testOpts] - test options
     * @param {Boolean} [testConf.testOpts.only] - true if use .only
     *
     * @returns {Function} mocha's 'it' function
     */
    getCallableIt(testConf) {
        return testConf.testOpts && testConf.testOpts.only ? it.only : it;
    },

    /**
     * Returns mocha's 'describe' or 'describe.only'
     *
     * @param {Object} testConf - test config
     * @param {Object} [testConf.testOpts] - test options
     * @param {Boolean} [testConf.testOpts.only] - true if use .only
     *
     * @returns {Function} mocha's 'describe' function
     */
    getCallableDescribe(testConf) {
        return testConf.testOpts && testConf.testOpts.only ? describe.only : describe;
    },

    /**
     * Setup endpoints mocks via nock
     *
     * @param {Array}   endpointMocks                     - array of mocks
     * @param {String}  endpointMocks[].endpoint          - endpoint
     * @param {String}  [endpointMocks[].method]          - request method, by default 'get'
     * @param {Any}     [endpointMocks[].request]         - request body
     * @param {Object}  [endpointMocks[].requestHeaders]  - request headers
     * @param {Any}     [endpointMocks[].response]        - response body
     * @param {Object}  [endpointMocks[].responseHeaders] - response headers
     * @param {Integer} [endpointMocks[].code]            - response code, by default 200
     * @param {Integer} [endpointMocks[].options.times]   - repeat response N times
     * @param {Object}  [options]                         - options
     * @param {String}  [options.host]                    - host, by default 'localhost'
     * @param {Integer} [options.port]                    - port, by default 8100
     * @param {String}  [options.proto]                   - protocol, by default 'http'
     * @param {Function} [options.responseChecker]        - function to check response
     */
    mockEndpoints(endpointMocks, options) {
        options = options || {};
        endpointMocks.forEach((endpointMock) => {
            let mockOpts;
            if (typeof endpointMock.requestHeaders !== 'undefined') {
                mockOpts = {
                    reqheaders: endpointMock.requestHeaders
                };
            }

            const hostMock = nock(`${options.proto || 'http'}://${options.host || 'localhost'}:${options.port || 8100}`, mockOpts);

            let request = endpointMock.request;
            if (typeof request === 'object') {
                request = this.deepCopy(request);
            }
            let apiMock = hostMock[(endpointMock.method || 'GET').toLowerCase()](endpointMock.endpoint, request);
            if (endpointMock.options) {
                const opts = endpointMock.options;
                if (opts.times) {
                    apiMock = apiMock.times(opts.times);
                }
                // whether to persist nock scope interception until nock.cleanAll()
                if (opts.persistScope === true) {
                    hostMock.persist();
                }
            }
            let response = endpointMock.response;
            if (typeof response === 'object') {
                // deep copy in any case, do not rely on nock lib
                response = this.deepCopy(response);
            }
            if (options.responseChecker) {
                if (typeof response === 'object') {
                    options.responseChecker(endpointMock, response);
                } else if (typeof response === 'function') {
                    const originResponse = response;
                    response = (uri, requestBody) => {
                        const ret = originResponse(uri, requestBody);
                        options.responseChecker(endpointMock, ret);
                        return ret;
                    };
                }
            }
            apiMock.reply(endpointMock.code || 200, response, endpointMock.responseHeaders);
        });
    },

    /**
     * Check if nock has unused mocks and raise assertion error if so
     *
     * @param {Object} nockInstance - instance of nock library
     */
    checkNockActiveMocks(nockInstance) {
        const activeMocks = nockInstance.activeMocks().join('\n');
        assert.ok(
            activeMocks.length === 0,
            `nock should have no active mocks after the test, instead mocks are still active:\n${activeMocks}\n`
        );
    },

    /**
     * Create validator to validate if data was spoiled.
     *
     * @param {Any} source - source data
     *
     * @throws {AssertionError} when data not equal to it's original state
     * @returns {Function} that returns 'true' if data was not spoiled
     */
    getSpoiledDataValidator() {
        const getValidator = (idx, copy, src) => () => {
            assert.deepStrictEqual(src, copy, `Original data at index ${idx} was spoiled...`);
            return true;
        };
        const validators = [];
        for (let i = 0; i < arguments.length; i += 1) {
            validators.push(getValidator(i, this.deepCopy(arguments[i]), arguments[i]));
        }
        return () => validators.every((validator) => validator());
    },

    /**
     * Get function to parse URL according to node.js version
     *
     * @returns {Function(url)} function to parse URL into URL object
     */
    parseURL: (function () {
        if (process.versions.node.startsWith('4.')) {
            return urllib.parse;
        }
        return (url) => new urllib.URL(url);
    }()),

    /**
     * Cartesian product of input iterables
     *
     * @returns {Array<Array>}
     */
    product() {
        const results = [];
        // ignore empty arrays
        const args = Array.from(arguments);
        // even 1 empty array results in empty output
        if (args.length === 0 || !args.every((arr) => arr.length)) {
            return results;
        }
        // list of indexes for each input iterable
        const indexes = args.map(() => 0);
        const firstArrLength = args[0].length;
        // when index for first array exceed its length then we are done
        while (indexes[0] < firstArrLength) {
            // create 'product' based on index for each iterable
            results.push(indexes.map((idx, argIdx) => args[argIdx][idx]));
            // calculate next index for each iterable
            for (let i = indexes.length - 1; i >= 0; i -= 1) {
                indexes[i] += 1;
                if (indexes[i] < args[i].length) {
                    break;
                }
                if (i !== 0) { // ignore index for first iterable - see 'while' above
                    indexes[i] = 0;
                }
            }
        }
        return results;
    },

    /**
     * Load modules from folder (or file)
     *
     * @param {String | Array<String>} paths - path(s) to load (absolute or relative to process.cwd())
     * @param {Object} [options] - options
     * @param {Boolean} [options.recursive = true] - walk through paths recursively
     *
     * @returns {Object} object with loaded data where key is path to file and value is loaded module
     */
    loadModules(paths, options) {
        options = assignDefaults({}, options, {
            recursive: true
        });
        const loadedFiles = {};
        const stack = Array.isArray(paths) ? paths.slice(0) : [paths];

        while (stack.length > 0) {
            const path = stack.shift();
            // - if folder then trying to load index.js
            // - if file then trying to load file itself
            try {
                // resolve path to make it absolute otherwire 'require'
                // will use this module's directory as relative to the path
                // eslint-disable-next-line import/no-dynamic-require, global-require
                loadedFiles[path] = require(pathUtil.resolve(path));
                // eslint-disable-next-line no-continue
                continue;
            } catch (loadError) {
                const stat = fsUtil.statSync(path);
                if (stat.isFile() || !stat.isDirectory()) {
                    throw loadError;
                }
            }
            // it is directory, let's walk through it
            fsUtil.readdirSync(path).forEach((childPath) => {
                if (!options.recursive) {
                    const stat = fsUtil.statSync(pathUtil.join(path, childPath));
                    if (stat.isDirectory()) {
                        return;
                    }
                }
                stack.push(pathUtil.join(path, childPath));
            });
        }
        return loadedFiles;
    },

    /**
     * Sleep for N ms.
     *
     * @returns {Promise} resolved once N .ms passed
     */
    sleep(sleepTime) {
        return new Promise((resolve) => { setTimeout(resolve, sleepTime); });
    },

    /**
     * Sort all arrays in data
     *
     * @param {any} data
     */
    sortAllArrays(data) {
        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                data.sort();
            }
            Object.keys(data).forEach((k) => _module.sortAllArrays(data[k]));
        }
        return data;
    },

    /**
     * Wait till callback returns true or throws exception
     *
     * @param {function} cb - callback to call (async or sync)
     * @param {number} [delay=0] - delay before next call
     *
     * @returns {Promise} resolved once `cb` returned true. Has `.cancel()` method
     *  to cancel and reject promise
     */
    waitTill(cb, delay) {
        let timeoutID;
        let promiseReject;
        const promise = new Promise((resolve, reject) => {
            promiseReject = reject;
            (function inner() {
                timeoutID = setTimeout(
                    () => {
                        timeoutID = null;
                        Promise.resolve()
                            .then(() => cb())
                            .then(
                                (ret) => {
                                    if (ret && promiseReject) {
                                        resolve();
                                    }
                                    return !ret && !!promiseReject;
                                },
                                (err) => {
                                    if (promiseReject) {
                                        promiseReject(err);
                                    }
                                    return false;
                                }
                            )
                            .then((keep) => {
                                if (keep && promiseReject) {
                                    inner();
                                } else {
                                    promiseReject = null;
                                }
                            });
                    },
                    delay || 0
                );
            }());
        });
        promise.cancel = () => {
            if (timeoutID !== null) {
                clearTimeout(timeoutID);
                timeoutID = null;
            }
            if (promiseReject) {
                promiseReject(new Error('canceled'));
                promiseReject = null;
            }
        };
        return promise;
    }
};
