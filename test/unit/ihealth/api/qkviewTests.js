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

/* eslint-disable import/order */
const moduleCache = require('../../shared/restoreCache')();

const os = require('os');
const sinon = require('sinon');

const assert = require('../../shared/assert');
const BigIpApiMock = require('../../shared/bigipAPIMock');
const { DeviceApiMock, QkviewManagerMock } = require('./mocks');
const sourceCode = require('../../shared/sourceCode');
const stubs = require('../../shared/stubs');
const testUtil = require('../../shared/util');

const DeviceAPI = sourceCode('src/lib/ihealth/api/device');
const logger = sourceCode('src/lib/logger');
const QkviewMgr = sourceCode('src/lib/ihealth/api/qkview');

moduleCache.remember();

describe('iHealth / API / Qkview', () => {
    const defaultUser = 'admin';
    const localhost = 'localhost';
    const remotehost = 'remotehost';

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        stubs.default.coreStub({ logger: true });
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks();
        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('should throw error on invalid params', () => {
            assert.throws(() => new QkviewMgr(), /local device should be an instance of DeviceAPI/);
            assert.throws(() => new QkviewMgr(null), /local device should be an instance of DeviceAPI/);
            assert.throws(() => new QkviewMgr(
                new DeviceAPI(localhost, { logger })
            ), /remote device should be an instance of DeviceAPI/);
            assert.throws(() => new QkviewMgr(
                new DeviceAPI(localhost, { logger }),
                null
            ), /remote device should be an instance of DeviceAPI/);
            assert.throws(() => new QkviewMgr(
                new DeviceAPI(localhost, { logger }),
                new DeviceAPI(localhost, { logger }),
                { downloadFolder: '' }
            ), /download folder should be a non-empty collection/);
        });

        it('should create a new instance', () => {
            const qkview = new QkviewMgr(
                new DeviceAPI(localhost, { logger }),
                new DeviceAPI('localhost2', { logger, credentials: { token: 'token' } }),
                {
                    downloadFolder: 'test'
                }
            );

            assert.instanceOf(qkview.local, DeviceAPI);
            assert.deepStrictEqual(qkview.local.host, localhost);
            assert.instanceOf(qkview.remote, DeviceAPI);
            assert.deepStrictEqual(qkview.remote.host, 'localhost2');
            assert.deepStrictEqual(qkview.downloadFolder, 'test');
        });
    });

    describe('.removeLocalFile()', () => {
        const fileName = 'qkview_telemetry';
        let qkview;
        let removeStub;

        beforeEach(() => {
            const bigip = new BigIpApiMock();
            bigip.addPasswordlessUser(defaultUser);
            removeStub = bigip.mockRemovePath(fileName);

            qkview = new QkviewMgr(
                new DeviceAPI(localhost, { logger }),
                new DeviceAPI(localhost, { logger }),
                { downloadFolder: 'test' }
            );
        });

        it('should remove file from the local device', async () => {
            await qkview.removeLocalFile(fileName);
            assert.deepStrictEqual(removeStub.stub.callCount, 1);
        });

        it('should ignore errors when unable to remove file', async () => {
            removeStub.stub.callsFake(() => [404, undefined, 'error message']);
            await qkview.removeLocalFile(fileName);
            assert.deepStrictEqual(removeStub.stub.callCount, 1);
        });
    });

    describe('.generateQkview()', () => {
        const qkviewName = '.*qkview_telemetry_.*.tar.qkview';
        const qkviewRegExp = new RegExp(qkviewName);

        describe('local device', () => {
            const downloadFolder = os.tmpdir();
            let qkviewMgr;

            beforeEach(() => {
                const bigip = new BigIpApiMock();
                bigip.addPasswordlessUser(defaultUser);

                const qkviewMock = new QkviewManagerMock(new DeviceApiMock(bigip));
                const qkviewStubs = qkviewMock.mockLocalCase(qkviewName, { dir: downloadFolder });
                qkviewStubs.local.deviceInfo.deviceInfo.interceptor.times(2);
                qkviewStubs.local.removeQkview.remove();

                qkviewMgr = new QkviewMgr(
                    new DeviceAPI(localhost, { logger }),
                    new DeviceAPI(localhost, { logger }),
                    { downloadFolder }
                );
            });

            it('should collect qkview from local device', async () => {
                const localQkview = await qkviewMgr.generateQkview();
                assert.isTrue(qkviewRegExp.test(localQkview));
            });
        });

        describe('remote device', () => {
            const connection = {
                port: 8105,
                protocol: 'https'
            };
            const credentials = {
                username: 'test_user_1',
                passphrase: 'test_passphrase_1'
            };
            const downloadFolder = os.tmpdir();
            let qkviewMgr;
            let qkviewStubs;

            beforeEach(() => {
                const localBigIp = new BigIpApiMock();
                localBigIp.addPasswordlessUser(defaultUser);

                const remoteBigIp = new BigIpApiMock(remotehost, {
                    port: connection.port,
                    protocol: connection.protocol
                });
                remoteBigIp.mockAuth(credentials.username, credentials.passphrase);

                const qkviewMock = new QkviewManagerMock(
                    new DeviceApiMock(localBigIp),
                    new DeviceApiMock(remoteBigIp)
                );

                qkviewStubs = qkviewMock.mockRemoteCase(qkviewName, { dir: downloadFolder });
                qkviewMgr = new QkviewMgr(
                    new DeviceAPI(localhost, { logger }),
                    new DeviceAPI(remotehost, {
                        connection: testUtil.deepCopy(connection),
                        credentials: testUtil.deepCopy(credentials),
                        logger
                    }),
                    { downloadFolder }
                );
            });

            it('should collect qkview from local device', async () => {
                assert.match(await qkviewMgr.generateQkview(), qkviewRegExp);
            });

            it('should not fail when unable to remove qkview file from the remote device', async () => {
                qkviewStubs.remote.removeQkview.removePath.stub.callsFake(() => [200, 'error']);
                assert.match(await qkviewMgr.generateQkview(), qkviewRegExp);
            });

            it('should fail when MD5 sums do no match', async () => {
                qkviewStubs.local.removeQkview.removePath.interceptor.optionally(false);
                qkviewStubs.remote.getMD5sum.shell.stub.returns([200, 'md5sum md5sum']);
                await assert.isRejected(qkviewMgr.generateQkview(), /MD5 sum.* !== .*/);
            });

            it('should try to remove local qkview when unable to download', async () => {
                qkviewStubs.local.removeQkview.removePath.interceptor.optionally(false);
                qkviewStubs.remote.downloadQkview.downloadFile.stub.returns([
                    404, undefined, undefined, 'error'
                ]);
                qkviewStubs.local.getMD5sum.remove();
                qkviewStubs.remote.getMD5sum.remove();
                await assert.isRejected(qkviewMgr.generateQkview(), /downloadFileFromDevice: HTTP Error: 404/);
            });
        });
    });
});
