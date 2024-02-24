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

const assert = require('assert');
const Console = require('console').Console;
const fs = require('fs');
const pathUtil = require('path');

/** @module runtimeConfig/updater */

/**
 * THE SCRIPT MAY BE RUN IN TWO CONTEXTS:
 * - restnoded context as regular iApp LX - all libs are available
 * - as regular node.js script - none of iApp LX libs are available
 */

// approximation for default heap size
const NODEJS_DEFAULT_HEAP_SIZE = 1400;

// should be used to check single-line only
const RESTNODE_EXEC_LINE_REGEX = /^.*exec\s*\/usr\/bin\/f5-rest-node/;

const SCRIPT_CONFIG_ID = /# ID:[a-zA-Z0-9-]+/gm;

// the restnode startup script
const RESTNODE_SCRIPT_FPATH = '/etc/bigstart/scripts/restnoded';

// actual config to apply
const SCRIPT_CONFIG_FPATH = pathUtil.join(__dirname, 'config.json');

// most recent logs
const SCRIPT_LOGS_FPATH = pathUtil.join(__dirname, 'logs.txt');

/**
 * Add notes about restoring original behavior to the script's content
 *
 * @private
 *
 * @param {string} script
 * @param {string} execLine
 * @param {AppContext} appCtx
 *
 * @returns {string} updated script
 */
function addAttentionBlockIfNeeded(script, execLine, appCtx) {
    if (script.indexOf('modified by F5 BIG-IP Telemetry Streaming') !== -1) {
        appCtx.logger.debug('"notice" block exists already.');
        return script;
    }

    appCtx.logger.debug('Adding "notice" block to the script.');

    const indent = getIndent(execLine);
    // eslint-disable-next-line prefer-template
    const comment = `${indent}# ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!\n`
        + `${indent}# To restore original behavior, uncomment the next line and remove the block below.\n`
        + `${indent}#\n`
        + `${indent}# ${execLine.slice(indent.length)}\n`
        + `${indent}#\n`
        + `${indent}# The block below should be removed to restore original behavior!\n`
        + execLine;

    return script.replace(execLine, comment);
}

/**
 * Apply configuration to the script
 *
 * @private
 *
 * @param {string} script
 * @param {ScriptConfig} config
 * @param {AppContext} appCtx
 *
 * @returns {null | string} modified script or null if unable to modify
 */
function applyScriptConfig(script, config, appCtx) {
    appCtx.logger.info(`Applying configuration to the script: ${JSON.stringify(config)}`);

    const currentConfig = fetchConfigFromScript(script, appCtx);
    if (currentConfig === null) {
        appCtx.logger.info('No configuration read from the script.');
        return null;
    }

    let hasChanges = false;
    try {
        assert.deepStrictEqual(currentConfig, config);
    } catch (error) {
        hasChanges = true;
    }

    if (!hasChanges) {
        appCtx.logger.info('No diffs found in current and new config.');
        return null;
    }

    appCtx.logger.info('Found diffs in current and new config.');

    // do not trim it! will be used for replacement later
    const originExecLine = getExecLine(script);
    let newExecLine = originExecLine;

    // enable/disable GC
    if (currentConfig.gcEnabled !== config.gcEnabled) {
        appCtx.logger.info('Updating GC config.');
        newExecLine = newExecLine.replace(/ --expose-gc/g, '');
        if (config.gcEnabled) {
            appCtx.logger.info('Enabling GC config.');
            const substr = newExecLine.match(RESTNODE_EXEC_LINE_REGEX)[0];
            newExecLine = newExecLine.slice(0, substr.length)
                .concat(' --expose-gc')
                .concat(newExecLine.slice(substr.length));
        } else {
            appCtx.logger.info('Disabling GC config.');
        }
    }

    // enable/disable custom heap size
    if (currentConfig.heapSize !== config.heapSize) {
        appCtx.logger.info('Upading heap size.');
        newExecLine = newExecLine.replace(/ --max_old_space_size=\d+/g, '');
        if (config.heapSize
            && Number.isSafeInteger(config.heapSize)
            && config.heapSize > NODEJS_DEFAULT_HEAP_SIZE
        ) {
            appCtx.logger.info(`Setting heap size to ${config.heapSize} MB.`);
            const substr = newExecLine.match(RESTNODE_EXEC_LINE_REGEX)[0];
            newExecLine = newExecLine.slice(0, substr.length)
                .concat(` --max_old_space_size=${config.heapSize}`)
                .concat(newExecLine.slice(substr.length));
        } else {
            appCtx.logger.info(`Setting heap size to default value - ${NODEJS_DEFAULT_HEAP_SIZE} MB.`);
        }
    }

    if (currentConfig.id) {
        script = script.replace(new RegExp(`^.*ID:${currentConfig.id}.*(?:\r\n|\n)`, 'm'), '');
    }
    newExecLine = `${getIndent(originExecLine)}# ID:${config.id}\n${newExecLine}`;

    script = addAttentionBlockIfNeeded(script, originExecLine, appCtx);
    script = script.replace(originExecLine, newExecLine);
    return script;
}

