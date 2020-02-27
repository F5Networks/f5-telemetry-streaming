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
const path = require('path');
const request = require('request');

const logger = require('./logger.js');
const constants = require('./constants.js');
const util = require('./util.js');
const deviceUtil = require('./deviceUtil.js');

/** @module ihealthUtil */

/**
 * Request auth token
 *
 * @async
 * @private
 * @returns {Object} Promise resolved when auth data received
 */
function getAuthToken(targetObj) {
    if (targetObj.options.credentials.token) {
        return Promise.resolve();
    }
    // in case of optimization, replace with Object.assign
    const options = util.deepCopy(targetObj.options.connection);
    return deviceUtil.getAuthToken(
        targetObj.host, targetObj.options.credentials.username, targetObj.options.credentials.passphrase, options
    )
        .then((token) => {
            targetObj.options.credentials.token = token.token;
        })
        .catch((err) => {
            throw err;
        });
}

/**
 * Remove file from the local device
 *
 * @async
 * @private
 * @param {String} src            - path to source file on the local device
 * @param {Object} [customLogger] - logger object
 *
 * @returns {Promise} Promise resolved when file removed
 */
function removeFileLocaly(src, customLogger) {
    const log = customLogger || logger;
    log.debug(`Removing "${src}" localy`);
    return new Promise((resolve, reject) => {
        fs.unlink(src, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    })
        .catch((err) => {
            const msg = `removeFileLocaly: unable to remove file "${src}" localy: ${err}`;
            log.debug(msg);
            throw new Error(msg);
        });
}

/**
 * Remove file from the remote device
 *
 * @async
 * @private
 *
 * @param {String} fileName       - path to source file on the remove device
 * @param {String} host           - host
 * @param {Object} opts           - options
 * @param {Object} [customLogger] - logger object
 *
 * @returns {Promise} Promise resolved when file removed
 */
function removeFileRemotely(fileName, host, opts, customLogger) {
    const log = customLogger || logger;
    log.debug(`Removing "${fileName}" via REST API`);

    return deviceUtil.runTMUtilUnixCommand('rm', `"${fileName}"`, host, opts)
        .catch((err) => {
            const msg = `removeFileRemotely: unable to remove file "${fileName}" via REST API: ${err}`;
            log.debug(msg);
            throw new Error(msg);
        });
}

/**
 * Move file from 'src' to 'dst' on the remote device
 *
 * @async
 * @private
 *
 * @param {String} src            - path to source file on the remove device
 * @param {String} dst            - path to destination file on the remove device
 * @param {String} host           - host
 * @param {Object} opts           - options
 * @param {Object} [customLogger] - logger object
 *
 * @returns {Promise} Promise resolved when file moved
 */
function moveFileRemotely(src, dst, host, opts, customLogger) {
    const log = customLogger || logger;
    log.debug(`Moving "${src}" to "${dst}" via REST API`);

    const args = `"${src}" "${dst}"`;
    return deviceUtil.runTMUtilUnixCommand('mv', args, host, opts)
        .catch((err) => {
            const msg = `moveFileRemotely: unable to move file "${src}" to "${dst}" via REST API: ${err}`;
            log.debug(msg);
            throw new Error(msg);
        });
}


/**
 * Check if file exists on the remote device
 *
 * @async
 * @private
 *
 * @param {String} src            - path to source file on the remote device
 * @param {Object} [customLogger] - logger object
 *
 * @returns {Promise.<Boolean>} Promise resolved when file exists
 *     on the remote device
 */
function fileExistsRemotely(src, host, opts, customLogger) {
    const log = customLogger || logger;
    log.debug(`Check (ls) "${src}" via REST API`);

    return deviceUtil.runTMUtilUnixCommand('ls', `"${src}"`, host, opts)
        .then((res) => {
            if (res.indexOf(src) === -1) {
                return Promise.reject(new Error('not exist'));
            }
            return Promise.resolve();
        })
        .catch((err) => {
            const msg = `fileExistsRemotely: unable to locate file "${src}" via REST API: ${err}`;
            log.debug(msg);
            throw new Error(msg);
        });
}

/**
 * Check if file exists on the local device
 *
 * @async
 * @private
 *
 * @param {String} src            - path to source file on the local device
 * @param {Object} [customLogger] - logger object
 *
 * @returns {Promise} Promise resolved when file exists on the local device
 */
function fileExistsLocaly(src, customLogger) {
    const log = customLogger || logger;
    log.debug(`Check (ls) "${src}" localy`);

    return new Promise((resolve) => {
        fs.access(src, (fs.constants || fs).R_OK, (accessErr) => {
            resolve(!accessErr);
        });
    })
        .then((exists) => {
            if (!exists) {
                return Promise.reject(new Error('not exist'));
            }
            return Promise.resolve();
        })
        .catch((err) => {
            const msg = `fileExistsLocal: unable to locate file "${src}" localy: ${err}`;
            log.debug(msg);
            throw new Error(msg);
        });
}

function searchByKey(skey, data, ret) {
    ret = ret || [];
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i += 1) {
            searchByKey(skey, data[i], ret);
        }
        return ret;
    }
    if (typeof data === 'object') {
        Object.keys(data).forEach((key) => {
            const value = data[key];
            if (key === skey) {
                ret.push(value);
            } else {
                searchByKey(skey, value, ret);
            }
        });
    }
    return ret;
}

function fetchManagementIP(host, options) {
    const uri = '/mgmt/tm/sys/management-ip';
    options = options || {};
    options.method = 'GET';
    options.includeResponseObject = false;

    return deviceUtil.makeDeviceRequest(host, uri, options)
        .then((res) => {
            const results = searchByKey('fullPath', res);
            for (let i = 0; i < results.length; i += 1) {
                results[i] = results[i].split('/', 1)[0];
            }
            return Promise.resolve(results);
        })
        .catch((err) => {
            const msg = `fetchManagementIP: ${err}`;
            throw new Error(msg);
        });
}

