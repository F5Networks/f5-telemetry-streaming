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
const sinon = require('sinon');
const path = require('path');

const assert = require('../shared/assert');
const openTelemetryExpectedData = require('./data/openTelemetryExporterConsumerTestsData');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const util = sourceCode('src/lib/utils/misc');

// min supported version for OpenTelemetry_Exporter
const IS_8_11_1_PLUS = util.compareVersionStrings(process.version.substring(1), '>=', '8.11.1');
// on 8.11.1 gRPC server returns "Received RST_STREAM with code 0" - http2 bug on 8.11.1
const IS_8_13_PLUS = util.compareVersionStrings(process.version.substring(1), '>=', '8.13.0');

const OTLP_PROTOS_PATH = path.resolve('./node_modules/@opentelemetry/opentelemetry-proto');
const METRICS_SERVICE_PROTO_PATH = path.join(OTLP_PROTOS_PATH, 'opentelemetry/proto/collector/metrics/v1/metrics_service.proto');
const OTLP_PROTO_GEN_PATH = path.resolve('./node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/generated/root.js');

let grpc;
let openTelemetryExporter;
let openTelemetryProtoGen;
let protoLoader;

if (IS_8_11_1_PLUS) {
    // eslint-disable-next-line global-require
    grpc = require('@grpc/grpc-js');
    // eslint-disable-next-line global-require
    openTelemetryExporter = sourceCode('src/lib/consumers/OpenTelemetry_Exporter/index');
    // eslint-disable-next-line global-require, import/no-dynamic-require
    openTelemetryProtoGen = require(OTLP_PROTO_GEN_PATH);
    // eslint-disable-next-line global-require
    protoLoader = require('@grpc/proto-loader');
}

moduleCache.remember();

