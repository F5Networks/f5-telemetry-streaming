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

const errors = require('../../errors');
const httpErrors = require('../errors');

/**
 * @module restapi/handlers/error
 *
 * @typedef {import('../errors').HttpError} HttpError
 * @typedef {import('../request').Request} Request
 * @typedef {import('../index').RequestHandler} RequestHandler
 * @typedef {import('../response').Response} Response
 */

/**
 * @param {Request} req - request
 * @param {Error} error - error to process
 *
 * @returns {HttpError} processedj error
 */
function setHttpEquivalent(req, error) {
    if (error instanceof errors.ConfigLookupError) {
        error = new httpErrors.NotFoundError(req.getURI());
    } else if (error instanceof errors.ValidationError) {
        let msg = error.message;
        try {
            msg = JSON.parse(msg);
        } catch (_) {
            // do nothing
        }
        error = new httpErrors.UnprocessableEntityError(msg);
    } else if (!(error instanceof httpErrors.HttpError)) {
        error = new httpErrors.InternalServerError(error.message);
    }
    return error;
}

/**
 * @implements {RequestHandler}
 */
module.exports = Object.freeze({
    /**
     * @param {Request} req
     * @param {Response} res
     * @param {Error}
     *
     * @returns {Promise} resolved once request processed
     */
    handle(req, res, error) {
        return Promise.resolve()
            .then(() => {
                error = setHttpEquivalent(req, error);
                res.body = error.getBody();
                res.code = error.getCode();
                res.contentType = error.getContentType();
            });
    },
    name: 'Error'
});
