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

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('AWS_CloudWatch', () => {
    let clock;
    let awsConfigUpdate;
    let putLogEventsStub;

    const defaultConsumerConfig = {
        region: 'us-west-1',
        logGroup: 'myLogGroup',
        logStream: 'theLogStream',
        username: 'awsuser',
        passphrase: 'awssecret'
    };

    beforeEach(() => {
        awsConfigUpdate = sinon.stub(AWS.config, 'update').resolves();
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
        // Fake the clock to get repeatable values in logEvents[].timestamp
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        sinon.restore();
        clock.restore();
    });

    it('should configure AWS access', () => {
        let optionsParam;
        awsConfigUpdate.callsFake((options) => {
            optionsParam = options;
        });
        const context = testUtil.buildConsumerContext({
            config: defaultConsumerConfig
        });

        awsCloudWatchIndex(context);
        assert.strictEqual(optionsParam.region, 'us-west-1');
        assert.deepStrictEqual(optionsParam.credentials,
            new AWS.Credentials({ accessKeyId: 'awsuser', secretAccessKey: 'awssecret' }));
    });

    it('should configure AWS access without creds', () => {
        let optionsParam;
        awsConfigUpdate.callsFake((options) => {
            optionsParam = options;
        });
        const config = Object.assign({}, defaultConsumerConfig);
        delete config.username;
        delete config.passphrase;
        const context = testUtil.buildConsumerContext({ config });

        awsCloudWatchIndex(context);
        assert.strictEqual(optionsParam.region, 'us-west-1');
    });

    describe('process', () => {
        const expectedParams = {
            logGroupName: 'myLogGroup',
            logStreamName: 'theLogStream',
            logEvents: [],
            sequenceToken: '1234'
        };

        it('should process systemInfo data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: 0
            };

            putLogEventsStub = (params) => {
                try {
                    assert.deepStrictEqual(params, expectedParams);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            awsCloudWatchIndex(context);
        });

        it('should process event data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            expectedParams.logEvents[0] = {
                message: JSON.stringify(testUtil.deepCopy(context.event.data)),
                timestamp: 0
            };

            putLogEventsStub = (params) => {
                try {
                    assert.deepStrictEqual(params, expectedParams);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            awsCloudWatchIndex(context);
        });
    });
});
