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
const util = require('../shared/util.js');
const constants = require('../shared/constants.js');
const dutUtils = require('../dutTests.js').utils;

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const DUTS = util.getHosts('BIGIP');
const CONSUMER_HOST = util.getHosts('CONSUMER')[0];
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));

const ES_CONTAINER_NAME = 'ts_elasticsearch_consumer';
const ES_PROTOCOL = 'http';
const ES_HTTP_PORT = 9200;
const ES_TRANSPORT_PORT = 9300;
const ES_CONSUMER_NAME = 'Consumer_ElasticSearch';
const ES_API_VERSION = '6.5';
const ES_DOCKER_TAG = '6.7.2';
const ES_IMAGE_NAME = `docker.elastic.co/elasticsearch/elasticsearch:${ES_DOCKER_TAG}`;

function runRemoteCmd(cmd) {
    return util.performRemoteCmd(CONSUMER_HOST.ip, CONSUMER_HOST.username, cmd, { password: CONSUMER_HOST.password });
}

function setup() {
    describe('Consumer Setup: Elastic Search - pull docker image', () => {
        it(`should pull container image ${ES_DOCKER_TAG}`, () => runRemoteCmd(`docker pull ${ES_IMAGE_NAME}`));
    });
}

function test() {
    const timeStamp = (new Date()).getTime();
    describe('Consumer Test: ElasticSearch - Configure Service', () => {
        it('should start container', () => {
            const portArgs = `-p ${ES_HTTP_PORT}:${ES_HTTP_PORT} -p ${ES_TRANSPORT_PORT}:${ES_TRANSPORT_PORT} -e "discovery.type=single-node"`;
            const cmd = `docker run -d --restart=always --name ${ES_CONTAINER_NAME} ${portArgs} ${ES_IMAGE_NAME}`;

            return runRemoteCmd(`docker ps | grep ${ES_CONTAINER_NAME}`)
                .then((data) => {
                    if (data) {
                        return Promise.resolve();
                    }
                    return runRemoteCmd(cmd);
                });
        });

        it('should check service is up', () => {
            const uri = '/_nodes';
            const options = {
                protocol: ES_PROTOCOL,
                port: ES_HTTP_PORT
            };

            return new Promise(resolve => setTimeout(resolve, 20000))
                .then(() => util.makeRequest(CONSUMER_HOST.ip, uri, options))
                .then((data) => {
                    const nodeInfo = data._nodes;
                    assert.strictEqual(nodeInfo.total, 1);
                    assert.strictEqual(nodeInfo.successful, 1);
                });
        });
    });

    describe('Consumer Test: ElasticSearch - Configure TS', () => {
        it('should configure TS', () => {
            const consumerDeclaration = util.deepCopy(DECLARATION);
            consumerDeclaration[ES_CONSUMER_NAME] = {
                class: 'Telemetry_Consumer',
                type: 'ElasticSearch',
                host: CONSUMER_HOST.ip,
                protocol: ES_PROTOCOL,
                port: ES_HTTP_PORT,
                index: ES_CONTAINER_NAME,
                apiVersion: ES_API_VERSION
            };
            return dutUtils.postDeclarationToDUTs(() => consumerDeclaration);
        });

        it('should send event to TS Event Listener', () => {
            const msg = `timestamp="${timeStamp}",test="true",testType="${ES_CONSUMER_NAME}"`;
            return dutUtils.sendDataToDUTsEventListener(hostObj => `hostname="${hostObj.hostname}",${msg}`);
        });
    });

    describe('Consumer Test: ElasticSearch - Test', () => {
        const systemPollerData = {};
        const query = (searchString) => {
            const uri = `/${ES_CONTAINER_NAME}/_search?${searchString}`;
            const options = {
                port: ES_HTTP_PORT,
                protocol: ES_PROTOCOL
            };

            return new Promise(resolve => setTimeout(resolve, 15000))
                .then(() => util.makeRequestWithRetry(
                    () => util.makeRequest(CONSUMER_HOST.ip, uri, options),
                    30000,
                    5
                ));
        };

        before(() => new Promise(resolve => setTimeout(resolve, 30000))
            .then(() => dutUtils.getSystemPollerData((hostObj, data) => {
                systemPollerData[hostObj.hostname] = data;
            })));

        DUTS.forEach((dut) => {
            it(`should have system poller config for - ${dut.hostname}`, () => {
                const hostname = systemPollerData[dut.hostname];
                assert.notStrictEqual(hostname, undefined);
            });

            it(`should check for event listener data for - ${dut.hostname}`, () => query(`size=1&q=data.testType:${ES_CONSUMER_NAME}&q=data.hostname:${dut.hostname}`)
                .then((data) => {
                    util.logger.info('ElasticSearch response:', data);
                    const esData = data.hits.hits;
                    assert.notStrictEqual(esData.length, 0);

                    const eventData = esData[0]._source.data;
                    assert.strictEqual(eventData.timestamp, timeStamp.toString());
                    assert.strictEqual(eventData.hostname, dut.hostname);
                }));

            it(`should have consumer data posted for - ${dut.hostname}`, () => query(`size=1&q=system.hostname:${dut.hostname}`)
                .then((data) => {
                    util.logger.info('ElasticSearch response:', data);
                    const esData = data.hits.hits;
                    assert.notStrictEqual(esData.length, 0);
                    assert.strictEqual(esData[0]._source.system.hostname, dut.hostname);


                    const schema = JSON.parse(fs.readFileSync(constants.DECL.SYSTEM_POLLER_SCHEMA));
                    const valid = util.validateAgainstSchema(esData[0]._source, schema);
                    if (valid !== true) {
                        assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                    }
                }));
        });
    });
}

function teardown() {
    describe('Consumer Test: ElasticSearch - teardown', () => {
        it('should remove container', () => runRemoteCmd(`docker container rm -f ${ES_CONTAINER_NAME}`));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
