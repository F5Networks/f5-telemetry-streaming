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

const genericHttpIndex = require('../../../src/lib/consumers/Generic_HTTP/index');
const util = require('../shared/util.js');

/* eslint-disable global-require */
describe('Generic_HTTP', () => {
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
                    assert.deepEqual(opts.url, 'https://localhost:80/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });
            genericHttpIndex(context);
        });

        it('should GET using provided request options', (done) => {
            const context = util.buildConsumerContext({
                config: {
                    method: 'GET',
                    protocol: 'http',
                    port: '8080',
                    path: '/ingest',
                    host: 'myMetricsSystem',
                    headers: [
                        {
                            name: 'x-api-key',
                            value: 'superSecret'
                        }
                    ]
                }
            });

            sinon.stub(request, 'get').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.url, 'http://myMetricsSystem:8080/ingest');
                    assert.deepEqual(opts.headers, { 'x-api-key': 'superSecret' });
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });
            genericHttpIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = util.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.body, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            genericHttpIndex(context);
        });

        it('should process event data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = util.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.body, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            genericHttpIndex(context);
        });
    });
});