(IS_8_11_1_PLUS ? describe.skip : describe.skip)('OpenTelemetry_Exporter', () => {
    if (!IS_8_11_1_PLUS) {
        return;
    }

    function getNanoSecTime() {
        return Date.now() / 0.000001; // to nano
    }

    function verifyMetricTimestamps(timestampsToVerify, currentTimestamp) {
        timestampsToVerify.forEach((metric) => {
            assert.isTrue(
                metric.timestamps.every((tarr) => tarr.every((t) => t >= currentTimestamp)),
                `should have correct timestamps for '${metric.name}'. got '${JSON.stringify(metric.timestamps)}' (time in nano before test started - ${currentTimestamp})`
            );
        });
    }

    before(() => {
        moduleCache.restore();
    });

    function generateTests(testConf) {
        let currentTimestampUnixNano;
        let defaultConsumerConfig;
        let ExportRequestProto;
        let fetchLabelValue;
        let grpcServer;
        let mockHost;
        let mockPath;
        let mockPort;
        let mockProtocol;
        let nockMock;
        let onDataReceivedCallback;
        let requestHeaders;
        let requestMetrics;
        let requestTimestamps;

        function convertExportedMetrics(requestBody) {
            const metrics = [];
            const timestamps = [];

            if (testConf.exporter === 'protobuf') {
                requestBody = ExportRequestProto.decode(Buffer.from(requestBody, 'hex'));
            }

            requestBody.resourceMetrics[0]
                .scopeMetrics[0]
                .metrics.forEach((metric) => {
                    metrics.push({
                        name: metric.name,
                        description: metric.description,
                        dataPoints: metric.sum.dataPoints.map((p) => ({
                            labels: p.attributes.map((l) => ({ key: l.key, value: fetchLabelValue(l) })),
                            value: p.asDouble
                        }))
                    });
                    timestamps.push({
                        name: metric.name,
                        timestamps: metric.sum.dataPoints.map((p) => [
                            Number(p.startTimeUnixNano),
                            Number(p.timeUnixNano)
                        ])
                    });
                });
            return {
                metrics,
                timestamps
            };
        }

        function getMockNock(options) {
            if (!nockMock) {
                nockMock = nock(`${mockProtocol}://${mockHost}:${mockPort}`, options).post(mockPath);
            }
            return nockMock;
        }

        function initDefaultNockMock(options) {
            getMockNock(options).reply(200, function (_, requestBody) {
                if (onDataReceivedCallback) {
                    onDataReceivedCallback(requestBody);
                }
                requestHeaders = this.req.headers;
            });
        }

        function isGRPCExporter() {
            return testConf.exporter === 'grpc';
        }

        function isProtobufExporter() {
            return testConf.exporter === 'protobuf';
        }

        function resetNockMock() {
            if (nockMock) {
                nock.removeInterceptor(nockMock);
            }
        }

        function verifyTimestamps() {
            verifyMetricTimestamps(requestTimestamps, currentTimestampUnixNano);
        }

        before((done) => {
            grpcServer = null;
            mockHost = 'localhost';
            mockPath = '/v1/metrics';
            mockPort = 55681;
            mockProtocol = testConf.secure ? 'https' : 'http';

            if (isGRPCExporter()) {
                const protoDescriptor = grpc.loadPackageDefinition(protoLoader.loadSync(METRICS_SERVICE_PROTO_PATH, {
                    keepCase: false,
                    longs: String,
                    enums: String,
                    defaults: true,
                    oneofs: true,
                    includeDirs: [OTLP_PROTOS_PATH]
                }));

                grpcServer = new grpc.Server();
                grpcServer.addService(protoDescriptor.opentelemetry.proto.collector.metrics.v1.MetricsService.service, {
                    Export: (call, callback) => {
                        const metadata = new grpc.Metadata();
                        metadata.merge(call.metadata);
                        requestHeaders = metadata.toHttp2Headers();

                        let error = null;
                        if (onDataReceivedCallback) {
                            error = onDataReceivedCallback(call.request);
                        }
                        callback(error, {});
                    }
                });
            } else {
                ExportRequestProto = openTelemetryProtoGen
                    .opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
            }

            if (isProtobufExporter()) {
                fetchLabelValue = (label) => label.value[label.value.value];
            } else {
                fetchLabelValue = (label) => {
                    if (typeof label.value.boolValue !== 'undefined') {
                        return label.value.boolValue;
                    }
                    return label.value.stringValue;
                };
            }

            if (isGRPCExporter()) {
                grpcServer.bindAsync(`${mockHost}:${mockPort}`, grpc.ServerCredentials.createInsecure(), (err) => {
                    if (err) {
                        done(err);
                    } else {
                        grpcServer.start();
                        done();
                    }
                });
            } else {
                done();
            }
        });

        after((done) => {
            if (grpcServer) {
                grpcServer.tryShutdown(done);
            } else {
                done();
            }
        });

        beforeEach(() => {
            currentTimestampUnixNano = getNanoSecTime();
            defaultConsumerConfig = {
                exporter: testConf.exporter,
                host: mockHost,
                metricsPath: mockPath,
                port: mockPort,
                protocol: mockProtocol,
                useSSL: testConf.secure
            };
            nockMock = null;
            onDataReceivedCallback = (requestBody) => {
                const parsed = convertExportedMetrics(requestBody);
                requestMetrics = parsed.metrics;
                requestTimestamps = parsed.timestamps;
                return null;
            };
            requestHeaders = null;
            requestMetrics = null;
            requestTimestamps = null;

            if (!isGRPCExporter()) {
                initDefaultNockMock();
            }
        });

        afterEach(() => {
            testUtil.checkNockActiveMocks();
            testUtil.nockCleanup();
            sinon.restore();
        });

        describe('OpenTelemetry metrics', () => {
            it('should log an error if error encountered', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });

                if (isGRPCExporter()) {
                    onDataReceivedCallback = () => new Error('error sending!');
                } else {
                    resetNockMock();
                    getMockNock().replyWithError('error sending!');
                }

                return openTelemetryExporter(context)
                    .then(() => {
                        assert.includeDeepMembers(context.logger.exception.firstCall.args, ['Error on attempt to send metrics:'], 'should log an error');
                    });
            });

            it('should log and trace data', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        // on 8.11.1 server returns "Received RST_STREAM with code 0" - http2 bug on 8.11.1
                        if (IS_8_13_PLUS) {
                            assert.deepStrictEqual(context.logger.verbose.args, [['success']], 'should log a success');
                            assert.isFalse(context.logger.error.called, 'should not have logged an error');
                        }

                        const traceData = context.tracer.write.firstCall.args[0];
                        assert.deepStrictEqual(Object.keys(traceData).length, 409, 'should have trace record for each metric');
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

                        assert.sameDeepMembers(
                            requestMetrics,
                            openTelemetryExpectedData.systemData[0].expectedData
                        );
                        verifyTimestamps();
                    });
            });

            it('should process and export systemInfo data', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        if (!isGRPCExporter()) {
                            const expectedHeader = isProtobufExporter()
                                ? 'application/x-protobuf'
                                : 'application/json';

                            assert.deepStrictEqual(requestHeaders['content-type'], expectedHeader, 'should use correct Content-Type header');
                        }
                        assert.deepStrictEqual(requestMetrics.length, 409, 'should export correct number of metrics');
                        verifyTimestamps();
                    });
            });

            it('should label metrics and export the correct values (systemInfo)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        const systemCpuLabels = requestMetrics.find((metric) => metric.name === 'system_cpu')
                            .dataPoints[0].labels;
                        assert.sameDeepMembers(
                            requestMetrics,
                            openTelemetryExpectedData.systemData[0].expectedData
                        );
                        assert.isDefined(
                            systemCpuLabels.find((label) => label.key === 'configSyncSucceeded'),
                            'should find configSyncSucceeded as a label'
                        );
                        verifyTimestamps();
                    });
            });

            it('should process systemInfo data, and convert booleans to metrics', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: Object.assign(defaultConsumerConfig, { convertBooleansToMetrics: true })
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        const systemCpuLabels = requestMetrics.find((metric) => metric.name === 'system_cpu').dataPoints[0].labels;
                        const configSyncSucceeded = requestMetrics.find((metric) => metric.name === 'system_configSyncSucceeded');

                        assert.isDefined(configSyncSucceeded, 'should include \'system_configSyncSucceeded\' as a metric');
                        assert.isUndefined(
                            systemCpuLabels.find((label) => label.key === 'configSyncSucceeded'),
                            'should not include configSyncSucceeded as a label'
                        );
                        verifyTimestamps();
                    });
            });

            it('should process event listener event with metrics (AVR)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'AVR',
                    config: defaultConsumerConfig
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        assert.deepStrictEqual(requestMetrics, openTelemetryExpectedData.avrData[0].expectedData);
                        verifyTimestamps();
                    });
            });

            it('should not send event listener event without metrics (LTM)', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'LTM',
                    config: defaultConsumerConfig
                });
                return openTelemetryExporter(context)
                    .then(() => {
                        resetNockMock();
                        assert.isNull(requestMetrics, 'should not send metrics');
                        assert.deepStrictEqual(
                            context.logger.verbose.args,
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
                        resetNockMock();
                        assert.isNull(requestMetrics, 'should not send metrics');
                        assert.deepStrictEqual(
                            context.logger.verbose.args,
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

                if (!isGRPCExporter()) {
                    resetNockMock();
                    initDefaultNockMock({
                        reqheaders: {
                            'x-api-key': 'superSecret',
                            'x-data-set': 'data-set-key'
                        }
                    });
                }
                return openTelemetryExporter(context)
                    .then(() => {
                        if (isGRPCExporter()) {
                            assert.deepNestedInclude(requestHeaders, {
                                'x-api-key': ['superSecret'],
                                'x-data-set': ['data-set-key']
                            }, 'should pass headers to gRPC metadata');
                        }
                    });
            });
        });
    }

    testUtil.product(
        [ // exporter
            'grpc',
            'json',
            'protobuf'
        ],
        [ // secure
            true,
            false
        ]
    ).forEach((row) => {
        const testConf = {
            exporter: row[0],
            secure: row[1]
        };
        // skip tests for secure gRPC
        if (testConf.exporter === 'grpc' && testConf.secure === true) {
            return;
        }
        describe((`Exporter = ${testConf.exporter}, Secure = ${testConf.secure}`), () => generateTests(testConf));
    });
});
