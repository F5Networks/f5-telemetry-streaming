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

function removeESContainer() {
    return runRemoteCmd(`docker ps | grep ${ES_CONTAINER_NAME}`)
        .then((data) => {
            if (data) {
                return runRemoteCmd(`docker container rm -f ${ES_CONTAINER_NAME}`);
            }
            return Promise.resolve();
        });
}

function setup() {
    describe('Consumer Setup: Elastic Search - pull docker image', () => {
        it(`should pull container image ${ES_DOCKER_TAG}`, () => runRemoteCmd(`docker pull ${ES_IMAGE_NAME}`));
    });
}

function test() {
    const testDataTimestamp = Date.now();

    describe('Consumer Test: ElasticSearch - Configure Service', () => {
        DUTS.forEach((dut) => {
            describe(`Device Under Test - ${dut.hostname}`, () => {
                let systemPollerData;

                describe('Consumer service setup', () => {
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

                        return new Promise(resolve => setTimeout(resolve, 5000))
                            .then(() => util.makeRequest(CONSUMER_HOST.ip, uri, options))
                            .then((data) => {
                                const nodeInfo = data._nodes;
                                assert.strictEqual(nodeInfo.total, 1);
                                assert.strictEqual(nodeInfo.successful, 1);
                            });
                    });

                    it('should configure index limits', () => {
                        const uri = `/${ES_CONTAINER_NAME}`;
                        const options = {
                            protocol: ES_PROTOCOL,
                            port: ES_HTTP_PORT,
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                settings: {
                                    'index.mapping.total_fields.limit': 2000
                                }
                            }
                        };
                        return util.makeRequest(CONSUMER_HOST.ip, uri, options);
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
                        return dutUtils.postDeclarationToDUT(dut, consumerDeclaration);
                    });

                    it('should send event to TS Event Listener', () => {
                        const msg = `hostname="${dut.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${ES_CONSUMER_NAME}"`;
                        return dutUtils.sendDataToEventListener(dut, msg);
                    });

                    it('should retrieve SystemPoller data', () => dutUtils.getSystemPollerData(dut, constants.DECL.SYSTEM_NAME)
                        .then((data) => {
                            systemPollerData = data;
                            assert.notStrictEqual(systemPollerData, undefined);
                            assert.notStrictEqual(systemPollerData.system, undefined);
                        }));
                });

                describe('Consumer Test: ElasticSearch - Test', () => {
                    const query = (searchString) => {
                        const uri = `/${ES_CONTAINER_NAME}/_search?${searchString}`;
                        const options = {
                            port: ES_HTTP_PORT,
                            protocol: ES_PROTOCOL
                        };
                        util.logger.info(`ElasticSearch search query - ${uri}`);
                        return util.makeRequestWithRetry(
                            () => util.makeRequest(CONSUMER_HOST.ip, uri, options),
                            30000,
                            5
                        );
                    };

                    it('should check for event listener data for', () => new Promise(resolve => setTimeout(resolve, 10000))
                        .then(() => query(`size=1&q=data.testType:${ES_CONSUMER_NAME}%20AND%20data.hostname=${dut.hostname}`))
                        .then((data) => {
                            util.logger.info('ElasticSearch response:', data);
                            const esData = data.hits.hits;
                            assert.notStrictEqual(esData.length, 0, 'ElasticSearch should return search results');

                            let found = false;
                            esData.forEach((hit) => {
                                const eventData = hit._source.data;
                                if (eventData && eventData.hostname === dut.hostname) {
                                    assert.strictEqual(eventData.testDataTimestamp, testDataTimestamp.toString());
                                    found = true;
                                }
                            });
                            if (!found) {
                                return Promise.reject(new Error('Event not found'));
                            }
                            return Promise.resolve();
                        }));

                    it('should have system poller data', () => new Promise(resolve => setTimeout(resolve, 10000))
                        .then(() => query(`size=1&q=system.hostname:${dut.hostname}`))
                        .then((data) => {
                            util.logger.info('ElasticSearch response:', data);
                            const esData = data.hits.hits;
                            assert.notStrictEqual(esData.length, 0, 'ElasticSearch should return search results');

                            let found = false;
                            esData.forEach((hit) => {
                                const sysData = hit._source;
                                if (sysData && sysData.system && sysData.system.hostname === dut.hostname) {
                                    const schema = JSON.parse(fs.readFileSync(constants.DECL.SYSTEM_POLLER_SCHEMA));
                                    const valid = util.validateAgainstSchema(sysData, schema);
                                    if (valid !== true) {
                                        assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                                    }
                                    found = true;
                                }
                            });
                            if (!found) {
                                return Promise.reject(new Error('System Poller data not found'));
                            }
                            return Promise.resolve();
                        }));
                });

                describe('TS cleanup - remove ElasticSearch consumer', () => {
                    it('should remove consumer from TS declaration', () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(DECLARATION)));
                });

                describe('Consumer service teardown', () => {
                    it('should remove container', () => removeESContainer());
                });
            });
        });
    });
}

function teardown() {
    describe('Consumer Test: ElasticSearch - teardown', () => {
        it('should remove container', () => removeESContainer());
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
