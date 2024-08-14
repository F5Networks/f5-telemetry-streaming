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

const path = require('path');

const assert = require('../../utils/assert');
const constants = require('../../constants');
const dacli = require('../../utils/dacli');
const defaultLogger = require('../../logger');
const deviceUtil = require('../../utils/device');
const util = require('../../utils/misc');

/**
 * @module ihealth/api/device
 *
 * @typedef {import('../../logger').Logger} Logger
 * @typedef {import('../../utils/config').Connection} Connection
 * @typedef {import('../../utils/config').Credentials} Credentials
 */

/**
 * API to interact with a remote BIG-IP
 *
 * @property {Connection} connection
 * @property {Credentials} credentials
 * @property {string} host
 * @property {Logger} logger
 */
class DeviceAPI {
    /**
     * Constructor
     *
     * @param {string} host - host
     * @param {object} options - options
     * @param {Logger} options.logger - parent logger
     * @param {Credentials} [options.credentials] - F5 Device credentials
     * @param {null | string} [options.credentials.token] - F5 Device authorization token
     * @param {Connection} [options.connection] - F5 Device connection settings
     */
    constructor(host, {
        connection = undefined,
        credentials = undefined,
        logger = undefined
    } = {}) {
        assert.string(host, 'target host');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');
        assert.bigip.credentials(host, credentials, 'credentials');

        if (connection) {
            assert.bigip.connection(connection, 'connection');
        }

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            host: {
                value: host
            },
            connection: {
                value: util.deepFreeze(util.deepCopy(connection))
            },
            credentials: {
                value: util.deepCopy(credentials || {})
            },
            logger: {
                value: logger.getChild(`${this.constructor.name}[${host}]`)
            }
        });
    }

    /**
     * Creates Qkview
     *
     * Note: should be run under a user with sufficient rights/access to avoid Qkview file corruption
     *
     * @param {string} qkviewName - Qkview name
     * @param {string} [dir] - parent directory
     *
     * @returns {string} absolute path to Qkview file
     */
    async createQkview(qkviewName, dir = constants.DEVICE_TMP_DIR) {
        assert.string(qkviewName, 'Qkview file name');
        assert.string(dir, 'directory');

        const qkviewPath = path.join(dir, qkviewName);
        this.logger.debug(`Creating Qkview at ${qkviewPath}`);

        await getAuthToken.call(this);
        await dacli(buildQkviewCommand(qkviewPath), this.host, getDACLIOptions.call(this, 'qkview'));

        return qkviewPath;
    }

    /**
     * Downloads file from device
     *
     * Workflow is following:
     * - check if remote path exists
     * - create symlink for file in directory designated for downloading files
     *   to avoid errors like 'not enough space' and etc.
     * - check if symlink created
     * - download file to local env
     * - remove symlink despite on result
     *
     * @param {string} srcPath - path to file on device
     * @param {string} dstPath  - path to download file to
     *
     * @returns {string} absolute path to downloaded file
     */
    async downloadFile(srcPath, dstPath) {
        assert.string(srcPath, 'source file');
        assert.string(dstPath, 'destination file');

        this.logger.debug(`Downloading file "${srcPath}" to "${dstPath}"`);

        await getAuthToken.call(this);
        await pathExists.call(this, srcPath); // throws error if path does not exist

        const remoteFileName = path.basename(srcPath);
        const downloadInfo = getDownloadInfo(this);
        const remoteDownloadPath = path.join(downloadInfo.dir, remoteFileName);
        const remoteDownloadURI = downloadInfo.uri;

        await createSymLink.call(this, srcPath, remoteDownloadPath);
        await pathExists.call(this, remoteDownloadPath); // throws error if path does not exist

        let bytes = 0;
        try {
            bytes = await deviceUtil.downloadFileFromDevice(
                dstPath,
                this.host,
                path.join(remoteDownloadURI, remoteFileName),
                getDefaultRequestOptions.call(this)
            );
        } finally {
            await this.removeFile(remoteDownloadPath);
        }

        this.logger.debug(`Transferred and written ${bytes} bytes to "${dstPath}"`);

        return dstPath;
    }

    /**
     * Fetches device's info
     *
     * @returns {object} device's info
     */
    async getDeviceInfo() {
        await getAuthToken.call(this);
        return deviceUtil.getDeviceInfo(this.host, getDefaultRequestOptions.call(this));
    }

    /**
     * Calculates MD5 sum for file
     *
     * Note: creating MD5 sum using DACLI because it might take a while (depends on file size) and
     * better to execute such processes in async way to avoid timeout errors
     *
     * @param {string} filePath - path to file to calculate MD5 for
     *
     * @returns {string} file's MD5Sum
     */
    async getMD5sum(filePath) {
        assert.string(filePath, 'path to a file');

        const md5File = `${filePath}.md5sum`;
        const md5Cmd = `md5sum "${filePath}" > "${md5File}"`;
        const shellCmd = `cat \\"${md5File}\\"`;

        this.logger.debug(`Calculating MD5 for "${filePath}" ("${md5File}")`);
        await getAuthToken.call(this);

        let md5 = '';
        try {
            await dacli(md5Cmd, this.host, getDACLIOptions.call(this, 'md5'));
            md5 = (await deviceUtil.executeShellCommandOnDevice(
                this.host,
                shellCmd,
                getDefaultRequestOptions.call(this)
            ))
                .trim()
                .split(/\s+/)[0];
        } finally {
            await this.removeFile(md5File);
        }

        if (!md5) {
            throw new Error(`MD5 file "${md5File}" is empty!`);
        }
        return md5;
    }

    /**
     * Removes file
     *
     * @param {string} filePath - path to file to remove
     */
    async removeFile(filePath) {
        assert.string(filePath, 'path to a file');

        this.logger.debug(`Removing "${filePath}"`);

        await getAuthToken.call(this);
        try {
            await deviceUtil.removePath(
                filePath,
                this.host,
                getDefaultRequestOptions.call(this)
            );
        } catch (error) {
            this.logger.debugException(`Unable to remove "${filePath}"`, error);
        }
    }
}

