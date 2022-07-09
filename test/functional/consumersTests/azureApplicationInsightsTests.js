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
const logger = require('../shared/utils/logger').getChild('azureAITests');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/azureAI
 */

// read in example config
const DECLARATION = miscUtils.readJsonFile(constants.DECL.BASIC);

/**
 * Should look like:
 * [
 *    {
 *       "appID": "...",
 *       "apiKey": "...",
 *       "instrKey": "...",
 *       "region": '..." // optional
 *    },
 *    {
 *    ...
 *    }
 * ]
 */
let AI_METADATA;

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Azure App Insights', () => {
        const harness = harnessUtils.getDefaultHarness();

        const getAppInsightAPIInfo = (function () {
            const key2application = {};
            let lastID = -1;
            return function getter(key) {
                let value = key2application[key];
                if (!value) {
                    lastID += 1;
                    value = AI_METADATA[lastID];
                    if (!value) {
                        throw new Error(`Not enough items in AI_METADATA: ${AI_METADATA.length} items configured, but requests for #${lastID}`);
                    }
                    key2application[key] = value;
                }
                return value;
            };
        }());

        before(() => azureUtil.getMetadataFromProcessEnv(azureUtil.SERVICE_TYPE.AI)
            .then((metadata) => {
                assert.isArray(metadata, 'should be an array');
                assert.isNotEmpty(metadata, 'should have 1 or more elements');

                const props = [
                    'apiKey',
                    'appID',
                    'instrKey'
                ];

                metadata.forEach((item, idx) => props.forEach((propName) => {
                    assert.isDefined(item[propName], `Azure Application Insights metadata item #${idx} should have "${propName}" property`);
                }));
                logger.debug(`Azure Application Insights metadata has ${metadata.length} items - 6 BIG-IPs can be used simultaneously`);

                AI_METADATA = metadata;
            }));

        describe('Configure TS and generate data', () => {
            let referenceDeclaration;

            before(() => {
                referenceDeclaration = miscUtils.deepCopy(DECLARATION);
                referenceDeclaration.My_Consumer = {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Application_Insights',
                    instrumentationKey: null,
                    maxBatchIntervalMs: 2000
                };
            });

            testUtils.shouldConfigureTS(harness.bigip, (bigip) => {
                const declaration = miscUtils.deepCopy(referenceDeclaration);
                const apiInfo = getAppInsightAPIInfo(bigip.name);
                declaration.My_Consumer.instrumentationKey = apiInfo.instrKey;
                if (apiInfo.region) {
                    declaration.My_Consumer.region = apiInfo.region;
                }
                return declaration;
            });
        });

        describe('System Poller data', () => {
            it('sleep for 60sec while AI API is not ready', () => promiseUtils.sleep(60000));

            harness.bigip.forEach((bigip) => {
                it(`should check Azure AI for system poller data - ${bigip.name}`, () => {
                    const apiInfo = getAppInsightAPIInfo(bigip.name);
                    return azureUtil.queryAppInsights(apiInfo.appID, apiInfo.apiKey)
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
                        });
                });
            });
        });
    });
}

module.exports = {
    test
};
