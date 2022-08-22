/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const pathUtil = require('path');

const constants = require('../constants');
const logger = require('../logger').getChild('tracer');
const timers = require('./timers');
const utils = require('./misc');

/* eslint-disable no-use-before-define */

/** @module utils/tracer */

/**
 * Using it for logging only
 */
let TRACER_ID = 0;

/**
 * Storage for private properties
 *
 * @type {WeakMap<Tracer, ({
 *  cache: Array,
 *  dataActions: Array,
 *  fd: number,
 *  fs: object
 *  lastWriteTimestamp: number,
 *  state: string,
 *  taskPromise: Promise,
 *  timer: timers.BasicTimer,
 *  writePromise: Promise
 * })>}
 */
const PRIVATES = new WeakMap();

/**
 * Default Data actions
 */
const DATA_ACTIONS = {
    /**
     * Mask default secrets in object and break circular refs
     *
     * @sync
     * @private
     *
     * @param {any} data
     * @param {string} type
     *
     * @returns {any} masked data
     */
    maskDefaultSecretsInData(data, type) {
        if (type === 'object' && data !== null) {
            utils.traverseJSON(data, { breakCircularRef: 'circularRefFound' }, (parent, key) => {
                const val = parent[key];
                if (typeof val === 'string') {
                    parent[key] = utils.maskJSONStringDefaultSecrets(val);
                }
            });
            data = utils.maskJSONObjectDefaultSecrets(data);
        }
        return data;
    },

    /**
     * Mask default secrets in string that might be JSON string
     *
     * @sync
     * @private
     *
     * @param {string} data
     * @param {string} type
     *
     * @returns {string} masked data
     */
    maskDefaultSecretsInString(data, type) {
        if (type === 'string') {
            data = utils.maskJSONStringDefaultSecrets(data);
        }
        return data;
    }
};

/**
 * Tracer states
 */
const STATES = {
    DISABLED: 'disabled',
    READY: 'ready',
    SUSPENDED: 'suspended'
};

/**
 * Tracer class - useful for debug to dump streams of data.
 *
 * @class
 *
 * @property {boolean} disabled - is tracer disabled
 * @property {string} encoding - data encoding
 * @property {number} fd - file descriptor
 * @property {number} inactivityTimeout - inactivity timeout (in s.) after which Tracer will be suspended
 * @property {Logger} logger - logger instance
 * @property {number} maxRecords - number of records to store
 * @property {string} name - tracer's name
 * @property {string} path - path to file
 * @property {boolean} suspended - is tracer suspended
 */
class Tracer {
    /**
     * Constructor
     *
     * @param {string} path - path to file
     * @param {TracerOptions} [options] - options
     */
    constructor(path, options) {
        TRACER_ID += 1;
        options = setTracerOptionsDefaults(options);

        PRIVATES.set(this, {
            cache: [],
            dataActions: [],
            fs: options.fs || utils.fs,
            lastWriteTimestamp: Date.now(),
            taskPromise: Promise.resolve()
        });
        /**
         * read-only properties below that should never be changed
         */
        Object.defineProperties(this, {
            disabled: {
                get() {
                    return PRIVATES.get(this).state === STATES.DISABLED;
                }
            },
            encoding: {
                value: options.encoding
            },
            fd: {
                get() {
                    return PRIVATES.get(this).fd;
                }
            },
            inactivityTimeout: {
                value: Math.abs(options.inactivityTimeout)
            },
            maxRecords: {
                value: options.maxRecords
            },
            name: {
                value: `tracer_${TRACER_ID}`
            },
            path: {
                value: path
            },
            suspended: {
                get() {
                    return PRIVATES.get(this).state === STATES.SUSPENDED;
                }
            }
        });

        this.resetDataActions();
    }

    /**
     * @public
     * @returns {Logger} instance
     */
    get logger() {
        Object.defineProperty(this, 'logger', {
            value: logger.getChild(this.name)
        });
        return this.logger;
    }

    /**
     * Add new data action
     *
     * @sync
     * @public
     * @param {function(any, string): any} dataAction - data action to add
     *
     * @returns {void} once added
     */
    addDataAction(dataAction) {
        tpm.addDataAction.call(this, dataAction);
    }

    /**
     * Reset data actions to default state
     *
     * @sync
     * @public
     * @returns {void} once done
     */
    resetDataActions() {
        tpm.resetDataActions.call(this);
    }

