/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assignDefaults = require('lodash/defaultsDeep');
const cloneDeep = require('lodash/cloneDeep');
const clone = require('lodash/clone');
const mergeWith = require('lodash/mergeWith');
const trim = require('lodash/trim');
const objectGet = require('lodash/get');
const fs = require('fs');
const net = require('net');
const path = require('path');
const request = require('request');
// deep require support is deprecated for versions 7+ (requires node8+)
const uuidv4 = require('uuid/v4');

const constants = require('./constants');
const logger = require('./logger');

/** @module util */

/**
 * ModuleLoader class - reusable functions for loading/unloading Node packages
 *
 * @class
 */
class ModuleLoader {}

/**
* Load a module from the given path
*
* @param {String} modulePath - path to module
*
* @returns {Object|null} module or null when failed to load module
*/
ModuleLoader.load = function (modulePath) {
    logger.debug(`Loading module ${modulePath}`);

    let module = null;
    try {
        module = require(modulePath); // eslint-disable-line
    } catch (err) {
        logger.exception(`Unable to load module ${modulePath}`, err);
    }
    return module;
};

/**
 * Unload a module from a given path
 *
 * @param {String} modulePath - path to module
 */
ModuleLoader.unload = function (modulePath) {
    try {
        delete require.cache[require.resolve(modulePath)];
        logger.debug(`Module '${modulePath}' was unloaded`);
    } catch (err) {
        logger.exception(`Exception on attempt to unload '${modulePath}' from cache`, err);
    }
};


/**
 * Promisified FS module
 */
const fsPromisified = (function promisifyNodeFsModule(fsModule) {
    function proxy(originFunc) {
        return function () {
            return new Promise((resolve, reject) => {
                const args = Array.from(arguments);
                args.push(function () {
                    const cbArgs = Array.from(arguments);
                    // error usually is first arg
                    if (cbArgs[0]) {
                        reject(cbArgs[0]);
                    } else {
                        resolve(cbArgs.slice(1));
                    }
                });
                originFunc.apply(null, args);
            });
        };
    }
    const newFsModule = Object.create(fsModule);
    Object.keys(fsModule).forEach((key) => {
        if (typeof fsModule[`${key}Sync`] !== 'undefined') {
            newFsModule[key] = proxy(fs[key]);
        }
    });
    return newFsModule;
}(fs));

/** Note: no 'class' usage to support v12.x, prototype only */
/**
 * Tracer class - useful for debug to dump streams of data.
 *
 * @class
 *
 * @param {String} name       - tracer's name
 * @param {String} tracerPath - path to file
 *
 * @property {String} name    - tracer's name
 * @property {String} path    - path to file
 * @property {Number} fd      - file descriptor
 * @property {Boolean} disabled - is tracer disabled
 */
class Tracer {
    constructor(name, tracerPath) {
        this.name = name;
        this.path = tracerPath;
        this.fd = undefined;
        this.disabled = false;
        this.touch();
    }

    /**
     * Add data to cache
     *
     * @sync
     * @private
     * @param {Any} data - data to add (should be JSON serializable)
     */
    _cacheData(data) {
        if (!this.cache) {
            this.cache = [];
        }
        while (this.cache.length >= constants.TRACER.LIST_SIZE) {
            this.cache.shift();
        }
        this.cache.push({ data, timestamp: new Date().toISOString() });
    }

    /**
     * Close file
     *
     * @async
     * @private
     * @returns {Promise} resolved once file closed
     */
    _close() {
        if (typeof this.fd === 'undefined') {
            return Promise.resolve();
        }
        logger.debug(`Closing tracer '${this.name}' stream  to file '${this.path}'`);
        return fsPromisified.close(this.fd)
            .catch((closeErr) => {
                logger.exception(`tracer._close unable to close file '${this.path}' with fd '${this.fd}'`, closeErr);
            })
            .then(() => {
                this.fd = undefined;
            });
    }

