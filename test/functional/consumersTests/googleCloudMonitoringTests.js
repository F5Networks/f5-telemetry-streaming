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

const constants = require('../shared/constants');
const gcpUtil = require('../shared/cloudUtils/gcp');
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/googleCloudMonitoring
 */

const GOOGLE_SD_CONSUMER_NAME = 'Google_SD_Consumer';

// read in example config
const DECLARATION = miscUtils.readJsonFile(constants.DECL.BASIC);
let ACCESS_TOKEN = null;
let GCP = null;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: Google Cloud Monitoring', () => {
        before(() => {
            ACCESS_TOKEN = null;
            return gcpUtil.getMetadataFromProcessEnv()
                .then((gcpData) => {
                    GCP = gcpData;
                });
        });

        it('should get access token', () => gcpUtil.getOAuthToken(
            GCP.serviceEmail,
            GCP.privateKey,
            GCP.privateKeyID
        )
            .then((accessToken) => {
                ACCESS_TOKEN = accessToken;
            }));
    });
}
/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Google Cloud Monitoring', () => {
        const harness = harnessUtils.getDefaultHarness();

        before(() => {
            assert.isNotNull(ACCESS_TOKEN, 'should acquire GCP auth token');
            assert.isNotNull(GCP, 'should fetch GCP API metadata from process.env');
        });

        describe('Configure TS and generate data', () => {
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                consumerDeclaration[GOOGLE_SD_CONSUMER_NAME] = {
                    class: 'Telemetry_Consumer',
                    type: 'Google_Cloud_Monitoring',
                    privateKey: {
                        cipherText: GCP.privateKey
                    },
                    projectId: GCP.projectID,
                    serviceEmail: GCP.serviceEmail,
                    privateKeyId: GCP.privateKeyID
                };
            });

            testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));

            it('sleep for 60sec while Google Cloud Monitoring consumer is not ready', () => promiseUtils.sleep(60000));
        });

        describe('System Poller data', () => {
            harness.bigip.forEach((bigip) => it(
                `should check Google Cloud Monitoring for system poller data - ${bigip.name}`,
                () => {
                    let timeStart = new Date();
                    let timeEnd = new Date();
                    timeStart.setMinutes(timeEnd.getMinutes() - 5);
                    timeStart = timeStart.toJSON();
                    timeEnd = timeEnd.toJSON();
                    const queryString = [
                        `interval.startTime=${timeStart}`,
                        `interval.endTime=${timeEnd}`,
                        `filter=metric.type="custom.googleapis.com/system/tmmCpu" AND resource.labels.namespace="${bigip.hostname}"`
                    ].join('&');

                    return gcpUtil.queryCloudMonitoring(ACCESS_TOKEN, GCP.projectID, queryString)
                        .then((timeSeries) => {
                            assert.isDefined(timeSeries.timeSeries[0].points[0]);
                            assert.deepStrictEqual(bigip.hostname, timeSeries.timeSeries[0].resource.labels.namespace);
                        })
                        .catch((err) => {
                            bigip.logger.error('Waiting for data to be indexed...', err);
                            // more sleep time for system poller data to be indexed
                            return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data', err);
                        });
                }
            ));
        });
    });
}

module.exports = {
    setup,
    test
};
