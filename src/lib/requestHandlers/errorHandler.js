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
const errors = require('../errors');
const HttpError = require('./httpErrors').HttpError;

/**
 * Handler for errors encountered during requests
 */
class ErrorHandler extends BaseRequestHandler {
    /**
     * Constructor
     *
     * @param {Object} error - Error object
     */
    constructor(error) {
        super();
        this.error = error;
    }

    getCode() {
        if (this.error instanceof HttpError) {
            return this.error.getCode();
        }
        if (this.error instanceof errors.BaseError) {
            const httpError = this.getHttpEquivalent(this.error);
            return httpError.code;
        }
        return undefined;
    }

    getBody() {
        if (this.error instanceof HttpError) {
            return this.error.getBody();
        }
        if (this.error instanceof errors.BaseError) {
            const httpError = this.getHttpEquivalent(this.error);
            return httpError.body;
        }
        return undefined;
    }

    process() {
        if (this.error instanceof HttpError) {
            this.code = this.getCode();
            this.body = this.getBody();
            return Promise.resolve(this);
        }

        if (this.error instanceof errors.BaseError) {
            const httpError = this.getHttpEquivalent(this.error);
            this.code = httpError.code;
            this.body = httpError.body;
            return Promise.resolve(this);
        }

        return Promise.reject(this.error);
    }

    getHttpEquivalent(error) {
        const httpError = {};
        if (error instanceof errors.ConfigLookupError) {
            httpError.code = 404;
            httpError.body = {
                code: 404,
                message: error.message
            };
        } else if (error instanceof errors.ValidationError) {
            httpError.code = 422;
            httpError.body = {
                code: 422,
                message: 'Unprocessable entity',
                error: error.message
            };
        }
        return httpError;
    }
}

module.exports = ErrorHandler;
