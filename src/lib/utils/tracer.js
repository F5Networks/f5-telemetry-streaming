

/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const path = require('path');
const logger = require('../logger');
const util = require('./misc');
const constants = require('../constants');
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
        return util.fs.close(this.fd)
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
        return util.fs.access(baseDir, (util.fs.constants || util.fs).R_OK)
            .catch((accessErr) => {
                logger.exception(`tracer._mkdir unable to access dir '${baseDir}'`, accessErr);
                return true;
            })
            .then((needToCreate) => {
                if (needToCreate !== true) {
                    return Promise.resolve();
                }
                logger.debug(`Creating dir '${baseDir}' for tracer '${this.name}'`);
                return util.fs.mkdir(baseDir);
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
            .then(() => util.fs.open(this.path, 'w+'))
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
            .then(data => JSON.stringify(data, null, 4))
            .then(dataToWrite => util.fs.ftruncate(this.fd, 0)
                .then(() => util.fs.write(this.fd, dataToWrite, 0, constants.TRACER.ENCODING)))
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

module.exports = {
    Tracer
};
