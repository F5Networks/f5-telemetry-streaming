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

const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

const assert = require('./assert');
const { deepCopy } = require('./util');
const {
    mockHttpEndpoint,
    wrapMockNock,
    wrapMockNockSet
} = require('./httpMock');
const sourceCode = require('./sourceCode');

const { DEVICE_REST_API, LOCAL_HOST } = sourceCode('src/lib/constants');
const utilMisc = sourceCode('src/lib/utils/misc');

const ALLOWED_PROTOS = [
    'http',
    'https'
];
const MAX_PORT_NUMBER = 2 ** 16;
const CONTENT_RAGE_RE = /^(\d+)-(\d+)\/(\d+)$/;

class BigIpRestApiMock {
    /**
     * @param {string} [host = LOCAL_HOST] - host
     * @param {Connection} [connection]
     */
    constructor(host = LOCAL_HOST, {
        port = DEVICE_REST_API.PORT,
        protocol = DEVICE_REST_API.PROTOCOL
    } = {}) {
        assert.allOfAssertions(
            () => assert.isString(host),
            () => assert.isNotEmpty(host),
            'host should be a string'
        );
        assert.allOfAssertions(
            () => assert.isNumber(port),
            () => assert.isAbove(port, 0),
            () => assert.isBelow(port, MAX_PORT_NUMBER),
            `options.port should be a number > 0 and < ${MAX_PORT_NUMBER}`
        );
        assert.allOfAssertions(
            () => assert.isString(protocol),
            () => assert.isNotEmpty(protocol),
            () => assert.include(ALLOWED_PROTOS, protocol),
            `options.protocol should be a string and be one of allowed values: ${ALLOWED_PROTOS.join(',')}`
        );

        Object.defineProperties(this, {
            host: {
                value: host
            },
            port: {
                value: port
            },
            protocol: {
                value: protocol
            }
        });
        Object.defineProperties(this, {
            origin: {
                value: buildOrigin.call(this)
            }
        });

        this.authTokens = [];
        this.passwordLessUserAuthHeaders = [];
    }

    /**
     * @param {string} token
     */
    addAuthToken(token) {
        assert.allOfAssertions(
            () => assert.isString(token),
            () => assert.isNotEmpty(token),
            'token should be a string'
        );
        this.authTokens.push(token);
    }

    /**
     * @param {string} username
     */
    addPasswordlessUser(username) {
        assert.allOfAssertions(
            () => assert.isString(username),
            () => assert.isNotEmpty(username),
            'username should be a string'
        );
        this.allowPasswordLessAuth = true;

        const header = `Basic ${Buffer.from(`${username}:`).toString('base64')}`;
        assert.notInclude(this.passwordLessUserAuthHeaders, header, `basic auth for "${username}" exists already!`);
        this.passwordLessUserAuthHeaders.push(header);
    }

