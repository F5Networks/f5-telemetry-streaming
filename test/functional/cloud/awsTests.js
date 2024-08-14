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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const awsUtil = require('../shared/cloudUtils/aws');
const awsSrcUtil = require('../../../src/lib/consumers/shared/awsUtil');
const harnessUtils = require('../shared/harness');
const logger = require('../shared/utils/logger').getChild('awsCloudTests');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/cloud/awsTests
 */

logger.info('Initializing harness info');
const harnessInfo = awsUtil.getCloudHarnessJSON();
const newHarness = harnessUtils.initializeFromJSON(harnessInfo);

assert.isDefined(newHarness, 'should have harness be initialized at this point');
assert.isNotEmpty(newHarness.bigip, 'should initialize harness');
harnessUtils.setDefaultHarness(newHarness);
logger.info('Harness info initialized');

describe('AWS Cloud-based Tests', () => {
    const harness = harnessUtils.getDefaultHarness();
    const tsRPMInfo = miscUtils.getPackageDetails();
    let AWS_META = null;

    before(() => {
        assert.isDefined(harness, 'should have harness be initialized at this point');
        assert.isNotEmpty(harness.bigip, 'should initialize harness');
    });

    describe('DUT Setup', () => {
        testUtils.shouldRemovePreExistingTSDeclaration(harness.bigip);
        testUtils.shouldRemovePreExistingTSPackage(harness.bigip);
        testUtils.shouldInstallTSPackage(harness.bigip, () => tsRPMInfo);
        testUtils.shouldVerifyTSPackageInstallation(harness.bigip);
    });

    describe('IAM Roles', function () {
        this.timeout(600000);

        before(() => awsUtil.getCloudMetadataFromProcessEnv()
            .then((metadata) => {
                AWS_META = metadata;
                awsUtil.configureAWSGlobal(AWS_META);
            }));

        describe('AWS S3', () => {
            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
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
                        bucket: AWS_META.bucket,
                        region: AWS_META.region
                    }
                }));
            });

            describe('System Poller data', () => {
                let s3;

                before(() => {
                    s3 = awsUtil.getS3Client();
                });

                harness.bigip.forEach((bigip) => it(
                    `should check AWS S3 for system poller data - ${bigip.name}`,
                    () => (new Promise((resolve, reject) => {
                        s3.listObjects({ Bucket: AWS_META.bucket, MaxKeys: 5 }, (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve((data.Contents || []).sort((o1, o2) => o2.LastModified - o1.LastModified));
                            }
                        });
                    }))
                        .then((bucketContents) => new Promise((resolve, reject) => {
                            assert.isNotEmpty(bucketContents, 'should return non empty response');

                            const key = bucketContents[0].Key;
                            s3.getObject({ Bucket: AWS_META.bucket, Key: key, ResponseContentType: 'application/json' }, (err, data) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(data);
                                }
                            });
                        }))
                        .then((data) => {
                            const body = JSON.parse(data.Body.toString());
                            // depending on onboarding result, hostname may vary
                            // sufficient to check that there's an entry here
                            // (deployment creates a bucket per instance)
                            assert.isNotEmpty(body.system);
                            assert.deepStrictEqual(body.telemetryEventCategory, 'systemInfo');
                        })
                        .catch((err) => {
                            bigip.logger.error('No system poller data found. Going to wait another 20 sec.', err);
                            return promiseUtils.sleepAndReject(20000, err);
                        })
                ));
            });

            describe('Teardown TS', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry'
                }));
            });
        });

        describe('AWS CloudWatch Metrics', () => {
            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        debug: true,
                        logLevel: 'verbose'
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
                        metricNamespace: AWS_META.metricNamespace,
                        region: AWS_META.region
                    }
                }));
            });

            describe('System Poller data', () => {
                let cloudWatch;
                let metricDimensions;

                before(() => {
                    cloudWatch = awsUtil.getCloudWatchClient();
                    metricDimensions = {};
                });

                harness.bigip.forEach((bigip) => it(
                    `should fetch system poller data via debug endpoint - ${bigip.name}`,
                    () => bigip.telemetry.getSystemPollerData('My_System', 'SystemPoller_1')
                        .then((data) => {
                            metricDimensions[bigip.hostname] = awsSrcUtil.getDefaultDimensions(data);
                        })
                ));

                harness.bigip.forEach((bigip) => it(
                    `should check AWS CloudWatch Metrics for system poller data - ${bigip.name}`,
                    () => {
                        const timeStart = new Date();
                        const timeEnd = new Date();
                        timeStart.setMinutes(timeEnd.getMinutes() - 5);

                        const getOpts = {
                            MaxDatapoints: 10,
                            StartTime: timeStart.toISOString(),
                            EndTime: timeEnd.toISOString(),
                            // API requires all dimension values if present for the results to appear
                            // you can't match with just one or no dimension value
                            MetricDataQueries: [
                                {
                                    Id: 'm1',
                                    MetricStat: {
                                        Metric: {
                                            Namespace: AWS_META.metricNamespace,
                                            MetricName: 'F5_system_cpu',
                                            Dimensions: miscUtils.deepCopy(metricDimensions[bigip.hostname])
                                        },
                                        Period: 300,
                                        Stat: 'Average'
                                    }
                                }

                            ]
                        };
                        return cloudWatch.getMetricData(getOpts).promise()
                            .then((data) => {
                                // if no match, result = null
                                assert.isNotNull(data);
                                const metricDataRes = data.MetricDataResults;
                                assert.isNotEmpty(metricDataRes);
                                assert.isNotEmpty(metricDataRes[0].Values);
                            })
                            .catch((err) => {
                                bigip.logger.error('No system poller data found. Going to wait another 20 sec.', err);
                                return promiseUtils.sleepAndReject(20000, err);
                            });
                    }
                ));
            });

            describe('Teardown TS', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry'
                }));
            });
        });
    });
});
