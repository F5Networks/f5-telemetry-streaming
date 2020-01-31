/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const diff = require('deep-diff');

const constants = require('./constants.js');
const logger = require('./logger.js');
const util = require('./util.js');


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
 * @property {String}  scriptName - script's name on the destionation device.
 *                                  See DACLI_SCRIPT_NAME constant for default value
 * @property {String}  scriptCode - script's code on the destionation device.
 *                                  See DACLI_SCRIPT_CODE constant for default value
 * @property {String}  partition  - TMOS partition to use for script creation
 * @property {String}  subPath    - TMOS subPath to use for script creation, requires partition
 * @property {Integer} retryDelay - delay before attempt task's status check again.
 *                                  See DACLI_RETRY_DELAY constant for default value
 */
function DeviceAsyncCLI() {
    // rest params syntax supported only fron node 6+
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
        this.host, this.options.credentials.username, this.options.credentials.passphrase, options
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
 * Confgure temporary TMOS script object on the device
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
        .then(retVal => (retVal && Promise.resolve()) || this._updateTemporaryCLIscriptOnDevice(script));
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
 * @param {Array} splitData - the secret that has been split up
 * @param {Array} dataArray - the array that the encrypted data will be put
 * @param {Integer} index - the endex value used to go through the split data
 *
 * @returns {Promise} Promise resolved with the encrypted data
 */
function encryptSecretHelper(splitData, dataArray, index) {
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
            return module.exports.getDeviceVersion(constants.LOCAL_HOST);
        })
        .then((deviceVersion) => {
            let promise;
            if (util.compareVersionStrings(deviceVersion.version, '>=', '14.1')
                    && util.compareVersionStrings(deviceVersion.version, '<', '15.0')) {
                // TMOS 14.1.x fix for 745423
                const tmshCmd = `tmsh -a list auth radius-server ${radiusObjectName} secret`;
                promise = module.exports.executeShellCommandOnDevice(constants.LOCAL_HOST, tmshCmd)
                    .then((res) => {
                        /**
                         * auth radius-server telemetry_delete_me {
                         *   secret <secret-data>
                         * }
                         */
                        encryptedData = res.split('\n')[1].trim().split(' ', 2)[1];
                    });
            }
            return promise || Promise.resolve();
        })
        .catch((e) => {
            error = e;
        })
        .then(() => {
            const httpDeleteOptions = {
                method: 'DELETE',
                continueOnErrorCode: true
            };
            module.exports.makeDeviceRequest(constants.LOCAL_HOST, `${uri}/${radiusObjectName}`, httpDeleteOptions);
            if (error) {
                throw error;
            }
        })
        .then(() => {
            if (encryptedData.indexOf(',') !== -1) {
                throw new Error('Encrypted data should not have a comma in it');
            }
            dataArray.push(encryptedData);
            index += 1;
            if (index < splitData.length) {
                return encryptSecretHelper(splitData, dataArray, index);
            }
            return Promise.resolve(dataArray);
        });
}

