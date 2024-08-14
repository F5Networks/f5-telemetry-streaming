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

const querystring = require('querystring');

/**
 * Request Class
 */
class Request {
    /**
     * Constructor
     *
     * @param {Object} restOperation
     * @param {Object} params
     */
    constructor(restOperation, params = {}) {
        this.restOperation = restOperation;
        this.params = params;
    }

    /** @returns {any} HTTP request body */
    getBody() {
        return this.restOperation.getBody();
    }

    /** @returns {string} HTTP Content-Type header value */
    getContentType() {
        return this.restOperation.getContentType().toLowerCase();
    }

    /** @returns {object} HTTP request headers */
    getHeaders() {
        return this.restOperation.getHeaders() || {};
    }

    /** @returns {string} HTTP method name converted to upper case */
    getMethod() {
        return this.restOperation.getMethod().toUpperCase();
    }

    /** @returns {object} HTTP URI params */
    getUriParams() {
        return this.params;
    }

    /** @returns {object} HTTP query params */
    getQueryParams() {
        if (!this._queryParams) {
            const search = this.restOperation.getUri().search;
            // ignore leading ?
            this._queryParams = search ? querystring.parse(search.slice(1)) : {};
        }
        return this._queryParams;
    }

    /** @returns {string} HTTP URI */
    getURI() {
        return this.restOperation.getUri().pathname;
    }
}

module.exports = Request;