/**
 * Builds Qkview command
 *
 * Note: on BIG-IP v11.6+ qkview utility uses /var/tmp as base dir for output.
 * To avoid 'not enough space' error we have to build path using '../../<absolute_path_to_qkview>
 *
 * @param {string} qkviewFilePath - absolute path to Qkview file
 *
 * @returns {string} Qkview command
 */
function buildQkviewCommand(qkviewFilePath) {
    return `/usr/bin/qkview -C -f ../..${qkviewFilePath}`;
}

/**
 * @this {DeviceAPI}
 *
 * @returns {Connection | undefined} copied connection options
 */
function cloneConnectionOptions() {
    return this.connection ? util.deepCopy(this.connection) : undefined;
}

/**
 * Creates symbolic link for file
 *
 * @this {DeviceAPI}
 *
 * @param {string} filePath - path to file
 * @param {string} linkPath - path to link
 */
async function createSymLink(filePath, linkPath) {
    this.logger.debug(`Creating symbolic link "${linkPath}" for "${filePath}"`);
    await deviceUtil.executeShellCommandOnDevice(
        this.host,
        `ln -s \\"${filePath}\\" \\"${linkPath}\\"`,
        getDefaultRequestOptions.call(this)
    );
}

/**
 * Requests auth token
 *
 * @this {DeviceAPI}
 */
async function getAuthToken() {
    if (typeof this.credentials.token !== 'undefined') {
        return;
    }
    // in case of optimization, replace with Object.assign
    this.credentials.token = (await deviceUtil.getAuthToken(
        this.host,
        this.credentials.username,
        this.credentials.passphrase,
        cloneConnectionOptions.call(this)
    )).token;
    util.deepFreeze(this.credentials);
}

/**
 * Gets options for DACLI
 *
 * @this {DeviceAPI}
 *
 * @param {string} operationName
 *
 * @returns {object} options
 */
function getDACLIOptions(operationName) {
    return {
        scriptName: `ts_ihealth_${operationName}_${util.generateUuid().slice(0, 5).replace(/-/g, '_')}`,
        connection: cloneConnectionOptions.call(this),
        credentials: util.deepCopy(this.credentials)
    };
}

/**
 * Gets default request' options
 *
 * @this {DeviceAPI}
 *
 * @returns {object} default request' options
 */
function getDefaultRequestOptions() {
    const options = Object.assign({}, cloneConnectionOptions.call(this) || {});
    options.credentials = { token: this.credentials.token };

    if (this.credentials.username) {
        options.credentials.username = this.credentials.username;
    }
    return options;
}

/**
 * Gets download locations
 *
 * @returns {object} download info
 */
function getDownloadInfo() {
    const conf = constants.DEVICE_REST_API.TRANSFER_FILES.BULK;
    return {
        dir: conf.DIR,
        uri: conf.URI
    };
}

/**
 * Checks if file exists
 *
 * @this {DeviceAPI}
 *
 * @param {string} filePath - path to check
 *
 * @throws {Error} when path does not exist
 */
async function pathExists(filePath) {
    this.logger.debug(`Checking if "${filePath}" exists...`);
    const files = await deviceUtil.pathExists(filePath, this.host, getDefaultRequestOptions.call(this));

    if (files.indexOf(filePath) === -1) {
        this.logger.debug(`No such file path "${filePath}" found on the device`);
        throw new Error(`pathExists: "${filePath}" doesn't exist`);
    }
}

module.exports = DeviceAPI;
