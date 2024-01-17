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

const sumoLogicIndex = sourceCode('src/lib/consumers/Sumo_Logic/index');

moduleCache.remember();

describe('Sumo_Logic', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        const defaultConsumerConfig = {
            host: 'localhost',
            path: '/receiver/v1/http/'
        };

        it('should configure default request options', (done) => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.headers, { 'content-type': 'application/json' });
                    assert.strictEqual(opts.strictSSL, true);
                    assert.strictEqual(opts.url, 'https://localhost:443/receiver/v1/http/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should configure request options with provided values', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'localhost',
                    path: '/receiver/v1/http/',
                    passphrase: 'mySecret',
                    protocol: 'http',
                    port: 80,
                    allowSelfSignedCert: true
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.headers, { 'content-type': 'application/json' });
                    assert.strictEqual(opts.strictSSL, false);
                    assert.strictEqual(opts.url, 'http://localhost:80/receiver/v1/http/mySecret');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should trace data with secrets redacted', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'localhost',
                    path: '/receiver/v1/http/',
                    passphrase: 'mySecret',
                    protocol: 'http',
                    port: 80,
                    allowSelfSignedCert: true
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.notStrictEqual(traceData.url.indexOf('*****'), -1);
                    assert.strictEqual(opts.url, 'http://localhost:80/receiver/v1/http/mySecret');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.body, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should process event data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.body, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });
    });
});
