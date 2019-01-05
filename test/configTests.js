/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');

const constants = require('../src/nodejs/constants.js');
const logger = require('../src/nodejs/logger.js');

/* eslint-disable global-require */

describe('Config', () => {
    let config;
    let util;

    let configValidator;

    before(() => {
        config = require('../src/nodejs/config.js');
        config.restWorker = {
            loadState: (cb) => { cb(null, {}); },
            saveState: (first, state, cb) => { cb(null); }
        };
        config._loadState = () => Promise.resolve({});
        configValidator = config.validator;

        util = require('../src/nodejs/util.js');
    });
    afterEach(() => {
        config.validator = configValidator;
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
                assert.deepEqual(data, {});
            })
            .catch(err => Promise.reject(err));
    });

    it('should process client request', () => {
        let restOperationStatusCode;
        let restOperationBody;
        const obj = {
            class: 'Telemetry'
        };
        const actualResponseBody = {
            message: 'success',
            declaration: {
                class: 'Telemetry',
                schemaVersion: constants.VERSION
            }
        };
        const mockRestOperation = {
            getBody() { return obj; },
            setStatusCode(code) { restOperationStatusCode = code; },
            setBody(body) { restOperationBody = body; },
            complete() {}
        };

        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(restOperationStatusCode, 200);
                assert.deepEqual(restOperationBody, actualResponseBody);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail to validate client request', () => {
        let restOperationStatusCode;
        let restOperationBody;
        const obj = {
            class: 'foo'
        };
        const mockRestOperation = {
            getBody() { return obj; },
            setStatusCode(code) { restOperationStatusCode = code; },
            setBody(body) { restOperationBody = body; },
            complete() {}
        };

        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(restOperationStatusCode, 422);
                assert.strictEqual(restOperationBody.message, 'Unprocessable entity');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail to process client request', () => {
        let restOperationStatusCode;
        let restOperationBody;
        const obj = {
            class: 'Telemetry'
        };
        const mockRestOperation = {
            getBody() { return obj; },
            setStatusCode(code) { restOperationStatusCode = code; },
            setBody(body) { restOperationBody = body; },
            complete() {}
        };

        util.formatConfig = () => { throw new Error('foo'); };

        return config.processClientRequest(mockRestOperation)
            .then(() => {
                assert.strictEqual(restOperationStatusCode, 500);
                assert.strictEqual(restOperationBody.message, 'Internal Server Error');
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should not modify logLevel when not specified', () => {
        const obj = {
            class: 'Telemetry'
        };

        logger.setLogLevel('info');
        const logLevelBefore = logger.getLevel();
        const logLevelNameBefore = logger.getLevelName();

        return config.validateAndApply(obj).then(() => {
            assert.strictEqual(logLevelBefore, logger.getLevel());
            assert.strictEqual(logLevelNameBefore, logger.getLevelName());
            return Promise.resolve();
        });
    });

    it('should set logLevel when specified', () => {
        const logLevel = 'debug';
        const obj = {
            class: 'Telemetry',
            MySettings: {
                class: 'Telemetry_Settings',
                logLevel
            }
        };

        logger.setLogLevel('info');
        return config.validateAndApply(obj).then(() => {
            assert.StrictEqual(logger.getLevel(logLevel), logger.getLevel());
            assert.StrictEqual(logLevel, logger.getLevelName());
            return Promise.resolve();
        });
    });
});
