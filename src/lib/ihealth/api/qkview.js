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

const isEqual = require('lodash/isEqual');
const pathUtil = require('path');

const assert = require('../../utils/assert');
const DeviceAPI = require('./device');
const util = require('../../utils/misc');

/**
 * @module ihealth/api/qkview
 */

/**
 * Qkview Manager
 */
class QkviewManager {
    /**
     * Constructor
     *
     * @param {DeviceAPI} local - local device
     * @param {DeviceAPI} remote - remote device
     * @param {options} options - options
     * @param {string} options.downloadFolder - directory for download
     */
    constructor(local, remote, {
        downloadFolder = undefined
    } = {}) {
        assert.instanceOf(local, DeviceAPI, 'local device');
        assert.instanceOf(remote, DeviceAPI, 'remote device');
        assert.string(downloadFolder, 'download folder');

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            downloadFolder: {
                value: downloadFolder
            },
            local: {
                value: local
            },
            remote: {
                value: remote
            }
        });
    }

    /**
     * Generates Qkview file on the deivce and downloading it (if needed)
     *
     * @returns {string} absolute path to Qkview file on the local device
     */
    async generateQkview() {
        const localDevice = this.local;
        let remoteDevice = this.remote;

        const localInfo = await localDevice.getDeviceInfo();
        const remoteInfo = await remoteDevice.getDeviceInfo();

        if (isEqual(localInfo, remoteInfo)) {
            // remote and local devices are the same
            remoteDevice = localDevice;
        }

        const remoteQkviewPath = await createQkview.call(this, remoteDevice);
        let downloadErr;
        let localQkviewPath;

        if (remoteDevice === localDevice) {
            localQkviewPath = remoteQkviewPath;
        } else {
            localQkviewPath = pathUtil.join(this.downloadFolder, pathUtil.basename(remoteQkviewPath));
            try {
                await downloadFile(
                    remoteDevice,
                    localDevice,
                    remoteQkviewPath,
                    localQkviewPath
                );
            } catch (error) {
                downloadErr = error;
            }
        }

        if (remoteDevice !== localDevice) {
            await remoteDevice.removeFile(remoteQkviewPath);
        }

        if (downloadErr) {
            await localDevice.removeFile(localQkviewPath);
            throw downloadErr;
        }

        return localQkviewPath;
    }

    /**
     * Removes file from the local deivce
     *
     * @param {string} filePath
     *
     * @returns {void} once file removed
     */
    async removeLocalFile(filePath) {
        return this.local.removeFile(filePath);
    }
}

/**
 * Creates Qkview via REST API on the deivce
 *
 * @this QkviewManager
 *
 * @param {DeviceAPI} device
 *
 * @returns {string} file name once Qkview file created
 */
async function createQkview(device) {
    return device.createQkview(generateQkviewName(), this.downloadFolder);
}

/**
 * Downloads file from the device
 *
 * @param {DeviceAPI} remote
 * @param {DeviceAPI} local
 * @param {string} srcPath - path to file on the remote device
 * @param {string} dstPath - path to download file to the local device
 *
 * @returns {string} absolute path to downloaded file on the local device
 */
async function downloadFile(remote, local, srcPath, dstPath) {
    await remote.downloadFile(srcPath, dstPath);
    const remoteMD5 = await remote.getMD5sum(srcPath);
    const localMD5 = await local.getMD5sum(dstPath);

    if (localMD5 !== remoteMD5) {
        throw new Error(`MD5 sum "${localMD5}" for the downloaded file "${dstPath}" !== MD5 sum "${remoteMD5}" for the remote file "${srcPath}"`);
    }
    return dstPath;
}

/**
 * Generates Qkview file name
 *
 * @returns {string} Qkview file name
 */
function generateQkviewName() {
    const currentTime = (new Date()).getTime();
    const hrTime = process.hrtime();
    return `qkview_telemetry_${util.generateUuid().slice(0, 5).replace(/-/g, '_')}_${currentTime}_${hrTime[0]}${hrTime[1]}.tar.qkview`;
}

module.exports = QkviewManager;
