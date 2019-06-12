/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');
const request = require('request');

const constants = require('./constants.js');
const logger = require('./logger.js');

/** @module util */

/** Note: no 'class' usage to support v12.x, prototype only */
/**
 * Tracer class - useful for debug to dump streams of data.
 *
 * @class
 *
 * @param {string} name       - tracer's name
 * @param {string} tracerPath - path to file
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
 * @param {string} newState - tracer's new state
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
 * @returns {Promise} Promise resolved when destination file re-opene or opened already
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
        .catch(err => logger.exception(`tracer._reopenIfNeeded exception: ${err}`, err));
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
                    if (mkdirErr) reject(mkdirErr);
                    else resolve();
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
            // resolving here, because it is more simplier and reliable
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
 * @param {string} data - data to write to stream
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
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

/**
 * Check if tracer ready to process data
 *
 * @returns {boolean} true if ready else false
 */
Tracer.prototype.isReady = function () {
    return this.state === Tracer.STATE.READY;
};

/**
 * Check if tracer is able to process/buffer data
 *
 * @returns {boolean} true if ready else false
 */
Tracer.prototype.isAvailable = function () {
    return this.isReady()
        || this.state === Tracer.STATE.CREATED
        || this.state === Tracer.STATE.REOPEN;
};

/**
 * Check if tracer should be initialized
 *
 * @returns {boolean} true if not initialized else false
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
 * @param {boolean} schedule - true when need to schedule function
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
 * @param {string} data - data to write to tracer
 */
