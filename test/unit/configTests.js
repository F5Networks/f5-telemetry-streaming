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
const sinon = require('sinon');
const TeemDevice = require('@f5devcentral/f5-teem').Device;

const config = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const psModule = require('../../src/lib/persistentStorage');
const util = require('../../src/lib/util');
const MockRestOperation = require('./shared/util').MockRestOperation;

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Config', () => {
    let persistentStorage;
    let restStorage;

    const baseState = {
        _data_: {
            config: {
                raw: {},
                parsed: {}
            }
        }
    };

    before(() => {
        persistentStorage = psModule.persistentStorage;
        restStorage = new psModule.RestStorage({
            loadState: (first, cb) => { cb(null, baseState); },
            saveState: (first, state, cb) => { cb(null); }
        });
    });

    beforeEach(() => {
        sinon.stub(persistentStorage, 'storage').value(restStorage);
        restStorage._cache = JSON.parse(JSON.stringify(baseState));
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should compile schema', () => {
        const compiledSchema = config.compileSchema;
        assert.strictEqual(typeof compiledSchema, 'function');
    });

    describe('.validate()', () => {
        it('should validate basic declaration', () => {
            const obj = {
                class: 'Telemetry'
            };
            return assert.isFulfilled(config.validate(obj));
        });

        it('should throw error in validate function', () => {
            const obj = {
                class: 'Telemetry'
            };
            sinon.stub(config, 'validator').value(null);
            return assert.isRejected(config.validate(obj), 'Validator is not available');
        });
    });

    describe('.validateAndApply()', () => {
        it('should validate and apply basic declaration', () => {
            const obj = {
                class: 'Telemetry'
            };
            const validatedObj = {
                class: 'Telemetry',
                schemaVersion: constants.VERSION
            };
            return assert.becomes(config.validateAndApply(obj), validatedObj);
        });
    });

    describe('.processClientRequest()', () => {
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
            return assert.isFulfilled(config.processClientRequest(mockRestOperation)
                .then(() => {
                    assert.strictEqual(mockRestOperation.statusCode, 200);
                    assert.deepStrictEqual(mockRestOperation.body, actualResponseBody);
                }));
        });

        it('should process client GET request - no configuration', () => {
            const actualResponseBody = {
                message: 'success',
                declaration: {}
            };
            const mockRestOperation = new MockRestOperation({ method: 'GET' });
            mockRestOperation.setBody({});

            return assert.isFulfilled(config.processClientRequest(mockRestOperation)
                .then(() => {
                    assert.strictEqual(mockRestOperation.statusCode, 200);
                    assert.deepStrictEqual(mockRestOperation.body, actualResponseBody);
                }));
        });

        it('should process client GET request - existing config', () => {
            const mockRestOperationPOST = new MockRestOperation({ method: 'POST' });
            mockRestOperationPOST.setBody({
                class: 'Telemetry'
            });
            const mockRestOperationGET = new MockRestOperation({ method: 'GET' });
            mockRestOperationGET.setBody({});

            return assert.isFulfilled(config.processClientRequest(mockRestOperationPOST)
                .then(() => {
                    assert.strictEqual(mockRestOperationPOST.statusCode, 200);
                    return config.processClientRequest(mockRestOperationGET);
                })
                .then(() => {
                    assert.strictEqual(mockRestOperationGET.statusCode, 200);
                    assert.deepStrictEqual(mockRestOperationGET.body, mockRestOperationPOST.body);
                }));
        });

        it('should fail to validate client request', () => {
            const mockRestOperation = new MockRestOperation({ method: 'POST' });
            mockRestOperation.setBody({
                class: 'foo'
            });
            return assert.isFulfilled(config.processClientRequest(mockRestOperation)
                .then(() => {
                    assert.strictEqual(mockRestOperation.statusCode, 422);
                    assert.strictEqual(mockRestOperation.body.message, 'Unprocessable entity');
                }));
        });

        it('should fail to process client request', () => {
            sinon.stub(util, 'formatConfig').throws(new Error('foo'));
            const mockRestOperation = new MockRestOperation({ method: 'POST' });
            mockRestOperation.setBody({
                class: 'Telemetry'
            });
            return assert.isFulfilled(config.processClientRequest(mockRestOperation)
                .then(() => {
                    assert.strictEqual(mockRestOperation.statusCode, 500);
                    assert.strictEqual(mockRestOperation.body.message, 'Internal Server Error');
                }));
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
                assert.deepStrictEqual(declaration, decl);
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
            return assert.isFulfilled(config.processClientRequest(restOperation)
                .then(() => {
                    assert.equal(restOperation.statusCode, 200);
                    assert.equal(restOperation.body.message, 'success');
                    assert.deepStrictEqual(restOperation.body.declaration, decl);
                }));
        });
    });

    describe('.saveConfig()', () => {
        it('should fail to save config', () => {
            sinon.stub(persistentStorage, 'set').rejects(new Error('saveStateError'));
            return assert.isRejected(config.saveConfig(), /saveStateError/);
        });
    });

    describe('.getConfig()', () => {
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

    describe('.loadConfig()', () => {
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

    describe('.setConfig()', () => {
        it('should fail to set config when invalid config provided', () => {
            assert.throws(
                () => config.setConfig({}),
                '_notifyConfigChange() Missing parsed config.'
            );
        });
    });
});
