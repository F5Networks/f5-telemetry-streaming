/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const ErrorHandler = require('../../../src/lib/requestHandlers/errorHandler');
const errors = require('../../../src/lib/errors');
const httpErrors = require('../../../src/lib/requestHandlers/httpErrors');
const testUtil = require('./../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('ErrorHandler', () => {
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
