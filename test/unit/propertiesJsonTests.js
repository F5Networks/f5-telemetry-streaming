/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const defaultPaths = require('../../src/lib/paths.json');
const defaultProperties = require('../../src/lib/properties.json');
const propertiesTestsData = require('./propertiesJsonTestsData');
const SystemStats = require('../../src/lib/systemStats');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('properties.json', () => {
    // global vars - to avoid problems with 'before(Each)'
    let paths = testUtil.deepCopy(defaultPaths);
    let allProperties = testUtil.deepCopy(defaultProperties);

    const checkResponse = (endpointMock, response) => {
        if (!response.kind) {
            throw new Error(`Endpoint '${endpointMock.endpoint}' has no property 'kind' in response`);
        }
    };

    const copyProperties = (properties, keys) => {
        const ret = {};
        keys.forEach((key) => {
            if (typeof properties[key] === 'undefined') {
                throw new Error(`copyProperties: unknown key "${key}"`);
            }
            ret[key] = properties[key];
        });
        return ret;
    };

    const generateProperties = (source, data) => {
        let ret;
        if (Array.isArray(data)) {
            ret = copyProperties(source, data);
        } else if (typeof data === 'function') {
            ret = data(source);
        }
        return ret;
    };

    Object.keys(propertiesTestsData).forEach((testSetKey) => {
        const testSet = propertiesTestsData[testSetKey];

        testUtil.getCallableDescribe(testSet)(testSet.name, () => {
            beforeEach(() => {
                // copy before each test to avoid modifications
                paths = testUtil.deepCopy(defaultPaths);
                allProperties = testUtil.deepCopy(defaultProperties);
            });

            afterEach(() => {
                nock.cleanAll();
            });

            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, () => {
                    const contextToCollect = generateProperties(allProperties.context, testConf.contextToCollect)
                        || allProperties.context;
                    const statsToCollect = generateProperties(allProperties.stats, testConf.statsToCollect)
                        || allProperties.stats;

                    const options = {
                        paths,
                        properties: {
                            stats: statsToCollect,
                            context: contextToCollect,
                            global: allProperties.global,
                            definitions: allProperties.definitions
                        },
                        dataOpts: {
                            tags: {
                                tenant: '`T`',
                                application: '`A`'
                            }
                        }
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
                            // if after second attempt output will be the same
                            // then properties, paths and etc. works correctly
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