/**
 * Delete file
 *
 * @private
 *
 * @param {string} path
 * @param {AppContext} appCtx
 *
 * @returns {boolean} true on success
 */
function deleteFile(path, appCtx) {
    appCtx.logger.info(`Deleting file "${path}"`);
    try {
        appCtx.fsUtil.unlinkSync(path);
        return true;
    } catch (err) {
        appCtx.logger.exception(`Unable to delete file "${path}":`, err);
    }
    return false;
}

/**
 * Enrich script config with defaults
 *
 * @private
 *
 * @param {ScriptConfig} config
 *
 * @returns {ScriptConfig}
 */
function enrichScriptConfig(config) {
    if (typeof config.gcEnabled === 'undefined') {
        config.gcEnabled = false;
    }
    if (typeof config.heapSize === 'undefined') {
        config.heapSize = NODEJS_DEFAULT_HEAP_SIZE;
    }
    return config;
}

/**
 * Grab current config state for the script
 *
 * @public
 *
 * @param {string} script
 * @param {AppContext} appCtx
 *
 * @returns {null | ScriptConfig} script's config data or null if unable to read/parse
 */
function fetchConfigFromScript(script, appCtx) {
    const execLine = getExecLine(script);
    if (!execLine) {
        appCtx.logger.error('Unable to find "exec" line in the script');
        return null;
    }

    appCtx.logger.info('Parsing configuration from the script');

    const config = enrichScriptConfig({});
    // check for GC
    config.gcEnabled = execLine.indexOf('--expose-gc') !== -1;

    // check for custom heap size
    const heapMatch = execLine.match(/--max_old_space_size=(\d+)/);
    if (heapMatch) {
        config.heapSize = parseInt(heapMatch[1], 10);
    }

    const scriptIDMatch = script.match(SCRIPT_CONFIG_ID);
    if (scriptIDMatch) {
        config.id = scriptIDMatch[0].split(':')[1];
    }

    appCtx.logger.info(`Parsed configuration from the script: ${JSON.stringify(config)}`);
    return config;
}

/**
 * Search for a line 'exec /usr/bin/f5-rest-node
 *
 * @private
 *
 * @param {string} data
 *
 * @returns {string} exec line if found otherwise empty string
 */
function getExecLine(data) {
    data = data.split('\n')
        .filter((line) => RESTNODE_EXEC_LINE_REGEX.test(line)
            && line.indexOf('--debug') === -1
            && line.indexOf('--inspect') === -1);

    return data.length === 0 ? '' : data[data.length - 1];
}

/**
 * Extract indentation from string
 *
 * @private
 *
 * @param {string} string
 *
 * @returns {string} indentation string
 */
function getIndent(string) {
    const m = string.match(/^(\s+)/);
    return m ? m[1] : '';
}

/**
 * Read data from the file
 *
 * @private
 *
 * @param {string} path
 * @param {AppContext} appCtx
 *
 * @returns {null | string} file content if file read or null
 */
function readFile(path, appCtx) {
    appCtx.logger.info(`Reading data from file "${path}"`);
    try {
        return appCtx.fsUtil.readFileSync(path).toString();
    } catch (err) {
        appCtx.logger.exception(`Unable to read file "${path}":`, err);
    }
    return null;
}

