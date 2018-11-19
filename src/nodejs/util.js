/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');
const request = require('request');

const constants = require('./constants');
const logger = require('./logger.js');

/**
 * Tracer class - useful for debug to dump streams of data.
 *
 * Note: no 'class' usage to support v12.x
 *
 * @param {string} name       - tracer name
 * @param {string} tracerPath - path to file
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
// check every 15 sec. if file eixsts or not
Tracer.REOPEN_INTERVAL = 15000;
/**
 * Tracer states
 */
Tracer.STATE = Object.freeze({
    NEW: 'NEW',
    INIT: 'INIT',
    CREATED: 'CREATED',
    READY: 'READY',
    CLOSING: 'CLOSING',
    CLOSED: 'CLOSED',
    REOPEN: 'REOPEN',
    STOP: 'STOP'
});
/**
 * Remove schedule 'reopen' function
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
 */
Tracer.prototype._setReady = function () {
    this._updateInode();
    this.reopenIfNeeded(true);
    this._setState(Tracer.STATE.READY);
};
/**
 * Mark tracer as closed
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
 */
Tracer.prototype._setClosing = function () {
    logger.info(`Closing tracer '${this.name}' stream to file '${this.path}'`);
    if (this.stream) {
        this.stream.end();
        this.stream = undefined;
    }
    this._setState(Tracer.STATE.CLOSING);
};
/**
 * Update file's inode to handle situations when file was recreated outside.
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
 * @returns {Object} Promise
 */
