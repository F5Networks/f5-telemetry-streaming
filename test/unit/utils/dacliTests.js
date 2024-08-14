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

/* eslint-disable import/order, no-restricted-syntax */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const bigipConnTests = require('../shared/tests/bigipConn');
const bigipCredsTest = require('../shared/tests/bigipCreds');
const BigIpApiMock = require('../shared/bigipAPIMock');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const dacli = sourceCode('src/lib/utils/dacli');

moduleCache.remember();

describe('Device Async CLI', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks();
        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('invalid arguments', async () => {
            let errMsg = /cmd should be a (string|non-empty)/;
            await assert.isRejected(dacli(), errMsg);
            await assert.isRejected(dacli(undefined), errMsg);
            await assert.isRejected(dacli(''), errMsg);

            const cmd = 'echo';
            errMsg = /retryDelay should be a safe number/;
            await assert.isRejected(dacli(cmd, false), errMsg);
            await assert.isRejected(dacli(cmd, Infinity), errMsg);
            await assert.isRejected(dacli(cmd, Number.MAX_VALUE), errMsg);

            errMsg = /folder requires a partition to be defined/;
            await assert.isRejected(dacli(cmd, { folder: 'test' }), errMsg);

            const hosts = [
                'localhost',
                'remotehost'
            ];
            for (const host of hosts) {
                const credsTests = bigipCredsTest(host);
                for (const testData of credsTests) {
                    await assert.isRejected(dacli(cmd, host, { credentials: testData.value }), testData.error);
                }

                const connTests = bigipConnTests();
                for (const testData of connTests) {
                    await assert.isRejected(dacli(cmd, host, {
                        connection: testData.value,
                        credentials: { token: 'token' }
                    }), testData.error);
                }
            }
        });
    });

    const defaultUser = 'admin';
    const localhost = 'localhost';
    const remotehost = 'remotehost';

    const combinations = testUtil.product(
        // host config
        [
            {
                name: localhost,
                value: localhost
            },
            {
                name: remotehost,
                value: remotehost
            }
        ],
        // credentials config
        testUtil.smokeTests.filter([
            {
                name: 'default',
                value: undefined
            },
            {
                name: 'admin with passphrase',
                value: { username: defaultUser, passphrase: 'test_passphrase_1' }
            },
            testUtil.smokeTests.ignore({
                name: 'non-default user',
                value: { username: 'test_user_1', passphrase: 'test_passphrase_2' }
            }),
            testUtil.smokeTests.ignore({
                name: 'non-default passwordless user',
                value: { username: 'test_user_1' }
            }),
            {
                name: 'existing token',
                value: { token: 'auto' }
            }
        ]),
        // connection config
        testUtil.smokeTests.filter([
            {
                name: 'default',
                value: undefined
            },
            {
                name: 'non default',
                value: { port: 8105, protocol: 'https' }
            }
        ])
    );

    combinations.forEach(([hostConf, credentialsConf, connectionConf]) => {
        if (hostConf.value === remotehost && credentialsConf.value && !credentialsConf.value.passphrase) {
            // password-less user does not work with remote host
            return;
        }

        describe(`host = ${hostConf.name}, user = ${credentialsConf.name}, connection = ${connectionConf.name}`, () => {
            const command = 'echo test';
            let bigip;
            let connection;
            let credentials;
            let dacliStub;
            let host;

            function makeRequestOptions(options = {}) {
                return Object.assign(options, { connection, credentials });
            }

            beforeEach(() => {
                connection = connectionConf.value;
                credentials = credentialsConf.value;
                host = hostConf.value;

                bigip = new BigIpApiMock(host, {
                    port: (connection && connection.port) || undefined,
                    protocol: (connection && connection.protocol) || undefined
                });

                if (credentials && credentials.token) {
                    bigip.addAuthToken(credentials.token);
                } else if (host === remotehost && credentials) {
                    assert.allOfAssertions(
                        () => assert.isDefined(credentials.username, 'username should be defined for remote host'),
                        () => assert.isDefined(credentials.passphrase, 'passphrase should be defined for remote host')
                    );
                    bigip.mockAuth(credentials.username, credentials.passphrase);
                } else if (host === localhost) {
                    bigip.addPasswordlessUser(
                        (credentials && credentials.username)
                            ? credentials.username
                            : defaultUser
                    );
                }

                dacliStub = bigip.mockDACLI(command, { optionally: false });
                dacliStub.updateScript.interceptor.optionally(true);
            });

            function checkAllStubs({
                folder = '',
                outputFile = '/dev/null',
                partition = '',
                scriptCode = 'proc script::run {} {\n    set cmd [lreplace $tmsh::argv 0 0]; eval "exec $cmd 2> stderrfile"\n}',
                scriptName = 'telemetry_delete_me__async_cli_cmd_script_runner',
                skipStubs = []
            } = {}) {
                scriptCode = scriptCode.replace('stderrfile', outputFile);

                const fullScriptName = [partition, folder, scriptName].filter((s) => s.length);
                if (fullScriptName.length > 1) {
                    fullScriptName.splice(0, 0, '');
                }

                const tmosName = fullScriptName.join('/');
                const uriName = fullScriptName.join('~');

                let stubKey = 'createScript';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    assert.isDefined(dacliStub[stubKey].scripts[tmosName]);
                    assert.deepStrictEqual(dacliStub[stubKey].scripts[tmosName], {
                        name: tmosName,
                        apiAnonymous: scriptCode
                    });
                }

                stubKey = 'updateScript';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    const args = dacliStub[stubKey].stub.args[0];
                    assert.deepStrictEqual(args, [
                        uriName, {
                            name: tmosName,
                            apiAnonymous: scriptCode
                        }
                    ]);
                }

                stubKey = 'createTask';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    const args = dacliStub[stubKey].stub.args[0];
                    assert.deepStrictEqual(args[1], {
                        command: 'run',
                        name: tmosName,
                        utilCmdArgs: command
                    });
                }

                stubKey = 'executeTask';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                }

                stubKey = 'pollTaskResult';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    const args = dacliStub[stubKey].stub.args[0];
                    assert.deepStrictEqual(args[1], '');
                }

                stubKey = 'removeTaskResult';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    const args = dacliStub[stubKey].stub.args[0];
                    assert.deepStrictEqual(args[1], '');
                }

                stubKey = 'removeTask';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    const args = dacliStub[stubKey].stub.args[0];
                    assert.deepStrictEqual(args[1], '');
                }

                stubKey = 'removeScript';
                if (!skipStubs.includes(stubKey)) {
                    assert.deepStrictEqual(dacliStub[stubKey].stub.callCount, 1);
                    const args = dacliStub[stubKey].stub.args[0];
                    assert.deepStrictEqual(args, [uriName, '']);
                }
            }

            if (hostConf.value === remotehost && typeof credentialsConf.value === 'undefined') {
                it('should fail when no username and passphrase were passed to the function', async () => {
                    dacliStub.disable();
                    await assert.isRejected(dacli(command, host, makeRequestOptions()), /credentials should be an object/);
                });
                return;
            }

            const scriptCombinations = testUtil.product(
                // script name config
                testUtil.smokeTests.filter([
                    { name: 'default', value: undefined },
                    testUtil.smokeTests.ignore({ name: 'custom', value: 'myscript' })
                ]),
                // output file config
                testUtil.smokeTests.filter([
                    { name: 'default', value: undefined },
                    testUtil.smokeTests.ignore({ name: 'custom relative path', value: 'myoutput' }),
                    testUtil.smokeTests.ignore({ name: 'custom absolute path', value: '/a/b/myoutput' })
                ]),
                // paritition config
                testUtil.smokeTests.filter([
                    { name: 'default', value: undefined },
                    testUtil.smokeTests.ignore({ name: 'custom', value: 'Tenant' }),
                    testUtil.smokeTests.ignore({ name: 'Common', value: 'Common' })
                ]),
                // folder config
                testUtil.smokeTests.filter([
                    { name: 'default', value: undefined },
                    testUtil.smokeTests.ignore({ name: 'custom', value: 'SubFolder' })
                ])
            );

            scriptCombinations.forEach(([scriptConf, outputConf, partitionConf, folderConf]) => {
                if (!(scriptConf && outputConf && partitionConf && folderConf)) {
                    return;
                }
                if (typeof partitionConf.value === 'undefined' && typeof folderConf.value !== 'undefined') {
                    return;
                }

                describe(`script config: script = ${scriptConf.name} output = ${outputConf.name} partition = ${partitionConf.name} folder = ${folderConf.name}`, () => {
                    it('should execute command (no script update)', async () => {
                        await dacli(command, host, makeRequestOptions({
                            folder: folderConf.value,
                            outputFile: outputConf.value,
                            partition: partitionConf.value,
                            scriptName: scriptConf.value
                        }));

                        checkAllStubs({
                            folder: folderConf.value,
                            outputFile: outputConf.value,
                            partition: partitionConf.value,
                            scriptName: scriptConf.value,
                            skipStubs: ['updateScript']
                        });
                    });

                    it('should update existing script', async () => {
                        dacliStub.updateScript.interceptor.optionally(false);
                        dacliStub.createScript.stub.callsFake((script) => {
                            dacliStub.createScript.scripts[script.name] = script;
                            return [404, ''];
                        });

                        await dacli(command, host, makeRequestOptions({
                            folder: folderConf.value,
                            outputFile: outputConf.value,
                            partition: partitionConf.value,
                            scriptName: scriptConf.value
                        }));

                        checkAllStubs({
                            folder: folderConf.value,
                            outputFile: outputConf.value,
                            partition: partitionConf.value,
                            scriptName: scriptConf.value
                        });
                    });
                });
            });

            testUtil.smokeTests.filter([
                testUtil.smokeTests.ignore('socketError'),
                'httpError'
            ]).forEach((errorType) => {
                if (!errorType) {
                    return;
                }
                it(`should not throw error when clenup methods failed (${errorType})`, async () => {
                    const stubs = [
                        'removeScript',
                        'removeTask',
                        'removeTaskResult'
                    ];

                    if (errorType === 'socketError') {
                        stubs.forEach((key) => {
                            dacliStub[key].remove();
                            dacliStub[key].interceptor.replyWithError({ code: 500, message: errorType });
                        });
                    } else {
                        stubs.forEach((key) => {
                            dacliStub[key].stub.callsFake(() => [400, '']);
                        });
                    }

                    await dacli(command, host, makeRequestOptions());

                    if (errorType === 'socketError') {
                        checkAllStubs({ skipStubs: ['updateScript', ...stubs] });
                        stubs.forEach((key) => {
                            assert.deepStrictEqual(dacliStub[key].stub.callCount, 0);
                        });
                    } else {
                        checkAllStubs({ skipStubs: ['updateScript'] });
                    }
                });
            });

            testUtil.smokeTests.filter([
                { name: 'status code only', value: [404, ''] },
                testUtil.smokeTests.ignore({ name: 'body code only', value: [200, { code: 404 }] }),
                testUtil.smokeTests.ignore({ name: 'status code and body', value: [404, { anotherCode: 404 }] }),
                testUtil.smokeTests.ignore({ name: 'status code and body code', value: [404, { code: 409 }] })
            ]).forEach((updateScriptConf) => {
                if (!updateScriptConf) {
                    return;
                }

                it(`should update existing script, ${updateScriptConf.name})`, async () => {
                    dacliStub.updateScript.interceptor.optionally(false);
                    dacliStub.createScript.stub.callsFake((script) => {
                        dacliStub.createScript.scripts[script.name] = script;
                        return updateScriptConf.value;
                    });

                    await dacli(command, host, makeRequestOptions());

                    checkAllStubs();
                });
            });

            it('should re-try polling task status', async () => {
                dacliStub.pollTaskResult.interceptor.times(2);
                dacliStub.pollTaskResult.stub
                    .onFirstCall()
                    .callsFake(() => [200, { _taskState: 'IN_PROGRESS' }]);

                await dacli(command, 1, host, makeRequestOptions());

                checkAllStubs({ skipStubs: ['updateScript', 'pollTaskResult'] });
                assert.deepStrictEqual(dacliStub.pollTaskResult.stub.callCount, 2);
            });

            it('should re-trying task results polling when invalid body received', async () => {
                dacliStub.pollTaskResult.interceptor.times(3);
                dacliStub.pollTaskResult.stub.onFirstCall().callsFake(() => [200, 'something']);
                dacliStub.pollTaskResult.stub.onSecondCall().callsFake(() => [200, {}]);

                await dacli(command, 1, host, makeRequestOptions());

                assert.deepStrictEqual(dacliStub.pollTaskResult.stub.callCount, 3);
            });

            // order matters - execution order
            const execSteps = [
                'createScript',
                'updateScript',
                'createTask',
                'executeTask',
                'pollTaskResult'
            ];
            testUtil.product(
                execSteps,
                testUtil.smokeTests.filter([
                    testUtil.smokeTests.ignore('socketError'),
                    'httpError'
                ])
            ).forEach(([stepName, errorType]) => {
                if (!(stepName && errorType)) {
                    return;
                }

                it(`should fail on error "${errorType}" ("${stepName}" step)`, async () => {
                    let errorMsg;
                    const expectations = [];
                    const socketError = { code: 500, message: 'socket error' };

                    function replyWithError(stub) {
                        stub.remove();
                        stub.interceptor.replyWithError(socketError);
                    }

                    dacliStub.disable();
                    for (let i = 0; i <= execSteps.indexOf(stepName); i += 1) {
                        dacliStub[execSteps[i]].interceptor.optionally(false);
                    }

                    // NOTE: the only way to fail `createScript` is socket error

                    if (errorType === 'socketError' || stepName === 'createScript') {
                        replyWithError(dacliStub[stepName]);
                        errorMsg = /DeviceAsyncCLI.execute: HTTP Error/;
                    }

                    if (stepName === 'updateScript') {
                        // need `createScript` stub to record request and return error to enable `updateScript`
                        dacliStub.createScript.stub.callsFake((script) => {
                            dacliStub.createScript.scripts[script.name] = script;
                            return [404, ''];
                        });
                    }

                    if (errorType === 'httpError') {
                        if (stepName === 'updateScript') {
                            dacliStub[stepName].stub.callsFake(() => [404, '']);
                            errorMsg = /DeviceAsyncCLI.execute: Failed to update the CLI script on device/;
                        }

                        if (stepName === 'createTask') {
                            dacliStub[stepName].stub.callsFake(() => [200, {}]);
                            errorMsg = /DeviceAsyncCLI.execute: Failed to create a new task on the device/;
                        }

                        if (stepName === 'executeTask') {
                            dacliStub[stepName].stub.callsFake(() => [200, '']);
                            errorMsg = /DeviceAsyncCLI.execute: Failed to execute the task on the device/;
                        }

                        if (stepName === 'pollTaskResult') {
                            dacliStub[stepName].stub.callsFake(() => [200, { _taskState: 'FAILED' }]);
                            errorMsg = /DeviceAsyncCLI.execute: Task failed unexpectedly/;
                        }
                    }

                    if (stepName !== 'updateScript') {
                        // step is optional due `createScript` success
                        dacliStub.updateScript.interceptor.optionally(true);
                    }

                    if (execSteps.indexOf(stepName) >= execSteps.indexOf('updateScript')) {
                        dacliStub.removeScript.interceptor.optionally(false);
                        expectations.push(() => assert.deepStrictEqual(
                            dacliStub.removeScript.stub.callCount, 1, 'should call "removeScript" stub'
                        ));
                    }

                    if (execSteps.indexOf(stepName) >= execSteps.indexOf('executeTask')) {
                        dacliStub.removeTask.interceptor.optionally(false);
                        expectations.push(() => assert.deepStrictEqual(
                            dacliStub.removeTask.stub.callCount, 1, 'should call "removeTask" stub'
                        ));
                    }

                    if (execSteps.indexOf(stepName) >= execSteps.indexOf('pollTaskResult')) {
                        dacliStub.removeTaskResult.interceptor.optionally(false);
                        expectations.push(() => assert.deepStrictEqual(
                            dacliStub.removeTaskResult.stub.callCount, 1, 'should call "removeTaskResult" stub'
                        ));
                    }

                    execSteps.forEach((sname, idx) => {
                        let expectedCallCount = execSteps.indexOf(stepName) >= idx ? 1 : 0;
                        if (
                            stepName === 'createScript'
                            || (sname === 'updateScript' && stepName !== sname)
                            || (errorType === 'socketError' && stepName === sname)
                        ) {
                            // - `createScript` step expects stubs to be called 0 times
                            // - steps below `updateScript` do not expected to call `updateScript` stub
                            expectedCallCount = 0;
                        }
                        expectations.push(() => assert.deepStrictEqual(
                            dacliStub[sname].stub.callCount,
                            expectedCallCount,
                            `should call "${sname}" step ${expectedCallCount} time(s)`
                        ));
                    });

                    await assert.isRejected(dacli(command, 1, host, makeRequestOptions()), errorMsg);

                    assert.allOfAssertions(...expectations);
                });
            });
        });
    });
});
