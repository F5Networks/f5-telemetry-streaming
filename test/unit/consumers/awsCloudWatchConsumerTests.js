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

const AWS = require('aws-sdk');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const awsCloudWatchIndex = sourceCode('src/lib/consumers/AWS_CloudWatch/index');
const awsUtil = sourceCode('src/lib/consumers/shared/awsUtil');

moduleCache.remember();

describe('AWS_CloudWatch', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Config', () => {
        let optionsParam;
        const defaultConsumerConfig = {
            region: 'us-west-1',
            username: 'awsuser',
            passphrase: 'awssecret'
        };

        beforeEach(() => {
            sinon.stub(AWS.config, 'update').callsFake((options) => {
                optionsParam = options;
            });
            sinon.stub(awsUtil, 'sendLogs').resolves();
        });

        it('should configure AWS access', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            return awsCloudWatchIndex(context)
                .then(() => {
                    assert.strictEqual(optionsParam.region, 'us-west-1');
                    assert.deepStrictEqual(
                        optionsParam.credentials,
                        new AWS.Credentials({ accessKeyId: 'awsuser', secretAccessKey: 'awssecret' })
                    );
                });
        });

        it('should configure AWS access without creds', () => {
            const config = Object.assign({}, defaultConsumerConfig);
            delete config.username;
            delete config.passphrase;
            const context = testUtil.buildConsumerContext({ config });

            return awsCloudWatchIndex(context)
                .then(() => assert.strictEqual(optionsParam.region, 'us-west-1'));
        });
    });

    describe('Endpoints', () => {
        beforeEach(() => {
            sinon.stub(AWS.config, 'update').resolves();
            sinon.stub(AWS, 'Endpoint').callsFake((params) => ({ params }));
        });

        it('should supply endpointUrl to Monitoring Logs client', () => {
            let cloudWatchLogsConstructorParams;
            sinon.stub(AWS, 'CloudWatchLogs').callsFake((cloudWatchLogsParams) => {
                cloudWatchLogsConstructorParams = cloudWatchLogsParams;
            });

            const context = testUtil.buildConsumerContext({
                config: {
                    endpointUrl: 'full-endpoint-url'
                }
            });

            return awsCloudWatchIndex(context)
                .then(() => assert.deepStrictEqual(cloudWatchLogsConstructorParams.endpoint, { params: 'full-endpoint-url' }));
        });

        it('should supply endpointUrl to Monitoring Metrics client', () => {
            let cloudWatchConstructorParams;
            sinon.stub(AWS, 'CloudWatch').callsFake((cloudWatchParams) => {
                cloudWatchConstructorParams = cloudWatchParams;
            });

            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    dataType: 'metrics',
                    endpointUrl: 'full-endpoint-url'
                }
            });

            return awsCloudWatchIndex(context)
                .then(() => assert.deepStrictEqual(cloudWatchConstructorParams.endpoint, { params: 'full-endpoint-url' }));
        });
    });

    describe('Logs', () => {
        let clock;
        let putLogEventsStub;
        let actualParams;
        const PutLogEventsCoolOff = 5000; // same as in source, long enough to send even half empty batch immediately
        const PutLogEventsTooClose = 500; // too short to send even full batch immediately
        const defaultConsumerConfig = {
            region: 'us-west-1',
            logGroup: 'myLogGroup',
            logStream: 'theLogStream',
            maxAwsLogBatchSize: 2,
            username: 'awsuser',
            passphrase: 'awssecret',
            trace: true
        };
        const expectedParams = {
            logGroupName: 'myLogGroup',
            logStreamName: 'theLogStream',
            logEvents: [],
            sequenceToken: '1234'
        };

        beforeEach(() => {
            sinon.stub(AWS.config, 'update').returns();
            sinon.stub(AWS, 'CloudWatchLogs').returns({
                describeLogStreams: () => ({
                    promise: () => Promise.resolve({
                        logStreams: [
                            {
                                storageBytes: 1048576,
                                arn: 'arn:aws:logs:us-east-1:123456789012:log-group:my-log-group-1:log-stream:my-log-stream-1',
                                creationTime: 1393545600000,
                                firstEventTimestamp: 1393545600000,
                                lastEventTimestamp: 1393567800000,
                                lastIngestionTime: 1393589200000,
                                logStreamName: 'my-log-stream-1',
                                uploadSequenceToken: '1234'
                            }
                        ]
                    })
                }),
                putLogEvents: (params) => ({
                    promise: () => putLogEventsStub(params)
                })
            });
            putLogEventsStub = (params) => {
                actualParams = params;
                return Promise.resolve();
            };
            // Fake the clock to get repeatable values in logEvents[].timestamp
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
            actualParams = undefined;
            expectedParams.logEvents = [];
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.id = 10010; // should be unique to avoid interference with other tests
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsCoolOff + 1
            };

            clock.tick(PutLogEventsCoolOff + 1);
            return awsCloudWatchIndex(context)
                .then(() => assert.deepStrictEqual(actualParams, expectedParams));
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 10020; // should be unique to avoid interference with other tests
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsCoolOff + 1
            };

            clock.tick(PutLogEventsCoolOff + 1);
            return awsCloudWatchIndex(context)
                .then(() => {
                    assert.deepStrictEqual(actualParams, expectedParams);
                    // check the tracer too
                    assert.deepStrictEqual(context.tracer.write.firstCall.args[0], expectedParams);
                });
        });

        it('too soon to process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 10030; // should be unique to avoid interference with other tests

            clock.tick(PutLogEventsTooClose + 1);
            // PutLogEvents will not be called, so actualParams will not be updated in the stub
            return awsCloudWatchIndex(context)
                .then(() => assert.strictEqual(actualParams, undefined));
        });

        it('record the timestamps of events, not the timestamp of PutLogEvents command', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 10040; // should be unique to avoid interference with other tests
            // timestamps are different
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsTooClose + 1
            };
            expectedParams.logEvents[1] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsTooClose + 1 + 10
            };

            clock.tick(PutLogEventsTooClose + 1);
            return awsCloudWatchIndex(context)
                .then(() => {
                    // too soon to send a half full batch
                    assert.strictEqual(actualParams, undefined);
                    // nothing to trace yet
                    assert.strictEqual(context.tracer.write.firstCall, null);
                    clock.tick(10);
                    return awsCloudWatchIndex(context);
                })
                .then(() => {
                    assert.deepStrictEqual(actualParams, expectedParams);
                    // check the tracer too
                    assert.deepStrictEqual(context.tracer.write.firstCall.args[0], expectedParams);
                });
        });

        it('two events with the same timestamp in the same batch', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 10050; // should be unique to avoid interference with other tests
            // timestamps are the same
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsTooClose + 1
            };
            expectedParams.logEvents[1] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsTooClose + 1
            };

            clock.tick(PutLogEventsTooClose + 1);
            return awsCloudWatchIndex(context)
                .then(() => {
                    // too soon to send a half full batch
                    assert.strictEqual(actualParams, undefined);
                    return awsCloudWatchIndex(context);
                })
                .then(() => assert.deepStrictEqual(actualParams, expectedParams));
        });

        it('messages are a day apart, cannot be sent together', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 10060; // should be unique to avoid interference with other tests
            const oneDayWindow = 24 * 60 * 60 * 1000;
            // only one message will be sent because the other is a day apart
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsTooClose + 1 + oneDayWindow
            };

            clock.tick(PutLogEventsTooClose + 1);
            return awsCloudWatchIndex(context)
                .then(() => {
                    // too soon to send a half full batch
                    assert.strictEqual(actualParams, undefined);
                    clock.tick(oneDayWindow);
                    return awsCloudWatchIndex(context);
                })
                .then(() => assert.deepStrictEqual(actualParams, expectedParams));
        });

        it('should lose event when an arbitrary error came from AWS', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 10070; // should be unique to avoid interference with other tests
            // expected timestamp indicates that it is the second message
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsCoolOff + 1 + PutLogEventsCoolOff + 1
            };

            // the first event will return with an error and will not be readded to the cache
            putLogEventsStub = () => Promise.reject(new Error('generic exception'));
            clock.tick(PutLogEventsCoolOff + 1);
            return awsCloudWatchIndex(context)
                .then(() => {
                    assert.strictEqual(actualParams, undefined);
                    // only the second event will be sent
                    putLogEventsStub = (params) => {
                        actualParams = params;
                        return Promise.resolve();
                    };
                    clock.tick(PutLogEventsCoolOff + 1);
                    return awsCloudWatchIndex(context);
                })
                .then(() => assert.deepStrictEqual(actualParams, expectedParams));
        });

        it('should readd event when InvalidSequenceTokenException came from AWS', () => {
            class InvalidSequenceTokenExceptionError extends Error {
                constructor() {
                    super();
                    this.code = 'InvalidSequenceTokenException';
                }
            }

            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.id = 1006; // should be unique to avoid interference with other tests
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsCoolOff + 1
            };
            expectedParams.logEvents[1] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: PutLogEventsCoolOff + 1 + PutLogEventsCoolOff + 1
            };

            // the first event will return with an allowed exception and will be readded to the cache
            putLogEventsStub = () => Promise.reject(new InvalidSequenceTokenExceptionError());
            clock.tick(PutLogEventsCoolOff + 1);
            return awsCloudWatchIndex(context)
                .then(() => {
                    // on the first event nothing is sent
                    assert.strictEqual(actualParams, undefined);
                    // on the second event. both events will be sent
                    putLogEventsStub = (params) => {
                        actualParams = params;
                        return Promise.resolve();
                    };
                    clock.tick(PutLogEventsCoolOff + 1);
                    return awsCloudWatchIndex(context);
                })
                .then(() => assert.deepStrictEqual(actualParams, expectedParams));
        });
    });

    describe('Metrics', () => {
        let getMetricsSpy;
        let putMetricsStub;
        let actualParams;
        let clock;

        const defaultConsumerConfig = {
            region: 'us-west-2',
            dataType: 'metrics',
            metricNamespace: 'my-metrics',
            username: 'awsuser',
            passphrase: 'awssecret'
        };

        beforeEach(() => {
            getMetricsSpy = sinon.spy(awsUtil, 'getMetrics');
            sinon.stub(AWS, 'CloudWatch').returns({
                putMetricData: (params) => ({
                    promise: () => putMetricsStub(params)
                })
            });
            putMetricsStub = (params) => {
                actualParams = params;
                return Promise.resolve();
            };
            clock = sinon.useFakeTimers(new Date('2020-08-04T22:23:33.692Z'));
        });

        afterEach(() => {
            clock.restore();
        });

        describe('process', () => {
            it('should skip event data', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'event',
                    config: defaultConsumerConfig
                });
                return awsCloudWatchIndex(context)
                    .then(() => {
                        assert.isTrue(getMetricsSpy.notCalled);
                        assert.isUndefined(actualParams);
                    });
            });

            it('should process systemInfo data', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.event.data = {
                    system: {
                        hostname: 'host.bigip.test',
                        version: '14.0.0',
                        cpu: 20
                    },
                    pools: {
                        '/Common/testpool': {
                            name: '/Common/testpool',
                            monitorStatus: 'up',
                            'serverside.curConns': 12345
                        },
                        '/Common/devpool': {
                            name: '/Common/devpool',
                            monitorStatus: 'down',
                            'serverside.curConns': 98765
                        }
                    }
                };

                const expectedMetrics = [
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.bigip.test' },
                            { Name: 'version', Value: '14.0.0' }
                        ],
                        MetricName: 'F5_system_cpu',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 20
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.bigip.test' },
                            { Name: 'version', Value: '14.0.0' },
                            { Name: 'name', Value: '/Common/testpool' }
                        ],
                        MetricName: 'F5_pools_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 12345
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.bigip.test' },
                            { Name: 'version', Value: '14.0.0' },
                            { Name: 'name', Value: '/Common/devpool' }
                        ],
                        MetricName: 'F5_pools_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 98765
                    }
                ];

                return awsCloudWatchIndex(context)
                    .then(() => {
                        assert.deepStrictEqual(
                            actualParams,
                            {
                                MetricData: expectedMetrics,
                                Namespace: 'my-metrics'
                            }
                        );
                    });
            });
        });
    });
});
