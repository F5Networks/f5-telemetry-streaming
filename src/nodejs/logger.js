/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

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
const ERROR = 30;

const logLevels = {
    notset: NOTSET,
    debug: DEBUG,
    info: INFO,
    error: ERROR
};
Object.keys(logLevels).forEach((key) => {
    logLevels[logLevels[key]] = key;
});
let currentLogLevel = NOTSET;


/**
 * Stringify a message
 *
 * @param {Object|String} msg - message to stringify
 *
 * @returns {Object|String} Stringified message (or at least we tried to)
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
 * @returns {String} Masked message
 */
function maskSecrets(msg) {
    let ret = msg;
    const secrets = {
        passphrase: {
            replace: /(?:"passphrase":{)(.*?)(?:})/g,
            with: '"passphrase":{*********}'
        }
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
Logger.prototype.debug = function (msg) {
    if (DEBUG >= currentLogLevel) {
        this.logger.finest(prepareMsg(this.prefix, msg));
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
