/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const crypto = require('crypto');

const constants = require('../constants');
const logger = require('../logger');
const promiseUtil = require('./promise');
const requestsUtil = require('./requests');
const util = require('./misc');

/**
 * Cache for info about the device TS is running on
 *
 * @property {String}  TYPE    - device's type - BIG-IP or Container
 * @property {Object}  VERSION - version information
 * @property {Boolean} RETRIEVE_SECRETS_FROM_TMSH - true when device is affected by bug and you should run
 *                                                  TMSH command to retrieve secret (BZ745423)
 */
const HOST_DEVICE_CACHE = {};
const HDC_KEYS = {
    TYPE: 'TYPE',
    VERSION: 'VERSION',
    RETRIEVE_SECRETS_FROM_TMSH: 'RETRIEVE_SECRETS_FROM_TMSH',
    NODE_MEMORY_LIMIT: 'NODE_MEMORY_LIMIT'
};

/**
 * F5 Device async CLI class definition starts here
 */
// define constants to avoid 'magic' numbers and strings
// DACLI - Device Async CLI
const DACLI_RETRY_DELAY = 3000;
const DACLI_SCRIPT_URI = '/mgmt/tm/cli/script';
const DACLI_SCRIPT_STDERR = '/dev/null';
const DACLI_TASK_SCRIPT_URI = '/mgmt/tm/task/cli/script';
const DACLI_SCRIPT_NAME = 'telemetry_delete_me__async_cli_cmd_script_runner';
const DACLI_SCRIPT_CODE = 'proc script::run {} {\n    set cmd [lreplace $tmsh::argv 0 0]; eval "exec $cmd 2> stderrfile"\n}';

/**
 * F5 Device async CLI command execution via REST API.
 * Result returned by DeviceAsyncCLI.execute are not
 * the actual result of command execution, it is object
 * with task's info.
 *
 * @param {String}  host                          - HTTP host, by default 'localhost'
 * @param {Object}  [options]                     - additional initialization options
 * @param {String}  [options.scriptName]          - script name
 * @param {String}  [options.outputFile]          - path to file for stderr
 * @param {Object}  [options.connection]          - connection options
 * @param {String}  [options.connection.protocol] - host protocol to use, will override default protocol
 * @param {Integer} [options.connection.port]     - host's port to connect to, will override default port
 * @param {String}  [options.connection.allowSelfSignedCert] - false - requires SSL certificates be valid,
 *                                                  true - allows self-signed certs
 * @param {String}  [options.credentials.username]   - username for auth, will override default username
 * @param {String}  [options.credentials.passphrase] - passphrase for auth, will override default passphrase
 * @param {String}  [options.credentials.token]      - auth token for re-use
 *
 * @property {String}  host       - HTTP host
 * @property {String}  options    - see 'options' parameter
 * @property {String}  scriptName - script's name on the destination device.
 *                                  See DACLI_SCRIPT_NAME constant for default value
 * @property {String}  scriptCode - script's code on the destination device.
 *                                  See DACLI_SCRIPT_CODE constant for default value
 * @property {String}  partition  - TMOS partition to use for script creation
 * @property {String}  subPath    - TMOS subPath to use for script creation, requires partition
 * @property {Integer} retryDelay - delay before attempt task's status check again.
 *                                  See DACLI_RETRY_DELAY constant for default value
 */
function DeviceAsyncCLI() {
    // rest params syntax supported only from node 6+
    /* eslint-disable prefer-rest-params */
    this.host = typeof arguments[0] === 'string' ? arguments[0] : null;
    this.host = this.host || constants.LOCAL_HOST;

    this.options = typeof arguments[0] === 'object' ? arguments[0] : arguments[1];
    this.options = this.options || {};
    // rely on makeDeviceRequest
    this.options.credentials = this.options.credentials || {};
    this.options.connection = this.options.connection || {};

    this.scriptName = this.options.scriptName || DACLI_SCRIPT_NAME;
    this.scriptCode = DACLI_SCRIPT_CODE.replace(/stderrfile/, this.options.outputFile || DACLI_SCRIPT_STDERR);
    this.partition = '';
    this.subPath = '';
    this.retryDelay = DACLI_RETRY_DELAY;
}

/**
 * Execute command on the device
 *
 * @public
 * @param {String} cmd - command to execute on the device
 *
 * @returns (Object} Promise resolved with execution results
 */
