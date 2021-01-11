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
const httpUtil = require('../../../src/lib/consumers/shared/httpUtil');

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
        let sendToConsumerMock;

        beforeEach(() => {
            sendToConsumerMock = sinon.stub(httpUtil, 'sendToConsumer').resolves();
        });

        it('should be able to send data to primary host only', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'primaryHost'
                }
            });
            return genericHttpIndex(context)
                .then(() => {
                    assert.deepStrictEqual(sendToConsumerMock.firstCall.args[0].hosts, [
                        'primaryHost'
                    ]);
                });
        });

        it('should be able to send data to fallback hosts too', () => {
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
            return genericHttpIndex(context)
                .then(() => {
                    assert.deepStrictEqual(sendToConsumerMock.firstCall.args[0].hosts, [
                        'primaryHost',
                        'fallbackHost1',
                        'fallbackHost2'
                    ]);
                });
        });
    });

    describe('proxy options', () => {
        let requestUtilSpy;

        beforeEach(() => {
            requestUtilSpy = sinon.stub(httpUtil, 'sendToConsumer').resolves();
        });

        it('should pass basic proxy options', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'targetHost',
                    allowSelfSignedCert: true,
                    proxy: {
                        host: 'proxyServer',
                        port: 8080
                    }
                }
            });
            return genericHttpIndex(context)
                .then(() => {
                    const reqOpt = requestUtilSpy.firstCall.args[0];
                    assert.deepStrictEqual(reqOpt.proxy, { host: 'proxyServer', port: 8080 });
                    assert.deepStrictEqual(reqOpt.allowSelfSignedCert, true);
                });
        });

        it('should pass proxy options with allowSelfSignedCert', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '80',
                    host: 'targetHost',
                    allowSelfSignedCert: false,
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
                    const reqOpt = requestUtilSpy.firstCall.args[0];
                    assert.deepStrictEqual(reqOpt.proxy, {
                        host: 'proxyServer', port: 8080, username: 'test', passphrase: 'test', allowSelfSignedCert: true
                    });
                    assert.deepStrictEqual(reqOpt.allowSelfSignedCert, true);
                });
        });
    });
});
