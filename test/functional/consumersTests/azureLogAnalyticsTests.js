/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const assert = require('assert');
const fs = require('fs');
const util = require('../shared/util');
const azureUtil = require('../shared/azureUtil');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;

const DUTS = util.getHosts('BIGIP');

const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC));
const PASSPHRASE = process.env[constants.ENV_VARS.AZURE.PASSPHRASE];
const WORKSPACE_ID = process.env[constants.ENV_VARS.AZURE.WORKSPACE];
const TENANT_ID = process.env[constants.ENV_VARS.AZURE.TENANT];
const CLIENT_SECRET = process.env[constants.ENV_VARS.AZURE.LOG_KEY];
const CLIENT_ID = process.env[constants.ENV_VARS.AZURE.CLIENT_ID];
const AZURE_LA_CONSUMER_NAME = 'Azure_LA_Consumer';

let oauthToken = null;

function setup() {
    describe('Consumer Setup: Azure Log Analytics - OAuth token', () => {
        it('should get OAuth token', () => azureUtil.getOAuthToken(CLIENT_ID, CLIENT_SECRET, TENANT_ID)
            .then((data) => {
                oauthToken = data.access_token;
                return assert.notStrictEqual(oauthToken, undefined);
            })
            .catch((err) => {
                util.logger.error(`Unable to get OAuth token: ${err}`);
                return Promise.reject(err);
            }));
    });
}

function test() {
    const testDataTimestamp = Date.now();

    describe('Consumer Test: Azure Log Analytics - Configure TS and generate data', () => {
        const consumerDeclaration = util.deepCopy(DECLARATION);
        consumerDeclaration[AZURE_LA_CONSUMER_NAME] = {
            class: 'Telemetry_Consumer',
            type: 'Azure_Log_Analytics',
            workspaceId: WORKSPACE_ID,
            passphrase: {
                cipherText: PASSPHRASE
            }
        };
        DUTS.forEach((dut) => it(
            `should configure TS - ${dut.hostalias}`,
            () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(consumerDeclaration))
        ));

        it('should send event to TS Event Listener', () => {
            const msg = `timestamp="${testDataTimestamp}",test="${testDataTimestamp}",testType="${AZURE_LA_CONSUMER_NAME}"`;
            return dutUtils.sendDataToEventListeners((dut) => `hostname="${dut.hostname}",${msg}`);
        });
    });

    describe('Consumer Test: Azure Log Analytics - Test', () => {
        DUTS.forEach((dut) => {
            it(`should check for system poller data from:${dut.hostalias}`, () => {
                // system poller is on an interval, so space out the retries
                // NOTE: need to determine mechanism to shorten the minimum interval
                // for a system poller cycle to reduce the test time here
                const queryString = [
                    'F5Telemetry_system_CL',
                    `where hostname_s == "${dut.hostname}"`,
                    'where TimeGenerated > ago(5m)'
                ].join(' | ');
                return new Promise((resolve) => setTimeout(resolve, 30000))
                    .then(() => azureUtil.queryLogs(oauthToken, WORKSPACE_ID, queryString))
                    .then((results) => {
                        util.logger.info('Response from Log Analytics:', { hostname: dut.hostname, results });
                        assert(results.tables[0], 'Log Analytics query returned no results');
                        assert(results.tables[0].rows, 'Log Analytics query returned no rows');
                        assert(results.tables[0].rows[0], 'Log Analytics query returned no rows');
                    });
            });

            it(`should check for event listener data from:${dut.hostalias}`, () => {
                const queryString = [
                    'F5Telemetry_LTM_CL',
                    `where hostname_s == "${dut.hostname}"`,
                    `where test_s == "${testDataTimestamp}"`
                ].join(' | ');
                return new Promise((resolve) => setTimeout(resolve, 10000))
                    .then(() => azureUtil.queryLogs(oauthToken, WORKSPACE_ID, queryString))
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
