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

/* eslint-disable no-constant-condition, no-continue */

const assert = require('./assert');
const constants = require('../constants');
const logger = require('../logger').getChild('utils').getChild('device');
const promiseUtil = require('./promise');
const requestsUtil = require('./requests');
const util = require('./misc');

/**
 * @module utils/device
 *
 * @typedef {import('./config').Connection} Connection
 * @typedef {import('./config').Credentials} Credentials
 */

/**
 * Cache for info about the device TS is running on
 *
 * @private
 *
 * @property {String}  TYPE    - device's type - BIG-IP or Container
 * @property {Object}  VERSION - version information
 */
const HOST_DEVICE_CACHE = {};
const HDC_KEYS = {
    TYPE: 'TYPE',
    VERSION: 'VERSION'
};

/**
 * Adds `application/json` Content-Type header
 *
 * @param {object} options
 * @param {object} [options.headers]
 */
function addJsonHeader(options) {
    options.headers = Object.assign(
        {},
        options.headers || {},
        {
            'Content-Type': 'application/json'
        }
    );
}

/** HOST DEIVCE INFO START */
/**
 * Clear Host Device Info
 *
 * @public
 *
 * @param {...string} [key] - key(s) to remove, if absent then all keys will be removed
 */
function clearHostDeviceInfo(...keys) {
    const keysToRemove = keys.length ? keys : Object.keys(HOST_DEVICE_CACHE);
    keysToRemove.forEach((key) => {
        assert.string(key, 'key');
        delete HOST_DEVICE_CACHE[key];
    });
}

/**
 * Gather Host Device Info (Host Device is the device TS is running on)
 *
 * Note: result of this operation will be cached
 *
 * @public
 *
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {void} once info about Host Device was gathered
 */
async function gatherHostDeviceInfo(options = {}) {
    const deviceType = await getDeviceType(false);
    setHostDeviceInfo(HDC_KEYS.TYPE, deviceType);

    const deviceVersion = await getDeviceVersion(constants.LOCAL_HOST, options);
    setHostDeviceInfo(HDC_KEYS.VERSION, deviceVersion);
}

/**
 * Get Host Device info
 *
 * @public
 *
 * @param {string} [key] - key, if omitted then copy of cache will be returned
 *
 * @returns {any} value from cache for the key or copy of cache if no arguments were passed to function
 */
function getHostDeviceInfo(key) {
    if (arguments.length === 0) {
        return util.deepCopy(HOST_DEVICE_CACHE);
    }
    assert.string(key, 'key');
    return HOST_DEVICE_CACHE[key];
}

/**
 * Set Host Device Info
 *
 * @private
 *
 * @param {string} key - key
 * @param {any} value  - value
 */
function setHostDeviceInfo(key, value) {
    assert.string(key, 'key');
    HOST_DEVICE_CACHE[key] = value;
}
/** HOST DEIVCE INFO END */

/**
 * Decrypt secret
 *
 * @private
 *
 * @param {string} data - data to decrypt
 *
 * @returns {object} decrypted secret
 */
async function decryptSecret(secret) {
    assert.string(secret, 'secret');

    secret = secret.split(',');
    secret.forEach((s) => assert.string(s, 'sub-secret'));

    /**
     * TODO:
     * - check args type - ...args or [arg1, arg2]
     * - restrict max length of data per call
     */

    return (await util.childProcess.execFile(
        '/usr/bin/php',
        [`${__dirname}/decryptConfValue.php`, ...secret]
    )).stdout;
}

/**
 * Decrypt all secrets
 *
 * NOTE: mutates `data`
 *
 * @public
 *
 * @param {object} data - data to decrypt
 *
 * @returns {object} decrypted data
 */
