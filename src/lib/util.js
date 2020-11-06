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
function ModuleLoader() {}

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
 */
function Tracer(name, tracerPath) {
    this.name = name;
    this.path = tracerPath;
    this.stream = undefined;
    this.inode = undefined;
    this.timeoutID = undefined;
    this.isTruncated = false;
    this.state = Tracer.STATE.NEW;
    this.touch();
}

/**
 * Interval to check if file needs to be reopened
 *
 * @member {Integer}
 */
Tracer.REOPEN_INTERVAL = 15000;

/**
 * Tracer states
 *
 * @private
 */
Tracer.STATE = Object.freeze({
    /** @private */
    NEW: 'NEW',
    /** @private */
    INIT: 'INIT',
    /** @private */
    CREATED: 'CREATED',
    /** @private */
    READY: 'READY',
    /** @private */
    CLOSING: 'CLOSING',
    /** @private */
    CLOSED: 'CLOSED',
    /** @private */
    REOPEN: 'REOPEN',
    /** @private */
    STOP: 'STOP'
});

/**
 * Remove schedule 'reopen' function
 *
 * @private
 */
Tracer.prototype.removeScheduledReopen = function () {
    if (this.timeoutID) {
        clearTimeout(this.timeoutID);
        this.timeoutID = undefined;
    }
};

/**
 * Set state
 *
 * @private
 * @param {String} newState - tracer's new state
 */
Tracer.prototype._setState = function (newState) {
    // reject any state if current is STOP
    if (this.state === Tracer.STATE.STOP) {
        return;
    }
    const oldState = this.state;
    this.state = newState;
    logger.debug(`Tracer '${this.name}' changed state from ${oldState} to ${newState}`);
};

/**
 * Mark tracer as ready
 *
 * @private
 */
Tracer.prototype._setReady = function () {
    this._updateInode();
    this.reopenIfNeeded(true);
    this._setState(Tracer.STATE.READY);
};

/**
 * Mark tracer as closed
 *
 * @private
 */
Tracer.prototype._setClosed = function () {
    this.removeScheduledReopen();
    this.stream = undefined;
    this.inode = undefined;
    this._setState(Tracer.STATE.CLOSED);
    logger.info(`Tracer '${this.name}' stream to file '${this.path}' closed`);
};

/**
 * Mark tracer as closing
 *
 * @private
 */
Tracer.prototype._setClosing = function () {
    logger.debug(`Closing tracer '${this.name}' stream to file '${this.path}'`);
    if (this.stream) {
        this.stream.end();
        this.stream = undefined;
    }
    this._setState(Tracer.STATE.CLOSING);
};

/**
 * Update file's inode to handle situations when file was recreated outside.
 *
 * @private
 */
Tracer.prototype._updateInode = function () {
    fs.stat(this.path, (err, stats) => {
        if (err) {
            logger.error(`Unable to get stats for tracer '${this.name}'s file '${this.path}'`);
            this.close();
        } else {
            this.inode = stats.ino;
            logger.debug(`Tracer '${this.name}' file '${this.path}' inode=${this.inode}`);
        }
    });
};

/**
 * Re-open tracer if destination file doesn't exists
 *
 * @async
 * @private
 * @returns {Promise} Promise resolved when destination file re-opened or opened already
 */
