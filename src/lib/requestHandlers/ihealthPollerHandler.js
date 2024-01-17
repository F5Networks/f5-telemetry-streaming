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

const BaseRequestHandler = require('./baseHandler');
const ErrorHandler = require('./errorHandler');
const ihealth = require('../ihealth');
const router = require('./router');

/**
 * Request handler for /ihealthpoller endpoint
 */
class IHealthPollerEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<IHealthPollerEndpointHandler>} resolved with instance of IHealthPollerEndpointHandler
     *      once request processed
     */
    process() {
        let responsePromise = Promise.resolve();
        if (!this.params.system) {
            responsePromise = responsePromise.then(() => new Promise(
                (resolve) => { resolve(ihealth.getCurrentState(this.params.namespace)); }
            )
                .then((statuses) => {
                    this.code = 200;
                    this.body = {
                        code: this.code,
                        message: statuses
                    };
                    return this;
                }));
        } else {
            responsePromise = responsePromise.then(() => ihealth.startPoller(this.params.system, this.params.namespace)
                .then((state) => {
                    this.code = state.isRunning ? 202 : 201;
                    this.body = {
                        code: this.code,
                        state
                    };
                    return this;
                }));
        }
        return responsePromise.catch((error) => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst, enableDebug) => {
    if (enableDebug) {
        routerInst.register('GET', '/ihealthpoller', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/ihealthpoller/:system', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/namespace/:namespace/ihealthpoller', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/namespace/:namespace/ihealthpoller/:system', IHealthPollerEndpointHandler);
    }
});

module.exports = IHealthPollerEndpointHandler;
