/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const winston = require('winston');

const LOG_FILE = `${__dirname}/artifacts/testoutput.log`;
const LOG_DST = ['console', 'file'].find((item) => item === (process.env.LOG_DST || 'file').trim());
const LOG_SECRETS_ENABLED = !!['1', 'true'].find((item) => item === process.env.LOG_SECRETS);

const SECRETS_MASK = '*********';
const KEYWORDS_TO_MASK = [
    {
        /**
         * single line:
         *
         * { "passphrase": { ...secret... } }
         */
        str: 'passphrase',
        replace: /(\\{0,}["']{0,1}passphrase\\{0,}["']{0,1}\s*:\s*){.*?}/g,
        with: `$1{${SECRETS_MASK}}`
    },
    {
        /**
         * {
         *     "passphrase": "secret"
         * }
         */
        str: 'passphrase',
        replace: /(\\{0,}["']{0,1}passphrase\\{0,}["']{0,1}\s*:\s*)(\\{0,}["']{1}).*?\2/g,
        with: `$1$2${SECRETS_MASK}$2`
    },
    {
        /**
         * {
         *     someSecret: {
         *         cipherText: "secret"
         *     }
         * }
         */
        str: 'cipherText',
        replace: /(\\{0,}["']{0,1}cipherText\\{0,}["']{0,1}\s*:\s*)(\\{0,}["']{1}).*?\2/g,
        with: `$1$2${SECRETS_MASK}$2`
    }
];

// create dir if not exists
const artifactsDir = path.parse(LOG_FILE);
if (!fs.existsSync(artifactsDir.dir)) {
    try {
        fs.mkdirSync(artifactsDir.dir);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
}

// using syslog level
winston.setLevels(winston.config.syslog.levels);

/**
 * Mask Secrets (as needed)
 *
 * @param {String} msg - message to mask
 *
 * @returns {String} Masked message
 */
function maskSecrets(msg) {
    if (LOG_SECRETS_ENABLED) {
        return msg;
    }
    let ret = msg;
    // place in try/catch
    try {
        KEYWORDS_TO_MASK.forEach((keyword) => {
            if (msg.indexOf(keyword.str) !== -1) {
                ret = ret.replace(keyword.replace, keyword.with);
            }
        });
    } catch (e) {
        // just continue
    }
    return ret;
}

const timestamp = () => (new Date()).toISOString();
/* eslint-disable prefer-template */
const formatter = (options) => `[${options.timestamp()}][${options.level.toUpperCase()}] `
    + `${maskSecrets(options.message ? options.message : '')}`
    + `${maskSecrets(options.meta && Object.keys(options.meta).length ? ('\n' + JSON.stringify(options.meta, null, 4)) : '')}`;

// json === false to allow custom formatting
const fileTransport = new (winston.transports.File)({
    name: 'fileOutput',
    filename: LOG_FILE,
    level: 'debug',
    json: false,
    options: {
        flags: 'w'
    },
    timestamp,
    formatter
});

const fileLogger = new (winston.Logger)({
    transports: [
        fileTransport
    ]
});

function hookStream(stream, callback) {
    stream.write = (function (write) {
        return function (string, encoding, fd) {
            write.apply(stream, arguments); // comments this line if you don't want output in the console
            callback(string, encoding, fd);
        };
    }(stream.write));
}

/**
 * Instead of overriding all 'console' functions simply writing
 * stdout and stderr to fileLogger
 */
hookStream(process.stdout, (string) => {
    fileLogger.info('[STDOUT] %s', string.trim());
});

hookStream(process.stderr, (string) => {
    fileLogger.error('[STDERR] %s', string.trim());
});

console.info(`Writing logs to ${LOG_FILE}`);
console.info('Hooks to STDOUT and STDERR were applied');
console.info(`Secrets logging - ${LOG_SECRETS_ENABLED ? 'ENABLED' : 'DISABLED'}`);

if (LOG_DST === 'file') {
    console.info(`TS logs will be written to ${LOG_FILE}`);
} else if (LOG_DST === 'console') {
    console.info(`TS logs will be written to stdout and to ${LOG_FILE}`);
}

module.exports = {
    logger: fileLogger,
    tsLogger: (function () {
        let logger = fileLogger;
        if (LOG_DST === 'console') {
            logger = console;
        } else if (LOG_DST !== 'file') {
            logger = null;
        }
        return {
            logger,
            levels: {
                finest: 'debug',
                info: 'info',
                severe: 'error',
                warning: 'warn'
            }
        };
    }())
};
