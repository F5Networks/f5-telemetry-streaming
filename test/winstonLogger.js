/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
    let ret = msg;
    const secrets = {
        passphrase: {
            replace: /(?:"passphrase":\s*{)(.*?)(?:})/g,
            with: '"passphrase":{*********}'
        },
        '"passphrase"': {
            replace: /(?:"passphrase":\s*")(.*?)(?:")/g,
            with: '"passphrase":"*********"'
        },
        cipherText: {
            replace: /(?:"cipherText":\s*")(.*?)(?:")/g,
            with: '"cipherText":"*********"'
        }
    };
    // place in try/catch
    try {
        Object.keys(secrets).forEach((k) => {
            if (msg.indexOf(k) !== -1) {
                ret = ret.replace(secrets[k].replace, secrets[k].with);
            }
        });
    } catch (e) {
        // just continue
    }
    return ret;
}


const timestamp = () => (new Date()).toISOString();
/* eslint-disable prefer-template */
const formatter = options => `[${options.timestamp()}][${options.level.toUpperCase()}] `
    + `${maskSecrets(options.message ? options.message : '')}`
    + `${maskSecrets(options.meta && Object.keys(options.meta).length ? ('\n' + JSON.stringify(options.meta, null, 4)) : '')}`;

// json === false to allow custom formatting
const fileTransport = new (winston.transports.File)({
    name: 'fileOutput',
    filename: LOG_FILE,
    level: 'debug',
    json: false,
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

module.exports = {
    logger: fileLogger
};
