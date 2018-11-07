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
    return `[telemetry::Splunk] ${msg}`;
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
const error = function (msg) { logger.severe(stringify(msg)); };
const info = function (msg) { logger.info(stringify(msg)); };
const debug = function (msg) { logger.finest(stringify(msg)); };

module.exports = {
    error,
    info,
    debug
};