DeviceAsyncCLI.prototype.execute = function (cmd) {
    // keep context
    const script = {
        name: this.scriptName,
        code: this.scriptCode,
        opts: {
            partition: this.partition,
            subPath: this.subPath
        }
    };
    const retryDelay = this.retryDelay;
    const errors = [];
    let taskID = null;
    let taskResult = null;

    return this._auth()
        .then(() => this._upsertTemporaryCLIscriptOnDevice(script))
        .then(() => this._createAsyncTaskOnDevice(script, cmd))
        .then((_taskID) => {
            taskID = _taskID;
        })
        .then(() => this._execAsyncTaskOnDevice(taskID))
        .then(() => this._waitForAsyncTaskToFinishOnDevice(taskID, retryDelay))
        .then((_taskResult) => {
            taskResult = _taskResult;
        })
        .catch((err) => {
            errors.push(err.message);
        })
        // try to remove results and task any way
        .then(() => {
            if (taskID) {
                return this._removeAsyncTaskResultsFromDevice(taskID, taskResult === null)
                    .catch((err) => {
                        errors.push(err.message);
                    })
                    .then(() => this._removeAsyncTaskFromDevice(taskID, taskID === null))
                    .catch((err) => {
                        errors.push(err.message);
                    });
            }
            return Promise.resolve();
        })
        // try to remove script in any case
        .then(() => this._removeTemporaryCLIscriptFromDevice(script)
            .catch((err) => {
                errors.push(err.message);
            }))
        .then(() => {
            if (errors.length) {
                const err = new Error(`DeviceAsyncCLI.execute: ${JSON.stringify(errors)}`);
                err.errors = errors;
                return Promise.reject(err);
            }
            return Promise.resolve(taskResult);
        });
};

/**
 * Request auth token from the device
 *
 * @private
 * @returns {Object} Promise resolved when token successfully obtained
 */
DeviceAsyncCLI.prototype._auth = function () {
    if (this.options.credentials.token) {
        return Promise.resolve();
    }
    // in case of optimization, replace with Object.assign
    const options = util.deepCopy(this.options.connection);
    return module.exports.getAuthToken(
        this.host,
        this.options.credentials.username,
        this.options.credentials.passphrase,
        options
    )
        .then((token) => {
            this.options.credentials.token = token.token;
        });
};

/**
 * Send request to the device
 *
 * @private
 * @param {String}  uri                           - URI to send request to
 * @param {Object}  [options]                     - optional params for request
 * @param {String}  [options.method]              - HTTP method
 * @param {Object}  [options.body]                - data to send
 *
 * @returns (Object} Promise resolved with execution results
 */
DeviceAsyncCLI.prototype._request = function (uri, options) {
    options = options || {};
    // remove parse-stringify in case of optimizations
    Object.assign(options, util.deepCopy(this.options.connection));

    options.credentials = {
        username: this.options.credentials.username,
        token: this.options.credentials.token
    };
    options.continueOnErrorCode = true;
    options.includeResponseObject = true;

    return module.exports.makeDeviceRequest(this.host, uri, options);
};

/**
 * Configure temporary TMOS script object on the device
 *
 * @private
 * @param {Object} script                  - script object
 * @param {String} script.name             - script's name
 * @param {String} script.code             - script's code
 * @param {Object} [script.opts]           - options
 * @param {String} [script.opts.partition] - partition's name
 * @param {String} [script.opts.subPath]   - sub path
 *
 * @returns {Object} Promise resolved when script was configured on the device
 */
DeviceAsyncCLI.prototype._upsertTemporaryCLIscriptOnDevice = function (script) {
    return this._createTemporaryCLIscriptOnDevice(script)
        .then((retVal) => (retVal && Promise.resolve()) || this._updateTemporaryCLIscriptOnDevice(script));
};

/**
 * Create temporary TMOS script object on the device
 *
 * @private
 * @param {Object} script      - script object
 * @param {String} script.name - script's name
 * @param {String} script.code - script's code
 *
 * @returns {Object} Promise resolved with 'true' (when script was created) or
 *                   'false' (when script creation was failed)
 */
DeviceAsyncCLI.prototype._createTemporaryCLIscriptOnDevice = function (script) {
    const args = {
        name: script.name,
        apiAnonymous: script.code
    };
    return this._request(DACLI_SCRIPT_URI, { method: 'POST', body: args })
        .then((resp) => {
            let retVal = true;
            const body = resp[0];
            const respObj = resp[1];

            if ((typeof body === 'object' && body.code && (body.code === 404 || body.code === 409))
                || (respObj.statusCode === 404 || respObj.statusCode === 409)) {
                retVal = false;
            }
            return Promise.resolve(retVal);
        });
};

/**
 * Update temporary TMOS script object on the device
 *
 * @private
 * @param {Object} script                  - script object
 * @param {String} script.name             - script's name
 * @param {String} script.code             - script's code
 * @param {Object} [script.opts]           - options
 * @param {String} [script.opts.partition] - partition's name
 * @param {String} [script.opts.subPath]   - sub path
 *
 * @returns {Object} Promise resolved when script was updated
 */
DeviceAsyncCLI.prototype._updateTemporaryCLIscriptOnDevice = function (script) {
    const name = module.exports.transformTMOSobjectName(script.opts.partition, script.name, script.opts.subPath);
    const uri = `${DACLI_SCRIPT_URI}/${name}`;
    const args = {
        name: script.name,
        apiAnonymous: script.code
    };

    return this._request(uri, { method: 'PUT', body: args })
        .then((resp) => {
            if (resp[1].statusCode !== 200) {
                return Promise.reject(new Error(`Failed to update temporary cli script on device: ${JSON.stringify(resp[0])}`));
            }
            return Promise.resolve();
        });
};

