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
const deepCopy = require('../utils/misc').deepCopy;
const ErrorHandler = require('./errorHandler');
const httpErrors = require('./httpErrors');
const configWorker = require('../config');
const logger = require('../logger');
const router = require('./router');

/**
 * Request handler for /declare endpoint
 */
class DeclareEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<DeclareEndpointHandler>} resolved with instance of DeclareEndpointHandler
     *      once request processed
     */
    process() {
        let promise;
        const namespace = this.params && this.params.namespace ? this.params.namespace : undefined;

        if (this.getMethod() === 'POST') {
            if (DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG) {
                logger.debug('Can\'t process new declaration while previous one is still in progress');
                return Promise.resolve(new ErrorHandler(new httpErrors.ServiceUnavailableError()));
            }

            const declaration = this.restOperation.getBody();
            // compute request metadata
            const metadata = {
                message: 'Incoming declaration via REST API',
                originDeclaration: deepCopy(declaration)
            };
            if (namespace) {
                metadata.namespace = namespace;
            }
            metadata.sourceIP = this.getHeaders()['X-Forwarded-For'];

            DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = true;
            promise = namespace
                ? configWorker.processNamespaceDeclaration(declaration, this.params.namespace, { metadata })
                : configWorker.processDeclaration(declaration, { metadata });

            promise = promise
                .then((config) => {
                    DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = false;
                    return config;
                })
                .catch((err) => {
                    DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = false;
                    return Promise.reject(err);
                });
        } else {
            promise = configWorker.getDeclaration(namespace);
        }

        return promise.then((config) => {
            this.code = 200;
            this.body = {
                message: 'success',
                declaration: config
            };
            return this;
        })
            .catch((error) => new ErrorHandler(error).process());
    }
}

DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = false;

router.on('register', (routerInst) => {
    routerInst.register('GET', '/declare', DeclareEndpointHandler);
    routerInst.register('POST', '/declare', DeclareEndpointHandler);
    routerInst.register('GET', '/namespace/:namespace/declare', DeclareEndpointHandler);
    routerInst.register('POST', '/namespace/:namespace/declare', DeclareEndpointHandler);
});

module.exports = DeclareEndpointHandler;
