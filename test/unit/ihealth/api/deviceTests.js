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
const moduleCache = require('../../shared/restoreCache')();

const os = require('os');
const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../../shared/assert');
const BigIpApiMock = require('../../shared/bigipAPIMock');
const bigipConnTests = require('../../shared/tests/bigipConn');
const bigipCredsTest = require('../../shared/tests/bigipCreds');
const { DeviceApiMock } = require('./mocks');
const sourceCode = require('../../shared/sourceCode');
const stubs = require('../../shared/stubs');
const testUtil = require('../../shared/util');

const DeviceAPI = sourceCode('src/lib/ihealth/api/device');
const logger = sourceCode('src/lib/logger');

moduleCache.remember();

describe('iHealth / API / Device', () => {
    const defaultUser = 'admin';
    const localhost = 'localhost';
    const remotehost = 'remote.hostname.remote.domain';
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true, utilMisc: true });
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks();
        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('invalid arguments', () => {
            assert.throws(() => new DeviceAPI(), /target host should be a string/);
            assert.throws(() => new DeviceAPI(remotehost, { logger: null }), /logger should be an instance of Logger/);

            const hosts = [
                localhost,
                remotehost
            ];
            for (const host of hosts) {
                const credsTests = bigipCredsTest(host);
                for (const testData of credsTests) {
                    assert.throws(() => new DeviceAPI(host, {
                        credentials: testData.value,
                        logger
                    }), testData.error);
                }

                const connTests = bigipConnTests();
                for (const testData of connTests) {
                    assert.throws(() => new DeviceAPI(host, {
                        connection: testData.value,
                        credentials: { token: 'token' },
                        logger
                    }), testData.error);
                }
            }
        });

        it('should set properties', () => {
            const device = new DeviceAPI(localhost, {
                logger
            });
            assert.deepStrictEqual(device.host, localhost);
            assert.isDefined(device.logger);
            assert.deepStrictEqual(device.connection, undefined);
            assert.deepStrictEqual(device.credentials, {});
        });

        it('should set non default properties and make copies', () => {
            const connection = {
                protocol: 'https',
                port: 443,
                allowSelfSignedCert: true
            };
            const credentials = {
                username: 'test_user_1',
                passphrase: 'test_passphrase_1'
            };
            const device = new DeviceAPI(remotehost, {
                connection,
                credentials,
                logger
            });

            connection.protocol = 'http';
            connection.port = 80;
            connection.allowSelfSignedCert = false;
            credentials.username = 'test_user_2';
            credentials.passphrase = 'test_passphrase_2';

            assert.deepStrictEqual(device.host, remotehost);
            assert.isDefined(device.logger);
            assert.deepStrictEqual(device.connection, {
                protocol: 'https',
                port: 443,
                allowSelfSignedCert: true
            });
            assert.deepStrictEqual(device.credentials, {
                username: 'test_user_1',
                passphrase: 'test_passphrase_1'
            });
        });
    });

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
                value: { port: 8105, protocol: 'https', allowSelfSignedCert: true }
            }
        ])
    );

    combinations.forEach(([hostConf, credentialsConf, connectionConf]) => {
        if (hostConf.value === remotehost && !(credentialsConf.value && credentialsConf.value.passphrase)) {
            // password-less user does not work with remote host
            return;
        }

        describe(`host = ${hostConf.name}, user = ${credentialsConf.name}, connection = ${connectionConf.name}`, () => {
            let bigip;
            let connection;
            let credentials;
            let device;
            let deviceMock;
            let host;
            let requestSpies;

            function makeAuthOptional() {
                if (deviceMock.authMock) {
                    deviceMock.authMock.disable();
                }
            }

            function makeDacliStub(stub) {
                stub.updateScript.interceptor.optionally(true);
                return stub;
            }

            beforeEach(() => {
                requestSpies = testUtil.requestSpies();

                let authMock = null;
                connection = testUtil.deepCopy(connectionConf.value);
                credentials = testUtil.deepCopy(credentialsConf.value);
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
                    authMock = bigip.mockAuth(credentials.username, credentials.passphrase);
                } else if (host === localhost) {
                    bigip.addPasswordlessUser(
                        (credentials && credentials.username)
                            ? credentials.username
                            : defaultUser
                    );
                }

                device = new DeviceAPI(host, { connection, credentials, logger });
                deviceMock = new DeviceApiMock(bigip);
                deviceMock.authMock = authMock;
            });

            afterEach(() => {
                let strictSSL = true;
                if (connectionConf.value && typeof connectionConf.value.allowSelfSignedCert === 'boolean') {
                    strictSSL = !connectionConf.value.allowSelfSignedCert;
                }
                testUtil.checkRequestSpies(requestSpies, { strictSSL });
            });

            function addDacliTests(fn, getStub) {
                it('should throw error when unable to execute command via DACLI', () => {
                    getStub().pollTaskResult.stub.callsFake(() => [200, { _taskState: 'FAILED' }]);
                    return assert.isRejected(fn(device), /DeviceAsyncCLI.execute: Task failed/);
                });
            }

            function addDeviceAuthTests(fn) {
                it('should throw error when unable to authorize', function () {
                    if (deviceMock.authMock) {
                        deviceMock.authMock.stub.callsFake(() => [404, 'expected auth error']);
                        return assert.isRejected(fn(device), /Bad status code: 404/);
                    }
                    return this.skip();
                });
            }

            function addDeviceExecuteShellCmdTests(fn, getStub) {
                it('should throw error when unable to execute shell command', () => {
                    getStub().stub.callsFake(() => [500, null, 'error']);
                    return assert.isRejected(fn(device), /Bad status code: 500/);
                });
            }

            function addDeviceRemoveFileTests(fn, getStub) {
                it('should not throw error when unable to remove file', () => {
                    getStub().stub.callsFake(() => [200, 'error']);
                    return fn(device);
                });
            }

            function wrapMD5(fpath) {
                return `${fpath}.md5sum`;
            }

            describe('.createQkview()', () => {
                const qkviewName = 'myqkview';
                const fn = (inst, dir) => inst.createQkview(qkviewName, dir);

                addDeviceAuthTests(fn);
                addDacliTests(fn, () => makeDacliStub(deviceMock.mockCreateQkview(qkviewName).dacli));

                it('should throw error when no file name provided', () => {
                    makeAuthOptional();
                    return Promise.all([
                        assert.isRejected(device.createQkview(), 'Qkview file name should be a string'),
                        assert.isRejected(device.createQkview(''), 'Qkview file name should be a non-empty collection')
                    ]);
                });

                it('should throw error when no directory path provided', () => {
                    makeAuthOptional();
                    return Promise.all([
                        assert.isRejected(device.createQkview('scrFile', ''), 'directory should be a non-empty collection'),
                        assert.isRejected(device.createQkview('srcFile', null), 'directory should be a string')
                    ]);
                });

                [
                    {
                        name: 'default dir',
                        value: undefined
                    },
                    {
                        name: 'custom dir',
                        value: '/tmp'
                    }
                ].forEach((testConf) => {
                    describe(testConf.name, () => {
                        beforeEach(() => {
                            deviceMock.mockCreateQkview(qkviewName, { dir: testConf.value });
                        });

                        it('should create Qkview', () => assert.becomes(
                            fn(device, testConf.value),
                            `${testConf.value || '/shared/tmp'}/${qkviewName}`
                        ));
                    });
                });
            });

            describe('.downloadFile()', () => {
                const tmpDir = os.tmpdir();
                const dstFile = pathUtil.join(tmpDir, 'testDownloadFileUserStream');
                const scrFile = '/shared/tmp/source';

                beforeEach(async () => {
                    await coreStub.utilMisc.fs.promise.mkdir(tmpDir);
                });

                const fn = (inst) => inst.downloadFile(scrFile, dstFile);

                it('should throw error when no file path provided', () => {
                    makeAuthOptional();
                    return Promise.all([
                        assert.isRejected(device.downloadFile(), 'source file should be a string'),
                        assert.isRejected(device.downloadFile(''), 'source file should be a non-empty collection'),
                        assert.isRejected(device.downloadFile(scrFile), 'destination file should be a string'),
                        assert.isRejected(device.downloadFile(scrFile, ''), 'destination file should be a non-empty collection')
                    ]);
                });

                describe('auth test', () => {
                    addDeviceAuthTests(fn);
                });

                describe('main tests', () => {
                    let downloadStub;

                    beforeEach(() => {
                        downloadStub = deviceMock.mockDownloadFile(scrFile);
                    });

                    it('should throw error when source path does not exist', async () => {
                        downloadStub.remotePathExist.stub.callsFake(() => [200, '']);

                        downloadStub.downloadFile.remove();
                        downloadStub.downloadPathExist.remove();
                        downloadStub.removeDownloadPath.remove();
                        downloadStub.symlinkStub.remove();

                        await assert.isRejected(
                            fn(device),
                            /pathExists.* doesn't exist/
                        );
                    });

                    it('should throw error when unable to create a symlink', async () => {
                        downloadStub.symlinkStub.stub.returns([500, 'error']);

                        downloadStub.downloadFile.remove();
                        downloadStub.downloadPathExist.remove();
                        downloadStub.removeDownloadPath.remove();

                        await assert.isRejected(
                            fn(device),
                            /Bad status code: 500/
                        );
                    });

                    it('should throw error when symlink does not exist', async () => {
                        downloadStub.downloadPathExist.stub.callsFake(() => [200, '']);

                        downloadStub.downloadFile.remove();
                        downloadStub.removeDownloadPath.remove();

                        await assert.isRejected(
                            fn(device),
                            /pathExists.* doesn't exist/
                        );
                    });

                    it('should remove remote file when unable to download it', async () => {
                        downloadStub.downloadFile.stub.returns([404, null, null, 'expected file error']);
                        await assert.isRejected(
                            fn(device),
                            /downloadFileFromDevice: HTTP Error: 404/
                        );

                        assert.deepStrictEqual(downloadStub.removeDownloadPath.stub.callCount, 1);
                    });

                    it('should remove remote file when file downloaded', async () => {
                        await fn(device);
                        assert.deepStrictEqual(downloadStub.removeDownloadPath.stub.callCount, 1);

                        assert.deepStrictEqual(
                            coreStub.utilMisc.fs.promise.readFileSync(dstFile).toString(),
                            'qkview'
                        );
                    });
                });
            });

            describe('.getDeviceInfo()', () => {
                const fn = (inst) => inst.getDeviceInfo();

                addDeviceAuthTests(fn);

                it('should gather device info', () => {
                    const expected = deviceMock.mockGetDeviceInfo().deviceInfo.deviceInfoData;
                    delete expected.generation;
                    delete expected.kind;
                    delete expected.lastUpdateMicros;
                    delete expected.selfLink;

                    return assert.becomes(
                        fn(device),
                        expected
                    );
                });
            });

            describe('.getMD5sum()', () => {
                const fpath = 'myfile';

                const fn = (inst) => inst.getMD5sum(fpath);

                it('should throw error when no file path provided', () => {
                    makeAuthOptional();

                    return Promise.all([
                        assert.isRejected(device.getMD5sum(), 'path to a file should be a string'),
                        assert.isRejected(device.getMD5sum(''), 'path to a file should be a non-empty collection')
                    ]);
                });

                describe('auth test', () => {
                    addDeviceAuthTests(fn);
                });

                describe('main tests', () => {
                    let getMD5sumStub;

                    beforeEach(() => {
                        getMD5sumStub = deviceMock.mockGetMD5sum(fpath);
                        makeDacliStub(getMD5sumStub.dacli);
                    });

                    describe('dacli test', () => {
                        beforeEach(() => {
                            getMD5sumStub.shell.disable();
                        });

                        addDacliTests(fn, () => getMD5sumStub.dacli);
                    });

                    addDeviceExecuteShellCmdTests(fn, () => getMD5sumStub.shell);
                    addDeviceRemoveFileTests(fn, () => getMD5sumStub.removePath);

                    it('should calculate MD5 sum', async () => {
                        await assert.becomes(
                            fn(device),
                            `${fpath}_md5sum`
                        );

                        assert.deepStrictEqual(getMD5sumStub.removePath.stub.callCount, 1);
                    });

                    it('should throw error when MD5 sum is empty', async () => {
                        getMD5sumStub.shell.stub.returns([200, '']);
                        await assert.isRejected(
                            fn(device), `MD5 file "${wrapMD5(fpath)}" is empty!`
                        );

                        assert.deepStrictEqual(getMD5sumStub.removePath.stub.callCount, 1, 'should try remove file even when error thrown');
                    });
                });
            });

            describe('.removeFile()', () => {
                const fpath = 'myfile';
                const fn = (inst) => inst.removeFile(fpath);

                addDeviceAuthTests(fn);

                it('should throw error when no file path provided', () => {
                    makeAuthOptional();
                    return Promise.all([
                        assert.isRejected(device.removeFile(), 'path to a file should be a string'),
                        assert.isRejected(device.removeFile(''), 'path to a file should be a non-empty collection')
                    ]);
                });

                describe('main tests', () => {
                    let removeFileStub;

                    beforeEach(() => {
                        removeFileStub = deviceMock.mockRemoveFile(fpath);
                    });

                    it('should not throw error when unable to remove file', async () => {
                        removeFileStub.removePath.interceptor.times(2);
                        removeFileStub.removePath.stub
                            .onFirstCall().callsFake(() => [200, 'error'])
                            .onSecondCall().callsFake(() => [404, null, 'error']);

                        await fn(device);
                        await fn(device);
                    });

                    it('should not throw error when unable to remove file (socket error)', async () => {
                        removeFileStub.removePath.remove();
                        removeFileStub.removePath.interceptor.replyWithError({ code: 500, message: 'test' });

                        await fn(device);
                    });

                    it('should remove file', () => assert.isFulfilled(
                        fn(device)
                    ));
                });
            });
        });
    });
});
