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

/* eslint-disable no-constant-condition */

const assert = require('./assert');
const constants = require('../constants');
const deviceUtil = require('./device');
const miscUtil = require('./misc');

/**
 * @module utils/dacli
 *
 * @typedef {import('./config').Connection} Connection
 * @typedef {import('./config').Credentials} Credentials
 */

const DACLI_RETRY_DELAY = 3000;
const DACLI_SCRIPT_URI = '/mgmt/tm/cli/script';
const DACLI_SCRIPT_STDERR = '/dev/null';
const DACLI_TASK_SCRIPT_URI = '/mgmt/tm/task/cli/script';
const DACLI_SCRIPT_NAME = 'telemetry_delete_me__async_cli_cmd_script_runner';
const DACLI_SCRIPT_CODE = 'proc script::run {} {\n    set cmd [lreplace $tmsh::argv 0 0]; eval "exec $cmd 2> stderrfile"\n}';

/**
 * F5 Device async CLI command execution via REST API.
 *
 * @property {Connection} connection - connection options
 * @property {Credentials} credentials - auth options
 * @property {string} host - host
 * @property {Script} script - Script object to execute on the host
 */
class DeviceAsyncCLI {
    /**
     * @param {string} [host = constants.LOCAL_HOST] - host
     * @param {object} [options] - options
     * @param {Connection} [options.connection] - connection options
     * @param {Credentials} [options.credentials] - auth options
     * @param {null | string} [options.credentials.token] - authorization token
     * @param {string} [options.folder = ''] - TMOS folder
     * @param {string} [options.outputFile = DACLI_SCRIPT_STDERR] - path to file for stderr output
     * @param {string} [options.partition = ''] - TMOS partition
     * @param {string} [options.scriptName = DACLI_SCRIPT_NAME] - script name
     */
    constructor() {
        const host = (typeof arguments[0] === 'string' ? arguments[0] : undefined) || constants.LOCAL_HOST;
        const options = (typeof arguments[0] === 'object' ? arguments[0] : arguments[1]) || {};

        assert.oneOfAssertions(
            () => assert.oneOfAssertions(
                () => assert.not.exist(options.folder),
                () => assert.empty(options.folder, 'folder')
            ),
            () => assert.allOfAssertions(
                () => assert.string(options.partition, 'partition'),
                () => assert.string(options.folder, 'folder')
            ),
            'folder requires a partition to be defined'
        );
        assert.bigip.credentials(host, options.credentials, 'credentials');

        if (options.connection) {
            assert.bigip.connection(options.connection, 'connection');
        }

        // TODO: does '/' need to be escaped/replaced?
        const fullScriptName = [options.partition || '', options.folder || '', options.scriptName || DACLI_SCRIPT_NAME]
            .filter((s) => s.length > 0);

        if (fullScriptName.length > 1) {
            // nneds to add leading separator later
            fullScriptName.splice(0, 0, '');
        }

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            connection: {
                value: miscUtil.deepFreeze(miscUtil.deepCopy(options.connection || {}))
            },
            credentials: {
                value: miscUtil.deepCopy(options.credentials || {})
            },
            host: {
                value: host
            },
            script: {
                value: miscUtil.deepFreeze({
                    code: DACLI_SCRIPT_CODE.replace('stderrfile', options.outputFile || DACLI_SCRIPT_STDERR),
                    tmosName: fullScriptName.join('/'),
                    uriName: fullScriptName.join('~')
                })
            }
        });
    }

    /**
     * @param {string} cmd - command to execute on the device
     * @param {number} [retryDelay = DACLI_RETRY_DELAY] - task results polling delay
     *
     * @returns {void} once command execution completed
     * @throws {Error} when failed to execute command
     */
    async execute(cmd, retryDelay = DACLI_RETRY_DELAY) {
        assert.string(cmd, 'cmd');
        assert.safeNumberGrEq(retryDelay, 0, 'retryDelay');

        const errors = [];
        let taskID = null;

        await auth.call(this);

        try {
            await upsertTemporaryCLIscriptOnDevice.call(this, this.script);
            taskID = await createTaskOnDevice.call(this, this.script, cmd);
            await execTaskOnDevice.call(this, taskID);
            await waitForAsyncTaskToFinishOnDevice.call(this, taskID, retryDelay);
        } catch (err) {
            errors.push(err);
        }

        if (taskID !== null) {
            try {
                await removeTaskResultsFromDevice.call(this, taskID);
            } catch (err) {
                // ignore
            }
            try {
                await removeTaskFromDevice.call(this, taskID);
            } catch (err) {
                // ignore
            }
        }

        try {
            await removeTemporaryCLIscriptFromDevice.call(this, this.script);
        } catch (err) {
            // ignore
        }

        if (errors.length > 0) {
            errors[0].message = `DeviceAsyncCLI.execute: ${errors[0].message || errors[0]}`;
            errors[0].errors = errors;
            throw errors[0];
        }
    }
}

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
    return options;
}

