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

const CT_APP_JSON = require('./contentTypes').APP_JSON;

class HttpError extends Error {
    /**
     * @param {integer} code - HTTP error code
     * @param {string} message - HTTP error message
     * @param {any} error - detailed error message
     */
    constructor(code, message, error) {
        super();
        this.code = code;
        this.message = message;
        this.error = error;
    }

    /** @returns {string | object} error body */
    getBody() {
        return {
            code: this.getCode(),
            error: this.getError(),
            message: this.getMessage()
        };
    }

    /** @returns {integer} HTTP error code */
    getCode() {
        return this.code;
    }

    /** @returns {string | undefined} HTTP content type */
    getContentType() {
        return CT_APP_JSON;
    }

    /** @returns {string | undefined} detailed error message */
    getError() {
        return this.error;
    }

    /** @returns {string} HTTP error */
    getMessage() {
        return this.message;
    }
}

/**
 * HTTP 500 Internal Server Error Class
 */
class InternalServerError extends HttpError {
    /** @param {any} error - detailed error message */
    constructor(error) {
        super(500, 'Internal Server Error', error);
    }
}

/**
 * HTTP 405 Method Not Allowed Error Class
 */
class MethodNotAllowedError extends HttpError {
    /** @param {string[]} allowed - allowed HTTP methods */
    constructor(allowed) {
        super(405, 'Method Not Allowed', `Allowed methods: ${allowed.join(', ')}`);
    }
}

/**
 * HTTP 404 Not Found Error Class
 */
class NotFoundError extends HttpError {
    /** @param {string} path - invalid path */
    constructor(path) {
        super(404, 'Not Found', `Bad URL: ${path}`);
    }
}

/**
 * HTTP 503 Service Unavailable Error Class
 */
class ServiceUnavailableError extends HttpError {
    /** @param {any} error - detailed error message */
    constructor(error) {
        super(503, 'Service Unavailable', error);
    }
}

class UnprocessableEntityError extends HttpError {
    /** @param {any} error - detailed error message */
    constructor(error) {
        super(422, 'Unprocessable entity', error);
    }
}

/**
 * HTTP 415 Unsupported Media Type Error Class
 */
class UnsupportedMediaTypeError extends HttpError {
    /** @param {string[]} contentTypes - accepted content types */
    constructor(contentTypes) {
        super(415, 'Unsupported Media Type', `Accepted Content-Type: ${contentTypes.join(', ')}`);
    }
}

module.exports = {
    HttpError,
    InternalServerError,
    MethodNotAllowedError,
    NotFoundError,
    ServiceUnavailableError,
    UnprocessableEntityError,
    UnsupportedMediaTypeError
};
