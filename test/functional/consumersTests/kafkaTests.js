/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const kafka = require('kafka-node');

const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const logger = require('../shared/utils/logger').getChild('kafkaTests');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

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
const KAFKA_TIMEOUT = 2000;
const ZOOKEEPER_CLIENT_PORT = 2181;
const DOCKER_CONTAINERS = {
    Kafka: {
        detach: true,
        env: {
            ALLOW_PLAINTEXT_LISTENER: 'yes',
            KAFKA_ADVERTISED_LISTENERS: null,
            KAFKA_ZOOKEEPER_CONNECT: null
        },
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}bitnami/kafka:latest`,
        name: 'kafka-server',
        publish: {
            [KAFKA_PORT]: KAFKA_PORT
        },
        restart: 'always'
    },
    Zookeeper: {
        detach: true,
        env: {
            ALLOW_ANONYMOUS_LOGIN: 'yes',
            ZOOKEEPER_CLIENT_PORT
        },
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}bitnami/zookeeper:latest`,
        name: 'zookeeper-server',
        publish: {
            [ZOOKEEPER_CLIENT_PORT]: ZOOKEEPER_CLIENT_PORT
        },
        restart: 'always'
    }
};

// read in example config
const DECLARATION = miscUtils.readJsonFile(constants.DECL.BASIC);
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

        DOCKER_CONTAINERS.Kafka.env.KAFKA_ADVERTISED_LISTENERS = `PLAINTEXT://${cs.host.host}:${KAFKA_PORT}`;
        DOCKER_CONTAINERS.Kafka.env.KAFKA_ZOOKEEPER_CONNECT = `${cs.host.host}:${ZOOKEEPER_CLIENT_PORT}`;

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

            // order matters
            ['Zookeeper', 'Kafka'].forEach((serviceName) => it(
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
            assert.isOk(CONTAINERS_STARTED, 'should start Kafka and Zookeeper containers!');
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
                                logger.error('Unable to connect to Kafka and Zookeeper. Going to sleep for 2sec and re-try:', err);
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
                    authenticationProtocol: KAFKA_AUTH_PROTOCOL
                };
            });

            testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
            testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => `hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${KAFKA_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"`);
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
                                bigip.logger.info('No event listener data found. Going to wait another 10sec');
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
                            bigip.logger.info('No system poller data found. Going to wait another 10sec');
                            // more sleep time for system poller
                            return promiseUtils.sleepAndReject(20000, 'should have event(s) for a data from system poller');
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
