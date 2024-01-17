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
const pullConsumers = require('../pullConsumers');
const router = require('./router');

/**
 * Request handler for /pullconsumer endpoint
 */
class PullConsumerEndpointHandler extends BaseRequestHandler {
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
     * Get HTTP Content-Type
     *
     * @returns {String} HTTP Content-Type header value
     */
    getContentType() {
        return this.contentType;
    }

    /**
     * Process request
     *
     * @returns {Promise<PullConsumerEndpointHandler>} resolved with instance of PullConsumerEndpointHandler
     *      once request processed
     */
    process() {
        return pullConsumers.getData(this.params.consumer, this.params.namespace)
            .then((response) => {
                this.code = 200;
                this.body = response.data;
                this.contentType = response.contentType || undefined; // If not set, default to iControlRest response
                return this;
            }).catch((error) => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst) => {
    routerInst.register('GET', '/pullconsumer/:consumer', PullConsumerEndpointHandler);
    routerInst.register('GET', '/namespace/:namespace/pullconsumer/:consumer', PullConsumerEndpointHandler);
});

module.exports = PullConsumerEndpointHandler;
