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
        // stub getDay() since it attempts to convert into 'local' time.
        sinon.stub(Date.prototype, 'getDay').returns('1');
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

    it('should configure AWS access', () => {
        let optionsParam;
        awsConfigUpdate.callsFake((options) => {
            optionsParam = options;
        });
        const context = testUtil.buildConsumerContext({
            config: defaultConsumerConfig
        });

        awsS3Index(context);
        assert.strictEqual(optionsParam.region, 'us-west-1');
        assert.deepStrictEqual(optionsParam.credentials,
            new AWS.Credentials({ accessKeyId: 'awsuser', secretAccessKey: 'awssecret' }));
    });

    describe('process', () => {
        const expectedParams = {
            Body: '',
            Bucket: 'dataBucket',
            ContentType: 'application/json',
            Key: '2019/1/1/2019-02-04T01:02:03.000Z.log',
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

            awsS3Index(context);
            assert.deepStrictEqual(s3PutObjectParams, expectedParams);
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            expectedParams.Body = JSON.stringify(testUtil.deepCopy(context.event.data));

            awsS3Index(context);
            assert.deepStrictEqual(s3PutObjectParams, expectedParams);
        });
    });
});