/**
 * Create async task via REST API to execute the command via script
 *
 * @private
 * @param {Object} script      - script object
 * @param {String} script.name - script's name
 * @param {String} cmd         - command to execute on the device
 *
 * @returns {Object} Promise resolved with task ID
 */
DeviceAsyncCLI.prototype._createAsyncTaskOnDevice = function (script, cmd) {
    const args = {
        command: 'run',
        name: script.name,
        utilCmdArgs: cmd
    };
    return this._request(DACLI_TASK_SCRIPT_URI, { method: 'POST', body: args })
        .then((resp) => {
            const body = resp[0];
            if (typeof body === 'object' && body._taskId) {
                return Promise.resolve(body._taskId);
            }
            return Promise.reject(new Error(`Failed to create the async task on the device: ${JSON.stringify(resp[0])}`));
        });
};

/**
 * Execute async task via REST API
 *
 * @private
 * @param {String} taskID - task ID to execute
 *
 * @returns {Object} Promise resolved with 'true' when task was executed
 */
DeviceAsyncCLI.prototype._execAsyncTaskOnDevice = function (taskID) {
    const args = {
        _taskState: 'VALIDATING'
    };
    const uri = `${DACLI_TASK_SCRIPT_URI}/${taskID}`;
    return this._request(uri, { method: 'PUT', body: args })
        .then((resp) => {
            const body = resp[0];
            if (typeof body === 'object') {
                return Promise.resolve(true);
            }
            return Promise.reject(new Error(`Failed to execute the async task on the device: ${JSON.stringify(resp[0])}`));
        });
};

/**
 * Wait for completion of async task via REST API
 *
 * @private
 * @param {String}  taskID     - task ID to poll the task's status
 * @param {Integer} retryDelay - delay before attempt status check again
 *
 * @returns {Object} Promise resolved when task was completed
 */
DeviceAsyncCLI.prototype._waitForAsyncTaskToFinishOnDevice = function (taskID, retryDelay) {
    const uri = `${DACLI_TASK_SCRIPT_URI}/${taskID}/result`;
    const options = { method: 'GET' };
    const _this = this;

    return new Promise((resolve, reject) => {
        function checkStatus() {
            _this._request(uri, options).then((resp) => {
                const body = resp[0];
                let retry = true;
                if (typeof body === 'object' && body._taskState) {
                    if (body._taskState === 'FAILED') {
                        retry = false;
                        reject(new Error(`Task failed unexpectedly: ${JSON.stringify(body)}`));
                    } else if (body._taskState === 'COMPLETED') {
                        retry = false;
                        resolve(body);
                    }
                }
                if (retry) {
                    setTimeout(checkStatus, retryDelay);
                }
            });
        }
        checkStatus();
    });
};

/**
 * Remove the script from the device
 *
 * @private
 * @param {Object} script                  - script object
 * @param {String} script.name             - script's name
 * @param {Object} [script.opts]           - options
 * @param {String} [script.opts.partition] - partition's name
 * @param {String} [script.opts.subPath]   - sub path
 *
 * @returns {Object} Promise resolved when the script was deleted
 */
DeviceAsyncCLI.prototype._removeTemporaryCLIscriptFromDevice = function (script) {
    const name = module.exports.transformTMOSobjectName(script.opts.partition, script.name, script.opts.subPath);
    const uri = `${DACLI_SCRIPT_URI}/${name}`;

    return this._request(uri, { method: 'DELETE' })
        .then((resp) => {
            if (resp[1].statusCode !== 200) {
                return Promise.reject(new Error(`Failed to remove the temporary cli script from the device: ${JSON.stringify(resp[0])}`));
            }
            return Promise.resolve();
        });
};

/**
 * Remove the task's result from the device
 *
 * @private
 * @param {String} taskID - task ID to remove the task's result
 * @param {Boolean} errOk - ignore error
 *
 * @returns {Object} Promise resolved when the task's result was deleted
 */
DeviceAsyncCLI.prototype._removeAsyncTaskResultsFromDevice = function (taskID, errOk) {
    const uri = `${DACLI_TASK_SCRIPT_URI}/${taskID}/result`;
    return this._request(uri, { method: 'DELETE' })
        .then((resp) => {
            if (resp[1].statusCode !== 200 && !errOk) {
                return Promise.reject(new Error(`Failed to delete the async task results from the device: ${JSON.stringify(resp[0])}`));
            }
            return Promise.resolve();
        });
};

/**
 * Remove the task from the device
 *
 * @private
 * @param {String} taskID - task ID to remove the task
 * @param {Boolean} errOk - ignore error
 *
 * @returns {Object} Promise resolved when the task was deleted
 */
