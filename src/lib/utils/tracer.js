/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const pathUtil = require('path');

const constants = require('../constants');
const configWorker = require('../config');
const logger = require('../logger').getChild('tracer');
const util = require('./misc');

/** @module tracer */

const CLASSES_WITH_TRACE = [
    constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME,
    constants.CONFIG_CLASSES.IHEALTH_POLLER_CLASS_NAME,
    constants.CONFIG_CLASSES.EVENT_LISTENER_CLASS_NAME,
    constants.CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
    constants.CONFIG_CLASSES.CONSUMER_CLASS_NAME
];

/**
 * Registered instances
 *
 * @type {Object<string, Tracer>}
 */
const INSTANCES = {};

/**
 * Tracer class - useful for debug to dump streams of data.
 *
 * @class
 *
 * @read {string} name - tracer's name
 * @property {string} path - path to file
 * @property {number} fd - file descriptor
 * @property {boolean} disabled - is tracer disabled
 * @property {Logger} logger - logger instance
 */
class Tracer {
    /**
     * Constructor
     *
     * @param {string} name - tracer's name
     * @param {string} path - path to file
     */
    constructor(name, path) {
        this._name = name;
        this._path = path;
        this._fd = undefined;
        this._disabled = false;
    }

    /**
     * @public
     * @returns {boolean} true if tracer disabled
     */
    get disabled() {
        return this._disabled;
    }

