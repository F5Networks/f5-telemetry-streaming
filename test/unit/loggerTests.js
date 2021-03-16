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

const logger = require('../../src/lib/logger');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Logger', () => {
    const logLevels = [
        'notset',
        'debug',
        'info',
        'warning',
        'error'
    ];
    const loggedMessages = {
        error: [],
        info: [],
        warning: [],
        debug: []
    };
    const loggerMock = {
        severe(msg) { loggedMessages.error.push(msg); },
        info(msg) { loggedMessages.info.push(msg); },
        warning(msg) { loggedMessages.warning.push(msg); },
        finest(msg) { loggedMessages.debug.push(msg); }
    };

    before(() => {
        sinon.stub(logger, 'logger').value(loggerMock);
    });

    beforeEach(() => {
        logger.setLogLevel('info');
        Object.keys(loggedMessages).forEach((msgType) => {
            loggedMessages[msgType] = [];
        });
    });

    after(() => {
        sinon.restore();
    });

    it('defaults: should be by default \'info\' level', () => {
        assert.strictEqual(logger.getLevelName(), 'info');
    });

    it('should add log message on every level change', () => {
        let count = 0;
        logLevels.forEach((logLevelName) => {
            logger.setLogLevel(logLevelName);
            count += 1;
            assert.strictEqual(loggedMessages.info.length, count);
        });
    });

    it('should return appropriate log level value for standard value', () => {
        logLevels.forEach((logLevelName) => {
            [logLevelName, logger.getLevel(logLevelName)].forEach((value) => {
                logger.setLogLevel(value);
                assert.strictEqual(logger.getLevelName(), logLevelName);
                assert.strictEqual(logger.getLevel(), logger.getLevel(logLevelName));
                assert.strictEqual(logger.getLevel(), logger.getLevel(logger.getLevelName()));
            });
        });
    });

    it('should log error message on attempt to set invalid logLevelName', () => {
        const invalidName = 'invalidErrorLevelName';
        logger.setLogLevel(invalidName);

        assert.strictEqual(loggedMessages.error.length, 1);
        assert.include(loggedMessages.error[0], invalidName);
    });

    it('should return appropriate log level name for non-standard value', () => {
        const value = 9999;
        const desiredName = `Level ${value}`;

        logger.setLogLevel(value);
        assert.strictEqual(logger.getLevelName(), desiredName);
        assert.strictEqual(logger.getLevelName(value), desiredName);
    });

    logLevels.forEach((logLevel) => {
        Object.keys(loggedMessages).forEach((logType) => {
            it(`should log at the appropriate '${logType}' level and preserve global '${logLevel}' level`, () => {
                // this call logs message about level change, so we already have 1 item in loggedMessages.info
                logger.setLogLevel(logLevel);
                loggedMessages.info = [];

                const msg = `this is a ${logType} message`;
                logger[logType](msg);

                if (logger.getLevel(logType) >= logger.getLevel()) {
                    assert.strictEqual(loggedMessages[logType].length, 1);
                    // check it contains the message - no exact match as prefix [telemetry] will be added
                    assert.include(loggedMessages[logType][0], msg);
                } else {
                    assert.strictEqual(loggedMessages[logType].length, 0);
                }
            });
        });
    });

    it('should log an exception', () => {
        const msgType = 'exception';
        logger.exception(`this is a ${msgType} message`, new Error('foo'));
        logger.debugException(`this is a ${msgType} message`, new Error('foo'));

        assert.strictEqual(loggedMessages.error.length, 1);
        assert.strictEqual(loggedMessages.debug.length, 0);
        assert.include(loggedMessages.error[0], `this is a ${msgType} message`);

        logger.setLogLevel('debug');
        logger.exception(`this is a ${msgType} message`, new Error('foo'));
        logger.debugException(`this is a ${msgType} message [debug]`, new Error('foo'));

        assert.strictEqual(loggedMessages.error.length, 2);
        assert.strictEqual(loggedMessages.debug.length, 1);
        assert.include(loggedMessages.error[1], `this is a ${msgType} message`);
        assert.include(loggedMessages.debug[0], `this is a ${msgType} message [debug]`);
    });

    it('should stringify object', () => {
        const msg = {
            foo: 'bar'
        };
        logger.info(msg);
        assert.include(loggedMessages.info[0], '{"foo":"bar"}');
    });

    it('should get a child logger', () => {
        const prefix = 'prefix';
        const childLogger = logger.getChild(prefix);
        childLogger.logger = loggerMock;

        childLogger.info('foo');
        assert.include(loggedMessages.info[0], `[telemetry.${prefix}]`);
    });

    describe('mask secrets', () => {
        it('should mask secrets - cipherText (without new lines)', () => {
            const decl = {
                passphrase: {
                    cipherText: 'foo'
                }
            };
            const expected = 'this contains secrets: {"passphrase":{*********}}';
            logger.info(`this contains secrets: ${JSON.stringify(decl)}`);
            assert.include(loggedMessages.info[0], expected);
        });

        it('should mask secrets - cipherText (with new lines)', () => {
            const decl = {
                passphrase: {
                    cipherText: 'foo'
                }
            };
            const expected = 'this contains secrets: {\n    "passphrase": {\n        "cipherText":"*********"\n    }\n}';
            logger.info(`this contains secrets: ${JSON.stringify(decl, null, 4)}`);
            assert.include(loggedMessages.info[0], expected);
        });

        it('should mask secrets - passphrase (without new lines)', () => {
            const decl = {
                passphrase: 'foo'
            };
            const expected = 'this contains secrets: {"passphrase":"*********"}';
            logger.info(`this contains secrets: ${JSON.stringify(decl)}`);
            assert.include(loggedMessages.info[0], expected);
        });

        it('should mask secrets - passphrase (with new lines)', () => {
            const decl = {
                passphrase: 'foo'
            };
            const expected = 'this contains secrets: {\n    "passphrase":"*********"\n}';
            logger.info(`this contains secrets: ${JSON.stringify(decl, null, 4)}`);
            assert.include(loggedMessages.info[0], expected);
        });
    });
});
