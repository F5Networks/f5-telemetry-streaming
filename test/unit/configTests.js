/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const TeemDevice = require('@f5devcentral/f5-teem').Device;

chai.use(chaiAsPromised);
const assert = chai.assert;

const constants = require('../../src/lib/constants.js');

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
    let persistentStorage;
    let config;
    let util;
    let deviceUtil;

    let configValidator;
    let formatConfig;

    const baseState = {
        _data_: {
            config: {
                raw: {},
                parsed: {}
            }
        }
    };

    before(() => {
        const psModule = require('../../src/lib/persistentStorage.js');
        config = require('../../src/lib/config.js');
        util = require('../../src/lib/util.js');
        deviceUtil = require('../../src/lib/deviceUtil.js');

        const restWorker = {
            loadState: (cb) => { cb(null, baseState); },
            saveState: (first, state, cb) => { cb(null); }
        };
        persistentStorage = psModule.persistentStorage;
        persistentStorage.storage = new psModule.RestStorage(restWorker);

        configValidator = config.validator;

        formatConfig = util.formatConfig;
    });
    beforeEach(() => {
        persistentStorage.storage._cache = JSON.parse(JSON.stringify(baseState));
    });
    afterEach(() => {
        config.validator = configValidator;
        util.formatConfig = formatConfig;
        sinon.restore();
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
        return assert.isRejected(config.validate(obj), 'Validator is not available');
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
            });
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
            });
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
            });
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
            });
    });

    it('should send TEEM report', (done) => {
        const decl = {
            class: 'Telemetry',
            schemaVersion: '1.6.0'
        };
        const assetInfo = {
            name: 'Telemetry Streaming',
            version: '1.6.0'
        };
        const teemDevice = new TeemDevice(assetInfo);

        sinon.stub(teemDevice, 'report').callsFake((type, version, declaration) => {
            assert.deepEqual(declaration, decl);
            done();
        });
        const restOperation = new MockRestOperation({ method: 'POST' });
        restOperation.setBody(decl);
        config.teemDevice = teemDevice;
        config.processClientRequest(restOperation);
    });

    it('should still receive 200 response if f5-teem fails', () => {
        const decl = {
            class: 'Telemetry',
            schemaVersion: '1.6.0'
        };
        const assetInfo = {
            name: 'Telemetry Streaming',
            version: '1.6.0'
        };
        const teemDevice = new TeemDevice(assetInfo);

        sinon.stub(teemDevice, 'report').rejects(new Error('f5-teem failed'));
        const restOperation = new MockRestOperation({ method: 'POST' });
        restOperation.setBody(decl);
        config.teemDevice = teemDevice;
        return config.processClientRequest(restOperation)
            .then(() => {
                assert.equal(restOperation.statusCode, 200);
                assert.equal(restOperation.body.message, 'success');
                assert.deepEqual(restOperation.body.declaration, decl);
            });
    });

    describe('saveConfig', () => {
        it('should fail to save config', () => {
            sinon.stub(persistentStorage, 'set').rejects(new Error('saveStateError'));
            return assert.isRejected(config.saveConfig(), /saveStateError/);
        });
    });

    describe('getConfig', () => {
        it('should return BASE_CONFIG if data.parsed is undefined', () => {
            sinon.stub(persistentStorage, 'get').resolves(undefined);
            return assert.becomes(config.getConfig(), { raw: {}, parsed: {} });
        });

        it('should return BASE_CONFIG if data.parsed is {}', () => {
            sinon.stub(persistentStorage, 'get').resolves({});
            return assert.becomes(config.getConfig(), { raw: {}, parsed: {} });
        });

        it('should return data if data.parsed is set', () => {
            sinon.stub(persistentStorage, 'get').resolves({ parsed: { value: 'Hello World' } });
            return assert.becomes(config.getConfig(), { parsed: { value: 'Hello World' } });
        });
    });

    describe('loadConfig', () => {
        it('should reject if persistenStorage errors', () => {
            sinon.stub(persistentStorage, 'get').rejects(new Error('loadStateError'));
            return assert.isRejected(config.loadConfig(), /loadStateError/);
        });

        it('should resolve BASE_CONFIG, even if persistentStorage returns {}', () => {
            sinon.stub(persistentStorage, 'get').resolves({});
            return assert.becomes(config.loadConfig(), { raw: {}, parsed: {} });
        });

        it('should resolve BASE_CONFIG, if decryptAllSecretes returns {}', () => {
            sinon.stub(deviceUtil, 'decryptAllSecrets').resolves({});
            return assert.becomes(config.loadConfig(), { raw: {}, parsed: {} });
        });

        it('should error if there is an unexpected error in setConfig', () => {
            sinon.stub(config, 'setConfig').rejects(new Error('Unexpected Error'));
            return assert.isRejected(config.loadConfig(), /Unexpected Error/);
        });
    });

    it('should fail to set config when invalid config provided', () => {
        // assert.isRejected does not work for this test.
        // Due to the throw new Error in _notifyConfigChange, there is no promise to check against.
        try {
            config.setConfig({});
        } catch (err) {
            return assert.strictEqual(err.message, '_notifyConfigChange() Missing parsed config.');
        }
        return assert.fail('This test PASSED but was supposed to FAIL');
    });

    it('should able to get declaration by name', () => {
        const obj = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                systemPoller: 'My_Poller'
            },
            My_Poller: {
                class: 'Telemetry_System_Poller'
            }
        };
        return config.validate(obj)
            .then((validated) => {
                validated = util.formatConfig(validated);
                const poller = util.getDeclarationByName(
                    validated, constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME, 'My_Poller'
                );
                assert.strictEqual(poller.class, constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME);
            });
    });
});
