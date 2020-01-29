/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const assert = require('assert');
const fs = require('fs');
const kafka = require('kafka-node');
const util = require('../shared/util.js');
const constants = require('../shared/constants.js');
const dutUtils = require('../dutTests.js').utils;

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const DUTS = util.getHosts('BIGIP');
const CONSUMER_HOST = util.getHosts('CONSUMER')[0]; // only expect one
const KAFKA_IMAGE_NAME = 'bitnami/kafka:latest';
const ZOOKEEPER_NAME = 'zookeeper-server';
const KAFKA_NAME = 'kafka-server';
const KAFKA_HOST = CONSUMER_HOST.ip;
const KAFKA_PROTOCOL = 'binaryTcp';
const KAFKA_PORT = '9092';
const KAFKA_TOPIC = 'f5-telemetry';
const KAFKA_AUTH_PROTOCOL = 'None';
const KAFKA_CONSUMER_NAME = 'Consumer_Kafka';

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));


function runRemoteCmd(cmd) {
    return util.performRemoteCmd(CONSUMER_HOST.ip, CONSUMER_HOST.username, cmd, { password: CONSUMER_HOST.password });
}

function setup() {
    describe('Consumer Setup: Kafka', () => {
        it('should pull bitnami docker image', () => runRemoteCmd(`docker pull ${KAFKA_IMAGE_NAME}`));

        it('should start Zookeeper and Kafka docker containers', () => {
            const zookeeperParams = '-e ALLOW_ANONYMOUS_LOGIN=yes -e ZOOKEEPER_CLIENT_PORT:2181 -p 2181:2181';
            const cmdZookeeper = `docker run -d ${zookeeperParams} --name ${ZOOKEEPER_NAME} bitnami/zookeeper:latest`;
            const kafkaParams = `-e ALLOW_PLAINTEXT_LISTENER=yes -e KAFKA_ZOOKEEPER_CONNECT=${KAFKA_HOST}:2181 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://${KAFKA_HOST}:${KAFKA_PORT} -p ${KAFKA_PORT}:${KAFKA_PORT}`;
            const cmdKafka = `docker run -d ${kafkaParams} --name ${KAFKA_NAME} bitnami/kafka:latest`;

            // simple check to see if zookeeper already exists
            return runRemoteCmd(`docker ps | grep ${ZOOKEEPER_NAME}`)
                .then((data) => {
                    if (data) {
                        return Promise.resolve(); // exists, contine
                    }
                    return runRemoteCmd(cmdZookeeper);
                })
                .then(() => runRemoteCmd(`docker ps | grep ${KAFKA_NAME}`))
                .then((data) => {
                    if (data) {
                        return Promise.resolve(); // exists, contine
                    }
                    return runRemoteCmd(cmdKafka);
                });
        });
    });
}

function test() {
    // const testType = 'Kafka_Consumer_Test';
    // const dataTimestamp = (new Date()).getTime();

    describe('Consumer Test: Kafka', () => {
        const consumerDeclaration = util.deepCopy(DECLARATION);
        consumerDeclaration[KAFKA_CONSUMER_NAME] = {
            class: 'Telemetry_Consumer',
            type: 'Kafka',
            host: KAFKA_HOST,
            protocol: KAFKA_PROTOCOL,
            port: KAFKA_PORT,
            topic: KAFKA_TOPIC,
            authenticationProtocol: KAFKA_AUTH_PROTOCOL
        };
        DUTS.forEach(dut => it(
            `should configure TS - ${dut.hostname}`,
            () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(consumerDeclaration))
        ));

        it('should receive message on Kafka consumer', function (done) {
            this.retries(0);
            this.timeout('120s');
            const client = new kafka.KafkaClient(
                { kafkaHost: `${KAFKA_HOST}:${KAFKA_PORT}` }
            );
            client.createTopics([KAFKA_TOPIC], () => {
                const Consumer = kafka.Consumer;
                const consumer = new Consumer(
                    client,
                    [
                        { topic: KAFKA_TOPIC, partition: 0 }
                    ],
                    { autoCommit: false }
                );
                consumer.addTopics([KAFKA_TOPIC], () => {
                    consumer.on('message', (message) => {
                        util.logger.info('Kafka message received:', message);
                        consumer.removeAllListeners();
                        consumer.close();
                        const parsedMessage = JSON.parse(message.value);
                        assert.notStrictEqual(parsedMessage.system, undefined, `Did not receive expected TS message. Instead received: ${JSON.stringify(message)}`);
                        done();
                    });
                });
            });
        });
    });
}

function teardown() {
    describe('Consumer Teardown: Kafka', () => {
        it('should remove containers', () => runRemoteCmd(`docker container rm -f ${ZOOKEEPER_NAME}`)
            .then(() => runRemoteCmd(`docker container rm -f ${KAFKA_NAME}`)));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
