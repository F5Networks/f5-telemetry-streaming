/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const assert = require('assert');
const fs = require('fs');
const util = require('../shared/util.js');
const constants = require('../shared/constants.js');
const dutUtils = require('../dutTests.js').utils;

const DUTS = util.getHosts('BIGIP');

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));
const PASSPHRASE = process.env[constants.ENV_VARS.AZURE_PASSPHRASE];
const WORKSPACE_ID = process.env[constants.ENV_VARS.AZURE_WORKSPACE];
const TENANT_ID = process.env[constants.ENV_VARS.AZURE_TENANT];
const CLIENT_SECRET = process.env[constants.ENV_VARS.AZURE_LOG_KEY];

let oauthToken = null;


function setup() {
    describe('Consumer Setup: Azure Log Analytics - OAuth token', () => {
        it('should get OAuth token', () => {
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: [
                    'grant_type=client_credentials',
                    'client_id=bc3d6996-2535-4203-851d-7a9a6e3b9165',
                    'redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient',
                    `client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
                    'resource=https://api.loganalytics.io/'
                ].join('&')
            };
            return util.makeRequest(
                'login.microsoftonline.com',
                `/${TENANT_ID}/oauth2/token`,
                options
            )
                .then((data) => {
                    oauthToken = data.access_token;
                })
                .catch((err) => {
                    util.logger.error(`Unable to get OAuth token: ${err}`);
                    return Promise.reject(err);
                });
        });
    });
}

function test() {
    const testType = 'Azure_Consumer_Test';
    const dataTimestamp = (new Date()).getTime();

    describe('Consumer Test: Azure Log Analytics - Configure TS and generate data', () => {
        it('should configure TS', () => {
            const consumerDeclaration = util.deepCopy(DECLARATION);
            consumerDeclaration.My_Consumer = {
                class: 'Telemetry_Consumer',
                type: 'Azure_Log_Analytics',
                workspaceId: WORKSPACE_ID,
                passphrase: {
                    cipherText: PASSPHRASE
                }
            };
            return dutUtils.postDeclarationToDUTs(() => consumerDeclaration);
        });

        it('should send event to TS Event Listener', () => {
            const msg = `timestamp="${dataTimestamp}",test="true",testType="${testType}"`;
            return dutUtils.sendDataToDUTsEventListener(hostObj => `hostname="${hostObj.hostname}",${msg}`);
        });
    });

    describe('Consumer Test: Azure Log Analytics - Test', () => {
        // helper function to query Azure for data
        const queryAzure = (queryString) => {
            const options = {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${oauthToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: queryString })

            };
            return util.makeRequest(
                'api.loganalytics.io',
                `/v1/workspaces/${WORKSPACE_ID}/query`,
                options
            );
        };

        DUTS.forEach((dut) => {
            it(`should check for system poller data from - ${dut.hostname}`, () => {
                // system poller is on an interval, so space out the retries
                // NOTE: need to determine mechanism to shorten the minimum interval
                // for a system poller cycle to reduce the test time here
                const queryString = [
                    'F5Telemetry_system_CL',
                    `where hostname_s == "${dut.hostname}"`,
                    'where TimeGenerated > ago(5m)'
                ].join(' | ');
                return new Promise(resolve => setTimeout(resolve, 30000))
                    .then(() => queryAzure(queryString))
                    .then((results) => {
                        util.logger.info('Response from Log Analytics:', { hostname: dut.hostname, results });
                        assert(results.tables[0], 'Log Analytics query returned no results');
                        assert(results.tables[0].rows, 'Log Analytics query returned no rows');
                        assert(results.tables[0].rows[0], 'Log Analytics query returned no rows');
                    });
            });

            it(`should check for event listener data from - ${dut.hostname}`, () => {
                const queryString = [
                    'F5Telemetry_LTM_CL',
                    `where hostname_s == "${dut.hostname}"`,
                    `where timestamp_s == "${dataTimestamp}"`
                ].join(' | ');
                return new Promise(resolve => setTimeout(resolve, 10000))
                    .then(() => queryAzure(queryString))
                    .then((results) => {
                        util.logger.info('Response from Log Analytics:', { hostname: dut.hostname, results });
                        assert(results.tables[0], 'Log Analytics query returned no results');
                        assert(results.tables[0].rows, 'Log Analytics query returned no rows');
                        assert(results.tables[0].rows[0], 'Log Analytics query returned no rows');
                    });
            });
        });
    });
}

function teardown() {
}

module.exports = {
    setup,
    test,
    teardown
};
