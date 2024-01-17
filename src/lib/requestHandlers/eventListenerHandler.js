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
const dataPublisher = require('../eventListener/dataPublisher');

/**
 * Request handler for /eventListener endpoint
 */
class EventListenerEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<EventListenerEndpointHandler>} resolved with instance of EventListenerEndpointHandler
     *                                                      once request processed
     */
    process() {
        const dataToSend = this.restOperation.getBody();
        return dataPublisher.sendDataToListener(
            dataToSend,
            this.params.eventListener,
            { namespace: this.params.namespace }
        )
            .then(() => {
                this.body = {
                    message: 'success',
                    data: dataToSend
                };
                this.code = 200;
                return this;
            })
            .catch((error) => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst, enableDebug) => {
    // Only enable endpoints if controls.Debug=true
    if (enableDebug) {
        routerInst.register('POST', '/eventListener/:eventListener', EventListenerEndpointHandler);
        routerInst.register('POST', '/namespace/:namespace/eventListener/:eventListener', EventListenerEndpointHandler);
    }
});

module.exports = EventListenerEndpointHandler;
