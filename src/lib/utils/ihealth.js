/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const isEqual = require('lodash/isEqual');
const path = require('path');
const request = require('request');

const logger = require('../logger');
const constants = require('../constants');
const util = require('./misc');
const deviceUtil = require('./device');
const promiseUtil = require('./promise');
const requestUtil = require('./requests');

/** @module ihealthUtil */

/**
 * Initialize instance if not yet
 *
 * @returns {Promise} resolved once initialized
 */
function initializeIfNeeded() {
    let p = Promise.resolve();
    if (!this._initialized) {
        p = p.then(() => this.initialize())
            .then(() => {
                this._initialized = true;
            });
    }
    return p.then(() => this);
}

/**
 * API to interact with a device
 *
 * @property {String} host - target host
 * @property {Connection} connection
 */
class DeviceAPI {
    /**
     * Constructor
     *
     * @param {String} host - host
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - parent logger
     * @param {Credentials} [options.credentials] - F5 Device credentials
     * @param {Connection}  [options.connection]  - F5 Device connection settings
     */
    constructor(host, options) {
        options = options || {};
        this.host = host;
        this.connection = options.connection || {};
        this.credentials = options.credentials || {};
        this.setLogger(options.logger || logger);
    }

    /**
     * Build Qkview command
     *
     * Note: on BIG-IP v11.6+ qkview utility uses /var/tmp as base dir for output.
     * To avoid 'not enough space' error we have to build path using '../../<absolute_path_to_qkview>
     *
     * @public
     * @param {String} qkviewFilePath - absolute path to Qkview file
     *
     * @returns {String} Qkview command
     */
    buildQkviewCommand(qkviewFilePath) {
        return `/usr/bin/qkview -C -f ../..${qkviewFilePath}`;
    }

    /**
     * Build Qkview file path
     *
     * @public
     * @param {String} qkviewName - Qkview name
     *
     * @returns {String} Qkview file path
     */
    buildQkviewPath(qkviewName) {
        return path.join(constants.DEVICE_TMP_DIR, qkviewName);
    }

    /**
     * Create Qkview
     *
     * Note: should be run under a user with sufficient rights/access to avoid Qkview file corruption
     *
     * @public
     * @param {String} qkviewName - Qkview name
     *
     * @returns {Promise<String>} resolved with path to Qkview file
     */
    createQkview(qkviewName) {
        const qkviewPath = this.buildQkviewPath(qkviewName);
        const dacli = new deviceUtil.DeviceAsyncCLI(this.host, this.getDACLIOptions());
        this.logger.debug(`Creating Qkview at ${qkviewPath}`);
        return dacli.execute(this.buildQkviewCommand(qkviewPath))
            .then(() => qkviewPath);
    }

    /**
     * Create symbolic link for file
     *
     * @public
     * @param {String} filePath - path to file
     * @param {String} linkPath - path to link
     *
     * @returns {Promise} resolved once link created
     */
    createSymLink(filePath, linkPath) {
        this.logger.debug(`Creating symbolic link "${linkPath}" for "${filePath}"`);
        return deviceUtil.executeShellCommandOnDevice(this.host, `ln -s \\"${filePath}\\" \\"${linkPath}\\"`, this.getDefaultRequestOptions());
    }

    /**
     * Download file from device
     *
     * Workflow is following:
     * - check if remote path exists
     * - create symlink for file in directory designated for downloading files
     *   to avoid errors like 'not enough space' and etc.
     * - check if symlink created
     * - download file to local env
     * - remove symlink despite on result
     *
     * @public
     * @param {String} srcPath - path to file on device
     * @param {String} dstPath  - path to download file to
     *
     * @returns {Promise<String>} resolved with path to downloaded file
     */
    downloadFile(srcPath, dstPath) {
        const remoteFileName = path.basename(srcPath);
        let remoteDownloadPath;
        let remoteDownloadURI;
        let downloadError;
        this.logger.debug(`Downloading file "${srcPath}" to "${dstPath}"`);
        return this.pathExists(srcPath)
            .then(() => this.getDownloadInfo())
            .then((downloadInfo) => {
                remoteDownloadPath = path.join(downloadInfo.dir, remoteFileName);
                remoteDownloadURI = downloadInfo.uri;
                return this.createSymLink(srcPath, remoteDownloadPath)
                    .then(() => this.pathExists(remoteDownloadPath))
                    .catch((err) => {
                        remoteDownloadPath = null;
                        return Promise.reject(err);
                    });
            })
            .then(() => deviceUtil.downloadFileFromDevice(
                dstPath,
                this.host,
                `${remoteDownloadURI}${remoteFileName}`,
                this.getDefaultRequestOptions()
            ))
            .catch((err) => {
                downloadError = err;
            })
            .then(() => {
                if (!remoteDownloadPath) {
                    return Promise.resolve();
                }
                return this.removeFile(remoteDownloadPath);
            })
            .then(() => (downloadError ? Promise.reject(downloadError) : Promise.resolve(dstPath)));
    }