async function decryptAllSecrets(data) {
    const promises = [];
    util.traverseJSON(data, (parent, key) => {
        const item = parent[key];
        if (typeof item === 'object' && !Array.isArray(item)
            && item !== null && item.class === constants.CONFIG_CLASSES.SECRET_CLASS) {
            if (typeof item[constants.PASSPHRASE_CIPHER_TEXT] !== 'undefined') {
                promises.push(decryptSecret(item[constants.PASSPHRASE_CIPHER_TEXT])
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

    const results = await promiseUtil.allSettled(promises);
    promiseUtil.getValues(results);
    return data;
}

/**
 * Download file from the remote device. Function doesn't handle file removal
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string | WritableStream} dst - destination, could be path to file or WriteableStream
 * @param {string} host - host
 * @param {string} uri - uri to download from the remote device
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {number} amount of downloaded data in bytes
 */
async function downloadFileFromDevice(dst, host, uri, options = {}) {
    assert.oneOfAssertions(
        () => assert.assert(typeof dst === 'object' && dst !== null, 'dst', 'should be a WritableStream'),
        () => assert.string(dst, 'dst')
    );

    const chunkSize = constants.DEVICE_REST_API.CHUNK_SIZE;
    const rangeRe = /^(\d+)-(\d+)\/(\d+)$/;

    let closeStream = false;
    let currentBytes = 0;
    let end = chunkSize - 1;
    let totalSize = 0;
    let streamError = null;

    options.method = 'GET';
    options.headers = options.headers || {};
    options.includeResponseObject = true;
    options.continueOnErrorCode = true;
    options.rawResponseBody = true;

    if (typeof dst === 'string') {
        closeStream = true;
        dst = util.fs.createWriteStream(dst, { flags: 'w' });
    }
    let wsOpened = false;

    // add our own listeners
    function wsErrorHandler(err) {
        dst.removeListener('error', wsErrorHandler);
        streamError = err;
    }
    function wsOpenHandler() {
        dst.removeListener('open', wsOpenHandler);
        wsOpened = true;
    }
    dst.on('open', wsOpenHandler);
    dst.on('error', wsErrorHandler);

    const writeData = (data) => new Promise((resolve, reject) => {
        if (streamError) {
            reject(streamError);
        } else {
            try {
                dst.write(data, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        currentBytes += data.length;
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        }
    });

    const download = async () => {
        while (true) {
            end = (
                (currentBytes + chunkSize) > totalSize
                    ? (totalSize || chunkSize)
                    : (currentBytes + chunkSize)
            ) - 1;

            const headers = {
                'Content-Range': `${currentBytes}-${end}/${totalSize}`,
                'Content-Type': 'application/octet-stream'
            };
            const optionsCopy = util.deepCopy(options);
            Object.assign(optionsCopy.headers, headers);

            const [respBody, respObj] = await makeDeviceRequest(host, uri, optionsCopy);
            const crange = (respObj.headers['content-range'] || '').match(rangeRe);

            if (respObj.statusCode !== 200 || !crange) {
                const msg = respObj.statusCode === 200 ? '(invalid Content-Range header)' : '';
                throw new Error(`downloadFileFromDevice: HTTP Error: ${respObj.statusCode} ${respObj.statusMessage}${msg}`);
            }

            if (totalSize === 0) {
                totalSize = parseInt(crange[3], 10);
                assert.safeNumberGrEq(totalSize, 0, 'downloadFileFromDevice: totalSize');

                if (totalSize === 0) {
                    // no data at all?
                    break;
                }
            }

            const rangeStart = parseInt(crange[1], 10);
            assert.safeNumberEq(rangeStart, currentBytes, 'downloadFileFromDevice: rangeStart');

            const rangeEnd = parseInt(crange[2], 10);
            assert.safeNumberGrEq(rangeEnd, 0, 'downloadFileFromDevice: rangeEnd');

            const dataSize = rangeEnd - rangeStart + 1;
            assert.safeNumberGr(dataSize, 0, 'downloadFileFromDevice: rangeSize');
            assert.safeNumberEq(respBody.length, dataSize, 'downloadFileFromDevice: rangeSize');

            assert.safeNumberLsEq(currentBytes + dataSize, totalSize, '`downloadFileFromDevice: the size of downloaded data');

            await writeData(respBody);

            if (currentBytes === totalSize) {
                break;
            }
        }
    };

    try {
        await download();
    } catch (downloadError) {
        streamError = streamError || downloadError;
    }

    if (closeStream && dst.end && wsOpened) {
        // have to close the stream opened at the start
        await (new Promise((resolve) => {
            dst.on('close', () => resolve());
            dst.end(() => {
                dst.close();
            });
        }));
    }

    if (streamError) {
        throw streamError;
    }

    return currentBytes;
}

/**
 * Encrypt secret
 *
 * @public
 *
 * @param {string} secret - data to encrypt
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {string} encrypted secret
 */
async function encryptSecret(secret, options = {}) {
    assert.string(secret, 'secret');

    /**
     * TODO:
     * - move max chunk size to constants
     * - length restrictions
     *   - original size is way less than encrypted size
     *   - if we do b64 for original data then encrypted is way way bigger
     * - fix BZ1292457
     */
    secret = secret.match(/(.|\n){1,500}/g);

    const result = [];
    for (let i = 0; i < secret.length; i += 1) {
        let encryptError = null;
        let response;
        const radiusObjectName = `telemetry_delete_me_${util.generateUuid().slice(0, 6)}`;
        const uri = '/mgmt/tm/ltm/auth/radius-server';

        const httpPostOptions = Object.assign({}, options, {
            method: 'POST',
            body: {
                name: radiusObjectName,
                secret: secret[i],
                server: 'foo'
            }
        });
        addJsonHeader(httpPostOptions);

        const httpDeleteOptions = Object.assign({}, options, {
            method: 'DELETE',
            continueOnErrorCode: true // ignore error to avoid UnhandledPromiseRejection error
        });

        try {
            response = await makeDeviceRequest(constants.LOCAL_HOST, uri, httpPostOptions);
        } catch (error) {
            encryptError = error;
        }
        try {
            // remove TMOS object at first to keep BIG-IP clean and then throw error if needed
            await makeDeviceRequest(constants.LOCAL_HOST, `${uri}/${radiusObjectName}`, httpDeleteOptions);
        } catch (error) {
            // do nothing
        }

        if (!encryptError) {
            if (typeof response.secret !== 'string') {
                // well this can't be good
                encryptError = new Error(`encryptSecret: Secret could not be retrieved: ${util.stringify(response)}`);
            } else if (response.secret.includes(',')) {
                encryptError = new Error('encryptSecret: Encrypted data should not have a comma in it');
            }
        }
        if (encryptError) {
            throw encryptError;
        }
        result.push(response.secret);
    }

    return result.join(',');
}

/**
 * Execute shell command(s) via REST API on BIG-IP.
 * Command should have escaped quotes.
 * If host is not localhost then auth token should be passed along with headers.
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} host - host
 * @param {string} command - shell command
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {string} command's output
 */
async function executeShellCommandOnDevice(host, command, options = {}) {
    assert.string(command, 'command');

    const uri = '/mgmt/tm/util/bash';
    addJsonHeader(options);
    options.method = 'POST';
    options.includeResponseObject = false;
    options.body = {
        command: 'run',
        utilCmdArgs: `-c "${command}"`
    };
    return (await makeDeviceRequest(host, uri, options)).commandResult || '';
}

/**
 * Get auth token
 *
 * NOTE: mutates `options`
 *
 * @param {string} host - host
 * @param {string} username - device username
 * @param {string} passphrase - device passphrase
 * @param {Connection} [options] - function options
 *
 * @returns {{ token: string }} auth token (for localhost access `token` property set to null intentionally)
 */
async function getAuthToken(host, username, passphrase, options = {}) {
    let token = { token: null };
    // if host is localhost we do not need an auth token
    if (host !== constants.LOCAL_HOST) {
        token = await requestAuthToken.call(this, host, username, passphrase, options);
    }
    return token;
}

/**
 * Fetch device's info
 *
 * Fetches system info for arbitrary BIG-IP via REST API
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} host  - host
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {object} device's info
 */
async function getDeviceInfo(host, options = {}) {
    const uri = '/mgmt/shared/identified-devices/config/device-info';
    options.method = 'GET';
    options.includeResponseObject = false;

    const res = await makeDeviceRequest(host, uri, options);
    return {
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
    };
}

/**
 * Performs a check of the local environment and returns type of the device
 *
 * @public
 *
 * @property {boolean} [cached = true] - use cached data if available
 *
 * @returns {constants.DEVICE_TYPE.BIG_IP | constants.DEVICE_TYPE.CONTAINER} type of the device
 */
async function getDeviceType(cached = true) {
    // check cached value first
    const deviceType = getHostDeviceInfo(HDC_KEYS.TYPE);
    if (cached && typeof deviceType !== 'undefined') {
        return deviceType;
    }

    let data = '';
    try {
        data = (await util.fs.readFile('/VERSION')).toString();
    } catch (readError) {
        logger.debugException('getDeviceType: Unable to read /VERSION to detect type of the device', readError);
    }

    return /product:\s+big-ip/i.test(data) ? constants.DEVICE_TYPE.BIG_IP : constants.DEVICE_TYPE.CONTAINER;
}

/**
 * Returns installed software version
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} host - host
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {object} software version info
 */
async function getDeviceVersion(host, options = {}) {
    const uri = '/mgmt/tm/sys/version';
    options.method = 'GET';
    options.includeResponseObject = false;

    const res = await makeDeviceRequest(host, uri, options);
    const entries = res.entries[Object.keys(res.entries)[0]].nestedStats.entries;

    const result = {};
    Object.entries(entries).forEach(([key, value]) => {
        result[key[0].toLowerCase() + key.slice(1)] = value.description;
    });

    return result;
}

/**
 * Checks `shell` availability
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} host - host
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {boolean} true if `shell` enabled
 */
async function isShellEnabled(host, options = {}) {
    const uri = '/mgmt/tm/sys/db/systemauth.disablebash';
    options.method = 'GET';
    options.includeResponseObject = false;

    const res = await makeDeviceRequest(host, uri, options);
    return typeof res === 'object' && res.value === 'false';
}

/**
 * Send request to the device
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} host - host
 * @param {string} uri - uri
 * @param {Connection} [options] - function options, similar to 'makeRequest'. Copy it before pass to function.
 * @param {Credentials} [options.credentials] - authorization data
 * @param {null | string} [options.credentials.token] - authorization token
 * @param {boolean} [otions.noAuthHeader] - do not include auth data into request headers
 * @param {boolean} [options.rawResponseBody] - return response as Buffer object with binary data
 *
 * @returns {any} response
 */
async function makeDeviceRequest(host, uri, options = {}) {
    assert.string(host, 'host');
    assert.string(uri, 'uri');
    assert.assert(typeof options === 'object' && options, 'options should be an object');

    options.headers = options.headers || {};
    const headers = options.headers;

    if (options.noAuthHeader !== true) {
        const credentials = options.credentials || {};
        if (credentials.token) {
            headers['x-f5-auth-token'] = credentials.token;
        } else {
            // try passwordless auth (for local access only)
            const username = credentials.username || constants.DEVICE_REST_API.USER;
            headers.Authorization = `Basic ${Buffer.from(`${username}:`).toString('base64')}`;
        }
    }

    if (typeof options.allowSelfSignedCert === 'undefined') {
        options.allowSelfSignedCert = !constants.STRICT_TLS_REQUIRED;
    }
    if (typeof options.port === 'undefined') {
        options.port = constants.DEVICE_REST_API.PORT;
    }
    if (typeof options.protocol === 'undefined') {
        options.protocol = constants.DEVICE_REST_API.PROTOCOL;
    }

    assert.bigip.connection(options, 'options');
    delete options.credentials;

    return requestsUtil.makeRequest(host, uri, options);
}

/**
 * Check if path exists on the device
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} path - path
 * @param {string} host - host
 * @param {object} [options] - function options, see 'makeDeviceRequest
 * @param {boolean} [options.splitLines = true] - split output into array
 *
 * @returns {string | string[]} array of file names
 */
async function pathExists(path, host, { splitLines = true } = {}) {
    const options = arguments[2] || {};
    delete options.splitLines;

    const res = await runTMUtilUnixCommand.call(this, 'ls', `"${path}"`, host, options);
    if (res.commandResult && res.commandResult.includes('ls:')) {
        throw new Error(`pathExists: ${res.commandResult}`);
    }

    res.commandResult = res.commandResult || '';
    if (options && splitLines) {
        res.commandResult = res.commandResult.split(/\r\n|\r|\n/).filter((s) => s);
    }
    return res.commandResult;
}

/**
 * Remove path on the device
 *
 * NOTE: mutates `options`
 *
 * @public
 *
 * @param {string} path - path to remove
 * @param {string} host - host
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {string} command's output
 */
async function removePath(path, host, options = {}) {
    const res = await runTMUtilUnixCommand.call(this, 'rm', `"${path}"`, host, options);
    if (res.commandResult) {
        throw new Error(`removePath: ${res.commandResult}`);
    }
}

/**
 * Request auth token
 *
 * NOTE: mutates `options`
 *
 * @private
 *
 * @param {string} host - host
 * @param {string} username - device username
 * @param {string} passphrase - device passphrase
 * @param {Connection} [options] - function options
 *
 * @returns {{ token: string }} auth token
 */
async function requestAuthToken(host, username, passphrase, options) {
    assert.string(username, 'username');
    assert.string(passphrase, 'passphrase');

    const uri = '/mgmt/shared/authn/login';
    addJsonHeader(options);
    options.method = 'POST';
    options.includeResponseObject = false;
    options.noAuthHeader = true;
    options.body = {
        username,
        password: passphrase,
        loginProviderName: 'tmos'
    };

    const data = await makeDeviceRequest(host, uri, options);
    return { token: data.token.token };
}

/**
 * Run Unix Command (ls/mv/rm) via REST API
 *
 * NOTE: mutates `options`
 *
 * @private
 *
 * @param {string} cmd - command to run (ls/mv/rm)
 * @param {string} args - arguments to pass to command
 * @param {string} host - host
 * @param {object} [options] - function options, see 'makeDeviceRequest'
 *
 * @returns {string | string[]} command's output
 */
async function runTMUtilUnixCommand(cmd, args, host, options) {
    const allowed = ['ls', 'rm', 'mv'];
    assert.oneOf(cmd, allowed, 'cmd');

    const uri = `/mgmt/tm/util/unix-${cmd}`;
    addJsonHeader(options);
    options.method = 'POST';
    options.includeResponseObject = false;
    options.body = {
        command: 'run',
        utilCmdArgs: args
    };

    return makeDeviceRequest(host, uri, options);
}

module.exports = {
    clearHostDeviceInfo,
    gatherHostDeviceInfo,
    getHostDeviceInfo,
    decryptAllSecrets,
    downloadFileFromDevice,
    encryptSecret,
    executeShellCommandOnDevice,
    getAuthToken,
    getDeviceInfo,
    getDeviceType,
    getDeviceVersion,
    isShellEnabled,
    makeDeviceRequest,
    pathExists,
    removePath
};