    /**
     * Mock an arbitrary endpoint
     *
     * @param {object} options
     *
     * @returns {MockNockStubBase} stub that has following signature
     *
     * function(uri: string, reqBody: any, req: object) {
     *     return [statusCode, response];
     * }
     */
    mockArbitraryEndpoint({
        authCheck = true,
        method = 'GET',
        optionally = false,
        path = undefined,
        replyTimes = 1,
        reqBody = undefined,
        response = undefined,
        responseSocketError = undefined,
        socketTimeout = 0
    } = {}) {
        assert.oneOfAssertions(
            () => assert.isFunction(response, 'response should be a function'),
            () => assert.allOfAssertions(
                () => assert.isObject(responseSocketError),
                () => assert.isNotEmpty(responseSocketError)
            ),
            'response of responseSocketError should be defined'
        );

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method,
                optionally,
                path,
                replyTimes,
                reqBody,
                response: response
                    ? async (uri, rbody, req) => {
                        if (authCheck === true && !checkAuthHeaders.call(this, req.headers)) {
                            return [401, 'Unauthorized'];
                        }
                        return ret.stub(uri, rbody, req);
                    }
                    : undefined,
                responseSocketError,
                socketTimeout
            }),
            stub: sinon.stub()
        });
        ret.stub.callsFake((uri, rbody, req) => response(uri, rbody, req));

        return ret;
    }

    /**
     * @param {string} username
     * @param {string} password
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(authData: {username: string, password: string}) {
     *     return [statusCode, { token: { token: 'token' } }, 'error message' || null];
     * }
     */
    mockAuth(username, password, { optionally = false, replyTimes = 1 } = {}) {
        const auth = { username, password };

        Object.entries(auth).forEach(([key, value]) => assert.oneOfAssertions(
            () => assert.instanceOf(value, RegExp),
            () => assert.allOfAssertions(
                () => assert.isString(value),
                () => assert.isNotEmpty(value)
            ),
            `${key} should be a RegExp or a string`
        ));

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                badHeaders: ['Authorization', 'x-f5-auth-token'],
                method: 'POST',
                optionally,
                path: '/mgmt/shared/authn/login',
                reqBody: Object.assign(auth, { loginProviderName: 'tmos' }),
                replyTimes,
                response: async (uri, reqBody) => {
                    const [code, data, errorMsg] = await ret.stub(reqBody);
                    if (data && data.token && data.token.token) {
                        this.addAuthToken(data.token.token);
                        ret.authTokens.push(data.token.token);
                    }
                    return [code, errorMsg || data];
                }
            }),
            authTokens: [],
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => [200, { token: { token: uuidv4() } }]);

        return ret;
    }

    /**
     * @param {RegExp | string} cmd
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {{
     *      createScript: MockNockStubBase,
     *      updateScript: MockNockStubBase,
     *      createTask: MockNockStubBase,
     *      executeTask: MockNockStubBase,
     *      pollTaskResult: MockNockStubBase,
     *      removeTaskResult: MockNockStubBase,
     *      removeTask: MockNockStubBase,
     *      removeScript: MockNockStubBase
     * }} stubs
     *
     * NOTE: See source code for function signatures
     */
    mockDACLI(cmd, { optionally = false, replyTimes = 1, scriptName = '' } = {}) {
        assert.oneOfAssertions(
            () => assert.instanceOf(cmd, RegExp),
            () => assert.allOfAssertions(
                () => assert.isString(cmd),
                () => assert.isNotEmpty(cmd)
            ),
            'cmd should be a RegExp or a string'
        );
        assert.oneOfAssertions(
            () => assert.instanceOf(scriptName, RegExp),
            () => assert.isString(scriptName),
            'scriptName should be a RegExp or a string'
        );

        /**
         * All mocks are optional because DACLI may fail on attempt to auth
         */
        const stubs = {};
        const scriptEndpointURI = '/mgmt/tm/cli/script';
        const taskEndpointURI = '/mgmt/tm/task/cli/script';
        const taskEndpointURISuffix = '/result';

        function checkScriptName(reqName) {
            if (!scriptName) {
                return true;
            }
            if (typeof scriptName === 'string') {
                return scriptName === reqName;
            }
            scriptName.lastIndex = 0;
            return scriptName.test(reqName);
        }

        function fetchScriptNameFromURI(uri) {
            if (uri.startsWith(scriptEndpointURI)) {
                return uri.slice(scriptEndpointURI.length + 1);
            }
            return '';
        }

        function fetchTaskIdFromURI(uri, hasSuffix) {
            if (uri.startsWith(taskEndpointURI)) {
                const taskId = uri.slice(taskEndpointURI.length + 1);
                return taskId.slice(
                    0,
                    taskId.length - (hasSuffix ? taskEndpointURISuffix.length : 0)
                );
            }
            return '';
        }

        // step #1 - create a new script
        stubs.createScript = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'POST',
                optionally,
                path: scriptEndpointURI,
                replyTimes,
                reqBody: (reqBody) => reqBody.name && reqBody.apiAnonymous && checkScriptName(reqBody.name),
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await stubs.createScript.stub(reqBody);
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub(),
            scripts: {}
        });
        stubs.createScript.stub.callsFake((script) => {
            stubs.createScript.scripts[script.name] = script;
            return [200, { code: 200 }];
        });

        // step #2 - update if the script exist
        stubs.updateScript = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'PUT',
                optionally,
                path: (uri) => !!stubs.createScript.scripts[fetchScriptNameFromURI(uri).replace(/~/g, '/')],
                replyTimes,
                reqBody: (reqBody) => !!stubs.createScript.scripts[reqBody.name] && reqBody.apiAnonymous,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await stubs.updateScript.stub(
                        fetchScriptNameFromURI(uri),
                        reqBody
                    );
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub()
        });
        stubs.updateScript.stub.callsFake(() => [200, {}]);

        // step #3 - create a new task
        stubs.createTask = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'POST',
                optionally,
                path: taskEndpointURI,
                replyTimes,
                reqBody: (reqBody) => {
                    let isMatch = (reqBody.command === 'run')
                        && !!stubs.createScript.scripts[reqBody.name];

                    if (typeof cmd === 'string') {
                        isMatch = isMatch && reqBody.utilCmdArgs === cmd;
                    } else {
                        cmd.lastIndex = 0;
                        isMatch = isMatch && cmd.test(reqBody.utilCmdArgs);
                    }
                    return isMatch;
                },
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await stubs.createTask.stub(uuidv4(), reqBody);
                    if (data && data._taskId) {
                        stubs.createTask.taskIds[data._taskId] = data._taskId;
                    }
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub(),
            taskIds: {}
        });
        stubs.createTask.stub.callsFake((_taskId) => [200, { _taskId }]);

        // step #4 - execute the task
        stubs.executeTask = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'PUT',
                optionally,
                path: (uri) => !!stubs.createTask.taskIds[fetchTaskIdFromURI(uri)],
                replyTimes,
                reqBody: {
                    _taskState: 'VALIDATING'
                },
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await stubs.executeTask.stub(
                        fetchTaskIdFromURI(uri),
                        reqBody
                    );
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub(),
            results: {}
        });
        stubs.executeTask.stub.callsFake((taskId) => {
            stubs.executeTask.results[taskId] = uuidv4();
            return [200, {}];
        });

        // step #5 - poll the task's results
        stubs.pollTaskResult = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'GET',
                optionally,
                path: (uri) => !!stubs.executeTask.results[fetchTaskIdFromURI(uri, true)],
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await stubs.pollTaskResult.stub(
                        fetchTaskIdFromURI(uri, true),
                        reqBody
                    );
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub()
        });
        stubs.pollTaskResult.stub.callsFake(() => [200, { _taskState: 'COMPLETED' }]);

        // step #6 - remove the task's results
        stubs.removeTaskResult = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'DELETE',
                optionally,
                path: (uri) => !!stubs.executeTask.results[fetchTaskIdFromURI(uri, true)],
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const taskID = fetchTaskIdFromURI(uri, true);
                    const [code, data, errorMsg] = await stubs.removeTaskResult.stub(taskID, reqBody);

                    delete stubs.executeTask.results[taskID];

                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub()
        });
        stubs.removeTaskResult.stub.callsFake(() => [200, '']);

        // step #7 - remove the task
        stubs.removeTask = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'DELETE',
                optionally,
                path: (uri) => !!stubs.createTask.taskIds[fetchTaskIdFromURI(uri)],
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const taskID = fetchTaskIdFromURI(uri);
                    const [code, data, errorMsg] = await stubs.removeTask.stub(taskID, reqBody);

                    delete stubs.createTask.taskIds[taskID];

                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub()
        });
        stubs.removeTask.stub.callsFake(() => [200, '']);

        // step #8 - remove the script
        stubs.removeScript = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'DELETE',
                optionally,
                path: (uri) => !!stubs.createScript.scripts[fetchScriptNameFromURI(uri).replace(/~/g, '/')],
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await stubs.removeScript.stub(
                        fetchScriptNameFromURI(uri),
                        reqBody
                    );
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub()
        });
        stubs.removeScript.stub.callsFake(() => [200, '']);

        wrapMockNockSet(stubs);
        return stubs;
    }

    /**
     * Mocks `decryptSecret`
     *
     * @returns {sinon.stub} stub that has following signature:
     *
     * function(...secrets) {
     *     return `decrypted_${secrets.join('')};
     * }
     */
    mockDecryptSecret() {
        const execFileStub = sinon.stub(utilMisc.childProcess, 'execFile');
        const decryptStub = sinon.stub();

        decryptStub.callsFake(async (...secrets) => `decrypted_${secrets.join('')}`);
        execFileStub.callsFake(async (...args) => {
            if (args.length > 1 && args[0].includes('php') && args[1][0].includes('decryptConfValue')) {
                return {
                    stderr: '',
                    stdout: await decryptStub(...args[1].slice(1))
                };
            }
            return execFileStub.wrappedMethod.apply(utilMisc.childProcess, args);
        });
        return decryptStub;
    }

    /**
     * @param {null | object | undefined} [deviceInfoData]
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function() {
     *     return [statusCode, { device: 'info' }, 'error message' || null];
     * }
     */
    mockDeviceInfo(deviceInfoData, { optionally = false, replyTimes = 1 } = {}) {
        deviceInfoData = deviceInfoData || {
            baseMac: generateMacAddress(),
            build: '0.0.0',
            chassisSerialNumber: uuidv4(),
            halUuid: uuidv4(),
            hostMac: generateMacAddress(),
            hostname: this.host,
            isClustered: false,
            isVirtual: true,
            machineId: uuidv4(),
            managementAddress: '192.168.1.10',
            mcpDeviceName: `/Common/${this.host}`,
            physicalMemory: 7168,
            platform: 'Z100',
            product: 'BIG-IP',
            trustDomainGuid: uuidv4(),
            version: '17.1.0',
            generation: 0,
            lastUpdateMicros: 0,
            kind: 'shared:resolver:device-groups:deviceinfostate',
            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
        };

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'GET',
                optionally,
                path: '/mgmt/shared/identified-devices/config/device-info',
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await ret.stub();
                    return [code, errorMsg || data];
                }
            }),
            deviceInfoData,
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => [200, deepCopy(ret.deviceInfoData)]);

        return ret;
    }

    /**
     * @param {string} [versionFileData] - version file data
     *
     * @returns {sinon.stub} stub that has following signature:
     *
     * function() {
     *     return Buffer.from('data');
     * }
     */
    mockDeviceType(versionFileData) {
        const readFileStub = utilMisc.fs.readFile;
        const innerStub = sinon.stub();

        versionFileData = versionFileData || [
            'Product: BIG-IP',
            `Version: ${['17', '1', '0', '3'].join('.')}`,
            'Build: 0.0.4',
            `Sequence: ${['17', '1', '0', '3'].join('.')}-0.4.0`,
            'BaseBuild: 0.0.4',
            'Edition: Point Release 3',
            'Date: Wed Aug 23 10:18:11 PDT 2023',
            'Built: 230823101811',
            'Changelist: 3713935',
            'JobID: 1437207'
        ].join('\n');

        innerStub.callsFake(async () => Buffer.from(versionFileData));
        readFileStub.callsFake(async (...args) => {
            if (args.length > 0 && args[0] === '/VERSION') {
                // write data to virtual FS
                utilMisc.fs.writeFileSync(args[0], await innerStub());
            }
            return readFileStub.wrappedMethod.apply(utilMisc.fs, args);
        });
        return innerStub;
    }

    /**
     * @param {null | object | undefined} [deviceVersionData]
     * @param {string} [deviceVersionData.build]
     * @param {string} [deviceVersionData.version]
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function() {
     *     return [statusCode, { device: 'version' }, 'error message' || null];
     * }
     */
    mockDeviceVersion(deviceVersionData, { optionally = false, replyTimes = 1 } = {}) {
        function assertVersionData(data) {
            Object.entries(data).forEach(([key, value]) => {
                assert.allOfAssertions(
                    () => assert.isString(value),
                    () => assert.isNotEmpty(value),
                    `${key} should be a string`
                );
            });
        }

        deviceVersionData = deviceVersionData || {
            build: '0.0.4',
            version: ['17', '1', '0', '3'].join('.')
        };
        assertVersionData(deviceVersionData);

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'GET',
                optionally,
                path: '/mgmt/tm/sys/version',
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await ret.stub();
                    return [code, errorMsg || data];
                }
            }),
            makeResponse(data) {
                assertVersionData(data);
                return {
                    kind: 'tm:sys:version:versionstats',
                    selfLink: 'https://localhost/mgmt/tm/sys/version?ver=17.1.0',
                    entries: {
                        'https://localhost/mgmt/tm/sys/version/0': {
                            nestedStats: {
                                entries: {
                                    Build: {
                                        description: data.build
                                    },
                                    Date: {
                                        description: 'Wed Aug 23 10:18:11 PDT 2023'
                                    },
                                    Edition: {
                                        description: 'Point Release 3'
                                    },
                                    Product: {
                                        description: 'BIG-IP'
                                    },
                                    Title: {
                                        description: 'Main Package'
                                    },
                                    Version: {
                                        description: data.version
                                    }
                                }
                            }
                        }
                    }
                };
            },
            deviceVersionData,
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => [200, ret.makeResponse(deepCopy(ret.deviceVersionData))]);

        return ret;
    }

    /**
     * @param {RegExp | string} fileUri
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(uri: string, range: {start: number, end: number, size: number}) {
     *     return [statusCode, buffer, range, 'error message' || null];
     * }
     */
    mockDownloadFileFromDevice(fileUri, { optionally = false, replyTimes = 1 } = {}) {
        assert.oneOfAssertions(
            () => assert.instanceOf(fileUri, RegExp),
            () => assert.allOfAssertions(
                () => assert.isString(fileUri),
                () => assert.isNotEmpty(fileUri)
            ),
            'uri should be a RegExp or a string'
        );

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'GET',
                optionally,
                path: fileUri,
                replyTimes,
                reqHeaders: {
                    'Content-Range': /\d+-\d+\/\d+/,
                    'Content-Type': 'application/octet-stream'
                },
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }

                    const crane = req.headers['content-range'].match(CONTENT_RAGE_RE);
                    const range = {
                        start: parseInt(crane[1], 10),
                        end: parseInt(crane[2], 10),
                        size: parseInt(crane[3], 10)
                    };

                    const [code, data, responseRange, errorMsg] = await ret.stub(uri, range);
                    return [
                        code,
                        errorMsg || data,
                        errorMsg
                            ? {}
                            : {
                                'Content-Range': `${responseRange.start}-${responseRange.end}/${responseRange.size}`,
                                'Content-Type': 'application/octet-stream'
                            }
                    ];
                }
            }),
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => {
            const data = Buffer.from('test');
            return [200, data, { start: 0, end: data.length - 1, size: data.length }];
        });

        return ret;
    }

    /**
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {{
     *      delete: MockNockStubBase,
     *      encrypt: MockNockStubBase,
     * }} stubs
     */
    mockEncryptSecret({ optionally = false, replyTimes = 1 } = {}) {
        const radiusURI = '/mgmt/tm/ltm/auth/radius-server';

        function fetchRadiustNameFromURI(uri) {
            if (uri.startsWith(radiusURI)) {
                return uri.slice(radiusURI.length + 1);
            }
            return '';
        }

        const stubs = {};
        stubs.encrypt = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'POST',
                optionally,
                path: radiusURI,
                replyTimes,
                reqBody: (reqBody) => /telemetry_delete_me/.test(reqBody.name) && reqBody.server === 'foo' && reqBody.secret,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }

                    const [code, data, errorMsg] = await stubs.encrypt.stub(reqBody);
                    stubs.encrypt.secrets[reqBody.name] = reqBody;

                    return [code, errorMsg || data];
                }
            }),
            secrets: {},
            stub: sinon.stub()
        });
        stubs.encrypt.stub.callsFake((reqBody) => [200, {
            server: reqBody.server,
            secret: `$M$${Buffer.from(reqBody.secret).toString('base64')}`
        }]);

        stubs.delete = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'DELETE',
                optionally,
                path: (uri) => !!stubs.encrypt.secrets[fetchRadiustNameFromURI(uri)],
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }

                    const radiusName = fetchRadiustNameFromURI(uri);
                    const [code, data, errorMsg] = await stubs.delete.stub(
                        radiusName,
                        stubs.encrypt.secrets[radiusName]
                    );

                    delete stubs.encrypt.secrets[radiusName];
                    return [code, errorMsg || data];
                }
            }),
            stub: sinon.stub()
        });
        stubs.delete.stub.callsFake(() => [200, '']);

        wrapMockNockSet(stubs);
        return stubs;
    }

    /**
     * @param {RegExp | string} cmd
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(cmdArgs: string) {
     *     return [statusCode, 'command result', 'error message' || null];
     * }
     */
    mockExecuteShellCommandOnDevice(cmd, { optionally = false, replyTimes = 1 } = {}) {
        assert.oneOfAssertions(
            () => assert.instanceOf(cmd, RegExp),
            () => assert.allOfAssertions(
                () => assert.isString(cmd),
                () => assert.isNotEmpty(cmd)
            ),
            'cmd should be a RegExp or a string'
        );

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'POST',
                optionally,
                path: '/mgmt/tm/util/bash',
                replyTimes,
                reqBody: (reqBody) => {
                    let isMatch = false;
                    if (reqBody.command === 'run') {
                        if (typeof cmd === 'string') {
                            isMatch = reqBody.utilCmdArgs === `-c "${cmd}"`;
                        } else {
                            cmd.lastIndex = 0;
                            isMatch = cmd.test(reqBody.utilCmdArgs);
                        }
                    }
                    return isMatch;
                },
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }

                    const [code, commandResult, errorMsg] = await ret.stub(reqBody.utilCmdArgs);
                    return [code, errorMsg || { commandResult }];
                }
            }),
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => [200, cmd]);

        return ret;
    }

    /**
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function() {
     *     return [statusCode, { value: 'false' }, 'error message' || null];
     * }
     */
    mockIsShellEnabled(enabled, { optionally = false, replyTimes = 1 } = {}) {
        assert.isBoolean(enabled, 'enabled should be a boolean');

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.origin, {
                method: 'GET',
                optionally,
                path: '/mgmt/tm/sys/db/systemauth.disablebash',
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!checkAuthHeaders.call(this, req.headers)) {
                        return [401, 'Unauthorized'];
                    }
                    const [code, data, errorMsg] = await ret.stub(reqBody);
                    return [code, errorMsg || data];
                }
            }),
            shellEnabled: enabled,
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => [200, { value: `${!ret.shellEnabled}` }]);

        return ret;
    }

    /**
     * @param {RegExp | string} pathToCheck
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(filePath: string) {
     *     return [statusCode, 'command result', 'error message' || null];
     * }
     */
    mockPathExists(pathToCheck, options) {
        return mockTMUtilUnixCommand.call(this, 'ls', pathToCheck, options);
    }

    /**
     * @param {RegExp | string} pathToRemove
     * @param {object} [options]
     * @param {boolean} [options.optionally = false]
     * @param {number} [options.replyTimes = 1]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(filePath: string) {
     *     return [statusCode, 'command result', 'error message' || null];
     * }
     */
    mockRemovePath(pathToRemove, options) {
        return mockTMUtilUnixCommand.call(this, 'rm', pathToRemove, options);
    }
}

