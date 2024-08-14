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
    let kafkaClientStub;
    let kafkaProducerStub;
    let passedClientOptions;
    let clientInstance;

    // tests using this will have cached instance of Kafka client
    const defaultConsumerConfig = {
        host: 'kafka-host1',
        port: '9092',
        topic: 'dataTopic',
        format: 'default',
        partitionerType: 'default'
    };

    const defaultProducerOpts = {
        partitionerType: 0
    };

    const defaultRetryOpts = {
        retries: 5,
        factor: 2,
        minTimeout: 1 * 1000,
        maxTimeout: 60 * 1000,
        randomize: true
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        kafkaClientStub = sinon.stub(kafka, 'KafkaClient').callsFake((opts) => {
            passedClientOptions = opts;
            const events = {};
            clientInstance = {
                on: (event, cb) => {
                    events[event] = cb;
                },
                emit: (event, data) => {
                    events[event](data);
                }
            };
            return clientInstance;
        });
        kafkaProducerStub = sinon.stub(kafka, 'Producer').callsFake(() => ({
            on: (event, cb) => {
                // No errors, this is a happy place
                if (event === 'error') {
                    return;
                }
                cb();
            },
            send: (payload, cb) => sendStub(payload, cb)
        }));
    });

    afterEach(() => {
        clientInstance = null;
        sendStub = null;
        sinon.restore();
    });

    describe('process', () => {
        it('should configure Kafka Client and Producer options with default values', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            const expectedOptions = {
                connectTimeout: 3000,
                kafkaHost: 'kafka-host1:9092',
                requestTimeout: 5000,
                sasl: null,
                sslOptions: null,
                connectRetryOptions: defaultRetryOpts
            };

            return kafkaIndex(context)
                .then(() => {
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                    assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstance, defaultProducerOpts));
                });
        });

        it('should configure Kafka Client and Producer options with multiple hosts, partitionerType and customOpts', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: ['kafka.set.first', 'kafka.set.second'],
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcp',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'myUser',
                    passphrase: 'mySecret',
                    customOpts: [
                        {
                            name: 'connectRetryOptions.retries',
                            value: 8
                        },
                        {
                            name: 'connectTimeout',
                            value: 6000
                        },
                        {
                            name: 'maxAsyncRequests',
                            value: 30
                        }
                    ],
                    partitionerType: 'cyclic'
                }
            });
            const expectedOptions = {
                connectTimeout: 6000,
                kafkaHost: 'kafka.set.first:4545,kafka.set.second:4545',
                requestTimeout: 5000,
                sasl: {
                    mechanism: 'plain',
                    password: 'mySecret',
                    username: 'myUser'
                },
                sslOptions: null,
                connectRetryOptions: {
                    retries: 8,
                    factor: 2,
                    minTimeout: 1 * 1000,
                    maxTimeout: 60 * 1000,
                    randomize: true
                },
                maxAsyncRequests: 30
            };

            return kafkaIndex(context)
                .then(() => {
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                    assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstance, { partitionerType: 2 }));
                });
        });

        it('should configure Kafka Client and Producer options with provided values (authenticationProtocol=SASL-PLAIN)', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'kafka-second-host',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'myUser',
                    passphrase: 'mySecret',
                    partitionerType: 'default'
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
                },
                connectRetryOptions: defaultRetryOpts
            };

            return kafkaIndex(context)
                .then(() => {
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                    assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstance, defaultProducerOpts));
                });
        });

        it('should configure Kafka Client and Producer with provided values (authenticationProtocol=TLS)', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'kafka.example.com',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'TLS',
                    privateKey: 'privateKey',
                    clientCertificate: 'certificate',
                    rootCertificate: 'caCert',
                    partitionerType: 'default'
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
                },
                connectRetryOptions: defaultRetryOpts
            };

            return kafkaIndex(context)
                .then(() => {
                    assert.deepStrictEqual(passedClientOptions, expectedOptions);
                    assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                    assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstance, defaultProducerOpts));
                });
        });

        it('should process systemInfo data (format = "default")', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedPayload = [
                {
                    topic: 'dataTopic',
                    messages: [JSON.stringify(context.event.data)]
                }
            ];
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

        it('should process systemInfo data (format = "split")', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = {
                system: context.event.data.system,
                virtualServers: context.event.data.virtualServers
            };
            context.config.format = 'split';
            const origData = testUtil.deepCopy(context.event.data);
            const expectedPayload = [
                {
                    topic: 'dataTopic',
                    messages: [
                        JSON.stringify({
                            system: origData.system
                        }),
                        JSON.stringify({
                            system: { hostname: origData.system.hostname },
                            virtualServers: {
                                '/Common/app.app/app_vs': origData.virtualServers['/Common/app.app/app_vs']
                            }
                        }),
                        JSON.stringify({
                            system: { hostname: origData.system.hostname },
                            virtualServers: {
                                '/Example_Tenant/A1/serviceMain': origData.virtualServers['/Example_Tenant/A1/serviceMain']
                            }
                        }),
                        JSON.stringify({
                            system: { hostname: origData.system.hostname },
                            virtualServers: {
                                '/Example_Tenant/A1/serviceMain-Redirect': origData.virtualServers['/Example_Tenant/A1/serviceMain-Redirect']
                            }
                        })
                    ]
                }
            ];
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
            const expectedPayload = [
                {
                    messages: [JSON.stringify(testUtil.deepCopy(context.event.data))],
                    topic: 'dataTopic'
                }
            ];

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

        it('should process event data as KeyedMessage (partitionerType = "keyed")', (done) => {
            const config = {
                host: 'kafka-host1',
                port: '9092',
                topic: 'dataTopic',
                format: 'split', // note that this will not apply to event data
                partitionerType: 'keyed',
                partitionKey: 'part1'
            };
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config
            });
            const keyedMessage = new kafka.KeyedMessage('part1', JSON.stringify(testUtil.deepCopy(context.event.data)));
            delete keyedMessage.timestamp;
            const expectedPayload = [
                {
                    messages: [keyedMessage],
                    topic: 'dataTopic',
                    key: 'part1'
                }
            ];

            sendStub = (payload) => {
                try {
                    assert.exists(payload[0].messages[0].timestamp);
                    delete payload[0].messages[0].timestamp;
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

        it('should cache Kafka Client between calls', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'RAW_EVENT',
                config: { host: 'kafka.host.cache', port: 9093, topic: 'cacheTopic' }
            });

            const actualPayloads = [];
            sendStub = (payload) => {
                actualPayloads.push(payload);
            };

            context.event.data = 'just.some.sample.data.0';
            return kafkaIndex(context)
                .then(() => {
                    context.event.data = 'just.some.sample.data.1';
                    return kafkaIndex(context);
                })
                .then(() => {
                    context.event.data = 'just.some.sample.data.2';
                    return kafkaIndex(context);
                })
                .then(() => {
                    assert.isTrue(kafkaClientStub.calledOnce);
                    assert.isTrue(kafkaProducerStub.calledOnce);
                    assert.includeDeepMembers(actualPayloads, [
                        [{
                            topic: 'cacheTopic',
                            messages: ['just.some.sample.data.0']
                        }],
                        [{
                            topic: 'cacheTopic',
                            messages: ['just.some.sample.data.1']
                        }],
                        [{
                            topic: 'cacheTopic',
                            messages: ['just.some.sample.data.2']
                        }]
                    ]);
                });
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
                config: { host: 'kafka.host.error', port: 9099, topic: 'something' }
            });

            return kafkaIndex(context)
                .then(() => assert.isFalse(sendStub.called, 'should not call producer.send()'));
        });
    });
});
