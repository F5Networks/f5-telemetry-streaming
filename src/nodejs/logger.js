/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('f5-logger').getInstance(); // eslint-disable-line import/no-unresolved

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

const prepareMsg = function (msg) {
    return `[telemetry] ${maskSecrets(stringify(msg))}`;
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
const error = function (msg) { logger.severe(prepareMsg(msg)); };
const info = function (msg) { logger.info(prepareMsg(msg)); };
const debug = function (msg) { logger.finest(prepareMsg(msg)); };
const exception = function (msg, err) { logger.finest(prepareMsg(`${msg}\nTraceback:\n${err.stack || 'no traceback available'}`)); };

module.exports = {
    exception,
    error,
    info,
    debug
};
