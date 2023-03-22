/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const nock = require('nock');
const sinon = require('sinon');
const zlib = require('zlib');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const genericHttpIndex = sourceCode('src/lib/consumers/Generic_HTTP/index');
const httpUtil = sourceCode('src/lib/consumers/shared/httpUtil');

moduleCache.remember();

describe('Generic_HTTP', () => {
    // Note: if a test has no explicit assertions then it relies on 'checkNockActiveMocks' in 'afterEach'
    const defaultConsumerConfig = {
        port: 80,
        host: 'localhost'
    };

    const redactString = '*****';

    before(() => {
        moduleCache.restore();
    });

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
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.deepStrictEqual(traceData.headers, { Authorization: redactString });
                });
        });

        it('should trace data with certificates redacted', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'POST',
                    protocol: 'http',
                    port: '8080',
                    path: '/',
                    host: 'myMetricsSystem',
                    privateKey: 'secretKey',
                    clientCertificate: 'myCert',
                    rootCertificate: 'CACert'
                }
            });

            nock('http://myMetricsSystem:8080')
                .post('/')
                .reply(200);

            return genericHttpIndex(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.deepStrictEqual(traceData.privateKey, redactString);
                    assert.deepStrictEqual(traceData.clientCertificate, redactString);
                    assert.deepStrictEqual(traceData.rootCertificate, redactString);
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

        it('should preserve input data with outputMode set to raw', () => {
            const originalRawData = 'arbitrary text';
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: {
                    port: 80,
                    outputMode: 'raw',
                    host: 'localhost'
                }
            });
            // buildConsumerContext does not support originalRawData, injecting it directly
            context.event.data.originalRawData = originalRawData;
            nock('https://localhost:80')
                .post('/')
                .reply(200, (_, requestBody) => {
                    assert.strictEqual(requestBody, originalRawData);
                });

            return genericHttpIndex(context);
        });

        it('should compress data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: {
                    port: 80,
                    host: 'localhost',
                    compressionType: 'gzip',
                    headers: [
                        { name: 'Content-Type', value: 'application/json' }
                    ]
                }
            });
            nock('https://localhost:80', {
                reqheaders: {
                    'Content-Encoding': 'gzip',
                    'Content-Type': 'application/json'
                }
            })
                .post('/')
                .reply(200, (_, requestBody) => {
                    assert.isObject(requestBody);
                    assert.deepStrictEqual(requestBody.Entity, 'SystemMonitor');
                });

            return genericHttpIndex(context);
        });

        it('should not fail when unable to compress data (gzip)', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: {
                    port: 80,
                    host: 'localhost',
                    compressionType: 'gzip'
                }
            });
            sinon.stub(zlib, 'gzip').onFirstCall().callsFake((data, cb) => {
                cb(new Error('zlib.gzip expected error'));
            });
            return genericHttpIndex(context)
                .then(() => {
                    assert.match(
                        context.logger.exception.firstCall.args[0],
                        /zlib.gzip expected error/,
                        'should log error message'
                    );
                });
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

    describe('tls options', () => {
        let requestUtilSpy;

        beforeEach(() => {
            requestUtilSpy = sinon.stub(httpUtil, 'sendToConsumer').resolves();
        });

        it('should pass tls options', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'POST',
                    protocol: 'https',
                    port: '80',
                    host: 'targetHost',
                    privateKey: 'secretKey',
                    clientCertificate: 'myCert',
                    rootCertificate: 'CACert'
                }
            });
            return genericHttpIndex(context)
                .then(() => {
                    const reqOpt = requestUtilSpy.firstCall.args[0];
                    assert.deepStrictEqual(reqOpt.ca, 'CACert');
                    assert.deepStrictEqual(reqOpt.cert, 'myCert');
                    assert.deepStrictEqual(reqOpt.key, 'secretKey');
                });
        });

        it('should not allow self signed certs when using tls options', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'POST',
                    protocol: 'https',
                    port: '80',
                    host: 'targetHost',
                    privateKey: 'secretKey',
                    clientCertificate: 'myCert',
                    rootCertificate: 'CACert',
                    allowSelfSignedCert: true
                }
            });
            return genericHttpIndex(context)
                .then(() => {
                    const reqOpt = requestUtilSpy.firstCall.args[0];
                    assert.deepStrictEqual(reqOpt.allowSelfSignedCert, false);
                });
        });
    });
});
