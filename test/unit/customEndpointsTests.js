/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const testUtil = require('./shared/util');
const SystemStats = require('../../src/lib/systemStats');
const customEndptsTestsData = require('./customEndpointsTestsData');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Custom Endpoints (Telemetry_Endpoints)', () => {
    const TOTAL_ATTEMPTS = 10;

    const checkResponse = (endpointMock, response) => {
        if (!response.kind) {
            throw new Error(`Endpoint '${endpointMock.endpoint}' has no property 'kind' in response`);
        }
    };

    Object.keys(customEndptsTestsData).forEach((testSetKey) => {
        const testSet = customEndptsTestsData[testSetKey];

        testUtil.getCallableDescribe(testSet)(testSet.name, () => {
            afterEach(() => {
                nock.cleanAll();
            });

            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, () => {
                    const endpointsStateValidator = testUtil.getSpoiledDataValidator(testConf.endpointList);

                    const options = {
                        endpoints: testConf.endpointList
                    };
                    const getCollectedData = testConf.getCollectedData
                        ? testConf.getCollectedData : promise => promise;

                    const stats = new SystemStats(options);

                    let promise = Promise.resolve();
                    for (let i = 1; i < TOTAL_ATTEMPTS + 1; i += 1) {
                        promise = promise.then(() => {
                            testUtil.mockEndpoints(testConf.endpoints || [], { responseChecker: checkResponse });
                            return getCollectedData(stats.collect(), stats);
                        })
                            .then((data) => {
                                assert.deepStrictEqual(data, testConf.expectedData, `should match expected output (attempt #${i}`);
                                assert.deepStrictEqual(stats.loader.cachedResponse, {}, `cache should be erased (attempt #${i}`);
                                endpointsStateValidator();
                            });
                    }
                    return promise;
                });
            });
        });
    });
});
