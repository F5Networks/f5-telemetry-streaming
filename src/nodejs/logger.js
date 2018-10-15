/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('f5-logger').getInstance(); // eslint-disable-line import/no-unresolved

const stringify = function (msg) {
    if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
    }
    return `[telemetry] ${msg}`;
};

const error = function (msg) { logger.severe(stringify(msg)); };
const info = function (msg) { logger.info(stringify(msg)); };
const debug = function (msg) { logger.debug(stringify(msg)); };

module.exports = {
    error,
    info,
    debug
};
