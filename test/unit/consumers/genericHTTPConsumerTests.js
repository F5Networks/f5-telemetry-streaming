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
const request = require('request');
const sinon = require('sinon');

const genericHttpIndex = require('../../../src/lib/consumers/Generic_HTTP/index');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

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
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.url, 'https://localhost:80/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });
            genericHttpIndex(context);
        });

        it('should GET using provided request options', (done) => {
            const context = testUtil.buildConsumerContext({
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
                    assert.deepStrictEqual(opts.url, 'http://myMetricsSystem:8080/ingest');
                    assert.deepStrictEqual(opts.headers, { 'x-api-key': 'superSecret' });
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });
            genericHttpIndex(context);
        });

        it('should trace data with secrets redacted', (done) => {
            let traceData;
            const context = testUtil.buildConsumerContext({
                config: {
                    method: 'POST',
                    protocol: 'http',
                    port: '8080',
                    path: '/ingest',
                    host: 'myMetricsSystem',
                    headers: [
                        {
                            name: 'Authorization',
                            value: 'Basic ABC123'
                        }
                    ]
                }
            });
            context.tracer = {
                write: (input) => {
                    traceData = JSON.parse(input);
                }
            };

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(traceData.headers, { Authorization: '*****' });
                    assert.deepStrictEqual(opts.headers, { Authorization: 'Basic ABC123' });
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });
            genericHttpIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.body, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            genericHttpIndex(context);
        });

        it('should process event data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.body, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            genericHttpIndex(context);
        });
    });
});
