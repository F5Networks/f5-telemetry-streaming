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

const deepCopy = require('./utils/misc').deepCopy;
const maskJSONObjectDefaultSecrets = require('./utils/misc').maskJSONObjectDefaultSecrets;
const maskJSONStringDefaultSecrets = require('./utils/misc').maskJSONStringDefaultSecrets;
const stringify = require('./utils/misc').stringify;

/** @module logger */

let f5logger;
try {
    // eslint-disable-next-line global-require, import/no-unresolved
    f5logger = require('f5-logger').getInstance();
} catch (e) {
    f5logger = {
        severe() {},
        info() {},
        warning() {},
        finest() {}
    };
}

const proxy = {
    debug(msg) {
        f5logger.finest(msg);
    },
    error(msg) {
        f5logger.severe(msg);
    },
    info(msg) {
        f5logger.info(msg);
    },
    verbose(msg) {
        f5logger.finest(msg);
    },
    warning(msg) {
        f5logger.warning(msg);
    }
};

/**
 * f5-logger module supports the following levels
 * levels: {
 *     finest: 0,
 *     finer: 1,
 *     fine: 2,
 *     config: 3,
 *     info: 4,
 *     warning: 5,
 *     severe: 6
 * }
 */

/**
 * Logging levels
 */
const LOG_LEVELS = {
    NOTSET: 0,
    VERBOSE: 10,
    DEBUG: 20,
    INFO: 30,
    WARNING: 40,
    ERROR: 50
};
Object.keys(LOG_LEVELS).forEach((key) => {
    LOG_LEVELS[LOG_LEVELS[key]] = key;
});

let CURRENT_LOG_LEVEL = LOG_LEVELS.NOTSET;

/**
 * Process log message
 *
 * @param {string} prefix - message prefix
 * @param {string} message - message to process
 *
 * @returns {string} processed message
 */
const processMessage = function (prefix, message) {
    if (typeof message === 'object' && message !== null) {
        try {
            message = maskJSONObjectDefaultSecrets(deepCopy(message),
                { breakCircularRef: 'circularRefFound' });
        } catch (_) {
            // do nothing
        }
    }
    try {
        message = maskJSONStringDefaultSecrets(stringify(message));
    } catch (_) {
        // do nothing
    }
    return `[${prefix}] ${message}`;
};

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
        // the f5-logger only exists on BIG-IP, so for unit tests provide a mock
        this.logger = proxy;
        this.prefix = prefix;
    }

    /**
     * @param {string | number} aLevel - desired level
     *
     * @returns {boolean} true if log message will be logged under current logging level
     */
    isLevelAllowed(aLevel) {
        if (typeof aLevel === 'string') {
            aLevel = this.getLevel(aLevel.toLowerCase());
        } else if (typeof aLevel !== 'number') {
            aLevel = undefined;
        }

        return aLevel === undefined
            ? false
            : aLevel >= this.getLevel();
    }

    /**
     * Get child logger
     *
     * @param {string} prefix - message prefix, will be joined with parent's prefix
     *
     * @returns {Logger} new Logger object
     */
    getChild(prefix) {
        return new Logger(`${this.prefix}.${prefix}`);
    }

    /**
     * Get Log Level  value by name, by default returns value for current global logLevel
     *
     * @param {string} [levelName] - log level name
     *
     * @returns {number} log level value
     */
    getLevel(levelName) {
        return arguments.length > 0 ? LOG_LEVELS[levelName.toUpperCase()] : CURRENT_LOG_LEVEL;
    }

    /**
     * Get Log Level name, by default returns name for current global logLevel
     *
     * @property {string} [level] - log level value.
     *
     * @returns {number} log level name
     */
    getLevelName(level) {
        if (arguments.length === 0) {
            level = CURRENT_LOG_LEVEL;
        }
        let levelName = LOG_LEVELS[level];
        if (levelName === undefined) {
            levelName = `Level ${level}`;
        } else {
            levelName = levelName.toLowerCase();
        }
        return levelName;
    }

    /**
     * @param {any} msg - debug message
     */
    debug(msg) {
        if (LOG_LEVELS.DEBUG >= CURRENT_LOG_LEVEL) {
            this.logger.debug(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - debug message
     * @param {Error} err - error
     */
    debugException(msg, err) {
        if (LOG_LEVELS.DEBUG >= CURRENT_LOG_LEVEL) {
            this.logger.debug(processMessage(this.prefix, `${msg}\n${formatErr(err)}`));
        }
    }

    /**
     * @param {any} msg - error message
     */
    error(msg) {
        if (LOG_LEVELS.ERROR >= CURRENT_LOG_LEVEL) {
            this.logger.error(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - error message
     * @param {Error} err - error
     */
    exception(msg, err) {
        if (LOG_LEVELS.ERROR >= CURRENT_LOG_LEVEL) {
            this.logger.error(processMessage(this.prefix, `${msg}\n${formatErr(err)}`));
        }
    }

    /**
     * @param {any} msg - info message
     */
    info(msg) {
        if (LOG_LEVELS.INFO >= CURRENT_LOG_LEVEL) {
            this.logger.info(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - verbose message
     */
    verbose(msg) {
        if (LOG_LEVELS.VERBOSE >= CURRENT_LOG_LEVEL) {
            this.logger.verbose(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - verbose message
     * @param {Error} err - error
     */
    verboseException(msg, err) {
        if (LOG_LEVELS.VERBOSE >= CURRENT_LOG_LEVEL) {
            this.logger.debug(processMessage(this.prefix, `${msg}\n${formatErr(err)}`));
        }
    }

    /**
     * @param {any} msg - warning message
     */
    warning(msg) {
        if (LOG_LEVELS.WARNING >= CURRENT_LOG_LEVEL) {
            this.logger.warning(processMessage(this.prefix, msg));
        }
    }
}

/**
 * @param {Error} [err]
 *
 * @returns {string} formatted message
 */
function formatErr(err) {
    return `Message: ${(err && err.message) || err || 'no message available'}\nTraceback:\n${(err && err.stack) || 'no traceback available'}`;
}

const mainLogger = new Logger('telemetry');

/**
 * Set global logging level
 *
 * @param {String | Number} newLevel - new logging level
 */
mainLogger.setLogLevel = function (newLevel) {
    let level;
    let levelName;

    if (typeof newLevel === 'string') {
        levelName = newLevel.toLowerCase();
        level = mainLogger.getLevel(levelName);
    } else if (typeof newLevel === 'number') {
        level = newLevel;
        levelName = mainLogger.getLevelName(level);
    }
    if (level === undefined) {
        mainLogger.error(`Unknown logLevel - ${newLevel}`);
        return;
    }
    // allow user to see this log message to help us understand what happened with logLevel
    CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;
    mainLogger.info(`Global logLevel set to '${levelName}'`);
    CURRENT_LOG_LEVEL = level;
};
mainLogger.setLogLevel(LOG_LEVELS.INFO);

module.exports = mainLogger;
