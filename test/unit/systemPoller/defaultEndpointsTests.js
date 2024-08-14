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
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const BigIpApiMock = require('../shared/bigipAPIMock');
const contextTestsData = require('./data/contextTestsData');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const Collector = sourceCode('src/lib/systemPoller/collector');
const defaultPaths = sourceCode('src/lib/paths.json');
const defaultProperties = sourceCode('src/lib/properties.json');
const Loader = sourceCode('src/lib/systemPoller/loader');
const properties = sourceCode('src/lib/systemPoller/properties');

const pathsStateValidator = testUtil.getSpoiledDataValidator(defaultPaths);
const propertiesStateValidator = testUtil.getSpoiledDataValidator(defaultProperties);
const testsDataPath = 'test/unit/systemPoller/data/defaultProperties';

moduleCache.remember();

describe('System Poller / Colletor / Default Endpoints', () => {
    const defaultUser = 'admin';
    const localhost = 'localhost';
    let coreStub;
    let logger;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true });
        logger = coreStub.logger.logger;
    });

    afterEach(() => {
        testUtil.nockCleanup();
        sinon.restore();
    });

    const TOTAL_ATTEMPTS = 3;

    const checkResponse = (endpointMock, response) => {
        if (typeof response === 'string') {
            response = JSON.parse(response);
        }
        if (!response.kind) {
            throw new Error(`Endpoint '${endpointMock.endpoint}' has no property 'kind' in response`);
        }
    };

    const mockEndpoints = (endpoints) => {
        const bigip = new BigIpApiMock(localhost);
        bigip.addPasswordlessUser(defaultUser);

        endpoints.forEach((endpoint) => {
            bigip.mockArbitraryEndpoint({
                authCheck: true,
                method: endpoint.method,
                path: endpoint.endpoint,
                replyTimes: Number.isSafeInteger(endpoint.replyTimes) ? endpoint.replyTimes : Infinity,
                reqBody: endpoint.request,
                response: (uri, body) => {
                    let responseData = endpoint.response;
                    if (typeof responseData === 'function') {
                        responseData = responseData(uri, body);
                    }

                    if (endpoint.skipCheckResponse !== true) {
                        checkResponse(endpoint, responseData);
                    }
                    return [endpoint.code || 200, testUtil.deepCopy(responseData)];
                }
            });
        });
    };

    describe(contextTestsData.name, () => {
        contextTestsData.tests.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, async () => {
                const contextProprs = properties.context();
                const loader = new Loader(localhost, {
                    logger: logger.getChild('loader'),
                    workers: 5
                });
                const totalAttempts = testConf.totalAttempts || TOTAL_ATTEMPTS;
                const contextPropsStateValidator = testUtil.getSpoiledDataValidator(contextProprs);

                for (let i = 1; i < totalAttempts + 1; i += 1) {
                    testUtil.nockCleanup();
                    mockEndpoints(testConf.endpoints);
                    loader.eraseCache();

                    const contextCollector = new Collector(loader, contextProprs.properties, {
                        logger: logger.getChild('contextCollector'),
                        workers: 5
                    });
                    loader.setEndpoints(contextProprs.endpoints);
                    const results = await contextCollector.collect();

                    assert.deepStrictEqual(results.stats, testConf.expectedData, `should match expected output (attempt #${i}`);

                    contextPropsStateValidator();
                    pathsStateValidator();
                    propertiesStateValidator();
                }
            });
        });
    });

    const loadedTestsData = testUtil.loadModules(testsDataPath);
    Object.keys(loadedTestsData).forEach((fileName) => {
        const testSet = loadedTestsData[fileName];
        testUtil.getCallableDescribe(testSet)(testSet.name, () => {
            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, async () => {
                    const contextConf = contextTestsData.tests.find((ctxConf) => ctxConf.defaultContextData);
                    assert.isDefined(contextConf, 'should be able to find default context test config');

                    let contextEndpoints = {};
                    contextConf.endpoints.forEach((endpointConf) => {
                        contextEndpoints[endpointConf.endpoint] = endpointConf;
                    });

                    testConf.endpoints
                        .filter((endpointConf) => endpointConf.useForContext)
                        .forEach((endpointConf) => {
                            contextEndpoints[endpointConf.endpoint] = endpointConf;
                        });

                    contextEndpoints = Object.values(contextEndpoints);

                    const loader = new Loader(localhost, {
                        logger: logger.getChild('loader'),
                        workers: 5
                    });
                    const totalAttempts = testConf.totalAttempts || TOTAL_ATTEMPTS;

                    const contextProprs = properties.context();

                    loader.setEndpoints(contextProprs.endpoints);
                    mockEndpoints(contextEndpoints);

                    const contextCollector = new Collector(loader, contextProprs.properties, {
                        logger: logger.getChild('contextCollector'),
                        workers: 5
                    });
                    const contextData = (await contextCollector.collect()).stats;

                    const locations = {};
                    if (testConf.statsToCollect) {
                        const statsToCollect = typeof testConf.statsToCollect === 'function'
                            ? testConf.statsToCollect(defaultProperties.stats)
                            : testConf.statsToCollect;

                        if (Array.isArray(statsToCollect)) {
                            statsToCollect.forEach((s) => {
                                locations[s] = true;
                            });
                        } else if (typeof statsToCollect === 'object') {
                            Object.assign(locations, statsToCollect);
                        }
                    }

                    const dataActions = [];
                    if (Object.keys(locations).length > 0) {
                        dataActions.push({
                            includeData: {},
                            enable: true,
                            locations
                        });
                    }

                    const statsProps = properties.default({
                        contextData,
                        dataActions,
                        includeTMStats: true,
                        tags: {
                            tenant: '`T`',
                            application: '`A`'
                        }
                    });

                    const statsPropsStateValidator = testUtil.getSpoiledDataValidator(statsProps);

                    for (let i = 1; i < totalAttempts + 1; i += 1) {
                        testUtil.nockCleanup();
                        loader.eraseCache();

                        mockEndpoints(testConf.endpoints);

                        const statsCollector = new Collector(loader, statsProps.properties, {
                            logger: logger.getChild('statsCollector'),
                            workers: 5
                        });
                        loader.setEndpoints(statsProps.endpoints);
                        const statsData = (await statsCollector.collect()).stats;

                        assert.deepStrictEqual(statsData, testConf.expectedData, `should match expected output (attempt #${i}`);

                        pathsStateValidator();
                        propertiesStateValidator();
                        statsPropsStateValidator();
                    }

                    assert.notIncludeMatch(
                        coreStub.logger.messages.all,
                        /"error":\s*"(?:(?!null))/,
                        'should not have HTTP error messages'
                    );
                });
            });
        });
    });
});
