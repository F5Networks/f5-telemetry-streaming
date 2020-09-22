/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const net = require('net');

const statsdExpectedData = require('./statsdConsumerTestsData');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Statsd', () => {
    let statsDIndex; // later used to require ../../../src/lib/consumers/Statsd/index

    let passedClientParams;
    let metrics = [];

    const defaultConsumerConfig = {
        host: 'statsd-host',
        port: '8125'
    };

    const statsDClientStub = {
        close: () => {},
        gauge: (metricName, metricValue) => {
            metrics.push({
                metricName,
                metricValue
            });
        }
    };

    before(() => {
        statsDIndex = proxyquire('../../../src/lib/consumers/Statsd/index', {
            'statsd-client': sinon.stub().callsFake((options) => {
                passedClientParams = { host: options.host, port: options.port, tcp: options.tcp };
                return statsDClientStub;
            })
        });
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
            const expectedData = statsdExpectedData.systemData[0].expectedData;

            return statsDIndex(context)
                .then(() => assert.deepStrictEqual(metrics, expectedData));
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

        it('should NOT process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => assert.deepStrictEqual(metrics, []));
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
                    assert.deepEqual(context.logger.exception.firstCall.args,
                        ['Unable to forward to statsd client', 'Connection failure to server']);
                });
        });
    });
});
