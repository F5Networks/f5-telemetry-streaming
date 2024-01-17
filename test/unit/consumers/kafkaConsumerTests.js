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

const kafka = require('kafka-node');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const kafkaIndex = sourceCode('src/lib/consumers/Kafka/index');

moduleCache.remember();

describe('Kafka', () => {
    let sendStub;
    let kafkaProducerStub;
    let passedClientOptions;

    let portCount = 9090;
    const defaultConsumerConfig = {
        host: 'kafka-host1',
        port: '9092',
        topic: 'dataTopic'
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        defaultConsumerConfig.port = portCount.toString();
        sinon.stub(kafka, 'KafkaClient').callsFake((opts) => {
            passedClientOptions = opts;
            const events = {};
            return {
                on: (event, cb) => {
                    events[event] = cb;
                },
                emit: (event, data) => {
                    events[event](data);
                }
            };
        });
        kafkaProducerStub = sinon.stub(kafka, 'Producer').returns({
            on: (event, cb) => {
                // No errors, this is a happy place
                if (event === 'error') {
                    return;
                }

                cb();
            },
            send: (payload, cb) => sendStub(payload, cb)
        });
    });

    afterEach(() => {
        portCount += 1;
        sinon.restore();
    });

    describe('process', () => {
        const expectedPayload = [{
            messages: '',
            topic: 'dataTopic'
        }];

        it('should configure Kafka Client client options with default values', (done) => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            const expectedOptions = {
                connectTimeout: 3000,
                kafkaHost: `kafka-host1:${portCount}`,
                requestTimeout: 5000,
                sasl: null,
                sslOptions: null
            };

            sendStub = () => {
                try {
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should configure Kafka Client client options with provided values (authenticationProtocol=SASL-PLAIN)', (done) => {
            const context = testUtil.buildConsumerContext({
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
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should configure Kafka Client client options with provided values (authenticationProtocol=TLS)', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'kafka.example.com',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'TLS',
                    privateKey: 'privateKey',
                    clientCertificate: 'certificate',
                    rootCertificate: 'caCert'
                }
            });
            const expectedOptions = {
                connectTimeout: 3000,
                kafkaHost: 'kafka.example.com:4545',
                requestTimeout: 5000,
                sasl: null,
                sslOptions: {
                    rejectUnauthorized: true,
                    key: 'privateKey',
                    cert: 'certificate',
                    ca: 'caCert'
                }
            };

            sendStub = () => {
                try {
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            expectedPayload[0].messages = JSON.stringify(testUtil.deepCopy(context.event.data));

            sendStub = (payload) => {
                try {
                    assert.deepStrictEqual(payload, expectedPayload);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should process event data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            expectedPayload[0].messages = JSON.stringify(testUtil.deepCopy(context.event.data));

            sendStub = (payload) => {
                try {
                    assert.deepStrictEqual(payload, expectedPayload);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
        });

        it('should cache clients between calls', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            let repeatCall = false;
            let sendCount = 0;
            sendStub = () => {
                sendCount += 1;
                if (!repeatCall) {
                    repeatCall = true;
                    return;
                }

                try {
                    assert.strictEqual(kafka.KafkaClient.callCount, 1, 'should only create 1 Kafka Client');
                    assert.strictEqual(sendCount, 2, 'should send data 2 times');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
            kafkaIndex(context);
        });

        it('should not attempt to create multiple Kafka Clients during client initialization', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            kafkaProducerStub.returns({
                on: (event, cb) => {
                    // This is not a happy place
                    if (event === 'error') {
                        return;
                    }
                    setTimeout(cb, 100);
                },
                send: (payload, cb) => sendStub(payload, cb)
            });

            let sendCount = 0;
            sendStub = () => {
                sendCount += 1;
                if (sendCount < 3) {
                    return;
                }

                try {
                    assert.strictEqual(kafka.KafkaClient.callCount, 1, 'should only create 1 Kafka Client');
                    assert.strictEqual(sendCount, 3, 'should send data 2 times');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            };

            kafkaIndex(context);
            kafkaIndex(context);
            kafkaIndex(context);
        });

        it('should not reject on error connecting to Kafka', () => {
            kafkaProducerStub.returns({
                on: (event, cb) => {
                    // This is not a happy place
                    if (event === 'error') {
                        cb(new Error('connect ECONNREFUSED'));
                    }
                }
            });
            sendStub = sinon.stub();

            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            return kafkaIndex(context)
                .then(() => assert.isFalse(sendStub.called, 'should not call producer.send()'));
        });
    });
});