function fetchBaseMac(host, options) {
    const uri = '/mgmt/tm/sys/hardware';
    options = options || {};
    options.method = 'GET';
    options.includeResponseObject = false;

    return deviceUtil.makeDeviceRequest(host, uri, options)
        .then((res) => {
            const results = searchByKey('baseMac', res);
            for (let i = 0; i < results.length; i += 1) {
                results[i] = results[i].description;
            }
            return Promise.resolve(results);
        })
        .catch((err) => {
            const msg = `fetchBaseMac: ${err}`;
            throw new Error(msg);
        });
}


/**
 * Perform check if the target device is the local device
 *
 * @async
 * @returns {Promise} Promise resolved with 'true' if target device is local device
 */
function checkIsItLocalDevice(host, options) {
    let hostIP;
    let hostMAC;
    let localIP;
    let localMAC;

    return fetchBaseMac(host, util.deepCopy(options))
        .then((baseMac) => {
            hostMAC = baseMac[0];
            return fetchBaseMac(constants.LOCAL_HOST);
        })
        .then((baseMac) => {
            localMAC = baseMac[0];
            return fetchManagementIP(host, util.deepCopy(options));
        })
        .then((mgmtIP) => {
            hostIP = mgmtIP[0];
            return fetchManagementIP(constants.LOCAL_HOST);
        })
        .then((mgmtIP) => {
            localIP = mgmtIP[0];
            return Promise.resolve(hostMAC === localMAC && hostIP === localIP);
        });
}

/**
 * @typedef Connection
 * @property {String}  [host]              - host to connect to
 * @property {String}  protocol            - HTTP protocol
 * @property {Integer} port                - HTTP port
 * @property {Boolean} allowSelfSignedCert - false - requires SSL certificates be valid,
 *                                           true  - allows self-signed certs
 */

/**
 * @typedef Credentials
 * @property {String} username   - username
 * @property {String} passhprase - passphrase
 * @property {String} [token]    - F5 Device auth token for re-use
 */

/**
 * @typedef Qkview
 * @property {String}  qkview.name                 - Qkview file name
 * @property {Boolean} qkview.downloaded           - 'true' when Qkview was downloaded to the local device
 * @property {String}  [qkview.remoteDownloadPath] - path to download directory with Qkview
 * @property {String}  [qkview.remoteOriginPath]   - path to Qkview file on the remote device
 *                                                   file on the remote device
 * @property {String}  [qkview.localDownloadPath]  - path to Qkview file on the local device
 * @property {Boolean} [qkview.md5verified]        - 'true' when MD5 sum verified and valid
 */

/**
 * @typedef Proxy
 * @property {module:ihealthUtil~Credentials} credentials - credentials
 * @property {module:ihealthUtil~Connection} connection  - connection
 */

/**
 * Qkview Manager
 *
 * @class
 *
 * @param {String}  host                                         - host, by default 'localhost'
 * @param {Object}  options                                      - function options
 * @param {String}  options.deviceName                           - device' name
 * @param {String}  [options.dacliUID]                           - unique name for DACLI's script
 * @param {module:ihealthUtil~Credentials} [options.credentials] - F5 Device credentials
 * @param {module:ihealthUtil~Connection}  [options.connection]  - F5 Device connection settings
 * @param {Boolean} [options.shouldDownload]                     - download Qkview to local directory, by default false
 * @param {String}  [options.downloadFolder]                     - directory for download
 * @property {module:ihealthUtil~Qkview}   qkview                - object with info about Qkview
 */
function QkviewManager() {
    // rest params syntax supported only fron node 6+
    /* eslint-disable prefer-rest-params */
    this.host = typeof arguments[0] === 'string' ? arguments[0] : null;
    this.host = this.host || constants.LOCAL_HOST;

    this.options = typeof arguments[0] === 'object' ? arguments[0] : arguments[1];
    this.options = this.options || {};

    this.options.scriptName = this.options.dacliUID;
    delete this.options.dacliUID;

    // rely on makeDeviceRequest
    this.options.credentials = this.options.credentials || {};
    this.options.connection = this.options.connection || {};

    this.shouldDownload = this.options.shouldDownload !== undefined ? this.options.shouldDownload : false;
    this.downloadFolder = this.options.downloadFolder;

    if (this.shouldDownload && !this.downloadFolder) {
        throw new Error('QkviewManager: should specify directory for downloads');
    }
    if (!this.options.deviceName) {
        throw new Error('QkviewManager: should specify device name');
    }
    this.logger = logger.getChild('QkviewManager').getChild(
        this.options.deviceName.replace(/[^a-zA-Z0-9_-]/g, '')
    );
    this.deviceName = this.options.deviceName.replace(/[^a-zA-Z0-9]/g, '_');
    this.isLocalDevice = false;
}

/**
 * Returns default request' options
 *
 * @private
 * @returns {Object} default request' options
 */
QkviewManager.prototype._getDefaultRequestOptions = function () {
    // remove parse-stringify in case of optimizations
    const options = Object.assign({}, util.deepCopy(this.options.connection));

    options.credentials = {
        username: this.options.credentials.username,
        token: this.options.credentials.token
    };
    return options;
};

/**
 * Build Qkview file name
 *
 * @private
 * @returns {String} Qkview file name
 */
QkviewManager.prototype._getQkviewName = function () {
    const currentTime = (new Date()).getTime();
    const hrTime = process.hrtime();

    return `qkview_telemetry_${this.deviceName}_${currentTime}_${hrTime[0]}${hrTime[1]}.tar.qkview`;
};

/**
 * Build Qkview file path
 *
 * @private
 * @param {String} qkviewName - Qkview name
 *
 * @returns {String} Qkview file path
 */
QkviewManager.prototype._getQkviewPath = function (qkviewName) {
    return path.join(constants.DEVICE_TMP_DIR, qkviewName);
};

/**
 * Build Qkview command
 *
 * @private
 * @param {String} qkviewFilePath - Qkview file path
 *
 * @returns {String} Qkview command
 */
