/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const logger = require('f5-logger').getInstance();

// Variable to force debug log level by default during development
const DEBUG = true;

// map syslog level values to names
const syslogLevels = [
    'emergency', 'alert', 'critical', 'error',
    'warning', 'notice', 'info', 'debug'
];

// map syslog level values to f5 iLX names
const f5restLevels = [
    'severe', 'severe', 'severe', 'severe',
    'warning', 'config', 'info', 'fine'
];

// map syslog/iLX log-level names to values
const logLevelNames = {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7,
    severe: 3,
    config: 5,
    fine: 7
};

/**
 * normalize provided info into an AS3 log object,
 * then if level <= current log level, convert
 * that to JSON string and pass it to the framework
 * logging subsystem.  Info may be a simple string,
 * an Error object, or an AS3 log-data object.
 * Return the normalized data (as object, not JSON
 * string).  This function is commonly invoked via
 * log.foo(info) where foo selects the level.  Note
 * that return value is not an Error object.
 *
 * @private
 * @param {string|Error|object} info
 * @param {string} [info.message] - if present, primary message
 * @param {string|number} [level="error"]
 * @param {boolean} [stack=false] - if true, log Error stack trace
 * @returns {object} - log message as object (not string)
 */
const log = function (info, level, stack) {
    if (typeof level === 'string') {
        if (logLevelNames[level] === undefined) { level = 'error'; }
        level = logLevelNames[level]; // now a number
    } else if (typeof level !== 'number') {
        level = logLevelNames.error;
    } else {
        level = ((level < 0) || (level > syslogLevels.length))
            ? logLevelNames.error : (level | 0);
    }
    const levelName = syslogLevels[level];
    const restLevel = f5restLevels[level];

    let data = {
        message: '' // make message appear first in JSON
    };
    let tmp;

    const infoType = (info === null) ? 'null' : typeof info;
    switch (infoType) {
    case 'string':
        tmp = info;
        if (!tmp.length) {
            tmp = new Error(`log.${levelName}() given empty string`);
            log(tmp, 'error', true);
            tmp = '(empty)';
        }
        data.message = tmp;
        break;

    case 'object':
        if (info instanceof Error) {
            // ignore possibility of malformed Error object
            tmp = info.name + ((info.name.length) ? ':\x20' : '');
            tmp += (info.message.length) ? info.message : '(empty)';
            data.message = tmp;

            if (['string', 'number'].indexOf(typeof info.code) + 1) {
                data.code = info.code.toString();
            }
            if ((typeof stack === 'boolean') && stack) {
                const s = info.stack;
                if ((typeof s === 'string') && s.length) {
                    data.stack = s.split(/\n +at +/);
                }
            }
        } else if (!Object.keys(info).length) {
            tmp = new Error(`log.${levelName}() given empty object`);
            log(tmp, 'error', true);
            data.message = '(empty object)';
        } else {
            try {
                tmp = JSON.stringify(info);
            } catch (e) {
                tmp = undefined;
            }
            if ((typeof tmp !== 'string') || !tmp.length) {
                tmp = new Error(`log.${levelName
                }() given unstringifiable object`);
                log(tmp, 'error', true);

                if (typeof info.message === 'string') {
                    data.message = (info.message.length) ? info.message : '(empty)';
                } else {
                    data.message = '(cannot stringify log info)';
                }
                break;
            }
            // otherwise
            data = info;
        }
        break;

    case 'undefined':
        tmp = new Error(`log.${levelName}() given undefined`);
        log(tmp, 'error', true);
        data.message = '(undefined)';
        break;

    case 'null':
    default:
        try {
            tmp = info.toString();
        } catch (e) {
            tmp = undefined;
        }
        if ((typeof tmp !== 'string') || !tmp.length) {
            tmp = new Error(`log.${levelName
            }() given unstringifiable ${infoType}`);
            log(tmp, 'error', true);

            tmp = `(unrecognized type ${infoType})`;
        }
        data.message = tmp;
        break;
    }

    return data;
}; // log()


/**
 * These log.foo(info[,stack]) functions alias log(info,foo[,stack])
 *
 * @public
 * @param {string|Error|object} info
 * @returns {object}
 */
const debug = function (x, s) { return log(x, 'debug', s); };
const notice = function (x, s) { return log(x, 'notice', s); };
const info = function (x, s) { return log(x, 'info', s); };
const warning = function (x, s) { return log(x, 'warning', s); };
const error = function (x, s) { return log(x, 'error', s); };
const critical = error;
const alert = error;
const emergency = error;

module.exports = {
    DEBUG,
    logLevelNames,
    debug,
    notice,
    info,
    warning,
    error,
    critical,
    alert,
    emergency
};
