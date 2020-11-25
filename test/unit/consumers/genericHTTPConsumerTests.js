/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const sinon = require('sinon');

const genericHttpIndex = require('../../../src/lib/consumers/Generic_HTTP/index');
const testUtil = require('../shared/util');
const requestUtil = require('../../../src/lib/consumers/shared/requestUtil');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Generic_HTTP', () => {
    // Note: if a test has no explicit assertions then it relies on 'checkNockActiveMocks' in 'afterEach'
    const defaultConsumerConfig = {
        port: 80,
        host: 'localhost'
    };

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        sinon.restore();
        nock.cleanAll();
    });

    describe('process', () => {
        it('should POST using default request options', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            nock('https://localhost:80').post('/').reply(200);
            return genericHttpIndex(context);
        });

        it('should GET using provided request options', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '8080',
                    path: '/ingest',
                    host: 'myMetricsSystem',
                    headers: [
                        {
                            name: 'x-api-key',
                            value: 'superSecret'
                        }
                    ]
                }
            });

            nock('http://myMetricsSystem:8080', {
                reqheaders: {
                    'x-api-key': 'superSecret'
                }
            })
                .get('/ingest')
                .reply(200);

            return genericHttpIndex(context);
        });

        it('should trace data with secrets redacted', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'POST',
                    protocol: 'http',
                    port: '8080',
                    path: '/ingest',
                    host: 'myMetricsSystem',
                    headers: [
                        {
                            name: 'Authorization',
                            value: 'Basic ABC123'
                        }
                    ]
                }
            });

            nock('http://myMetricsSystem:8080', {
                reqheaders: {
                    Authorization: 'Basic ABC123'
                }
            })
                .post('/ingest')
                .reply(200);

            return genericHttpIndex(context)
                .then(() => {
                    const traceData = JSON.parse(context.tracer.write.firstCall.args[0]);
                    assert.deepStrictEqual(traceData.headers, { Authorization: '*****' });
                });
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(context.event.data);
            nock('https://localhost:80')
                .post('/')
                .reply(200, (_, requestBody) => {
                    assert.deepStrictEqual(requestBody, JSON.stringify(expectedData));
                });
            return genericHttpIndex(context);
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(context.event.data);
            nock('https://localhost:80')
                .post('/')
                .reply(200, (_, requestBody) => {
                    assert.deepStrictEqual(requestBody, JSON.stringify(expectedData));
                });

            return genericHttpIndex(context);
        });
    });

    describe('fallback', () => {
        it('should work with single host in fallback array (reachable)', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'primaryHost'
                }
            });

            nock('http://primaryHost').get('/').reply(200);
            return genericHttpIndex(context);
        });

        it('should proceed to next host in fallback array when current one is not available', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'primaryHost',
                    fallbackHosts: [
                        'fallbackHost1',
                        'fallbackHost2'
                    ]
                }
            });

            // all hosts will be unavailable
            nock('http://primaryHost').get('/').reply(500);
            nock('http://fallbackHost1').get('/').reply(500);
            nock('http://fallbackHost2').get('/').reply(500);

            return genericHttpIndex(context);
        });

        it('should stop fallback once got reply (HTTP 200)', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'primaryHost',
                    fallbackHosts: [
                        'fallbackHost1',
                        'fallbackHost2'
                    ]
                }
            });
            let called = 0;
            const replyHandler = () => { called += 1; };

            // all hosts will be unavailable
            nock('http://primaryHost').get('/').reply(500, replyHandler);
            nock('http://fallbackHost1').get('/').reply(200, replyHandler);
            nock('http://fallbackHost2').get('/').reply(500, replyHandler);

            return genericHttpIndex(context)
                .then(() => {
                    // force nock cleanup because not all mocks were used
                    nock.cleanAll();
                    assert.strictEqual(called, 2, 'should stop on fallbackHost1');
                });
        });

        it('should stop fallback once got reply (HTTP 400)', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'primaryHost',
                    fallbackHosts: [
                        'fallbackHost1',
                        'fallbackHost2'
                    ]
                }
            });
            let called = 0;
            const replyHandler = () => { called += 1; };

            // all hosts will be unavailable
            nock('http://primaryHost').get('/').reply(500, replyHandler);
            nock('http://fallbackHost1').get('/').reply(400, replyHandler);
            nock('http://fallbackHost2').get('/').reply(500, replyHandler);

            return genericHttpIndex(context)
                .then(() => {
                    // force nock cleanup because not all mocks were used
                    nock.cleanAll();
                    assert.strictEqual(called, 2, 'should stop on fallbackHost1');
                });
        });

        it('should fallback to next host when got connection error', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'primaryHost',
                    fallbackHosts: [
                        'fallbackHost1',
                        'fallbackHost2'
                    ]
                }
            });

            // all hosts will be unavailable
            nock('http://primaryHost').get('/').replyWithError({
                message: 'expectedError'
            });
            nock('http://fallbackHost1').get('/').replyWithError({
                message: 'expectedError'
            });
            nock('http://fallbackHost2').get('/').reply(400);

            return genericHttpIndex(context);
        });
    });

    describe('proxy options', () => {
        let requestUtilSpy;

        beforeEach(() => {
            requestUtilSpy = sinon.spy(requestUtil, 'sendToConsumer');
        });

        it('should pass basic proxy options', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'targetHost',
                    proxy: {
                        host: 'proxyServer',
                        port: 8080
                    }
                }
            });
            return genericHttpIndex(context)
                .then(() => {
                    const reqOpt = requestUtilSpy.getCalls()[0].args[0];
                    assert.deepStrictEqual(reqOpt.proxy, { host: 'proxyServer', port: 8080 });
                    assert.deepStrictEqual(reqOpt.strictSSL, true);
                });
        });

        it('should pass proxy options with strictSSL', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'targetHost',
                    proxy: {
                        host: 'proxyServer',
                        port: 8080,
                        username: 'test',
                        passphrase: 'test',
                        allowSelfSignedCert: true
                    }
                }
            });
            return genericHttpIndex(context)
                .then(() => {
                    const reqOpt = requestUtilSpy.getCalls()[0].args[0];
                    assert.deepStrictEqual(reqOpt.proxy, {
                        host: 'proxyServer', port: 8080, username: 'test', passphrase: 'test', allowSelfSignedCert: true
                    });
                    assert.deepStrictEqual(reqOpt.strictSSL, false);
                });
        });
    });
});
