/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;
const sharedUtil = require('../shared/util');
const util = require('../../../src/lib/util');

const DUTS = sharedUtil.getHosts('BIGIP');

const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));
const PROJECT_ID = process.env[constants.ENV_VARS.GCP_PROJECT_ID];
const PRIVATE_KEY_ID = process.env[constants.ENV_VARS.GCP_PRIVATE_KEY_ID];
const PRIVATE_KEY = process.env[constants.ENV_VARS.GCP_PRIVATE_KEY].replace(/REPLACE/g, '\n');
const SERVICE_EMAIL = process.env[constants.ENV_VARS.GCP_SERVICE_EMAIL];
const GOOGLE_SD_CONSUMER_NAME = 'Google_SD_Consumer';

let accessToken;

function setup() {
    describe('Consumer Setup: Google Cloud Monitoring - access token', () => {
        it('should get access token', () => {
            const newJwt = jwt.sign(
                {
                    iss: SERVICE_EMAIL,
                    scope: 'https://www.googleapis.com/auth/monitoring',
                    aud: 'https://oauth2.googleapis.com/token',
                    exp: Math.floor(Date.now() / 1000) + 3600,
                    iat: Math.floor(Date.now() / 1000)
                },
                PRIVATE_KEY,
                {
                    algorithm: 'RS256',
                    header: {
                        kid: PRIVATE_KEY_ID,
                        typ: 'JWT',
                        alg: 'RS256'
                    }
                }
            );
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                form: {
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: newJwt
                },
                fullURI: 'https://oauth2.googleapis.com/token'
            };
            return util.makeRequest(options)
                .then((result) => {
                    accessToken = result.access_token;
                })
                .catch((err) => {
                    sharedUtil.logger.error(`Unable to get access token: ${err}`);
                    return Promise.reject(err);
                });
        });
    });
}

function test() {
    describe('Consumer Test: Google Cloud Monitoring - Configure TS', () => {
        const consumerDeclaration = util.deepCopy(DECLARATION);
        consumerDeclaration[GOOGLE_SD_CONSUMER_NAME] = {
            class: 'Telemetry_Consumer',
            type: 'Google_Cloud_Monitoring',
            privateKey: {
                cipherText: PRIVATE_KEY
            },
            projectId: PROJECT_ID,
            serviceEmail: SERVICE_EMAIL,
            privateKeyId: PRIVATE_KEY_ID
        };
        DUTS.forEach(dut => it(
            `should configure TS - ${dut.hostname}`,
            () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(consumerDeclaration))
        ));
    });

    describe('Consumer Test: Google Cloud Monitoring - Test', () => {
        const queryGoogle = (queryString) => {
            const options = {
                fullURI: `https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries?${queryString}`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            };
            return util.makeRequest(options);
        };

        DUTS.forEach((dut) => {
            it(`should check for system poller data from - ${dut.hostname}`, () => {
                let timeStart = new Date();
                let timeEnd = new Date();
                timeStart.setMinutes(timeEnd.getMinutes() - 5);
                timeStart = timeStart.toJSON();
                timeEnd = timeEnd.toJSON();
                const queryString = [
                    `interval.startTime=${timeStart}`,
                    `interval.endTime=${timeEnd}`,
                    `filter=metric.type="custom.googleapis.com/system/tmmCpu" AND resource.labels.namespace="${dut.hostname}"`
                ].join('&');
                return new Promise(resolve => setTimeout(resolve, 30000))
                    .then(() => queryGoogle(queryString))
                    .then((timeSeries) => {
                        sharedUtil.logger.info('Response from Google Cloud Monitoring:', { hostname: dut.hostname, timeSeries });
                        assert.notEqual(timeSeries.timeSeries[0].points[0], undefined);
                        assert.equal(dut.hostname, timeSeries.timeSeries[0].resource.labels.namespace);
                    });
            });
        });
    });
}

function teardown() {}

module.exports = {
    setup,
    test,
    teardown
};
