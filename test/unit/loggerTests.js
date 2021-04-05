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
const stubs = require('./shared/stubs');

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

    let coreStub;

    beforeEach(() => {
        coreStub = stubs.coreStub({
            logger
        }, {
            logger: {
                setToDebug: false,
                ignoreLevelChange: false
            }
        });
    });

    afterEach(() => {
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
            assert.lengthOf(coreStub.logger.messages.info, count);
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

        assert.lengthOf(coreStub.logger.messages.error, 1);
        assert.include(coreStub.logger.messages.error[0], invalidName);
    });

    it('should return appropriate log level name for non-standard value', () => {
        const value = 9999;
        const desiredName = `Level ${value}`;

        logger.setLogLevel(value);
        assert.strictEqual(logger.getLevelName(), desiredName);
        assert.strictEqual(logger.getLevelName(value), desiredName);
    });

    logLevels.forEach((logLevel) => {
        ['debug', 'error', 'info', 'warning'].forEach((logType) => {
            it(`should log at the appropriate '${logType}' level and preserve global '${logLevel}' level`, () => {
                // this call logs message about level change, so we already have 1 item in coreStub.logger.messages.info
                logger.setLogLevel(logLevel);
                coreStub.logger.messages.info = [];

                const msg = `this is a ${logType} message`;
                logger[logType](msg);

                if (logger.getLevel(logType) >= logger.getLevel()) {
                    assert.lengthOf(coreStub.logger.messages[logType], 1);
                    // check it contains the message - no exact match as prefix [telemetry] will be added
                    assert.include(coreStub.logger.messages[logType][0], msg);
                } else {
                    assert.lengthOf(coreStub.logger.messages[logType], 0);
                }
            });
        });
    });

    it('should log an exception', () => {
        const msgType = 'exception';
        logger.exception(`this is a ${msgType} message`, new Error('foo'));
        logger.debugException(`this is a ${msgType} message`, new Error('foo'));

        assert.lengthOf(coreStub.logger.messages.error, 1);
        assert.lengthOf(coreStub.logger.messages.debug, 0);
        assert.include(coreStub.logger.messages.error[0], `this is a ${msgType} message`);

        logger.setLogLevel('debug');
        logger.exception(`this is a ${msgType} message`, new Error('foo'));
        logger.debugException(`this is a ${msgType} message [debug]`, new Error('foo'));

        assert.lengthOf(coreStub.logger.messages.error, 2);
        assert.lengthOf(coreStub.logger.messages.debug, 1);
        assert.include(coreStub.logger.messages.error[1], `this is a ${msgType} message`);
        assert.include(coreStub.logger.messages.debug[0], `this is a ${msgType} message [debug]`);
    });

    it('should stringify object', () => {
        const msg = {
            foo: 'bar'
        };
        logger.info(msg);
        assert.include(coreStub.logger.messages.info[0], '{"foo":"bar"}');
    });

    it('should get a child logger', () => {
        const prefix = 'prefix';
        const childLogger = logger.getChild(prefix);
        childLogger.info('foo');
        assert.strictEqual(coreStub.logger.messages.info[0], `[telemetry.${prefix}] foo`);
    });

    it('should mask secrets', () => {
        const msg = 'passphrase: { cipherText: \'test_passphrase\' }\n'
            + '"passphrase": {\ncipherText: "test_passphrase"\n}'
            + '\'passphrase": "test_passphrase"';
        const expected = 'this contains secrets: passphrase: {*********}\n'
        + '"passphrase": {\ncipherText: "*********"\n}'
        + '\'passphrase": "*********"';
        logger.info(`this contains secrets: ${msg}`);
        assert.include(coreStub.logger.messages.info[0], expected, 'should mask secrets');

        logger.info(coreStub.logger.messages.info[0]);
        assert.include(coreStub.logger.messages.info[1], expected, 'should keep message the same once masked');
    });
});
