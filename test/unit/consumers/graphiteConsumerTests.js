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

const request = require('request');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const graphiteIndex = sourceCode('src/lib/consumers/Graphite/index');

moduleCache.remember();

describe('Graphite', () => {
    const defaultConsumerConfig = {
        port: 80,
        host: 'localhost'
    };

    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        it('should POST using default request options', (done) => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.url, 'http://localhost:80/events/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });
            graphiteIndex(context);
        });

        it('should POST using provided request options', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    protocol: 'https',
                    port: '8080',
                    path: '/ingest/',
                    host: 'myMetricsSystem'
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.url, 'https://myMetricsSystem:8080/ingest/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });
            graphiteIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = JSON.stringify({
                what: 'f5telemetry',
                tags: ['systemInfo'],
                data: testUtil.deepCopy(context.event.data)
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.body, expectedData);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            graphiteIndex(context);
        });

        it('should process event data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            const expectedData = JSON.stringify({
                what: 'f5telemetry',
                tags: ['AVR'],
                data: testUtil.deepCopy(context.event.data)
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.body, expectedData);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            graphiteIndex(context);
        });
    });
});