    /**
     * Merge cached data and data from file
     *
     * @param {Array<Any>} data - parsed data from file
     *
     * @returns {Array<Any>} merged data
     */
    _mergeAndResetCache(data) {
        if (this.cache) {
            if (this.cache.length >= constants.TRACER.LIST_SIZE) {
                data = this.cache.slice(this.cache.length - constants.TRACER.LIST_SIZE);
            } else {
                data = data.slice(data.length - constants.TRACER.LIST_SIZE + this.cache.length).concat(this.cache);
            }
        }
        this.cache = [];
        return data;
    }

    /**
     * Create destination directory if needed
     *
     * @async
     * @private
     * @returns {Promise} resolved once destination directory created
     */
    _mkdir() {
        const baseDir = path.dirname(this.path);
        return fsPromisified.access(baseDir, (fs.constants || fs).R_OK)
            .catch((accessErr) => {
                logger.exception(`tracer._mkdir unable to access dir '${baseDir}'`, accessErr);
                return true;
            })
            .then((needToCreate) => {
                if (needToCreate !== true) {
                    return Promise.resolve();
                }
                logger.debug(`Creating dir '${baseDir}' for tracer '${this.name}'`);
                return fsPromisified.mkdir(baseDir);
            });
    }

    /**
     * Open tracer's stream
     *
     * @async
     * @private
     * @returns {Promise} Promise resolved when new stream created or exists already
     */
    _open() {
        if (typeof this.fd !== 'undefined') {
            return Promise.resolve();
        }
        logger.debug(`Creating file '${this.path}' for tracer '${this.name}'`);
        return this._mkdir()
            .then(() => fsPromisified.open(this.path, 'w+'))
            .then((openRet) => {
                this.fd = openRet[0];
            });
    }

    /**
     * Parse data from file
     *
     * @sync
     * @private
     * @param {String} data - data from file (empty string or JSON data)
     *
     * @returns {Array<Any>} parsed data
     */
    _parse(data) {
        if (data) {
            try {
                data = JSON.parse(data);
            } catch (_) {
                data = undefined;
            }
        }
        // ignore any data that is not an array
        if (!Array.isArray(data)) {
            data = [];
        }
        return data;
    }

    /**
     * Read data from file
     *
     * @async
     * @private
     * @returns {Promise} resolved when data was read
     */
    _read() {
        return fsPromisified.fstat(this.fd)
            .then((statRet) => {
                const fileSize = statRet[0].size;
                if (!fileSize) {
                    return Promise.resolve('');
                }
                return fsPromisified.read(this.fd, Buffer.alloc(fileSize), 0, fileSize, 0)
                    .then((readRet) => {
                        const buffer = readRet[1];
                        const bytesRead = readRet[0];
                        return buffer.slice(0, bytesRead).toString(constants.TRACER.ENCODING);
                    });
            });
    }

    /**
     * Try to write cached data to file
     *
     * @async
     * @private
     * @returns {Promise} resolved once data written to file
     */
    _tryWriteData() {
        this._cacheReset = false;
        return this._open()
            .then(() => {
                // don't need to read and parse data when cache has a lot of data already
                if (this.cache.length >= constants.TRACER.LIST_SIZE) {
                    return [];
                }
                return this._read()
                    .then(this._parse.bind(this));
            })
            .then((readData) => {
                this._cacheReset = true;
                return this._mergeAndResetCache(readData);
            })
            .then(data => JSON.stringify(data, null, 4))
            .then(dataToWrite => fsPromisified.ftruncate(this.fd, 0)
                .then(() => fsPromisified.write(this.fd, dataToWrite, 0, constants.TRACER.ENCODING)))
            .catch((err) => {
                // close trace, lost data
                logger.exception(`tracer._tryWriteData unable to write data to '${this.path}' for tracer '${this.name}'`, err);
                return this._close();
            })
            .then(() => {
                this._tryWriteDataPromise = null;
                this._cacheReset = false;
                return this.disabled ? this._close() : Promise.resolve();
            });
    }

