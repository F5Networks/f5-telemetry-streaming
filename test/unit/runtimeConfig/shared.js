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

/* eslint-disable no-template-curly-in-string */

const pathUtil = require('path');

const RESTNODE_SCRIPT_FNAME = '/etc/bigstart/scripts/restnoded';
const UPDATER_DIR = pathUtil.join(__dirname, '../../../src/lib/runtimeConfig');
const UPDATER_LOGS = pathUtil.join(UPDATER_DIR, 'logs.txt');

let virtualFS = null;

function getTaskID() {
    return JSON.parse(virtualFS.readFileSync(pathUtil.join(UPDATER_DIR, 'config.json'))).id;
}

function makeScript(execLine, exExecLine, commentBlock) {
    execLine = execLine || 'exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1';
    exExecLine = exExecLine || 'exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1';

    const out = [
        '#!/bin/sh',
        '',
        'if [ -f /service/${service}/debug ]; then',
        '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
        'else'
    ];
    if (typeof commentBlock === 'undefined' || commentBlock) {
        out.push(
            '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
            '    # To restore original behavior, uncomment the next line and remove the block below.',
            '    #',
            `    # ${exExecLine}`,
            '    #',
            '    # The block below should be removed to restore original behavior!',
            `    # ID:${getTaskID()}`
        );
    }
    out.push(
        `    ${execLine}`,
        'fi',
        ''
    );
    return out.join('\n');
}

module.exports = {
    deleteScript() {
        return virtualFS.unlinkSync(RESTNODE_SCRIPT_FNAME);
    },
    getScript() {
        return virtualFS.readFileSync(RESTNODE_SCRIPT_FNAME).toString();
    },
    destroy() {
        virtualFS = null;
    },
    init({ virtFS }) {
        virtualFS = virtFS;
    },
    makeScript,
    makeShortScript(execLine, exExecLine) {
        return makeScript(execLine, exExecLine, false);
    },

    GC_DEFAULT: false,
    HEAP_SIZE_DEFAULT: 1400,
    HTTP_TIMEOUT_DEFAULT: 60000,
    HTTP_TIMEOUT_DEFAULT_SEC: 60,
    RESTNODE_SCRIPT_FNAME,
    UPDATER_DIR,
    UPDATER_LOGS
};
