/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('../../../winstonLogger').logger;

/**
 * @module test/functional/shared/utils/logger
 */

/**
 * Create new child logger
 *
 * @param {string} parentPrefix - parent's prefix
 * @param {string} childPrefix - child's prefix
 *
 * @returns {Logger} instance
 */
function getChild(parentPrefix, childPrefix) {
    // eslint-disable-next-line no-use-before-define
    return new Logger(`${parentPrefix}.${childPrefix}`);
}

/**
 * Logger class
 */
class Logger {
    /**
     * Constructor
     *
     * @param {string} prefix - message prefix, will be printed inside '[]' in the beginning of message
     */
    constructor(prefix) {
        [
            'alert',
            'crit',
            'debug',
            'emerg',
            'error',
            'info',
            'notice',
            'warning'
        ].forEach((logLevel) => Object.defineProperty(this, logLevel, {
            value: logger.log.bind(logger, logLevel, `[${prefix}]`)
        }));

        Object.defineProperty(this, 'getChild', {
            value: getChild.bind(this, prefix)
        });
    }
}

module.exports = new Logger('main');
