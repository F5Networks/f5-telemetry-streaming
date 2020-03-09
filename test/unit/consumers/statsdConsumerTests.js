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

const statsdExpectedData = require('./statsdConsumerTestsData');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Statsd', () => {
    let statsDIndex; // later used to require ../../../src/lib/consumers/Statsd/index

    let passedClientParams;
    let metrics;

    const defaultConsumerConfig = {
        host: 'statsd-host',
        port: '8125'
    };

    before(() => {
        statsDIndex = proxyquire('../../../src/lib/consumers/Statsd/index', {
            'node-statsd': sinon.stub().callsFake((host, port) => {
                passedClientParams = { host, port };
                return {
                    socket: {
                        on: () => {}
                    },
                    close: () => {},
                    gauge: (metricName, metricValue, cb) => {
                        metrics.push({
                            metricName,
                            metricValue
                        });
                        cb(null, 'success');
                    }
                };
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
                    port: '8125'
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

        it('should NOT process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => assert.deepStrictEqual(metrics, []));
        });
    });
});
