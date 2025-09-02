/**
 * Copyright 2025 F5, Inc.
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
const dummies = require('../shared/dummies');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const DEFAULT_HOSTNAME = sourceCode('src/lib/constants').DEFAULT_HOSTNAME;

moduleCache.remember();

describe('Kafka', () => {
    let consumerInstance;
    let coreStub;
    let declaration;

    async function loadDeclaration() {
        await coreStub.processDeclaration(declaration);
        consumerInstance = coreStub.consumers.consumers[0];
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        declaration = {
            kafka: dummies.declaration.consumer.kafka.minimal.decrypted({
                format: 'default',
                host: 'kafka-host1',
                partitionerType: 'default',
                port: 9092,
                topic: 'dataTopic'
            })
        };

        coreStub = stubs.consumers.coreStub();

        await coreStub.startServices();
        coreStub.logger.removeAllMessages();
    });

    afterEach(async () => {
        await coreStub.processDeclaration({ class: 'Telemetry' });
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('Module', () => {
        it('should patch KafkaClient.prototype.deleteDisconnected', async () => {
            sinon.stub(kafka.KafkaClient.prototype, 'connect').callsFake();
            sinon.stub(kafka.Producer.prototype, 'connect').callsFake();

            const origin = kafka.KafkaClient.prototype.deleteDisconnected;

            await loadDeclaration();

            assert.deepStrictEqual(coreStub.consumers.consumersStats, {
                consumers: 1, modules: 1
            });

            const patched = kafka.KafkaClient.prototype.deleteDisconnected;
            assert.notDeepEqual(patched, origin, 'should patch method');
            assert.isTrue(patched.patched, 'should add a boolean flag');

            const oldDeclaration = declaration;
            declaration = {};

            await loadDeclaration();

            assert.deepStrictEqual(coreStub.consumers.consumersStats, {
                consumers: 0, modules: 0
            });

            declaration = oldDeclaration;
            await loadDeclaration();

            assert.deepStrictEqual(coreStub.consumers.consumersStats, {
                consumers: 1, modules: 1
            });

            assert.deepStrictEqual(kafka.KafkaClient.prototype.deleteDisconnected, patched, 'should not patch again');
        });

        it('should emit f5error via patched method', async () => {
            sinon.stub(kafka.KafkaClient.prototype, 'connect').callsFake(function () {
                // pass invalid value
                setImmediate(() => this.deleteDisconnected(123));
            });
            sinon.stub(kafka.Producer.prototype, 'connect').callsFake();

            await loadDeclaration();
            await coreStub.logger.shouldIncludeMessage('error', /KafkaClient unexpected error:/);
        });
    });

    describe('Consumer', () => {
        let clientInstances;
        let producerInstances;

        let closeStub;
        let kafkaClientStub;
        let kafkaProducerStub;
        let passedPayloads;
        let sendStub;

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

        beforeEach(async () => {
            kafkaClientStub = sinon.stub(kafka, 'KafkaClient').callsFake(() => {
                const clientInstance = {
                    events: {},
                    on(event, cb) {
                        this.events[event] = cb;
                    },
                    emit(event, data) {
                        setImmediate(this.events[event], data);
                    }
                };
                clientInstances.push(clientInstance);
                return clientInstance;
            });

            kafkaProducerStub = sinon.stub(kafka, 'Producer').callsFake(() => {
                const producerInstance = {
                    events: {},
                    close: sinon.stub(),
                    on(event, cb) {
                        this.events[event] = cb;
                    },
                    send: sinon.stub()
                };

                producerInstance.close.callsFake((cb) => setImmediate(() => closeStub(cb)));
                producerInstance.send.callsFake((payload, cb) => setImmediate(() => sendStub(payload, cb)));

                producerInstances.push(producerInstance);
                return producerInstance;
            });

            closeStub = sinon.stub();
            closeStub.callsFake((cb) => cb && setImmediate(cb));

            sendStub = sinon.stub();
            sendStub.callsFake((payload, cb) => {
                passedPayloads.push(payload);
                setImmediate(cb);
            });

            clientInstances = [];
            producerInstances = [];
            passedPayloads = [];
        });

        describe('configuration', () => {
            it('should configure Kafka Client and Producer options with default values', async () => {
                // delete unnecessary fields that are not required
                delete declaration.kafka.format;
                delete declaration.kafka.partitionerType;
                delete declaration.kafka.port;

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 0);

                const expectedOptions = {
                    autoConnect: true,
                    connectTimeout: 3000,
                    kafkaHost: 'kafka-host1:9092',
                    requestTimeout: 5000,
                    sasl: null,
                    sslOptions: {
                        rejectUnauthorized: true
                    },
                    connectRetryOptions: defaultRetryOpts
                };

                assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstances[0], defaultProducerOpts));
            });

            it('should configure Kafka Client and Producer options with multiple hosts, partitionerType and customOpts', async () => {
                Object.assign(declaration.kafka, {
                    host: ['kafka.set.first', 'kafka.set.second'],
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcp',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'myUser',
                    passphrase: {
                        cipherText: 'mySecret'
                    },
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
                });

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 0);

                const expectedOptions = {
                    autoConnect: true,
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

                assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstances[0], { partitionerType: 2 }));
            });

            it('should configure Kafka Client and Producer options with provided values (authenticationProtocol=SASL-PLAIN)', async () => {
                Object.assign(declaration.kafka, {
                    host: 'kafka-second-host',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'myUser',
                    passphrase: {
                        cipherText: 'mySecret'
                    },
                    partitionerType: 'default'
                });

                const expectedOptions = {
                    autoConnect: true,
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

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 0);

                assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstances[0], defaultProducerOpts));
            });

            it('should configure Kafka Client and Producer with provided values (authenticationProtocol=TLS)', async () => {
                Object.assign(declaration.kafka, {
                    host: 'kafka.example.com',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'TLS',
                    allowSelfSignedCert: true,
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'certificate'
                    },
                    rootCertificate: {
                        cipherText: 'caCert'
                    },
                    partitionerType: 'default'
                });

                const expectedOptions = {
                    autoConnect: true,
                    connectTimeout: 3000,
                    kafkaHost: 'kafka.example.com:4545',
                    requestTimeout: 5000,
                    sasl: null,
                    sslOptions: {
                        rejectUnauthorized: false,
                        key: 'privateKey',
                        cert: 'certificate',
                        ca: 'caCert'
                    },
                    connectRetryOptions: defaultRetryOpts
                };

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 0);

                assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstances[0], defaultProducerOpts));
            });

            it('should configure Kafka Client and Producer with provided values (authenticationProtocol=TLS, no root certificate)', async () => {
                Object.assign(declaration.kafka, {
                    host: 'kafka.example.com',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'TLS',
                    allowSelfSignedCert: true,
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'certificate'
                    },
                    partitionerType: 'default'
                });

                const expectedOptions = {
                    autoConnect: true,
                    connectTimeout: 3000,
                    kafkaHost: 'kafka.example.com:4545',
                    requestTimeout: 5000,
                    sasl: null,
                    sslOptions: {
                        rejectUnauthorized: false,
                        key: 'privateKey',
                        cert: 'certificate',
                        ca: null
                    },
                    connectRetryOptions: defaultRetryOpts
                };

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 0);

                assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstances[0], defaultProducerOpts));
            });

            it('should create a new consumer when config changed (BIPNXTENG-12028)', async () => {
                Object.assign(declaration.kafka, {
                    host: 'kafka.example.com',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'TLS',
                    allowSelfSignedCert: true,
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'certificate'
                    },
                    partitionerType: 'default'
                });

                const expectedOptions = {
                    autoConnect: true,
                    connectTimeout: 3000,
                    kafkaHost: 'kafka.example.com:4545',
                    requestTimeout: 5000,
                    sasl: null,
                    sslOptions: {
                        rejectUnauthorized: false,
                        key: 'privateKey',
                        cert: 'certificate',
                        ca: null
                    },
                    connectRetryOptions: defaultRetryOpts
                };

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 0);

                assert.isTrue(kafkaClientStub.calledOnceWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.calledOnceWithExactly(clientInstances[0], defaultProducerOpts));

                Object.assign(declaration.kafka, {
                    privateKey: {
                        cipherText: 'privateKey2'
                    },
                    clientCertificate: {
                        cipherText: 'certificate2'
                    },
                    rootCertificate: {
                        cipherText: 'caCert'
                    }
                });

                const expectedOptions2 = {
                    autoConnect: true,
                    connectTimeout: 3000,
                    kafkaHost: 'kafka.example.com:4545',
                    requestTimeout: 5000,
                    sasl: null,
                    sslOptions: {
                        rejectUnauthorized: false,
                        key: 'privateKey2',
                        cert: 'certificate2',
                        ca: 'caCert'
                    },
                    connectRetryOptions: defaultRetryOpts
                };

                // unblock consumer
                producerInstances[0].events.ready();
                coreStub.logger.removeAllMessages();

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 1);
                await coreStub.logger.shouldIncludeMessage('debug', /Closing Kafka producer/);
                await coreStub.logger.shouldIncludeMessage('debug', /Kafka producer closed/);

                assert.isTrue(kafkaClientStub.getCall(1).calledWithExactly(expectedOptions2));
                assert.isTrue(kafkaProducerStub.getCall(1).calledWithExactly(clientInstances[1], defaultProducerOpts));

                delete declaration.kafka;

                // unblock consumer
                producerInstances[1].events.ready();

                await loadDeclaration();
                await testUtil.waitTill(() => producerInstances[1].close.calledOnce);

                assert.isTrue(producerInstances[0].close.callCount === 1, 'should close first instance only once');
                assert.isTrue(producerInstances[1].close.callCount === 1, 'should close second instance only once');
            });

            it('should not share KafkaClient across multiple consumers configure to the same host (BIPNXTENG-12028)', async () => {
                Object.assign(declaration.kafka, {
                    host: 'kafka.example.com',
                    port: '4545',
                    topic: 'dataTopic',
                    protocol: 'binaryTcpTls',
                    authenticationProtocol: 'TLS',
                    allowSelfSignedCert: true,
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'certificate'
                    },
                    partitionerType: 'default'
                });
                declaration.kafka2 = testUtil.deepCopy(declaration.kafka);

                const expectedOptions = {
                    autoConnect: true,
                    connectTimeout: 3000,
                    kafkaHost: 'kafka.example.com:4545',
                    requestTimeout: 5000,
                    sasl: null,
                    sslOptions: {
                        rejectUnauthorized: false,
                        key: 'privateKey',
                        cert: 'certificate',
                        ca: null
                    },
                    connectRetryOptions: defaultRetryOpts
                };

                await loadDeclaration();
                await testUtil.waitTill(() => clientInstances.length > 1);

                assert.isTrue(kafkaClientStub.getCall(0).calledWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.getCall(0).calledWithExactly(clientInstances[0], defaultProducerOpts));

                assert.isTrue(kafkaClientStub.getCall(1).calledWithExactly(expectedOptions));
                assert.isTrue(kafkaProducerStub.getCall(1).calledWithExactly(clientInstances[1], defaultProducerOpts));
            });
        });

        describe('lifecycle', () => {
            async function loadDeclarationAndClearLogs() {
                await loadDeclaration();
                coreStub.logger.removeAllMessages();
            }

            function logSearchClientConnected() {
                return coreStub.logger.shouldIncludeMessage('verbose', /KafkaClient successfully connected to/);
            }

            function logSearchClientReconnecting() {
                return coreStub.logger.shouldIncludeMessage('verbose', /kafka.*Reconnecting/);
            }

            function logSearchDataSent() {
                return coreStub.logger.shouldIncludeMessage('verbose', /kafka.*success$/);
            }

            function logSearchNotReadyForData() {
                return coreStub.logger.shouldIncludeMessage('verbose', /Not ready to send data/);
            }

            function logSearchProducerError() {
                return coreStub.logger.shouldIncludeMessage('error', /KafkaClient error[\s\S]*connect ECONNREFUSED/);
            }

            function logSearchPrevProducerError() {
                return coreStub.logger.shouldIncludeMessage('error', /KafkaClient error \(previously used instance of Producer\)[\s\S]*connect ECONNREFUSED/);
            }

            function logSearchPrevProducerReady() {
                return coreStub.logger.shouldIncludeMessage('verbose', /Previously used KafkaClient successfully connected - ignoring/);
            }

            function producerEmitError(producer) {
                producer.events.error(new Error('connect ECONNREFUSED'));
            }

            function producerReady(producer) {
                producer.events.ready();
            }

            function pushDataToConsumer() {
                return consumerInstance.consumer(testUtil.buildDataEventContext({ type: 'systemInfo' }));
            }

            it('should not send data till connected', async () => {
                await loadDeclarationAndClearLogs();
                await pushDataToConsumer();
                await logSearchNotReadyForData();
                assert.empty(passedPayloads, 'should not send any data');
            });

            it('should send data once connected', async () => {
                await loadDeclarationAndClearLogs();

                producerReady(producerInstances[0]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();

                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 1, 'should send one payload');
            });

            it('should try to re-connect when was unable to connect initially', async () => {
                await loadDeclarationAndClearLogs();

                producerEmitError(producerInstances[0]);
                await logSearchProducerError();
                await logSearchClientReconnecting();
                assert.deepStrictEqual(closeStub.callCount, 1, 'should call producer.close()');

                coreStub.logger.removeAllMessages();
                producerEmitError(producerInstances[0]);
                await logSearchPrevProducerError();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchNotReadyForData();

                assert.empty(passedPayloads, 'should not send any data');
                assert.lengthOf(producerInstances, 2, 'should create a new Kafka.Producer instance');

                coreStub.logger.removeAllMessages();
                producerReady(producerInstances[0]);
                await logSearchPrevProducerReady();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchNotReadyForData();
                assert.empty(passedPayloads, 'should not send any data');

                coreStub.logger.removeAllMessages();
                producerReady(producerInstances[1]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 1, 'should send one payload');
            });

            it('should try to re-connect after successfully established connection', async () => {
                await loadDeclarationAndClearLogs();

                producerReady(producerInstances[0]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 1, 'should send one payload');

                coreStub.logger.removeAllMessages();
                producerEmitError(producerInstances[0]);
                await logSearchProducerError();
                await logSearchClientReconnecting();
                assert.deepStrictEqual(closeStub.callCount, 1, 'should call producer.close()');

                coreStub.logger.removeAllMessages();
                producerEmitError(producerInstances[0]);
                await logSearchPrevProducerError();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchNotReadyForData();
                assert.lengthOf(passedPayloads, 1, 'should not send new data');
                assert.lengthOf(producerInstances, 2, 'should create a new Kafka.Producer instance');

                coreStub.logger.removeAllMessages();
                producerReady(producerInstances[0]);
                await logSearchPrevProducerReady();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchNotReadyForData();
                assert.lengthOf(passedPayloads, 1, 'should not send any data');

                coreStub.logger.removeAllMessages();
                producerReady(producerInstances[1]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 2, 'should send one payload');
            });

            it('should not send data when trying to to re-connect', async () => {
                await loadDeclarationAndClearLogs();

                producerReady(producerInstances[0]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 1, 'should send one payload');

                coreStub.logger.removeAllMessages();
                producerEmitError(producerInstances[0]);
                await logSearchProducerError();
                await logSearchClientReconnecting();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchNotReadyForData();
                assert.lengthOf(passedPayloads, 1, 'should not send any data');

                coreStub.logger.removeAllMessages();
                producerReady(producerInstances[1]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 2, 'should send one more payload');
            });

            it('should log error when unable to send data', async () => {
                await loadDeclarationAndClearLogs();

                producerReady(producerInstances[0]);
                await logSearchClientConnected();

                coreStub.logger.removeAllMessages();
                await pushDataToConsumer();
                await logSearchDataSent();
                assert.lengthOf(passedPayloads, 1, 'should send one payload');

                coreStub.logger.removeAllMessages();
                sendStub.callsFake((payload, cb) => {
                    cb(new Error('Failed to send data'));
                });

                await pushDataToConsumer();
                await coreStub.logger.shouldIncludeMessage('error', /kafka.*error: Failed to send data$/);
            });

            // Following test really tied to the code structure
            it('should not try to re-connect when instance scheduled to be destroyed during initial connection', async () => {
                await loadDeclarationAndClearLogs();
                // promise not resolved, so we can try to queue destroy request
                await loadDeclarationAndClearLogs();

                coreStub.logger.removeAllMessages();
                producerEmitError(producerInstances[0]);
                await logSearchProducerError();

                coreStub.logger.removeAllMessages();
                producerReady(producerInstances[1]);

                delete declaration.kafka;
                await loadDeclaration();
                await coreStub.logger.shouldIncludeMessage('debug', /kafka.*Kafka producer closed/);

                coreStub.logger.shouldNotIncludeMessage(/kafka.*Reconnecting/);
                coreStub.logger.shouldNotIncludeMessage(/kafka.*Kafka client is being destroyed, skipping connect/);
            });

            // Following test really tied to the code structure
            it('should not try to re-connect when instance scheduled to be destroyed after initial connection', async () => {
                await loadDeclarationAndClearLogs();
                // promise not resolved, so we can try to queue destroy request
                await loadDeclarationAndClearLogs();

                producerReady(producerInstances[0]);
                producerEmitError(producerInstances[0]);

                await logSearchClientConnected();

                producerReady(producerInstances[1]);

                delete declaration.kafka;
                await loadDeclaration();
                await coreStub.logger.shouldIncludeMessage('debug', /kafka.*Kafka producer closed/);

                coreStub.logger.shouldNotIncludeMessage(/kafka.*KafkaClient error:[\S\s]*connect ECONNREFUSED/);
                coreStub.logger.shouldNotIncludeMessage(/kafka.*Reconnecting/);
                coreStub.logger.shouldNotIncludeMessage(/kafka.*Kafka client is being destroyed, skipping connect/);
            });

            /**
             * There is non-covered code in connect() function then unlikely to be tested
             * due the way how promises are resolved
             */
        });

        describe('data', () => {
            function adjustExpectedPayloadIfNeeded(payload) {
                if (declaration.kafka.partitionerType === 'keyed') {
                    payload.forEach((p) => {
                        p.key = declaration.kafka.partitionKey;
                    });
                }
                return [payload];
            }

            function assertPayloads(actual, expected) {
                assert.deepStrictEqual(
                    removeTimestampsIfNeeded(actual),
                    removeTimestampsIfNeeded(expected)
                );
            }

            function dataSplitFormat(data) {
                data = testUtil.deepCopy(data);

                const messageList = [];

                let hostname = DEFAULT_HOSTNAME;
                if (data.system && typeof data.system === 'object') {
                    if (data.system.hostname) {
                        hostname = data.system.hostname;
                    } else {
                        data.system.hostname = DEFAULT_HOSTNAME;
                    }
                }

                Object.entries(data).forEach(([key, value]) => {
                    if (key === 'system') {
                        // TODO: should we inject hostname if missing?
                        messageList.push(wrapMessageIfNeeded(JSON.stringify({ system: value })));
                    } else {
                        Object.entries(value).forEach(([propKey, propValue]) => {
                            const message = {
                                system: { hostname },
                                [key]: {
                                    [propKey]: propValue
                                }
                            };
                            messageList.push(wrapMessageIfNeeded(JSON.stringify(message)));
                        });
                    }
                });
                return messageList;
            }

            async function loadConsumerAndWaitTillReady() {
                await loadDeclaration();

                producerInstances[0].events.ready();
                await coreStub.logger.shouldIncludeMessage('verbose', /KafkaClient successfully connected to/);
            }

            async function pushDataToConsumer(data) {
                const payloadLenBefore = passedPayloads.length;

                await consumerInstance.consumer(data);
                await coreStub.logger.shouldIncludeMessage('verbose', /kafka.*success$/);
                assert.lengthOf(passedPayloads, payloadLenBefore + 1, 'should process one more data payload');
            }

            function removeTimestampsIfNeeded(payloads) {
                if (declaration.kafka.partitionerType === 'keyed') {
                    payloads.forEach((payloadList) => {
                        payloadList.forEach((p) => {
                            p.messages.forEach((msg) => {
                                delete msg.timestamp;
                            });
                        });
                    });
                }
                return payloads;
            }

            function wrapMessageIfNeeded(msg) {
                if (declaration.kafka.partitionerType === 'keyed') {
                    return new kafka.KeyedMessage(declaration.kafka.partitionKey, msg);
                }
                return msg;
            }

            const combinations = testUtil.product(
                // format config
                [
                    'default',
                    'split'
                ],
                // partitionerType config
                [
                    'keyed',
                    'regular'
                ]
            );

            combinations.forEach(([formatConf, partitionerConf]) => {
                describe(`format = ${formatConf}, partitionerType = ${partitionerConf}`, () => {
                    const useSplit = formatConf === 'split';
                    const isKeyed = partitionerConf === 'keyed';

                    beforeEach(async () => {
                        declaration.kafka.format = formatConf;

                        if (isKeyed) {
                            declaration.kafka.partitionerType = partitionerConf;
                            declaration.kafka.partitionKey = 'part1';
                        }

                        await loadConsumerAndWaitTillReady();
                    });

                    it('should process systemInfo data', async () => {
                        const dataCtx = testUtil.buildDataEventContext({ type: 'systemInfo' });
                        const expectedPayload = adjustExpectedPayloadIfNeeded([
                            {
                                topic: 'dataTopic',
                                messages: useSplit
                                    ? dataSplitFormat(dataCtx.data)
                                    : [wrapMessageIfNeeded(JSON.stringify(dataCtx.data))]
                            }
                        ]);

                        await pushDataToConsumer(dataCtx);
                        assertPayloads(passedPayloads, expectedPayload);
                    });

                    it('should process event data', async () => {
                        const dataCtx = testUtil.buildDataEventContext({ type: 'AVR' });
                        const expectedPayload = adjustExpectedPayloadIfNeeded([
                            {
                                topic: 'dataTopic',
                                messages: [wrapMessageIfNeeded(JSON.stringify(dataCtx.data))]
                            }
                        ]);

                        await pushDataToConsumer(dataCtx);
                        assertPayloads(passedPayloads, expectedPayload);
                    });

                    it('should process raw event data', async () => {
                        const dataCtx = testUtil.buildDataEventContext({ type: 'raw' });
                        const expectedPayload = adjustExpectedPayloadIfNeeded([
                            {
                                topic: 'dataTopic',
                                messages: [wrapMessageIfNeeded(dataCtx.data)]
                            }
                        ]);

                        await pushDataToConsumer(dataCtx);
                        assertPayloads(passedPayloads, expectedPayload);
                    });

                    if (useSplit) {
                        it('should use default hostname when unable to fetch one from the data', async () => {
                            const dataCtx = testUtil.buildDataEventContext({ type: 'systemInfo' });
                            delete dataCtx.data.system.hostname;

                            const expectedPayload = adjustExpectedPayloadIfNeeded([
                                {
                                    topic: 'dataTopic',
                                    messages: dataSplitFormat(dataCtx.data)
                                }
                            ]);

                            await pushDataToConsumer(dataCtx);
                            assertPayloads(passedPayloads, expectedPayload);
                        });

                        it('should use default hostname when unable to fetch one from the data (no system)', async () => {
                            const dataCtx = testUtil.buildDataEventContext({ type: 'systemInfo' });
                            delete dataCtx.data.system;

                            const expectedPayload = adjustExpectedPayloadIfNeeded([
                                {
                                    topic: 'dataTopic',
                                    messages: dataSplitFormat(dataCtx.data)
                                }
                            ]);

                            await pushDataToConsumer(dataCtx);
                            assertPayloads(passedPayloads, expectedPayload);
                        });
                    }
                });
            });
        });
    });
});
