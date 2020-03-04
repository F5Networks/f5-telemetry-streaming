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
                    const options = {
                        endpointList: testConf.endpointList
                    };
                    const getCollectedData = testConf.getCollectedData
                        ? testConf.getCollectedData : promise => promise;

                    const stats = new SystemStats(options);

                    return Promise.resolve()
                        .then(() => {
                            testUtil.mockEndpoints(testConf.endpoints || [], { responseChecker: checkResponse });
                            return assert.becomes(
                                getCollectedData(stats.collect(), stats),
                                testConf.expectedData,
                                'should match expected output on first attempt to collect data'
                            );
                        })
                        .then(() => {
                            assert.deepStrictEqual(stats.loader.cachedResponse, {}, 'cache should be erased');
                        })
                        .then(() => {
                            testUtil.mockEndpoints(testConf.endpoints || [], { responseChecker: checkResponse });
                            return assert.becomes(
                                getCollectedData(stats.collect(), stats),
                                testConf.expectedData,
                                'should match expected output on second attempt to collect data'
                            );
                        })
                        .then(() => {
                            assert.deepStrictEqual(stats.loader.cachedResponse, {}, 'cache should be erased');
                        });
                });
            });
        });
    });
});
