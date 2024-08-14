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

const NOT_SET = Symbol('not set');

/**
 * Response Class
 */
class Response {
    constructor() {
        this.body = NOT_SET;
        this.code = NOT_SET;
        this.contentType = NOT_SET;
    }

    /** @returns {any} response body */
    getBody() {
        return this.body === NOT_SET ? undefined : this.body;
    }

    /** @returns {number} response code */
    getCode() {
        if (this.code === NOT_SET) {
            throw new Error('HTTP response code is not set!');
        }
        return this.code;
    }

    /** @returns {any} response content type */
    getContentType() {
        return this.contentType === NOT_SET ? undefined : this.contentType;
    }
}

module.exports = Response;