    /**
     * Schedule next attempt to write data
     *
     * @async
     * @private
     * @returns {Promise} resolved once data written to file
     */
    _write() {
        if (this.disabled) {
            return Promise.resolve();
        }
        let tryWriteDataPromise = this._tryWriteDataPromise;
        if (!tryWriteDataPromise) {
            // no one writing at this moment - need to create a new promise and store it
            tryWriteDataPromise = this._tryWriteData();
            this._tryWriteDataPromise = tryWriteDataPromise;
        } else if (this._cacheReset) {
            // too late, need to schedule next attempt right after current
            tryWriteDataPromise = tryWriteDataPromise.then(this._write.bind(this));
        }
        // else (hidden block)
        // if there is existing attempt to write data to file and cache not flushed yet
        // it means we are still on time and we can resolve this promise once current attempt resolved

        // create a new promise to avoid accidental chaining to internal promises responsible for data writing
        return new Promise(resolve => tryWriteDataPromise.then(resolve));
    }

    /**
     * Update last touch timestamp
     */
    touch() {
        this.lastGetTouch = new Date().getTime();
    }

    /**
     * Stop tracer permanently
     *
     * @async
     * @public
     * @returns {Promise} resolved once tracer stopped
     */
    stop() {
        logger.debug(`Stop tracer '${this.name}' stream  to file '${this.path}'`);
        this.disabled = true;
        // schedule file closing right after last scheduled writing attempt
        // but data that awaits for writing will be lost
        return (this._tryWriteDataPromise ? this._tryWriteDataPromise : Promise.resolve())
            .then(this._close.bind(this));
    }

    /**
     * Write data to tracer
     *
     * @async
     * @public
     * @param {Any} data - data to write to tracer (should be JSON serializable)
     *
     * @returns {Promise} resolved once data written to file
     */
    write(data) {
        if (this.disabled) {
            return Promise.resolve();
        }
        this._cacheData(data);
        return this._write();
    }
}

/**
 * Remove registered tracer
 *
 * @param {Tracer} tracer - tracer instance to remove
 *
 * @returns {Promise} resolved once tracer stopped
 */
Tracer._remove = function (tracer) {
    let promise = Promise.resolve();
    if (tracer) {
        // stop tracer to avoid re-using it
        // new tracer will be created if needed
        promise = tracer.stop();
        delete Tracer.instances[tracer.name];
    }
    return promise;
};

/**
 * Instances cache.
 *
 * @member {Object.<String, Tracer>}
 */
Tracer.instances = {};

/**
 * Get Tracer instance or create new one
 *
 * @param {String} name       - tracer name
 * @param {String} tracerPath - destination path
 *
 * @returns {Tracer} Tracer instance
 */
Tracer.get = function (name, tracerPath) {
    let tracer = Tracer.instances[name];
    if (!tracer) {
        logger.debug(`Creating new tracer instance - '${name}' file '${tracerPath}'`);
        tracer = new Tracer(name, tracerPath);
        Tracer.instances[name] = tracer;
    } else {
        logger.debug(`Updating tracer instance - '${name}' file '${tracerPath}'`);
        tracer.path = tracerPath;
        tracer.touch();
    }
    return tracer;
};

/**
 * Create tracer from config
 *
 * @param {String} className              - object's class name
 * @param {String} objName                - object's name
 * @param {Object} config                 - object's config
 * @param {String|Boolean} [config.trace] - path to file, if 'true' then default path will be used
 *
 * @returns {Tracer} Tracer object
 */
Tracer.createFromConfig = function (className, objName, config) {
    let tracer = null;
    if (config.trace) {
        objName = `${className}.${objName}`;
        let tracerPath = config.trace;
        if (config.trace === true) {
            tracerPath = path.join(constants.TRACER.DIR, objName);
        }
        tracer = Tracer.get(objName, tracerPath);
    }
    return tracer;
};

/**
 * Filter callback
 *
 * @callback Tracer~filterCallback
 * @param {Tracer} tracer - tracer object
 */

/**
 * Remove Tracer instance
 *
 * @param {String | Tracer | Tracer~filterCallback} toRemove - tracer or tracer's name to remove
 *                                                             or filter function
 *
 * @returns {Promise} resolved once matched tracers stopped
 */
