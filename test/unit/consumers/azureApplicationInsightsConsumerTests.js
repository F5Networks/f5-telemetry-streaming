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
const appInsights = require('applicationinsights');
// eslint-disable-next-line import/no-dynamic-require
const appInsightsLogging = require(require.resolve('applicationinsights/out/Library/Logging'));

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const azureAppInsightsIndex = sourceCode('src/lib/consumers/Azure_Application_Insights/index');
const azureUtil = sourceCode('src/lib/consumers/shared/azureUtil');
const requestsUtil = sourceCode('src/lib/utils/requests');

moduleCache.remember();

describe('Azure_Application_Insights', () => {
    let aiSpy;
    let requests;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        requests = [];
        aiSpy = sinon.spy(appInsights);

        sinon.stub(aiSpy.TelemetryClient.prototype, 'trackMetric').callsFake((metric) => {
            requests.push(metric);
        });
        sinon.stub(appInsightsLogging, 'warn');
        // stub metadata calls
        sinon.stub(requestsUtil, 'makeRequest').resolves({});
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        it('should skip event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: {
                    instrumentationKey: 'skip-instr-key-guid'
                }
            });
            context.event.data = {
                category: {
                    someRate: 1.1
                }
            };

            return azureAppInsightsIndex(context)
                .then(() => {
                    assert(aiSpy.setup.withArgs('skip-instr-key-guid').notCalled, 'The app insights client must skip non system poller data');
                    assert.isEmpty(requests);
                });
        });
        it('should NOT track when no metrics available (only numeric values are valid)', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    instrumentationKey: 'should-not-be-called-guid',
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250
                }
            });
            context.event.data = {
                str: 'ladida-di-da-badoop-bidap',
                bool: true
            };

            return azureAppInsightsIndex(context)
                .then(() => {
                    assert(
                        aiSpy.setup.withArgs('should-not-be-called-guid').notCalled,
                        'The app insights client should not be setup when skipping metrics'
                    );
                    assert.strictEqual(aiSpy.TelemetryClient.getCalls().find((c) => c.args[0] === 'should-not-be-called-guid'), undefined);
                    assert.isEmpty(requests);
                });
        });

        it('should track metrics with default request options', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    instrumentationKey: 'the-instr-key-guid',
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250
                }
            });
            context.event.data = {
                num: 1234,
                parent: {
                    child1: 435.0,
                    child2: '230.334',
                    child3: 'ignore',
                    child4: {
                        grandchild1: 99,
                        grandchild2: {
                            greatgrandchild1: '100'
                        }
                    }
                },
                bool: true
            };

            return azureAppInsightsIndex(context)
                .then(() => {
                    const actualClientConfig = aiSpy.TelemetryClient.getCalls()
                        .find((c) => c.args[0] === 'the-instr-key-guid').returnValue.config;

                    assert.strictEqual(actualClientConfig.maxBatchSize, 250);
                    assert.strictEqual(actualClientConfig.maxBatchIntervalMs, 5000);
                    assert.deepStrictEqual(requests, [
                        { name: 'F5_num', value: 1234 },
                        { name: 'F5_parent_child1', value: 435.0 },
                        { name: 'F5_parent_child2', value: 230.334 },
                        { name: 'F5_parent_child4_grandchild1', value: 99 },
                        { name: 'F5_parent_child4_grandchild2_greatgrandchild1', value: 100 }
                    ]);

                    assert(
                        aiSpy.setup.withArgs('f5-telemetry-default').calledOnce,
                        'The app insights default client must be setup once with instrumentation key'
                    );
                });
        });

        it('should track metrics with customOpts', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    instrumentationKey: 'customized-instr-key-guid',
                    maxBatchSize: 222,
                    maxBatchIntervalMs: 3333,
                    region: 'usgovvirginia',
                    customOpts: [
                        { name: 'maxBatchSize', value: 13 },
                        { name: 'proxyHttpsUrl', value: 'testhost123/proxy' },
                        { name: 'endpointUrl', value: '/mycustom.endpoint/v2' }
                    ]
                }
            });
            context.event.data = {
                category: {
                    someRate: 1.1,
                    anotherOne: 20,
                    yetAnother: '13.11111',
                    ignoreMe: false
                }
            };

            return azureAppInsightsIndex(context)
                .then(() => {
                    const actualClientConfig = aiSpy.TelemetryClient.getCalls()
                        .find((c) => c.args[0] === 'InstrumentationKey=customized-instr-key-guid;EndpointSuffix=applicationinsights.us').returnValue.config;
                    // note that maxBatchSize prop overrides value provided in customOpts
                    assert.strictEqual(actualClientConfig.maxBatchSize, 222);
                    assert.strictEqual(actualClientConfig.maxBatchIntervalMs, 3333);
                    assert.strictEqual(actualClientConfig.proxyHttpsUrl, 'testhost123/proxy');
                    assert.strictEqual(actualClientConfig.endpointUrl, '/mycustom.endpoint/v2');
                    assert.deepStrictEqual(requests, [
                        { name: 'F5_category_someRate', value: 1.1 },
                        { name: 'F5_category_anotherOne', value: 20 },
                        { name: 'F5_category_yetAnother', value: 13.11111 }
                    ]);
                });
        });

        it('should get instrumentation keys and setup clients when useManagedIdentity is enabled', () => {
            sinon.stub(azureUtil, 'getInstrumentationKeys').callsFake(() => Promise.resolve([
                { name: 'app1', instrKey: 'app1-moooooo-mi-guid' },
                { name: 'app2', instrKey: 'app2-baaaaaa-mi-guid', connString: 'InstrumentationKey=optional-conn-props;EndpointSuffix=also-optional' }
            ]));
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    useManagedIdentity: true,
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250
                }
            });
            context.event.data = {
                num: 1234,
                str: 'ignore me',
                strNum: '24.1'
            };
            return azureAppInsightsIndex(context)
                .then(() => {
                    const setupCalls = aiSpy.TelemetryClient.getCalls();
                    assert.notStrictEqual(setupCalls.find((c) => c.args[0] === 'app1-moooooo-mi-guid'), undefined);
                    assert.notStrictEqual(setupCalls.find((c) => c.args[0] === 'InstrumentationKey=optional-conn-props;EndpointSuffix=also-optional'), undefined);

                    const expectedMetric1 = { name: 'F5_num', value: 1234 };
                    const expectedMetric2 = { name: 'F5_strNum', value: 24.1 };
                    assert.deepStrictEqual(
                        requests,
                        [
                            expectedMetric1,
                            expectedMetric2,
                            expectedMetric1,
                            expectedMetric2
                        ]
                    );
                });
        });

        it('should configure internal logging behavior from controls log level', () => {
            const logRequests = [];
            // Build context with default logLevel=debug
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    instrumentationKey: 'logging-debug-true-guid'
                },
                loggerOpts: { logLevel: 'verbose' }
            });
            context.event.data = { num: 9.0 };
            // First call - simulate logLevel: debug
            sinon.stub(appInsights.Configuration, 'setInternalLogging').callsFake((debug, warn) => {
                logRequests.push({ debug, warn });
            });

            return azureAppInsightsIndex(context)
                .then(() => {
                    // Second call - simulate logLevel: info
                    context.logger.setLogLevel('info');

                    // configured already
                    assert(
                        aiSpy.setup.withArgs('f5-telemetry-default').notCalled,
                        'The app insights default client must be setup once with instrumentation key'
                    );

                    return azureAppInsightsIndex(context);
                })
                .then(() => {
                    assert.deepStrictEqual(
                        logRequests,
                        [
                            { debug: true, warn: true },
                            { debug: false, warn: false }
                        ]
                    );

                    assert(
                        aiSpy.setup.withArgs('f5-telemetry-default').notCalled,
                        'The app insights default client must be setup once with instrumentation key'
                    );
                });
        });
    });
});