Tracer.prototype.write = function (data) {
    if (!data) return Promise.reject(new Error('Missing data to write'));

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
 * @member {Object.<string, Tracer>}
 */
Tracer.instances = {};

/**
 * Get Tracer instance or create new one
 *
 * @param {string} name       - tracer name
 * @param {string} tracerPath - destination path
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
 * @param {string} className - object's class name
 * @param {string} objName   - object's name
 * @param {Object} config    - object's config
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
 * @param {string | Tracer} toRemove - tracer or tracer's name to remove
 * @param {Tracer~filterCallback} filter  - filter function
 */
Tracer.remove = function (toRemove, filter) {
    if (toRemove) {
        if (typeof toRemove !== 'string') {
            toRemove = toRemove.name;
        }
        Tracer.removeTracer(Tracer.instances[toRemove]);
    }
    if (filter) {
        Object.keys(Tracer.instances).forEach((tracerName) => {
            const tracer = Tracer.instances[tracerName];
            if (filter(tracer)) {
                Tracer.removeTracer(tracer);
            }
        });
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

                // applying backof after the second try only
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


module.exports = {
    /**
     * Check if object has any data or not
     *
     * @param {any} obj - object to test
     *
     * @returns {Boolean} 'true' if empty else 'false'
     */
    isObjectEmpty(obj) {
        if (obj === undefined || obj === null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        /* eslint-disable no-restricted-syntax */
        for (const key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) return false;
        return true;
    },
    /**
     * Deep copy
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} deep copy of source object
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
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
        if (['==', '===', '<', '<=', '>', '>=', '!=', '!=='].indexOf(comparator) === -1) {
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
     * Stringify a message
     *
     * @param {Object|String} msg - message to stringify
     *
     * @returns {Object} Stringified message
     */
    stringify(msg) {
        if (typeof msg === 'object') {
            try {
                msg = JSON.stringify(msg);
            } catch (e) {
                // just leave original message intact
            }
        }
        return msg;
    },

    /**
     * Format data by class
     *
     * @param {Object} data - data to format
     *
     * @returns {Object} Returns the data formatted by class
     */
    formatDataByClass(data) {
        const ret = {};
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            // assuming a flat declaration where each object contains a class
            // if that assumption changes this will need to be modified
            Object.keys(data).forEach((k) => {
                const v = data[k];
                // check if value for v is an object that contains a class
                if (typeof v === 'object' && v.class) {
                    if (!ret[v.class]) { ret[v.class] = {}; }
                    ret[v.class][k] = v;
                }
            });
        }
        return ret;
    },

    /**
     * Format config for easier consumption
     *
     * @param {Object} data - data to format
     *
     * @returns {Object} Returns the formatted config
     */
    formatConfig(data) {
        // for now just format by class
        return this.formatDataByClass(data);
    },

    /**
     * Get declaration from the parsed and formatted config by name
     *
     * @param {Object} config - parsed and formatted config
     * @param {String} dClass - declaration class
     * @param {String} dName  - declaration name
     *
     * @returns {Object} Returns the declaration
     */
    getDeclarationByName(config, dClass, dName) {
        return (config[dClass] || {})[dName];
    },

    /**
     * Perform HTTP request
     *
     * @param {String}  [host]                         - HTTP host
     * @param {String}  [uri]                          - HTTP uri
     * @param {Object}  [options]                      - function options. Copy it before pass to function.
     * @param {String}  [options.fullURI]              - full HTTP URI
     * @param {String}  [options.protocol]             - HTTP protocol
     * @param {Integer} [options.port]                 - HTTP port
     * @param {String}  [options.method]               - HTTP method
     * @param {String}  [options.body]                 - HTTP body
     * @param {Object}  [options.headers]              - HTTP headers
     * @param {Object}  [options.continueOnErrorCode]  - resolve promise even on non-successful response code
     * @param {Boolean} [options.allowSelfSignedCert]  - false - requires SSL certificates be valid,
     *                                                  true  - allows self-signed certs
     * @param {Object}  [options.rawResponseBody]      - true - Buffer object with binary data will be returned as body
     * @param {Integer} [options.expectedResponseCode] - expected response code
     * @param {Boolean} [options.includeResponseObject] - false - only body object/string will be returned
     *                                                    true  - array with [body, responseObject] will be returned
     *
     * @returns {Promise.<?any>} Returns promise resolved with response
     */
    makeRequest() {
        // rest params syntax supported only fron node 6+
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

        options = options || {};
        options.method = options.method || 'GET';
        options.protocol = options.protocol || constants.REQUEST_DEFAULT_PROTOCOL;
        options.port = options.port || constants.REQUEST_DEFAULT_PORT;
        options.body = options.body ? this.stringify(options.body) : undefined;
        options.strictSSL = options.allowSelfSignedCert === undefined
            ? constants.STRICT_TLS_REQUIRED : !options.allowSelfSignedCert;

        options.headers = options.headers || {};
        options.headers['User-Agent'] = options.headers['User-Agent'] || constants.USER_AGENT;

        if (options.rawResponseBody) {
            options.encoding = null;
        }

        if (host) {
            options.uri = `${options.protocol}://${host}:${options.port}${uri || ''}`;
        } else {
            options.uri = options.fullURI;
        }

        if (!options.uri) {
            throw new Error('makeRequest: No fullURI or host provided');
        }

        const rawResponseBody = options.rawResponseBody;
        const continueOnErrorCode = options.continueOnErrorCode;
        const includeResponseObject = options.includeResponseObject;
        let expectedResponseCode = options.expectedResponseCode || [200];
        expectedResponseCode = Array.isArray(expectedResponseCode) ? expectedResponseCode
            : [expectedResponseCode];

        // cleanup options. Update tests when adding new value
        ['rawResponseBody', 'continueOnErrorCode', 'expectedResponseCode', 'includeResponseObject',
            'port', 'protocol', 'fullURI', 'allowSelfSignedCert'
        ].forEach((key) => {
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
     * @param {String} host  - host address
     * @param {Integer} port - host port
     *
     * @returns {Promise} Returns promise resolved on successful check
     */
    networkCheck(host, port) {
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

        // 100 ms period with 50 max tries = 5 sec
        const period = 100; const maxTries = 50; let currentTry = 1;
        const timeoutPromise = new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const fail = () => {
                    clearInterval(interval);
                    reject(new Error(`unable to connect: ${host}:${port}`)); // max timeout, reject
                };

                if (done === true) {
                    clearInterval(interval);
                    resolve(); // connection success, resolve
                } else if (done === 'error') fail();
                else if (currentTry < maxTries) ; // try again
                else fail();
                currentTry += 1;
            }, period);
        });

        return Promise.all([connectPromise, timeoutPromise])
            .then(() => true)
            .catch((e) => {
                throw new Error(`networkCheck: ${e}`);
            });
    },

    /**
     * Get the last day of month for provided date
     *
     * @param {Date} date - date object
     *
     * @returns {Integer} last day of month
     */
    getLastDayOfMonth(date) {
        // lets calculate the last day of provided month
        const endOfMonth = new Date(date);
        // reset date, to avoid situations like 3/31 + 1 month = 5/1
        endOfMonth.setDate(1);
        // set next month
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        // if 0 is provided for dayValue, the date will be set to the last day of the previous month
        endOfMonth.setDate(0);
        return endOfMonth.getDate();
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
     * Parse HH:MM string to tuple(integer, integer)
     *
     * @param {string} timeStr - time string in HH:MM format
     *
     * @returns {Array} array with parsed data
     */
    timeStrToTuple(timeStr) {
        const timeTuple = timeStr.split(':');
        if (timeTuple.length !== 2) {
            throw new Error('String should be in format HH:MM');
        }

        for (let i = 0; i < timeTuple.length; i += 1) {
            timeTuple[i] = parseInt(timeTuple[i], 10);
        }
        if (!(timeTuple[0] >= 0 && timeTuple[0] < 24 && timeTuple[1] >= 0 && timeTuple[1] < 60)) {
            throw new Error('Time should be between 00:00 and 23:59');
        }
        return timeTuple;
    },

    /**
     * @typedef Schedule
     *
     * @property {String}           frequency    - event frequency, allowed values - daily, weekly, monthly
     * @property {Object}           time         - time object
     * @property {String}           time.start   - start time in format HH:MM
     * @property {String}           time.end     - end time in format HH:MM
     * @property {Integer}          [dayOfMonth] - day of month, required for 'monthly'
     * @property {String | Integer} [dayOfWeek]  - day of week, could be name (e.g. Monday) or
     *                                             number from 0-7, where 0 and 7 are Sunday. Required for
     */
    /**
     * Get next execution date for provided schedule
     *
     * @param {module:ihealthUtil~Schedule} schedule - schedule object
     * @param {Date}     [fromDate]                  - data to count next execution from, by default current date
     * @param {Boolean}  [allowNow]                  - e.g. fromDate is 3am and schedule time is 23pm - 4am,
     *                                                 frequency is daily. If allowNow === true then nextExecution
     *                                                 date will be between 3am and 4am same day, otherwise nextExection
     *                                                 date wiil be same day between 23pm and 4am next day.
     *
     * @returns {Date} next execution date
     */
    getNextFireDate(schedule, fromDate, allowNow) {
        const self = this;

        // setup defaults
        allowNow = allowNow === undefined ? true : allowNow;
        fromDate = fromDate || new Date();
        // adjustment function
        let adjustment;
        // check if date fits schedule or not
        let isOnSchedule;

        if (schedule.frequency === 'daily') {
            // move time forward for a day
            adjustment = (date) => {
                date.setDate(date.getDate() + 1);
                return date;
            };
            // for daily basic simply return true
            isOnSchedule = () => true;
        } else if (schedule.frequency === 'weekly') {
            let dayOfWeek = schedule.day;
            // if it is number -> convert it to string representation
            // to handle 0 and 7 in single place
            if (typeof dayOfWeek !== 'string') {
                dayOfWeek = constants.WEEKDAY_TO_DAY_NAME[dayOfWeek];
            }
            dayOfWeek = constants.DAY_NAME_TO_WEEKDAY[dayOfWeek.toLowerCase()];
            // just in case something strange happened - e.g. unknown week day name
            if (dayOfWeek === undefined) {
                const msg = `getNextExecutionDate: Unknown weekday value - ${JSON.stringify(schedule)}`;
                throw new Error(msg);
            }
            // move time forward for a week
            adjustment = (date) => {
                const delta = dayOfWeek - date.getDay();
                date.setDate(date.getDate() + delta + (delta > 0 ? 0 : 7));
                return date;
            };
            // simply check if day is desired week day
            isOnSchedule = date => date.getDay() === dayOfWeek;
        } else {
            // monthly schedule, day of month
            const dayOfMonth = schedule.day;
            // move date to desired dayOfMonth and to next month if needed
            adjustment = function (date) {
                let lastDayOfMonth = self.getLastDayOfMonth(date);
                if (date.getDate() >= (dayOfMonth > lastDayOfMonth ? lastDayOfMonth : dayOfMonth)) {
                    date.setDate(1);
                    date.setMonth(date.getMonth() + 1);
                    lastDayOfMonth = self.getLastDayOfMonth(date);
                }
                date.setDate(dayOfMonth > lastDayOfMonth ? lastDayOfMonth : dayOfMonth);
                return date;
            };
            // simply check current date against desired
            isOnSchedule = function (date) {
                const lastDayOfMonth = self.getLastDayOfMonth(date);
                return date.getDate() === (dayOfMonth > lastDayOfMonth ? lastDayOfMonth : dayOfMonth);
            };
        }
        // time start and end are expected to be in HH:MM format.
        const startTimeTuple = self.timeStrToTuple(schedule.timeWindow.start);
        const endTimeTuple = self.timeStrToTuple(schedule.timeWindow.end);

        let startExecDate = new Date(fromDate);
        startExecDate.setHours(startTimeTuple[0]);
        startExecDate.setMinutes(startTimeTuple[1]);
        startExecDate.setSeconds(0);
        startExecDate.setMilliseconds(0);

        // simply moving clock for 1 day back if we a going to try fit current time
        if (allowNow) {
            startExecDate.setDate(startExecDate.getDate() - 1);
        }

        let endExecDate = new Date(startExecDate);
        endExecDate.setHours(endTimeTuple[0]);
        endExecDate.setMinutes(endTimeTuple[1]);

        // handle situations like start 23pm and end 4am
        if (startExecDate > endExecDate) {
            endExecDate.setDate(endExecDate.getDate() + 1);
        }
        let windowSize = endExecDate.getTime() - startExecDate.getTime();

        while (!(isOnSchedule(startExecDate) && ((allowNow && startExecDate <= fromDate && fromDate < endExecDate)
                || startExecDate > fromDate))) {
            startExecDate = adjustment(startExecDate);
            endExecDate = new Date(startExecDate);
            endExecDate.setTime(endExecDate.getTime() + windowSize);
        }

        if (startExecDate <= fromDate && fromDate < endExecDate) {
            startExecDate = fromDate;
            windowSize = endExecDate.getTime() - startExecDate.getTime();
        }
        // finally set random time
        startExecDate.setTime(startExecDate.getTime() + Math.floor(self.getRandomArbitrary(0, windowSize)));
        return startExecDate;
    },

    /** @see Tracer */
    tracer: Tracer,

    retryPromise
};
