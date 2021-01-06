/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const nock = require('nock');
const request = require('request');
const sinon = require('sinon');

const constants = require('../../../src/lib/constants');
const httpUtil = require('../../../src/lib/consumers/shared/httpUtil');
const testUtil = require('../shared/util');
const util = require('../../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('HTTP Util Tests', () => {
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
                hosts: ['192.0.0.1'],
                port: '8080',
                uri: '/path/to/resource'
            });
            nock('http://192.0.0.1:8080')
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
                const config = buildDefaultConfig({
                    hosts: ['destServer'],
                    port: 443,
                    proxy: {
                        host: 'proxyServer',
                        port: 443,
                        protocol: 'https',
                        username: 'auser',
                        passphrase: 'asecret'
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
                            proxy: 'https://auser:asecret@proxyServer:443',
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