    /**
     * Request auth token
     *
     * @private
     * @returns {Promise} resolved when auth data received
     */
    getAuthToken() {
        if (this.credentials.token) {
            return Promise.resolve();
        }
        // in case of optimization, replace with Object.assign
        const options = util.deepCopy(this.connection);
        return deviceUtil.getAuthToken(
            this.host, this.credentials.username, this.credentials.passphrase, options
        )
            .then((token) => {
                this.credentials.token = token.token;
            });
    }

    /**
     * Returns options for DACLI
     *
     * @private
     * @returns {Object} options
     */
    getDACLIOptions() {
        return {
            scriptName: `ts_ihealth_${util.generateUuid().slice(0, 5).replace(/-/g, '_')}`,
            connection: util.deepCopy(this.connection),
            credentials: util.deepCopy(this.credentials)
        };
    }

    /**
     * Returns default request' options
     *
     * @private
     * @returns {Object} default request' options
     */
    getDefaultRequestOptions() {
        // remove parse-stringify in case of optimizations
        const options = Object.assign({}, util.deepCopy(this.connection));
        options.credentials = {
            token: this.credentials.token,
            username: this.credentials.username
        };
        return options;
    }

    /**
     * Fetch device's info
     *
     * @public
     * @returns {Promise<Object>} resolved with device's info
     */
    getDeviceInfo() {
        return deviceUtil.getDeviceInfo(this.host, this.getDefaultRequestOptions());
    }

    /**
     * Get download locations
     *
     * @public
     * @returns {Promise<Object>} resolved with download info
     */
    getDownloadInfo() {
        return this.getDeviceInfo()
            .then((deviceInfo) => {
                const transferType = util.compareVersionStrings(deviceInfo.version, '<', '14.0') ? 'MADM' : 'BULK';
                const conf = constants.DEVICE_REST_API.TRANSFER_FILES[transferType];
                return {
                    dir: conf.DIR,
                    uri: conf.URI
                };
            });
    }

    /**
     * Calculate MD5 sum for file
     *
     * Note: creating MD5 sum using DACLI because it might take a while (depends on file size) and
     * better to execute such processes in async way to avoid timeout errors
     *
     * @public
     * @param {String} fileName - path to file to calculate MD5 for
     *
     * @returns {Promise<String>} resolved with MD5Sum
     */
    getMD5sum(fileName) {
        const dacli = new deviceUtil.DeviceAsyncCLI(this.host, this.getDACLIOptions());
        const md5File = `${fileName}.md5sum`;
        const md5Cmd = `md5sum "${fileName}" > "${md5File}"`;
        let md5output;
        this.logger.debug(`Calculating MD5 for "${fileName}" to "${md5File}"`);
        return dacli.execute(md5Cmd)
            .then(() => deviceUtil.executeShellCommandOnDevice(this.host, `cat \\"${md5File}\\"`, this.getDefaultRequestOptions()))
            .then((output) => {
                md5output = output;
                return this.removeFile(md5File);
            })
            .then(() => {
                if (!md5output) {
                    return Promise.reject(new Error(`MD5 file "${md5File}" is empty!`));
                }
                return Promise.resolve(md5output.split(' ', 1)[0].trim());
            });
    }

    /**
     * Initialize
     *
     * @public
     * @returns {Promise} resolved once initialized
     */
    initialize() {
        return this.getAuthToken()
            .then(() => this);
    }

