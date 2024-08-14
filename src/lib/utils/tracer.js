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
            lastWriteTimestamp: Date.now(),
            taskPromise: Promise.resolve()
        });

        /** define static read-only props that should not be overriden */
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
     * @returns {Error | undefined} once tracer stopped
     */
    async stop() {
        this.logger.debug(`Stopping stream to file '${this.path}'`);
        PRIVATES.get(this).state = STATES.DISABLED;
        try {
            await tpm.safeClose.call(this);
        } catch (error) {
            return error;
        }
        return undefined;
    }

    /**
     * Suspend tracer, but it still remains available for data writing
     *
     * @async
     * @public
     * @returns {void} once tracer suspended
     */
    async suspend() {
        await tpm.suspend.call(this, true);
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
     * @returns {Error | undefined} once data written to file
     */
    async write(data) {
        try {
            await tpm.write.call(this, data);
        } catch (error) {
            return error;
        }
        return undefined;
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
     * @returns {void} once file closed
     */
    async close() {
        if (typeof this.fd !== 'undefined') {
            this.logger.debug(`Closing stream to file '${this.path}'`);
            const privates = PRIVATES.get(this);

            try {
                await utils.fs.close(this.fd);
            } catch (closeErr) {
                this.logger.debugException(`Unable to close file '${this.path}' with fd '${this.fd}'`, closeErr);
            } finally {
                privates.fd = undefined;
            }
        }
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
                this.logger.debug(`Writing ${this.maxRecords} out of ${cache.length} messages (limit = ${this.maxRecords} messages)`);
                data = cache.slice(
                    -this.maxRecords, // last N records
                    this.maxRecords ? cache.length : this.maxRecords // till end or 0
                );
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
     * @returns {void} once destination directory created
     */
    async mkdir() {
        const baseDir = pathUtil.dirname(this.path);

        try {
            await utils.fs.access(baseDir, utils.fs.constants.R_OK);
            return;
        } catch (error) {
            this.logger.debugException('fs.access error:', error);
        }

        this.logger.debug(`Creating dir '${baseDir}'`);
        try {
            await utils.fs.mkdir(baseDir);
        } catch (error) {
            if (error.code === 'EEXIST') {
                return;
            }
            throw error;
        }
    },

    /**
     * Open tracer's stream
     *
     * @async
     * @this Tracer
     * @returns {void} once new stream created or exists already
     */
    async open() {
        if (typeof this.fd === 'undefined') {
            this.logger.debug(`Creating file '${this.path}'`);
            await tpm.mkdir.call(this);
            PRIVATES.get(this).fd = await utils.fs.open(this.path, 'a+');
        }
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
     * @returns {string} once data was read
     */
    async read() {
        const fileSize = (await utils.fs.fstat(this.fd)).size;
        if (!fileSize) {
            return '';
        }
        const { buffer, bytesRead } = await utils.fs.read(this.fd, Buffer.alloc(fileSize), 0, fileSize, 0);
        return buffer.slice(0, bytesRead).toString(this.encoding);
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
     * @returns {void} once file closed
     */
    async safeClose() {
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
                .then(tpm.close.bind(this));

            await privates.taskPromise;
        }
    },

    /**
     * Setup inactivity timeout
     *
     * @async
     * @this Tracer
     * @returns {void} once timer configured
     */
    async setupSuspendTimeout() {
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

            try {
                await privates.timer.start();
                this.logger.debug(`Inactivity timeout set to ${this.inactivityTimeout} s.`);
            } catch (error) {
                this.logger.debugException('Unable to start inactivity timer:', error);

                const timer = privates.timer;
                privates.timer = undefined;
                await timer.stop();
            }
        }
    },

    /**
     * Suspend tracer due inactivity but still available for data writing
     *
     * @async
     * @this Tracer
     * @param {boolean} [ignoreTimeout = false] - ignore inactivity timeout check
     *
     * @returns {void} once tracer suspended
     */
    async suspend(ignoreTimeout) {
        const privates = PRIVATES.get(this);
        const idleTime = (Date.now() - privates.lastWriteTimestamp) / 1000.0; // in seconds

        if (!this.disabled && (this.inactivityTimeout <= idleTime || ignoreTimeout)) {
            if (ignoreTimeout) {
                this.logger.debug(`Suspending stream to file '${this.path}' (.suspend())`);
            } else {
                this.logger.debug(`Suspending stream to file '${this.path}' due inactivity (${this.inactivityTimeout} s. timeout)`);
            }

            PRIVATES.get(this).state = STATES.SUSPENDED;
            await tpm.safeClose.call(this);
        }
    },

    /**
     * Try to write cached data to file
     *
     * @async
     * @this Tracer
     * @returns {void} once data written to file
     */
    async tryWriteData() {
        const privates = PRIVATES.get(this);
        const writePromise = privates.writePromise;

        try {
            await tpm.setupSuspendTimeout.call(this);
            await tpm.open.call(this);

            let readData;
            // don't need to read and parse data when cache has a lot of data already
            if (privates.cache.length >= this.maxRecords) {
                readData = [];
            } else {
                readData = tpm.parse.call(this, await tpm.read.call(this));
            }

            privates.writePromise = null;

            const data = utils.stringify(tpm.mergeAndResetCache.call(this, readData), true);

            await utils.fs.ftruncate(this.fd, 0);
            await utils.fs.write(this.fd, data, 0, this.encoding);
        } catch (error) {
            // close trace, lost data
            this.logger.debugException(`Unable to write data to '${this.path}'`, error);
            await tpm.close.call(this);
        }
        if (writePromise === privates.writePromise) {
            // error might happened before
            privates.writePromise = null;
        }
        if (this.disabled) {
            await tpm.close.call(this);
        }
    },

    /**
     * Schedule next attempt to write data
     *
     * @async
     * @this Tracer
     * @param {any} data - data to write
     *
     * @returns {void} once data written to file
     */
    async write(data) {
        if (!this.disabled) {
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
            await privates.writePromise;
        }
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
 * @property {number} [inactivityTimeout = 900] - inactivity timeout (in s.) after which Tracer will be suspended
 * @property {number} [maxRecords = 10] - max records to store
 */
