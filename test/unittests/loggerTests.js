/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const logger = require('../../src/nodejs/logger.js');

const logLevels = [
    'notset',
    'debug',
    'info',
    'error'
];
const loggedMessages = {
    error: [],
    info: [],
    debug: []
};
const loggerMock = {
    severe(msg) { loggedMessages.error.push(msg); },
    info(msg) { loggedMessages.info.push(msg); },
    finest(msg) { loggedMessages.debug.push(msg); }
};

logger.logger = loggerMock;

describe('Logger', () => {
    beforeEach(() => {
        logger.setLogLevel('info');
        Object.keys(loggedMessages).forEach((msgType) => {
            loggedMessages[msgType] = [];
        });
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
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
        assert.notStrictEqual(loggedMessages.error[0].indexOf(invalidName), -1);
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
                    assert.notStrictEqual(loggedMessages[logType][0].indexOf(msg), -1);
                } else {
                    assert.strictEqual(loggedMessages[logType].length, 0);
                }
            });
        });
    });

    it('should log an exception', () => {
        const level = 'exception';
        logger[level](`this is a ${level} message`, new Error('foo'));

        assert.strictEqual(loggedMessages.error.length, 1);

        // check it contains the message - no exact match as prefix [telemetry] will be added
        assert.notStrictEqual(loggedMessages.error[0].indexOf(`this is a ${level} message`), -1);
    });

    it('should mask secrets', () => {
        const decl = {
            passphrase: {
                cipherText: 'foo'
            }
        };
        logger.info(`this contains secrets: ${JSON.stringify(decl)}`);
        assert.notStrictEqual(loggedMessages.info[0].indexOf('this contains secrets: {"passphrase":{*********}}'), -1);
    });

    it('should stringify object', () => {
        const msg = {
            foo: 'bar'
        };
        logger.info(msg);
        assert.notStrictEqual(loggedMessages.info[0].indexOf('{"foo":"bar"}'), -1);
    });

    it('should get a child logger', () => {
        const prefix = 'prefix';
        const childLogger = logger.getChild(prefix);
        childLogger.logger = loggerMock;

        childLogger.info('foo');
        assert.notStrictEqual(loggedMessages.info[0].indexOf(`[telemetry.${prefix}]`), -1);
    });
});