    /**
     * Check if file exists
     *
     * @public
     * @param {String} fpath - path to to check
     *
     * @returns {Promise} resolved if file exists
     */
    pathExists(fpath) {
        this.logger.debug(`Checking "${fpath}" existence`);
        return deviceUtil.pathExists(fpath, this.host, this.getDefaultRequestOptions())
            .then((files) => {
                if (files.indexOf(fpath) === -1) {
                    return Promise.reject(new Error(`pathExists: ${fpath} doesn't exist`));
                }
                return Promise.resolve();
            });
    }

    /**
     * Remove file
     *
     * @public
     * @param {String} fpath - path to file to remove
     *
     * @returns {Promise} resolved once file removed
     */
    removeFile(fpath) {
        this.logger.debug(`Removing "${fpath}"`);
        return deviceUtil.removePath(fpath, this.host, this.getDefaultRequestOptions())
            .catch(removeErr => this.logger.debugException(`Unable to remove "${fpath}"`, removeErr));
    }

    /**
     * Set logger
     *
     * @public
     * @param {Logger} parentLogger - parent logger
     */
    setLogger(parentLogger) {
        this.logger = parentLogger.getChild(this.constructor.name);
    }
}

/**
 * API to interact with localhost device
 */
class LocalDeviceAPI extends DeviceAPI {
    /**
     * Constructor
     *
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - parent logger
     */
    constructor(options) {
        super(constants.LOCAL_HOST, options);
    }
}

/**
 * Qkview Manager
 *
 * Note: by default it tries to do all operations via REST API
 *
 * @property {Qkview} qkview - object with info about Qkview
 */
class QkviewManager {
    /**
     * Constructor
     *
     * @param {String} host - host, by default 'localhost'
     * @param {Object} [options] - function options
     * @param {Connection} [options.connection]  - F5 Device connection settings
     * @param {Credentials} [options.credentials] - F5 Device credentials
     * @param {String} [options.downloadFolder = ''] - directory for download
     * @param {Logger} [options.logger] - parent logger
     */
    constructor(host, options) {
        host = host || constants.LOCAL_HOST;
        options = options || {};
        this.logger = (options.logger || logger).getChild(this.constructor.name);
        this.localDevice = new LocalDeviceAPI({ logger: this.logger });
        this.remoteDevice = new DeviceAPI(host, {
            connection: options.connection || {},
            credentials: options.credentials || {},
            logger: this.logger
        });
        this.downloadFolder = options.downloadFolder || '';
    }

    /**
     * Create Qkview via REST API (will try locally on fail)
     *
     * @public
     * @returns {Promise<String>} resolved with file name once Qkview file created
     */
    createQkview() {
        return this.remoteDevice.createQkview(this.generateQkviewName());
    }

    /**
     * Download file from remote device
     *
     * @public
     * @param {String} srcPath - path to file on remote device
     * @param {String} dstPath - path to download file to
     *
     * @returns {Promise<String>} resolved with path to downloaded file
     */
    downloadFile(srcPath, dstPath) {
        return initializeIfNeeded.call(this)
            .then(() => this.remoteDevice.downloadFile(srcPath, dstPath))
            .then(() => promiseUtil.allSettled([
                this.remoteDevice.getMD5sum(srcPath),
                this.localDevice.getMD5sum(dstPath)
            ]))
            .then((md5results) => {
                md5results = promiseUtil.getValues(md5results);
                if (!(md5results[0] && md5results[1] && md5results[0] === md5results[1])) {
                    return Promise.reject(new Error('MD5 sum for downloaded Qkview file !== MD5 sum for Qkview on remote host'));
                }
                return Promise.resolve(dstPath);
            });
    }

    /**
     * Generate Qkview file name
     *
     * @public
     * @returns {String} Qkview file name
     */
    generateQkviewName() {
        const currentTime = (new Date()).getTime();
        const hrTime = process.hrtime();
        return `qkview_telemetry_${util.generateUuid().slice(0, 5).replace(/-/g, '_')}_${currentTime}_${hrTime[0]}${hrTime[1]}.tar.qkview`;
    }