Tracer.remove = function (toRemove) {
    const promises = [];
    if (typeof toRemove === 'function') {
        Object.keys(Tracer.instances).forEach((tracerName) => {
            const tracer = Tracer.instances[tracerName];
            if (toRemove(tracer)) {
                promises.push(Tracer._remove(tracer));
            }
        });
    } else {
        if (typeof toRemove !== 'string') {
            toRemove = toRemove.name;
        }
        promises.push(Tracer._remove(Tracer.instances[toRemove]));
    }
    return Promise.all(promises);
};


/**
 * Function that will attempt the promise over and over again
 *
 * @param {Function} fn              - function which returns Promise as the result of execution
 * @param {Object}   [opts]          - options object
 * @param {Array}    [opts.args]     - array of arguments to apply to the function. By default 'null'.
 * @param {Object}   [opts.context]  - context to apply to the function (.apply). By default 'null'.
 * @param {Number}   [opts.maxTries] - max number of re-try attempts. By default '1'.
 * @param {Function} [opts.callback] - callback(err) to execute when function failed.
 *      Should return 'true' to continue 'retry' process. By default 'null'.
 * @param {Number}   [opts.delay]    - a delay to apply between attempts. By default 0.
 * @param {Number}   [opts.backoff]  - a backoff factor to apply between attempts after the second try
 *      (most errors are resolved immediately by a second try without a delay). By default 0.
 *
 * @returns Promise resolved when 'fn' succeed
 */
function retryPromise(fn, opts) {
    opts = opts || {};
    opts.tries = opts.tries || 0;
    opts.maxTries = opts.maxTries || 1;

    return fn.apply(opts.context || null, opts.args || null)
        .catch((err) => {
            if (opts.tries < opts.maxTries && (!opts.callback || opts.callback(err))) {
                opts.tries += 1;
                let delay = opts.delay || 0;

                // applying backoff after the second try only
                if (opts.backoff && opts.tries > 1) {
                    /* eslint-disable no-restricted-properties */
                    delay += opts.backoff * Math.pow(2, opts.tries - 1);
                }
                if (delay) {
                    return new Promise((resolve) => {
                        setTimeout(() => resolve(retryPromise(fn, opts)), delay);
                    });
                }
                return retryPromise(fn, opts);
            }
            return Promise.reject(err);
        });
}

// cleanup options. Update tests (test/unit/utilTests.js) when adding new value
const MAKE_REQUEST_OPTS_TO_REMOVE = [
    'allowSelfSignedCert',
    'continueOnErrorCode',
    'expectedResponseCode',
    'fullURI',
    'includeResponseObject',
    'json',
    'port',
    'protocol',
    'rawResponseBody'
];

const VERSION_COMPARATORS = ['==', '===', '<', '<=', '>', '>=', '!=', '!=='];


