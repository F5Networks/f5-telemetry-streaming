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

const pathsStateValidator = testUtil.getSpoiledDataValidator(defaultPaths);
const propertiesStateValidator = testUtil.getSpoiledDataValidator(defaultProperties);

describe('properties.json', () => {
    const TOTAL_ATTEMPTS = 10;

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
            afterEach(() => {
                nock.cleanAll();
            });

            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, () => {
                    const contextToCollect = generateProperties(defaultProperties.context, testConf.contextToCollect)
                        || defaultProperties.context;
                    const statsToCollect = generateProperties(defaultProperties.stats, testConf.statsToCollect)
                        || defaultProperties.stats;

                    const options = {
                        defaultPaths,
                        properties: {
                            stats: statsToCollect,
                            context: contextToCollect,
                            global: defaultProperties.global,
                            definitions: defaultProperties.definitions
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

                    let promise = Promise.resolve();
                    for (let i = 1; i < TOTAL_ATTEMPTS + 1; i += 1) {
                        promise = promise.then(() => {
                            testUtil.mockEndpoints(testConf.endpoints || [], { responseChecker: checkResponse });
                            return getCollectedData(stats.collect(), stats);
                        })
                            .then((data) => {
                                assert.deepStrictEqual(data, testConf.expectedData, `should match expected output (attempt #${i}`);
                                assert.deepStrictEqual(stats.loader.cachedResponse, {}, `cache should be erased (attempt #${i}`);

                                pathsStateValidator();
                                propertiesStateValidator();
                            });
                    }
                    return promise;
                });
            });
        });
    });
});