    /**
     * Initialize - request auth tokens and etc.
     *
     * @public
     * @returns {Promise<QkviewManager>} resolved once initialized
     * @rejects {Error} when 'shouldDownload' is true and 'downloadFolder' not defined (or empty string)
     */
    initialize() {
        this.logger.debug('Initializing');
        return promiseUtil.allSettled([
            this.localDevice.initialize(),
            this.remoteDevice.initialize()
        ])
            .then((results) => {
                // error will be thrown if rejection found
                promiseUtil.getValues(results);
                return promiseUtil.allSettled([
                    this.localDevice.getDeviceInfo(),
                    this.remoteDevice.getDeviceInfo()
                ]);
            })
            .then((deviceInfoResults) => {
                deviceInfoResults = promiseUtil.getValues(deviceInfoResults, true);
                if (deviceInfoResults[0] && deviceInfoResults[1]
                    && isEqual(deviceInfoResults[0], deviceInfoResults[1])) {
                    this.logger.debug('Target host is localhost');
                    // to speed-up process we can use API for local device instead
                    this.remoteDevice = this.localDevice;
                } else if (!this.downloadFolder) {
                    throw new Error('Should specify directory for downloads');
                }
            })
            .then(() => this);
    }

    /**
     * Start process of Qkview file creation and download it if needed
     *
     * @public
     * @returns {Promise<String>} resolved with path to Qkview file
     */
    process() {
        let qkviewPathOnDevice;
        let localQkviewPath;
        let opError;

        return initializeIfNeeded.call(this)
            .then(() => this.createQkview())
            .then((qkviewPath) => {
                if (this.localDevice === this.remoteDevice) {
                    localQkviewPath = qkviewPath;
                    return Promise.resolve();
                }
                qkviewPathOnDevice = qkviewPath;
                localQkviewPath = path.join(this.downloadFolder, path.basename(qkviewPathOnDevice));
                return this.downloadFile(qkviewPathOnDevice, localQkviewPath);
            })
            .catch((err) => {
                opError = err;
            })
            .then(() => {
                const promises = [];
                if (qkviewPathOnDevice) {
                    promises.push(this.remoteDevice.removeFile(qkviewPathOnDevice));
                }
                if (opError && localQkviewPath) {
                    promises.push(this.localDevice.removeFile(localQkviewPath));
                }
                return promiseUtil.allSettled(promises);
            })
            .then(() => (opError ? Promise.reject(opError) : localQkviewPath));
    }
}

/**
 * F5 iHealth API class
 */
class IHealthAPI {
    /**
     * Constructor
     *
     * @param {Credentials} credentials - F5 iHealth Service credentials
     * @param {Object} [options = {}] - other options
     * @param {Proxy} [options.proxy] - proxy settings for F5 iHealth Service connection
     * @param {Logger} [options.logger] - logger instance
     */
    constructor(credentials, options) {
        if (!(credentials.username && credentials.passphrase)) {
            throw new Error('Username and passphrase are required!');
        }
        options = options || {};
        this.username = credentials.username;
        this.passphrase = credentials.passphrase;
        this.proxy = options.proxy || {};
        this.proxy.connection = this.proxy.connection || {};
        this.proxy.credentials = this.proxy.credentials || {};
        this.cookieJar = request.jar();
        this.logger = options.logger || logger.getChild('iHealthAPI');
    }

    /**
     * Try authenticate to F5 iHealth Service with provided credentials
     *
     * @public
     * @returns {Promise} resolved once got HTTP 200 OK
     */
    authenticate() {
        this.logger.debug('Authenticating to F5 iHealth Service');
        return Promise.resolve()
            .then(() => {
                const requestOptions = this.getDefaultRequestOptions();
                requestOptions.body = {
                    user_id: this.username,
                    user_secret: this.passphrase
                };
                requestOptions.fullURI = constants.IHEALTH.SERVICE_API.LOGIN;
                requestOptions.method = 'POST';
                requestOptions.headers['Content-type'] = 'application/json';
                requestOptions.expectedResponseCode = 200;
                return this.sendRequest(requestOptions);
            });
    }

