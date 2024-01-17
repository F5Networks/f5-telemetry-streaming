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
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const errors = sourceCode('src/lib/errors');
const pullConsumers = sourceCode('src/lib/pullConsumers');
const PullConsumerHandler = sourceCode('src/lib/requestHandlers/pullConsumerHandler');
const ErrorHandler = sourceCode('src/lib/requestHandlers/errorHandler');

moduleCache.remember();

describe('PullConsumerHandler', () => {
    let restOpMock;
    let requestHandler;

    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    const assertUnknownError = () => {
        sinon.stub(pullConsumers, 'getData').rejects(new Error('expectedError'));
        return assert.isRejected(requestHandler.process(), 'expectedError');
    };

    const assertConfigLookupError = () => {
        sinon.stub(pullConsumers, 'getData').rejects(new errors.ConfigLookupError('expectedError'));
        return requestHandler.process()
            .then((handler) => {
                assert.isTrue(handler instanceof ErrorHandler, 'should return a reference to error handler');
                assert.strictEqual(handler.getCode(), 404, 'should return expected code');
                assert.deepStrictEqual(handler.getBody(), {
                    code: 404,
                    message: 'expectedError'
                }, 'should return expected body');
            });
    };

    const shouldReportContentType = (expectedData) => {
        const expectedContentType = 'text/plain; version=0.0.4';
        sinon.stub(pullConsumers, 'getData').callsFake(
            () => Promise.resolve(testUtil.deepCopy({ data: expectedData, contentType: expectedContentType }))
        );
        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), expectedData, 'should return expected body');
                assert.strictEqual(requestHandler.getContentType(), expectedContentType, 'should return undefined by default');
            });
    };

    describe('/pullconsumer/:consumer', () => {
        beforeEach(() => {
            restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
            restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/pullconsumer/consumer');
            requestHandler = new PullConsumerHandler(restOpMock, { consumer: 'consumer' });
        });

        it('should return 200 on GET request', () => {
            let consumerNameFromRequest;
            const expectedData = { pullconsumer: 'pullconsumer' };
            sinon.stub(pullConsumers, 'getData').callsFake((consumerName) => {
                consumerNameFromRequest = consumerName;
                return Promise.resolve({ data: testUtil.deepCopy(expectedData) });
            });
            return requestHandler.process()
                .then((handler) => {
                    assert.ok(handler === requestHandler, 'should return a reference to original handler');
                    assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                    assert.deepStrictEqual(requestHandler.getBody(), expectedData, 'should return expected body');
                    assert.isUndefined(requestHandler.getContentType(), 'should return undefined by default');
                    assert.strictEqual(consumerNameFromRequest, 'consumer', 'should match name from request');
                });
        });

        it('should return contentType when specified', () => {
            const expectedData = { pullconsumer: 'pullconsumer' };
            return shouldReportContentType(expectedData);
        });

        it('should return 404 when unable to make config lookup', assertConfigLookupError);

        it('should reject when caught unknown error', assertUnknownError);
    });

    describe('/namespace/:namespace/pullconsumer/:consumer', () => {
        beforeEach(() => {
            restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
            restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/namespace/somenamespace/pullconsumer/consumer');
            requestHandler = new PullConsumerHandler(restOpMock, { consumer: 'consumer', namespace: 'somenamespace' });
        });

        it('should return 200 on GET request (with namespace in path)', () => {
            let consumerNameFromRequest;
            let namespaceFromRequest;
            const expectedData = { name: 'consumer', namespace: 'somenamespace' };
            sinon.stub(pullConsumers, 'getData').callsFake((consumerName, namespace) => {
                consumerNameFromRequest = consumerName;
                namespaceFromRequest = namespace;
                return Promise.resolve({ data: testUtil.deepCopy(expectedData) });
            });
            return requestHandler.process()
                .then((handler) => {
                    assert.ok(handler === requestHandler, 'should return a reference to original handler');
                    assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                    assert.deepStrictEqual(requestHandler.getBody(), expectedData, 'should return expected body');
                    assert.isUndefined(requestHandler.getContentType(), 'should return undefined by default');
                    assert.strictEqual(consumerNameFromRequest, 'consumer', 'should match consumer name from request');
                    assert.strictEqual(namespaceFromRequest, 'somenamespace', 'should match namespace from request');
                });
        });

        it('should return contentType when specified (with namespace in path)', () => {
            const expectedData = { name: 'consumer', namespace: 'somenamespace' };
            return shouldReportContentType(expectedData);
        });

        it('should return 404 when unable to make config lookup', assertConfigLookupError);

        it('should reject when caught unknown error', assertUnknownError);
    });
});