QkviewManager.prototype._getQkviewCommand = function (qkviewFilePath) {
    let qkviewCmd;
    // v11.6+ qkview utility assumes base dir for output file is /var/tmp
    if (util.compareVersionStrings(this.deviceVersion, '>=', '11.6')) {
        qkviewCmd = `/usr/bin/qkview -C -f ../..${qkviewFilePath}`;
    } else {
        qkviewCmd = `/usr/bin/qkview -C -f ${qkviewFilePath}`;
    }
    return qkviewCmd;
};

/**
 * Execute some action on device. Remote will be executed first. On fail
 * and if local operations are allowed then try local action.
 *
 * @async
 * @private
 *
 * @param {function} remote - callback should return promise
 * @param {function} local  - callback should return promise
 *
 * @returns {Promise} Promise resolved when one of the actions resolved
 */
QkviewManager.prototype._remoteFirstLocalLast = function (remote, local) {
    let errors = [];
    // remote is prefered way
    return remote()
        .catch((err) => {
            errors.push(err.message);
        })
        .then(() => {
            if (!errors.length || !this.isLocalDevice) {
                return Promise.resolve();
            }
            // try to perform local opertaion if possible
            return local()
                .then(() => {
                    // local opertaion succeed
                    errors = [];
                })
                .catch((err) => {
                    // local opertaion failed
                    errors.push(err.message);
                });
        })
        .then(() => {
            // opertaion (remote or local or both) failed
            if (errors.length) {
                throw new Error(JSON.stringify(errors));
            }
            return Promise.resolve();
        })
        .catch((err) => {
            throw err;
        });
};

/**
 * Create Qkview via local command
 *
 * @async
 * @param {String} qkviewName - Qkview name
 *
 * @returns {Promise} Promise resolved when Qkview file created
 */
QkviewManager.prototype.createQkviewLocaly = function (qkviewName) {
    const qkviewPath = this._getQkviewPath(qkviewName);
    const qkviewCmd = this._getQkviewCommand(qkviewPath);

    // looks like we are running on device and target device is localhost
    this.logger.debug(`Creating Qkview localy at ${qkviewPath}`);
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line no-unused-vars
        childProcess.exec(qkviewCmd, { timeout: constants.QKVIEW_CMD_LOCAL_TIMEOUT }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    })
        .catch((err) => {
            const msg = `createQkviewLocaly: Unable to create Qkview localy: ${err}`;
            this.logger.debug(msg);
            throw new Error(msg);
        });
};

/**
 * Build Qkview via REST API
 *
 * @async
 * @param {String} qkviewName - Qkview name
 *
 * @returns {Promise} Promise resolved when Qkview file created
 */
QkviewManager.prototype.createQkviewRemotely = function (qkviewName) {
    const qkviewPath = this._getQkviewPath(qkviewName);
    const qkviewCmd = this._getQkviewCommand(qkviewPath);
    const dacli = new deviceUtil.DeviceAsyncCLI(this.host, util.deepCopy(this.options));

    this.logger.debug(`Creating Qkview via REST API at ${qkviewPath}`);
    return dacli.execute(qkviewCmd)
        .catch((err) => {
            const msg = `createQkviewRemotely: Unable to create Qkview via REST API: ${err}`;
            this.logger.debug(msg);
            throw new Error(msg);
        });
};

/**
 * Create Qkview via REST API (will try localy on fail)
 *
 * @async
 * @returns {Promise.<String>} Promise resolved with file name when Qkview file created
 */
QkviewManager.prototype.createQkview = function () {
    const qkviewName = this._getQkviewName();
    return this._remoteFirstLocalLast(
        () => this.createQkviewRemotely(qkviewName),
        () => this.createQkviewLocaly(qkviewName)
    )
        .then(() => Promise.resolve(qkviewName))
        .catch((err) => {
            throw new Error(`createQkview: Unable to create qkview "${qkviewName}": ${err}`);
        });
};

/**
 * Move file from 'src' to 'dst' on the remote device
 *
 * @async
 *
 * @param {String} src - path to source file on the remove device
 * @param {String} dst - path to destination file on the remove device
 *
 * @returns {Promise} Promise resolved when file moved
 */
QkviewManager.prototype.moveFileRemotely = function (src, dst) {
    return moveFileRemotely(src, dst, this.host, this._getDefaultRequestOptions(), this.logger);
};

/**
 * Remove file from the remote device
 *
 * @async
 * @param {String} src - path to source file on the remove device
 *
 * @returns {Promise} Promise resolved when file removed
 */
QkviewManager.prototype.removeFileRemotely = function (src) {
    return removeFileRemotely(src, this.host, this._getDefaultRequestOptions(), this.logger);
};

/**
 * Remove file from the local device
 *
 * @async
 * @param {String} src - path to source file on the local device
 *
 * @returns {Promise} Promise resolved when file removed
 */
QkviewManager.prototype.removeFileLocaly = function (src) {
    return removeFileLocaly(src, this.logger);
};

/**
 * Remove file from the remote device
 *
 * @async
 * @param {String} src - path to source file on the remove device
 *
 * @returns {Promise} Promise resolved when file removed
 */
QkviewManager.prototype.removeFile = function (src) {
    return this._remoteFirstLocalLast(
        () => this.removeFileRemotely(src),
        () => this.removeFileLocaly(src)
    )
        .then(() => Promise.resolve())
        .catch((err) => {
            throw new Error(`removeFile: Unable to remove "${src}": ${err}`);
        });
};

/**
 * Check if file exists on the remote device
 *
 * @async
 * @param {String} src - path to source file on the remote device
 *
 * @returns {Promise.<Boolean>} Promise resolved when file exists
 *     on the remote device
 */
QkviewManager.prototype.fileExistsRemotely = function (src) {
    return fileExistsRemotely(src, this.host, this._getDefaultRequestOptions(), this.logger);
};

/**
 * Check if file exists on the local device
 *
 * @async
 * @param {String} src - path to source file on the local device
 *
 * @returns {Promise} Promise resolved when file exists on the local device
 */
QkviewManager.prototype.fileExistsLocaly = function (src) {
    return fileExistsLocaly(src, this.logger);
};

/**
 * Check if file exists on the remote device
 *
 * @async
 * @param {String} src - path to source file on the remote device
 *
 * @returns {Promise} Promise resolved when file exists on the remote device
 */
