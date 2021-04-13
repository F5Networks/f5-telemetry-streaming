/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const maskSecrets = require('./utils/misc').maskSecrets;
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
const NOTSET = 0;
const DEBUG = 10;
const INFO = 20;
const WARNING = 30;
const ERROR = 40;

const LOG_LEVELS = {
    notset: NOTSET,
    debug: DEBUG,
    info: INFO,
    warning: WARNING,
    error: ERROR
};
Object.keys(LOG_LEVELS).forEach((key) => {
    LOG_LEVELS[LOG_LEVELS[key]] = key;
});

let CURRENT_LOG_LEVEL = NOTSET;

/**
 * Process log message
 *
 * @param {string} prefix - message prefix
 * @param {string} message - message to process
 *
 * @returns {string} processed message
 */
const processMessage = function (prefix, message) {
    return `[${prefix}] ${maskSecrets(stringify(message))}`;
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
        this.logger = f5logger;
        this.prefix = prefix || '';
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
        return levelName ? LOG_LEVELS[levelName] : CURRENT_LOG_LEVEL;
    }

    /**
     * Get Log Level name, by default returns name for current global logLevel
     *
     * @property {string} [level] - log level value.
     *
     * @returns {number} log level name
     */
    getLevelName(level) {
        if (level === undefined) {
            level = CURRENT_LOG_LEVEL;
        }
        let levelName = LOG_LEVELS[level];
        if (levelName === undefined) {
            levelName = `Level ${level}`;
        }
        return levelName;
    }

    /**
     * @param {any} msg - debug message
     */
    debug(msg) {
        if (DEBUG >= CURRENT_LOG_LEVEL) {
            this.logger.finest(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - debug message
     * @param {Error} err - error
     */
    debugException(msg, err) {
        if (DEBUG >= CURRENT_LOG_LEVEL) {
            this.logger.finest(processMessage(this.prefix, `${msg}\nTraceback:\n${(err && err.stack) || 'no traceback available'}`));
        }
    }

    /**
     * @param {any} msg - error message
     */
    error(msg) {
        if (ERROR >= CURRENT_LOG_LEVEL) {
            this.logger.severe(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - error message
     * @param {Error} err - error
     */
    exception(msg, err) {
        if (ERROR >= CURRENT_LOG_LEVEL) {
            this.logger.severe(processMessage(this.prefix, `${msg}\nTraceback:\n${(err && err.stack) || 'no traceback available'}`));
        }
    }

    /**
     * @param {any} msg - info message
     */
    info(msg) {
        if (INFO >= CURRENT_LOG_LEVEL) {
            this.logger.info(processMessage(this.prefix, msg));
        }
    }

    /**
     * @param {any} msg - warning message
     */
    warning(msg) {
        if (WARNING >= CURRENT_LOG_LEVEL) {
            this.logger.warning(processMessage(this.prefix, msg));
        }
    }
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
    CURRENT_LOG_LEVEL = INFO;
    mainLogger.info(`Global logLevel set to '${levelName}'`);
    CURRENT_LOG_LEVEL = level;
};
mainLogger.setLogLevel(INFO);

module.exports = mainLogger;
