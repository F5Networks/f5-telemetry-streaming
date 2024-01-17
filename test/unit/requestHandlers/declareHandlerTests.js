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

const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const appInfo = sourceCode('src/lib/appInfo');
const configWorker = sourceCode('src/lib/config');
const DeclareHandler = sourceCode('src/lib/requestHandlers/declareHandler');
const ErrorHandler = sourceCode('src/lib/requestHandlers/errorHandler');
const persistentStorage = sourceCode('src/lib/persistentStorage');

moduleCache.remember();

describe('DeclareHandler', () => {
    let coreStub;
    let requestHandler;
    let uri;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub();
        return persistentStorage.persistentStorage.load()
            .then(() => configWorker.load());
    });

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
        const fetchResponseInfo = (handler) => ({
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
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: dummies.declaration.base.decrypted({
                        schemaVersion: appInfo.version
                    })
                }
            };
            requestHandler = new DeclareHandler(getRestOperation('GET'));
            return assertProcessResult(expected);
        });

        it('should return 200 on POST - valid declaration', () => {
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: dummies.declaration.base.decrypted({
                        schemaVersion: appInfo.version
                    })
                }
            };
            requestHandler = new DeclareHandler(getRestOperation(
                'POST', dummies.declaration.base.decrypted()
            ));
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
            requestHandler = new DeclareHandler(getRestOperation(
                'POST', dummies.declaration.base.decrypted({ class: 'Telemetry_Test' })
            ));
            return assertProcessResult(expected);
        });

        it('should return 503 on attempt to POST declaration while previous one is still in process', () => {
            const mockConfig = { config: 'validated' };
            sinon.stub(configWorker, 'processDeclaration').callsFake(() => testUtil.sleep(50).then(() => testUtil.deepCopy(mockConfig)));
            sinon.stub(configWorker, 'getDeclaration').callsFake(() => testUtil.sleep(50).then(() => testUtil.deepCopy(mockConfig)));

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
            sinon.stub(configWorker, 'getDeclaration').rejects(new Error('expectedError'));
            requestHandler = new DeclareHandler(getRestOperation('GET'));
            return assert.isRejected(requestHandler.process(), 'expectedError');
        });

        it('should compute request metadata', () => {
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: dummies.declaration.base.decrypted({
                        schemaVersion: appInfo.version,
                        consumer: dummies.declaration.consumer.splunk.full.encrypted()
                    })
                }
            };
            const restOp = getRestOperation(
                'POST', dummies.declaration.base.decrypted({
                    consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
                })
            );
            restOp.setHeaders({ 'X-Forwarded-For': '192.168.0.1' });
            requestHandler = new DeclareHandler(restOp);

            return assertProcessResult(expected)
                .then(() => {
                    const records = coreStub.configWorker.receivedSpy.args.map((args) => args[0]);
                    const recent = records[records.length - 1];
                    assert.deepStrictEqual(
                        recent,
                        {
                            declaration: dummies.declaration.base.decrypted({
                                consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
                            }),
                            metadata: {
                                message: 'Incoming declaration via REST API',
                                originDeclaration: dummies.declaration.base.decrypted({
                                    consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
                                }),
                                sourceIP: '192.168.0.1'
                            },
                            transactionID: 'uuid2'
                        }
                    );
                });
        });
    });

    describe('/namespace/:namespace/declare', () => {
        beforeEach(() => {
            uri = 'http://localhost:8100/mgmt/shared/telemetry/namespace/testNamespace/declare';
            return configWorker.processDeclaration(dummies.declaration.base.decrypted({
                testNamespace: dummies.declaration.namespace.base.decrypted(),
                otherNamespace: dummies.declaration.namespace.base.decrypted()
            }));
        });

        it('should get namespace-only raw config on GET request', () => {
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: dummies.declaration.namespace.base.decrypted()
                }
            };
            requestHandler = new DeclareHandler(getRestOperation('GET'), { namespace: 'testNamespace' });
            return assertProcessResult(expected);
        });

        it('should return 404 on GET - non-existent namespace', () => {
            const expected = {
                code: 404,
                body: {
                    code: 404,
                    message: 'Namespace with name \'nonExistingNamespace\' doesn\'t exist'
                }
            };
            requestHandler = new DeclareHandler(getRestOperation('GET'), { namespace: 'nonExistingNamespace' });
            return assertProcessResult(expected);
        });

        it('should return 200 on POST - valid declaration', () => {
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: dummies.declaration.namespace.base.decrypted()
                }
            };
            requestHandler = new DeclareHandler(
                getRestOperation(
                    'POST',
                    dummies.declaration.namespace.base.decrypted()
                ),
                { namespace: 'testNamespace' }
            );
            return assertProcessResult(expected);
        });

        it('should return 422 on POST - invalid declaration', () => {
            const expected = {
                code: 422,
                body: {
                    code: 422,
                    message: 'Unprocessable entity',
                    error: /"schemaPath":"#\/properties\/class\/enum","params":{"allowedValues":\["Telemetry_Namespace"\]/
                }
            };
            requestHandler = new DeclareHandler(
                getRestOperation(
                    'POST',
                    dummies.declaration.namespace.base.decrypted({ class: 'Telemetry' })
                ),
                { namespace: 'testNamespace' }
            );
            return assertProcessResult(expected);
        });

        it('should return 503 on attempt to POST declaration while previous one is still in process', () => {
            const namespaceConfig = dummies.declaration.namespace.base.decrypted();
            sinon.stub(configWorker, 'processDeclaration').callsFake(function () {
                return testUtil.sleep(50)
                    .then(() => {
                        configWorker.processDeclaration.restore();
                        return configWorker.processDeclaration.apply(configWorker, arguments);
                    });
            });

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
            sinon.stub(configWorker, 'getDeclaration').rejects(new Error('expectedError'));
            requestHandler = new DeclareHandler(
                getRestOperation(
                    'POST',
                    dummies.declaration.namespace.base.decrypted()
                ),
                { namespace: 'testNamespace' }
            );
            return assert.isRejected(requestHandler.process(), 'expectedError');
        });

        it('should compute request metadata', () => {
            const expected = {
                code: 200,
                body: {
                    message: 'success',
                    declaration: dummies.declaration.namespace.base.decrypted({
                        consumer: dummies.declaration.consumer.splunk.full.encrypted()
                    })
                }
            };
            requestHandler = new DeclareHandler(
                getRestOperation(
                    'POST',
                    dummies.declaration.namespace.base.decrypted({
                        consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
                    })
                ),
                { namespace: 'testNamespace' }
            );
            return assertProcessResult(expected)
                .then(() => {
                    const records = coreStub.configWorker.receivedSpy.args.map((args) => args[0]);
                    const recent = records[records.length - 1];
                    assert.deepStrictEqual(
                        recent,
                        {
                            declaration: dummies.declaration.base.decrypted({
                                schemaVersion: appInfo.version,
                                otherNamespace: dummies.declaration.namespace.base.decrypted({}),
                                testNamespace: dummies.declaration.namespace.base.decrypted({
                                    consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
                                })
                            }),
                            metadata: {
                                message: 'Incoming declaration via REST API',
                                originDeclaration: dummies.declaration.namespace.base.decrypted({
                                    consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
                                }),
                                namespace: 'testNamespace',
                                sourceIP: undefined // not specified in headers
                            },
                            transactionID: 'uuid5'
                        }
                    );
                });
        });
    });
});
