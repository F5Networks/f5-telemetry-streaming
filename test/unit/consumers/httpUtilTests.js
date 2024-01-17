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

const nock = require('nock');
const request = require('request');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const constants = sourceCode('src/lib/constants');
const httpUtil = sourceCode('src/lib/consumers/shared/httpUtil');
const util = sourceCode('src/lib/utils/misc');

moduleCache.remember();

describe('HTTP Util Tests', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        nock.cleanAll();
        sinon.restore();
    });

    describe('.processHeaders', () => {
        it('should convert headers array to object', () => {
            const headers = [
                {
                    name: 'foo',
                    value: 'foo'
                },
                {
                    name: 'bar',
                    value: 'baz'
                }
            ];
            assert.deepStrictEqual(
                httpUtil.processHeaders(headers),
                {
                    foo: 'foo',
                    bar: 'baz'
                }
            );
        });

        it('should not fail on malformed input', () => {
            const input = 'name:foo,value:bar';
            assert.deepStrictEqual(httpUtil.processHeaders(input), {});
        });
    });

    describe('.sendToConsumer', () => {
        const buildDefaultConfig = (options) => {
            const opts = options || {};
            const defaultConfig = {
                body: '',
                hosts: ['localhost'],
                headers: {},
                json: false,
                logger: new testUtil.MockLogger(),
                method: 'POST',
                port: '80',
                protocol: 'https',
                allowSelfSignedCert: false,
                uri: '/'
            };
            return util.assignDefaults(opts, defaultConfig);
        };

        it('should be able to perform a basic POST', () => {
            nock('https://localhost:80').post('/').reply(200);
            return assert.isFulfilled(httpUtil.sendToConsumer(buildDefaultConfig()));
        });

        it('should be able to POST a JSON data', () => {
            const config = buildDefaultConfig({
                body: {
                    myKey: 'myValue',
                    key2: 'forFun'
                },
                json: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            nock('https://localhost:80')
                .post('/')
                .reply(200, (_, body) => {
                    assert.deepStrictEqual(body, {
                        key2: 'forFun',
                        myKey: 'myValue'
                    });
                });
            return assert.isFulfilled(httpUtil.sendToConsumer(config));
        });

        it('should be able to POST a JSON string', () => {
            const config = buildDefaultConfig({
                body: JSON.stringify({
                    myKey: 'myValue',
                    key2: 'forFun'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            nock('https://localhost:80')
                .post('/')
                .reply(200, (_, body) => {
                    assert.deepStrictEqual(body, {
                        key2: 'forFun',
                        myKey: 'myValue'
                    });
                });
            return assert.isFulfilled(httpUtil.sendToConsumer(config));
        });

        it('should properly format the URL', () => {
            const config = buildDefaultConfig({
                protocol: 'http',
                hosts: ['192.168.0.1'],
                port: '8080',
                uri: '/path/to/resource'
            });
            nock('http://192.168.0.1:8080')
                .post('/path/to/resource')
                .reply(200);
            return assert.isFulfilled(httpUtil.sendToConsumer(config));
        });

        describe('fallback', () => {
            it('should work with single host in fallback array (reachable)', () => {
                const config = buildDefaultConfig({
                    hosts: ['primaryHost']
                });
                nock('https://primaryHost:80').post('/').reply(200);
                return assert.isFulfilled(httpUtil.sendToConsumer(config));
            });

            it('should proceed to next host in fallback array when current one is not available', () => {
                const config = buildDefaultConfig({
                    hosts: [
                        'fallbackHost1',
                        'fallbackHost2',
                        'primaryHost'
                    ]
                });
                // all hosts will be unavailable
                nock('https://primaryHost:80').post('/').reply(500);
                nock('https://fallbackHost1:80').post('/').reply(500);
                nock('https://fallbackHost2:80').post('/').reply(500);
                return assert.isRejected(httpUtil.sendToConsumer(config), /Bad status code/);
            });

            it('should stop fallback once got reply (HTTP 200)', () => {
                const config = buildDefaultConfig({
                    hosts: [
                        'fallbackHost2',
                        'fallbackHost1',
                        'primaryHost'
                    ]
                });
                let called = 0;
                const replyHandler = () => { called += 1; };

                // all hosts will be unavailable
                nock('https://primaryHost:80').post('/').reply(500, replyHandler);
                nock('https://fallbackHost1:80').post('/').reply(200, replyHandler);
                nock('https://fallbackHost2:80').post('/').reply(500, replyHandler);

                return httpUtil.sendToConsumer(config)
                    .then(() => {
                        // force nock cleanup because not all mocks were used
                        nock.cleanAll();
                        assert.strictEqual(called, 2, 'should stop on fallbackHost1');
                    });
            });

            it('should stop fallback once got reply (HTTP 400)', () => {
                const config = buildDefaultConfig({
                    hosts: [
                        'fallbackHost2',
                        'fallbackHost1',
                        'primaryHost'
                    ]
                });
                let called = 0;
                const replyHandler = () => { called += 1; };

                // all hosts will be unavailable
                nock('https://primaryHost:80').post('/').reply(500, replyHandler);
                nock('https://fallbackHost1:80').post('/').reply(400, replyHandler);
                nock('https://fallbackHost2:80').post('/').reply(500, replyHandler);

                return httpUtil.sendToConsumer(config)
                    .then(() => {
                        // force nock cleanup because not all mocks were used
                        nock.cleanAll();
                        assert.strictEqual(called, 2, 'should stop on fallbackHost1');
                    });
            });

            it('should fallback to next host when got connection error', () => {
                const config = buildDefaultConfig({
                    hosts: [
                        'fallbackHost1',
                        'primaryHost',
                        'fallbackHost2'
                    ]
                });

                // all hosts will be unavailable
                nock('https://primaryHost:80').post('/').replyWithError({
                    message: 'expectedError'
                });
                nock('https://fallbackHost1:80').post('/').replyWithError({
                    message: 'expectedError'
                });
                nock('https://fallbackHost2:80').post('/').reply(400);

                return assert.isFulfilled(httpUtil.sendToConsumer(config));
            });
        });

        describe('Proxy options', () => {
            it('should support proxy options - no creds', (done) => {
                const config = buildDefaultConfig({
                    hosts: ['destServer'],
                    protocol: 'http',
                    proxy: {
                        host: 'proxyServer',
                        port: 8888,
                        protocol: 'http',
                        allowSelfSignedCert: false
                    }
                });
                sinon.stub(request, 'post').callsFake((reqOpts) => {
                    try {
                        assert.deepStrictEqual(reqOpts, {
                            body: '',
                            method: 'POST',
                            headers: {
                                'User-Agent': constants.USER_AGENT
                            },
                            proxy: 'http://proxyServer:8888',
                            strictSSL: true,
                            uri: 'http://destServer:80/'
                        });
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                assert.isFulfilled(httpUtil.sendToConsumer(config, true));
            });

            it('should support proxy options - with creds', (done) => {
                const proxyUser = 'auser';
                const proxyPass = 'asecret';
                const config = buildDefaultConfig({
                    hosts: ['destServer'],
                    port: 443,
                    proxy: {
                        host: 'proxyServer',
                        port: 443,
                        protocol: 'https',
                        username: proxyUser,
                        passphrase: proxyPass
                    }
                });
                sinon.stub(request, 'post').callsFake((reqOpts) => {
                    try {
                        assert.deepStrictEqual(reqOpts, {
                            body: '',
                            method: 'POST',
                            headers: {
                                'User-Agent': constants.USER_AGENT
                            },
                            proxy: `https://${proxyUser}:${proxyPass}@proxyServer:443`,
                            strictSSL: true,
                            uri: 'https://destServer:443/'
                        });
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                assert.isFulfilled(httpUtil.sendToConsumer(config, true));
            });
        });
    });
});