    /**
     * @public
     * @returns {number} file descriptor
     */
    get fd() {
        return this._fd;
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
     * @public
     * @returns {string} name
     */
    get name() {
        return this._name;
    }

    /**
     * @public
     * @returns {string} path to trace file
     */
    get path() {
        return this._path;
    }

    /**
     * Add data to cache
     *
     * Note: makes copy of 'data'
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
        try {
            data = util.deepCopy(data);
        } catch (copyError) {
            this.logger.debugException('Unable to make copy of data', copyError);
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
        this.logger.debug(`Closing stream  to file '${this.path}'`);
        return util.fs.close(this.fd)
            .catch((closeErr) => {
                this.logger.debugException(`Unable to close file '${this.path}' with fd '${this.fd}'`, closeErr);
            })
            .then(() => {
                this._fd = undefined;
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
        const baseDir = pathUtil.dirname(this.path);
        return util.fs.access(baseDir, (util.fs.constants || util.fs).R_OK)
            .then(() => true, () => false)
            .then((exist) => {
                if (exist) {
                    return Promise.resolve();
                }
                this.logger.debug(`Creating dir '${baseDir}'`);
                return util.fs.mkdir(baseDir);
            })
            .catch(mkdirError => (mkdirError.code === 'EEXIST' ? Promise.resolve() : Promise.reject(mkdirError)));
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
        this.logger.debug(`Creating file '${this.path}'`);
        return this._mkdir()
            .then(() => util.fs.open(this.path, 'w+'))
            .then((openRet) => {
                this._fd = openRet[0];
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
        return util.fs.fstat(this.fd)
            .then((statRet) => {
                const fileSize = statRet[0].size;
                if (!fileSize) {
                    return Promise.resolve('');
                }
                return util.fs.read(this.fd, Buffer.alloc(fileSize), 0, fileSize, 0)
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
            .then(data => util.maskSecrets(util.stringify(data, true)))
            .then(dataToWrite => util.fs.ftruncate(this.fd, 0)
                .then(() => util.fs.write(this.fd, dataToWrite, 0, constants.TRACER.ENCODING)))
            .catch((err) => {
                // close trace, lost data
                this.logger.debugException(`Unable to write data to '${this.path}'`, err);
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
     * Stop tracer permanently
     *
     * @async
     * @public
     * @returns {Promise} resolved once tracer stopped
     */
    stop() {
        this.logger.debug(`Stopping stream to file '${this.path}'`);
        this._disabled = true;
        // schedule file closing right after last scheduled writing attempt
        // but data that awaits for writing will be lost
        return (this._tryWriteDataPromise ? this._tryWriteDataPromise : Promise.resolve())
            .then(this._close.bind(this));
    }

    /**
     * Write data to tracer
     *
     * Note: makes copy of 'data'
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
 * Get Tracer instance or create new one
 *
 * @public
 *
 * @param {string} name - tracer name
 * @param {string} path - destination path
 *
 * @returns {Tracer} Tracer instance
 */
function getOrCreate(name, path) {
    let tracer = INSTANCES[name];
    if (tracer && tracer.path !== path) {
        logger.debug(`Updating tracer instance - '${name}' file '${path}'`);
        unregister(tracer, true);
        tracer = null;
    } else {
        logger.debug(`Creating new tracer instance - '${name}' file '${path}'`);
    }
    if (!tracer) {
        tracer = new Tracer(name, path);
        INSTANCES[name] = tracer;
    }
    return tracer;
}

/**
 * Create tracer from config and register it
 *
 * Note: if component disabled then 'null' will be returned
 *
 * @public
 *
 * @param {object} config - configuration/component
 * @param {string} config.class - component's class
 * @param {boolean} config.enable - true if component enabled
 * @param {boolean|string} config.trace - true/false for enable/disable or path to a file to write data
 * @param {string} config.traceName - tracer's name
 *
 * @returns {Tracer|null} Tracer object or null when tracing feature disabled
 */
function fromConfig(config) {
    let tracer = null;
    if (config.trace && config.enable !== false) {
        const name = `${config.class}.${config.traceName}`;
        let path = config.trace;
        if (config.trace === true) {
            path = pathUtil.join(constants.TRACER.DIR, name);
        }
        tracer = getOrCreate(name, path);
    }
    return tracer;
}

/**
 * Registered tracers
 *
 * @returns {Array<Tracer>} registered tracers
 */
function registered() {
    return Object.keys(INSTANCES).map(key => INSTANCES[key]);
}

/**
 * Unregister and stop tracer
 *
 * @param {Tracer} tracer - tracer
 * @param {boolean} [catchErr = false] - catch errors on attempt to stop tracer
 *
 * @returns {Promise} resolved once tracer stopped
 */
function unregister(tracer, catchErr) {
    let promise = Promise.resolve();
    if (tracer) {
        // stop tracer to avoid re-using it
        // new tracer will be created if needed
        promise = promise.then(() => tracer.stop());
        if (catchErr) {
            promise = promise.catch(err => logger.debugException(`Uncaught error on attempt to unregister tracer "${tracer.name}"`, err));
        }
        delete INSTANCES[tracer.name];
    }
    return promise;
}

/**
 * Unregister all registered tracers
 *
 * @returns {Promise} resolved once all tracers registered
 */
function unregisterAll() {
    return Promise.all(registered().map(tracer => unregister(tracer, true)));
}

// config worker change event
configWorker.on('change', config => Promise.resolve()
    .then(() => {
        /**
         * This event might be handled by other listeners already
         * and new tracers might be created already too. 'fromConfig'
         * will return same instance if it was created already or create new once if doesn't exist
         * -> that's why this can be done before/after ant other 'change' listener execution.
         * Facts:
         * - no one except this listener can remove old Tracer instances
         * - any listener (include this one) may create new Tracer instances
         * Based on those facts:
         * - fetch all existing Tracer instances
         * - read configuration and create new Tracer instances
         * - Set(preExisting) - Set(newlyCreated) = Set(toRemove);
         */
        logger.debug('configWorker "change" event');
        const registeredTracers = registered();
        // ignore skipUpdate setting - it should not affect not changed tracers
        const configuredTracers = config.components
            .filter(component => CLASSES_WITH_TRACE.indexOf(component.class) !== -1)
            .map(component => fromConfig(component))
            .filter(tracer => tracer);

        registeredTracers.forEach((tracer) => {
            if (configuredTracers.indexOf(tracer) === -1) {
                unregister(tracer, true);
            }
        });

        logger.info(`${registered().length} tracer(s) running`);
    }));

module.exports = {
    Tracer,
    getOrCreate,
    fromConfig,
    registered,
    unregister,
    unregisterAll
};
