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
const systemPoller = sourceCode('src/lib/systemPoller');
const SystemPollerHandler = sourceCode('src/lib/requestHandlers/systemPollerHandler');
const ErrorHandler = sourceCode('src/lib/requestHandlers/errorHandler');

moduleCache.remember();

describe('SystemPollerHandler', () => {
    let restOpMock;
    let requestHandler;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/systempoller/system/poller');
        requestHandler = new SystemPollerHandler(restOpMock, { system: 'system', poller: 'poller' });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return 200 on GET request', () => {
        let systemNameFromRequest;
        let pollerNameFromRequest;
        let includeDisabledVal;

        sinon.stub(systemPoller, 'getPollersConfig').callsFake((systemName, options) => {
            systemNameFromRequest = systemName;
            pollerNameFromRequest = options.pollerName;
            includeDisabledVal = options.includeDisabled;
            return Promise.resolve({});
        });
        sinon.stub(systemPoller, 'fetchPollersData').resolves([{ data: 'expectedData' }]);

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), ['expectedData'], 'should return expected body');
                assert.strictEqual(systemNameFromRequest, 'system', 'should match system name from request');
                assert.strictEqual(pollerNameFromRequest, 'poller', 'should match poller name from request');
                assert.strictEqual(includeDisabledVal, true, 'should include disabled configs too');
            });
    });

    it('should return 404 when unable to make config lookup', () => {
        sinon.stub(systemPoller, 'getPollersConfig').rejects(new errors.ConfigLookupError('expectedError'));
        return requestHandler.process()
            .then((handler) => {
                assert.isTrue(handler instanceof ErrorHandler, 'should return a reference to error handler');
                assert.strictEqual(handler.getCode(), 404, 'should return expected code');
                assert.deepStrictEqual(handler.getBody(), {
                    code: 404,
                    message: 'expectedError'
                }, 'should return expected body');
            });
    });

    it('should reject when caught unknown error', () => {
        sinon.stub(systemPoller, 'getPollersConfig').rejects(new Error('expectedError'));
        return assert.isRejected(requestHandler.process(), 'expectedError');
    });
});
