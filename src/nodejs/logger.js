/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

let logger;
try {
    logger = require('f5-logger').getInstance(); // eslint-disable-line
} catch (e) {
    // just continue
}

/**
 * Stringify a message
 *
 * @param {Object|String} msg - message to stringify
 *
 * @returns {Object} Stringified message
 */
function stringify(msg) {
    if (typeof msg === 'object') {
        try {
            msg = JSON.stringify(msg);
        } catch (e) {
            // just leave original message intact
        }
    }
    return msg;
}

/**
 * Mask Secrets (as needed)
 *
 * @param {String} msg - message to mask
 *
 * @returns {Object} Masked message
 */
function maskSecrets(msg) {
    let ret = msg;
    const secrets = {
        passphrase: { replace: /(?:"passphrase":{)(.*?)(?:})/g, with: '"passphrase":{*********}' }
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

const prepareMsg = function (prefix, msg) {
    return `[${prefix}] ${maskSecrets(stringify(msg))}`;
};


/* f5-logger module supports the following levels
levels: {
    finest: 0,
    finer: 1,
    fine: 2,
    config: 3,
    info: 4,
    warning: 5,
    severe: 6
}
*/
/**
 * Logger class
 *
 * @param {String} prefix - message prefix, will be printed inside '[]' in the beginning of message
 */
function Logger(prefix) {
    this.prefix = prefix || '';
}
/**
 * Get child logger
 *
 * @param {String} prefix - message prefix, will be joined with parent's prefix
 *
 * @returns {Logger} new Logger object
 */
Logger.prototype.getChild = function (prefix) {
    return new Logger(`${this.prefix}.${prefix}`);
};
Logger.prototype.error = function (msg) {
    logger.severe(prepareMsg(this.prefix, msg));
};
Logger.prototype.info = function (msg) {
    logger.info(prepareMsg(this.prefix, msg));
};
Logger.prototype.debug = function (msg) {
    logger.finest(prepareMsg(this.prefix, msg));
};
Logger.prototype.exception = function (msg, err) {
    logger.finest(prepareMsg(this.prefix, `${msg}\nTraceback:\n${err.stack || 'no traceback available'}`));
};


module.exports = new Logger('telemetry');
