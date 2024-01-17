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

const BaseRequestHandler = sourceCode('src/lib/requestHandlers/baseHandler');

moduleCache.remember();

describe('BaseRequestHandler', () => {
    let restOpMock;
    let requestHandler;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'get' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/info');
        requestHandler = new BaseRequestHandler(restOpMock);
    });

    describe('.getBody()', () => {
        it('should throw error', () => {
            assert.throws(
                () => requestHandler.getBody(),
                'Method "getBody" not implemented',
                'should throw error for method that not implemented'
            );
        });
    });

    describe('.getCode()', () => {
        it('should throw error', () => {
            assert.throws(
                () => requestHandler.getCode(),
                'Method "getCode" not implemented',
                'should throw error for method that not implemented'
            );
        });
    });

    describe('.getHeaders()', () => {
        it('should return empty HTTP headers', () => {
            assert.deepStrictEqual(requestHandler.getHeaders(), {}, 'should return empty headers object by default');
        });

        it('should return HTTP headers', () => {
            restOpMock.setHeaders({ header: 'value' });
            assert.deepStrictEqual(
                requestHandler.getHeaders(),
                { header: 'value' },
                'should return expected headers'
            );
        });
    });

    describe('.getMethod()', () => {
        it('should return HTTP method', () => {
            assert.deepStrictEqual(requestHandler.getMethod(), 'GET', 'should return method in upper case');
        });
    });

    describe('.process()', () => {
        it('should return self', () => requestHandler.process()
            .then((inst) => {
                assert.deepStrictEqual(inst, requestHandler, 'should return same instance');
            }));
    });

    describe('.getContentType()', () => {
        it('should return undefined', () => {
            assert.isUndefined(requestHandler.getContentType(), 'should return undefined by default');
        });
    });
});
