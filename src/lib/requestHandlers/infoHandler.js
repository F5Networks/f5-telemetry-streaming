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

const appInfo = require('../appInfo');
const BaseRequestHandler = require('./baseHandler');
const router = require('./router');

/**
 * Request handler for /info endpoint
 */
class InfoEndpointHandler extends BaseRequestHandler {
    /**
     * Get response code
     *
     * @returns {Integer} response code
     */
    getCode() {
        return this.code;
    }

    /**
     * Get response body
     *
     * @returns {Any} response body
     */
    getBody() {
        return this.body;
    }

    /**
     * Process request
     *
     * @returns {Promise<InfoEndpointHandler>} resolved with instance of InfoEndpointHandler once request processed
     */
    process() {
        this.code = 200;
        this.body = {
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
        return Promise.resolve(this);
    }
}

router.on('register', (routerInst) => routerInst.register('GET', '/info', InfoEndpointHandler));

module.exports = InfoEndpointHandler;
