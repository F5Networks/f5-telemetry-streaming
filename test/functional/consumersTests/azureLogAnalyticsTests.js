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

const azureUtil = require('../shared/cloudUtils/azure');
const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/azureLA
 */

// read in example config
const DECLARATION = miscUtils.readJsonFile(constants.DECL.BASIC);
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;
const AZURE_LA_CONSUMER_NAME = 'Azure_LA_Consumer';

let ACCESS_TOKEN = null;
let AZURE = null;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: Azure Log Analytics', () => {
        before(() => {
            ACCESS_TOKEN = null;
            return azureUtil.getMetadataFromProcessEnv(azureUtil.SERVICE_TYPE.LA)
                .then((azureData) => {
                    AZURE = azureData;
                });
        });

        it('should get OAuth token', () => azureUtil.getOAuthToken(AZURE.clientID, AZURE.logKey, AZURE.tenant)
            .then((authToken) => {
                assert.isDefined(authToken, 'should acquire auth token');
                ACCESS_TOKEN = authToken;
            }));
    });
}

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Azure Log Analytics', () => {
        const harness = harnessUtils.getDefaultHarness();
        const testDataTimestamp = Date.now();

        before(() => {
            assert.isNotNull(ACCESS_TOKEN, 'should acquire Azure LA token');
            assert.isNotNull(AZURE, 'should acquire Azure LA API metadata from process.env');
        });

        describe('Configure TS and generate data', () => {
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                consumerDeclaration[AZURE_LA_CONSUMER_NAME] = {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics',
                    workspaceId: AZURE.workspace,
                    passphrase: {
                        cipherText: AZURE.passphrase
                    }
                };
            });

            testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
            testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => `hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${AZURE_LA_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"`);
        });

        describe('Event Listener data', () => {
            harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
                .forEach((proto) => it(
                    `should check Azure LA for event listener data (over ${proto}) for - ${bigip.name}`,
                    () => {
                        const queryString = [
                            'F5Telemetry_LTM_CL',
                            `where hostname_s == "${bigip.hostname}"`,
                            `where testDataTimestamp_s == "${testDataTimestamp}"`,
                            `where testType_s == "${AZURE_LA_CONSUMER_NAME}"`,
                            `where protocol_s == "${proto}"`
                        ].join(' | ');
                        return azureUtil.queryLogs(
                            ACCESS_TOKEN, AZURE.workspace, queryString
                        )
                            .then((results) => {
                                assert(results.tables[0], 'Log Analytics query returned no results');
                                assert(results.tables[0].rows, 'Log Analytics query returned no rows');
                                assert(results.tables[0].rows[0], 'Log Analytics query returned no rows');
                            })
                            .catch((err) => {
                                bigip.logger.error('No event listener data found. Going to wait another 20sec', err);
                                return promiseUtils.sleepAndReject(20000, err);
                            });
                    }
                )));
        });

        describe('System Poller data', () => {
            harness.bigip.forEach((bigip) => it(
                `should check Azure LA system poller data - ${bigip.name}`,
                () => {
                    const queryString = [
                        'F5Telemetry_system_CL',
                        `where hostname_s == "${bigip.hostname}"`,
                        'where TimeGenerated > ago(5m)'
                    ].join(' | ');
                    return azureUtil.queryLogs(
                        ACCESS_TOKEN, AZURE.workspace, queryString
                    )
                        .then((results) => {
                            assert(results.tables[0], 'Log Analytics query returned no results');
                            assert(results.tables[0].rows, 'Log Analytics query returned no rows');
                            assert(results.tables[0].rows[0], 'Log Analytics query returned no rows');
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
