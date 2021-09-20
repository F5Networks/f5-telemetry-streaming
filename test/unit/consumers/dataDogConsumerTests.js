/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const zlib = require('zlib');

const dataDogIndex = require('../../../src/lib/consumers/DataDog/index');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('DataDog', () => {
    const DATA_DOG_COMPRESSION_TYPES = ['none', 'gzip'];
    let DATA_DOG_API_KEY;
    let DATA_DOG_GATEWAYS;
    let dataDogRequestData;
    let defaultConsumerConfig;

    function addGzipReqHeadersIfNeed(reqConf, compressionConfig, compressionType) {
        if (compressionConfig !== 'none') {
            Object.assign(reqConf.requestHeaders, {
                'Accept-Encoding': compressionType,
                'Content-Encoding': compressionType
            });
        }
        return reqConf;
    }
    function addGzipConfigIfNeed(config, compressionType) {
        if (compressionType === 'gzip') {
            Object.assign(config, { compressionType: 'gzip' });
        }
        return config;
    }

    function checkGzipReqHeadersIfNeeded(request, compressionConfig, compressionType) {
        if (compressionConfig !== 'none') {
            assert.deepInclude(request.headers, { 'accept-encoding': compressionType }, 'should send request with Accept-Encoding: gzip header');
            assert.deepInclude(request.headers, { 'content-encoding': compressionType }, 'should send request with Content-Encoding: gzip header');
            // ideally Content-Length shouldn't match parsed data length, unlikely it will match in our tests
            assert.isAbove(request.headers['content-length'], 0, 'should have Content-Length header set to number');
            assert.notStrictEqual(
                request.headers['content-length'],
                JSON.stringify(request.request).length,
                'should compress data'
            );
        } else {
            assert.notDeepInclude(request.headers, { 'accept-encoding': 'gzip' }, 'should not send request with Accept-Encoding: gzip header when compression disabled');
            assert.notDeepInclude(request.headers, { 'content-encoding': 'gzip' }, 'should not send request with Content-Encoding: gzip header when compression disabled');
            assert.notDeepInclude(request.headers, { 'accept-encoding': 'deflate' }, 'should not send request with Accept-Encoding: deflate header when compression disabled');
            assert.notDeepInclude(request.headers, { 'content-encoding': 'deflate' }, 'should not send request with Content-Encoding: deflate header when compression disabled');
            assert.isAbove(request.headers['content-length'], 0, 'should have Content-Length header set to number');
            assert.strictEqual(
                request.headers['content-length'],
                JSON.stringify(request.request).length,
                'should match actual data length'
            );
        }
    }

    function setupDataDogMockEndpoint(config) {
        testUtil.mockEndpoints([{
            endpoint: config.path,
            method: 'post',
            code: config.responseCode,
            response: function response(uri, requestBody) {
                /**
                 * because Content-Type set to application/json
                 * nock will try to run zlib.gunzip on requestBody
                 * and as result requestBody here is parsed JSON
                 */
                dataDogRequestData.push({
                    basePath: this.basePath,
                    uri,
                    request: testUtil.deepCopy(requestBody),
                    headers: testUtil.deepCopy(this.req.headers)
                });
                return config.responseData;
            },
            responseHeaders: config.responseHeaders || {},
            requestHeaders: config.requestHeaders || {},
            options: {
                times: config.times || 100
            }
        }], {
            host: config.host,
            port: 443,
            proto: 'https'
        });
    }

    beforeEach(() => {
        DATA_DOG_API_KEY = 'test';
        DATA_DOG_GATEWAYS = {
            logs: {
                host: 'http-intake.logs.datadoghq.com',
                path: '/v1/input',
                requestHeaders: {
                    'Content-Type': 'application/json',
                    'DD-API-KEY': DATA_DOG_API_KEY
                },
                responseCode: 200,
                responseData: '{}'
            },
            metrics: {
                host: 'api.datadoghq.com',
                path: '/api/v1/series',
                requestHeaders: {
                    'Content-Type': 'application/json',
                    'DD-API-KEY': DATA_DOG_API_KEY
                },
                responseCode: 202,
                responseData: '{"status":"ok"}'
            }
        };
        dataDogRequestData = [];
        defaultConsumerConfig = {
            apiKey: DATA_DOG_API_KEY
        };
    });

    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    describe('process', () => {
        DATA_DOG_COMPRESSION_TYPES.forEach((compressionType) => {
            describe(`compressionType === "${compressionType}"`, () => {
                it('should process systemInfo data', () => {
                    const context = testUtil.buildConsumerContext({
                        eventType: 'systemInfo',
                        config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                    });
                    setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(DATA_DOG_GATEWAYS.metrics, compressionType, 'deflate'));
                    return dataDogIndex(context)
                        .then(() => {
                            assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                            assert.isNotEmpty(dataDogRequestData[0].request.series, 'should have some metric data');
                            checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'deflate');
                        });
                });

                it('should process event listener event with metrics (AVR)', () => {
                    const context = testUtil.buildConsumerContext({
                        eventType: 'AVR',
                        config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                    });
                    setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(DATA_DOG_GATEWAYS.metrics, compressionType, 'deflate'));
                    return dataDogIndex(context)
                        .then(() => {
                            assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                            assert.isNotEmpty(dataDogRequestData[0].request.series, 'should have some metric data');
                            checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'deflate');
                        });
                });

                it('should process event listener event without metrics (LTM)', () => {
                    const context = testUtil.buildConsumerContext({
                        config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                    });
                    context.event.type = 'LTM';
                    context.event.data = {
                        key: 'value',
                        telemetryEventCategory: 'LTM'
                    };
                    setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(DATA_DOG_GATEWAYS.logs, compressionType, 'gzip'));
                    return dataDogIndex(context)
                        .then(() => {
                            assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                            assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'LTM', 'should set source type to LTM');
                            checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                        });
                });

                it('should process event listener event without metrics (syslog)', () => {
                    const context = testUtil.buildConsumerContext({
                        config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                    });
                    context.event.type = 'syslog';
                    context.event.data = {
                        data: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                        hostname: 'bigip14.1.2.3.test',
                        telemetryEventCategory: 'syslog'
                    };
                    setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(DATA_DOG_GATEWAYS.logs, compressionType, 'gzip'));
                    return dataDogIndex(context)
                        .then(() => {
                            assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                            assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'syslog', 'should set source type to syslog');
                            checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                        });
                });

                it('should process event listener event without metrics (plain event)', () => {
                    const context = testUtil.buildConsumerContext({
                        config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                    });
                    context.event.type = 'syslog';
                    context.event.data = {
                        data: 'plain data',
                        telemetryEventCategory: 'event'
                    };
                    setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(DATA_DOG_GATEWAYS.logs, compressionType, 'gzip'));
                    return dataDogIndex(context)
                        .then(() => {
                            assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                            assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'syslog', 'should set source type to syslog');
                            checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                        });
                });
            });
        });

        it('should trace data', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            context.event.type = 'syslog';
            context.event.data = {
                data: 'plain data',
                telemetryEventCategory: 'event'
            };
            setupDataDogMockEndpoint(DATA_DOG_GATEWAYS.logs);
            return dataDogIndex(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.deepStrictEqual(traceData.data.ddsource, 'syslog');
                });
        });

        it('should not fail when unable to compress data (metrics, deflate)', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: addGzipConfigIfNeed(defaultConsumerConfig, 'gzip')
            });
            sinon.stub(zlib, 'deflate').onFirstCall().callsFake((data, cb) => {
                cb(new Error('zlib.deflate expected error'));
            });
            return dataDogIndex(context)
                .then(() => {
                    assert.match(
                        context.logger.error.firstCall.args[0],
                        /zlib.deflate expected error/,
                        'should log error message'
                    );
                });
        });

        it('should not fail when unable to compress data (logs, gzip)', () => {
            const context = testUtil.buildConsumerContext({
                config: addGzipConfigIfNeed(defaultConsumerConfig, 'gzip')
            });
            context.event.type = 'syslog';
            context.event.data = {
                data: 'plain data',
                telemetryEventCategory: 'event'
            };
            sinon.stub(zlib, 'gzip').onFirstCall().callsFake((data, cb) => {
                cb(new Error('zlib.gzip expected error'));
            });
            return dataDogIndex(context)
                .then(() => {
                    assert.match(
                        context.logger.error.firstCall.args[0],
                        /zlib.gzip expected error/,
                        'should log error message'
                    );
                });
        });
    });
});
