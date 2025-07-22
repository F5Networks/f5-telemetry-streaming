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
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');
const logger = require('../shared/utils/logger').getChild('kafkaTests');

// <customLogger>
// uncomment section below to enable a much more verbose logging from the kafka-node lib

// const kafkaLogging = require('kafka-node/logging');

// function customLoggerProvider() {
//     const customLogger = logger.getChild('kafkaNodeClient');
//     return {
//         debug: customLogger.debug.bind(console),
//         info: customLogger.info.bind(console),
//         warn: customLogger.warning.bind(console),
//         error: customLogger.error.bind(console)
//     };
// }

// kafkaLogging.setLoggerProvider(customLoggerProvider);
// </customLogger>

const kafka = require('kafka-node');

/**
 * @module test/functional/consumersTests/kafka
 */

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const KAFKA_AUTH_PROTOCOL = 'None';
const KAFKA_CONSUMER_NAME = 'Consumer_Kafka';
const KAFKA_PORT = 9092;
const KAFKA_PROTOCOL = 'binaryTcp';
const KAFKA_TOPIC = 'f5-telemetry';
const KAFKA_FORMAT = 'split';
const KAFKA_PARTITIONER_TYPE = 'cyclic';
const KAFKA_TIMEOUT = 2000;
const DOCKER_CONTAINERS = {
    Kafka: {
        detach: true,
        env: {
            // KRaft settings
            KAFKA_CFG_NODE_ID: 0,
            KAFKA_BROKER_ID: 0,
            KAFKA_CFG_PROCESS_ROLES: 'controller,broker',
            KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: `0@127.0.0.1:2${KAFKA_PORT}`,
            KAFKA_CFG_LISTENERS: `PLAINTEXT_HOST://:${KAFKA_PORT},CONTROLLER://:2${KAFKA_PORT}`,
            KAFKA_CFG_ADVERTISED_LISTENERS: `PLAINTEXT_HOST://kafka-server:${KAFKA_PORT}`,
            KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT',
            KAFKA_CFG_CONTROLLER_LISTENER_NAMES: 'CONTROLLER',
            KAFKA_CFG_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT_HOST',
            KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: true
        },
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}bitnami/kafka:3.3`,
        name: 'kafka-server',
        publish: {
            [KAFKA_PORT]: KAFKA_PORT
        },
        restart: 'always'
    }
};

// read in example config
const DECLARATION = testUtils.alterPollerInterval(miscUtils.readJsonFile(constants.DECL.BASIC));
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

/**
 * Kafka Client for tests
 */
class KafkaClient {
    /**
     * Constructor
     *
     * @param {string} host - Kafka host
     * @param {integer} port - port
     * @param {string} topic - topic to listen for
     */
    constructor(host, port, topic) {
        this.client = new kafka.KafkaClient({
            autoConnect: false,
            connectTimeout: KAFKA_TIMEOUT,
            kafkaHost: `${host}:${port}`,
            requestTimeout: KAFKA_TIMEOUT
        });
        this.logger = logger.getChild('kafkaClient');
        this.messageMap = new Map();
        this.partition = 0;
        this.topic = topic;

        this.client.on('error', (clientErr) => {
            this.logger.error('Kafka-Client error caught', clientErr);
        });
    }

    /**
     * Close connection to Kafka
     *
     * @returns {Promise} resolved once closed
     */
    close() {
        return new Promise((resolve) => {
            this.logger.info('Closing Kafka-Client...');
            this.client.close(() => {
                this.logger.info('Kafka-Client closed!');
                resolve();
            });
        });
    }

    /**
     * Connect to Kafka
     *
     * @returns {Promise} resolved once connected
     */
    connect() {
        return new Promise((resolve, reject) => {
            const onError = (clientErr) => {
                // eslint-disable-next-line no-use-before-define
                this.client.removeListener('ready', onReady);
                reject(clientErr);
            };
            const onReady = () => {
                this.logger.info('Kafka-Client is ready!');
                this.client.removeListener('error', onError);
                resolve();
            };
            this.client.once('error', onError);
            this.client.once('ready', onReady);

            this.logger.info('Connection to Kafka server');
            this.client.connect();
        })
            .then(() => new Promise((resolve, reject) => {
                this.logger.info('Receiving latest offset for topic', { topic: this.topic });
                const offset = new kafka.Offset(this.client);
                // eslint-disable-next-line consistent-return
                offset.fetchLatestOffsets([this.topic], (offsetErr, offsets) => {
                    if (offsetErr) {
                        reject(offsetErr);
                    } else {
                        this.latestOffset = (offsets[this.topic] && offsets[this.topic][this.partition]) || 0;
                        this.logger.info('Kafka-Offset returned latest offset', { latestOffset: this.latestOffset });
                        resolve();
                    }
                });
            }))
            .then(() => new Promise((resolve, reject) => {
                this.logger.info('Creating topic', { topic: this.topic });
                this.client.createTopics([this.topic], (topicErr) => {
                    if (topicErr) {
                        reject(topicErr);
                    } else {
                        resolve();
                    }
                });
            }))
            .then(() => new Promise((resolve, reject) => {
                this.logger.info('Creating new consumer...');
                this.consumer = new kafka.Consumer(
                    this.client,
                    [{
                        partition: this.partition,
                        topic: this.topic
                    }],
                    {
                        autoCommit: false,
                        fetchMaxBytes: 1024 * 1024 * 1024 // should be enough to fetch all messages
                    }
                );
                this.consumer.on('error', (consumerErr) => {
                    this.logger.error('Kafka-Consumer caught error', consumerErr);
                });
                const onError = (consumerErr) => {
                    reject(consumerErr);
                };
                this.consumer.once('error', onError);
                this.consumer.addTopics([this.topic], (topicErr) => {
                    this.consumer.removeListener('error', onError);
                    if (topicErr) {
                        onError(topicErr);
                    } else {
                        this.logger.info('New consumer created!');
                        this.consumer.on('message', (message) => {
                            if (message.offset >= this.latestOffset && !this.messageMap.has(message.offset)) {
                                this.logger.info('Kafka message received:', message);
                                try {
                                    this.messageMap.set(message.offset, JSON.parse(message.value));
                                } catch (_) {
                                    // do nothing
                                }
                            }
                        });
                        resolve();
                    }
                });
            }));
    }

    /**
     * Received messages
     *
     * @param {function} [filter] - filter
     *
     * @returns {Promise<Array<Object>>} resolved with messages
     */
    getMessages(filter) {
        return new Promise((resolve) => {
            const it = this.messageMap.values();
            const msgs = [];

            let result = it.next();
            while (!result.done) {
                if (!filter || filter(result.value)) {
                    msgs.push(result.value);
                }
                result = it.next();
            }
            resolve(msgs);
        });
    }
}

let CONTAINERS_STARTED;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: Kafka', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];
        // replace with ip accessible outside of docker network
        DOCKER_CONTAINERS.Kafka.env.KAFKA_CFG_ADVERTISED_LISTENERS = `PLAINTEXT_HOST://${cs.host.host}:${KAFKA_PORT}`;

        describe('Clean-up TS before service configuration', () => {
            harnessUtils.getDefaultHarness()
                .bigip
                .forEach((bigip) => testUtils.shouldRemovePreExistingTSDeclaration(bigip));
        });

        describe('Docker container setup', () => {
            before(() => {
                CONTAINERS_STARTED = [];
            });

            after(() => {
                CONTAINERS_STARTED = CONTAINERS_STARTED.every((v) => v);
            });

            Object.keys(DOCKER_CONTAINERS).forEach((serviceName) => it(
                `should pull ${serviceName} docker image`,
                () => cs.docker.pull(DOCKER_CONTAINERS[serviceName].image)
            ));
            Object.keys(DOCKER_CONTAINERS).forEach((serviceName) => it(
                `should remove pre-existing ${serviceName} docker container`,
                () => harnessUtils.docker.stopAndRemoveContainer(cs.docker, DOCKER_CONTAINERS[serviceName].name)
            ));

            Object.keys(DOCKER_CONTAINERS).forEach((serviceName) => it(
                `should start new ${serviceName} docker container`,
                () => harnessUtils.docker.startNewContainer(cs.docker, DOCKER_CONTAINERS[serviceName])
                    .then(() => CONTAINERS_STARTED.push(true))
            ));
        });
    });
}

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Kafka', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harness.other[0];
        const testDataTimestamp = Date.now();
        let kafkaClient = null;

        before(() => {
            assert.isOk(CONTAINERS_STARTED, 'should start Kafka container(s)!');
        });

        describe('Connect to Kafka server', () => {
            it('Connect to Kafka server', () => {
                const client = new KafkaClient(cs.host.host, KAFKA_PORT, KAFKA_TOPIC);
                return client.connect()
                    .then(
                        () => {
                            kafkaClient = client;
                        },
                        (err) => client.close()
                            .then(() => {
                                logger.error('Unable to connect to Kafka broker. Going to sleep for 2sec and re-try:', err);
                                return promiseUtils.sleepAndReject(2000, err);
                            })
                    );
            });
        });

        describe('Configure TS and generate data', () => {
            let consumerDeclaration;

            before(() => {
                assert.isNotNull(kafkaClient, 'should have Kafka-Client be ready for tests!');

                consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                consumerDeclaration[KAFKA_CONSUMER_NAME] = {
                    class: 'Telemetry_Consumer',
                    type: 'Kafka',
                    host: cs.host.host,
                    protocol: KAFKA_PROTOCOL,
                    port: KAFKA_PORT,
                    topic: KAFKA_TOPIC,
                    authenticationProtocol: KAFKA_AUTH_PROTOCOL,
                    format: KAFKA_FORMAT,
                    partitionerType: KAFKA_PARTITIONER_TYPE
                };
            });

            testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
            testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => `hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${KAFKA_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"\n`);
        });

        describe('Event Listener data', () => {
            const timestampStr = testDataTimestamp.toString();

            before(() => {
                assert.isNotNull(kafkaClient, 'should have Kafka-Client be ready for tests!');
            });

            harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
                .forEach((proto) => it(
                    `should check Kafka for event listener data (over ${proto}) for - ${bigip.name}`,
                    () => kafkaClient.getMessages((log) => log.test === 'true'
                        && log.hostname === bigip.hostname
                        && log.protocol === proto
                        && log.testDataTimestamp === timestampStr
                        && log.testType === KAFKA_CONSUMER_NAME)
                        .then((logs) => {
                            if (logs.length === 0) {
                                bigip.logger.info('No event listener data found. Going to wait another 10 sec.');
                                return promiseUtils.sleepAndReject(10000, `should have event(s) for a data from event listener (over ${proto})`);
                            }
                            return Promise.resolve();
                        })
                )));
        });

        describe('System Poller data', () => {
            before(() => {
                assert.isNotNull(kafkaClient, 'should have Kafka-Client be ready for tests!');
            });

            harness.bigip.forEach((bigip) => it(
                `should check Kafka for system poller data - ${bigip.name}`,
                () => kafkaClient.getMessages((log) => {
                    if (typeof log.system === 'object' && log.system.hostname === bigip.hostname) {
                        const schema = miscUtils.readJsonFile(constants.DECL.SYSTEM_POLLER_SCHEMA);
                        return miscUtils.validateAgainstSchema(log, schema);
                    }
                    return false;
                })
                    .then((logs) => {
                        if (logs.length === 0) {
                            bigip.logger.error('Waiting for data to be indexed...');
                            // more sleep time for system poller data to be indexed
                            return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data');
                        }
                        return Promise.resolve();
                    })
            ));
        });

        describe('Disconnect from Kafka server', () => {
            before(() => {
                assert.isNotNull(kafkaClient, 'should have Kafka-Client be ready for tests!');
            });

            it('Disconnect from Kafka server', () => kafkaClient.close());
        });
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer Teardown: Kafka', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        const serviceNames = Object.keys(DOCKER_CONTAINERS).join(', ');
        const containerNames = Object.keys(DOCKER_CONTAINERS).map((serviceName) => DOCKER_CONTAINERS[serviceName].name);

        it(`should stop and remove ${serviceNames} docker containers`, () => harnessUtils.docker.stopAndRemoveContainer(cs.docker, containerNames));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
