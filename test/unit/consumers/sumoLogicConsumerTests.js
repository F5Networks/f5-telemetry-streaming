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

const sumoLogicIndex = require('../../../src/lib/consumers/Sumo_Logic/index');
const util = require('../shared/util.js');

/* eslint-disable global-require */
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
            const context = util.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepEqual(opts.headers, { 'content-type': 'application/json' });
                    assert.strictEqual(opts.strictSSL, true);
                    assert.strictEqual(opts.url, 'https://localhost:443/receiver/v1/http/');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should configure request options with provided values', (done) => {
            const context = util.buildConsumerContext({
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
                    assert.deepEqual(opts.headers, { 'content-type': 'application/json' });
                    assert.strictEqual(opts.strictSSL, false);
                    assert.strictEqual(opts.url, 'http://localhost:80/receiver/v1/http/mySecret');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
        });

        it('should trace data with secrets redacted', (done) => {
            let traceData;
            const context = util.buildConsumerContext({
                config: {
                    host: 'localhost',
                    path: '/receiver/v1/http/',
                    passphrase: 'mySecret',
                    protocol: 'http',
                    port: 80,
                    allowSelfSignedCert: true
                }
            });
            context.tracer = {
                write: (input) => {
                    traceData = JSON.parse(input);
                }
            };

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.notStrictEqual(traceData.url.indexOf('*****'), -1);
                    assert.strictEqual(opts.url, 'http://localhost:80/receiver/v1/http/mySecret');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            sumoLogicIndex(context);
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

            sumoLogicIndex(context);
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

            sumoLogicIndex(context);
        });
    });
});
