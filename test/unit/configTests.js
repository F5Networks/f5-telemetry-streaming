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

const config = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const psModule = require('../../src/lib/persistentStorage');

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

        it('should expand config', () => {
            let savedConfig;
            sinon.stub(config, 'saveConfig').callsFake((configToSave) => {
                savedConfig = configToSave;
            });

            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/foo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.0.2.1',
                    path: '`=/Shared/constants/path`'
                }
            };
            return config.validateAndApply(data)
                .then(() => {
                    const consumer = savedConfig.parsed.Telemetry_Consumer.My_Consumer;
                    assert.strictEqual(consumer.path, '/foo');
                });
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
        it('should reject if persistentStorage errors', () => {
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