QkviewManager.prototype.fileExists = function (src) {
    return this._remoteFirstLocalLast(
        () => this.fileExistsRemotely(src),
        () => this.fileExistsLocaly(src)
    )
        .then(() => Promise.resolve())
        .catch((err) => {
            throw new Error(`fileExists: Unable to locate "${src}": ${err}`);
        });
};

/**
 * Calculate MD5 sum on file on the remote device
 *
 * @async
 * @param {String} fileName - path to source file on the remote device
 *
 * @returns {Promise.<Array>} Promise resolved with MD5 sum and MD5 filename
 */
QkviewManager.prototype.getMD5sumRemotely = function (fileName) {
    const md5File = `${fileName}.md5sum`;
    const md5Cmd = `md5sum "${fileName}" > "${md5File}"`;
    const dacli = new deviceUtil.DeviceAsyncCLI(this.host, util.deepCopy(this.options));

    this.logger.debug(`Calculating MD5 for "${fileName}" to "${md5File}" via REST API`);
    return dacli.execute(md5Cmd)
        .then(() => {
            const cmd = `cat "${md5File}"`;
            return deviceUtil.executeShellCommandOnDevice(this.host, cmd, this._getDefaultRequestOptions())
                .then((output) => {
                    if (!output) {
                        return Promise.reject(new Error(`MD5 file "${md5File}" is empty!`));
                    }
                    return Promise.resolve([output.split(' ')[0].trim(), md5File]);
                });
        })
        .catch((err) => {
            const msg = `getMD5sumRemotely: Unable to calculate MD5 via REST API: ${err}`;
            this.logger.debug(msg);
            throw new Error(msg);
        });
};

/**
 * Calculate MD5 sum on file on the local device
 *
 * @async
 * @param {String} fileName - path to source file on the local device
 *
 * @returns {Promise.<Array>} Promise resolved with MD5 sum and MD5 filename
 */
QkviewManager.prototype.getMD5sumLocaly = function (fileName) {
    const self = this;
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line no-unused-vars
        self.logger.debug(`Calculating MD5 for "${fileName}" localy`);
        const md5Cmd = `md5sum "${fileName}"`;

        // eslint-disable-next-line no-unused-vars
        childProcess.exec(md5Cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve([stdout.split(' ')[0].trim(), null]);
            }
        });
    })
        .catch((err) => {
            const msg = `getMD5sumLocaly: Unable to calculate MD5 localy: ${err}`;
            this.logger.debug(msg);
            throw new Error(msg);
        });
};

/**
 * Download Qkview file from the remote device to the local device
 *
 * @async
 * @returns {Promise} Promise resolved when Qkview file was downloaded to the local device
 */
QkviewManager.prototype.downloadQkview = function () {
    if (!this.shouldDownload) {
        return Promise.resolve();
    }

    let deviceRemoteDownloadDir;
    let deviceRemoteDownloadURI;
    let remoteMD5Sum;

    if (util.compareVersionStrings(this.deviceVersion, '<', '14.0')) {
        deviceRemoteDownloadDir = constants.DEVICE_REST_MAMD_DIR;
        deviceRemoteDownloadURI = constants.DEVICE_REST_MADM_URI;
    } else {
        deviceRemoteDownloadDir = constants.DEVICE_REST_BULK_DIR;
        deviceRemoteDownloadURI = constants.DEVICE_REST_BULK_URI;
    }

    const remoteOriginPath = this.qkview.remoteOriginPath;
    const remoteDownloadPath = path.join(deviceRemoteDownloadDir, this.qkview.name);
    const localDownloadPath = path.join(this.downloadFolder, this.qkview.name);
    deviceRemoteDownloadURI = `${deviceRemoteDownloadURI}${this.qkview.name}`;

    if (this.isLocalDevice) {
        let p;
        if (remoteOriginPath === localDownloadPath) {
            p = Promise.resolve();
        } else {
            p = this.moveFileRemotely(remoteOriginPath, localDownloadPath);
        }
        return p.then(() => {
            this.qkview.localDownloadPath = localDownloadPath;
            this.qkview.downloaded = true;
            this.qkview.md5verified = true;
        })
            .catch((err) => {
                throw new Error(`downloadQkview: Unable to move Qkview: ${err}`);
            });
    }

    this.logger.debug(`Downloading Qkview from [remote] "${remoteOriginPath}" to [local] "${localDownloadPath}"`);
    return this.moveFileRemotely(remoteOriginPath, remoteDownloadPath)
        .then(() => this.fileExists(remoteDownloadPath))
        .then(() => {
            this.qkview.remoteDownloadPath = remoteDownloadPath;
            this.qkview.remoteFiles.push(remoteDownloadPath);
            this.qkview.remoteFiles[this.qkview.remoteFiles.indexOf(remoteOriginPath)] = null;
        })
        .then(() => this.getMD5sumRemotely(this.qkview.remoteDownloadPath))
        .then((ret) => {
            remoteMD5Sum = ret[0];
            this.qkview.remoteFiles.push(ret[1]);
        })
        .then(() => deviceUtil.downloadFileFromDevice(localDownloadPath,
            this.host, deviceRemoteDownloadURI, this._getDefaultRequestOptions()))
        .then(() => this.fileExistsLocaly(localDownloadPath))
        .then(() => {
            this.qkview.localDownloadPath = localDownloadPath;
            this.qkview.localFiles.push(localDownloadPath);
            this.qkview.downloaded = true;
            this.qkview.md5verified = false;
        })
        .then(() => this.getMD5sumLocaly(this.qkview.localDownloadPath))
        .then((ret) => {
            this.qkview.localFiles.push(ret[1]);
            if (ret[0] !== remoteMD5Sum) {
                return Promise.reject(new Error(`[local] MD5 ${ret[0]} !== [remote] MD5 ${remoteMD5Sum}`));
            }
            this.qkview.md5verified = true;
            return Promise.resolve();
        })
        .catch((err) => {
            throw new Error(`downloadQkview: Unable to download Qkview: ${err}`);
        });
};

/**
 * Perform check if target device is the local device
 *
 * @async
 * @private
 */