module.exports = {
    /**
     * Performs a check of the local environment and returns device type
     *
     * @returns {Promise} A promise which is resolved with the device type.
     *
     */
    getDeviceType() {
        // eslint-disable-next-line no-unused-vars
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line no-unused-vars
            childProcess.exec('/usr/bin/tmsh -a show sys version', (error, stdout, stderr) => {
                if (error) {
                    // don't reject, just assume we are running on a container
                    resolve(constants.CONTAINER_DEVICE_TYPE);
                } else {
                    // command did not error so we must be a BIG-IP
                    resolve(constants.BIG_IP_DEVICE_TYPE);
                }
            });
        });
    },

    /**
     * Download file from the remote device. Function doesn't handle file removal
     *
     * @param {String | WritableStream} dst - destination, could be path to file or WriteableStream
     * @param {String} host                 - host
     * @param {String} uri                  - uri to download from the remote device
     * @param {Object} [options]            - function options, see 'makeDeviceRequest'
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
                        throw new Error(`HTTP Error: ${msg}`);
                    } else if (respObj.statusCode >= 200 && respObj.statusCode < 300) {
                        // handle it in async way, waiting for callabck from write
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
                            error = new Error('Exceeded number of attempts on HTTP error');
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
     *
     * @returns {Object} Promise resolved with command's output
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
        return this.makeDeviceRequest(host, uri, options)
            .then((res) => {
                // mv and rm should have no commandResult on success
                if (res.commandResult && (res.commandResult.startsWith('/bin/ls:')
                        || (cmd === 'mv' || cmd === 'rm'))) {
                    return Promise.reject(new Error(res.commandResult));
                }
                return Promise.resolve(res.commandResult || '');
            })
            .catch((err) => {
                const msg = `runTMUtilUnixCommand: ${err}`;
                throw new Error(msg);
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
            })
            .catch((err) => {
                const msg = `getDeviceVersion: ${err}`;
                throw new Error(msg);
            });
    },

    /**
     * Send request to the device
     *
     * @param {String} host                           - HTTP host
     * @param {String} uri                            - HTTP uri
     * @param {Object} [options]                      - function options, similar to 'makeRequest'.
     *                                                  Copy it before pass to function.
     * @param {Object} [options.credentials]          - authorization data
     * @param {String} [options.credentials.username] - username for authorization. Ignored when 'username' specified
     * @param {String} [options.credentials.token]    - authorization token
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
                const username = credentials.username || constants.DEVICE_DEFAULT_USER;
                headers.Authorization = `Basic ${Buffer.from(`${username}:`).toString('base64')}`;
            }
        } // else - should we delete 'Authorization' header?

        options.protocol = options.protocol || constants.DEVICE_DEFAULT_PROTOCOL;
        options.port = options.port || constants.DEVICE_DEFAULT_PORT;
        return util.makeRequest(host, uri, options);
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
            .then(res => res.commandResult || '')
            .catch((err) => {
                const msg = `executeShellCommandOnDevice: ${err}`;
                throw new Error(msg);
            });
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
            .then(data => ({ token: data.token.token }))
            .catch((err) => {
                const msg = `requestAuthToken: ${err}`;
                throw new Error(msg);
            });
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
        const splitData = data.match(/(.|\n){1,500}/g);
        return encryptSecretHelper(splitData, [], 0).then(result => result.join(','));
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
        return new Promise((resolve, reject) => {
            childProcess.execFile('/usr/bin/php', args, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`decryptSecret exec error: ${error} ${stderr}`));
                } else {
                    // stdout should simply contain decrypted secret
                    resolve(stdout);
                }
            });
        });
    },

    /**
     * Decrypt all secrets in config
     *
     * @param {Object} data - data (config)
     *
     * @returns {Object} Returns promise resolved with config containing decrypted secrets
     */
    decryptAllSecrets(data) {
        // helper functions strictly for this function
        const removePassphrase = (iData) => {
            if (iData && typeof iData === 'object') {
                if (Array.isArray(iData)) {
                    iData.forEach((i) => {
                        removePassphrase(i);
                    });
                } else {
                    const keys = Object.keys(iData);

                    // check for value containing an object with 'class': 'Secret'
                    // this applies to named key 'passphrase' as well as unknown key names
                    keys.forEach((k) => {
                        if (typeof iData[k] === 'object' && iData[k].class === 'Secret') {
                            delete iData[k];
                        }
                    });

                    // finally recurse child objects
                    keys.forEach((k) => {
                        removePassphrase(iData[k]);
                    });
                }
            }
            return iData;
        };
        const getPassphrase = (iData, iPath) => {
            // assume diff returned valid path, so let's start at root and then
            // navigate down to object
            let passphrase = iData;
            iPath.forEach((i) => {
                passphrase = passphrase[i];
            });
            return passphrase;
        };
        // end helper functions

        // deep copy of the data, then remove passphrases and get a diff using deep-diff module
        // telling us where exactly in the config each passphrase is and how many there are
        const dataCopy = util.deepCopy(data);
        const passphrases = diff(removePassphrase(dataCopy), data) || [];

        // now for each passphrase determine if decryption (or download, etc.) is required
        const promises = [];
        passphrases.forEach((i) => {
            const passphrase = getPassphrase(data, i.path);

            if (passphrase[constants.PASSPHRASE_CIPHER_TEXT] !== undefined) {
                // constants.PASSPHRASE_CIPHER_TEXT means local decryption is required
                promises.push(this.decryptSecret(passphrase[constants.PASSPHRASE_CIPHER_TEXT]));
            } else if (passphrase[constants.PASSPHRASE_ENVIRONMENT_VAR] !== undefined) {
                // constants.PASSPHRASE_ENVIRONMENT_VAR means secret resides in an environment variable
                let envValue = process.env[passphrase[constants.PASSPHRASE_ENVIRONMENT_VAR]];
                if (envValue === undefined) {
                    envValue = null;
                    logger.error(`Environment variable does not exist: ${passphrase[constants.PASSPHRASE_ENVIRONMENT_VAR]}`);
                }
                promises.push(envValue);
            } else {
                // always push a promise to keep index in sync
                promises.push(null);
            }
        });

        return Promise.all(promises)
            .then((res) => {
                let idx = 0;
                passphrases.forEach((i) => {
                    // navigate to passphrase in data object and replace whole object with
                    // decrypted value - this allows consumers to reference any key name containing
                    // a secret (object) and get decrypted value (string) - not just 'passphrase'
                    const parentKey = i.path[i.path.length - 1];
                    const passphrase = getPassphrase(data, i.path.slice(0, -1));
                    passphrase[parentKey] = res[idx];
                    idx += 1;
                });
                // return (modified) data
                return data;
            })
            .catch((e) => {
                throw e;
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

    DeviceAsyncCLI
};
