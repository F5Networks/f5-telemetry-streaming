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

let logger;
try {
    // eslint-disable-next-line global-require, import/no-unresolved
    logger = require('f5-logger').getInstance();
} catch (e) {
    // continue
}

/** Logging levels
 */
const NOTSET = 0;
const DEBUG = 10;
const INFO = 20;
const WARNING = 30;
const ERROR = 40;

const logLevels = {
    notset: NOTSET,
    debug: DEBUG,
    info: INFO,
    warning: WARNING,
    error: ERROR
};
Object.keys(logLevels).forEach((key) => {
    logLevels[logLevels[key]] = key;
});
let currentLogLevel = NOTSET;

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
    // the f5-logger only exists on BIG-IP, so for unit tests provide a mock
    this.logger = logger
    || {
        severe() {},
        info() {},
        warning() {},
        finest() {}
    };
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
    if (ERROR >= currentLogLevel) {
        this.logger.severe(prepareMsg(this.prefix, msg));
    }
};
Logger.prototype.info = function (msg) {
    if (INFO >= currentLogLevel) {
        this.logger.info(prepareMsg(this.prefix, msg));
    }
};
Logger.prototype.warning = function (msg) {
    if (WARNING >= currentLogLevel) {
        this.logger.warning(prepareMsg(this.prefix, msg));
    }
};
Logger.prototype.debug = function (msg) {
    if (DEBUG >= currentLogLevel) {
        this.logger.finest(prepareMsg(this.prefix, msg));
    }
};
Logger.prototype.debugException = function (msg, err) {
    if (DEBUG >= currentLogLevel) {
        this.logger.finest(prepareMsg(this.prefix, `${msg}\nTraceback:\n${(err && err.stack) || 'no traceback available'}`));
    }
};
Logger.prototype.exception = function (msg, err) {
    if (ERROR >= currentLogLevel) {
        this.logger.severe(prepareMsg(this.prefix, `${msg}\nTraceback:\n${(err && err.stack) || 'no traceback available'}`));
    }
};

/**
 * Get Log Level name, by default returns name for current global logLevel
 *
 * @property {Number} [level] - log level value.
 *
 * @returns {String} log level name
 */
Logger.prototype.getLevelName = function (level) {
    if (level === undefined) {
        level = currentLogLevel;
    }
    let levelName = logLevels[level];
    if (levelName === undefined) {
        levelName = `Level ${level}`;
    }
    return levelName;
};

/**
 * Get Log Level  value by name, by default returns value for current global logLevel
 *
 * @param {String} [levelName] - log level name
 *
 * @returns {Number} log level value
 */
Logger.prototype.getLevel = function (levelName) {
    return levelName ? logLevels[levelName] : currentLogLevel;
};

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
    currentLogLevel = INFO;
    mainLogger.info(`Global logLevel set to '${levelName}'`);
    currentLogLevel = level;
};
mainLogger.setLogLevel(INFO);


module.exports = mainLogger;
