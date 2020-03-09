/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const childProcess = require('child_process');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const nock = require('nock');
const request = require('request');
const sinon = require('sinon');
const urllib = require('url');

const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const deviceUtilTestsData = require('./deviceUtilTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Device Util', () => {
    afterEach(() => {
        testUtil.checkNockActiveMocks(nock, assert);
        nock.cleanAll();
        sinon.restore();
    });

    describe('Host Device Info', () => {
        beforeEach(() => {
            deviceUtil.clearHostDeviceInfo();
        });

        it('should gather device info', () => {
            sinon.stub(deviceUtil, 'getDeviceType').resolves(constants.DEVICE_TYPE.BIG_IP);
            sinon.stub(deviceUtil, 'getDeviceVersion').resolves({ version: '14.0.0' });
            return deviceUtil.gatherHostDeviceInfo()
                .then(() => {
                    assert.deepStrictEqual(
                        deviceUtil.getHostDeviceInfo(),
                        {
                            TYPE: 'BIG-IP',
                            VERSION: { version: '14.0.0' },
                            RETRIEVE_SECRETS_FROM_TMSH: false
                        }
                    );
                });
        });

        it('should set and get info by key', () => {
            deviceUtil.setHostDeviceInfo('key1', 'value1');
            deviceUtil.setHostDeviceInfo('key2', { value2: 10 });
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key1'), 'value1');
            assert.deepStrictEqual(deviceUtil.getHostDeviceInfo('key2'), { value2: 10 });
        });

        it('should remove key', () => {
            deviceUtil.setHostDeviceInfo('key1', 'value1');
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key1'), 'value1');
            deviceUtil.clearHostDeviceInfo('key1');
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key1'), undefined);
            assert.deepStrictEqual(deviceUtil.getHostDeviceInfo(), {});
        });

        it('should remove keys', () => {
            deviceUtil.setHostDeviceInfo('key1', 'value1');
            deviceUtil.setHostDeviceInfo('key2', 'value2');
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key1'), 'value1');
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key2'), 'value2');
            deviceUtil.clearHostDeviceInfo('key1', 'key2');
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key1'), undefined);
            assert.strictEqual(deviceUtil.getHostDeviceInfo('key2'), undefined);
            assert.deepStrictEqual(deviceUtil.getHostDeviceInfo(), {});
        });
    });

    describe('.getDeviceType()', () => {
        beforeEach(() => {
            deviceUtil.clearHostDeviceInfo();
        });

        it('should get container device type when /VERSION file is absent', () => {
            sinon.stub(fs, 'readFile').callsFake((first, cb) => {
                cb(new Error('foo'), null);
            });
            return assert.becomes(
                deviceUtil.getDeviceType(),
                constants.DEVICE_TYPE.CONTAINER,
                'incorrect device type, should be CONTAINER'
            );
        });

        it('should get container device type when /VERSION has no desired data', () => {
            sinon.stub(fs, 'readFile').callsFake((first, cb) => {
                cb(null, deviceUtilTestsData.getDeviceType.incorrectData);
            });
            return assert.becomes(
                deviceUtil.getDeviceType(),
                constants.DEVICE_TYPE.CONTAINER,
                'incorrect device type, should be CONTAINER'
            );
        });

        it('should get BIG-IP device type', () => {
            sinon.stub(fs, 'readFile').callsFake((first, cb) => {
                cb(null, deviceUtilTestsData.getDeviceType.correctData);
            });
            return assert.becomes(
                deviceUtil.getDeviceType(),
                constants.DEVICE_TYPE.BIG_IP,
                'incorrect device type, should be BIG-IP'
            );
        });

        it('should process /VERSION file correctly when readFile returns Buffer instead of String', () => {
            sinon.stub(fs, 'readFile').callsFake((first, cb) => {
                cb(null, Buffer.from(deviceUtilTestsData.getDeviceType.correctData));
            });
            return assert.becomes(
                deviceUtil.getDeviceType(),
                constants.DEVICE_TYPE.BIG_IP,
                'incorrect device type, should be BIG-IP'
            );
        });

        it('should read result from cache', () => {
            const readFileStub = sinon.stub(fs, 'readFile');
            readFileStub.callsFake((first, cb) => {
                cb(null, deviceUtilTestsData.getDeviceType.correctData);
            });
            sinon.stub(deviceUtil, 'getDeviceVersion').resolves({ version: '14.0.0' });
            return deviceUtil.gatherHostDeviceInfo()
                .then(() => deviceUtil.getDeviceType())
                .then((deviceType) => {
                    assert.strictEqual(deviceType, constants.DEVICE_TYPE.BIG_IP, 'incorrect device type, should be BIG-IP');
                    assert.strictEqual(readFileStub.callCount, 1);
                });
        });
    });

    describe('.downloadFileFromDevice()', () => {
        const dstPath = `${os.tmpdir()}/testDownloadFileUserStream`;
        const cleanUp = () => {
            if (fs.existsSync(dstPath)) {
                fs.unlinkSync(dstPath);
            }
        };

        beforeEach(cleanUp);
        afterEach(cleanUp);

        it('should fail to write data to file', () => {
            const response = 'response';
            testUtil.mockEndpoints([{
                endpoint: '/uri/to/path',
                response,
                responseHeaders: {
                    'content-range': `0-${response.length - 1}/${response.length}`,
                    'content-length': response.length
                }
            }]);
            return assert.isRejected(
                deviceUtil.downloadFileFromDevice('/non-existing/path', constants.LOCAL_HOST, '/uri/to/path'),
                /downloadFileFromDevice.*no such file or directory/
            );
        });

        it('should fail on invalid response on attempt to download file', () => {
            const response = 'response';
            testUtil.mockEndpoints([{
                endpoint: '/uri/to/path',
                response,
                responseHeaders: {
                    'content-length': response.length
                }
            }]);
            return assert.isRejected(
                deviceUtil.downloadFileFromDevice(fs.createWriteStream(dstPath), constants.LOCAL_HOST, '/uri/to/path'),
                /HTTP Error:/
            );
        });

        it('should able to download file to provided stream', () => {
            const response = 'response';
            testUtil.mockEndpoints([{
                endpoint: '/uri/to/path',
                response,
                responseHeaders: {
                    'content-range': `0-${response.length - 1}/${response.length}`,
                    'content-length': response.length
                }
            }]);
            return deviceUtil.downloadFileFromDevice(dstPath, constants.LOCAL_HOST, '/uri/to/path')
                .then(() => {
                    const contents = fs.readFileSync(dstPath);
                    assert.ok(contents.equals(Buffer.from(response)), 'should equal to origin Buffer');
                });
        });

        it('should fail to download file when content-range is invalid', () => {
            const response = 'response';
            testUtil.mockEndpoints([{
                endpoint: '/uri/to/path',
                response,
                responseHeaders: {
                    'content-range': `0-${response.length - 3}/${response.length - 2}`,
                    'content-length': response.length
                },
                options: {
                    times: 2
                }
            }]);
            return assert.isRejected(
                deviceUtil.downloadFileFromDevice(dstPath, constants.LOCAL_HOST, '/uri/to/path'),
                /Exceeded expected size/
            );
        });

        it('should fail to download file (response code !== 200)', () => {
            const response = 'response';
            testUtil.mockEndpoints([{
                endpoint: '/uri/to/path',
                code: 404,
                response,
                responseHeaders: {
                    'content-range': `0-${response.length - 1}/${response.length}`,
                    'content-length': response.length
                },
                options: {
                    times: 5
                }
            }]);
            return assert.isRejected(
                deviceUtil.downloadFileFromDevice(dstPath, constants.LOCAL_HOST, '/uri/to/path'),
                /Exceeded number of attempts on HTTP error/
            );
        });
    });

    describe('.runTMUtilUnixCommand()', () => {
        it('should fail on attempt to execute invalid unix command', () => assert.throws(
            () => deviceUtil.runTMUtilUnixCommand('cp'),
            /runTMUtilUnixCommand: invalid command/
        ));

        it('should fail on attempt to list non-existing folder', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/util/unix-ls',
                method: 'post',
                response: {
                    commandResult: '/bin/ls: cannot access /config1: No such file or directory\n'
                }
            }]);
            return assert.isRejected(
                deviceUtil.runTMUtilUnixCommand('ls', '/config1', constants.LOCAL_HOST),
                /No such file or directory/
            );
        });

        it('should fail on attempt to move non-existing folder', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/util/unix-mv',
                method: 'post',
                response: {
                    commandResult: 'some error here'
                }
            }]);
            return assert.isRejected(
                deviceUtil.runTMUtilUnixCommand('mv', '/config1', constants.LOCAL_HOST),
                /some error here/
            );
        });

        it('should fail on attempt to remove non-existing folder', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/util/unix-rm',
                method: 'post',
                response: {
                    commandResult: 'some error here'
                }
            }]);
            return assert.isRejected(
                deviceUtil.runTMUtilUnixCommand('rm', '/config1', constants.LOCAL_HOST),
                /some error here/
            );
        });

        it('should pass on attempt to remove/move folder', () => {
            testUtil.mockEndpoints([{
                endpoint: /\/mgmt\/tm\/util\/unix-(rm|mv)/,
                method: 'post',
                response: {},
                options: {
                    times: 2
                }
            }]);
            return assert.isFulfilled(deviceUtil.runTMUtilUnixCommand('rm', '/config1', constants.LOCAL_HOST)
                .then(() => deviceUtil.runTMUtilUnixCommand('mv', '/config1', constants.LOCAL_HOST)));
        });

        it('should pass on attempt to list folder', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/util/unix-ls',
                method: 'post',
                response: {
                    commandResult: 'something'
                }
            }]);
            return assert.becomes(
                deviceUtil.runTMUtilUnixCommand('ls', '/config1', constants.LOCAL_HOST),
                'something'
            );
        });
    });

    describe('.getDeviceVersion()', () => {
        it('should return device version', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '14.1.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            }]);
            const expected = {
                version: '14.1.0',
                buildInfo: '0.0.1'
            };
            return assert.becomes(
                deviceUtil.getDeviceVersion(constants.LOCAL_HOST),
                expected
            );
        });

        it('should fail on return device version', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/sys/version',
                code: 400,
                response: {}
            }]);
            return assert.isRejected(
                deviceUtil.getDeviceVersion(constants.LOCAL_HOST),
                /getDeviceVersion:/
            );
        });
    });

    describe('.makeDeviceRequest()', () => {
        it('should preserve device\'s default port, protocol, HTTP method and etc.', () => {
            testUtil.mockEndpoints(
                [{
                    endpoint: '/uri/something',
                    requestHeaders: {
                        'x-f5-auth-token': 'authToken',
                        'User-Agent': constants.USER_AGENT
                    },
                    response: 'something'
                }],
                {
                    host: '1.1.1.1',
                    port: constants.DEVICE_DEFAULT_PORT,
                    proto: constants.DEVICE_DEFAULT_PROTOCOL
                }
            );
            const opts = {
                headers: {
                    'x-f5-auth-token': 'authToken'
                },
                credentials: {
                    token: 'newToken',
                    username: 'username'
                }
            };
            return assert.becomes(
                deviceUtil.makeDeviceRequest('1.1.1.1', '/uri/something', opts),
                'something'
            );
        });

        it('should use token instead of username', () => {
            testUtil.mockEndpoints([{
                endpoint: '/',
                requestHeaders: {
                    'x-f5-auth-token': 'validToken'
                },
                response: 'something'
            }]);
            const opts = {
                credentials: {
                    token: 'validToken'
                }
            };
            return assert.becomes(
                deviceUtil.makeDeviceRequest('localhost', '/', opts),
                'something'
            );
        });

        it('should correctly encode username for auth header', () => {
            testUtil.mockEndpoints([{
                endpoint: '/',
                requestHeaders: {
                    Authorization: `Basic ${Buffer.from('username:').toString('base64')}`
                },
                response: 'something'
            }]);
            const opts = {
                credentials: {
                    username: 'username'
                }
            };
            return assert.becomes(
                deviceUtil.makeDeviceRequest('localhost', '/', opts),
                'something'
            );
        });
    });

    describe('.executeShellCommandOnDevice()', () => {
        it('should execute shell command', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/util/bash',
                method: 'post',
                request: {
                    command: 'run',
                    utilCmdArgs: '-c "echo something"'
                },
                response: {
                    commandResult: 'something'
                }
            }]);
            return assert.becomes(
                deviceUtil.executeShellCommandOnDevice(constants.LOCAL_HOST, 'echo something'),
                'something'
            );
        });

        it('should fail on execute shell command', () => {
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/util/bash',
                code: 400,
                method: 'post',
                request: {
                    command: 'run',
                    utilCmdArgs: '-c "echo something"'
                }
            }]);
            return assert.isRejected(
                deviceUtil.executeShellCommandOnDevice(constants.LOCAL_HOST, 'echo something'),
                /executeShellCommandOnDevice:/
            );
        });
    });

    describe('.getAuthToken()', () => {
        it('should fail to get an auth token', () => {
            testUtil.mockEndpoints(
                [{
                    endpoint: '/mgmt/shared/authn/login',
                    code: 404,
                    method: 'post',
                    request: {
                        username: 'username',
                        password: 'password',
                        loginProviderName: 'tmos'
                    }
                }],
                {
                    host: 'example.com'
                }
            );
            return assert.isRejected(
                deviceUtil.getAuthToken('example.com', 'username', 'password'),
                /requestAuthToken:/
            );
        });

        it('should get an auth token', () => {
            testUtil.mockEndpoints(
                [{
                    endpoint: '/mgmt/shared/authn/login',
                    code: 200,
                    method: 'post',
                    request: {
                        username: 'username',
                        password: 'password',
                        loginProviderName: 'tmos'
                    },
                    response: {
                        token: {
                            token: 'token'
                        }
                    }
                }],
                {
                    host: 'example.com'
                }
            );
            return assert.becomes(
                deviceUtil.getAuthToken('example.com', 'username', 'password'),
                { token: 'token' }
            );
        });

        it('should return null auth token for localhost', () => assert.becomes(
            deviceUtil.getAuthToken('localhost'),
            { token: null }
        ));

        it('should fail to get auth token when no username and/or no password', () => assert.isRejected(
            deviceUtil.getAuthToken('example.com'),
            /getAuthToken: Username/
        ));
    });

    describe('.encryptSecret()', () => {
        beforeEach(() => {
            sinon.stub(crypto, 'randomBytes').returns('test');
            deviceUtil.clearHostDeviceInfo();
        });

        it('should use cached device info on attempt to encrypt data', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret['encrypt-14.0.0']);
            sinon.stub(deviceUtil, 'getDeviceType').resolves(constants.DEVICE_TYPE.BIG_IP);
            return deviceUtil.gatherHostDeviceInfo()
                .then(() => deviceUtil.encryptSecret('foo'))
                .then((encryptedData) => {
                    assert.strictEqual(encryptedData, 'secret');
                });
        });

        it('should encrypt secret and retrieve it via REST API when software version is 14.0.0', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret['encrypt-14.0.0']);
            return assert.becomes(
                deviceUtil.encryptSecret('foo', true),
                'secret'
            );
        });

        it('should encrypt secret and retrieve it from device via TMSH when software version is 14.1.x', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret['encrypt-14.1.x']);
            return assert.becomes(
                deviceUtil.encryptSecret('foo', true),
                'secret'
            );
        });

        it('should encrypt secret and retrieve it via REST API when software version is 15.0.0', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret['encrypt-15.0.0']);
            return assert.becomes(
                deviceUtil.encryptSecret('foo', true),
                'secret'
            );
        });

        it('should encrypt data that is 1k characters long', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret.encrypt1kSecret);
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
                deviceUtil.encryptSecret(secret, true),
                'secret,secret'
            );
        });

        it('should chunk large secrets and preserve newlines when encrypting secrets', () => {
            const radiusRequests = [];
            testUtil.mockEndpoints([{
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                request: (body) => {
                    radiusRequests.push(body.secret);
                    return true;
                },
                response: {
                    secret: 'secret'
                },
                options: {
                    times: 2
                }
            }]);
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret.encrypt1kSecretWithNewLines);
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

            return deviceUtil.encryptSecret(largeSecret, true)
                .then(() => {
                    const requestSecret = radiusRequests[0];
                    assert.strictEqual(radiusRequests.length, 2, 'largeSecret should be in 2 chunks');
                    assert.strictEqual(requestSecret.length, 500, 'length of chunk should be 500');
                    assert.ok(new RegExp(/\n/).test(requestSecret), 'newlines should be preserved');
                });
        });

        it('should fail when unable to encrypt secret', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret.errorResponseExample);
            return assert.isRejected(
                deviceUtil.encryptSecret('foo', true),
                /Bad status code: 400/
            );
        });

        it('should fail when encrypted secret has comma', () => {
            testUtil.mockEndpoints(deviceUtilTestsData.encryptSecret.errorWhenResponseHasComma);
            return assert.isRejected(
                deviceUtil.encryptSecret('foo', true),
                /Encrypted data should not have a comma in it/
            );
        });
    });

    describe('.decryptSecret()', () => {
        it('should decrypt secret', () => {
            sinon.stub(childProcess, 'execFile').callsFake((cmd, args, cb) => {
                cb(null, 'secret', null);
            });
            return assert.becomes(
                deviceUtil.decryptSecret('foo'),
                'secret'
            );
        });

        it('should fail when unable to decrypt secret', () => {
            sinon.stub(childProcess, 'execFile').callsFake((cmd, args, cb) => {
                cb(new Error('decrypt error'), null, 'stderr');
            });
            return assert.isRejected(
                deviceUtil.decryptSecret('foo'),
                /decryptSecret exec error.*decrypt error.*stderr/
            );
        });
    });

    describe('.decryptAllSecrets()', () => {
        it('should decrypt all secrets', () => {
            sinon.stub(childProcess, 'execFile').callsFake((cmd, args, cb) => {
                cb(null, 'secret', null);
            });
            sinon.stub(process, 'env').value({ MY_SECRET_TEST_VAR: 'envSecret' });

            const declaration = {
                My_Consumer: {
                    class: 'Consumer',
                    passphrase: {
                        class: 'Secret',
                        cipherText: 'foo'
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
                        someUnknownKey: 'foo'
                    }
                },
                My_Consumer5: {
                    class: 'Consumer',
                    otherkey: {
                        class: 'Secret',
                        cipherText: 'foo'
                    }
                }
            };
            const expected = {
                My_Consumer: {
                    class: 'Consumer',
                    passphrase: 'secret'
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
                    otherkey: 'secret'
                }
            };
            return assert.becomes(
                deviceUtil.decryptAllSecrets(declaration),
                expected
            );
        });
    });

    describe('.transformTMOSobjectName()', () => {
        it('should fail when subPath passed without partition', () => assert.throws(
            () => deviceUtil.transformTMOSobjectName('', '', 'subPath'),
            /transformTMOSobjectName:/
        ));

        it('should correctly transform TMOS object name', () => {
            assert.strictEqual(deviceUtil.transformTMOSobjectName('partition', 'name', 'subPath'), '~partition~subPath~name');
            assert.strictEqual(deviceUtil.transformTMOSobjectName('partition', '/name/name', 'subPath'), '~partition~subPath~~name~name');
            assert.strictEqual(deviceUtil.transformTMOSobjectName('partition', '/name/name', 'subPath'), '~partition~subPath~~name~name');
            assert.strictEqual(deviceUtil.transformTMOSobjectName('', 'name'), 'name');
        });
    });
});

