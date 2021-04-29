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

const AWS = require('aws-sdk');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const awsS3Index = require('../../../src/lib/consumers/AWS_S3/index');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('AWS_S3', () => {
    let clock;
    let awsConfigUpdate;
    let s3PutObjectParams;

    const defaultConsumerConfig = {
        region: 'us-west-1',
        bucket: 'dataBucket',
        username: 'awsuser',
        passphrase: 'awssecret'
    };

    beforeEach(() => {
        awsConfigUpdate = sinon.stub(AWS.config, 'update').resolves();
        sinon.stub(AWS, 'S3').returns({
            putObject: (params, cb) => {
                s3PutObjectParams = params;
                cb(null, '');
            }
        });
        // stub getDate() since it attempts to convert into 'local' time.
        sinon.stub(Date.prototype, 'getDate').returns('4');
        // Fake the clock to get a consistent S3 object Key value (which are partitioned by time)
        clock = sinon.useFakeTimers({
            now: new Date('Feb 4, 2019 01:02:03 GMT+00:00'),
            shouldAdvanceTime: true,
            advanceTimeDelta: 20
        });
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
    });

    it('should configure AWS access when credentials present', () => {
        let optionsParam;
        awsConfigUpdate.callsFake((options) => {
            optionsParam = options;
        });
        const context = testUtil.buildConsumerContext({
            config: defaultConsumerConfig
        });

        return awsS3Index(context)
            .then(() => {
                assert.strictEqual(optionsParam.region, 'us-west-1');
                assert.deepStrictEqual(optionsParam.credentials,
                    new AWS.Credentials({ accessKeyId: 'awsuser', secretAccessKey: 'awssecret' }));
            });
    });

    it('should configure AWS access without credentials (IAM role-based permissions)', () => {
        let optionsParam;
        awsConfigUpdate.callsFake((options) => {
            optionsParam = options;
        });
        const context = testUtil.buildConsumerContext({
            config: {
                region: 'us-east-1',
                bucket: 'dataBucket'
            }
        });

        return awsS3Index(context)
            .then(() => {
                assert.strictEqual(optionsParam.region, 'us-east-1');
                assert.strictEqual(optionsParam.credentials, undefined);
            });
    });

    it('should configure AWS access with custom agent', () => {
        let optionsParam;
        awsConfigUpdate.callsFake((options) => {
            optionsParam = options;
        });
        const context = testUtil.buildConsumerContext({
            config: defaultConsumerConfig
        });

        return awsS3Index(context)
            .then(() => {
                assert.ok(optionsParam.httpOptions.agent.options, 'AWS should have custom Agent');
            });
    });

    describe('process', () => {
        const expectedParams = {
            Body: '',
            Bucket: 'dataBucket',
            ContentType: 'application/json',
            Key: '2019/2/4/2019-02-04T01:02:03.000Z.log',
            Metadata: {
                f5telemetry: 'true'
            }
        };

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            expectedParams.Body = JSON.stringify(testUtil.deepCopy(context.event.data));

            return awsS3Index(context)
                .then(() => assert.deepStrictEqual(s3PutObjectParams, expectedParams));
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            expectedParams.Body = JSON.stringify(testUtil.deepCopy(context.event.data));

            return awsS3Index(context)
                .then(() => assert.deepStrictEqual(s3PutObjectParams, expectedParams));
        });

        it('should log error when encountered and not reject', () => {
            const context = testUtil.buildConsumerContext(defaultConsumerConfig);
            const error = new Error('simulated error');
            AWS.S3.restore();
            sinon.stub(AWS, 'S3').returns({
                putObject: (params, cb) => {
                    s3PutObjectParams = params;
                    cb(error, '');
                }
            });
            return awsS3Index(context)
                .then(() => assert.deepStrictEqual(
                    context.logger.exception.args[0],
                    ['Error encountered while processing for AWS S3', error]
                ));
        });
    });
});
