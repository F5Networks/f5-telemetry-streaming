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

/**
 * Base class for Request Handlers
 */
class BaseRequestHandler {
    /**
     * Constructor
     *
     * @param {Object} restOperation
     * @param {Object} params
     */
    constructor(restOperation, params) {
        this.restOperation = restOperation;
        this.params = params;
    }

    /**
     * Get response body
     *
     * @returns {Any} response body
     */
    getBody() {
        throw new Error('Method "getBody" not implemented');
    }

    /**
     * Get response code
     *
     * @returns {Integer} response code
     */
    getCode() {
        throw new Error('Method "getCode" not implemented');
    }

    /**
     * Get HTTP headers
     *
     * @returns {Object<string, any>} HTTP headers
     */
    getHeaders() {
        return this.restOperation.getHeaders() || {};
    }

    /**
     * Get HTTP method name
     *
     * @returns {String} HTTP method name converted to upper case
     */
    getMethod() {
        return this.restOperation.getMethod().toUpperCase();
    }

    /**
     * Get HTTP Content-Type
     * Base Handler returns undefined, allowing iControlRest to set Content-Type
     *
     * @returns {undefined} HTTP Content-Type header value
     */
    getContentType() {
        return undefined;
    }

    /**
     * Process request
     *
     * @returns {Promise<BaseRequestHandler>} resolved with instance of BaseRequestHandler
     *      once request processed
     */
    process() {
        return Promise.resolve(this);
    }
}

module.exports = BaseRequestHandler;