    /**
     * Stop tracer permanently
     *
     * @async
     * @public
     * @returns {Promise<Error?>} resolved once tracer stopped
     */
    stop() {
        return new Promise((resolve, reject) => {
            this.logger.debug(`Stopping stream to file '${this.path}'`);
            PRIVATES.get(this).state = STATES.DISABLED;
            tpm.safeClose.call(this)
                .then(resolve, reject);
        })
            .catch((err) => err);
    }

    /**
     * Suspend tracer, but it still remains available for data writing
     *
     * @async
     * @public
     * @returns {Promise} resolved once tracer suspended
     */
    suspend() {
        return new Promise((resolve, reject) => {
            tpm.suspend.call(this, true)
                .then(resolve, reject);
        });
    }

    /**
     * Write data to tracer
     *
     * Note: makes copy of 'data'
     *
     * @async
     * @public
     * @param {any} data - data to write to tracer (should be JSON serializable)
     *
     * @returns {Promise<Error?>} resolved once data written to file
     */
    write(data) {
        return new Promise((resolve, reject) => {
            tpm.write.call(this, data)
                .then(resolve, reject);
        })
            .catch((err) => err);
    }
}

/**
 * Tracer Private Methods (tpm)
 */
const tpm = {
    /**
     * Add new data action
     *
     * @sync
     * @this Tracer
     * @param {function(any, string): any} dataAction - data action to add
     *
     * @returns {void} once added
     */
    addDataAction(dataAction) {
        PRIVATES.get(this).dataActions.push(dataAction);
    },

    /**
     * Apply data actions to data:
     *
     * Note: mutates 'data'
     *
     * @sync
     * @this Tracer
     * @param {any} data - input data
     *
     * @returns {any} processed input data
     */
    applyDataActions(data) {
        const type = typeof data;
        return PRIVATES.get(this).dataActions.reduce((d, action) => action(d, type), data);
    },

    /**
     * Add data to cache
     *
     * Note: makes copy of 'data'
     *
     * @sync
     * @this Tracer
     * @param {Any} data - data to add (should be JSON serializable)
     */
    cacheData(data) {
        const cache = PRIVATES.get(this).cache;
        while (cache.length > this.maxRecords) {
            cache.shift();
        }
        try {
            cache.push({
                data: tpm.applyDataActions.call(this, utils.deepCopy(data)),
                timestamp: new Date().toISOString()
            });
        } catch (copyError) {
            this.logger.debugException('Unable to make copy of data', copyError);
        }
    },

    /**
     * Close file
     *
     * @async
     * @this Tracer
     * @returns {Promise} resolved once file closed
     */
    close() {
        return new Promise((resolve, reject) => {
            if (typeof this.fd === 'undefined') {
                resolve();
            } else {
                this.logger.debug(`Closing stream to file '${this.path}'`);
                const privates = PRIVATES.get(this);
                privates.fs.close(this.fd)
                    .catch((closeErr) => {
                        this.logger.debugException(`Unable to close file '${this.path}' with fd '${this.fd}'`, closeErr);
                    })
                    .then(() => {
                        privates.fd = undefined;
                    })
                    .then(resolve, reject);
            }
        });
    },

    /**
     * Merge cached data and data from file
     *
     * @sync
     * @this Tracer
     * @param {Array<Any>} data - parsed data from file
     *
     * @returns {Array<Any>} merged data that ready to be written to destination
     */
    mergeAndResetCache(data) {
        const cache = PRIVATES.get(this).cache;
        if (cache.length > 0) {
            if (cache.length >= this.maxRecords) {
                // write last N messages only
                const dataLen = cache.length - this.maxRecords;
                this.logger.debug(`Writing last ${this.maxRecords} out of ${cache.length} messages (limit = ${this.maxRecords} messages)`);
                data = cache.slice(dataLen);
            } else {
                // this.maxRecords - cache.length = X old messages can be carried over
                // data.length - X = Z index in data to use to carry over old messages
                // if Z < 0 then all old messages can be carried over
                const idx = data.length - this.maxRecords + cache.length;
                data = data.slice(idx >= 0 ? idx : 0).concat(cache);
            }
            PRIVATES.get(this).cache = [];
        }
        return data;
    },

    /**
     * Create destination directory if needed
     *
     * @async
     * @this Tracer
     * @returns {Promise} resolved once destination directory created
     */
    mkdir() {
        return new Promise((resolve, reject) => {
            const baseDir = pathUtil.dirname(this.path);
            const fs = PRIVATES.get(this).fs;

            fs.access(baseDir, (fs.constants || fs).R_OK)
                .then(() => true, () => false)
                .then((exist) => {
                    if (exist) {
                        return Promise.resolve();
                    }
                    this.logger.debug(`Creating dir '${baseDir}'`);
                    return fs.mkdir(baseDir);
                })
                .catch((mkdirError) => (mkdirError.code === 'EEXIST' ? Promise.resolve() : Promise.reject(mkdirError)))
                .then(resolve, reject);
        });
    },

    /**
     * Open tracer's stream
     *
     * @async
     * @this Tracer
     * @returns {Promise} Promise resolved when new stream created or exists already
     */
    open() {
        return new Promise((resolve, reject) => {
            if (typeof this.fd !== 'undefined') {
                resolve();
            } else {
                this.logger.debug(`Creating file '${this.path}'`);
                tpm.mkdir.call(this)
                    .then(() => PRIVATES.get(this).fs.open(this.path, 'a+'))
                    .then((openRet) => {
                        PRIVATES.get(this).fd = openRet[0];
                    })
                    .then(resolve, reject);
            }
        });
    },

    /**
     * Parse data from file
     *
     * @sync
     * @this Tracer
     * @param {String} data - data from file (empty string or JSON data)
     *
     * @returns {Array<Any>} parsed data
     */
    parse(data) {
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
    },

    /**
     * Read data from file
     *
     * @async
     * @this Tracer
     * @returns {Promise} resolved when data was read
     */
    read() {
        return new Promise((resolve, reject) => {
            const fs = PRIVATES.get(this).fs;
            fs.fstat(this.fd)
                .then((statRet) => {
                    const fileSize = statRet[0].size;
                    if (!fileSize) {
                        return Promise.resolve('');
                    }
                    return fs.read(this.fd, Buffer.alloc(fileSize), 0, fileSize, 0)
                        .then((readRet) => {
                            const buffer = readRet[1];
                            const bytesRead = readRet[0];
                            return buffer.slice(0, bytesRead).toString(this.encoding);
                        });
                })
                .then(resolve, reject);
        });
    },

    /**
     * Reset data actions to default state
     *
     * @sync
     * @this Tracer
     * @returns {void} once done
     */
    resetDataActions() {
        PRIVATES.get(this).dataActions = [];
        tpm.addDataAction.call(this, DATA_ACTIONS.maskDefaultSecretsInData);
        tpm.addDataAction.call(this, DATA_ACTIONS.maskDefaultSecretsInString);
    },

    /**
     * Safely close a file and stop timer
     *
     * @async
     * @this Tracer
     * @returns {Promise} resolved once file closed
     */
    safeClose() {
        return new Promise((resolve, reject) => {
            if (this.disabled || this.suspended) {
                const privates = PRIVATES.get(this);

                if (typeof privates.timer !== 'undefined') {
                    privates.timer.stop()
                        .then(() => {
                            this.logger.debug('Inactivity timer deactivated.');
                            privates.timer = undefined;
                        })
                        .catch((err) => this.logger.debugException('Error on attempt to deactivate the inactivity timer:', err));
                }

                this.logger.debug(`Stopping stream to file '${this.path}'`);
                // schedule file closing right after last scheduled writing attempt
                // but data that awaits for writing will be lost
                privates.taskPromise = privates.taskPromise
                    .then(tpm.close.bind(this))
                    .then(resolve, reject);
            } else {
                resolve();
            }
        });
    },

    /**
     * Setup inactivity timeout
     *
     * @async
     * @this Tracer
     * @returns {Promise} resolved once timer configured
     */
    setupSuspendTimeout() {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);
            /**
             * set interval to check when last attempt to write data was made.
             * Do not care to be accurate here, this is debug tool only.
             * Main idea of this approach is to close a file descriptor to save resources
             * when last attempt to write data was made more than 15m (by default)
             * minutes ago.
             */
            if (!this.disabled) {
                PRIVATES.get(this).state = STATES.READY;
            }
            if (this.inactivityTimeout && typeof privates.timer === 'undefined') {
                privates.timer = new timers.BasicTimer(tpm.suspend.bind(this), {
                    abortOnFailure: false,
                    intervalInS: this.inactivityTimeout
                });
                privates.timer.start()
                    .then(() => this.logger.debug(`Inactivity timeout set to ${this.inactivityTimeout} s.`))
                    .catch((err) => {
                        this.logger.debugException('Unable to start inactivity timer:', err);

                        const timer = privates.timer;
                        privates.timer = undefined;
                        return timer.stop();
                    })
                    .then(resolve, reject);
            } else {
                resolve();
            }
        });
    },

    /**
     * Suspend tracer due inactivity but still available for data writing
     *
     * @async
     * @this Tracer
     * @param {boolean} [ignoreTimeout = false] - ignore inactivity timeout check
     *
     * @returns {Promise} resolved once tracer suspended
     */
    suspend(ignoreTimeout) {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);
            const delta = (Date.now() - privates.lastWriteTimestamp) / 1000.0; // in seconds

            if (this.disabled) {
                resolve();
            } else if (this.inactivityTimeout <= delta || ignoreTimeout) {
                if (ignoreTimeout) {
                    this.logger.debug(`Suspending stream to file '${this.path}' (.suspend())`);
                } else {
                    this.logger.debug(`Suspending stream to file '${this.path}' due inactivity (${this.inactivityTimeout} s. timeout)`);
                }

                PRIVATES.get(this).state = STATES.SUSPENDED;
                tpm.safeClose.call(this)
                    .then(resolve, reject);
            }
        });
    },

    /**
     * Try to write cached data to file
     *
     * @async
     * @this Tracer
     * @returns {Promise} resolved once data written to file
     */
    tryWriteData() {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);

            const writePromise = privates.writePromise;
            tpm.setupSuspendTimeout.call(this)
                .then(tpm.open.bind(this))
                .then(() => {
                    // don't need to read and parse data when cache has a lot of data already
                    if (privates.cache.length >= this.maxRecords) {
                        return [];
                    }
                    return tpm.read.call(this)
                        .then(tpm.parse.bind(this));
                })
                .then((readData) => {
                    privates.writePromise = null;
                    return tpm.mergeAndResetCache.call(this, readData);
                })
                .then((data) => utils.stringify(data, true))
                .then((dataToWrite) => privates.fs.ftruncate(this.fd, 0)
                    .then(() => privates.fs.write(this.fd, dataToWrite, 0, this.encoding)))
                .catch((err) => {
                    // close trace, lost data
                    this.logger.debugException(`Unable to write data to '${this.path}'`, err);
                    return tpm.close.call(this); // should not reject
                })
                .then(() => {
                    if (writePromise === privates.writePromise) {
                        // error might happened before
                        privates.writePromise = null;
                    }
                    return this.disabled ? tpm.close.call(this) : Promise.resolve();
                })
                .then(resolve, reject);
        });
    },

    /**
     * Schedule next attempt to write data
     *
     * @async
     * @this Tracer
     * @param {any} data - data to write
     *
     * @returns {Promise} resolved once data written to file
     */
    write(data) {
        return new Promise((resolve, reject) => {
            if (this.disabled) {
                resolve();
            } else {
                PRIVATES.get(this).lastWriteTimestamp = Date.now();
                tpm.cacheData.call(this, data);

                // check if cache was flushed to file already or not
                const privates = PRIVATES.get(this);
                if (!privates.writePromise) {
                    // add current attempt to main task queue
                    privates.taskPromise = privates.taskPromise
                        .then(tpm.tryWriteData.bind(this));
                    // re-use current 'write' promise as separate queue
                    // to be able to batch multiple 'write' requests into one
                    privates.writePromise = privates.taskPromise;
                }
                privates.writePromise.then(resolve, reject);
            }
        });
    }
};

/**
 * @param {object} options - options to set defaults to
 *
 * @returns {TracerOptions} options with defaults set
 */
function setTracerOptionsDefaults(options) {
    return utils.assignDefaults(options, {
        encoding: constants.TRACER.ENCODING,
        inactivityTimeout: constants.TRACER.INACTIVITY_TIMEOUT,
        maxRecords: constants.TRACER.MAX_RECORDS_OUTPUT
    });
}

module.exports = {
    setTracerOptionsDefaults,
    Tracer,

    /**
     * Creates a new tracer
     *
     * @sync
     *
     * @param {string} path - path to file
     * @param {TracerOptions} [options] - options
     *
     * @returns {Tracer} newly created instance
     */
    create(path, options) {
        return new Tracer(path, options);
    }
};

/**
 * @typedef TracerOptions
 * @type {object}
 * @property {string} [encoding = 'utf8'] - data encoding
 * @property {object} [fs] - FS module, by default 'fs' from './misc'
 * @property {number} [inactivityTimeout = 900] - inactivity timeout (in s.) after which Tracer will be suspended
 * @property {number} [maxRecords = 10] - max records to store
 */
