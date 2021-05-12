/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const sumoLogicIndex = require('../../../src/lib/consumers/Sumo_Logic/index');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Sumo_Logic', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        const defaultConsumerConfig = {
            host: 'localhost',
            path: '/receiver/v1/http/'
        };

        it('should configure default request options', (done) => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.headers, { 'content-type': 'application/json' });
                    assert.strictEqual(opts.strictSSL, true);
                    assert.strictEqual(opts.url, 'https://localhost:443/receiver/v1/http/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should configure request options with provided values', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'localhost',
                    path: '/receiver/v1/http/',
                    passphrase: 'mySecret',
                    protocol: 'http',
                    port: 80,
                    allowSelfSignedCert: true
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.headers, { 'content-type': 'application/json' });
                    assert.strictEqual(opts.strictSSL, false);
                    assert.strictEqual(opts.url, 'http://localhost:80/receiver/v1/http/mySecret');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should trace data with secrets redacted', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'localhost',
                    path: '/receiver/v1/http/',
                    passphrase: 'mySecret',
                    protocol: 'http',
                    port: 80,
                    allowSelfSignedCert: true
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.notStrictEqual(traceData.url.indexOf('*****'), -1);
                    assert.strictEqual(opts.url, 'http://localhost:80/receiver/v1/http/mySecret');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
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

            sumoLogicIndex(context);
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

            sumoLogicIndex(context);
        });
    });
});
