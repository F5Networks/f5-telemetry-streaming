/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
                            bigip.logger.error('No system poller data found. Going to wait another 20sec', err);
                            return promiseUtils.sleepAndReject(20000, err);
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
