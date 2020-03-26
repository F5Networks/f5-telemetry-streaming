/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const assert = require('assert');
const sinon = require('sinon');
const appInsights = require('applicationinsights');

const azureAppInsightsIndex = require('../../../src/lib/consumers/Azure_Application_Insights/index');
const testUtil = require('../shared/util');

describe('Azure_Application_Insights', () => {
    let requests;
    const aiSpy = sinon.spy(appInsights);

    beforeEach(() => {
        requests = [];
        sinon.stub(aiSpy.TelemetryClient.prototype, 'trackMetric').callsFake((metric) => {
            requests.push(metric);
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
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

            azureAppInsightsIndex(context);

            assert(
                aiSpy.setup.withArgs('should-not-be-called-guid').notCalled,
                'The app insights client should not be setup when skipping metrics'
            );

            assert.strictEqual(aiSpy.TelemetryClient.thisValues[0], undefined);
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

            azureAppInsightsIndex(context);

            assert(
                aiSpy.setup.withArgs('the-instr-key-guid').calledOnce,
                'The app insights client must be setup once with instrumentation key'
            );

            const actualClientConfig = aiSpy.TelemetryClient.thisValues[0].trackMetric.thisValues[0].config;

            assert.strictEqual(actualClientConfig.maxBatchSize, 250);
            assert.strictEqual(actualClientConfig.maxBatchIntervalMs, 5000);

            return assert.deepStrictEqual(requests, [
                { name: 'F5_num', value: 1234 },
                { name: 'F5_parent_child1', value: 435.0 },
                { name: 'F5_parent_child2', value: 230.334 },
                { name: 'F5_parent_child4_grandchild1', value: 99 },
                { name: 'F5_parent_child4_grandchild2_greatgrandchild1', value: 100 }
            ]);
        });

        it('should track metrics with customOpts', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    instrumentationKey: 'customized-instr-key-guid',
                    maxBatchSize: 222,
                    maxBatchIntervalMs: 3333,
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

            azureAppInsightsIndex(context);

            assert(
                aiSpy.setup.withArgs('customized-instr-key-guid').calledOnce,
                'The app insights client must be setup once with instrumentation key'
            );

            const actualClientConfig = aiSpy.TelemetryClient.thisValues[0].trackMetric.thisValues[0].config;
            // note that maxBatchSize prop overrides value provided in customOpts
            assert.strictEqual(actualClientConfig.maxBatchSize, 222);
            assert.strictEqual(actualClientConfig.maxBatchIntervalMs, 3333);
            assert.strictEqual(actualClientConfig.proxyHttpsUrl, 'testhost123/proxy');
            assert.strictEqual(actualClientConfig.endpointUrl, '/mycustom.endpoint/v2');

            return assert.deepStrictEqual(requests, [
                { name: 'F5_category_someRate', value: 1.1 },
                { name: 'F5_category_anotherOne', value: 20 },
                { name: 'F5_category_yetAnother', value: 13.11111 }
            ]);
        });

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

            azureAppInsightsIndex(context);

            assert(aiSpy.setup.withArgs('skip-instr-key-guid').notCalled, 'The app insights client must skip non system poller data');
            return assert.deepStrictEqual(requests, []);
        });
    });
});