/**
 * @this {DeviceAsyncCLI}
 *
 * @returns {void} once token successfully obtained
 */
async function auth() {
    if (this.credentials.token) {
        return;
    }
    // in case of optimization, replace with Object.assign
    const options = miscUtil.deepCopy(this.connection);
    const token = await deviceUtil.getAuthToken(
        this.host,
        this.credentials.username,
        this.credentials.passphrase,
        options
    );
    this.credentials.token = token.token;
    miscUtil.deepFreeze(this.credentials);
}

/**
 * Create a new task via REST API to execute the command via script
 *
 * @this {DeviceAsyncCLI}
 *
 * @param {Script} script - script object
 * @param {string} cmd - command to execute on the device
 *
 * @returns {string} the task ID
 * @throws {Error} when unable to create the task on the device
 */
async function createTaskOnDevice(script, cmd) {
    const [body] = await request.call(this, DACLI_TASK_SCRIPT_URI, addJsonHeader({
        method: 'POST',
        body: {
            command: 'run',
            name: script.tmosName,
            utilCmdArgs: cmd
        }
    }));
    if (typeof body === 'object' && typeof body._taskId !== 'undefined') {
        return body._taskId;
    }
    throw new Error(`Failed to create a new task on the device: ${JSON.stringify(body)}`);
}

/**
 * @this {DeviceAsyncCLI}
 *
 * @param {Script} script - script object
 *
 * @returns {boolean} 'true' (when the script was created) or
 *                    'false' (when the script creation was failed)
 */
async function createTemporaryCLIscriptOnDevice(script) {
    const [body, res] = await request.call(this, DACLI_SCRIPT_URI, addJsonHeader({
        method: 'POST',
        body: {
            name: script.tmosName,
            apiAnonymous: script.code
        }
    }));

    const failCodes = [404, 409];
    return !((typeof body === 'object' && failCodes.includes(body.code)) || failCodes.includes(res.statusCode));
}

/**
 * @this {DeviceAsyncCLI}
 *
 * @param {string} taskID - task ID to execute
 *
 * @returns {boolean} 'true' when task was executed
 * @throws {Error} when unable to execute the task on the device
 */
async function execTaskOnDevice(taskID) {
    const [body] = await request.call(this, `${DACLI_TASK_SCRIPT_URI}/${taskID}`, addJsonHeader({
        method: 'PUT',
        body: {
            _taskState: 'VALIDATING'
        }
    }));
    if (typeof body === 'object') {
        return true;
    }
    throw new Error(`Failed to execute the task on the device: ${JSON.stringify(body)}`);
}

/**
 * @this {DeviceAsyncCLI}
 *
 * @param {string} taskID - task ID to remove the task
 *
 * @returns {void} once the task was removed
 */
async function removeTaskFromDevice(taskID) {
    await request.call(this, `${DACLI_TASK_SCRIPT_URI}/${taskID}`, { method: 'DELETE' });
}

/**
 * @this {DeviceAsyncCLI}
 *
 * @param {string} taskID - task ID to remove the task's result
 *
 * @returns {void} once the task's result was removed
 */
async function removeTaskResultsFromDevice(taskID) {
    await request.call(this, `${DACLI_TASK_SCRIPT_URI}/${taskID}/result`, { method: 'DELETE' });
}

/**
 * @this {DeviceAsyncCLI}
 *
 * @param {Script} script - script object
 *
 * @returns {void} once the script was deleted
 */
