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

const AWS = require('aws-sdk');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const awsCloudWatchIndex = require('../../../src/lib/consumers/AWS_CloudWatch/index');
const testUtil = require('../shared/util');
const awsUtil = require('../../../src/lib/consumers/shared/awsUtil');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('AWS_CloudWatch', () => {
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
                    assert.deepStrictEqual(optionsParam.credentials,
                        new AWS.Credentials({ accessKeyId: 'awsuser', secretAccessKey: 'awssecret' }));
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

    describe('Logs', () => {
        let clock;
        let putLogEventsStub;
        let actualParams;

        const defaultConsumerConfig = {
            region: 'us-west-1',
            logGroup: 'myLogGroup',
            logStream: 'theLogStream',
            username: 'awsuser',
            passphrase: 'awssecret'
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
                putLogEvents: params => ({
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
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: 0
            };

            return awsCloudWatchIndex(context)
                .then(() => assert.deepStrictEqual(actualParams, expectedParams));
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: 0
            };

            return awsCloudWatchIndex(context)
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
                putMetricData: params => ({
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
                        version: '14.0.0.0.1',
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
                            { Name: 'version', Value: '14.0.0.0.1' }
                        ],
                        MetricName: 'F5_system_cpu',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 20
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.bigip.test' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/testpool' }
                        ],
                        MetricName: 'F5_pools_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 12345
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.bigip.test' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/devpool' }
                        ],
                        MetricName: 'F5_pools_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 98765
                    }
                ];

                return awsCloudWatchIndex(context)
                    .then(() => {
                        assert.deepStrictEqual(actualParams,
                            {
                                MetricData: expectedMetrics,
                                Namespace: 'my-metrics'
                            });
                    });
            });
        });
    });
});