Tracer.prototype._reopenIfNeeded = function () {
    // if stream is not ready then skip check
    if (!this.isReady()) {
        return Promise.resolve();
    }
    const self = this;
    return new Promise((resolve) => {
        // Resolve with true when stream still writing to same file
        fs.stat(self.path, (err, stats) => {
            let exists = false;
            if (err) {
                logger.error(`Unable to get stats for tracer '${self.name}' file '${self.path}': ${err}`);
            } else {
                exists = stats.ino === self.inode;
            }
            resolve(exists);
        });
    })
        .then((exists) => {
            if (exists || !self.isReady()) {
                return Promise.resolve(false);
            }
            return self._mkdir().then(() => Promise.resolve(true));
        })
        .then((needReopen) => {
            if (!(needReopen && self.isReady())) {
                return Promise.resolve(undefined);
            }
            // if file doesn't exists then we need
            // to re-open file and safely redirect stream to new FD
            return new Promise((resolve) => {
                self._setState(Tracer.STATE.REOPEN);
                // first step - open new file and assign new FD to stream
                // second step - close old file descriptor
                fs.open(self.path, 'w', (openErr, fd) => {
                    if (openErr) {
                        logger.error(`Unable to re-open tracer '${self.name}' file '${self.path}': ${openErr}`);
                        self.close();
                    }
                    resolve(fd);
                });
            });
        })
        .then((newFD) => {
            if (!newFD) {
                return;
            }
            // re-assign stream.fd
            const oldFD = self.stream.fd;
            self.stream.fd = newFD;
            // update state
            self._setReady();
            // try close old FD
            fs.close(oldFD, (closeErr) => {
                if (closeErr) {
                    logger.error(`Unable to close tracer '${self.name}' previous fd=${oldFD}: ${closeErr}`);
                }
            });
        })
        .catch(err => logger.exception('tracer._reopenIfNeeded exception', err));
};

/**
 * Create destination directory if needed
 *
 * @async
 * @private
 * @returns {Promise} Promise resolved when tracer is ready to continue
 */
Tracer.prototype._mkdir = function () {
    const baseDir = path.dirname(this.path);
    const self = this;
    return new Promise((resolve) => {
        fs.access(baseDir, (fs.constants || fs).R_OK, (accessErr) => {
            let exists = true;
            if (accessErr) {
                logger.error(`tracer._mkdir unable to access '${baseDir}': ${accessErr}`);
                exists = false;
            }
            resolve(exists);
        });
    })
        .then((dirExists) => {
            if (dirExists) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                logger.info(`Creating dir '${baseDir}' for tracer '${self.name}'`);
                fs.mkdir(baseDir, { recursive: true }, (mkdirErr) => {
                    if (mkdirErr) {
                        reject(mkdirErr);
                    } else {
                        resolve();
                    }
                });
            });
        });
};

/**
 * Open tracer's stream
 *
 * @async
 * @private
 * @returns {Promise} Promise resolved when new stream created or exists already
 */
Tracer.prototype._open = function () {
    if (!this.isNew()) {
        return Promise.resolve();
    }
    logger.debug(`Creating new tracer '${this.name}' stream to file '${this.path}'`);
    // prohibit to open many stream from single instance
    this._setState(Tracer.STATE.INIT);

    return this._mkdir()
        .then(() => {
            this.stream = fs.createWriteStream(this.path, { flags: 'w' });
            this._setState(Tracer.STATE.CREATED);
            // 'ready' event never fires - bug
            this.stream.on('open', () => {
                // now we are ready to process data
                this._setReady();
            });
            this.stream.on('close', () => {
                this._setClosed();
            });
            this.stream.on('error', (err) => {
                logger.error(`tracer.error: tracer '${this.name}' stream to file '${this.path}': ${err}`);
                this.close();
            });
            // resolving here, because it is more simpler and reliable
            // than wait inside 'open'
            return Promise.resolve();
        })
        .catch(err => Promise.reject(err));
};

/**
 * Truncate destination file if needed
 *
 * @async
 * @private
 * @returns {Promise} Promise resolved when file was truncated else rejected
 */
Tracer.prototype._truncate = function () {
    const self = this;
    return new Promise((resolve, reject) => {
        if (!self.isReady() || self.isTruncated) {
            resolve();
        } else {
            /**
             * marking file as truncated to avoid sequential calls.
             * Ideally, stream will be flushed after every tick,
             * so lets mark file as not truncated after every tick.
             * Btw, side effect - despite on 'w' at stream creation,
             * file will be truncated twice in any case.
             * @ignore
             */
            self.isTruncated = true;
            fs.ftruncate(self.stream.fd, 0, (err) => {
                if (err) {
                    reject(err);
                    self.isTruncated = false;
                } else {
                    process.nextTick(() => {
                        self.isTruncated = false;
                    });
                    // update stream's position
                    self.stream.pos = 0;
                    resolve();
                }
            });
        }
    });
};