/**
 * @private
 *
 * Build origin part of URI
 *
 * @this {BigIpRestApiMock}
 *
 * @returns {string}
 */
function buildOrigin() {
    return `${this.protocol}://${this.host}:${this.port}`;
}

/**
 * @private
 *
 * @param {object} headers - request headers
 *
 * @returns {true} if check passed
 */
function checkAuthHeaders(headers) {
    let authPassed = false;

    if (!authPassed && headers.authorization && this.allowPasswordLessAuth) {
        authPassed = this.passwordLessUserAuthHeaders.includes(headers.authorization);
    }
    if (!authPassed && headers['x-f5-auth-token']) {
        authPassed = this.authTokens.includes(headers['x-f5-auth-token']);
    }
    return authPassed;
}

/** @returns {string} random MAC address */
function generateMacAddress() {
    return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16)));
}

/**
 * @private
 *
 * @param {string} unixCmd
 * @param {RegExp | string} cmdArgs
 * @param {object} [options]
 * @param {boolean} [options.optionally = false]
 * @param {number} [options.replyTimes = 1]
 *
 * @returns {MockNockStubBase} stub that has following signature:
 *
 * function(filePath: string) {
 *     return [statusCode, 'command result', 'error message' || null];
 * }
 */
function mockTMUtilUnixCommand(unixCmd, cmdArgs, { optionally = false, replyTimes = 1 } = {}) {
    const allowed = ['ls', 'rm', 'mv'];
    assert(allowed.includes(unixCmd), `cmd should be one from ${allowed}`);

    assert.oneOfAssertions(
        () => assert.instanceOf(cmdArgs, RegExp),
        () => assert.allOfAssertions(
            () => assert.isString(cmdArgs),
            () => assert.isNotEmpty(cmdArgs)
        ),
        'cmdArgs should be a RegExp or a string'
    );

    // TODO: update it to work with `mv` command
    const cleanupPath = (fpathArg) => fpathArg.slice(
        fpathArg[0] === '"' ? 1 : 0,
        fpathArg[fpathArg.length - 1] === '"' ? (fpathArg.length - 1) : fpathArg.length
    );

    const ret = wrapMockNock({
        ...mockHttpEndpoint(this.origin, {
            method: 'POST',
            optionally,
            path: `/mgmt/tm/util/unix-${unixCmd}`,
            replyTimes,
            reqBody: (reqBody) => {
                let isMatch = false;
                if (reqBody.command === 'run') {
                    const fpathArg = cleanupPath(reqBody.utilCmdArgs);
                    if (typeof cmdArgs === 'string') {
                        isMatch = fpathArg === cmdArgs;
                    } else {
                        cmdArgs.lastIndex = 0;
                        isMatch = cmdArgs.test(fpathArg);
                    }
                }
                return isMatch;
            },
            response: async (uri, reqBody, req) => {
                if (!checkAuthHeaders.call(this, req.headers)) {
                    return [401, 'Unauthorized'];
                }

                const [code, commandResult, errorMsg] = await ret.stub(cleanupPath(reqBody.utilCmdArgs));
                return [code, errorMsg || { commandResult }];
            }
        }),
        stub: sinon.stub()
    });
    ret.stub.callsFake(() => [200, '']);

    return ret;
}

module.exports = BigIpRestApiMock;

/**
 * @typedef {object} Connection
 * @property {number} [port = DEVICE_REST_API.PORT]
 * @property {string} [protocol = DEVICE_REST_API.PROTOCOL]
 */
/**
 * @typedef {object} MockNockStubBase
 * @property {nock.Interceptor} interceptor - request interceptor
 * @property {nock.Scope} scope - request scope
 * @property {sinon.stub} stub - stub function to call on request match
 * @property {function} disable - make optional
 * @property {function} remove - remove from HTTP trap
 */
