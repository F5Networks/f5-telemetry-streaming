/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const assert = require('assert');
const AWS = require('aws-sdk');
const constants = require('../shared/constants');
const testUtil = require('../shared/util');
const awsUtil = require('../../../src/lib/consumers/shared/awsUtil');

const ENV_FILE = process.env[constants.ENV_VARS.CLOUD.FILE];
const ENV_INFO = JSON.parse(fs.readFileSync(ENV_FILE));
const VM_IP = ENV_INFO.instances[0].mgmt_address;
const VM_PORT = ENV_INFO.instances[0].mgmt_port;
const VM_USER = ENV_INFO.instances[0].admin_username;
const VM_PWD = ENV_INFO.instances[0].admin_password;
const BUCKET = ENV_INFO.bucket;
const REGION = ENV_INFO.region;
const METRIC_NAMESPACE = process.env[constants.ENV_VARS.AWS.METRIC_NAMESPACE];

const CLIENT_SECRET = process.env[constants.ENV_VARS.AWS.ACCESS_KEY_SECRET];
const CLIENT_ID = process.env[constants.ENV_VARS.AWS.ACCESS_KEY_ID];

describe('AWS Cloud-based Tests', function () {
    this.timeout(600000);
    let s3;
    let cloudWatch;
    let options = {};
    let vmAuthToken;

    const deviceInfo = {
        ip: VM_IP,
        username: VM_USER,
        port: VM_PORT,
        password: VM_PWD
    };

    const assertPost = (declaration) => testUtil.postDeclaration(deviceInfo, declaration)
        .then((response) => {
            testUtil.logger.info('Response from declaration post', { host: VM_IP, response });
            return assert.strictEqual(response.message, 'success', 'POST declaration should return success');
        });

    before((done) => {
        testUtil.getAuthToken(VM_IP, VM_USER, VM_PWD, VM_PORT)
            .then((data) => {
                vmAuthToken = data.token;
                options = {
                    protocol: 'https',
                    port: VM_PORT,
                    headers: {
                        'X-F5-Auth-Token': vmAuthToken
                    }
                };

                AWS.config.update({
                    region: REGION,
                    accessKeyId: CLIENT_ID,
                    secretAccessKey: CLIENT_SECRET
                });
                s3 = new AWS.S3({ apiVersion: '2006-03-01' });
                cloudWatch = new AWS.CloudWatch({ apiVersion: '2010-08-01' });

                done();
            })
            .catch((err) => { done(err); });
    });

    describe('Setup', () => {
        it('should install package', () => {
            const packageDetails = testUtil.getPackageDetails();
            const fullPath = `${packageDetails.path}/${packageDetails.name}`;
            return testUtil.installPackage(VM_IP, vmAuthToken, fullPath, VM_PORT)
                .then(() => {
                    testUtil.logger.info(`Successfully installed RPM: ${fullPath} on ${VM_IP}`);
                });
        });

        it('should verify TS service is running', () => {
            const uri = `${constants.BASE_ILX_URI}/info`;

            return new Promise((resolve) => setTimeout(resolve, 5000))
                .then(() => testUtil.makeRequest(VM_IP, uri, options))
                .then((data) => {
                    data = data || {};
                    testUtil.logger.info(`${uri} response`, { host: VM_IP, data });
                    return assert.notStrictEqual(data.version, undefined);
                });
        });
    });

    describe('IAM Roles', () => {
        describe('AWS_S3', () => {
            it('should post systemPoller declaration without credentials', () => {
                const declaration = {
                    class: 'Telemetry',
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 60
                        }
                    },
                    My_IAM_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'AWS_S3',
                        bucket: BUCKET,
                        region: REGION
                    }
                };
                return assertPost(declaration);
            });

            it('should retrieve systemPoller info from bucket', function () {
                this.timeout(180000);

                return new Promise((resolve) => setTimeout(resolve, 90000))
                    .then(() => new Promise((resolve, reject) => {
                        s3.listObjects({ Bucket: BUCKET, MaxKeys: 5 }, (err, data) => {
                            if (err) reject(err);
                            let bucketContents = data.Contents;
                            assert.notDeepStrictEqual(bucketContents, []);
                            bucketContents = bucketContents.sort((o1, o2) => o2.LastModified - o1.LastModified);
                            resolve(bucketContents);
                        });
                    }))
                    .then((bucketContents) => new Promise((resolve, reject) => {
                        const key = bucketContents[0].Key;
                        s3.getObject({ Bucket: BUCKET, Key: key, ResponseContentType: 'application/json' }, (err, data) => {
                            if (err) reject(err);
                            const body = JSON.parse(data.Body.toString());
                            // depending on onboarding result, hostname may vary
                            // sufficient to check that there's an entry here
                            // (deployment creates a bucket per instance)
                            assert.notDeepStrictEqual(body.system, {});
                            assert.strictEqual(body.telemetryEventCategory, 'systemInfo');
                            resolve();
                        });
                    }));
            });

            it('should remove configuration', () => {
                const declaration = {
                    class: 'Telemetry'
                };
                return assertPost(declaration);
            });
        });

        describe('AWS_CloudWatch_Metrics', () => {
            it('should post systemPoller declaration without credentials', () => {
                const declaration = {
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        debug: true,
                        logLevel: 'debug'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 60
                        }
                    },
                    My_IAM_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'AWS_CloudWatch',
                        dataType: 'metrics',
                        metricNamespace: METRIC_NAMESPACE,
                        region: REGION
                    }
                };
                return assertPost(declaration);
            });

            it('should retrieve systemPoller info from metric namespace', function () {
                this.timeout(300000);

                const startTime = new Date().toISOString();
                // metrics take around 2-3 minutes to show up
                return new Promise((resolve) => setTimeout(resolve, 180000))
                    .then(() => {
                        // get system poller data
                        const uri = `${constants.BASE_ILX_URI}/systempoller/My_System`;
                        return testUtil.makeRequest(VM_IP, uri, options);
                    })
                    .then((sysPollerData) => {
                        const defDimensions = awsUtil.getDefaultDimensions(sysPollerData[0]);
                        const endTime = new Date().toISOString();
                        const getOpts = {
                            MaxDatapoints: 10,
                            StartTime: startTime,
                            EndTime: endTime,
                            // API requires all dimension values if present for the results to appear
                            // you can't match with just one or no dimension value
                            MetricDataQueries: [
                                {
                                    Id: 'm1',
                                    MetricStat: {
                                        Metric: {
                                            Namespace: METRIC_NAMESPACE,
                                            MetricName: 'F5_system_cpu',
                                            Dimensions: defDimensions
                                        },
                                        Period: 300,
                                        Stat: 'Average'
                                    }
                                }

                            ]
                        };
                        return cloudWatch.getMetricData(getOpts).promise();
                    })
                    .then((data) => {
                        // if no match, result = null
                        assert.notStrictEqual(data, null);
                        const metricDataRes = data.MetricDataResults;
                        assert.notDeepStrictEqual(metricDataRes, []);
                        assert.notStrictEqual(metricDataRes[0].Values.length, 0);
                    });
            });

            it('should remove configuration', () => {
                const declaration = {
                    class: 'Telemetry'
                };
                return assertPost(declaration);
            });
        });
    });
});