QkviewManager.prototype.checkIsItLocalDevice = function () {
    return checkIsItLocalDevice(this.host, this._getDefaultRequestOptions(), this.logger)
        .then((isLocalDevice) => {
            this.isLocalDevice = isLocalDevice;
        })
        .catch((err) => {
            throw new Error(`checkIsItLocalDevice: ${err}`);
        });
};

/**
 * Request auth token and pre-load required data
 *
 * @async
 * @returns {Promise} Promise resolved when QkviewManager obtained all required info
 */
QkviewManager.prototype.prepare = function () {
    return getAuthToken(this)
        .then(() => deviceUtil.getDeviceVersion(this.host, this._getDefaultRequestOptions()))
        .then((deviceVersion) => {
            this.deviceVersion = deviceVersion.version;
        })
        .then(() => deviceUtil.getDeviceType())
        .then((deviceType) => {
            this.deviceType = deviceType;
            if (this.deviceType === constants.DEVICE_TYPE.BIG_IP) {
                return this.checkIsItLocalDevice();
            }
            return Promise.resolve();
        });
};

/**
 * Remove Qkview files from the local and the remote devices
 *
 * @async
 * @returns {Promise} Promise resolved when Qkview files were removed
 */
QkviewManager.prototype.cleanup = function () {
    if (!this.qkview) {
        return Promise.resolve();
    }

    const promises = [];
    if (this.qkview.remoteFiles) {
        const remoteFiles = new Set(this.qkview.remoteFiles);
        remoteFiles.forEach((rfPath) => {
            if (rfPath) {
                promises.push(
                    this.fileExists(rfPath).then(() => this.removeFile(rfPath))
                );
            }
        });
    }
    if (this.qkview.localFiles) {
        const localFiles = new Set(this.qkview.localFiles);
        localFiles.forEach((lfPath) => {
            if (lfPath) {
                promises.push(
                    this.fileExistsLocaly(lfPath).then(() => this.removeFileLocaly(lfPath))
                );
            }
        });
    }

    promises.forEach((promise) => {
        promise.catch(err => logger.debug(`QkviewManager.cleanup: ${err}`));
    });

    delete this.qkview.localFiles;
    delete this.qkview.remoteFiles;

    return Promise.all(promises).then(() => logger.debug('Qkview cleanup done!'));
};

/**
 * Start process of Qkview file creation and download it if needed
 *
 * @async
 * @returns {Promise} Promise resolved when process done
 */
QkviewManager.prototype.process = function () {
    let qkviewName;
    this.qkview = {
        localFiles: [],
        remoteFiles: []
    };

    return this.createQkview()
        .then((newQkviewName) => {
            qkviewName = newQkviewName;
            return this.fileExists(this._getQkviewPath(newQkviewName));
        })
        .then(() => {
            this.qkview.name = qkviewName;
            this.qkview.remoteOriginPath = this._getQkviewPath(qkviewName);
            this.qkview.remoteFiles.push(this.qkview.remoteOriginPath);
        })
        .then(() => this.downloadQkview())
        .then(() => Promise.resolve(this.qkview))
        .catch((err) => {
            throw new Error(`process: ${err}`);
        });
};


/**
 * Interface for classes that represents a Storage for data
 *
 * @interface IHealthManager
 */
/**
 * Make some preparations
 *
 * @async
 * @function
 * @name module:ihealthUtil~IHealthManager#prepare
 *
 * @returns {Promise} Promise resolved when auth data received
 */
/**
 * Request authentication from F5 iHealth service
 *
 * @async
 * @function
 * @name module:ihealthUtil~IHealthManager#getAuthData
 *
 * @return {Promise} Promise resolved when auth data received
 */
/**
 * Upload Qkview to F5 iHealth service from the local device
 *
 * @async
 * @function
 * @name module:ihealthUtil~IHealthManager#uploadQkview
 *
 * @return {Promise.<String>} Promise resolved with URI of the Qkview uploaded to F5 iHealth service
 */
/**
 * Check is F5 iHealth service done Qkview processing or not
 *
 * @async
 * @function
 * @name module:ihealthUtil~IHealthManager#isQkviewAnalyzeReady
 *
 * @return {Promise.<Boolean>} Promise resolved with 'true' when Qkview processed by
 *     F5 iHealth Service otherwise 'false'
 */
/**
 * Retrieve diagnostics data from F5 iHealth service
 *
 * @async
 * @function
 * @name module:ihealthUtil~IHealthManager#getDiagnosticsJSON
 *
 * @return {Promise.<Object>} Promise resolved with diagnostics object (parsed JSON)
 */
/**
 * Do some cleanup
 *
 * @async
 * @function
 * @name module:ihealthUitl~IHealthManager#cleanup
 *
 * @return {Promise} Promise resolved when cleanup docne
 */


/**
 * iHealth Manager to upload Qkview and poll diagostics from the local device
 *
 * @class
 * @implements {module:ihealthUtil~IHealthManager}
 *
 * @param {Object}  options                                              - function options
 * @param {String}  options.deviceName                                   - device' name
 * @param {String}  [options.qkviewFile]                                 - path to Qkview file on the device
 * @param {String}  [options.qkviewURI]                                  - Qkview' URI on F5 iHealth
 * @param {module:ihealthUtil~Credentials} [options.ihealth.credentials] - F5 iHealth Service credentials
 * @param {module:ihealthUtil~Proxy}       [options.proxy]               - proxy settings for F5 iHealth Service
 *                                                                         connection
 */
function IHealthManagerLocal(options) {
    this.options = options || {};

    this.ihealth = this.options.ihealth || {};
    this.ihealth.credentials = this.ihealth.credentials || {};

    this.proxy = this.options.proxy || {};
    this.proxy.connection = this.proxy.connection || {};
    this.proxy.credentials = this.proxy.credentials || {};

    this.qkviewFile = this.options.qkviewFile;
    this.qkviewURI = this.options.qkviewURI;

    if (!(this.ihealth.credentials.username && this.ihealth.credentials.passphrase)) {
        throw new Error('IHealthManagerLocal: username and passphrase are required!');
    }
    if (!this.options.deviceName) {
        throw new Error('IHealthManagerLocal: should specify device name');
    }
    this.logger = logger.getChild('IHealthManagerLocal').getChild(
        this.options.deviceName.replace(/[^a-zA-Z0-9_-]/g, '')
    );
    this.deviceName = this.options.deviceName.replace(/[^a-zA-Z0-9]/g, '_');
    this.cookieJar = request.jar();
}