module.exports = {
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
     * Check if object has any data or not
     *
     * @param {any} obj - object to test
     *
     * @returns {Boolean} 'true' if empty else 'false'
     */
    isObjectEmpty(obj) {
        if (obj === undefined || obj === null) {
            return true;
        }
        if (Array.isArray(obj) || typeof obj === 'string') {
            return obj.length === 0;
        }
        /* eslint-disable no-restricted-syntax */
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    },

    /**
     * Copy object (uses lodash.clone under the hood)
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} copy of source object
     */
    copy(obj) {
        return clone(obj);
    },

    /**
     * Deep Copy (uses lodash.cloneDeep under the hood).
     * Same as `copy` but copies entire object recursively
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} deep copy of source object
     */
    deepCopy(obj) {
        return cloneDeep(obj);
    },


    /**
     * Merges an Array of Objects into a single Object (uses lodash.mergeWith under the hood).
     * Note: Nested Arrays are concatenated, not overwritten.
     * Note: Passed data gets *spoiled* - copy if you need the original data
     *
     * @param {Array} collection - Array of Objects to be merged.
     *
     * @returns {Object} Object after being merged will all other Objects in the passed Array, or empty object
     *
     * Example:
     *  collection: [
     *      { a: 12, b: 13, c: [17, 18] },
     *      { b: 14, c: [78, 79], d: 11 }
     *  ]
     *  will return:
     *  {
     *      a: 12, b: 14, c: [17, 18, 78, 79], d: 11
     *  }
     */
    mergeObjectArray(collection) {
        if (!Array.isArray(collection)) {
            throw new Error('Expected input of Array');
        }
        // eslint-disable-next-line consistent-return
        function concatArrays(objValue, srcValue) {
            if (Array.isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        }

        for (let i = 1; i < collection.length; i += 1) {
            // only process elements that are Objects
            if (typeof collection[i] === 'object' && !Array.isArray(collection[i])) {
                mergeWith(collection[0], collection[i], concatArrays);
            }
        }
        // First Object in array has been merged with all other Objects - it has the complete data set.
        return collection[0] || {};
    },

    /**
     * Start function
     *
     * @returns {Object} setInterval ID (to be used by clearInterval)
     */
    start(func, args, intervalInS) {
        return setInterval(func, intervalInS * 1000, args);
    },

    /**
     * Update function
     *
     * @returns {Object} Result of function start()
     */
    update(setIntervalId, func, args, intervalInS) {
        clearInterval(setIntervalId);
        return this.start(func, args, intervalInS);
    },

    /**
     * Stop function
     *
     * @param {integer} intervalID - interval ID
     */
    stop(intervalID) {
        clearInterval(intervalID);
    },

    /**
     * LX rest operation responder
     *
     * @param {Object} restOperation  - restOperation to complete
     * @param {String} status         - HTTP status
     * @param {String} body           - HTTP body
     */
    restOperationResponder(restOperation, status, body) {
        restOperation.setStatusCode(status);
        restOperation.setBody(body);
        restOperation.complete();
    },

    /**
     * Return Node version without 'v'
     */
    getRuntimeInfo() {
        return { nodeVersion: process.version.substring(1) };
    },

    /**
     * Convert a string from camelCase to underscoreCase
     * Returns converted string
     */
    camelCaseToUnderscoreCase(str) {
        return str.split(/(?=[A-Z])/).join('_').toLowerCase();
    },

    /**
     * Compare version strings
     *
     * @param {String} version1   - version to compare
     * @param {String} comparator - comparison operator
     * @param {String} version2   - version to compare
     *
     * @returns {boolean} true or false
     */
    compareVersionStrings(version1, comparator, version2) {
        comparator = comparator === '=' ? '==' : comparator;
        if (VERSION_COMPARATORS.indexOf(comparator) === -1) {
            throw new Error(`Invalid comparator '${comparator}'`);
        }
        const v1parts = version1.split('.');
        const v2parts = version2.split('.');
        const maxLen = Math.max(v1parts.length, v2parts.length);
        let part1;
        let part2;
        let cmp = 0;
        for (let i = 0; i < maxLen && !cmp; i += 1) {
            part1 = parseInt(v1parts[i], 10) || 0;
            part2 = parseInt(v2parts[i], 10) || 0;
            if (part1 < part2) {
                cmp = 1;
            } else if (part1 > part2) {
                cmp = -1;
            }
        }
        // eslint-disable-next-line no-eval
        return eval(`0${comparator}${cmp}`);
    },

    /**
     * Stringify a message with option to pretty format
     *
     * @param {Object|String} msg - message to stringify
     * @param {Boolean} prettyFormat - format JSON string to make it easier to read
     * @returns {Object} Stringified message
     */
    stringify(msg, pretty) {
        if (typeof msg === 'object') {
            try {
                msg = pretty ? JSON.stringify(msg, null, 4) : JSON.stringify(msg);
            } catch (e) {
                // just leave original message intact
            }
        }
        return msg;
    },

    /**
     * Perform HTTP request
     *
     * @example
     * // host only
     * makeRequest(hostStr)
     * @example
     * // options only
     * makeRequest(optionsObj)
     * @example
     * // host and options
     * makeRequest(hostStr, optionsObj)
     * @example
     * // host and uri and options
     * makeRequest(hostStr, uriStr, optionsObj)
     * @example
     * // host and uri
     * makeRequest(hostStr, uriStr)
     *
     * @param {String}  [host]                         - HTTP host
     * @param {String}  [uri]                          - HTTP uri
     * @param {Object}  [options]                      - function options. Copy it before pass to function.
     * @param {String}  [options.fullURI]              - full HTTP URI
     * @param {String}  [options.protocol]             - HTTP protocol, by default http
     * @param {Integer} [options.port]                 - HTTP port, by default 80
     * @param {String}  [options.method]               - HTTP method, by default GET
     * @param {Any}     [options.body]                 - HTTP body, must be a Buffer, String or ReadStream or
     *                                                   JSON-serializable object
     * @param {Boolean} [options.json]                 - sets HTTP body to JSON representation of value and adds
     *                                                   Content-type: application/json header, by default true
     * @param {Object}  [options.headers]              - HTTP headers
     * @param {Object}  [options.continueOnErrorCode]  - continue on non-successful response code, by default false
     * @param {Boolean} [options.allowSelfSignedCert]  - do not require SSL certificates be valid, by default false
     * @param {Object}  [options.rawResponseBody]      - return response as Buffer object with binary data,
     *                                                   by default false
     * @param {Boolean} [options.includeResponseObject] - return [body, responseObject], by default false
     * @param {Array<Integer>|Integer} [options.expectedResponseCode]  - expected response code, by default 200
     * @param {Integer} [options.timeout]              - Milliseconds to wait for a socket timeout. Option
     *                                                    'passes through' to 'request' library
     * @param {String}  [options.proxy]                - proxy URI
     * @param {Boolean} [config.gzip]                  - accept compressed content from the server
     *
     * @returns {Promise.<?any>} Returns promise resolved with response
     */
    makeRequest() {
        if (arguments.length === 0) {
            throw new Error('makeRequest: no arguments were passed to function');
        }

        // rest params syntax supported by node 6+ only
        let host;
        let uri;
        let options;

        if (typeof arguments[0] === 'object') {
            options = arguments[0];
        } else if (typeof arguments[1] === 'object') {
            host = arguments[0];
            options = arguments[1];
        } else {
            host = arguments[0];
            uri = arguments[1];
            options = arguments[2];
        }

        options = this.assignDefaults(options, {
            continueOnErrorCode: false,
            expectedResponseCode: [200],
            headers: {},
            includeResponseObject: false,
            json: true,
            method: 'GET',
            port: constants.HTTP_REQUEST.DEFAULT_PORT,
            protocol: constants.HTTP_REQUEST.DEFAULT_PROTOCOL,
            rawResponseBody: false
        });
        options.headers['User-Agent'] = options.headers['User-Agent'] || constants.USER_AGENT;
        options.strictSSL = typeof options.allowSelfSignedCert === 'undefined'
            ? constants.STRICT_TLS_REQUIRED : !options.allowSelfSignedCert;

        if (options.gzip && !options.headers['Accept-Encoding']) {
            options.headers['Accept-Encoding'] = 'gzip';
        }

        if (options.rawResponseBody) {
            options.encoding = null;
        }

        if (options.json && typeof options.body !== 'undefined') {
            options.body = JSON.stringify(options.body);
        }

        uri = host ? `${options.protocol}://${host}:${options.port}${uri || ''}` : options.fullURI;
        if (!uri) {
            throw new Error('makeRequest: no fullURI or host provided');
        }
        options.uri = uri;

        const continueOnErrorCode = options.continueOnErrorCode;
        const expectedResponseCode = Array.isArray(options.expectedResponseCode)
            ? options.expectedResponseCode : [options.expectedResponseCode];
        const includeResponseObject = options.includeResponseObject;
        const rawResponseBody = options.rawResponseBody;

        MAKE_REQUEST_OPTS_TO_REMOVE.forEach((key) => {
            delete options[key];
        });

        return new Promise((resolve, reject) => {
            // using request.get, request.post, etc. - useful during unit test mocking
            request[options.method.toLowerCase()](options, (err, res, body) => {
                if (err) {
                    reject(new Error(`HTTP error: ${err}`));
                } else {
                    if (!rawResponseBody) {
                        try {
                            body = JSON.parse(body);
                        } catch (parseErr) {
                            // do nothing
                        }
                    }
                    if (includeResponseObject === true) {
                        body = [body, res];
                    }
                    if (expectedResponseCode.indexOf(res.statusCode) !== -1 || continueOnErrorCode === true) {
                        resolve(body);
                    } else {
                        const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} for ${uri}`;
                        reject(new Error(msg));
                    }
                }
            });
        });
    },

    /**
     * Base64 helper
     *
     * @param {String} action - decode|encode
     * @param {String} data - data to process
     *
     * @returns {String} Returns processed data as a string
     */
    base64(action, data) {
        // just decode for now
        if (action === 'decode') {
            return Buffer.from(data, 'base64').toString().trim();
        }
        throw new Error('Unsupported action, try one of these: decode');
    },

    /**
     * Network check - with max timeout interval (5 seconds)
     *
     * @param {String} host               - host address
     * @param {Integer} port              - host port
     * @param {Object}  [options]         - options
     * @param {Integer} [options.timeout] - timeout before fail if unable to establish connection, by default 5s.
     * @param {Integer} [options.period]  - how often to check connection status, by default 100ms.
     *
     * @returns {Promise} Returns promise resolved on successful check
     */
    networkCheck(host, port, options) {
        let done = false;
        const connectPromise = new Promise((resolve, reject) => {
            const client = net.createConnection({ host, port })
                .on('connect', () => {
                    client.end();
                })
                .on('end', () => {
                    done = true;
                    resolve();
                })
                .on('error', (err) => {
                    done = 'error';
                    reject(err);
                });
        });

        options = this.assignDefaults(options, {
            period: 100,
            timeout: 5 * 1000
        });
        if (options.timeout <= options.period) {
            options.period = options.timeout;
        }
        const timeoutPromise = new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                options.timeout -= options.period;

                const fail = () => {
                    clearInterval(interval);
                    reject(new Error(`unable to connect: ${host}:${port} (timeout exceeded)`)); // max timeout, reject
                };

                if (done === true) {
                    clearInterval(interval);
                    resolve(); // connection success, resolve
                } else if (done === 'error') {
                    fail();
                } else if (options.timeout <= 0) {
                    fail();
                }
            }, options.period);
        });

        return Promise.all([connectPromise, timeoutPromise])
            .then(() => true)
            .catch((e) => {
                throw new Error(`networkCheck: ${e}`);
            });
    },

    /**
     * Get random number from range
     *
     * @param {Number} min - left boundary
     * @param {Number} max - right boundary
     *
     * @returns {Number} random number from range
     */
    getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Rename keys in an object at any level of depth if it passes the given regular expression test.
     *
     * @param {Object}                target         - object to be modified
     * @param {Regular Expression}    match          - regular expression to test
     * @param {String}                replacement    - regular expression match replacement
     */
    renameKeys(target, match, replacement) {
        if (target !== null && typeof target === 'object') {
            Object.keys(target).forEach((member) => {
                this.renameKeys(target[member], match, replacement);
                if (match.test(member)) {
                    const newMember = member.replace(match, replacement);
                    target[newMember] = target[member];
                    delete target[member];
                }
            });
        }
    },

    /**
     * Trim a specific character or string from the beginning or end of a string
     *
     * @param {String}  string      - The full string to be trimmed
     * @param {String}  toRemove    - The character or string to remove
     *
     * @returns {String}    The trimmed string
     */
    trimString(string, toRemove) {
        return trim(string, toRemove);
    },

    /**
     * Generate a random UUID (v4 RFC4122)
     * Uses uuid.v4 under the hood
     *
     * @returns {String}    The UUID value
     */
    generateUuid() {
        return uuidv4();
    },

    /**
     * Convenience method to get value of property on an object given a path
     * Uses lodash.get under the hood
     *
     * @param {Object}  object              - the object to query
     * @param {Array|String}  propertyPath  - property path (e.g. child1.prop1[0].child2)
     * @param {*} defaultValue              - the value to return if property not found. default is undefined
     *
     * @returns {*}    Resolved value of the object property
     */
    getProperty(object, propertyPath, defaultValue) {
        return objectGet(object, propertyPath, defaultValue);
    },

    /** @see Tracer */
    tracer: Tracer,

    /** @see ModuleLoader */
    moduleLoader: ModuleLoader,

    /** @see retryPromise */
    retryPromise,

    /**
     * @see fs
     */
    fs: fsPromisified
};