Tracer.prototype._reopenIfNeeded = function () {
    // if stream is not ready then skip check
    if (!this.isReady()) {
        return Promise.resolve();
    }
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve) => {
        // Resolve with true when stream still writing to same file
        fs.stat(this.path, (err, stats) => {
            let exists = false;
            if (err) {
                logger.error(`Unable to get stats for tracer '${this.name}' file '${this.path}': ${err}`);
            } else {
                exists = stats.ino === this.inode;
            }
            resolve(exists);
        });
    })
        .then((exists) => {
            if (exists || !this.isReady()) {
                return Promise.resolve(false);
            }
            return this._mkdir().then(() => Promise.resolve(true));
        })
        .then((needReopen) => {
            if (!(needReopen && this.isReady())) {
                return Promise.resolve(undefined);
            }
            // if file doesn't exists then we need
            // to re-open file and safely redirect stream to new FD
            return new Promise((resolve) => {
                this._setState(Tracer.STATE.REOPEN);
                // first step - open new file and assign new FD to stream
                // second step - close old file descriptor
                fs.open(this.path, 'w', (openErr, fd) => {
                    if (openErr) {
                        logger.error(`Unable to re-open tracer '${this.name}' file '${this.path}': ${openErr}`);
                        this.close();
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
            const oldFD = this.stream.fd;
            this.stream.fd = newFD;
            // update state
            this._setReady();
            // try close old FD
            fs.close(oldFD, (closeErr) => {
                if (closeErr) {
                    logger.error(`Unable to close tracer '${this.name}' previous fd=${oldFD}: ${closeErr}`);
                }
            });
        })
        .catch(err => logger.exception(`tracer._reopenIfNeeded exception: ${err}`, err));
};
/**
 * Create destination directory if needed
 *
 * @returns {Object} Promise resolved when tracer is ready to continue
 */
Tracer.prototype._mkdir = function () {
    const baseDir = path.dirname(this.path);
    return new Promise((resolve) => {
        fs.access(baseDir, fs.F_OK, (accessErr) => {
            let exists = true;
            if (accessErr) {
                logger.error(`tracer._mkdir unable to access '${baseDir}': ${accessErr}`);
                exists = false;
            }
            resolve(exists);
        });
    }).then((dirExists) => {
        if (dirExists) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            logger.info(`Creating dir '${baseDir}' for tracer '${this.name}'`);
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
 * @returns {Object} Promise resolved when new stream created or exists already
 */
Tracer.prototype._open = function () {
    if (!this.isNew()) {
        return Promise.resolve();
    }
    logger.info(`Creating new tracer '${this.name}' stream to file '${this.path}'`);
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
        });
};
/**
 * Truncate destination file if needed
 *
 * @returns {Object} Promise resolved when file was truncated else rejected
 */
Tracer.prototype._truncate = function () {
    return new Promise((resolve, reject) => {
        if (!this.isReady() || this.isTruncated) {
            resolve();
        } else {
            /**
            * marking file as truncated to avoid sequential calls.
            * Ideally, stream will be flushed after every tick,
            * so lets mark file as not truncated after every tick.
            * Btw, side effect - despite on 'w' at stream creation,
            * file will be truncated twice in any case.
            */
            this.isTruncated = true;
            fs.ftruncate(this.stream.fd, 0, (err) => {
                if (err) {
                    reject(err);
                    this.isTruncated = false;
                } else {
                    process.nextTick(() => {
                        this.isTruncated = false;
                    });
                    // update stream's position
                    this.stream.pos = 0;
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
 * @param {string} data - data to write to stream
 *
 * @returns {Object} Promise resolved when data was written
 */
Tracer.prototype._write = function (data) {
    return new Promise((resolve, reject) => {
        // data will be buffered even if file in CREATED state
        if (!this.isAvailable()) {
            resolve();
        } else {
            this.stream.write(data, (err) => {
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
 * @param {string} data - data to write to tracer
 */
Tracer.prototype.write = function (data) {
    this._open()
        .then(() => this._truncate())
        .then(() => this._write(data))
        .catch((err) => {
            logger.error(`tracer.write error: ${err}`);
        });
};
/**
 * instances cache
 */
Tracer.instances = {};
/**
 * Get Tracer instance or create new one
 *
 * @param {string} name       - tracer name
 * @param {string} tracerPath - destination path
 *
 * @returns {Object} Tracer instance
 */
Tracer.get = function (name, tracerPath) {
    let tracer = Tracer.instances[name];
    if (!tracer) {
        logger.info(`Creating new tracer instance - '${name}' file '${tracerPath}'`);
        tracer = new Tracer(name, tracerPath);
        Tracer.instances[name] = tracer;
    } else {
        logger.info(`Updating tracer instance - '${name}' file '${tracerPath}'`);
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
 * @param {string} objName  - object's name
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
 * @param {Object} tracer - tracer instance to remove
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
 * Remove Tracer instance
 *
 * @param {string | Object} toRemove - tracer or tracer's name to remove
 * @param {function(tracer)} filter  - filter function
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
* Tracer class definition ends here
*/


module.exports = {
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
     *
     * @returns {void}
     */
    restOperationResponder(restOperation, status, body) {
        restOperation.setStatusCode(status);
        restOperation.setBody(body);
        restOperation.complete();
    },

    /**
     * Convert array to map using provided options
     *
     * @param {Object} data                - data
     * @param {String} key                 - key in array containing value to use as key in map
     * @param {Object} options             - optional arguments
     * @param {String} [options.keyPrefix] - prefix for key
     *
     * @returns {Object} Converted data
     */
    convertArrayToMap(data, key, options) {
        const ret = {};

        if (!Array.isArray(data)) {
            throw new Error(`convertArrayToMap() array required: ${this.stringify(data)}`);
        }

        data.forEach((i) => {
            const keyName = options.keyPrefix ? `${options.keyPrefix}${i[key]}` : i[key];
            ret[keyName] = i;
        });
        return ret;
    },

    /**
     * Filter data based on a list of keys
     *
     * @param {Object} data - data
     * @param {Array} keys  - list of keys to use to filter data
     *
     * @returns {Object} Filtered data
     */
    filterDataByKeys(data, keys) {
        const ret = data;

        if (typeof data === 'object') {
            // for now just ignore arrays
            if (Array.isArray(data)) {
                return ret;
            }

            Object.keys(data).forEach((k) => {
                let deleteKey = true;
                keys.forEach((i) => {
                    // simple includes for now - no exact match
                    if (k.includes(i)) {
                        deleteKey = false;
                    }
                });
                if (deleteKey) {
                    delete ret[k];
                } else {
                    ret[k] = this.filterDataByKeys(ret[k], keys);
                }
            });
        }

        return ret;
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
     * Validate data against schema
     *
     * @param {Object} data - data to validate
     * @param {Object} schema - schema(s) to validate against
     * { base: baseSchema, schema1: schema, schema2: schema }
     *
     * @returns {Object} Promise which is resolved with the validated data
     */
    validateAgainstSchema(data, schemas) {
        const ajv = new Ajv({ useDefaults: true, coerceTypes: true });
        Object.keys(schemas).forEach((k) => {
            // ignore base, that will be added later
            if (k !== 'base') {
                ajv.addSchema(schemas[k]);
            }
        });
        const validator = ajv.compile(schemas.base);
        const isValid = validator(data);

        if (!isValid) {
            const error = this.stringify(validator.errors);
            return Promise.reject(new Error(error));
        }
        return Promise.resolve(data);
    },

    /**
     * Format data by class
     *
     * @param {Object} data - data to format
     *
     * @returns {Object} Returns the data formatted by class
     */
    formatDataByClass(data) {
        let ret = {};
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach((k) => {
                const childData = data[k];
                if (typeof childData === 'object' && childData.class) {
                    if (!ret[childData.class]) { ret[childData.class] = {}; }
                    ret[childData.class][k] = childData;
                } else {
                    // might need to introspect child objects
                    ret = this.formatDataByClass(childData);
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
     * Perform HTTP request
     *
     * @param {String} host              - HTTP host
     * @param {String} uri               - HTTP uri
     * @param {Object} options           - function options
     * @param {Integer} [options.port]   - HTTP port
     * @param {String} [options.method]  - HTTP method
     * @param {String} [options.body]    - HTTP body
     * @param {Object} [options.headers] - HTTP headers
     *
     * @returns {Object} Returns promise resolved with response
     */
    makeRequest(host, uri, options) {
        const opts = options === undefined ? {} : options;
        const defaultHeaders = {
            Authorization: `Basic ${new Buffer('admin:').toString('base64')}`,
            'User-Agent': constants.USER_AGENT
        };

        // well, should be more sophisticated than this
        // default to https, unless in defined list of http ports
        let fullUri = [80, 8080, 8100].indexOf(options.port) !== -1 ? `http://${host}` : `https://${host}`;
        fullUri = options.port ? `${fullUri}:${options.port}${uri}` : `${fullUri}:${constants.DEFAULT_PORT}${uri}`;
        const requestOptions = {
            uri: fullUri,
            method: opts.method ? opts.method : 'GET',
            body: opts.body ? String(opts.body) : undefined,
            headers: opts.headers ? opts.headers : defaultHeaders,
            strictSSL: constants.STRICT_TLS_REQUIRED
        };

        return new Promise((resolve, reject) => {
            request(requestOptions, (err, res, body) => {
                if (err) {
                    reject(new Error(`HTTP error: ${err}`));
                } else if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} for ${uri}`;
                    reject(new Error(msg));
                }
            });
        });
    },

    /**
     * Get auth token
     *
     * @param {String} host            - HTTP host
     * @param {String} username        - device username
     * @param {String} password        - device password
     * @param {Object} options         - function options
     * @param {Integer} [options.port] - HTTP port
     *
     * @returns {Object} Returns promise resolved with auth token
     */
    getAuthToken(host, username, password, options) {
        const uri = '/mgmt/shared/authn/login';
        const body = JSON.stringify({
            username,
            password,
            loginProviderName: 'tmos'
        });
        const postOptions = {
            method: 'POST',
            port: options.port,
            body
        };

        return this.makeRequest(host, uri, postOptions)
            .then((data) => {
                const ret = { token: data.token.token };
                return ret;
            })
            .catch((err) => {
                const msg = `getAuthToken: ${err}`;
                throw new Error(msg);
            });
    },

    tracer: Tracer
};
