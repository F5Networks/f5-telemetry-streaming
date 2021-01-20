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
const sinon = require('sinon');

const ErrorHandler = require('../../../src/lib/requestHandlers/errorHandler');
const configWorker = require('../../../src/lib/config');
const DeclareHandler = require('../../../src/lib/requestHandlers/declareHandler');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('DeclareHandler', () => {
    let requestHandler;
    let uri;

    afterEach(() => {
        requestHandler = null;
        uri = null;
        sinon.restore();
    });

    function assertProcessResult(expected) {
        return requestHandler.process()
            .then((actual) => {
                if (expected.code === 200) {
                    assert.ok(actual === requestHandler, 'should return a reference to original handler');
                } else {
                    assert.isTrue(actual instanceof ErrorHandler, 'should return a reference to error handler');
                }

                assert.strictEqual(actual.getCode(), expected.code, 'should return expected code');
                const actualBody = actual.getBody();
                if (expected.body.code) {
                    assert.strictEqual(actualBody.code, expected.body.code, 'should return expected body.code');
                    assert.strictEqual(actualBody.message, expected.body.message, 'should return expected body.message');
                    if (expected.body.error) {
                        assert.match(actualBody.error, new RegExp(expected.body.error), 'should return expected body.error');
                    }
                } else {
                    assert.deepStrictEqual(requestHandler.getBody(), expected.body, 'should return expected body');
                }
            });
    }

    function assertMultiRequestResults(mockConfig, expectedResponses, params) {
        const fetchResponseInfo = handler => ({
            code: handler.getCode(),
            body: handler.getBody()
        });

        return Promise.all([
            testUtil.sleep(10).then(() => new DeclareHandler(getRestOperation('POST', mockConfig), params).process()), // should return 200 or 503
            testUtil.sleep(10).then(() => new DeclareHandler(getRestOperation('POST', mockConfig), params).process()), // should return 503 or 200
            testUtil.sleep(20).then(() => new DeclareHandler(getRestOperation('GET'), params).process()) //   should return 200
        ])
            .then((handlers) => {
                assert.deepStrictEqual(fetchResponseInfo(handlers[2]), expectedResponses.GET, 'should match expected response for GET');
                assert.includeDeepMembers(handlers.slice(0, 2).map(fetchResponseInfo), expectedResponses.POST, 'should match expected responses for POST requests');
                // lock should be released already
                return new DeclareHandler(getRestOperation('POST', mockConfig), params).process();
            })
            .then((handler) => {
                assert.deepStrictEqual(fetchResponseInfo(handler), expectedResponses.POST[0], 'should succeed after lock released');
            });
    }

    function getRestOperation(method, body) {
        const restOpMock = new testUtil.MockRestOperation({ method: method.toUpperCase() });
        restOpMock.uri = testUtil.parseURL(uri);
        restOpMock.body = body;
        return restOpMock;
    }

    describe('/declare', () => {
        beforeEach(() => {
            uri = 'http://localhost:8100/mgmt/shared/telemetry/declare';
        });

        it('should get full raw config on GET request', () => {
            const mockConfig = { class: 'Telemetry' };
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: mockConfig
                }
            };
            sinon.stub(configWorker, 'getRawConfig').resolves(testUtil.deepCopy(mockConfig));
            requestHandler = new DeclareHandler(getRestOperation('GET'));
            return assertProcessResult(expected);
        });

        it('should return 200 on POST - valid declaration', () => {
            const mockConfig = { config: 'validated' };
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: mockConfig
                }
            };

            sinon.stub(configWorker, 'processDeclaration').resolves(testUtil.deepCopy(mockConfig));
            requestHandler = new DeclareHandler(getRestOperation('POST', { class: 'Telemetry' }));
            return assertProcessResult(expected);
        });

        it('should return 422 on POST - invalid declaration', () => {
            const expected = {
                code: 422,
                body: {
                    code: 422,
                    message: 'Unprocessable entity',
                    error: 'should be equal to one of the allowed values'
                }
            };
            requestHandler = new DeclareHandler(getRestOperation('POST', { class: 'Telemetry1' }));
            return assertProcessResult(expected);
        });

        it('should return 503 on attempt to POST declaration while previous one is still in process', () => {
            const mockConfig = { config: 'validated' };
            sinon.stub(configWorker, 'processDeclaration').callsFake(() => testUtil.sleep(50).then(() => testUtil.deepCopy(mockConfig)));
            sinon.stub(configWorker, 'getRawConfig').callsFake(() => testUtil.sleep(50).then(() => testUtil.deepCopy(mockConfig)));

            const expectedResponses = {
                GET: {
                    code: 200,
                    body: {
                        message: 'success',
                        declaration: mockConfig
                    }
                },
                POST: [
                    {
                        code: 200,
                        body: {
                            message: 'success',
                            declaration: mockConfig
                        }
                    },
                    {
                        code: 503,
                        body: {
                            code: 503,
                            message: 'Service Unavailable'
                        }
                    }
                ]
            };

            return assertMultiRequestResults(mockConfig, expectedResponses);
        });

        it('should reject whe unknown error is caught', () => {
            sinon.stub(configWorker, 'getRawConfig').rejects(new Error('expectedError'));
            requestHandler = new DeclareHandler(getRestOperation('GET'));
            return assert.isRejected(requestHandler.process(), 'expectedError');
        });
    });

    describe('/namespace/:namespace/declare', () => {
        beforeEach(() => {
            uri = 'http://localhost:8100/mgmt/shared/telemetry/namespace/testNamespace/declare';
        });

        it('should get namespace-only raw config on GET request', () => {
            const mockConfig = {
                raw: {
                    class: 'Telemetry',
                    testNamespace: { class: 'Telemetry_Namespace' },
                    otherNamespace: { class: 'Telemetry_Namespace', unwanted: true }
                }
            };
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: { class: 'Telemetry_Namespace' }
                }
            };
            sinon.stub(configWorker, 'getConfig').resolves(mockConfig);
            requestHandler = new DeclareHandler(getRestOperation('GET'), { namespace: 'testNamespace' });
            return assertProcessResult(expected);
        });

        it('should return 404 on GET - non-existent namespace', () => {
            const expected = {
                code: 404,
                body: {
                    code: 404,
                    message: 'Namespace with name \'testNamespace\' doesn\'t exist'
                }
            };
            sinon.stub(configWorker, 'getConfig').resolves({ raw: { class: 'Telemetry' } });

            requestHandler = new DeclareHandler(getRestOperation('GET'), { namespace: 'testNamespace' });
            return assertProcessResult(expected);
        });

        it('should return 200 on POST - valid declaration', () => {
            const mockConfig = { config: 'validated' };
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: mockConfig
                }
            };

            sinon.stub(configWorker, 'processDeclaration').resolves(testUtil.deepCopy(mockConfig));
            requestHandler = new DeclareHandler(getRestOperation('POST', { class: 'Telemetry_Namespace' }));
            return assertProcessResult(expected);
        });

        it('should return 422 on POST - invalid declaration', () => {
            const expected = {
                code: 422,
                body: {
                    code: 422,
                    message: 'Unprocessable entity',
                    error: 'declaration should be of class \'Telemetry Namespace\''
                }
            };
            sinon.stub(configWorker, 'getConfig').resolves({ raw: { class: 'Telemetry' } });

            requestHandler = new DeclareHandler(getRestOperation('POST', { class: 'Telemetry' }), { namespace: 'testNamespace' });
            return assertProcessResult(expected);
        });

        it('should return 503 on attempt to POST declaration while previous one is still in process', () => {
            const namespaceConfig = { class: 'Telemetry_Namespace' };
            const validatedConfig = { class: 'Telemetry', testNamespace: { class: 'Telemetry_Namespace' } };
            sinon.stub(configWorker, 'processDeclaration').callsFake(() => testUtil.sleep(50).then(() => validatedConfig));
            sinon.stub(configWorker, 'getConfig').callsFake(() => testUtil.sleep(50).then(() => ({ raw: validatedConfig })));

            const expectedResponses = {
                GET: {
                    code: 200,
                    body: {
                        message: 'success',
                        declaration: namespaceConfig
                    }
                },
                POST: [
                    {
                        code: 200,
                        body: {
                            message: 'success',
                            declaration: namespaceConfig
                        }
                    },
                    {
                        code: 503,
                        body: {
                            code: 503,
                            message: 'Service Unavailable'
                        }
                    }
                ]
            };

            return assertMultiRequestResults(namespaceConfig, expectedResponses, { namespace: 'testNamespace' });
        });

        it('should reject when unknown error is caught', () => {
            sinon.stub(configWorker, 'getConfig').rejects(new Error('expectedError'));
            requestHandler = new DeclareHandler(getRestOperation('POST', { class: 'Telemetry_Namespace' }), { namespace: 'testNamespace' });
            return assert.isRejected(requestHandler.process(), 'expectedError');
        });
    });
});