// purpose: validate util (DeviceAsyncCLI)
describe('Device Util (DeviceAsyncCLI)', () => {
    afterEach(() => {
        sinon.restore();
    });

    let parseURL;
    if (process.versions.node.startsWith('4.')) {
        parseURL = urllib.parse;
    } else {
        parseURL = url => new urllib.URL(url);
    }

    const testScriptName = 'testScriptName';
    const testScriptCode = 'testScriptCode';
    const testTaskID = 'taskID';
    const mockedHTTPmethods = ['get', 'post', 'put', 'delete', 'patch'];

    let testsParametrization = [
        {
            objectMethod: '_createTemporaryCLIscriptOnDevice',
            args: [
                [{ name: testScriptName, code: testScriptCode }]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/cli/script',
                    method: {
                        POST: [
                            {
                                success: true,
                                response: {
                                    code: [200, 404, 409],
                                    body: ['something', { code: 404 }, { code: 409 }, {}]
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_updateTemporaryCLIscriptOnDevice',
            args: [
                [{ name: testScriptName, code: testScriptCode, opts: { partition: '', subPath: '' } }],
                [{ name: testScriptName, code: testScriptCode, opts: { partition: 'Common', subPath: '' } }],
                [{ name: testScriptName, code: testScriptCode, opts: { partition: 'Common', subPath: 'subPath' } }]
            ],
            uri: [
                {
                    uri: [
                        '/mgmt/tm/cli/script/testScriptName',
                        '/mgmt/tm/cli/script/~Common~testScriptName',
                        '/mgmt/tm/cli/script/~Common~subPath~testScriptName'
                    ],
                    method: {
                        PUT: [
                            {
                                success: true,
                                response: {
                                    code: 200,
                                    body: {}
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Failed to update temporary cli script on device',
                                response: {
                                    code: 404,
                                    body: {}
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_createAsyncTaskOnDevice',
            args: [
                [{ name: testScriptName }, 'command']
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script',
                    method: {
                        POST: [
                            {
                                success: true,
                                response: {
                                    code: 200,
                                    body: { _taskId: testTaskID }
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Failed to create the async task on the device',
                                response: {
                                    code: 200,
                                    body: ['something', {}]
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_execAsyncTaskOnDevice',
            args: [
                [testTaskID]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script/taskID',
                    method: {
                        PUT: [
                            {
                                success: true,
                                response: {
                                    code: [200, 400],
                                    body: {}
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Failed to execute the async task on the device',
                                response: {
                                    code: [200, 400],
                                    body: 'something'
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_waitForAsyncTaskToFinishOnDevice',
            args: [
                [testTaskID, 0]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script/taskID/result',
                    method: {
                        GET: [
                            {
                                success: true,
                                response: {
                                    code: [200, 400],
                                    body: [{ _taskState: 'COMPLETED' }, { _taskState: 'INPROGRESS' }, 'something', {}]
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Task failed unexpectedly',
                                response: {
                                    code: [200, 400],
                                    body: { _taskState: 'FAILED' }
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_removeTemporaryCLIscriptFromDevice',
            args: [
                [{ name: testScriptName, code: testScriptCode, opts: { partition: '', subPath: '' } }],
                [{ name: testScriptName, code: testScriptCode, opts: { partition: 'Common', subPath: '' } }],
                [{ name: testScriptName, code: testScriptCode, opts: { partition: 'Common', subPath: 'subPath' } }]
            ],
            uri: [
                {
                    uri: [
                        '/mgmt/tm/cli/script/testScriptName',
                        '/mgmt/tm/cli/script/~Common~testScriptName',
                        '/mgmt/tm/cli/script/~Common~subPath~testScriptName'
                    ],
                    method: {
                        DELETE: [
                            {
                                success: true,
                                response: {
                                    code: 200,
                                    body: {}
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Failed to remove the temporary cli script from the device',
                                response: {
                                    code: 404,
                                    body: {}
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_removeAsyncTaskResultsFromDevice',
            args: [
                [testTaskID]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script/taskID/result',
                    method: {
                        DELETE: [
                            {
                                success: true,
                                response: {
                                    code: 200,
                                    body: {}
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Failed to delete the async task results from the device',
                                response: {
                                    code: 404,
                                    body: {}
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_removeAsyncTaskFromDevice',
            args: [
                [testTaskID]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script/taskID',
                    method: {
                        DELETE: [
                            {
                                success: true,
                                response: {
                                    code: 200,
                                    body: {}
                                }
                            },
                            {
                                success: false,
                                errMsg: 'Failed to delete the async task from the device',
                                response: {
                                    code: 404,
                                    body: {}
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_removeAsyncTaskResultsFromDevice',
            testName: '_removeAsyncTaskResultsFromDevice + errOk === true',
            args: [
                [testTaskID, true]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script/taskID/result',
                    method: {
                        DELETE: [
                            {
                                success: true,
                                errMsg: 'Failed to delete the async task results from the device',
                                response: {
                                    code: 404,
                                    body: {}
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            objectMethod: '_removeAsyncTaskFromDevice',
            testName: '_removeAsyncTaskFromDevice + errOk === true',
            args: [
                [testTaskID, true]
            ],
            uri: [
                {
                    uri: '/mgmt/tm/task/cli/script/taskID',
                    method: {
                        DELETE: [
                            {
                                success: true,
                                errMsg: 'Failed to delete the async task from the device',
                                response: {
                                    code: 404,
                                    body: {}
                                }
                            }
                        ]
                    }
                }
            ]
        }
    ];

    function cloneExpectedResponses(expectedResponse, result) {
        let multiItems;
        let multiKey;

        result = result === undefined ? [] : result;

        if (Array.isArray(expectedResponse.response.code)) {
            multiItems = expectedResponse.response.code;
            multiKey = 'code';
        } else if (Array.isArray(expectedResponse.response.body)) {
            multiItems = expectedResponse.response.body;
            multiKey = 'body';
        }
        if (!multiItems) {
            const copy = JSON.parse(JSON.stringify(expectedResponse));
            copy.id = result.length;
            result.push(copy);
        } else {
            multiItems.forEach((item) => {
                const newResponse = JSON.parse(JSON.stringify(expectedResponse));
                newResponse.response[multiKey] = item;
                cloneExpectedResponses(newResponse, result);
            });
        }
    }

    function createTestData(testParams) {
        const newTestURIs = {};
        let totalResponses = 0;
        testParams.uri.forEach((testURIdata) => {
            const testMethods = testURIdata.method;
            Object.keys(testMethods).forEach((testMethod) => {
                const responses = testMethods[testMethod];
                testMethods[testMethod] = [];
                responses.forEach((oldResponse) => {
                    cloneExpectedResponses(oldResponse, testMethods[testMethod]);
                });
                totalResponses += testMethods[testMethod].length;
            });
            if (Array.isArray(testURIdata.uri)) {
                testURIdata.uri.forEach((testURI) => {
                    newTestURIs[testURI] = testURIdata.method;
                });
            } else {
                newTestURIs[testURIdata.uri] = testURIdata.method;
            }
        });

        testParams.uri = newTestURIs;
        testParams.totalResponses = totalResponses;

        let newTestParams = [testParams];

        if (Array.isArray(testParams.args)) {
            if (testParams.args.length === 1) {
                testParams.args = testParams.args[0];
            } else {
                newTestParams = [];
                let i = 0;

                testParams.args.forEach((argSet) => {
                    newTestParams.push({
                        objectMethod: testParams.objectMethod,
                        name: `${testParams.objectMethod} args[${i}]`,
                        args: argSet,
                        totalResponses: testParams.totalResponses,
                        uri: testParams.uri
                    });
                    i += 1;
                });
            }
        }
        return newTestParams;
    }

    const newTestsParametrization = [];
    testsParametrization.forEach((t) => {
        createTestData(t).forEach((td) => {
            newTestsParametrization.push(td);
        });
    });
    testsParametrization = newTestsParametrization;

    function mockedResponse(uris, options) {
        const touchedResponses = {};

        return function (opts, cb) {
            const method = opts.method;
            const pathname = parseURL(opts.uri).pathname;
            const counters = options.counters;
            const expectedErrors = options.expectedErrors;

            let responses;
            let response;

            try {
                responses = uris[pathname][method];
            } catch (err) {
                // do nothing
            }

            if (!responses) {
                throw new Error(`No response for ${method} ${pathname}`);
            }

            if (touchedResponses[pathname] === undefined) {
                touchedResponses[pathname] = [];
            }

            for (let i = 0; i < responses.length; i += 1) {
                response = responses[i];
                if (!touchedResponses[pathname][response.id]) {
                    touchedResponses[pathname][response.id] = 1;
                    counters.touched += 1;
                    break;
                }
            }

            if (!response.success) {
                expectedErrors.push(response.errMsg);
            }
            const res = {
                statusCode: response.response.code,
                statusMessage: `MOCK HTTP ${method}`
            };
            cb(null, res, response.response.body);
        };
    }

    function runMethodTesting(testData, options) {
        const expectedErrors = options.expectedErrors;

        if (expectedErrors.length) {
            const msg = 'expectedErrors are not empty, looks like something went wrong.';
            assert.fail(msg);
            return Promise.reject(new Error(msg));
        }
        // ideally all testSets should be covered
        const dacli = new deviceUtil.DeviceAsyncCLI('localhost');
        const args = testData.args || [null];

        return deviceUtil.DeviceAsyncCLI.prototype[testData.objectMethod].apply(dacli, args)
            .catch((err) => {
                let expected = false;
                for (let i = 0; i < expectedErrors.length; i += 1) {
                    if (err.message.search(expectedErrors[i]) !== -1) {
                        expected = true;
                        break;
                    }
                }
                options.expectedErrors = [];

                if (!expected) {
                    const msg = `Unexpected error: ${err.message}. Expected: ${JSON.stringify(expectedErrors)}`;
                    assert.fail(msg);
                    return Promise.reject(new Error(msg));
                }
                return Promise.resolve();
            })
            .then(() => {
                if (options.counters.touched < options.validResponsesNo) {
                    return runMethodTesting(testData, options);
                }
                return Promise.resolve();
            });
    }

    testsParametrization.forEach((testParams) => {
        it(`should pass basic response test for ${testParams.testName || testParams.objectMethod}`, () => {
            const uris = testParams.uri;
            const options = {
                expectedErrors: [],
                counters: { touched: 0 },
                validResponsesNo: testParams.totalResponses
            };

            const responder = mockedResponse(uris, options);
            mockedHTTPmethods.forEach((method) => {
                sinon.stub(request, method).callsFake(responder);
            });
            return runMethodTesting(testParams, options);
        });
    });

    it('should pass basic response test for execute', () => {
        const responseBody = {
            _taskId: testTaskID,
            _taskState: 'COMPLETED'
        };
        const response = {
            statusCode: 200,
            statusMessage: 'MOCK HTTP'
        };

        const responder = (opts, cb) => {
            cb(null, response, responseBody);
        };
        mockedHTTPmethods.forEach((method) => {
            sinon.stub(request, method).callsFake(responder);
        });

        // ideally all testSets should be covered
        const dacli = new deviceUtil.DeviceAsyncCLI('localhost');
        dacli.scriptName = testScriptName;
        dacli.retryDelay = 0;
        return dacli.execute('command');
    });

    it('should work with token', () => {
        const responseBody = {
            _taskId: testTaskID,
            _taskState: 'COMPLETED'
        };
        const response = {
            statusCode: 200,
            statusMessage: 'MOCK HTTP'
        };

        const responder = (opts, cb) => {
            cb(null, response, responseBody);
        };
        mockedHTTPmethods.forEach((method) => {
            sinon.stub(request, method).callsFake(responder);
        });

        // ideally all testSets should be covered
        const dacli = new deviceUtil.DeviceAsyncCLI('localhost', { credentials: { token: 'token' } });
        dacli.scriptName = testScriptName;
        dacli.retryDelay = 0;
        return dacli.execute('command');
    });

    it('should work with empty host', () => {
        const responseBody = {
            _taskId: testTaskID,
            _taskState: 'COMPLETED'
        };
        const response = {
            statusCode: 200,
            statusMessage: 'MOCK HTTP'
        };

        const responder = (opts, cb) => {
            cb(null, response, responseBody);
        };
        mockedHTTPmethods.forEach((method) => {
            sinon.stub(request, method).callsFake(responder);
        });

        // ideally all testSets should be covered
        const dacli = new deviceUtil.DeviceAsyncCLI();
        dacli.scriptName = testScriptName;
        dacli.retryDelay = 0;
        dacli.token = 'token';
        return dacli.execute('command');
    });

    it('should fail when response with error', () => {
        const responseBody = {
            _taskId: testTaskID,
            _taskState: 'FAILED',
            code: 409
        };
        const response = {
            statusCode: 404,
            statusMessage: 'MOCK HTTP'
        };

        const responder = (opts, cb) => {
            cb(null, response, responseBody);
        };
        mockedHTTPmethods.forEach((method) => {
            sinon.stub(request, method).callsFake(responder);
        });

        // ideally all testSets should be covered
        const dacli = new deviceUtil.DeviceAsyncCLI('localhost');
        dacli.scriptName = testScriptName;
        dacli.retryDelay = 0;
        return assert.isRejected(dacli.execute('command'));
    });

    it('should parse init params correctly', () => {
        let dacli = new deviceUtil.DeviceAsyncCLI();
        assert.strictEqual(dacli.host, constants.LOCAL_HOST);

        dacli = new deviceUtil.DeviceAsyncCLI({});
        assert.strictEqual(dacli.host, constants.LOCAL_HOST);

        dacli = new deviceUtil.DeviceAsyncCLI('host');
        assert.strictEqual(dacli.host, 'host');

        dacli = new deviceUtil.DeviceAsyncCLI({ opts: 'opts' });
        assert.strictEqual(dacli.options.opts, 'opts');

        dacli = new deviceUtil.DeviceAsyncCLI();
        assert.deepStrictEqual(dacli.options, { connection: {}, credentials: {} });

        dacli = new deviceUtil.DeviceAsyncCLI({});
        assert.deepStrictEqual(dacli.options, { connection: {}, credentials: {} });

        dacli = new deviceUtil.DeviceAsyncCLI({ something: 'something' });
        assert.deepStrictEqual(dacli.options, { connection: {}, credentials: {}, something: 'something' });

        dacli = new deviceUtil.DeviceAsyncCLI({ connection: { port: 80 }, credentials: { token: 'token' } });
        assert.deepStrictEqual(dacli.options, { connection: { port: 80 }, credentials: { token: 'token' } });

        dacli = new deviceUtil.DeviceAsyncCLI({ connection: { port: 80 } });
        assert.deepStrictEqual(dacli.options, { connection: { port: 80 }, credentials: {} });
    });
});
