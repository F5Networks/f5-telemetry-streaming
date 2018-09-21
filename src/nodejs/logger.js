/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('f5-logger').getInstance();

const stringify = function(info) {
    if (typeof(info) === 'object') {
        info = JSON.stringify(info);
    }
    return `[telemetry] ${info}`;
}

const error = function(info) { logger.severe(stringify(info)) };
const info =  function(info) { logger.info(stringify(info)) };
const debug = function(info) { logger.debug(stringify(info)) };

module.exports = {
    error,
    info,
    debug
};