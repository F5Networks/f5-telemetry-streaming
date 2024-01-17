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

class HttpError extends Error {
    getCode() {
        throw new Error('Method "getCode" not implemented');
    }

    getBody() {
        throw new Error('Method "getBody" not implemented');
    }
}

class BadURLError extends HttpError {
    constructor(pathName) {
        super();
        this.pathName = pathName;
    }

    getCode() {
        return 400;
    }

    getBody() {
        return `Bad URL: ${this.pathName}`;
    }
}

class InternalServerError extends HttpError {
    getCode() {
        return 500;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Internal Server Error'
        };
    }
}

class MethodNotAllowedError extends HttpError {
    constructor(allowedMethods) {
        super();
        this.allowedMethods = allowedMethods;
    }

    getCode() {
        return 405;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Method Not Allowed',
            allow: this.allowedMethods
        };
    }
}

class ServiceUnavailableError extends HttpError {
    getCode() {
        return 503;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Service Unavailable'
        };
    }
}

class UnsupportedMediaTypeError extends HttpError {
    getCode() {
        return 415;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Unsupported Media Type',
            accept: ['application/json']
        };
    }
}

module.exports = {
    HttpError,
    BadURLError,
    InternalServerError,
    MethodNotAllowedError,
    ServiceUnavailableError,
    UnsupportedMediaTypeError
};
