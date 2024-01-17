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
const router = require('./router');
const systemPoller = require('../systemPoller');

/**
 * Request handler for /systempoller endpoint
 */
class SystemPollerEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<SystemPollerEndpointHandler>} resolved with instance of SystemPollerEndpointHandler
     *      once request processed
     */
    process() {
        return systemPoller.getPollersConfig(this.params.system, {
            pollerName: this.params.poller,
            namespace: this.params.namespace,
            includeDisabled: true
        })
            .then(systemPoller.fetchPollersData.bind(systemPoller))
            .then((fetchedData) => {
                this.code = 200;
                this.body = fetchedData.map((d) => d.data);
                return this;
            })
            .catch((error) => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst, enableDebug) => {
    if (enableDebug) {
        routerInst.register('GET', '/systempoller/:system/:poller?', SystemPollerEndpointHandler);
        routerInst.register('GET', '/namespace/:namespace/systempoller/:system/:poller?', SystemPollerEndpointHandler);
    }
});

module.exports = SystemPollerEndpointHandler;
