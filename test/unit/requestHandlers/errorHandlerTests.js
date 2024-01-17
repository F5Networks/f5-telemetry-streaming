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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const ErrorHandler = sourceCode('src/lib/requestHandlers/errorHandler');
const errors = sourceCode('src/lib/errors');
const httpErrors = sourceCode('src/lib/requestHandlers/httpErrors');

moduleCache.remember();

describe('ErrorHandler', () => {
    before(() => {
        moduleCache.restore();
    });

    let errorHandler;

    const testData = [
        {
            name: 'Bad URL',
            error: new httpErrors.BadURLError('/a/b/c/d'),
            expected: {
                code: 400,
                body: 'Bad URL: /a/b/c/d'
            }
        },
        {
            name: 'Internal Server Error',
            error: new httpErrors.InternalServerError('beep-badoo-bop'),
            expected: {
                code: 500,
                body: {
                    code: 500,
                    message: 'Internal Server Error'
                }
            }
        },
        {
            name: 'Method Not Allowed',
            error: new httpErrors.MethodNotAllowedError(['PATCH', 'HEAD']),
            expected: {
                code: 405,
                body: {
                    code: 405,
                    message: 'Method Not Allowed',
                    allow: ['PATCH', 'HEAD']
                }
            }
        },
        {
            name: 'Service Unavailable',
            error: new httpErrors.ServiceUnavailableError(),
            expected: {
                code: 503,
                body: {
                    code: 503,
                    message: 'Service Unavailable'
                }
            }
        },
        {
            name: 'Unsupported Media Type',
            error: new httpErrors.UnsupportedMediaTypeError(),
            expected: {
                code: 415,
                body: {
                    code: 415,
                    message: 'Unsupported Media Type',
                    accept: ['application/json']
                }
            }
        },
        {
            name: 'Config Lookup Error',
            error: new errors.ObjectNotFoundInConfigError('Unable to find object'),
            expected: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Unable to find object'
                }
            }
        },
        {
            name: 'Validation Error',
            error: new errors.ValidationError('Does not conform to schema'),
            expected: {
                code: 422,
                body: {
                    code: 422,
                    message: 'Unprocessable entity',
                    error: 'Does not conform to schema'
                }
            }
        }
    ];

    function assertProcessResult(expected) {
        assert.strictEqual(errorHandler.getCode(), expected.code, 'should return expected code');
        assert.deepStrictEqual(errorHandler.getBody(), expected.body, 'should match expected body');
        return errorHandler.process()
            .then((handler) => {
                assert.ok(handler === errorHandler, 'should return a reference to original handler');
            });
    }

    testData.forEach((testConf) => {
        testUtil.getCallableIt(testConf)(`should handle error - ${testConf.name}`, () => {
            errorHandler = new ErrorHandler(testConf.error);
            assertProcessResult(testConf.expected);
        });
    });

    it('should reject if error is of unknown type', () => {
        errorHandler = new ErrorHandler(new Error('i am a stealthy error'));
        return assert.isRejected(errorHandler.process())
            .then((result) => {
                assert.strictEqual(result.message, 'i am a stealthy error');
            });
    });
});
