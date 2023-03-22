/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const nock = require('nock');

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');
const testUtil = require('./shared/util');

const defaultPaths = sourceCode('src/lib/paths.json');
const defaultProperties = sourceCode('src/lib/properties.json');
const SystemStats = sourceCode('src/lib/systemStats');

const pathsStateValidator = testUtil.getSpoiledDataValidator(defaultPaths);
const propertiesStateValidator = testUtil.getSpoiledDataValidator(defaultProperties);
const testsDataPath = 'test/unit/data/propertiesJsonTests';

moduleCache.remember();

describe('properties.json', () => {
    before(() => {
        moduleCache.restore();
    });

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

    const loadedTestsData = testUtil.loadModules(testsDataPath);
    Object.keys(loadedTestsData).forEach((fileName) => {
        const testSet = loadedTestsData[fileName];
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
                        ? testConf.getCollectedData : (promise) => promise;

                    const stats = new SystemStats(options);

                    let promise = Promise.resolve();
                    for (let i = 1; i < TOTAL_ATTEMPTS + 1; i += 1) {
                        promise = promise.then(() => {
                            testUtil.mockEndpoints(testConf.endpoints || [], { responseChecker: checkResponse });
                            return getCollectedData(stats.collect(), stats);
                        })
                            .then((data) => {
                                assert.deepStrictEqual(data, testConf.expectedData, `should match expected output (attempt #${i}`);
                                assert.isEmpty(stats.loader.cachedResponse, `cache should be erased (attempt #${i}`);

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