    /**
     * Fetch Qkview diagnostics data from F5 iHealth Service
     *
     * @public
     * @property {String} qkviewURI - Qkview URI (returned after Qkview upload)
     *
     * @returns {Promise<Object>} resolved with Qkview diagnostics data
     */
    fetchQkviewDiagnostics(qkviewURI) {
        this.logger.debug(`Fetching Qkview diagnostics from "${qkviewURI}"`);
        return Promise.resolve()
            .then(() => {
                const requestOptions = this.getDefaultRequestOptions();
                requestOptions.fullURI = `${qkviewURI}/diagnostics.json`;
                requestOptions.method = 'GET';
                requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';
                requestOptions.rawResponseBody = true;
                return this.sendRequest(requestOptions);
            })
            .then((res) => {
                try {
                    res = JSON.parse(res);
                } catch (err) {
                    return Promise.reject(new Error(`Invalid JSON response from F5 iHeath Service: ${res}`));
                }
                if (util.isObjectEmpty(res.diagnostics)) {
                    return Promise.reject(new Error(`Missing 'diagnostics' in JSON response from F5 iHeath Service: ${JSON.stringify(res)}`));
                }
                return res;
            });
    }

    /**
     * Default options for 'request' library
     *
     * @private
     * @returns {Object} default 'request' options
     */
    getDefaultRequestOptions() {
        return {
            headers: { 'User-Agent': constants.USER_AGENT },
            jar: this.cookieJar,
            strictSSL: this.getStrictSSL(), // because we are connecting to F5 API
            proxy: this.getProxy()
        };
    }

    /**
     * Build URL for proxy if configured
     *
     * @private
     * @returns {String} proxy URL or empty string if not configured
     */
    getProxy() {
        let proxy;
        if (this.proxy && this.proxy.connection.host) {
            proxy = {
                host: this.proxy.connection.host,
                port: this.proxy.connection.port,
                protocol: this.proxy.connection.protocol,
                username: this.proxy.credentials.username,
                passphrase: this.proxy.credentials.passphrase
            };
        }
        return proxy;
    }

    /**
     * Get value for strict SSL options
     *
     * @returns {Boolean}
     */
    getStrictSSL() {
        let strictSSL = true; // by default, because we are connecting to F5 API
        if (this.proxy && this.proxy.connection.host) {
            strictSSL = !this.proxy.connection.allowSelfSignedCert;
        }
        return strictSSL;
    }

    /**
     * Check if Qkview report is done
     *
     * @public
     * @property {String} qkviewURI - Qkview URI (returned after Qkview upload)
     *
     * @returns {Promise<Boolean>} resolved with true when Qkview analyzing is done
     */
    isQkviewReportReady(qkviewURI) {
        this.logger.debug(`Checking Qkview diagnostics status at "${qkviewURI}"`);
        return Promise.resolve()
            .then(() => {
                const requestOptions = this.getDefaultRequestOptions();
                requestOptions.fullURI = qkviewURI;
                requestOptions.method = 'GET';
                requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0';
                requestOptions.continueOnErrorCode = true;
                requestOptions.includeResponseObject = true;
                return this.sendRequest(requestOptions);
            })
            .then(res => Promise.resolve(res[1].statusCode === 200));
    }

    /**
     * Send request
     *
     * @private
     * @param {Object} options - function options, see 'makeDeviceRequest' in 'utils/device.js'
     *
     * @returns {Promise<Any>} resolved with response
     */
    sendRequest(options) {
        return requestUtil.makeRequest(options);
    }

    /**
     * Upload Qkview file to F5 iHealth Service
     *
     * @public
     * @param {String} qkviewFile - path to Qkview file
     *
     * @returns {Promise<String>} resolved with URI of the Qkview uploaded to F5 iHealth service
     */
    uploadQkview(qkviewFile) {
        this.logger.debug(`Uploading Qkview "${qkviewFile}" to F5 iHealth Service`);
        return Promise.resolve()
            .then(() => {
                const requestOptions = this.getDefaultRequestOptions();
                requestOptions.fullURI = constants.IHEALTH.SERVICE_API.UPLOAD;
                requestOptions.method = 'POST';
                requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';
                requestOptions.formData = {
                    qkview: fs.createReadStream(qkviewFile),
                    visible_in_gui: 'True'
                };
                requestOptions.continueOnErrorCode = true;
                requestOptions.includeResponseObject = true;
                return this.sendRequest(requestOptions);
            })
            .then((res) => {
                let parsedBody;
                let rejectReason;
                const body = res[0];
                const respObj = res[1];

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
                    rejectReason = 'unable to find "location" in response body';
                }
                return Promise.reject(new Error(`Unable to upload Qkview to F5 iHealth server: ${rejectReason}: responseCode = ${respObj.statusCode} responseBody = ${JSON.stringify(body)}`));
            });
    }
}


