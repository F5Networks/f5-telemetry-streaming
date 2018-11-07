/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('f5-logger').getInstance(); // eslint-disable-line import/no-unresolved
const util = require('./util.js');

const addPrefix = function (msg) {
    return `[telemetry] ${util.stringify(msg)}`;
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
const error = function (msg) { logger.severe(addPrefix(msg)); };
const info = function (msg) { logger.info(addPrefix(msg)); };
const debug = function (msg) { logger.finest(addPrefix(msg)); };
const exception = function (msg, err) { logger.finest(addPrefix(`${msg}\nTraceback:\n${err.stack || 'no traceback available'}`)); };

module.exports = {
    exception,
    error,
    info,
    debug
};
