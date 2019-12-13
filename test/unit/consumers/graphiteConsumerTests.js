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
const request = require('request');

chai.use(chaiAsPromised);
const assert = chai.assert;
const sinon = require('sinon');

const graphiteIndex = require('../../../src/lib/consumers/Graphite/index');
const util = require('../shared/util.js');

/* eslint-disable global-require */
describe('Graphite', () => {
    const defaultConsumerConfig = {
        port: 80,
        host: 'localhost'
    };

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        it('should POST using default request options', (done) => {
            const context = util.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.url, 'http://localhost:80/events/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });
            graphiteIndex(context);
        });

        it('should POST using provided request options', (done) => {
            const context = util.buildConsumerContext({
                config: {
                    protocol: 'https',
                    port: '8080',
                    path: '/ingest/',
                    host: 'myMetricsSystem'
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.url, 'https://myMetricsSystem:8080/ingest/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });
            graphiteIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = JSON.stringify({
                what: 'f5telemetry',
                tags: ['systemInfo'],
                data: util.deepCopy(context.event.data)
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.body, expectedData);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            graphiteIndex(context);
        });

        it('should process event data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            const expectedData = JSON.stringify({
                what: 'f5telemetry',
                tags: ['AVR'],
                data: util.deepCopy(context.event.data)
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.body, expectedData);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            graphiteIndex(context);
        });
    });
});
