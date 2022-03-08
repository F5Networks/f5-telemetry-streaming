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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');
const zlib = require('zlib');

const dataDogIndex = require('../../../src/lib/consumers/DataDog/index');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('DataDog', () => {
    const DATA_DOG_COMPRESSION_TYPES = ['none', 'gzip'];
    const DATA_DOG_API_KEY = 'test';
    const DATA_DOG_GATEWAYS = {
        US1: {
            logs: {
                host: 'http-intake.logs.datadoghq.com'
            },
            metrics: {
                host: 'api.datadoghq.com'
            }
        },
        US3: {
            logs: {
                host: 'http-intake.logs.us3.datadoghq.com'
            },
            metrics: {
                host: 'api.us3.datadoghq.com'
            }
        },
        EU1: {
            logs: {
                host: 'http-intake.logs.datadoghq.eu'
            },
            metrics: {
                host: 'api.datadoghq.eu'
            }
        },
        'US1-FED': {
            logs: {
                host: 'http-intake.logs.ddog-gov.com'
            },
            metrics: {
                host: 'api.ddog-gov.com'
            }
        }

    };
    const DATA_DOG_MOCK_ENDPOINTS = {
        logs: {
            path: '/api/v2/logs',
            requestHeaders: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATA_DOG_API_KEY
            },
            responseCode: 200,
            responseData: '{}'
        },
        metrics: {
            path: '/api/v1/series',
            requestHeaders: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATA_DOG_API_KEY
            },
            responseCode: 202,
            responseData: '{"status":"ok"}'
        }
    };
    const DATA_DOG_TYPES = {
        LOGS: 'logs',
        METRICS: 'metrics'
    };
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

    const getRequestConfig = (type, region) => Object.assign(
        testUtil.deepCopy(DATA_DOG_MOCK_ENDPOINTS[type]),
        { host: DATA_DOG_GATEWAYS[region || 'US1'][type].host }
    );
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        dataDogRequestData = [];
        defaultConsumerConfig = testUtil.deepCopy({
            apiKey: DATA_DOG_API_KEY,
            region: 'US1',
            service: 'f5-telemetry'
        });
    });

    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    describe('process', () => {
        Object.keys(DATA_DOG_GATEWAYS).forEach((region) => {
            describe(`region === "${region}"`, () => {
                DATA_DOG_COMPRESSION_TYPES.forEach((compressionType) => {
                    describe(`compressionType === "${compressionType}"`, () => {
                        const metricPrefixTests = [
                            {
                                testName: 'no metricPrefix',
                                isDefined: 'system.cpu',
                                isUndefined: 'f5.bigip.system.cpu'
                            },
                            {
                                testName: 'custom metricPrefix, length = 1',
                                metricPrefix: ['f5'],
                                isDefined: 'f5.system.cpu',
                                isUndefined: 'system.cpu'
                            },
                            {
                                testName: 'custom metricPrefix, length = 3',
                                metricPrefix: ['f5', 'bigip', 'device'],
                                isDefined: 'f5.bigip.device.system.cpu',
                                isUndefined: 'system.cpu'
                            }
                        ];

                        metricPrefixTests.forEach((metricPrefixTest) => {
                            it(`should process systemInfo data (${metricPrefixTest.testName})`, () => {
                                const context = testUtil.buildConsumerContext({
                                    eventType: 'systemInfo',
                                    config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                                });
                                context.config.metricPrefix = metricPrefixTest.metricPrefix;
                                context.config.region = region;
                                const reqConfig = getRequestConfig(DATA_DOG_TYPES.METRICS, region);

                                setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'deflate'));
                                return dataDogIndex(context)
                                    .then(() => {
                                        const timeSeries = dataDogRequestData[0].request.series;
                                        const systemCpu = timeSeries.find(
                                            (series) => series.metric === metricPrefixTest.isDefined
                                        );

                                        assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                        assert.isNotEmpty(timeSeries, 'should have some metric data');
                                        assert.isDefined(
                                            timeSeries.find((series) => series.metric === metricPrefixTest.isDefined),
                                            `should have found '${metricPrefixTest.isDefined}' metric name`
                                        );
                                        assert.isUndefined(
                                            timeSeries.find((series) => series.metric === metricPrefixTest.isUndefined),
                                            `should have found '${metricPrefixTest.isDefined}' metric name`
                                        );
                                        assert.includeMembers(
                                            systemCpu.tags,
                                            ['configSyncSucceeded:true'],
                                            'should have configSyncSucceeded boolean tag on \'system.cpu\' metric'
                                        );
                                        checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'deflate');
                                    });
                            });
                        });

                        it('should process systemInfo data, and append custom tags', () => {
                            const context = testUtil.buildConsumerContext({
                                eventType: 'systemInfo',
                                config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                            });
                            context.config.region = region;
                            context.config.customTags = [
                                { name: 'deploymentName', value: 'best version' },
                                { name: 'instanceId', value: 'instance1' }
                            ];
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.METRICS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'deflate'));
                            return dataDogIndex(context)
                                .then(() => {
                                    const timeSeriesTagsSample = dataDogRequestData[0].request.series
                                        .filter((_, index) => index % 10 === 0); // Sample 10%

                                    assert.isAbove(timeSeriesTagsSample.length, 1, 'should have multiple time series');
                                    timeSeriesTagsSample.forEach((tagSet) => {
                                        assert.includeMembers(tagSet.tags, ['deploymentName:best version', 'instanceId:instance1']);
                                    });
                                    checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'deflate');
                                });
                        });

                        it('should process systemInfo data, and convert booleans to metrics', () => {
                            const context = testUtil.buildConsumerContext({
                                eventType: 'systemInfo',
                                config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                            });
                            context.config.region = region;
                            context.config.convertBooleansToMetrics = true;
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.METRICS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'deflate'));
                            return dataDogIndex(context)
                                .then(() => {
                                    const timeSeries = dataDogRequestData[0].request.series;
                                    const configSyncSucceeded = timeSeries.find(
                                        (series) => series.metric === 'system.configSyncSucceeded'
                                    );
                                    const systemCpu = timeSeries.find(
                                        (series) => series.metric === 'system.cpu'
                                    );

                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.isNotEmpty(timeSeries, 'should have some metric data');
                                    assert.isDefined(configSyncSucceeded, 'should include \'system.configSyncSucceeded\' as a metric');
                                    assert.notIncludeMembers(
                                        systemCpu.tags,
                                        ['configSyncSucceeded:true'],
                                        'should not have configSyncSucceeded tag on \'system.cpu\' metric'
                                    );
                                    checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'deflate');
                                });
                        });

                        it('should process event listener event with metrics (AVR)', () => {
                            const context = testUtil.buildConsumerContext({
                                eventType: 'AVR',
                                config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                            });
                            context.config.region = region;
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.METRICS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'deflate'));
                            return dataDogIndex(context)
                                .then(() => {
                                    const timeSeries = dataDogRequestData[0].request.series;

                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.isNotEmpty(timeSeries, 'should have some metric data');
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
                            context.config.region = region;
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.LOGS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'gzip'));
                            return dataDogIndex(context)
                                .then(() => {
                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'LTM', 'should set source type to LTM');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.service, 'f5-telemetry', 'should set service to default');
                                    assert.strictEqual(dataDogRequestData[0].request.ddtags, 'telemetryEventCategory:LTM,key:value', 'should set tags from event data');
                                    checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                                });
                        });

                        it('should process event listener event log without metrics (LTM), and append custom tags', () => {
                            const context = testUtil.buildConsumerContext({
                                config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                            });
                            context.event.type = 'LTM';
                            context.event.data = {
                                key: 'value',
                                telemetryEventCategory: 'LTM'
                            };
                            context.config.region = region;
                            context.config.customTags = [
                                { name: 'deploymentName', value: 'best version' },
                                { name: 'instanceId', value: 'instance1' }
                            ];
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.LOGS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'gzip'));
                            return dataDogIndex(context)
                                .then(() => {
                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'LTM', 'should set source type to LTM');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.service, 'f5-telemetry', 'should set service to default');
                                    assert.include(dataDogRequestData[0].request.ddtags, 'telemetryEventCategory:LTM,key:value', 'should not overwrite dynamic tags');
                                    assert.include(dataDogRequestData[0].request.ddtags, 'deploymentName:best version,instanceId:instance1', 'should include custom tags');
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
                            context.config.region = region;
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.LOGS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'gzip'));
                            return dataDogIndex(context)
                                .then(() => {
                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'syslog', 'should set source type to syslog');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.service, 'f5-telemetry', 'should set service to default');
                                    assert.strictEqual(dataDogRequestData[0].request.ddtags, 'telemetryEventCategory:syslog', 'should set tags from event data');
                                    checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                                });
                        });

                        it('should process event listener event log without metrics (syslog), and append custom tags', () => {
                            const context = testUtil.buildConsumerContext({
                                config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                            });
                            context.event.type = 'syslog';
                            context.event.data = {
                                data: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                                hostname: 'bigip14.1.2.3.test',
                                telemetryEventCategory: 'syslog'
                            };
                            context.config.region = region;
                            context.config.customTags = [
                                { name: 'deploymentName', value: 'best version' },
                                { name: 'instanceId', value: 'instance1' }
                            ];
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.LOGS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'gzip'));
                            return dataDogIndex(context)
                                .then(() => {
                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'syslog', 'should set source type to syslog');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.service, 'f5-telemetry', 'should set service to default');
                                    assert.include(dataDogRequestData[0].request.ddtags, 'telemetryEventCategory:syslog', 'should not overwrite dynamic tags');
                                    assert.include(dataDogRequestData[0].request.ddtags, 'deploymentName:best version,instanceId:instance1', 'should include custom tags');
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
                            context.config.region = region;
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.LOGS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'gzip'));
                            return dataDogIndex(context)
                                .then(() => {
                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'syslog', 'should set source type to syslog');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.service, 'f5-telemetry', 'should set service to default');
                                    checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                                });
                        });

                        it('should process event listener event without metrics (service == \'my-super-app\')', () => {
                            const context = testUtil.buildConsumerContext({
                                config: addGzipConfigIfNeed(defaultConsumerConfig, compressionType)
                            });
                            context.event.type = 'syslog';
                            context.event.data = {
                                data: 'plain data',
                                telemetryEventCategory: 'event'
                            };
                            context.config.region = region;
                            context.config.service = 'my-super-app';
                            const reqConfig = getRequestConfig(DATA_DOG_TYPES.LOGS, region);

                            setupDataDogMockEndpoint(addGzipReqHeadersIfNeed(reqConfig, compressionType, 'gzip'));
                            return dataDogIndex(context)
                                .then(() => {
                                    assert.lengthOf(dataDogRequestData, 1, 'should log 1 request');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.ddsource, 'syslog', 'should set source type to syslog');
                                    assert.deepStrictEqual(dataDogRequestData[0].request.service, 'my-super-app', 'should set service to default');
                                    checkGzipReqHeadersIfNeeded(dataDogRequestData[0], compressionType, 'gzip');
                                });
                        });
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
            setupDataDogMockEndpoint(getRequestConfig(DATA_DOG_TYPES.LOGS));
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