/**
 * Write content to the file
 *
 * @private
 *
 * @param {string} path
 * @param {string} data
 * @param {AppContext} appCtx
 *
 * @returns {boolean} true on success
 */
function writeFile(path, data, appCtx) {
    appCtx.logger.info(`Writing data to file "${path}"`);
    try {
        appCtx.fsUtil.writeFileSync(path, data, { flag: 'w' });
        return true;
    } catch (err) {
        appCtx.logger.exception(`Unable to write data to file "${path}":`, err);
    }
    return false;
}

/**
 * Shortcuts for generic functions
 */
// cleanup logs
const cleanupLogsFile = (appCtx) => deleteFile(SCRIPT_LOGS_FPATH, appCtx);
// read logs
const readLogsFile = (appCtx) => readFile(SCRIPT_LOGS_FPATH, appCtx);
// read task config from the file
const readScriptConfigFile = (appCtx) => {
    const data = readFile(SCRIPT_CONFIG_FPATH, appCtx);
    return data === null ? data : JSON.parse(data);
};
// read the restnode script data
const readScriptFile = (appCtx) => readFile(RESTNODE_SCRIPT_FPATH, appCtx);
// write task config to the file
const saveScriptConfigFile = (data, appCtx) => writeFile(SCRIPT_CONFIG_FPATH, JSON.stringify(data), appCtx);
// override the restnode script with new scriprt
const saveScriptFile = (data, appCtx) => writeFile(RESTNODE_SCRIPT_FPATH, data, appCtx);

/**
 * Main routine - applies user-defined configuration to restnode startup script
 */
function main(fsUtil) {
    fsUtil = fsUtil || fs;

    const logsStream = fsUtil.createWriteStream(SCRIPT_LOGS_FPATH, { flags: 'w' });
    const logger = new Console(logsStream, logsStream);

    const appCtx = {
        fsUtil,
        logger: {
            debug: logger.log.bind(logger),
            error: logger.log.bind(logger),
            exception: logger.log.bind(logger),
            info: logger.log.bind(logger)
        }
    };

    function inner() {
        let newConfig = readScriptConfigFile(appCtx);
        if (newConfig === null || !(typeof newConfig.id === 'string' && newConfig.id)) {
            appCtx.logger.info('No config found, nothing to apply to the script!');
            return;
        }

        let script = readScriptFile(appCtx);
        if (script === null) {
            appCtx.logger.info('Unable to read "restnode" startup script!');
            return;
        }

        newConfig = enrichScriptConfig(newConfig);
        script = applyScriptConfig(script, newConfig, appCtx);
        if (script === null) {
            appCtx.logger.info('The "restnode" startup script not modified!');
            return;
        }

        if (!saveScriptFile(script, appCtx)) {
            appCtx.logger.info('Unable to save "restnode" startup script!');
        } else {
            appCtx.logger.info('Done!');
        }
    }

    try {
        inner();
    } catch (error) {
        logger.exception('Uncaught error:', error);
    }

    logsStream.end(() => logsStream.close());
}

if (require.main === module) {
    main();
}

module.exports = {
    cleanupLogsFile,
    enrichScriptConfig,
    fetchConfigFromScript(appCtx) {
        const script = readScriptFile(appCtx);
        return script ? fetchConfigFromScript(script, appCtx) : null;
    },
    main,
    readLogsFile,
    readScriptConfigFile,
    saveScriptConfigFile
};

/**
 * @typedef AppContext
 * @type {object}
 * @property {FSLikeObject} fsUtil
 * @property {LoggerLikeObject} logger
 */
/**
 * @typedef FSLikeObject
 * @type {object}
 * @property {function} readFileSync
 * @property {function} writeFileSync
 */
/**
 * @typedef LoggerLikeObject
 * @type {object}
 * @property {function(string)} debug
 * @property {function(string)} error
 * @property {function(string, error)} exception
 * @property {function(string)} info
 * @property {function(string)} warning
 */
/**
 * @typedef ScriptConfig
 * @type {Object}
 * @property {boolean} gcEnabled - true when GC enabled
 * @property {number} heapSize - heap size (in MB)
 * @property {string} id - configuration ID
 */
