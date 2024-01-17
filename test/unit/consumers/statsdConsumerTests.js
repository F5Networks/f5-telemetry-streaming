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

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const net = require('net');

const assert = require('../shared/assert');
const statsdExpectedData = require('./data/statsdConsumerTestsData');
const testUtil = require('../shared/util');

moduleCache.remember();

describe('Statsd', () => {
    let statsDIndex; // later used to require ../../../src/lib/consumers/Statsd/index

    let passedClientParams;
    let metrics = [];
    let defaultConsumerConfig;

    const statsDClientStub = {
        close: () => {},
        gauge: (metricName, metricValue, metricTags) => {
            const data = { metricName, metricValue };
            if (metricTags) {
                data.metricTags = metricTags;
            }
            metrics.push(data);
        }
    };

    const getExpectedData = (withTags) => {
        const dataCopy = testUtil.deepCopy(statsdExpectedData.systemData[0].expectedData);
        if (!withTags) {
            dataCopy.forEach((dataSet) => {
                delete dataSet.metricTags;
            });
        }
        return dataCopy;
    };

    before(() => {
        moduleCache.restore();
        statsDIndex = proxyquire('../../../src/lib/consumers/Statsd/index', {
            'statsd-client': sinon.stub().callsFake((options) => {
                passedClientParams = { host: options.host, port: options.port, tcp: options.tcp };
                return statsDClientStub;
            })
        });
    });

    beforeEach(() => {
        defaultConsumerConfig = {
            host: 'statsd-host',
            port: '8125'
        };
    });

    afterEach(() => {
        // clean up metrics after each test
        metrics = [];
        sinon.restore();
    });

    describe('process', () => {
        it('should configure StatsD client with default options', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => assert.deepStrictEqual(passedClientParams, {
                    host: 'statsd-host',
                    port: '8125',
                    tcp: false
                }));
        });

        it('should accept tcp as a protocol', () => {
            sinon.stub(net, 'Socket').returns(
                {
                    on: () => {},
                    connect: (port, host, cb) => { cb(); },
                    end: () => { }
                }
            );
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    host: 'statsd-host',
                    port: '8125',
                    protocol: 'tcp'
                }
            });

            return statsDIndex(context)
                .then(() => assert.deepStrictEqual(passedClientParams, {
                    host: 'statsd-host',
                    port: '8125',
                    tcp: true
                }));
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            return statsDIndex(context)
                .then(() => assert.sameDeepMembers(metrics, getExpectedData()));
        });

        it('should process systemInfo data, and convert booleans to metrics', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: Object.assign(defaultConsumerConfig, { convertBooleansToMetrics: true })
            });
            return statsDIndex(context)
                .then(() => {
                    const configSyncSucceeded = metrics.find(
                        (metric) => metric.metricName === 'f5telemetry.telemetry-bigip-com.system.configSyncSucceeded'
                    );
                    assert.deepStrictEqual(configSyncSucceeded, { metricName: 'f5telemetry.telemetry-bigip-com.system.configSyncSucceeded', metricValue: 1 });
                });
        });

        it('should process systemInfo data and apply auto-tagging (siblings only)', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: Object.assign({ addTags: { method: 'sibling' } }, defaultConsumerConfig)
            });
            return statsDIndex(context)
                .then(() => assert.sameDeepMembers(metrics, getExpectedData(true)));
        });

        it('should process systemInfo data with default hostname value if missing from systemInfo', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = {
                customStats: {
                    'clientSideTraffic.bitsIn': 111111030,
                    'clientSideTraffic.bitsOut': 22222204949
                }
            };
            const expectedData = [
                {
                    metricName: 'f5telemetry.hostname-unknown.customStats.clientSideTraffic-bitsIn',
                    metricValue: 111111030
                },
                {
                    metricName: 'f5telemetry.hostname-unknown.customStats.clientSideTraffic-bitsOut',
                    metricValue: 22222204949
                }
            ];

            return statsDIndex(context)
                .then(() => assert.deepStrictEqual(metrics, expectedData));
        });

        it('should process data and replace special characters in metric name', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = {
                system: { hostname: 'myHost' },
                'mydata.subProp/lowestProp:stats': {
                    'stat with spaces': {
                        value: 10,
                        status: 'ready'
                    },
                    'stat!with@special#characters': {
                        value: 20,
                        status: 'alsoReady'
                    }
                }
            };
            return statsDIndex(context)
                .then(() => {
                    assert.sameDeepMembers(metrics, [
                        {
                            metricName: 'f5telemetry.myHost.mydata-subProp-lowestProp-stats.stat_with_spaces.value',
                            metricValue: 10
                        },
                        {
                            metricName: 'f5telemetry.myHost.mydata-subProp-lowestProp-stats.statwithspecialcharacters.value',
                            metricValue: 20
                        }
                    ]);
                });
        });

        it('should NOT process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => assert.isEmpty(metrics));
        });

        it('should log exception if connection failure', () => {
            sinon.stub(net, 'Socket').returns(
                {
                    on: (type, cb) => { cb('Connection failure to server'); },
                    connect: () => { },
                    destroy: () => { }
                }
            );
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    host: 'statsd-host',
                    port: '8125',
                    protocol: 'tcp'
                }
            });

            return statsDIndex(context)
                .then(() => {
                    assert.strictEqual(context.logger.exception.callCount, 1);
                    assert.deepStrictEqual(
                        context.logger.exception.firstCall.args,
                        ['Unable to forward to statsd client', 'Connection failure to server']
                    );
                });
        });

        it('should trace full payload', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.ok(Array.isArray(traceData), 'should be formatted as an array');
                    const expectedTraceLine = 'f5telemetry.telemetry-bigip-com.system.cpu: 0';
                    assert.ok(traceData.find((d) => d[0] === expectedTraceLine), 'should find expected line in trace');
                });
        });

        it('should trace payload with sanitized data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: Object.assign({ addTags: { method: 'sibling' } }, defaultConsumerConfig)
            });

            return statsDIndex(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.ok(Array.isArray(traceData), 'should be formatted as an array');

                    const expectedMetricName = 'f5telemetry.telemetry-bigip-com.system.cpu';
                    const tracedTags = traceData.find((d) => d[0] === `${expectedMetricName}: 0`)[1];
                    const expectedTags = getExpectedData(true).find(
                        (d) => d.metricName === expectedMetricName
                    ).metricTags;
                    assert.deepStrictEqual(tracedTags, expectedTags);
                });
        });
    });
});
