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