DeviceAsyncCLI.prototype._removeAsyncTaskFromDevice = function (taskID, errOk) {
    const uri = `${DACLI_TASK_SCRIPT_URI}/${taskID}`;
    return this._request(uri, { method: 'DELETE' })
        .then((resp) => {
            if (resp[1].statusCode !== 200 && !errOk) {
                return Promise.reject(new Error(`Failed to delete the async task from the device: ${JSON.stringify(resp[0])}`));
            }
            return Promise.resolve();
        });
};
/**
 * F5 Device async CLI class definition ends here
 */

/**
 * Helper function for the encryptSecret function
 *
 * @private
 * @param {Array} splitData         - the secret that has been split up
 * @param {Array} dataArray         - the array that the encrypted data will be put
 * @param {Integer} index           - the index value used to go through the split data
 * @param {Boolean} secretsFromTMSH - fetch secrets from TMSH
 *
 * @returns {Promise} Promise resolved with the encrypted data
 */
function encryptSecretHelper(splitData, dataArray, index, secretsFromTMSH) {
    let encryptedData = null;
    let error = null;
    // can't have a + or / in the radius object name, so replace those if they exist
    const radiusObjectName = `telemetry_delete_me_${crypto.randomBytes(6)
        .toString('base64')
        .replace(/[+]/g, '-')
        .replace(/\x2f/g, '_')}`;
    const uri = '/mgmt/tm/ltm/auth/radius-server';
    const httpPostOptions = {
        method: 'POST',
        body: {
            name: radiusObjectName,
            secret: splitData[index],
            server: 'foo'
        }
    };

    return module.exports.makeDeviceRequest(constants.LOCAL_HOST, uri, httpPostOptions)
        .then((res) => {
            if (typeof res.secret !== 'string') {
                // well this can't be good
                logger.error(`Secret could not be retrieved: ${util.stringify(res)}`);
            }
            // update text field with Secure Vault cryptogram - should we base64 encode?
            encryptedData = res.secret;

            if (!secretsFromTMSH) {
                return Promise.resolve();
            }

            // TMOS 14.1.x fix for 745423
            const tmshCmd = `tmsh -a list auth radius-server ${radiusObjectName} secret`;
            return module.exports.executeShellCommandOnDevice(constants.LOCAL_HOST, tmshCmd)
                .then((tmosOutput) => {
                    /**
                     * auth radius-server telemetry_delete_me {
                     *   secret <secret-data>
                     * }
                     */
                    encryptedData = tmosOutput.split('\n')[1].trim().split(' ', 2)[1];
                });
        })
        .catch((e) => {
            error = e;
        })
        .then(() => {
            // remove TMOS object at first to keep BIG-IP clean and then throw error if needed
            const httpDeleteOptions = {
                method: 'DELETE',
                continueOnErrorCode: true // ignore error to avoid UnhandledPromiseRejection error
            };
            module.exports.makeDeviceRequest(constants.LOCAL_HOST, `${uri}/${radiusObjectName}`, httpDeleteOptions);
            if (error) {
                throw error;
            }
            if (encryptedData.indexOf(',') !== -1) {
                throw new Error('Encrypted data should not have a comma in it');
            }
            dataArray.push(encryptedData);
            index += 1;
            if (index < splitData.length) {
                return encryptSecretHelper(splitData, dataArray, index, secretsFromTMSH);
            }
            return Promise.resolve(dataArray);
        });
}

/**
 * Check if TMOS version affected by bug when secrets should be fetched from TMSH only (BZ745423)
 *
 * @param {Object} version         - TMOS version info
 * @param {String} version.version - TMOS version string
 *
 * @returns {Boolean} true if TMOS version affected by bug
 */
function isVersionAffectedBySecretsBug(version) {
    return util.compareVersionStrings(version.version, '>=', '14.1')
        && util.compareVersionStrings(version.version, '<', '15.0');
}

