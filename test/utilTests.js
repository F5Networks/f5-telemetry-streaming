/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');

const constants = require('../src/nodejs/constants.js');

/* eslint-disable global-require */

// purpose: validate util
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
    beforeEach(() => {});
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
                if (data !== BIG_IP_DEVICE_TYPE) {
                    return Promise.reject(new Error(`incorrect device type: ${data}`));
                }
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should get container device type', () => {
        childProcess.exec = (cmd, cb) => { cb(new Error('foo'), null, null); };

        const CONTAINER_DEVICE_TYPE = constants.CONTAINER_DEVICE_TYPE;
        return util.getDeviceType()
            .then((data) => {
                if (data !== CONTAINER_DEVICE_TYPE) {
                    return Promise.reject(new Error(`incorrect device type: ${data}`));
                }
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

        const obj = {
            my_item: {
                class: 'Consumer',
                passphrase: {
                    cipherText: 'foo'
                }
            }
        };
        const decryptedObj = {
            my_item: {
                class: 'Consumer',
                passphrase: {
                    cipherText: 'foo',
                    text: secret
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
});