/**
 * Return proxy URL if needed
 *
 * @private
 * @returns {String} proxy URL or undefined
 */
IHealthManagerLocal.prototype._getProxyURL = function () {
    if (this.proxy && this.proxy.connection.host) {
        let auth = '';
        if (this.proxy.credentials.username) {
            auth = this.proxy.credentials.username;
            if (this.proxy.credentials.passphrase) {
                auth = `${auth}:${this.proxy.credentials.passphrase}`;
            }
            auth = `${auth}@`;
        }
        const conn = this.proxy.connection;
        return `${conn.protocol}://${auth}${conn.host}:${conn.port}`;
    }
    return undefined;
};

/**
 * Returns default request' options
 *
 * @private
 * @returns {Object} default request' options
 */
IHealthManagerLocal.prototype._getDefaultRequestOptions = function () {
    return {
        headers: { 'User-Agent': constants.USER_AGENT },
        jar: this.cookieJar,
        strictSSL: true, // because we are connecting to F5 API,
        proxy: this._getProxyURL()
    };
};

/**
 * Send request
 *
 * @async
 * @private
 * @param {Object} options - request's options
 *
 * @returns {Promise.<?any>} Promise resolved with request's result
 */
IHealthManagerLocal.prototype._makeRequest = function (options) {
    return deviceUtil.makeDeviceRequest(options);
};

/** @inheritdoc */
IHealthManagerLocal.prototype.prepare = function () {
    return this.getAuthData();
};

