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

/* eslint-disable import/order, no-bitwise, no-restricted-syntax */
const moduleCache = require('../shared/restoreCache')();

const nodeFS = require('fs');
const os = require('os');
const pathUtil = require('path');
const sinon = require('sinon');
const { Writable } = require('stream');

const assert = require('../shared/assert');
const bigipConnTests = require('../shared/tests/bigipConn');
const BigIpApiMock = require('../shared/bigipAPIMock');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const constants = sourceCode('src/lib/constants');
const deviceUtil = sourceCode('src/lib/utils/device');
const utilMisc = sourceCode('src/lib/utils/misc');

moduleCache.remember();

describe('Device Util', () => {
    const defaultVersionData = {
        build: '0.0.4',
        date: 'Wed Aug 23 10:18:11 PDT 2023',
        edition: 'Point Release 3',
        product: 'BIG-IP',
        title: 'Main Package',
        version: ['17', '1', '0', '3'].join('.')
    };
    const defaultUser = 'admin';
    const localhost = 'localhost';
    const remotehost = 'remotehost';

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        stubs.default.coreStub({
            logger: true,
            utilMisc: true
        });
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks();
        testUtil.nockCleanup();
        sinon.restore();
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
                name: 'non-default passwordless user',
                value: { username: 'test_user_1' }
            },
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
        if (hostConf.value === remotehost
            && !(typeof credentialsConf.value !== 'undefined'
                && (typeof credentialsConf.value.token !== 'undefined'
                    || typeof credentialsConf.value.passphrase !== 'undefined')
            )) {
            // remote host requires auth with username and passphrase or token
            return;
        }

        describe(`host = ${hostConf.name}, user = ${credentialsConf.name}, connection = ${connectionConf.name}`, () => {
            let bigip;
            let connection;
            let credentials;
            let host;
            let requestSpies;

            function makeRequestOptions(options = {}) {
                if (Object.keys(options).length === 0 && typeof connection === 'undefined' && typeof credentials === 'undefined') {
                    return undefined;
                }
                return Object.assign({}, connection, { credentials }, options);
            }

            beforeEach(() => {
                requestSpies = testUtil.requestSpies();

                connection = connectionConf.value;
                credentials = credentialsConf.value;
                host = hostConf.value;

                bigip = new BigIpApiMock(host, {
                    port: (connection && connection.port) || undefined,
                    protocol: (connection && connection.protocol) || undefined
                });

                if (credentials && credentials.token) {
                    bigip.addAuthToken(credentials.token);
                } else {
                    bigip.addPasswordlessUser(
                        (credentials && credentials.username)
                            ? credentials.username
                            : defaultUser
                    );
                }

                deviceUtil.clearHostDeviceInfo();
            });

            afterEach(() => {
                let strictSSL = true;
                if (connectionConf.value && typeof connectionConf.value.allowSelfSignedCert === 'boolean') {
                    strictSSL = !connectionConf.value.allowSelfSignedCert;
                }
                testUtil.checkRequestSpies(requestSpies, { strictSSL });
            });

            describe('.downloadFileFromDevice()', () => {
                const bufferFiller = nodeFS.readFileSync(__filename);
                const dstDir = os.tmpdir();
                const dstPath = pathUtil.join(dstDir, '/testDownloadFileUserStream');
                const downloadUri = '/uri/to/path';
                let downloadStub;

                class MyWritable extends Writable {
                    constructor(options) {
                        super(options);
                        this.chunks = [];
                        this.onWriteStub = sinon.stub();
                        this.onWriteStub.callsFake((stream, chunk, cb) => cb(null));
                    }

                    _write(chunk, encoding, callback) {
                        this.onWriteStub(this, chunk, callback);
                        this.chunks.push(chunk);
                    }

                    get buffer() {
                        return Buffer.concat(this.chunks);
                    }
                }

                beforeEach(async () => {
                    await utilMisc.fs.mkdir(dstDir);
                    downloadStub = bigip.mockDownloadFileFromDevice(downloadUri);
                });

                const outputConfig = testUtil.smokeTests.filter([
                    { name: 'output to a file', type: 'file', value: () => dstPath },
                    testUtil.smokeTests.ignore({ name: 'output to a custom stream', type: 'customStream', value: () => new MyWritable() }),
                    {
                        name: 'output to a existing stream',
                        type: 'stream',
                        value: async () => {
                            const stream = utilMisc.fs.createWriteStream(dstPath);
                            // for stream to be opened
                            await (new Promise((resolve, reject) => {
                                try {
                                    stream.write('test', (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve();
                                        }
                                    });
                                } catch (err) {
                                    reject(err);
                                }
                            }));
                            return stream;
                        }
                    }
                ]);

                outputConfig.forEach((testConf) => describe(testConf.name, () => {
                    function readOutput(output) {
                        if (testConf.type !== 'customStream') {
                            const data = utilMisc.fs.readFileSync(dstPath).toString();
                            return testConf.type === 'stream'
                                ? data.slice(4)
                                : data;
                        }
                        // TODO: verify stream is closed
                        return output.buffer.toString();
                    }

                    const chunkSizes = testUtil.smokeTests.filter([
                        0.5,
                        1,
                        1.5,
                        2,
                        testUtil.smokeTests.ignore(2.5),
                        testUtil.smokeTests.ignore(3)
                    ]);

                    chunkSizes.forEach((chunkSize) => {
                        it(`should download file (file size = ${chunkSize} x chunk size)`, async () => {
                            const data = Buffer.allocUnsafe(constants.DEVICE_REST_API.CHUNK_SIZE * chunkSize);
                            data.fill(bufferFiller);

                            downloadStub.stub.callsFake((uri, range) => {
                                const chunk = data.slice(range.start, range.end + 1);
                                return [
                                    200,
                                    chunk,
                                    Object.assign({}, range, { end: range.start + chunk.length - 1, size: data.length })
                                ];
                            });
                            downloadStub.interceptor.times(Math.ceil(chunkSize));

                            const output = await testConf.value();
                            await assert.becomes(
                                deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                                data.length
                            );

                            assert.deepStrictEqual(
                                readOutput(output), data.toString()
                            );
                        });

                        it(`should ignore range size after first response (file size = ${chunkSize} x chunk size)`, async () => {
                            const data = Buffer.allocUnsafe(constants.DEVICE_REST_API.CHUNK_SIZE * chunkSize);
                            data.fill(bufferFiller);

                            downloadStub.stub.callsFake((uri, range) => {
                                const chunk = data.slice(range.start, range.end + 1);
                                return [
                                    200,
                                    chunk,
                                    Object.assign({}, range, {
                                        end: range.start + chunk.length - 1,
                                        size: downloadStub.stub.callCount === 1 ? data.length : 0
                                    })
                                ];
                            });
                            downloadStub.interceptor.times(Math.ceil(chunkSize));

                            const output = await testConf.value();
                            await assert.becomes(
                                deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                                data.length
                            );

                            assert.deepStrictEqual(
                                readOutput(output), data.toString()
                            );
                        });
                    });

                    it('should close stream when got invalid HTTP status code', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => {
                            if (downloadStub.stub.callCount === 1) {
                                return [200, data, Object.assign({}, range, {
                                    end: data.length - 1,
                                    size: data.length * 6
                                })];
                            }
                            return [400, undefined, undefined, 'expected error msg'];
                        });
                        downloadStub.interceptor.times(2);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: HTTP Error: 400/
                        );
                    });

                    it('should close stream when range size is zero', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [200, data, Object.assign({}, range, { size: 0 })]);

                        const output = await testConf.value();
                        await assert.becomes(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            0
                        );

                        assert.deepStrictEqual(
                            readOutput(output), ''
                        );
                    });

                    it('should close stream when got no range header', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => {
                            if (downloadStub.stub.callCount === 1) {
                                return [200, data, Object.assign({}, range, {
                                    end: data.length - 1,
                                    size: data.length * 6
                                })];
                            }
                            return [200, undefined, undefined, 'abc'];
                        });
                        downloadStub.interceptor.times(2);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: HTTP Error: 200.*invalid Content-Range header/
                        );
                    });

                    const crangeTests = [
                        {
                            name: 'invalid range format',
                            error: /downloadFileFromDevice: HTTP Error: 200.*invalid Content-Range header/,
                            makeRange() {
                                return {
                                    start: 'start',
                                    end: 'end',
                                    size: '*'
                                };
                            }
                        },
                        {
                            name: 'invalid range format (example 2)',
                            error: /downloadFileFromDevice: HTTP Error: 200.*invalid Content-Range header/,
                            makeRange() {
                                return {
                                    start: '-1',
                                    end: '-1',
                                    size: '-1'
                                };
                            }
                        },
                        {
                            name: 'invalid range size (-1)',
                            error: /downloadFileFromDevice: HTTP Error: 200.*invalid Content-Range header/,
                            makeRange(data, range) {
                                return Object.assign({}, range, {
                                    end: data.length - 1,
                                    size: -1
                                });
                            }
                        },
                        {
                            name: 'invalid range size (Number.MAX_SAFE_INTEGER + 1)',
                            error: /downloadFileFromDevice: totalSize should be a safe number/,
                            makeRange(data, range) {
                                return Object.assign({}, range, {
                                    end: data.length - 1,
                                    size: Number.MAX_SAFE_INTEGER + 1
                                });
                            }
                        },
                        {
                            name: 'invalid range start (out of order)',
                            error: /downloadFileFromDevice: rangeStart should be ===/,
                            makeRange(data, range) {
                                return Object.assign({}, range, {
                                    start: 10,
                                    end: data.length - 1,
                                    size: data.length
                                });
                            }
                        },
                        {
                            name: 'invalid range start (Number.MAX_SAFE_INTEGER + 1)',
                            error: /downloadFileFromDevice: rangeStart should be a safe number/,
                            makeRange(data, range) {
                                return Object.assign({}, range, {
                                    start: Number.MAX_SAFE_INTEGER + 1,
                                    end: data.length - 1,
                                    size: data.length
                                });
                            }
                        },
                        {
                            name: 'invalid range end (Number.MAX_SAFE_INTEGER + 1)',
                            error: /downloadFileFromDevice: rangeEnd should be a safe number/,
                            makeRange(data, range) {
                                return Object.assign({}, range, {
                                    end: Number.MAX_SAFE_INTEGER + 1,
                                    size: data.length
                                });
                            }
                        },
                        {
                            name: 'invalid range size (Number.MAX_SAFE_INTEGER + 1)',
                            error: /downloadFileFromDevice: rangeSize should be a safe number/,
                            makeRange(data, range) {
                                return Object.assign({}, range, {
                                    end: Number.MAX_SAFE_INTEGER,
                                    size: data.length
                                });
                            }
                        }
                    ];

                    crangeTests.forEach((crangeConf) => it(`should throw on ${crangeConf.name}`, async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            crangeConf.makeRange(data, range)
                        ]);
                        downloadStub.interceptor.times(1);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            crangeConf.error
                        );
                    }));

                    it('should throw on invalid range chunk size', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            Object.assign({}, range, {
                                start: downloadStub.stub.callCount === 1 ? 0 : data.length,
                                end: downloadStub.stub.callCount === 1
                                    ? (data.length - 1)
                                    : 1,
                                size: data.length * 2
                            })
                        ]);
                        downloadStub.interceptor.times(2);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: rangeSize should be > 0/
                        );
                    });

                    it('should throw on invalid payload size (!== rangeSize) (first request)', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            Object.assign({}, range, {
                                size: data.length * 2
                            })
                        ]);
                        downloadStub.interceptor.times(1);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: rangeSize should be ===/
                        );
                    });

                    it('should throw on invalid payload size (!== rangeSize) (second request)', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            downloadStub.stub.callCount === 1 ? data : data.slice(0, 25),
                            Object.assign({}, range, {
                                start: downloadStub.stub.callCount === 1 ? 0 : data.length,
                                end: downloadStub.stub.callCount === 1
                                    ? (data.length - 1)
                                    : (data.length * 2 - 1),
                                size: data.length * 2
                            })
                        ]);
                        downloadStub.interceptor.times(2);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: rangeSize should be ===/
                        );
                    });

                    it('should throw on invalid range size (!== payload size) (first request)', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            Object.assign({}, range, {
                                start: 0,
                                end: data.length * 2 - 1,
                                size: data.length * 2
                            })
                        ]);
                        downloadStub.interceptor.times(1);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: rangeSize should be ===/
                        );
                    });

                    it('should throw on invalid range size (!== payload size) (second request)', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            Object.assign({}, range, {
                                start: downloadStub.stub.callCount === 1 ? 0 : data.length,
                                end: downloadStub.stub.callCount === 1
                                    ? (data.length - 1)
                                    : (data.length * 3 - 1),
                                size: data.length * 3
                            })
                        ]);
                        downloadStub.interceptor.times(2);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: rangeSize should be ===/
                        );
                    });

                    it('should throw on invalid overall size (second request)', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            Object.assign({}, range, {
                                start: downloadStub.stub.callCount === 1 ? 0 : data.length,
                                end: downloadStub.stub.callCount === 1
                                    ? (data.length - 1)
                                    : (data.length * 2 - 1),
                                size: data.length + 10
                            })
                        ]);
                        downloadStub.interceptor.times(2);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: the size of downloaded data/
                        );
                    });

                    it('should throw on invalid overall size (first request)', async () => {
                        const data = Buffer.allocUnsafe(50);
                        data.fill(bufferFiller);

                        downloadStub.stub.callsFake((uri, range) => [
                            200,
                            data,
                            Object.assign({}, range, {
                                start: 0,
                                end: data.length - 1,
                                size: data.length - 5
                            })
                        ]);
                        downloadStub.interceptor.times(1);

                        const output = await testConf.value();
                        await assert.isRejected(
                            deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                            /downloadFileFromDevice: the size of downloaded data/
                        );
                    });

                    if (testConf.type !== 'customStream') {
                        return;
                    }

                    const streamTests = [
                        {
                            name: 'stream "error" event',
                            error: /expected stream error event/,
                            makeError(stream, chunk, cb) {
                                stream.emit('error', new Error('expected stream error event'));
                                cb();
                            },
                            times: 1
                        },
                        {
                            name: 'write error (async)',
                            error: /expected stream async error/,
                            makeError(stream, chunk, cb) {
                                setImmediate(() => cb(new Error('expected stream async error')));
                            }
                        },
                        {
                            name: 'write error (sync)',
                            error: /expected stream sync error/,
                            makeError() {
                                throw new Error('expected stream sync error');
                            }
                        }
                    ];
                    testUtil.product(streamTests, [1, 2])
                        .forEach(([streamErrorConf, requestsCount]) => it(`should throw on ${streamErrorConf.name} (${requestsCount} request(s))`, async () => {
                            const data = Buffer.allocUnsafe(50);
                            data.fill(bufferFiller);

                            const times = (streamErrorConf.times || 0) + requestsCount;

                            downloadStub.stub.callsFake((uri, range) => [
                                200,
                                data,
                                Object.assign({}, range, {
                                    start: (downloadStub.stub.callCount - 1) * data.length,
                                    end: data.length * downloadStub.stub.callCount - 1,
                                    size: data.length * times
                                })
                            ]);
                            downloadStub.interceptor.times(times);

                            const output = await testConf.value();
                            output.onWriteStub.onCall(requestsCount - 1).callsFake(streamErrorConf.makeError);

                            await assert.isRejected(
                                deviceUtil.downloadFileFromDevice(output, host, downloadUri, makeRequestOptions()),
                                streamErrorConf.error
                            );
                        }));
                }));
            });

            describe('Host Device Info', () => {
                if (hostConf.value !== localhost) {
                    return;
                }

                let deviceTypeMock;
                let deviceVersionMock;

                beforeEach(() => {
                    deviceTypeMock = bigip.mockDeviceType();
                    deviceVersionMock = bigip.mockDeviceVersion();
                    deviceUtil.clearHostDeviceInfo();
                });

                it('should gather device info', async () => {
                    await deviceUtil.gatherHostDeviceInfo(makeRequestOptions());

                    assert.deepStrictEqual(deviceTypeMock.callCount, 1);
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo(),
                        {
                            TYPE: constants.DEVICE_TYPE.BIG_IP,
                            VERSION: defaultVersionData
                        }
                    );
                });

                it('should override existing values', async () => {
                    deviceVersionMock.interceptor.times(2);
                    await deviceUtil.gatherHostDeviceInfo(makeRequestOptions());

                    assert.deepStrictEqual(deviceTypeMock.callCount, 1);
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo(),
                        {
                            TYPE: constants.DEVICE_TYPE.BIG_IP,
                            VERSION: defaultVersionData
                        }
                    );

                    deviceVersionMock.deviceVersionData.version = '16.0.0';
                    deviceTypeMock.callsFake(() => Buffer.from('test'));

                    await deviceUtil.gatherHostDeviceInfo(makeRequestOptions());

                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo(),
                        {
                            TYPE: constants.DEVICE_TYPE.CONTAINER,
                            VERSION: Object.assign({}, defaultVersionData, { version: '16.0.0' })
                        }
                    );
                    assert.deepStrictEqual(deviceTypeMock.callCount, 2);
                    assert.deepStrictEqual(deviceVersionMock.stub.callCount, 2);
                });

                it('should get info by key', async () => {
                    await deviceUtil.gatherHostDeviceInfo(makeRequestOptions());
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo('TYPE'),
                        constants.DEVICE_TYPE.BIG_IP
                    );
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo('VERSION'),
                        defaultVersionData
                    );
                    assert.isUndefined(deviceUtil.getHostDeviceInfo('non-existing-key'));
                });

                it('should remove key', async () => {
                    await deviceUtil.gatherHostDeviceInfo(makeRequestOptions());
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo('TYPE'),
                        constants.DEVICE_TYPE.BIG_IP
                    );
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo('VERSION'),
                        defaultVersionData
                    );

                    deviceUtil.clearHostDeviceInfo('TYPE', 'VERSION');
                    assert.isUndefined(deviceUtil.getHostDeviceInfo('TYPE'));
                    assert.isUndefined(deviceUtil.getHostDeviceInfo('VERSION'));
                });

                it('should remove keys', async () => {
                    await deviceUtil.gatherHostDeviceInfo(makeRequestOptions());
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo('TYPE'),
                        constants.DEVICE_TYPE.BIG_IP
                    );
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo('VERSION'),
                        defaultVersionData
                    );

                    deviceUtil.clearHostDeviceInfo();
                    assert.isUndefined(deviceUtil.getHostDeviceInfo('TYPE'));
                    assert.isUndefined(deviceUtil.getHostDeviceInfo('VERSION'));
                });
            });

            describe('.encryptSecret()', () => {
                if (hostConf.value !== localhost) {
                    return;
                }

                function makeSecret(secret) {
                    return secret.match(/(.|\n){1,500}/g).map((s) => `$M$${Buffer.from(s).toString('base64')}`).join(',');
                }

                it('should encrypt data that is 1k characters long', () => {
                    bigip.mockEncryptSecret({ replyTimes: 2 });
                    const secret = 'abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc'
                        + 'abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca'
                        + 'bcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc'
                        + 'abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab'
                        + 'cabcabcabcabcabcabcabcabca';

                    return assert.becomes(
                        deviceUtil.encryptSecret(secret, makeRequestOptions()),
                        makeSecret(secret)
                    );
                });

                it('should chunk large secrets and preserve newlines when encrypting secrets', () => {
                    bigip.mockEncryptSecret({ replyTimes: 2 });
                    // secret that is > 500 characters, with newlines
                    const largeSecret = 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n'
                        + 'largeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\nlargeSecret123\n';

                    return assert.becomes(
                        deviceUtil.encryptSecret(largeSecret, makeRequestOptions()),
                        makeSecret(largeSecret)
                    );
                });

                [
                    'httpError',
                    'socketError'
                ].forEach((errorType) => {
                    it(`should not fail when unable to delete radius object (${errorType})`, () => {
                        const encryptStubs = bigip.mockEncryptSecret({ replyTimes: 1 });

                        if (errorType === 'httpError') {
                            encryptStubs.delete.stub.callsFake(() => [404, null, 'error message']);
                        } else {
                            encryptStubs.delete.remove();
                            encryptStubs.delete.interceptor.replyWithError({ code: 500, message: 'socket error' });
                        }

                        const secret = 'secret';
                        return assert.becomes(
                            deviceUtil.encryptSecret(secret, makeRequestOptions()),
                            makeSecret(secret)
                        );
                    });

                    it(`should fail when unable to encrypt secret ${errorType}`, () => {
                        let errMsg;
                        const encryptStubs = bigip.mockEncryptSecret({ replyTimes: 1 });

                        if (errorType === 'httpError') {
                            encryptStubs.encrypt.stub.callsFake(() => [404, null, 'error message']);
                            errMsg = /Bad status code: 404/;
                        } else {
                            encryptStubs.encrypt.remove();
                            encryptStubs.encrypt.interceptor.replyWithError({ code: 500, message: 'socket error' });
                            // `encrypt` stub doesn't recrod secret -> unable to match request
                            encryptStubs.delete.interceptor.optionally(true);
                            errMsg = /HTTP Error:/;
                        }
                        return assert.isRejected(deviceUtil.encryptSecret('foo', makeRequestOptions()), errMsg);
                    });
                });

                it('should fail when encrypted secret has no `secret` property', () => {
                    const encryptStubs = bigip.mockEncryptSecret({ replyTimes: 1 });
                    encryptStubs.encrypt.stub.callsFake(() => [200, { data: 'encrypted,secret' }]);
                    return assert.isRejected(
                        deviceUtil.encryptSecret('foo', makeRequestOptions()),
                        /Secret could not be retrieved/
                    );
                });

                it('should fail when encrypted secret has comma', () => {
                    const encryptStubs = bigip.mockEncryptSecret({ replyTimes: 1 });
                    encryptStubs.encrypt.stub.callsFake(() => [200, { secret: 'encrypted,secret' }]);
                    return assert.isRejected(
                        deviceUtil.encryptSecret('foo', makeRequestOptions()),
                        /Encrypted data should not have a comma in it/
                    );
                });
            });

            describe('.executeShellCommandOnDevice()', () => {
                it('should execute shell command', () => {
                    const shellCmdStub = bigip.mockExecuteShellCommandOnDevice(/echo/);
                    shellCmdStub.stub.returns([200, 'test output']);
                    return assert.becomes(
                        deviceUtil.executeShellCommandOnDevice(host, 'echo something', makeRequestOptions()),
                        'test output'
                    );
                });

                it('should execute shell command (empty string in response)', () => {
                    const shellCmdStub = bigip.mockExecuteShellCommandOnDevice(/echo/);
                    shellCmdStub.stub.returns([200, '']);
                    return assert.becomes(
                        deviceUtil.executeShellCommandOnDevice(host, 'echo something', makeRequestOptions()),
                        ''
                    );
                });
            });

            describe('.getDeviceInfo()', () => {
                it('should fetch device info', () => {
                    bigip.mockDeviceInfo({
                        baseMac: '00:00:00:00:00:00',
                        build: '0.0.0',
                        chassisSerialNumber: '00000000-0000-0000-000000000000',
                        halUuid: '00000000-0000-0000-0000-000000000000',
                        hostMac: '00:00:00:00:00:00',
                        hostname: 'localhost.localdomain',
                        isClustered: false,
                        isVirtual: true,
                        machineId: '00000000-0000-0000-000000000000',
                        managementAddress: '192.168.1.10',
                        mcpDeviceName: '/Common/localhost.localdomain',
                        physicalMemory: 7168,
                        platform: 'Z100',
                        product: 'BIG-IP',
                        trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8a',
                        version: '15.1.0',
                        generation: 0,
                        lastUpdateMicros: 0,
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                    });
                    return assert.becomes(
                        deviceUtil.getDeviceInfo(host, makeRequestOptions()),
                        {
                            baseMac: '00:00:00:00:00:00',
                            build: '0.0.0',
                            chassisSerialNumber: '00000000-0000-0000-000000000000',
                            halUuid: '00000000-0000-0000-0000-000000000000',
                            hostMac: '00:00:00:00:00:00',
                            hostname: 'localhost.localdomain',
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000000',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: '/Common/localhost.localdomain',
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8a',
                            version: '15.1.0'
                        }
                    );
                });
            });

            describe('.getDeviceVersion()', () => {
                beforeEach(() => {
                    bigip.mockDeviceVersion();
                    deviceUtil.clearHostDeviceInfo();
                });

                it('should return device version', async () => {
                    const ret = await deviceUtil.getDeviceVersion(host, makeRequestOptions());
                    assert.deepStrictEqual(ret, defaultVersionData);
                });
            });

            describe('.isShellEnabled()', () => {
                let shellMock;

                beforeEach(() => {
                    shellMock = bigip.mockIsShellEnabled(true);
                });

                it('should return true when shell enabled', () => assert.becomes(
                    deviceUtil.isShellEnabled(host, makeRequestOptions()),
                    true
                ));

                it('should return false when shell disabled', async () => {
                    shellMock.shellEnabled = false;
                    await assert.becomes(
                        deviceUtil.isShellEnabled(host, makeRequestOptions()),
                        false
                    );
                });

                it('should return false when unable to read "value" property', async () => {
                    shellMock.stub.returns([200, { data: 'something' }]);
                    await assert.becomes(
                        deviceUtil.isShellEnabled(host, makeRequestOptions()),
                        false
                    );
                });
            });

            describe('.makeDeviceRequest()', () => {
                const endpointURI = '/something';
                let endpointStub;

                beforeEach(() => {
                    endpointStub = bigip.mockArbitraryEndpoint({
                        authCheck: false,
                        method: 'GET',
                        path: endpointURI,
                        response: () => [200, { sucess: true }]
                    });
                });

                if (typeof connectionConf.value === 'undefined' && typeof credentialsConf.value === 'undefined') {
                    it('should use default options', async () => {
                        await assert.becomes(
                            deviceUtil.makeDeviceRequest(host, endpointURI),
                            { sucess: true }
                        );

                        assert.deepStrictEqual(endpointStub.stub.callCount, 1);
                        assert.deepStrictEqual(
                            endpointStub.stub.args[0][2].headers.authorization,
                            `Basic ${Buffer.from(`${defaultUser}:`).toString('base64')}`
                        );
                    });
                }

                it('should use token instead of username', async () => {
                    await assert.becomes(
                        deviceUtil.makeDeviceRequest(host, endpointURI, makeRequestOptions({
                            credentials: {
                                token: 'validToken'
                            }
                        })),
                        { sucess: true }
                    );

                    assert.deepStrictEqual(endpointStub.stub.callCount, 1);
                    assert.deepStrictEqual(endpointStub.stub.args[0][2].headers['x-f5-auth-token'], 'validToken');
                });

                if (hostConf.value === localhost) {
                    it('should correctly encode username for auth header', async () => {
                        await assert.becomes(
                            deviceUtil.makeDeviceRequest(host, endpointURI, makeRequestOptions({
                                credentials: {
                                    username: 'username'
                                }
                            })),
                            { sucess: true }
                        );

                        assert.deepStrictEqual(endpointStub.stub.callCount, 1);
                        assert.deepStrictEqual(
                            endpointStub.stub.args[0][2].headers.authorization,
                            `Basic ${Buffer.from('username:').toString('base64')}`
                        );
                    });
                }

                it('should not include auth data', async () => {
                    let opts = {
                        credentials: {
                            username: 'username'
                        }
                    };
                    if (host === remotehost) {
                        opts = {
                            credentials: {
                                token: 'validToken'
                            }
                        };
                    }

                    await assert.becomes(
                        deviceUtil.makeDeviceRequest(
                            host,
                            endpointURI,
                            makeRequestOptions(Object.assign({ noAuthHeader: true }, opts))
                        ),
                        { sucess: true }
                    );

                    assert.deepStrictEqual(endpointStub.stub.callCount, 1);
                    assert.isUndefined(endpointStub.stub.args[0][2].headers.authorization);
                    assert.isUndefined(endpointStub.stub.args[0][2].headers['x-f5-auth-token']);
                });

                if (hostConf.value === localhost) {
                    it('should use default username when no auth data provided', async () => {
                        await assert.becomes(
                            deviceUtil.makeDeviceRequest(host, endpointURI, Object.assign({}, connection)),
                            { sucess: true }
                        );

                        assert.deepStrictEqual(endpointStub.stub.callCount, 1);
                        assert.deepStrictEqual(
                            endpointStub.stub.args[0][2].headers.authorization,
                            `Basic ${Buffer.from('admin:').toString('base64')}`
                        );
                    });
                }

                it('should throw on invalid connection options', async () => {
                    endpointStub.remove();
                    await assert.isRejected(
                        deviceUtil.makeDeviceRequest(host, endpointURI, null),
                        /options should be an object/
                    );

                    const connTests = bigipConnTests();
                    for (const test of connTests) {
                        if (Object.keys(test.value).length !== 0) {
                            await assert.isRejected(
                                deviceUtil.makeDeviceRequest(host, endpointURI, Object.assign({ credentials: { token: 'token' } }, test.value)),
                                test.error
                            );
                        }
                    }
                });
            });

            describe('.pathExists()', () => {
                let pathExistsMock;

                beforeEach(() => {
                    pathExistsMock = bigip.mockPathExists(/testfile/);
                });

                it('should fail when path doesn\'t exist', () => {
                    pathExistsMock.stub.returns([200, '/bin/ls: testfile doesn\'t exist']);
                    return assert.isRejected(
                        deviceUtil.pathExists('/something/testfile', host, makeRequestOptions()),
                        /bin\/ls: testfile/
                    );
                });

                it('should resolve when path exists (single file)', () => {
                    pathExistsMock.stub.returns([200, '/something/testfile']);
                    return assert.becomes(
                        deviceUtil.pathExists('/something/testfile', host, makeRequestOptions()),
                        ['/something/testfile']
                    );
                });

                it('should resolve when path exists (multiple files)', () => {
                    pathExistsMock.stub.returns([200, ['/something/testfile', '/something/testfile2'].join('\n')]);
                    return assert.becomes(
                        deviceUtil.pathExists('/something/testfile', host, makeRequestOptions()),
                        ['/something/testfile', '/something/testfile2']
                    );
                });

                it('should resolve when path exists (split lines disabled)', () => {
                    pathExistsMock.stub.returns([200, ['/something/testfile', '/something/testfile2'].join('\n')]);
                    return assert.becomes(
                        deviceUtil.pathExists('/something/testfile', host, makeRequestOptions({ splitLines: false })),
                        '/something/testfile\n/something/testfile2'
                    );
                });

                it('should resolve when path does not exists', () => {
                    pathExistsMock.stub.returns([200, '']);
                    return assert.becomes(
                        deviceUtil.pathExists('/something/testfile', host, makeRequestOptions()),
                        []
                    );
                });

                it('should resolve when path does not exists (split lines disabled)', () => {
                    pathExistsMock.stub.returns([200, '']);
                    return assert.becomes(
                        deviceUtil.pathExists('/something/testfile', host, makeRequestOptions({ splitLines: false })),
                        ''
                    );
                });
            });

            describe('.removePath()', () => {
                let removeMock;

                beforeEach(() => {
                    removeMock = bigip.mockRemovePath(/testfile/);
                });

                it('should fail when unable to remove path', () => {
                    removeMock.stub.returns([200, 'expected error message']);

                    return assert.isRejected(
                        deviceUtil.removePath('/something/testfile', host, makeRequestOptions()),
                        /expected error message/
                    );
                });

                it('should resolve when successfully removed path', () => assert.isFulfilled(
                    deviceUtil.removePath('/something/testfile', host, makeRequestOptions())
                ));
            });
        });
    });

    describe('.decryptAllSecrets()', () => {
        let decryptStub;

        beforeEach(() => {
            const bigip = new BigIpApiMock();
            decryptStub = bigip.mockDecryptSecret();
        });

        it('should fail when unable to decrypt secret', () => {
            decryptStub.rejects(new Error('expected decrypt error'));

            return assert.isRejected(
                deviceUtil.decryptAllSecrets({
                    My_Consumer: {
                        class: 'Consumer',
                        passphrase: {
                            class: 'Secret',
                            cipherText: 'My_Consumer_Secret'
                        }
                    }
                }),
                /expected decrypt error/
            );
        });

        it('should decrypt all secrets', () => {
            sinon.stub(process, 'env').value({ MY_SECRET_TEST_VAR: 'envSecret' });
            const declaration = {
                My_Consumer: {
                    class: 'Consumer',
                    passphrase: {
                        class: 'Secret',
                        cipherText: 'My_Consumer_Secret'
                    }
                },
                My_Consumer2: {
                    class: 'Consumer',
                    passphrase: {
                        class: 'Secret',
                        environmentVar: 'MY_SECRET_TEST_VAR'
                    }
                },
                My_Consumer3: {
                    class: 'Consumer',
                    passphrase: {
                        class: 'Secret',
                        environmentVar: 'VAR_THAT_DOES_NOT_EXIST'
                    }
                },
                My_Consumer4: {
                    class: 'Consumer',
                    passphrase: {
                        class: 'Secret',
                        someUnknownKey: ['My', 'Consumer4', 'test'].join('_')
                    }
                },
                My_Consumer5: {
                    class: 'Consumer',
                    otherkey: {
                        class: 'Secret',
                        cipherText: ['My_Consumer5', 'test_passphrase_2'].join('_')
                    }
                },
                My_Consumer6: {
                    class: 'Consumer',
                    otherkey: {
                        class: 'Secret',
                        cipherText: ['My_Consumer5_very_very', '_long', '_test_passphrase_1'].join(',')
                    }
                }
            };
            const expected = {
                My_Consumer: {
                    class: 'Consumer',
                    passphrase: 'decrypted_My_Consumer_Secret'
                },
                My_Consumer2: {
                    class: 'Consumer',
                    passphrase: 'envSecret'
                },
                My_Consumer3: {
                    class: 'Consumer',
                    passphrase: null
                },
                My_Consumer4: {
                    class: 'Consumer',
                    passphrase: null
                },
                My_Consumer5: {
                    class: 'Consumer',
                    otherkey: ['decrypted', 'My_Consumer5', 'test_passphrase_2'].join('_')
                },
                My_Consumer6: {
                    class: 'Consumer',
                    otherkey: ['decrypted', 'My_Consumer5', 'very_very_long_test_passphrase_1'].join('_')
                }
            };
            return assert.becomes(
                deviceUtil.decryptAllSecrets(declaration),
                expected
            );
        });
    });

    // connection config
    [
        {
            name: 'default',
            value: undefined
        },
        {
            name: 'non default',
            value: { port: 8105, protocol: 'https' }
        }
    ].forEach((connectionConf) => {
        describe(`.getAuthToken() (connection = ${connectionConf.name})`, () => {
            const host = 'remote.host';
            const user1 = {
                username: 'test_user_1',
                passphrase: 'test_passphrase_1'
            };
            const user2 = {
                username: 'test_user_2',
                passphrase: 'test_passphrase_2'
            };
            let authMock;
            let connection;

            function makeRequestOptions(options = {}) {
                if (Object.keys(options).length === 0 && typeof connection === 'undefined') {
                    return undefined;
                }
                return Object.assign({}, connection, options);
            }

            beforeEach(() => {
                connection = connectionConf.value;
                const bigip = new BigIpApiMock(host, {
                    port: (connection && connection.port) || undefined,
                    protocol: (connection && connection.protocol) || undefined
                });
                authMock = bigip.mockAuth(/test_user/, /test_passphrase/);
            });

            it('should get an auth token', async () => {
                let token = 0;

                authMock.interceptor.times(2);
                authMock.stub.callsFake(() => {
                    token += 1;
                    return [200, { token: { token: `${token}` } }];
                });

                await assert.becomes(
                    deviceUtil.getAuthToken(host, user1.username, user1.passphrase, makeRequestOptions()),
                    { token: '1' }
                );

                await assert.becomes(
                    deviceUtil.getAuthToken(host, user2.username, user2.passphrase, makeRequestOptions()),
                    { token: '2' }
                );
            });

            it('should not cache tokens', async () => {
                let token = 0;

                authMock.interceptor.times(2);
                authMock.stub.callsFake(() => {
                    token += 1;
                    return [200, { token: { token: `${token}` } }];
                });

                await assert.becomes(
                    deviceUtil.getAuthToken(host, user1.username, user1.passphrase, makeRequestOptions()),
                    { token: '1' }
                );

                await assert.becomes(
                    deviceUtil.getAuthToken(host, user1.username, user1.passphrase, makeRequestOptions()),
                    { token: '2' }
                );
            });

            it('should return null auth token for localhost', async () => {
                authMock.remove();

                await assert.becomes(
                    deviceUtil.getAuthToken(constants.LOCAL_HOST),
                    { token: null }
                );
            });

            it('should fail to get auth token when no username and/or no passphrase', async () => {
                authMock.remove();

                await assert.isRejected(deviceUtil.getAuthToken(host), /username should be a string/);
                await assert.isRejected(deviceUtil.getAuthToken(host, ''), /username should be a non-empty/);
                await assert.isRejected(deviceUtil.getAuthToken(host, 'test_user_1'), /passphrase should be a string/);
                await assert.isRejected(deviceUtil.getAuthToken(host, 'test_user_1', ''), /passphrase should be a non-empty/);
            });
        });
    });

    describe('.getDeviceType()', () => {
        let bigip;
        let deviceTypeStub;

        beforeEach(() => {
            bigip = new BigIpApiMock(constants.LOCAL_HOST);
            deviceTypeStub = bigip.mockDeviceType();
            deviceUtil.clearHostDeviceInfo();
        });

        it('should get container device type when /VERSION file is absent', () => {
            deviceTypeStub.rejects(new Error('expected read file error'));
            return assert.becomes(
                deviceUtil.getDeviceType(),
                constants.DEVICE_TYPE.CONTAINER
            );
        });

        it('should get container device type when /VERSION has no desired data', () => {
            deviceTypeStub.returns(['something else']);
            return assert.becomes(
                deviceUtil.getDeviceType(),
                constants.DEVICE_TYPE.CONTAINER
            );
        });

        it('should get BIG-IP device type', () => assert.becomes(
            deviceUtil.getDeviceType(),
            constants.DEVICE_TYPE.BIG_IP
        ));

        it('should read result from cache', async () => {
            bigip.addPasswordlessUser('admin');
            bigip.mockDeviceVersion();

            await deviceUtil.gatherHostDeviceInfo();
            await assert.becomes(deviceUtil.getDeviceType(), constants.DEVICE_TYPE.BIG_IP);
            assert.deepStrictEqual(deviceTypeStub.callCount, 1);
        });

        it('should not read result from cache', async () => {
            bigip.addPasswordlessUser('admin');
            bigip.mockDeviceVersion();

            await deviceUtil.gatherHostDeviceInfo();
            await assert.becomes(deviceUtil.getDeviceType(true), constants.DEVICE_TYPE.BIG_IP);
            assert.deepStrictEqual(deviceTypeStub.callCount, 1);

            deviceTypeStub.callsFake(() => Buffer.from('test'));
            await assert.becomes(deviceUtil.getDeviceType(false), constants.DEVICE_TYPE.CONTAINER);
            assert.deepStrictEqual(deviceTypeStub.callCount, 2);
        });
    });
});
