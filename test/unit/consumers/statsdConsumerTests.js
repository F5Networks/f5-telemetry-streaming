/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');

chai.use(chaiAsPromised);
const assert = chai.assert;
const sinon = require('sinon');

let statsDIndex; // later used to require ../../../src/lib/consumers/Statsd/index
const util = require('../shared/util.js');

/* eslint-disable global-require */
describe('Statsd', () => {
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
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => assert.deepEqual(passedClientParams, {
                    host: 'statsd-host',
                    port: '8125'
                }));
        });

        it('should process systemInfo data', () => {
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = require('./statsdConsumerTestsData.js').systemData[0].expectedData;

            return statsDIndex(context)
                .then(() => assert.deepEqual(metrics, expectedData));
        });

        it('should NOT process event data', () => {
            const context = util.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            return statsDIndex(context)
                .then(() => assert.deepEqual(metrics, []));
        });
    });
});
