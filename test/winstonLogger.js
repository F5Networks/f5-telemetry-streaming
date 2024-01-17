/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const winston = require('winston');

const LOG_FILE = `${__dirname}/artifacts/testoutput.log`;
const LOG_DST = ['console', 'file'].find((item) => item === (process.env.LOG_DST || 'file').trim());
const LOG_SENSETIVE_INFO = !!['1', 'true'].find((item) => item === process.env.LOG_SECRETS);

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
    if (LOG_SENSETIVE_INFO) {
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
const fileLogger = new (winston.Logger)({
    levels: winston.config.syslog.levels,
    transports: [
        new (winston.transports.File)({
            name: 'fileOutput',
            filename: LOG_FILE,
            level: 'debug',
            json: false,
            options: {
                flags: 'w'
            },
            timestamp,
            formatter
        })
    ]
});
let mainLogger = fileLogger;

if (LOG_DST === 'console') {
    mainLogger = new (winston.Logger)({
        levels: winston.config.syslog.levels,
        transports: [
            new (winston.transports.Console)({
                name: 'consoleOutput',
                level: 'debug',
                json: false,
                timestamp,
                formatter
            })
        ]
    });
}

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
console.info(`Secrets logging - ${LOG_SENSETIVE_INFO ? 'ENABLED' : 'DISABLED'}`);

if (LOG_DST === 'file') {
    console.info(`TS logs will be written to ${LOG_FILE}`);
} else if (LOG_DST === 'console') {
    console.info(`TS logs will be written to stdout and to ${LOG_FILE}`);
}

module.exports = {
    logger: mainLogger,
    tsLogger: (function () {
        return {
            logger: mainLogger,
            levels: {
                finest: 'debug',
                info: 'info',
                severe: 'error',
                warning: 'warning'
            }
        };
    }())
};
