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
const DECLARATION = testUtils.alterPollerInterval(miscUtils.readJsonFile(constants.DECL.BASIC));

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

            it('sleep for 60sec while Azure AI consumer is not ready', () => promiseUtils.sleep(60000));
        });

        describe('System Poller data', () => {
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
                            bigip.logger.error('Waiting for data to be indexed...', err);
                            // more sleep time for system poller data to be indexed
                            return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data', err);
                        });
                });
            });
        });
    });
}

module.exports = {
    test
};
