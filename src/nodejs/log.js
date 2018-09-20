/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('f5-logger').getInstance();

// Variable to force debug log level by default during development
const DEBUG = true;

// map syslog level values to names
// const syslogLevels = [ 'emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug' ];

// map syslog/iLX log-level names to values
const logLevelNames = {
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
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
 * @param {string} [level="error"]
 * @returns {object} - log message as object (not string)
 */
const log = function (info, levelName) {
    var level = 7;
    if (!DEBUG && typeof level === 'string' && logLevelNames[levelName] !== undefined) {
        level = logLevelNames[levelName];
    }

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
 * These log.foo(info) functions alias log(info,foo)
 *
 * @public
 * @param {string|Error|object} info
 * @returns {object}
 */
const debug = function (x)   { return log(x, 'debug'); };
const notice = function (x)  { return log(x, 'notice'); };
const info = function (x)    { return log(x, 'info'); };
const warning = function (x) { return log(x, 'warning'); };
const error = function (x)   { return log(x, 'error'); };

module.exports = {
    DEBUG,
    logLevelNames,
    debug,
    notice,
    info,
    warning,
    error
};
