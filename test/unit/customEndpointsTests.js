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

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const nock = require('nock');

const assert = require('./shared/assert');
const customEndpointsTestsData = require('./data/customEndpointsTestsData');
const sourceCode = require('./shared/sourceCode');
const testUtil = require('./shared/util');

const SystemStats = sourceCode('src/lib/systemStats');

moduleCache.remember();

describe('Custom Endpoints (Telemetry_Endpoints)', () => {
    before(() => {
        moduleCache.restore();
    });

    const DEFAULT_TOTAL_ATTEMPTS = 10;

    const checkResponse = (endpointMock, response) => {
        if (!response.kind && !endpointMock.skipCheckResponse) {
            throw new Error(`Endpoint '${endpointMock.endpoint}' has no property 'kind' in response`);
        }
    };

    Object.keys(customEndpointsTestsData).forEach((testSetKey) => {
        const testSet = customEndpointsTestsData[testSetKey];

        testUtil.getCallableDescribe(testSet)(testSet.name, () => {
            afterEach(() => {
                nock.cleanAll();
            });

            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, () => {
                    const endpointsStateValidator = testUtil.getSpoiledDataValidator(testConf.endpointList);

                    const totalAttempts = testConf.totalAttempts || DEFAULT_TOTAL_ATTEMPTS;

                    const options = {
                        endpoints: testConf.endpointList
                    };
                    const getCollectedData = testConf.getCollectedData
                        ? testConf.getCollectedData : (promise) => promise;

                    const stats = new SystemStats(options);

                    let promise = Promise.resolve();
                    for (let i = 1; i < totalAttempts + 1; i += 1) {
                        promise = promise.then(() => {
                            testUtil.mockEndpoints(testConf.endpoints || [], { responseChecker: checkResponse });
                            return getCollectedData(stats.collect(), stats);
                        })
                            .then((data) => {
                                assert.deepStrictEqual(data, testConf.expectedData, `should match expected output (attempt #${i})`);
                                assert.isEmpty(stats.loader.cachedResponse, `cache should be erased (attempt #${i})`);
                                endpointsStateValidator();
                            });
                    }
                    return promise;
                });
            });
        });
    });
});
