/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const os = require('os');
const fs = require('fs');

const constants = require('../src/nodejs/constants.js');

/* eslint-disable global-require */

describe('Util', () => {
    let util;
    let childProcess;
    let request;

    const setupRequestMock = (res, body) => {
        ['get', 'post', 'delete'].forEach((method) => {
            request[method] = (opts, cb) => { cb(null, res, JSON.stringify(body)); };
        });
    };

    before(() => {
        util = require('../src/nodejs/util.js');
        childProcess = require('child_process');
        request = require('request');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should stringify object', () => {
        const obj = {
            foo: 'bar'
        };
        const newObj = util.stringify(obj);
        assert.notStrictEqual(newObj.indexOf('{"foo":"bar"}'), -1);
    });

    it('should get BIG-IP device type', () => {
        childProcess.exec = (cmd, cb) => { cb(null, cmd, null); };

        const BIG_IP_DEVICE_TYPE = constants.BIG_IP_DEVICE_TYPE;
        return util.getDeviceType()
            .then((data) => {
                assert.strictEqual(data, BIG_IP_DEVICE_TYPE, 'incorrect device type');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should get container device type', () => {
        childProcess.exec = (cmd, cb) => { cb(new Error('foo'), null, null); };

        const CONTAINER_DEVICE_TYPE = constants.CONTAINER_DEVICE_TYPE;
        return util.getDeviceType()
            .then((data) => {
                assert.strictEqual(data, CONTAINER_DEVICE_TYPE, 'incorrect device type');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should convert array to map', () => {
        const array = [
            {
                name: 'foo'
            }
        ];
        const expectedMap = {
            foo: {
                name: 'foo'
            }
        };
        const actualMap = util.convertArrayToMap(array, 'name');
        assert.deepEqual(actualMap, expectedMap);
    });

    it('should filter data by keys', () => {
        const obj = {
            'name/foo': {
                name: 'foo',
                removeMe: 'foo'
            }
        };
        const expectedObj = {
            'name/foo': {
                name: 'foo'
            }
        };
        const actualObj = util.filterDataByKeys(obj, ['name']);
        assert.deepEqual(actualObj, expectedObj);
    });

    it('should stringify object', () => {
        const obj = {
            name: 'foo'
        };
        const stringifiedObj = util.stringify(obj);
        assert.deepEqual(stringifiedObj, '{"name":"foo"}');
    });

    it('should format data by class', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatDataByClass(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should format data by class', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatDataByClass(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should format config', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatConfig(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should make request', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', {})
            .then((data) => {
                assert.deepEqual(data, mockBody);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail request', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', {})
            .then(() => Promise.reject(new Error('failure expected')))
            .catch((err) => {
                err = err.message || err;
                assert.notStrictEqual(err.indexOf('Bad status code'), -1);
                return Promise.resolve();
            });
    });

    it('should continue on error code for request', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', { continueOnErrorCode: true })
            .then(() => Promise.resolve())
            .catch(err => Promise.reject(err));
    });

    it('should get an auth token', () => {
        const token = 'atoken';
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { token: { token } };
        setupRequestMock(mockRes, mockBody);

        return util.getAuthToken('example.com', 'admin', 'password')
            .then((data) => {
                assert.strictEqual(data.token, token);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should base64 decode', () => {
        const string = 'f5string';
        const encString = Buffer.from(string, 'ascii').toString('base64');

        const decString = util.base64('decode', encString);
        assert.strictEqual(decString, string);
    });

    it('should error on incorrect base64 action', () => {
        try {
            util.base64('someaction', 'foo');
            assert.fail('Error expected');
        } catch (err) {
            const msg = err.message || err;
            assert.notStrictEqual(msg.indexOf('Unsupported action'), -1);
        }
    });

    it('should encrypt secret', () => {
        const secret = 'asecret';
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { secret };
        setupRequestMock(mockRes, mockBody);

        return util.encryptSecret('foo')
            .then((data) => {
                assert.strictEqual(data, secret);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should error during encrypt secret', () => {
        const mockRes = { statusCode: 400, statusMessage: 'message' };
        setupRequestMock(mockRes, {});

        return util.encryptSecret('foo')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                return Promise.resolve(); // resolve, expected an error
            });
    });

    it('should decrypt secret', () => {
        const secret = 'asecret';
        childProcess.exec = (cmd, cb) => { cb(null, secret, null); };

        return util.decryptSecret('foo')
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
                    cipherText: 'foo'
                }
            },
            My_Consumer2: {
                class: 'Consumer',
                passphrase: {
                    environmentVar: 'MY_SECRET_TEST_VAR'
                }
            },
            My_Consumer3: {
                class: 'Consumer',
                passphrase: {
                    environmentVar: 'VAR_THAT_DOES_NOT_EXIST'
                }
            },
            My_Consumer4: {
                class: 'Consumer',
                passphrase: {
                    someUnknownKey: 'foo'
                }
            }
        };
        const decryptedObj = {
            My_Consumer: {
                class: 'Consumer',
                passphrase: {
                    cipherText: 'foo',
                    text: secret
                }
            },
            My_Consumer2: {
                class: 'Consumer',
                passphrase: {
                    environmentVar: 'MY_SECRET_TEST_VAR',
                    text: secret
                }
            },
            My_Consumer3: {
                class: 'Consumer',
                passphrase: {
                    environmentVar: 'VAR_THAT_DOES_NOT_EXIST',
                    text: null
                }
            },
            My_Consumer4: {
                class: 'Consumer',
                passphrase: {
                    someUnknownKey: 'foo',
                    text: null
                }
            }
        };

        return util.decryptAllSecrets(obj)
            .then((data) => {
                assert.deepEqual(data, decryptedObj);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail network check', () => {
        const host = 'localhost';
        const port = 0;

        return util.networkCheck(host, port)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                return Promise.resolve(); // resolve, expected an error
            });
    });
});

// purpose: validate util (tracer)
describe('Util (Tracer)', () => {
    let util;
    const tracerFile = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux

    before(() => {
        util = require('../src/nodejs/util.js');
    });
    beforeEach(() => {
        if (fs.existsSync(tracerFile)) {
            fs.unlinkSync(tracerFile);
        }
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should write to tracer', () => {
        const msg = 'foobar';
        const config = {
            trace: tracerFile
        };
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        return tracer.write(msg)
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(msg, contents);
                tracer.stop(); // cleanup, otherwise will not exit
            })
            .catch(err => Promise.reject(err));
    });
});