/** @inheritdoc */
IHealthManagerLocal.prototype.getAuthData = function () {
    const requestOptions = this._getDefaultRequestOptions();
    requestOptions.body = {
        user_id: this.ihealth.credentials.username,
        user_secret: this.ihealth.credentials.passphrase
    };
    requestOptions.fullURI = constants.IHEALTH_API_LOGIN;
    requestOptions.method = 'POST';
    requestOptions.headers['Content-type'] = 'application/json';
    requestOptions.expectedResponseCode = 200;

    return this._makeRequest(requestOptions)
        .catch((err) => {
            throw new Error(`getAuthData: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerLocal.prototype.uploadQkview = function () {
    const requestOptions = this._getDefaultRequestOptions();
    requestOptions.fullURI = constants.IHEALTH_API_UPLOAD;
    requestOptions.method = 'POST';
    requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';
    requestOptions.formData = {
        qkview: fs.createReadStream(this.qkviewFile),
        visible_in_gui: 'True'
    };
    requestOptions.continueOnErrorCode = true;
    requestOptions.includeResponseObject = true;

    return this._makeRequest(requestOptions)
        .then((res) => {
            const body = res[0];
            const resObj = res[1];

            let parsedBody;
            let rejectReason;

            if (typeof body === 'object') {
                parsedBody = body;
            } else {
                try {
                    parsedBody = JSON.parse(body);
                } catch (parseErr) {
                    rejectReason = 'unable to parse response body';
                    parsedBody = {};
                }
            }

            if (parsedBody.result === 'OK') {
                if (parsedBody.location) {
                    this.logger.debug('Qkview uploaded to F5 iHealth service');
                    return Promise.resolve(parsedBody.location);
                }
                rejectReason = 'unable to locate "location" in response body';
            }
            const errMsg = `Unable to upload Qkview to F5 iHealth server: ${rejectReason}`;
            this.logger.debug(`${errMsg}: responseCode = ${resObj.statusCode} responseBody = ${JSON.stringify(body)}`);
            return Promise.reject(new Error(errMsg));
        })
        .catch((err) => {
            throw new Error(`uploadQkview: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerLocal.prototype.isQkviewAnalyzeReady = function () {
    const requestOptions = this._getDefaultRequestOptions();
    requestOptions.fullURI = this.qkviewURI;
    requestOptions.method = 'GET';
    requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0';
    requestOptions.continueOnErrorCode = true;
    requestOptions.includeResponseObject = true;

    return this._makeRequest(requestOptions)
        .then(res => Promise.resolve(res[1].statusCode === 200))
        .catch((err) => {
            throw new Error(`isQkviewAnalyzeReady: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerLocal.prototype.getDiagnosticsJSON = function () {
    const requestOptions = this._getDefaultRequestOptions();
    requestOptions.fullURI = `${this.qkviewURI}/diagnostics.json`;
    requestOptions.method = 'GET';
    requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';

    return this._makeRequest(requestOptions)
        .then((res) => {
            if (typeof res === 'object') {
                return Promise.resolve(res);
            }
            return Promise.reject(new Error(`invalid JSON response: ${JSON.stringify(res)}`));
        })
        .catch((err) => {
            throw new Error(`getDiagnosticsJSON: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerLocal.prototype.cleanup = function () {
    return Promise.resolve();
};

/**
 * iHealth Manager to upload Qkview and poll diagostics from the remote device
 *
 * @class
 * @implements {module:ihealthUtil~IHealthManager}
 *
 * @param {String}  host                                                 - host, by default 'localhost'
 * @param {Object}  options                                              - function options
 * @param {String}  options.deviceName                                   - device' name
 * @param {String}  [options.dacliUID]                                   - unique name for DACLI's script
 * @param {String}  [options.qkviewFile]                                 - path to Qkview file on the device
 * @param {String}  [options.qkviewURI]                                  - Qkview' URI on F5 iHealth
 * @param {module:ihealthUtil~Credentials} [options.credentials]         - F5 Device credentials
 * @param {module:ihealthUtil~Proxy}       [options.connection]          - F5 Device connection settings
 * @param {module:ihealthUtil~Credentials} [options.ihealth.credentials] - iHealth credentials
 * @param {module:ihealthUtil~Proxy}       [options.proxy]               - proxy settings
 */
function IHealthManagerRemote() {
    // rest params syntax supported only fron node 6+
    /* eslint-disable prefer-rest-params */
    this.host = typeof arguments[0] === 'string' ? arguments[0] : null;
    this.host = this.host || constants.LOCAL_HOST;

    this.options = typeof arguments[0] === 'object' ? arguments[0] : arguments[1];
    this.options = this.options || {};

    this.options.scriptName = this.options.dacliUID;
    delete this.options.dacliUID;

    // rely on makeDeviceRequest
    this.options.credentials = this.options.credentials || {};
    this.options.connection = this.options.connection || {};

    this.ihealth = this.options.ihealth || {};
    this.ihealth.credentials = this.ihealth.credentials || {};

    this.proxy = this.options.proxy || {};
    this.proxy.connection = this.proxy.connection || {};
    this.proxy.credentials = this.proxy.credentials || {};

    this.qkviewFile = this.options.qkviewFile;
    this.qkviewURI = this.options.qkviewURI;

    if (!(this.ihealth.credentials.username && this.ihealth.credentials.passphrase)) {
        throw new Error('IHealthManagerRemote: username and passphrase are required!');
    }
    if (!this.options.deviceName) {
        throw new Error('IHealthManagerRemote: should specify device name');
    }
    this.logger = logger.getChild('IHealthManagerRemote').getChild(
        this.options.deviceName.replace(/[^a-zA-Z0-9_-]/g, '')
    );
    this.deviceName = this.options.deviceName.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Returns default request' options
 *
 * @private
 * @returns {Object} default request' options
 */
IHealthManagerRemote.prototype._getDefaultDeviceRequestOptions = function () {
    // remove parse-stringify in case of optimizations
    const options = Object.assign({}, util.deepCopy(this.options.connection));

    options.credentials = {
        username: this.options.credentials.username,
        token: this.options.credentials.token
    };
    return options;
};

/**
 * Execute async command on the remote device
 *
 * @async
 * @private
 * @param {String} cmd - command to execute on the remote device
 *
 * @returns {Promise} Promise resolved when command execution finished
 */
IHealthManagerRemote.prototype._executeAsyncCommand = function (cmd) {
    const dacli = new deviceUtil.DeviceAsyncCLI(this.host, util.deepCopy(this.options));
    return dacli.execute(cmd)
        .catch((err) => {
            const msg = `_executeAsyncCommand: ${err}`;
            this.logger.debug(msg);
            throw new Error(msg);
        });
};

/**
 * Execute command on the remote device
 *
 * @async
 * @private
 * @param {String} cmd - command to execute on the remote device
 *
 * @returns {Promise} Promise resolved when command execution finished
 */
IHealthManagerRemote.prototype._executeCommand = function (cmd) {
    return deviceUtil.executeShellCommandOnDevice(this.host, cmd, this._getDefaultDeviceRequestOptions())
        .catch((err) => {
            const msg = `_executeCommand: ${err}`;
            this.logger.debug(msg);
            throw new Error(msg);
        });
};

/**
 * Add proxy options for cURL
 *
 * @private
 * @param {Object} options - target object to insert proxy options to
 */
IHealthManagerRemote.prototype._insertProxyOptions = function (options) {
    if (this.proxy.connection && this.proxy.connection.host) {
        const conn = this.proxy.connection;
        options['--proxy'] = `${conn.protocol}://${conn.host}:${conn.port}`;

        const isSecure = conn.allowSelfSignedCert === undefined ? constants.STRICT_TLS_REQUIRED
            : !conn.allowSelfSignedCert;

        if (!isSecure) {
            options['-k'] = '';
        }
    }
    if (this.proxy.credentials && this.proxy.credentials.username) {
        const auth = this.proxy.credentials;
        options['--proxy-user'] = `${auth.username}${(auth.passphrase && ':') || ''}${auth.passphrase || ''}`;
    }
};

/**
 * Default options for cURL to send data to F5 iHealth Service
 *
 * @private
 * @returns {Object} default options
 */
IHealthManagerRemote.prototype._getDefaultCURLoptions = function () {
    return {
        '--connect-timeout': 10,
        '--max-time': 50,
        '-H': 'Content-type: application/json',
        '--user-agent': constants.USER_AGENT,
        '--cookie-jar': this._getCookieFile(),
        '--cookie': this._getCookieFile(),
        '-s': ''
    };
};
/**
 * Create valid cURL command
 *
 * @private
 * @param {Object} options - options for cURL
 *
 * @returns {String} cURL command
 */
IHealthManagerRemote.prototype._buildCurliHealthCmd = function (options, uri) {
    const cURL = '/usr/bin/curl';
    const pairs = [];
    options = options || {};

    // add proxy opts if needed
    this._insertProxyOptions(options);

    // create pair for each option
    const toStr = (key, value) => {
        if (value) {
            // escape required to pass REST API + TCL + SHELL processing
            value = `${key} '${JSON.stringify(value)}'`;
        } else {
            value = key;
        }
        return value;
    };

    Object.keys(options).forEach((key) => {
        const values = options[key];
        if (Array.isArray(values)) {
            values.forEach((value) => {
                pairs.push(toStr(key, value));
            });
        } else {
            pairs.push(toStr(key, values));
        }
    });
    return `${cURL} ${pairs.join(' ')} ${uri} > ${this._getResponseFile()}`;
};

/**
 * Path to cookie file on the remote device
 *
 * @private
 * @returns {String} path to file
 */
IHealthManagerRemote.prototype._getCookieFile = function () {
    return `${this.qkviewFile}.cookie.jar`;
};

/**
 * Path to response file on the remote device
 *
 * @private
 * @returns {String} path to file
 */
IHealthManagerRemote.prototype._getResponseFile = function () {
    return `${this.qkviewFile}.response.data`;
};

/**
 * Read data from the response file on the remote device
 *
 * @async
 * @private
 * @returns {Promise} Promise resolved with data from response file
 */
IHealthManagerRemote.prototype._getCommandResponse = function () {
    const cmd = `/bin/cat "${this._getResponseFile()}"`;
    return this._executeCommand(cmd);
};

/**
 * Execute cURL comman on the remote device
 *
 * @async
 * @private
 *
 * @param {String} curlCmd            - cURL command to execute
 * @param {String} [expectedResponse] - string to search in response
 *
 * @returns {Promise.<?any>} Promise resolved with response data
 */
IHealthManagerRemote.prototype._executeCURLcommand = function (curlCmd, expectedResponse) {
    return this._executeAsyncCommand(curlCmd)
        .then(() => this._getCommandResponse())
        .then((response) => {
            if (!expectedResponse) {
                return Promise.resolve(response);
            }
            if (response.indexOf(expectedResponse) !== -1) {
                return Promise.resolve(response);
            }
            return Promise.reject(new Error(`invalid response: ${JSON.stringify(response)}`));
        })
        .catch((err) => {
            throw new Error(`_executeCURLcommand: ${err}`);
        });
};

/**
 * Remove file from the remote device
 *
 * @async
 * @param {String} src - path to source file on the remove device
 *
 * @returns {Promise} Promise resolved when file removed
 */
IHealthManagerRemote.prototype.removeFileRemotely = function (src) {
    return removeFileRemotely(src, this.host, this._getDefaultDeviceRequestOptions(), this.logger);
};

/**
 * Check if file exists on the remote device
 *
 * @async
 * @param {String} src - path to source file on the remote device
 *
 * @returns {Promise.<Boolean>} Promise resolved when file exists
 *     on the remote device
 */
IHealthManagerRemote.prototype.fileExistsRemotely = function (src) {
    return fileExistsRemotely(src, this.host, this._getDefaultDeviceRequestOptions(), this.logger);
};

/** @inheritdoc */
IHealthManagerRemote.prototype.prepare = function () {
    return getAuthToken(this)
        .then(() => this.getAuthData());
};

/** @inheritdoc */
IHealthManagerRemote.prototype.getAuthData = function () {
    const defaultCurlOpts = this._getDefaultCURLoptions();
    defaultCurlOpts['--data-ascii'] = JSON.stringify({
        user_id: this.ihealth.credentials.username,
        user_secret: this.ihealth.credentials.passphrase
    });
    defaultCurlOpts['-w'] = '\nresponseCode=%{http_code}';
    // delete old header with old cookies
    delete defaultCurlOpts['--cookie'];

    const curlCmd = this._buildCurliHealthCmd(defaultCurlOpts, constants.IHEALTH_API_LOGIN);
    return this._executeCURLcommand(curlCmd, 'responseCode=200')
        .catch((err) => {
            throw new Error(`getAuthData: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerRemote.prototype.uploadQkview = function () {
    const defaultCurlOpts = this._getDefaultCURLoptions();
    defaultCurlOpts['-H'] = 'Accept: application/vnd.f5.ihealth.api.v1.0+json';
    // override max timeout for upload
    defaultCurlOpts['--max-time'] = 250;
    defaultCurlOpts['-w'] = '\nresponseCode=%{http_code}';
    defaultCurlOpts['-F'] = [
        `qkview=@${this.qkviewFile}`,
        'visible_in_gui=True'
    ];
    defaultCurlOpts['-i'] = '';

    const curlCmd = this._buildCurliHealthCmd(defaultCurlOpts, constants.IHEALTH_API_UPLOAD);
    return this._executeCURLcommand(curlCmd, 'responseCode=303')
        .then((response) => {
            let parsed = response.split('\n');
            try {
                parsed = JSON.parse(parsed[parsed.length - 2]);
            } catch (parseErr) {
                parsed = null;
            }
            if (parsed) {
                return Promise.resolve(parsed.location);
            }
            return Promise.reject(new Error(`invalid JSON response: ${JSON.stringify(response)}`));
        })
        .catch((err) => {
            throw new Error(`uploadQkview: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerRemote.prototype.isQkviewAnalyzeReady = function () {
    const defaultCurlOpts = this._getDefaultCURLoptions();
    defaultCurlOpts['-H'] = 'Accept: application/vnd.f5.ihealth.api.v1.0';
    defaultCurlOpts['-w'] = '\nresponseCode=%{http_code}';

    const curlCmd = this._buildCurliHealthCmd(defaultCurlOpts, this.qkviewURI);
    return this._executeCURLcommand(curlCmd)
        .then(response => Promise.resolve(response.indexOf('responseCode=200') !== -1))
        .catch((err) => {
            throw new Error(`isQkviewAnalyzeReady: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerRemote.prototype.getDiagnosticsJSON = function () {
    const defaultCurlOpts = this._getDefaultCURLoptions();
    defaultCurlOpts['-H'] = 'Accept: application/vnd.f5.ihealth.api.v1.0+json';

    const uri = `${this.qkviewURI}/diagnostics.json`;
    const curlCmd = this._buildCurliHealthCmd(defaultCurlOpts, uri);
    return this._executeCURLcommand(curlCmd)
        .then((response) => {
            let parsed;
            try {
                parsed = JSON.parse(response);
            } catch (parseErr) {
                // do nothing
            }
            if (parsed) {
                return Promise.resolve(parsed);
            }
            return Promise.reject(new Error(`invalid JSON response: ${JSON.stringify(response)}`));
        })
        .catch((err) => {
            throw new Error(`getDiagnosticsJSON: ${err}`);
        });
};

/** @inheritdoc */
IHealthManagerRemote.prototype.cleanup = function () {
    if (!this.qkview) {
        return Promise.resolve();
    }

    const promises = [
        this.fileExistsRemotely(this._getCookieFile())
            .then(() => this.removeFileRemotely(this._getCookieFile())),
        this.fileExistsRemotely(this._getResponseFile())
            .then(() => this.removeFileRemotely(this._getResponseFile()))
    ];
    promises.forEach((promise) => {
        promise.catch(err => this.logger.debug(`${err}`));
    });

    return Promise.all(promises).then(() => this.logger.debug('Cleanup done!'));
};


module.exports = {
    QkviewManager,
    IHealthManagerLocal,
    IHealthManagerRemote
};
