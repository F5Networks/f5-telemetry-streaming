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
const customEndpointsTestsData = require('./data/customEndpointsTestsData');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const Collector = sourceCode('src/lib/systemPoller/collector');
const Loader = sourceCode('src/lib/systemPoller/loader');
const properties = sourceCode('src/lib/systemPoller/properties');

moduleCache.remember();

describe('System Poller / Colletor / Custom Endpoints', () => {
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

    const DEFAULT_TOTAL_ATTEMPTS = 3;

    const checkResponse = (endpointMock, response) => {
        if (!response.kind && !endpointMock.skipCheckResponse) {
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
                replyTimes: Infinity,
                reqBody: endpoint.request,
                response: () => {
                    if (endpoint.skipCheckResponse !== true) {
                        checkResponse(endpoint, endpoint.response);
                    }
                    return [endpoint.code || 200, testUtil.deepCopy(endpoint.response)];
                }
            });
        });
    };

    Object.keys(customEndpointsTestsData).forEach((testSetKey) => {
        const testSet = customEndpointsTestsData[testSetKey];

        testUtil.getCallableDescribe(testSet)(testSet.name, () => {
            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, async () => {
                    const endpointsStateValidator = testUtil.getSpoiledDataValidator(testConf.endpointList);
                    const totalAttempts = testConf.totalAttempts || DEFAULT_TOTAL_ATTEMPTS;

                    const customProps = properties.custom(testConf.endpointList, []);
                    const customPropsStateValidator = testUtil.getSpoiledDataValidator(customProps);

                    const loader = new Loader(localhost, {
                        logger: logger.getChild('loader'),
                        workers: 5
                    });
                    loader.setEndpoints(customProps.endpoints);

                    const collector = new Collector(loader, customProps.properties, {
                        isCustom: true,
                        logger: logger.getChild('collector'),
                        workers: 5
                    });

                    for (let i = 1; i < totalAttempts + 1; i += 1) {
                        testUtil.nockCleanup();
                        mockEndpoints(testConf.endpoints);
                        loader.eraseCache();

                        const results = await collector.collect();
                        assert.deepStrictEqual(results.stats, testConf.expectedData, `should match expected output (attempt #${i})`);

                        endpointsStateValidator();
                        customPropsStateValidator();
                    }
                });
            });
        });
    });
});
