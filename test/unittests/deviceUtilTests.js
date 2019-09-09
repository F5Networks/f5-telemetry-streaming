/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const urllib = require('url');

const constants = require('../../src/nodejs/constants.js');

/* eslint-disable global-require */

let parseURL;
if (process.versions.node.startsWith('4.')) {
    parseURL = urllib.parse;
} else {
    parseURL = url => new urllib.URL(url);
}

describe('Device Util', () => {
    let deviceUtil;
    let childProcess;
    let request;

    const setupRequestMock = (res, body, mockOpts) => {
        mockOpts = mockOpts || {};
        ['get', 'post', 'delete'].forEach((method) => {
            request[method] = (opts, cb) => {
                cb(mockOpts.err, res, mockOpts.toJSON === false ? body : JSON.stringify(body));
            };
        });
    };

    before(() => {
        deviceUtil = require('../../src/nodejs/deviceUtil.js');
        childProcess = require('child_process');
        request = require('request');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should get BIG-IP device type', () => {
        childProcess.exec = (cmd, cb) => { cb(null, cmd, null); };

        const BIG_IP_DEVICE_TYPE = constants.BIG_IP_DEVICE_TYPE;
        return deviceUtil.getDeviceType()
            .then((data) => {
                assert.strictEqual(data, BIG_IP_DEVICE_TYPE, 'incorrect device type');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should get container device type', () => {
        childProcess.exec = (cmd, cb) => { cb(new Error('foo'), null, null); };

        const CONTAINER_DEVICE_TYPE = constants.CONTAINER_DEVICE_TYPE;
        return deviceUtil.getDeviceType()
            .then((data) => {
                assert.strictEqual(data, CONTAINER_DEVICE_TYPE, 'incorrect device type');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail on non-valid response on attempt to download file', () => {
        const mockBody = 'somedata';
        const mockHeaders = {
            'content-length': mockBody.length
        };
        const mockRes = { statusCode: 200, statusMessage: 'message', headers: mockHeaders };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.downloadFileFromDevice('/wrong/path/to/file', constants.LOCAL_HOST, '/uri/to/path')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/HTTP Error:/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should able to download file to provided stream', () => {
        const expectedData = 'somedata';
        const mockHeaders = {
            'content-range': `0-${expectedData.length - 1}/${expectedData.length}`,
            'content-length': expectedData.length
        };
        const mockRes = { statusCode: 200, statusMessage: 'message', headers: mockHeaders };
        const mockBody = Buffer.from(expectedData);
        request.get = (opts, cb) => {
            cb(null, mockRes, mockBody);
        };

        const dstPath = `${os.tmpdir()}/testDownloadFileUserStream`;
        const dst = fs.createWriteStream(dstPath);

        return deviceUtil.downloadFileFromDevice(dst, constants.LOCAL_HOST, '/uri/to/path')
            .then(() => {
                const contents = fs.readFileSync(dstPath);
                assert.ok(contents.equals(mockBody), 'should equal to origin Buffer');
            });
    });

    it('should fail to download file when content-range is invalid', () => {
        const expectedData = 'somedata';
        const mockHeaders = {
            'content-range': `0-${expectedData.length - 3}/${expectedData.length - 2}`,
            'content-length': expectedData.length
        };
        const mockRes = { statusCode: 200, statusMessage: 'message', headers: mockHeaders };
        request.get = (opts, cb) => {
            cb(null, mockRes, Buffer.from(expectedData));
        };

        const dstPath = `${os.tmpdir()}/testDownloadFileUserStream`;

        return deviceUtil.downloadFileFromDevice(dstPath, constants.LOCAL_HOST, '/uri/to/path')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Exceeded expected size/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail to download file (response\' code !== 200)', () => {
        const expectedData = 'somedata';
        const mockHeaders = {
            'content-range': `0-${expectedData.length - 1}/${expectedData.length}`,
            'content-length': expectedData.length
        };
        const mockRes = { statusCode: 404, statusMessage: 'message', headers: mockHeaders };
        request.get = (opts, cb) => {
            cb(null, mockRes, Buffer.from(expectedData));
        };

        const dstPath = `${os.tmpdir()}/testDownloadFileUserStream`;
        const dst = fs.createWriteStream(dstPath);

        return deviceUtil.downloadFileFromDevice(dst, constants.LOCAL_HOST, '/uri/to/path')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Exceeded number of attempts on HTTP error/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail on attempt to execute invalid unix command', () => {
        assert.throws(
            () => {
                deviceUtil.runTMUtilUnixCommand('cp');
            },
            (err) => {
                if ((err instanceof Error) && /invalid command/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
    });

    it('should fail on attempt to list non-existing folder', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { commandResult: '/bin/ls: cannot access /config1: No such file or directory\n' };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.runTMUtilUnixCommand('ls', '/config1', constants.LOCAL_HOST)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/No such file or directory/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail on attempt to move non-existing folder', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { commandResult: 'some error here' };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.runTMUtilUnixCommand('mv', '/config1', constants.LOCAL_HOST)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/some error here/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail on attempt to remove non-existing folder', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { commandResult: 'some error here' };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.runTMUtilUnixCommand('rm', '/config1', constants.LOCAL_HOST)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/some error here/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should pass on attempt to remove/move folder', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = {};
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.runTMUtilUnixCommand('rm', '/config1', constants.LOCAL_HOST)
            .then(() => deviceUtil.runTMUtilUnixCommand('mv', '/config1', constants.LOCAL_HOST));
    });

    it('should pass on attempt to list folder', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { commandResult: 'something' };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.runTMUtilUnixCommand('ls', '/config1', constants.LOCAL_HOST);
    });

    it('should return device version', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = {
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
        };
        const expected = {
            version: '14.1.0',
            buildInfo: '0.0.1'
        };
        setupRequestMock(mockRes, mockBody);
        return deviceUtil.getDeviceVersion(constants.LOCAL_HOST)
            .then((data) => {
                assert.deepEqual(data, expected);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail on return device version', () => {
        const mockRes = { statusCode: 400, statusMessage: 'error' };
        const mockBody = {};
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.getDeviceVersion(constants.LOCAL_HOST)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/getDeviceVersion:/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should preserve device\'s default port, protocol, HTTP method and etc.', () => {
        const uri = '/uri/something';
        const authToken = 'token';

        request.get = (opts, cb) => {
            const parsedURL = parseURL(opts.uri);

            assert.strictEqual(parsedURL.pathname, uri);
            assert.strictEqual(parsedURL.protocol.slice(0, -1), constants.DEVICE_DEFAULT_PROTOCOL);
            assert.strictEqual(parseInt(parsedURL.port, 10), constants.DEVICE_DEFAULT_PORT);
            assert.strictEqual(opts.headers['x-f5-auth-token'], authToken);
            assert.strictEqual(opts.headers['User-Agent'], constants.USER_AGENT);

            const mockRes = { statusCode: 200, statusMessage: 'mockMessage' };
            const mockBody = { text: uri };
            cb(null, mockRes, mockBody);
        };

        const opts = {
            headers: {
                'x-f5-auth-token': authToken
            },
            credentials: {
                token: 'newToken',
                username: 'username'
            }
        };
        return deviceUtil.makeDeviceRequest('1.1.1.1', uri, opts)
            .then((body) => {
                assert.strictEqual(body.text, uri);
                Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should use token instead of username', () => {
        const authToken = 'validToken';

        request.get = (opts, cb) => {
            assert.strictEqual(opts.headers['x-f5-auth-token'], authToken);

            const mockRes = { statusCode: 200, statusMessage: 'mockMessage' };
            const mockBody = { text: 'success' };
            cb(null, mockRes, mockBody);
        };

        const opts = {
            credentials: {
                token: authToken
            }
        };
        return deviceUtil.makeDeviceRequest('1.1.1.1', '/', opts)
            .then((body) => {
                assert.strictEqual(body.text, 'success');
                Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should corretly encode username for auth header', () => {
        const username = 'username';
        const valid = `Basic ${Buffer.from(`${username}:`).toString('base64')}`;

        request.get = (opts, cb) => {
            assert.strictEqual(opts.headers.Authorization, valid);

            const mockRes = { statusCode: 200, statusMessage: 'mockMessage' };
            const mockBody = { text: 'success' };
            cb(null, mockRes, mockBody);
        };

        const opts = {
            credentials: {
                username
            }
        };
        return deviceUtil.makeDeviceRequest('1.1.1.1', '/', opts)
            .then((body) => {
                assert.strictEqual(body.text, 'success');
                Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should execute shell command', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { commandResult: 'somestring' };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.executeShellCommandOnDevice(constants.LOCAL_HOST, 'echo somestring')
            .then((data) => {
                assert.strictEqual(data, mockBody.commandResult);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail on execute shell command', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { commandResult: 'somestring' };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.executeShellCommandOnDevice(constants.LOCAL_HOST, 'echo somestring')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/executeShellCommandOnDevice:/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail to get an auth token', () => {
        const token = 'atoken';
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { token: { token } };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.getAuthToken('example.com', 'admin', 'password')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/requestAuthToken:/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should get an auth token', () => {
        const token = 'atoken';
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { token: { token } };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.getAuthToken('example.com', 'admin', 'password')
            .then((data) => {
                assert.strictEqual(data.token, token);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should return null auth token for localhost', () => {
        const expected = null;
        return deviceUtil.getAuthToken('localhost')
            .then((data) => {
                assert.strictEqual(data.token, expected);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail to get auth token when no username and/or no password', () => deviceUtil.getAuthToken('example.com')
        .then(() => {
            assert.fail('Should throw an error');
        })
        .catch((err) => {
            if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
            if (/getAuthToken: Username/.test(err)) return Promise.resolve();
            assert.fail(err);
            return Promise.reject(err);
        })
        .then(() => deviceUtil.getAuthToken('example.com'))
        .then(() => {
            assert.fail('Should throw an error');
        })
        .catch((err) => {
            if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
            if (/getAuthToken: Username/.test(err)) return Promise.resolve();
            assert.fail(err);
            return Promise.reject(err);
        }));

    it('should encrypt secret and retrieve it via REST API when software version is 14.0.0', () => {
        const secret = 'asecret';
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = {
            secret,
            entries: {
                someKey: {
                    nestedStats: {
                        entries: {
                            version: {
                                description: '14.0.0'
                            },
                            BuildInfo: {
                                description: '0.0.1'
                            }
                        }
                    }
                }
            }
        };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.encryptSecret('foo')
            .then((data) => {
                assert.strictEqual(data, secret);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should encrypt secret and retrieve it via REST API when software version is 15.0.0', () => {
        const secret = 'asecret';
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = {
            secret,
            entries: {
                someKey: {
                    nestedStats: {
                        entries: {
                            version: {
                                description: '15.0.0'
                            },
                            BuildInfo: {
                                description: '0.0.1'
                            }
                        }
                    }
                }
            }
        };
        setupRequestMock(mockRes, mockBody);

        return deviceUtil.encryptSecret('foo')
            .then((data) => {
                assert.strictEqual(data, secret);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should error during encrypt secret', () => {
        const mockRes = { statusCode: 400, statusMessage: 'message' };
        setupRequestMock(mockRes, {});

        return deviceUtil.encryptSecret('foo')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Bad status code: 400 message/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should encrypt secret and retreive it from device via TMSH when software version is 14.1.x', () => {
        const invalidSecret = { secret: 'invalidSecret' };
        const validSecret = 'secret';
        const tmshResp = { commandResult: `auth radius-server telemetry_delete_me {\n    secret ${validSecret}\n}` };

        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = {
            invalidSecret,
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
        };
        const requestHandler = (opts, cb) => {
            const parsedURL = parseURL(opts.uri);

            let body = mockBody;
            if (parsedURL.pathname === '/mgmt/tm/util/bash') {
                body = tmshResp;
            }
            cb(null, mockRes, body);
        };
        request.post = requestHandler;
        request.get = requestHandler;

        return deviceUtil.encryptSecret('foo')
            .then((data) => {
                assert.strictEqual(data, validSecret);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should decrypt secret', () => {
        const secret = 'asecret';
        childProcess.exec = (cmd, cb) => { cb(null, secret, null); };

        return deviceUtil.decryptSecret('foo')
            .then((data) => {
                assert.strictEqual(data, secret);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should decrypt all secrets', () => {
        const secret = 'asecret';
        childProcess.exec = (cmd, cb) => { cb(null, secret, null); };
        process.env.MY_SECRET_TEST_VAR = secret;

        const obj = {
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
        const decryptedObj = {
            My_Consumer: {
                class: 'Consumer',
                passphrase: secret
            },
            My_Consumer2: {
                class: 'Consumer',
                passphrase: secret
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
                otherkey: secret
            }
        };

        return deviceUtil.decryptAllSecrets(obj)
            .then((data) => {
                assert.deepEqual(data, decryptedObj);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail when subPath passed without parition to transformTMOSobjectName', () => {
        try {
            deviceUtil.transformTMOSobjectName('', '', 'subPath');
            assert.fail('Should throw an error');
        } catch (err) {
            if (!/transformTMOSobjectName:/.test(err)) assert.fail(err);
        }
    });

    it('should correctly transform TMOS object nane', () => {
        assert.strictEqual(deviceUtil.transformTMOSobjectName('partition', 'name', 'subPath'), '~partition~subPath~name');
        assert.strictEqual(deviceUtil.transformTMOSobjectName('partition', '/name/name', 'subPath'), '~partition~subPath~~name~name');
        assert.strictEqual(deviceUtil.transformTMOSobjectName('partition', '/name/name', 'subPath'), '~partition~subPath~~name~name');
        assert.strictEqual(deviceUtil.transformTMOSobjectName('', 'name'), 'name');
    });
});


// purpose: validate util (DeviceAsyncCLI)
describe('Device Util (DeviceAsyncCLI)', () => {
    let deviceUtil;
    let request;

    before(() => {
        deviceUtil = require('../../src/nodejs/deviceUtil.js');
        request = require('request');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

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
                request[method] = responder;
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
            request[method] = responder;
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
            request[method] = responder;
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
            request[method] = responder;
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
            request[method] = responder;
        });
        let err;
        // ideally all testSets should be covered
        const dacli = new deviceUtil.DeviceAsyncCLI('localhost');
        dacli.scriptName = testScriptName;
        dacli.retryDelay = 0;
        return dacli.execute('command')
            .catch((e) => {
                err = e;
            })
            .then(() => {
                if (!err) {
                    assert.fail('Error expected');
                }
            });
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
        assert.deepEqual(dacli.options, { connection: {}, credentials: {} });

        dacli = new deviceUtil.DeviceAsyncCLI({});
        assert.deepEqual(dacli.options, { connection: {}, credentials: {} });

        dacli = new deviceUtil.DeviceAsyncCLI({ something: 'something' });
        assert.deepEqual(dacli.options, { connection: {}, credentials: {}, something: 'something' });

        dacli = new deviceUtil.DeviceAsyncCLI({ connection: { port: 80 }, credentials: { token: 'token' } });
        assert.deepEqual(dacli.options, { connection: { port: 80 }, credentials: { token: 'token' } });

        dacli = new deviceUtil.DeviceAsyncCLI({ connection: { port: 80 } });
        assert.deepEqual(dacli.options, { connection: { port: 80 }, credentials: {} });
    });
});
