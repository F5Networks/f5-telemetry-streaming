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
const protobufjs = require('protobufjs');
const path = require('path');

let openTelemetryExporter; // later on: require('../../../src/lib/consumers/OpenTelemetry_Exporter/index');
const openTelemetryExpectedData = require('./data/openTelemetryExporterConsumerTestsData');
const testUtil = require('../shared/util');
const util = require('../../../src/lib/utils/misc');

const F5_CLOUD_NODE_SUPPORTED_VERSION = '8.11.1';

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('OpenTelemetry_Exporter', () => {
    if (util.compareVersionStrings(process.version.substring(1), '<', F5_CLOUD_NODE_SUPPORTED_VERSION)) {
        return;
    }
    // eslint-disable-next-line global-require
    openTelemetryExporter = require('../../../src/lib/consumers/OpenTelemetry_Exporter/index');

    // Note: if a test has no explicit assertions then it relies on 'checkNockActiveMocks' in 'afterEach'
    let defaultConsumerConfig;
    let ExportRequestProto;

    before(() => {
        moduleCache.restore();
        const dir = path.resolve(__dirname, '../../../', 'node_modules/@opentelemetry/exporter-collector-proto/build/protos');
        const root = new protobufjs.Root();
        root.resolvePath = function (_, target) {
            return `${dir}/${target}`;
        };

        const proto = root.loadSync([
            'opentelemetry/proto/common/v1/common.proto',
            'opentelemetry/proto/resource/v1/resource.proto',
            'opentelemetry/proto/metrics/v1/metrics.proto',
            'opentelemetry/proto/collector/metrics/v1/metrics_service.proto'
        ]);
        ExportRequestProto = proto.lookupType('ExportMetricsServiceRequest');
    });

    beforeEach(() => {
        defaultConsumerConfig = {
            port: 80,
            host: 'localhost',
            metricsPath: '/v1/metrics'
        };
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        sinon.restore();
        nock.cleanAll();
    });

    describe('process', () => {
        it('should process event', () => assert.isFulfilled(openTelemetryExporter(testUtil.buildConsumerContext({
            eventType: 'event'
        }))));

        it('should log an error if error encountered', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            nock('http://localhost:80')
                .post('/v1/metrics')
                .replyWithError('error sending!');

            return openTelemetryExporter(context)
                .then(() => {
                    assert.deepStrictEqual(context.logger.error.firstCall.args, ['error: error sending!'], 'should log an error');
                    assert.isFalse(context.logger.debug.called, 'should not have logged a debug message');
                });
        });

        describe('OpenTelemetry metrics', () => {
            const convertExportedMetrics = (requestBody) => {
                const results = [];
                const ExportMetricsServiceRequest = ExportRequestProto.decode(Buffer.from(requestBody, 'hex'));
                const exportedMetrics = ExportMetricsServiceRequest
                    .resourceMetrics[0]
                    .instrumentationLibraryMetrics[0]
                    .metrics;

                exportedMetrics.forEach((metric) => {
                    results.push({
                        name: metric.name,
                        description: metric.description,
                        dataPoints: metric.doubleSum.dataPoints.map((p) => ({
                            labels: p.labels.map((l) => ({ key: l.key, value: l.value })),
                            value: p.value
                        }))
                    });
                });
                return results;
            };

            it('should log and trace data', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });

                nock('http://localhost:80')
                    .post('/v1/metrics')
                    .reply();
                return openTelemetryExporter(context)
                    .then(() => {
                        assert.deepStrictEqual(context.logger.debug.args, [['success']], 'should log a success');
                        assert.isFalse(context.logger.error.called, 'should not have logged an error');
                        const traceData = context.tracer.write.firstCall.args[0];

                        assert.strictEqual(Object.keys(traceData).length, 405, 'should have trace record for each metric');
                        assert.deepStrictEqual(traceData.system_diskLatency__util, {
                            description: 'system.diskLatency.%util',
                            measurements: [
                                { tags: { name: 'sda' }, value: 0.09 },
                                { tags: { name: 'sdb' }, value: 0.04 },
                                { tags: { name: 'dm-0' }, value: 0 },
                                { tags: { name: 'dm-1' }, value: 0.01 },
                                { tags: { name: 'dm-2' }, value: 0 },
                                { tags: { name: 'dm-3' }, value: 0.01 },
                                { tags: { name: 'dm-4' }, value: 0 },
                                { tags: { name: 'dm-5' }, value: 0 },
                                { tags: { name: 'dm-6' }, value: 0 },
                                { tags: { name: 'dm-7' }, value: 0 },
                                { tags: { name: 'dm-8' }, value: 0.01 }
                            ]
                        }, 'should include measurements array for specific metric in trace data');
                    });
            });

            it('should process and export systemInfo data', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });

                nock('http://localhost:80')
                    .post('/v1/metrics')
                    .reply(function (_, requestBody) {
                        const metrics = convertExportedMetrics(requestBody);

                        assert.strictEqual(this.req.headers['content-type'], 'application/x-protobuf', 'should send protobuf data');
                        assert.strictEqual(metrics.length, 726, 'should export correct number of metrics');
                    });
                return openTelemetryExporter(context);
            });

            it('should label metrics and export the correct values (systemInfo)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });

                nock('http://localhost:80')
                    .post('/v1/metrics')
                    .reply(200, (_, requestBody) => {
                        const metrics = convertExportedMetrics(requestBody);
                        const systemCpuLabels = metrics.find((metric) => metric.name === 'system_cpu').dataPoints[0].labels;

                        assert.deepStrictEqual(metrics, openTelemetryExpectedData.systemData[0].expectedData);
                        assert.isDefined(
                            systemCpuLabels.find((label) => label.key === 'configSyncSucceeded'),
                            'should find configSyncSucceeded as a label'
                        );
                    });
                return openTelemetryExporter(context);
            });

            it('should process systemInfo data, and convert booleans to metrics', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: Object.assign(defaultConsumerConfig, { convertBooleansToMetrics: true })
                });

                nock('http://localhost:80')
                    .post('/v1/metrics')
                    .reply(200, (_, requestBody) => {
                        const metrics = convertExportedMetrics(requestBody);
                        const systemCpuLabels = metrics.find((metric) => metric.name === 'system_cpu').dataPoints[0].labels;
                        const configSyncSucceeded = metrics.find((metric) => metric.name === 'system_configSyncSucceeded');

                        assert.isDefined(configSyncSucceeded, 'should include \'system_configSyncSucceeded\' as a metric');
                        assert.isUndefined(
                            systemCpuLabels.find((label) => label.key === 'configSyncSucceeded'),
                            'should not include configSyncSucceeded as a label'
                        );
                    });
                return openTelemetryExporter(context);
            });

            it('should process event listener event with metrics (AVR)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'AVR',
                    config: defaultConsumerConfig
                });
                nock('http://localhost:80')
                    .post('/v1/metrics')
                    .reply(200, (_, requestBody) => {
                        const metrics = convertExportedMetrics(requestBody);
                        assert.deepStrictEqual(metrics, openTelemetryExpectedData.avrData[0].expectedData);
                    });
                return openTelemetryExporter(context);
            });

            it('should not send event listener event without metrics (LTM)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'LTM',
                    config: defaultConsumerConfig
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        assert.deepStrictEqual(
                            context.logger.debug.args,
                            [['Event did not contain any metrics, skipping']],
                            'should log that no metrics were found'
                        );
                        assert.isFalse(context.logger.error.called, 'should not have logged an error');
                    });
            });

            it('should not process event listener event (plain event)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'event',
                    config: defaultConsumerConfig
                });
                context.event.data = 'just some random string data';
                return openTelemetryExporter(context)
                    .then(() => {
                        assert.deepStrictEqual(
                            context.logger.debug.args,
                            [['Event known to not contain metrics, skipping']],
                            'should log that no metrics were found'
                        );
                        assert.isFalse(context.logger.error.called, 'should not have logged an error');
                    });
            });

            it('should pass http headers when provided', () => {
                const configWithHeaders = Object.assign(defaultConsumerConfig, {
                    headers: [
                        {
                            name: 'x-api-key',
                            value: 'superSecret'
                        },
                        {
                            name: 'x-data-set',
                            value: 'data-set-key'
                        }
                    ]
                });
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: configWithHeaders
                });

                nock('http://localhost:80', {
                    reqheaders: {
                        'x-api-key': 'superSecret',
                        'x-data-set': 'data-set-key'
                    }
                })
                    .post('/v1/metrics')
                    .reply(200);
                return openTelemetryExporter(context);
            });
        });
    });
});
