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

const appInfo = require('../../appInfo');
const CT_APP_JSON = require('../contentTypes').APP_JSON;

/**
 * @module restapi/handlers/info
 *
 * @typedef {import('../../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../index').RequestHandler} RequestHandler
 */

/**
 * @implements {RequestHandler}
 */
const handler = Object.freeze({
    /** @inheritdoc */
    handle(req, res) {
        res.body = {
            branch: appInfo.branch,
            buildID: appInfo.buildID,
            buildTimestamp: appInfo.timestamp,
            fullVersion: appInfo.fullVersion,
            nodeVersion: process.version,
            release: appInfo.release,
            schemaCurrent: appInfo.schemaVersion.current,
            schemaMinimum: appInfo.schemaVersion.minimum,
            version: appInfo.version
        };
        res.code = 200;
        res.contentType = CT_APP_JSON;
    },
    name: 'Info'
});

module.exports = {
    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        appEvents.on('restapi.register', (register) => register('GET', '/info', handler));
    }
};
