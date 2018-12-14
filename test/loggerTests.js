/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const logger = require('../src/nodejs/logger.js');

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

// purpose: validate logger functionality
describe('Logger', () => {
    beforeEach(() => {
        Object.keys(loggedMessages).forEach((level) => {
            loggedMessages[level] = [];
        });
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should log at the appropriate level', () => {
        Object.keys(loggedMessages).forEach((level) => {
            logger[level](`this is a ${level} message`);
        });

        ['error', 'info', 'debug'].forEach((level) => {
            assert.strictEqual(loggedMessages[level].length, 1);
        });

        // check it contains the message - no exact match as prefix [telemetry] will be added
        assert.notStrictEqual(loggedMessages.info[0].indexOf('this is a info message'), -1);
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
        const childLogger = logger.getChild('prefix');
        childLogger.logger = loggerMock;

        childLogger.info('foo');
        assert.notStrictEqual(loggedMessages.info[0].indexOf('[telemetry.prefix] foo'), -1);
    });
});