/**
 * Write data to stream. If tracer is not available then
 * no data will be written to stream.
 *
 * @async
 * @private
 *
 * @param {String} data - data to write to stream
 *
 * @returns {Promise} Promise resolved when data was written
 */
Tracer.prototype._write = function (data) {
    const self = this;
    return new Promise((resolve, reject) => {
        // data will be buffered even if file in CREATED state
        if (!self.isAvailable()) {
            resolve();
        } else {
            self.stream.write(data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
    });
};

/**
 * Check if tracer ready to process data
 *
 * @returns {Boolean} true if ready else false
 */
Tracer.prototype.isReady = function () {
    return this.state === Tracer.STATE.READY;
};

/**
 * Check if tracer is able to process/buffer data
 *
 * @returns {Boolean} true if ready else false
 */
Tracer.prototype.isAvailable = function () {
    return this.isReady()
        || this.state === Tracer.STATE.CREATED
        || this.state === Tracer.STATE.REOPEN;
};

/**
 * Check if tracer should be initialized
 *
 * @returns {Boolean} true if not initialized else false
 */
Tracer.prototype.isNew = function () {
    return this.state === Tracer.STATE.NEW
        || this.state === Tracer.STATE.CLOSED;
};

/**
 * Update last touch timestamp
 */
Tracer.prototype.touch = function () {
    this.lastGetTouch = new Date().getTime();
};

/**
 * Reopen stream if needed
 *
 * @param {Boolean} schedule - true when need to schedule function
 */
Tracer.prototype.reopenIfNeeded = function (schedule) {
    this.removeScheduledReopen();
    if (schedule) {
        this.timeoutID = setTimeout(() => {
            this.reopenIfNeeded();
        }, Tracer.REOPEN_INTERVAL);
    } else {
        this._reopenIfNeeded().then(() => {
            this.reopenIfNeeded(true);
        });
    }
};

/**
 * Close tracer's stream
 */
Tracer.prototype.close = function () {
    this._setClosing();
};

/**
 * Stop tracer permanently
 */
Tracer.prototype.stop = function () {
    logger.info(`Stop tracer '${this.name}' stream  to file '${this.path}'`);
    this._setState(Tracer.STATE.STOP);
    this.close();
};

/**
 * Write data to tracer
 *
 * @async
 * @param {String} data - data to write to tracer
 */
Tracer.prototype.write = function (data) {
    if (!data) {
        return Promise.resolve();
    }

    return this._open()
        .then(() => this._truncate())
        .then(() => this._write(data))
        .catch((err) => {
            logger.error(`tracer.write error: ${err}`);
        });
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
        // force tracer to check if we need to
        // reopen destination file in case
        // if file changed
        tracer.reopenIfNeeded();
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
            tracerPath = path.join(constants.TRACER_DIR, objName);
        }
        tracer = Tracer.get(objName, tracerPath);
    }
    return tracer;
};

/**
 * Remove registered tracer
 *
 * @param {Tracer} tracer - tracer instance to remove
 */
Tracer.removeTracer = function (tracer) {
    if (tracer) {
        // stop tracer to avoid re-using it
        // new tracer will be created if needed
        tracer.stop();
        delete Tracer.instances[tracer.name];
    }
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
 */
Tracer.remove = function (toRemove) {
    if (typeof toRemove === 'function') {
        Object.keys(Tracer.instances).forEach((tracerName) => {
            const tracer = Tracer.instances[tracerName];
            if (toRemove(tracer)) {
                Tracer.removeTracer(tracer);
            }
        });
    } else {
        if (typeof toRemove !== 'string') {
            toRemove = toRemove.name;
        }
        Tracer.removeTracer(Tracer.instances[toRemove]);
    }
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
     * @param {Integer} [options.timeout]               - Milliseconds to wait for a socket timeout. Option
     *                                                    'passes through' to 'request' library
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
        options.strictSSL = options.allowSelfSignedCert === undefined
            ? constants.STRICT_TLS_REQUIRED : !options.allowSelfSignedCert;

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

    retryPromise
};
