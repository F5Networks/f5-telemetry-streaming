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
const kafka = require('kafka-node');

chai.use(chaiAsPromised);
const assert = chai.assert;
const sinon = require('sinon');

const kafkaIndex = require('../../../src/lib/consumers/Kafka/index');
const util = require('../shared/util.js');

/* eslint-disable global-require */
describe('Kafka', () => {
    let sendStub;
    let passedClientOptions;

    const defaultConsumerConfig = {
        host: 'kafka-host1',
        port: '9092',
        topic: 'dataTopic'
    };
    beforeEach(() => {
        sinon.stub(kafka, 'KafkaClient').callsFake((opts) => {
            passedClientOptions = opts;
        });
        sinon.stub(kafka, 'Producer').returns({
            on: (event, cb) => {
                cb();
            },
            send: (payload, cb) => sendStub(payload, cb)
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        const expectedPayload = [{
            messages: '',
            topic: 'dataTopic'
        }];

        it('should configure Kafka Client client options with default values', (done) => {
            const context = util.buildConsumerContext({
                config: defaultConsumerConfig
            });
            const expectedOptions = {
                connectTimeout: 3000,
                kafkaHost: 'kafka-host1:9092',
                requestTimeout: 5000,
                sasl: null,
                sslOptions: null
            };

            sendStub = () => {
                try {
                    assert.deepEqual(passedClientOptions, expectedOptions);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should configure Kafka Client client options with provided values', (done) => {
            const context = util.buildConsumerContext({
                config: {
                    host: 'kafka-second-host',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'myUser',
                    passphrase: 'mySecret'
                }
            });
            const expectedOptions = {
                connectTimeout: 3000,
                kafkaHost: 'kafka-second-host:4545',
                requestTimeout: 5000,
                sasl: {
                    mechanism: 'plain',
                    password: 'mySecret',
                    username: 'myUser'
                },
                sslOptions: {
                    rejectUnauthorized: true
                }
            };

            sendStub = () => {
                try {
                    assert.deepEqual(passedClientOptions, expectedOptions);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            expectedPayload[0].messages = JSON.stringify(util.deepCopy(context.event.data));

            sendStub = (payload) => {
                try {
                    assert.deepEqual(payload, expectedPayload);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should process event data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            expectedPayload[0].messages = JSON.stringify(util.deepCopy(context.event.data));

            sendStub = (payload) => {
                try {
                    assert.deepEqual(payload, expectedPayload);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });
    });
});