module.exports = {
    /**
     * Gather Host Device Info (Host Device is the device TS is running on)
     *
     * Note: result of this operation will be cached
     *
     * @returns {Promise} resolved once info about Host Device was gathered
     */
    gatherHostDeviceInfo() {
        return this.getDeviceType()
            .then((deviceType) => {
                this.setHostDeviceInfo(HDC_KEYS.TYPE, deviceType);
                return this.getDeviceVersion(constants.LOCAL_HOST);
            })
            .then((deviceVersion) => {
                this.setHostDeviceInfo(HDC_KEYS.VERSION, deviceVersion);
                this.setHostDeviceInfo(
                    HDC_KEYS.RETRIEVE_SECRETS_FROM_TMSH,
                    isVersionAffectedBySecretsBug(deviceVersion)
                );
                return this.getDeviceNodeMemoryLimit(constants.LOCAL_HOST);
            })
            .then((deviceNodeMemLimit) => {
                this.setHostDeviceInfo(HDC_KEYS.NODE_MEMORY_LIMIT, deviceNodeMemLimit);
            });
    },

    /**
     * Clear Host Device Info
     *
     * @param {...String} [key] - key(s) to remove, if absent then all keys will be removed
     */
    clearHostDeviceInfo() {
        const keysToRemove = arguments.length ? arguments : Object.keys(HOST_DEVICE_CACHE);
        Array.prototype.forEach.call(keysToRemove, (toRemove) => {
            delete HOST_DEVICE_CACHE[toRemove];
        });
    },

    /**
     * Get Host Device info
     *
     * @param {String} [key] - key, if omitted then copy of cache will be returned
     *
     * @returns {Object|Any} value from cache for the key or copy of cache if no arguments were passed to function
     */
    getHostDeviceInfo(key) {
        if (arguments.length === 0) {
            return util.deepCopy(HOST_DEVICE_CACHE);
        }
        return HOST_DEVICE_CACHE[key];
    },

    /**
     * Set Host Device Info
     * @param {String} key - key
     * @param {Any} value  - value
     */
    setHostDeviceInfo(key, value) {
        HOST_DEVICE_CACHE[key] = value;
    },

    /**
     * Performs a check of the local environment and returns device type
     *
     * @returns {Promise} A promise which is resolved with the device type.
     */
    getDeviceType() {
        const deviceType = this.getHostDeviceInfo(HDC_KEYS.TYPE);
        if (typeof deviceType !== 'undefined') {
            return Promise.resolve(deviceType);
        }
        return util.fs.readFile('/VERSION')
            .then((ret) => {
                if (/product:\s+big-ip/i.test(ret[0].toString())) {
                    return Promise.resolve(constants.DEVICE_TYPE.BIG_IP);
                }
                return Promise.reject(new Error('Host is not BIG-IP'));
            })
            .catch((readErr) => {
                logger.debugException('Unable to detect device type', readErr);
                return Promise.resolve(constants.DEVICE_TYPE.CONTAINER);
            });
    },

    /**
     * Download file from the remote device. Function doesn't handle file removal
     *
     * @param {String | WritableStream} dst - destination, could be path to file or WriteableStream
     * @param {String} host                 - host
     * @param {String} uri                  - uri to download from the remote device
     * @param {Object} [options]            - function options, see 'makeDeviceRequest'
     *
     * @returns {Promise} resolved once file downloaded
     */
    downloadFileFromDevice(dst, host, uri, options) {
        const _this = this;
        const chunkSize = 512 * 1024;
        const attemptsOnHTTPerror = 5;

        let attempt = 0;
        let start = 0;
        let end = chunkSize - 1;
        let size = 0;
        let currentBytes = 0;
        let closeStream = false;

        options = options || {};
        options.method = 'GET';
        options.headers = options.headers || {};
        options.includeResponseObject = true;
        options.continueOnErrorCode = true;
        options.rawResponseBody = true;

        if (typeof dst === 'string') {
            closeStream = true;
            dst = fs.createWriteStream(dst, { flags: 'w' });
        }
        let error;
        let wsOpened = false;

        // add our own listeners
        function wsErrorHandler(err) {
            dst.removeListener('error', wsErrorHandler);
            error = err;
        }
        function wsOpenHandler() {
            dst.removeListener('open', wsOpenHandler);
            wsOpened = true;
        }
        dst.on('open', wsOpenHandler);
        dst.on('error', wsErrorHandler);

        function _download() {
            const headers = {
                'Content-Range': `${start}-${end}/${chunkSize}`,
                'Content-Type': 'application/octet-stream'
            };
            const optionsCopy = util.deepCopy(options);
            optionsCopy.body = {
                headers: Object.assign(optionsCopy.headers, headers),
                verify: false,
                stream: false
            };

            return _this.makeDeviceRequest(host, uri, optionsCopy)
                .then((res) => {
                    if (error) {
                        return Promise.reject(error);
                    }

                    let promise;
                    const respBody = res[0];
                    const respObj = res[1];
                    const crange = respObj.headers['content-range'];

                    // should have content-range header
                    if (!crange) {
                        const msg = `${respObj.statusCode} ${respObj.statusMessage} ${JSON.stringify(respBody)}`;
                        return Promise.reject(new Error(`HTTP Error: ${msg}`));
                    }
                    if (respObj.statusCode >= 200 && respObj.statusCode < 300) {
                        // handle it in async way, waiting for callback from write
                        promise = new Promise((resolve, reject) => {
                            currentBytes += parseInt(respObj.headers['content-length'], 10);
                            dst.write(respBody, (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    } else {
                        attempt += 1;
                        if (attempt >= attemptsOnHTTPerror) {
                            return Promise.reject(new Error('Exceeded number of attempts on HTTP error'));
                        }
                    }

                    promise = promise || Promise.resolve();
                    return promise.then(() => {
                        if (size === 0) {
                            size = parseInt(crange.split('/').slice(-1)[0], 10);
                        }
                        start = currentBytes;
                        end = (currentBytes + chunkSize) > size ? size : (start + chunkSize);
                        // data starts from 0 position
                        end -= 1;
                        if (start > size) {
                            error = new Error(`Exceeded expected size: ${start} bytes read, expected ${size} bytes`);
                        }
                        return start === size ? Promise.resolve() : _download();
                    });
                });
        }

        return _download()
            .catch((err) => {
                error = err;
            })
            .then(() => {
                let promise;
                if (closeStream && dst.end) {
                    // it is our own stream
                    promise = new Promise((resolve) => {
                        dst.on('close', () => resolve());
                        dst.end(() => {
                            dst.close();
                            if (!wsOpened) {
                                resolve();
                            }
                        });
                        if (!wsOpened) {
                            // multiple 'resolve' possible but 'promise' will be fulfilled already.
                            resolve();
                        }
                    });
                }
                promise = promise || Promise.resolve();
                if (error) {
                    promise = promise.then(() => Promise.reject(new Error(`downloadFileFromDevice: ${error}`)));
                }
                return promise;
            });
    },

    /**
     * Run Unix Command (ls/mv/rm) via REST API
     *
     * @param {String} cmd       - command to run (ls/mv/rm)
     * @param {String} args      - arguments to pass to command
     * @param {String} host      - host
     * @param {Object} [options] - function options, see 'makeDeviceRequest'
     * @param {Boolean} [options.splitLsOutput = true] - split 'ls' output into array
     *
     * @returns {Promise<String | Array<String>>} resolved with command's output
     */
    runTMUtilUnixCommand(cmd, args, host, options) {
        if (['ls', 'rm', 'mv'].indexOf(cmd) === -1) {
            throw new Error(`runTMUtilUnixCommand: invalid command '${cmd}'`);
        }
        const uri = `/mgmt/tm/util/unix-${cmd}`;
        options = options || {};
        options.method = 'POST';
        options.includeResponseObject = false;
        options.body = {
            command: 'run',
            utilCmdArgs: args
        };
        const splitLsOutput = typeof options.splitLsOutput === 'undefined' || options.splitLsOutput;
        delete options.splitLsOutput;

        return this.makeDeviceRequest(host, uri, options)
            .then((res) => {
                // mv and rm should have no commandResult on success
                if (res.commandResult && (
                    (cmd === 'ls' && res.commandResult.startsWith('/bin/ls:'))
                        || cmd === 'mv' || cmd === 'rm')) {
                    return Promise.reject(new Error(res.commandResult));
                }
                res.commandResult = res.commandResult || '';
                if (cmd === 'ls' && splitLsOutput) {
                    res.commandResult = res.commandResult.split(/\r\n|\r|\n/);
                    if (res.commandResult[res.commandResult.length - 1] === '') {
                        res.commandResult.pop();
                    }
                }
                return Promise.resolve(res.commandResult);
            });
    },

    /**
     * Returns installed software version
     *
     * @param {String} host      - HTTP host
     * @param {Object} [options] - function options, see 'makeDeviceRequest'
     *
     * @returns {Promise} A promise which is resolved with response
     *
     */
    getDeviceVersion(host, options) {
        const uri = '/mgmt/tm/sys/version';
        options = options || {};
        options.method = 'GET';
        options.includeResponseObject = false;

        return this.makeDeviceRequest(host, uri, options)
            .then((res) => {
                const entries = res.entries[Object.keys(res.entries)[0]].nestedStats.entries;
                const result = {};
                Object.keys(entries).forEach((prop) => {
                    result[prop[0].toLowerCase() + prop.slice(1)] = entries[prop].description;
                });
                return result;
            });
    },

    /**
     * Returns a device's node memory limit in MB
     *
     * @param {String} host      - HTTP host
     * @param {Object} [options] - function options, see 'makeDeviceRequest'
     *
     * @returns {Promise<Number>} A promise which is resolved with the max memory limit for device
     *           If an error occurs, the node default of 1433 MB (1.4 GB) will be returned
     */
    getDeviceNodeMemoryLimit(host, options) {
        const defaultMem = constants.APP_THRESHOLDS.MEMORY.DEFAULT_MB;
        let provisionExtraMb;
        let useExtraMb;

        const uri = '/mgmt/tm/sys/db';
        options = options || {};
        options.method = 'GET';
        options.includeResponseObject = false;
        return promiseUtil.allSettled([
            this.makeDeviceRequest(host, `${uri}/restjavad.useextramb`, util.copy(options)),
            this.makeDeviceRequest(host, `${uri}/provision.extramb`, util.copy(options))
        ])
            .then((results) => {
                results = promiseUtil.getValues(results);
                useExtraMb = results[0];
                provisionExtraMb = results[1];
                if (!util.isObjectEmpty(useExtraMb) && (useExtraMb.value === 'true' || useExtraMb.value === true)
                    && !util.isObjectEmpty(provisionExtraMb) && provisionExtraMb.value > defaultMem) {
                    return provisionExtraMb.value;
                }
                return defaultMem;
            })
            .catch((err) => {
                logger.warning(`Unable to retrieve memory provisioning. ${err.message}`);
            })
            .then((memLimit) => {
                if (!memLimit) {
                    logger.debug(`Memory provisioning: (default) ${defaultMem}`);
                    return defaultMem;
                }
                logger.debug(`Memory provisioning: ${memLimit} | Sys db settings: restjavad.useextramb (${JSON.stringify(useExtraMb || {})}) | provision.extramb (${JSON.stringify(provisionExtraMb || {})})}`);
                return Number(memLimit);
            });
    },

    /**
     * Send request to the device
     *
     * @param {String}  host                            - HTTP host
     * @param {String}  uri                             - HTTP uri
     * @param {Object}  [options]                       - function options, similar to 'makeRequest'.
     *                                                      Copy it before pass to function.
     * @param {Object}  [options.credentials]           - authorization data
     * @param {String}  [options.credentials.username]  - username for authorization. Ignored when 'token' specified
     * @param {String}  [options.credentials.token]     - authorization token
     * @param {Boolean} [options.rawResponseBody]       - return response as Buffer object with binary data
     *
     * @returns {Object} Returns promise resolved with response
     */
    makeDeviceRequest(host, uri, options) {
        options = options || {};
        options.headers = options.headers || {};
        const headers = options.headers;
        const credentials = options.credentials || {};
        delete options.credentials;

        if (!headers['x-f5-auth-token']) {
            if (credentials.token) {
                headers['x-f5-auth-token'] = credentials.token;
            } else if (!headers.Authorization) {
                const username = credentials.username || constants.DEVICE_REST_API.USER;
                headers.Authorization = `Basic ${Buffer.from(`${username}:`).toString('base64')}`;
            }
        } // else - should we delete 'Authorization' header?

        options.protocol = options.protocol || constants.DEVICE_REST_API.PROTOCOL;
        options.port = options.port || constants.DEVICE_REST_API.PORT;
        return requestsUtil.makeRequest(host, uri, options);
    },

    /**
     * Execute shell command(s) via REST API on BIG-IP.
     * Command should have escaped quotes.
     * If host is not localhost then auth token should be passed along with headers.
     *
     * @param {String} host                     - HTTP host
     * @param {String} command                  - shell command
     * @param {Object} options                  - function options, see 'makeDeviceRequest'
     *
     * @returns {Object} Returns promise resolved with response
     */
    executeShellCommandOnDevice(host, command, options) {
        const uri = '/mgmt/tm/util/bash';
        options = options || {};
        options.method = 'POST';
        options.includeResponseObject = false;
        options.body = {
            command: 'run',
            utilCmdArgs: `-c "${command}"`
        };
        return this.makeDeviceRequest(host, uri, options)
            .then((res) => res.commandResult || '');
    },

    /**
     * Request auth token
     *
     * @param {String}  host                          - HTTP host
     * @param {String}  username                      - device username
     * @param {String}  password                      - device password
     * @param {Object}  [options]                     - function options
     * @param {String}  [options.protocol]            - HTTP protocol
     * @param {Integer} [options.port]                - HTTP port
     * @param {Boolean} [options.allowSelfSignedCert] - false - requires SSL certificates be valid,
     *                                                  true - allows self-signed certs
     *
     * @returns {Object} Returns promise resolved with auth token: { token: 'token' }
     */
    requestAuthToken(host, username, password, options) {
        const uri = '/mgmt/shared/authn/login';
        options = options || {};
        options.method = 'POST';
        options.includeResponseObject = false;
        options.body = {
            username,
            password,
            loginProviderName: 'tmos'
        };

        return this.makeDeviceRequest(host, uri, options)
            .then((data) => ({ token: data.token.token }));
    },

    /**
     * Get auth token
     *
     * @param {String}  host                          - HTTP host
     * @param {String}  username                      - device username
     * @param {String}  password                      - device password
     * @param {Object}  [options]                     - function options
     * @param {String}  [options.protocol]            - HTTP protocol
     * @param {Integer} [options.port]                - HTTP port
     * @param {Boolean} [options.allowSelfSignedCert] - false - requires SSL certificates be valid,
     *                                                  true - allows self-signed certs
     *
     * @returns {Object} Returns promise resolved with auth token: { token: 'token' }
     */
    getAuthToken(host, username, password, options) {
        let promise;
        // if host is localhost we do not need an auth token
        if (host === constants.LOCAL_HOST) {
            promise = Promise.resolve({ token: null });
        } else {
            if (!(username && password)) {
                return Promise.reject(new Error('getAuthToken: Username and password required'));
            }
            promise = this.requestAuthToken(host, username, password, options);
        }
        return promise;
    },

    /**
     * Encrypt secret
     *
     * @param {String} data - data to encrypt
     *
     * @returns {Object} Returns promise resolved with encrypted secret
     */
    encryptSecret(data) {
        let affectedByBug = this.getHostDeviceInfo(HDC_KEYS.RETRIEVE_SECRETS_FROM_TMSH);
        let promise = Promise.resolve();

        if (typeof affectedByBug === 'undefined') {
            promise = promise.then(() => this.getDeviceVersion(constants.LOCAL_HOST))
                .then((deviceVersion) => {
                    affectedByBug = isVersionAffectedBySecretsBug(deviceVersion);
                });
        }
        return promise.then(() => {
            const splitData = data.match(/(.|\n){1,500}/g);
            return encryptSecretHelper(splitData, [], 0, affectedByBug).then((result) => result.join(','));
        });
    },

    /**
     * Decrypt secret
     *
     * @param {String} data - data to decrypt
     *
     * @returns {Object} Returns promise resolved with decrypted secret
     */
    decryptSecret(data) {
        const splitData = data.split(',');
        const args = [`${__dirname}/decryptConfValue.php`].concat(splitData);
        return util.childProcess.execFile('/usr/bin/php', args)
            .then((ret) => ret[0]);
    },

    /**
     * Decrypt all secrets
     *
     * @param {Object} data - data to decrypt
     *
     * @returns {Promise<Object>} resolve with decrypted data
     */
    decryptAllSecrets(data) {
        const promises = [];
        util.traverseJSON(data, (parent, key) => {
            const item = parent[key];
            if (typeof item === 'object' && !Array.isArray(item)
                && item !== null && item.class === constants.CONFIG_CLASSES.SECRET_CLASS) {
                if (typeof item[constants.PASSPHRASE_CIPHER_TEXT] !== 'undefined') {
                    promises.push(this.decryptSecret(item[constants.PASSPHRASE_CIPHER_TEXT])
                        .then((decryptedVal) => {
                            parent[key] = decryptedVal;
                        }));
                } else if (typeof item[constants.PASSPHRASE_ENVIRONMENT_VAR] !== 'undefined') {
                    // constants.PASSPHRASE_ENVIRONMENT_VAR means secret resides in an environment variable
                    parent[key] = process.env[item[constants.PASSPHRASE_ENVIRONMENT_VAR]];
                    if (typeof parent[key] === 'undefined') {
                        parent[key] = null;
                        logger.error(`Environment variable does not exist: ${item[constants.PASSPHRASE_ENVIRONMENT_VAR]}`);
                    }
                } else {
                    parent[key] = null;
                }
                // no needs to inspect nested data
                return false;
            }
            return true;
        });
        return promiseUtil.allSettled(promises)
            .then((results) => {
                promiseUtil.getValues(results);
                return data;
            });
    },

    /**
     * Transform name for valid string
     *
     * @param {String} partition - partition name
     * @param {String} name      - object name
     * @param {String} subPath   - sub path
     *
     * @returns {String} valid object path
     */
    transformTMOSobjectName(partition, name, subPath) {
        partition = partition || '';
        name = name || '';
        subPath = subPath || '';

        if (name) {
            name = name.replace(/\//g, '~');
        }
        if (partition) {
            partition = `~${partition}`;
        } else if (subPath) {
            throw new Error('transformTMOSobjectName: When giving the subPath component include partition as well.');
        }
        if (subPath && partition) {
            subPath = `~${subPath}`;
        }
        if (name && partition) {
            name = `~${name}`;
        }
        return `${partition}${subPath}${name}`;
    },

    /**
     * Check if path exists on the device
     *
     * @param {String} path - path
     * @param {String} host - host
     * @param {Object} [options] - function options, see 'makeDeviceRequest'
     *
     * @returns {Promise} resolved when path exists on device
     */
    pathExists(path, host, options) {
        return this.runTMUtilUnixCommand('ls', `"${path}"`, host, options);
    },

    /**
     * Remove path on the device
     *
     * @param {String} path - path to remove
     * @param {String} host - host
     * @param {Object} [options] - function options, see 'makeDeviceRequest'
     *
     * @returns {Promise} resolved when path removed
     */
    removePath(path, host, options) {
        return this.runTMUtilUnixCommand('rm', `"${path}"`, host, options);
    },

    /**
     * Fetch device's info
     *
     * Fetches system info for arbitrary BIG-IP via REST API
     *
     * @param {String} host  - host
     * @param {Object} [options] - function options, see 'makeDeviceRequest'
     *
     * @returns {Promise<Object>} resolved with device's info
     */
    getDeviceInfo(host, options) {
        const uri = '/mgmt/shared/identified-devices/config/device-info';
        options = options || {};
        options.method = 'GET';
        options.includeResponseObject = false;

        return this.makeDeviceRequest(host, uri, options)
            .then((res) => ({
                baseMac: res.baseMac,
                build: res.build,
                chassisSerialNumber: res.chassisSerialNumber,
                halUuid: res.halUuid,
                hostMac: res.hostMac,
                hostname: res.hostname,
                isClustered: res.isClustered,
                isVirtual: res.isVirtual,
                machineId: res.machineId,
                managementAddress: res.managementAddress,
                mcpDeviceName: res.mcpDeviceName,
                physicalMemory: res.physicalMemory,
                platform: res.platform,
                product: res.product,
                trustDomainGuid: res.trustDomainGuid,
                version: res.version
            }));
    },

    DeviceAsyncCLI
};