/**
 * iHealth Manager to upload Qkview and poll diagnostics from the local device
 *
 * @class
 *
 * @property {IHealthAPI} api - instance of IHealthAPI
 * @property {String} qkviewFile - path to Qkview file on the device
 * @property {String} qkviewURI - Qkview' URI on F5 iHealth
 */
class IHealthManager {
    /**
     * Constructor
     *
     * @param {Credentials} credentials - F5 iHealth Service credentials
     * @param {Object} options - function options
     * @param {Logger} [options.logger] - parent logger
     * @param {Proxy} [options.proxy] - proxy settings for F5 iHealth Service connection
     * @param {String} [options.qkviewFile] - path to Qkview file on the device
     * @param {String} [options.qkviewURI] - Qkview' URI on F5 iHealth
     */
    constructor(credentials, options) {
        options = options || {};
        this.api = new IHealthAPI(credentials, {
            logger: (options.logger || logger).getChild('IHealthManager'),
            proxy: options.proxy
        });
        this.qkviewFile = options.qkviewFile;
        this.qkviewURI = options.qkviewURI;
    }

    /**
     * Retrieve diagnostics data from F5 iHealth service
     *
     * @public
     * @param {String} [qkviewURI] - Qkview' URI on F5 iHealth
     *
     * @return {Promise<Object>} resolved with diagnostics data (parsed JSON)
     * @rejects {Error} when 'qkviewURI not set
     */
    fetchQkviewDiagnostics(qkviewURI) {
        qkviewURI = qkviewURI || this.qkviewURI;
        if (!qkviewURI) {
            return Promise.reject(new Error('Qkview URI not specified'));
        }
        return initializeIfNeeded.call(this)
            .then(() => this.api.fetchQkviewDiagnostics(qkviewURI));
    }

    /**
     * Check is F5 iHealth service done Qkview processing or not
     *
     * @public
     * @param {String} [qkviewURI] - Qkview' URI on F5 iHealth
     *
     * @return {Promise<Boolean>} resolved with 'true' when Qkview processing done
     * @rejects {Error} when 'qkviewURI not set
     */
    isQkviewReportReady(qkviewURI) {
        qkviewURI = qkviewURI || this.qkviewURI;
        if (!qkviewURI) {
            return Promise.reject(new Error('Qkview URI not specified'));
        }
        return initializeIfNeeded.call(this)
            .then(() => this.api.isQkviewReportReady(qkviewURI));
    }

    /**
     * Initialize - do auth and etc.
     *
     * @public
     * @returns {Promise<IHealthManager>} resolved once preparation done
     */
    initialize() {
        return this.api.authenticate()
            .then(() => this);
    }

    /**
     * Upload Qkview to F5 iHealth service
     *
     * @public
     * @param {String} [qkviewFile] - path to Qkview file on the device
     *
     * @return {Promise<String>} resolved with URI of the Qkview uploaded to F5 iHealth service
     * @rejects {Error} when 'qkviewFile not set
     */
    uploadQkview(qkviewFile) {
        qkviewFile = qkviewFile || this.qkviewFile;
        if (!qkviewFile) {
            return Promise.reject(new Error('Path to Qkview file not specified'));
        }
        return initializeIfNeeded.call(this)
            .then(() => this.api.uploadQkview(qkviewFile))
            .then((qkviewURI) => {
                this.qkviewURI = qkviewURI;
                return qkviewURI;
            });
    }
}

module.exports = {
    DeviceAPI,
    IHealthAPI,
    IHealthManager,
    LocalDeviceAPI,
    QkviewManager
};

/**
 * @typedef Connection
 * @property {String}  protocol - HTTP protocol
 * @property {Integer} port - HTTP port
 * @property {Boolean} allowSelfSignedCert - false - requires SSL certificates be valid,
 *                                           true  - allows self-signed certs
 */
/**
 * @typedef Credentials
 * @property {String} username - username
 * @property {String} passhprase - passphrase
 * @property {String} [token] - F5 Device auth token for re-use
 */
/**
 * @typedef Proxy
 * @property {Credentials} credentials - credentials
 * @property {Connection} connection - connection
 */
