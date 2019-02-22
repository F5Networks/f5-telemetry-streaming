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

function MockRestOperation(opts) {
    this.method = opts.method || 'GET';
    this.body = opts.body;
    this.statusCode = null;
}
MockRestOperation.prototype.getMethod = function () { return this.method; };
MockRestOperation.prototype.setMethod = function (method) { this.method = method; };
MockRestOperation.prototype.getBody = function () { return this.body; };
MockRestOperation.prototype.setBody = function (body) { this.body = body; };
MockRestOperation.prototype.getStatusCode = function () { return this.statusCode; };
MockRestOperation.prototype.setStatusCode = function (code) { this.statusCode = code; };
MockRestOperation.prototype.complete = function () { };


describe('Config', () => {
    let config;
    let util;

    let configValidator;
    let formatConfig;

    const baseState = {
        config: {
            raw: {},
            parsed: {}
        }
    };

    before(() => {
        config = require('../src/nodejs/config.js');
        util = require('../src/nodejs/util.js');
        config.restWorker = {
            loadState: (cb) => { cb(null, baseState); },
            saveState: (first, state, cb) => { cb(null); }
        };
        config._loadState = () => Promise.resolve(baseState);
        configValidator = config.validator;

        formatConfig = util.formatConfig;
    });
    beforeEach(() => {
        config._state = JSON.parse(JSON.stringify(baseState));
    });
    afterEach(() => {
        config.validator = configValidator;
        util.formatConfig = formatConfig;
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should validate basic declaration', () => {
        const obj = {
            class: 'Telemetry'
        };
        return config.validate(obj);
    });

    it('should throw error in validate function', () => {
        const obj = {
            class: 'Telemetry'
        };
        config.validator = null;
        return config.validate(obj)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                return Promise.resolve(); // resolve, expected an error
            });
    });

    it('should compile schema', () => {
        const compiledSchema = config.compileSchema;
        assert.strictEqual(typeof compiledSchema, 'function');
    });

    it('should validate and apply basic declaration', () => {
        const obj = {
            class: 'Telemetry'
        };
        const validatedObj = {
            class: 'Telemetry',
            schemaVersion: constants.VERSION
        };
        return config.validateAndApply(obj)
            .then((data) => {
                assert.deepEqual(data, validatedObj);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should load state', () => {
        util.decryptAllSecrets = () => Promise.resolve({});

        return config.loadState()
            .then((data) => {
                assert.deepEqual(data, baseState);
            })
            .catch(err => Promise.reject(err));
    });

    it('should process client POST request', () => {
        const mockRestOperation = new MockRestOperation({ method: 'POST' });
        mockRestOperation.setBody({
            class: 'Telemetry'
        });

        const actualResponseBody = {
            message: 'success',
            declaration: {
                class: 'Telemetry',
                schemaVersion: constants.VERSION
            }
        };
        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(mockRestOperation.statusCode, 200);
                assert.deepEqual(mockRestOperation.body, actualResponseBody);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should process client GET request - no configuration', () => {
        const actualResponseBody = {
            message: 'success',
            declaration: {}
        };

        const mockRestOperation = new MockRestOperation({ method: 'GET' });
        mockRestOperation.setBody({});

        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(mockRestOperation.statusCode, 200);
                assert.deepEqual(mockRestOperation.body, actualResponseBody);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should process client GET request - existing config', () => {
        const mockRestOperationPOST = new MockRestOperation({ method: 'POST' });
        mockRestOperationPOST.setBody({
            class: 'Telemetry'
        });

        const mockRestOperationGET = new MockRestOperation({ method: 'GET' });
        mockRestOperationGET.setBody({});

        return config.processClientRequest(mockRestOperationPOST)
            .then(() => {
                assert.strictEqual(mockRestOperationPOST.statusCode, 200);
                return config.processClientRequest(mockRestOperationGET);
            })
            .then(() => {
                assert.strictEqual(mockRestOperationGET.statusCode, 200);
                assert.deepEqual(mockRestOperationGET.body, mockRestOperationPOST.body);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail to validate client request', () => {
        const mockRestOperation = new MockRestOperation({ method: 'POST' });
        mockRestOperation.setBody({
            class: 'foo'
        });
        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(mockRestOperation.statusCode, 422);
                assert.strictEqual(mockRestOperation.body.message, 'Unprocessable entity');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail to process client request', () => {
        const mockRestOperation = new MockRestOperation({ method: 'POST' });
        mockRestOperation.setBody({
            class: 'Telemetry'
        });

        util.formatConfig = () => { throw new Error('foo'); };

        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(mockRestOperation.statusCode, 500);
                assert.strictEqual(mockRestOperation.body.message, 'Internal Server Error');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });
});