async function removeTemporaryCLIscriptFromDevice(script) {
    await request.call(this, `${DACLI_SCRIPT_URI}/${script.uriName}`, { method: 'DELETE' });
}

/**
 * Send request to the device
 *
 * @this {DeviceAsyncCLI}
 *
 * @param {string} uri - URI to send request to
 * @param {object} options - optional params for request
 * @param {string} options.method - HTTP method
 * @param {object} [options.body] - data to send
 *
 * @returns {any} response
 */
async function request(uri, options) {
    Object.assign(options, miscUtil.deepCopy(this.connection));

    options.credentials = {
        username: this.credentials.username,
        token: this.credentials.token
    };
    options.continueOnErrorCode = true;
    options.includeResponseObject = true;

    return deviceUtil.makeDeviceRequest(this.host, uri, options);
}

/**
 * Update the TMOS script object on the device
 *
 * @this {DeviceAsyncCLI}
 *
 * @param {Script} script - script object
 *
 * @returns {void} once the script was updated
 */
async function updateTemporaryCLIscriptOnDevice(script) {
    const [body, res] = await request.call(this, `${DACLI_SCRIPT_URI}/${script.uriName}`, addJsonHeader({
        method: 'PUT',
        body: {
            name: script.tmosName,
            apiAnonymous: script.code
        }
    }));
    if (res.statusCode !== 200) {
        throw new Error(`Failed to update the CLI script on device: ${JSON.stringify(body)}`);
    }
}

/**
 * Configure temporary TMOS script object on the device
 *
 * @this {DeviceAsyncCLI}
 *
 * @param {Script} script - script object
 *
 * @returns {void} once the script was configured on the device
 */
async function upsertTemporaryCLIscriptOnDevice(script) {
    if (!(await createTemporaryCLIscriptOnDevice.call(this, script))) {
        await updateTemporaryCLIscriptOnDevice.call(this, script);
    }
}

/**
 * Wait for completion of async task via REST API
 *
 * @this {DeviceAsyncCLI}
 *
 * @param {string} taskID - task ID to poll the task's status
 * @param {integer} retryDelay - delay before attempt status check again
 *
 * @returns {object} the task's result data once the task was completed
 * @throws {Error} when exeution failed
 */
async function waitForAsyncTaskToFinishOnDevice(taskID, retryDelay) {
    while (true) {
        const [body] = await request.call(this, `${DACLI_TASK_SCRIPT_URI}/${taskID}/result`, { method: 'GET' });
        if (typeof body === 'object' && body._taskState) {
            if (body._taskState === 'FAILED') {
                throw new Error(`Task failed unexpectedly: ${JSON.stringify(body)}`);
            } else if (body._taskState === 'COMPLETED') {
                return body;
            }
        }
        await miscUtil.sleep(retryDelay);
    }
}

/**
 * Execute command using Device Async CLI
 *
 * @param {string} cmd
 * @param {number} [retryDelay = DACLI_RETRY_DELAY] - task results polling delay
 * @param {string} [host = constants.LOCAL_HOST] - host
 * @param {object} [options = {}] - options
 * @param {Connection} [options.connection = {}] - connection options
 * @param {Credentials} [options.credentials = {}] - auth options
 * @param {string} [options.folder = ''] - TMOS folder
 * @param {string} [options.outputFile = DACLI_SCRIPT_STDERR] - path to file for stderr output
 * @param {string} [options.partition = ''] - TMOS partition
 * @param {string} [options.scriptName = DACLI_SCRIPT_NAME] - script name
 *
 * @returns {void} once command execution completed
 */
module.exports = async function execute(cmd, ...constructorOpts) {
    let retryDelay;
    if (typeof constructorOpts[0] !== 'string' && typeof constructorOpts[0] !== 'object') {
        retryDelay = constructorOpts[0];
        constructorOpts = constructorOpts.slice(1);
    }
    await (new DeviceAsyncCLI(...constructorOpts)).execute(cmd, retryDelay);
};

/**
 * @typedef {object} Script
 * @property {string} code - the script's code
 * @property {string} tmosName - the script's TMOS name (/Common/folder/name or /Common/name or name)
 * @property {string} uriName - the script's REST API name (~Common~folder~name or ~Common~name or name)
 */
