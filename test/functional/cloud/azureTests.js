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
const harnessUtils = require('../shared/harness');
const logger = require('../shared/utils/logger').getChild('azureCloudTests');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/cloud/azureTests
 */

logger.info('Initializing harness info');
const harnessInfo = azureUtil.getCloudHarnessJSON();
const newHarness = harnessUtils.initializeFromJSON(harnessInfo);

assert.isDefined(newHarness, 'should have harness be initialized at this point');
assert.isNotEmpty(newHarness.bigip, 'should initialize harness');
harnessUtils.setDefaultHarness(newHarness);
logger.info('Harness info initialized');

describe('Azure Cloud-based Tests', () => {
    const harness = harnessUtils.getDefaultHarness();
    const tsRPMInfo = miscUtils.getPackageDetails();

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

    describe('Managed Identities', () => {
        describe('Azure Log Analytics', function () {
            let AZURE_LA;

            this.timeout(180000);

            before(() => azureUtil.getCloudMetadataFromProcessEnv(azureUtil.SERVICE_TYPE.LA)
                .then((metadata) => {
                    AZURE_LA = metadata;
                }));

            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry',
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 60
                        }
                    },
                    My_MI_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Azure_Log_Analytics',
                        workspaceId: AZURE_LA.workspace,
                        useManagedIdentity: true
                    }
                }));
            });

            describe('System Poller data', () => {
                let ACCESS_TOKEN;

                before(() => azureUtil.getOAuthToken(
                    AZURE_LA.clientID,
                    AZURE_LA.logKey,
                    AZURE_LA.tenant,
                    AZURE_LA.cloudType
                )
                    .then((_accessToken) => {
                        ACCESS_TOKEN = _accessToken;
                    }));

                harness.bigip.forEach((bigip) => it(
                    `should check Azure LA for system poller data - ${bigip.name}`,
                    () => {
                        const resourceIdMatch = bigip.hostname.substring(0, bigip.hostname.indexOf('.'));
                        const queryString = [
                            'F5Telemetry_system_CL',
                            `where hostname_s == "${bigip.hostname}" and _ResourceId contains "${resourceIdMatch}"`,
                            'where TimeGenerated > ago(5m)'
                        ].join(' | ');
                        return azureUtil.queryLogs(
                            ACCESS_TOKEN, AZURE_LA.workspace, queryString, AZURE_LA.cloudType
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

            describe('Teardown TS', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry'
                }));
            });
        });

        describe('Azure Application Insights', function () {
            let AZURE_AI;

            this.timeout(180000);

            before(() => azureUtil.getCloudMetadataFromProcessEnv(azureUtil.SERVICE_TYPE.AI)
                .then((metadata) => {
                    AZURE_AI = metadata;
                }));

            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry',
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 60
                        }
                    },
                    My_MI_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Azure_Application_Insights',
                        useManagedIdentity: true
                    }
                }));
            });

            describe('System Poller data', () => {
                it('sleep for 60sec while AI API is not ready', () => promiseUtils.sleep(60000));

                harness.bigip.forEach((bigip) => {
                    it(`should check Azure AI for system poller data - ${bigip.name}`, () => azureUtil.queryAppInsights(AZURE_AI.appID, AZURE_AI.apiKey, AZURE_AI.cloudType)
                        .then((response) => {
                            // Sample response
                            // {
                            //     "value": {
                            //         "start": "2020-03-23T21:44:59.198Z",
                            //         "end": "2020-03-23T21:47:59.198Z",
                            //         "customMetrics/F5_system_tmmMemory": {
                            //             "avg": 15
                            //         }
                            //     }
                            // }
                            const val = response.value['customMetrics/F5_system_tmmMemory'];
                            assert.isDefined(val, 'should have expected property in response');
                            assert.isDefined(val.avg, 'should have expected "avg" property in response');
                            assert.isAbove(val.avg, 0, 'should be greater than 0');
                        })
                        .catch((err) => {
                            bigip.logger.error('No system poller data found. Going to wait another 20sec', err);
                            return promiseUtils.sleepAndReject(20000, err);
                        }));
                });
            });

            describe('Teardown TS', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy({
                    class: 'Telemetry'
                }));
            });
        });
    });
});
