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

const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/elasticSearch
 */

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const ES_PROTOCOL = 'http';
const ES_HTTP_PORT = 9200;
const ES_TRANSPORT_PORT = 9300;
const ES_CONSUMER_NAME = 'Consumer_ElasticSearch';
const ES_MAX_FIELDS = 5000;

const ES_VERSIONS_TO_TEST = ['6.7.2', '7.14.1', '8.0.0'];

const DOCKER_CONTAINERS = {
    ElasticSearch: {
        detach: true,
        env: {
            'discovery.type': 'single-node',
            'indices.query.bool.max_clause_count': ES_MAX_FIELDS,
            'xpack.security.enabled': 'false'
        },
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}elasticsearch`,
        name: 'ts_elasticsearch_consumer',
        publish: {
            [ES_HTTP_PORT]: ES_HTTP_PORT,
            [ES_TRANSPORT_PORT]: ES_TRANSPORT_PORT
        },
        restart: 'always'
    }
};

// read in example config
const DECLARATION = miscUtils.readJsonFile(constants.DECL.BASIC);
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

let SERVICE_IS_READY;

/**
 * Get version specific Docker config
 *
 * @param {string} version - ElasticSearch version
 *
 * @returns {Object} version specific Docker config
 */
function getDockerConfig(version) {
    return Object.assign(
        miscUtils.deepCopy(DOCKER_CONTAINERS.ElasticSearch),
        {
            image: `${DOCKER_CONTAINERS.ElasticSearch.image}:${version}`
        }
    );
}

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: ElasticSearch', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];
        cs.http.createAndSave('elastic', {
            port: ES_HTTP_PORT,
            protocol: ES_PROTOCOL
        });

        describe('Docker container setup', () => {
            ES_VERSIONS_TO_TEST.forEach((elsVer) => {
                const dockerConf = getDockerConfig(elsVer);

                it(`should pull ElasticSearch ${elsVer} docker image`, () => cs.docker.pull(dockerConf.image));
            });
        });
    });
}

/**
 * Tests for DUTs
 */
function test() {
    ES_VERSIONS_TO_TEST.forEach((elsVer) => {
        describe(`Consumer Test: ElasticSearch ${elsVer}`, () => {
            before(() => {
                SERVICE_IS_READY = false;
            });

            testVer(elsVer);
        });
    });
}

/**
 * Tests for specific ElasticSearch version
 *
 * @param {string} elsVer - ElasticSearch version
 */
function testVer(elsVer) {
    const harness = harnessUtils.getDefaultHarness();
    const cs = harnessUtils.getDefaultHarness().other[0];
    const testDataTimestamp = Date.now();
    let CONTAINER_STARTED;

    describe('Docker container setup', () => {
        before(() => {
            CONTAINER_STARTED = false;
        });

        it('should remove pre-existing ElasticSearch docker container', () => harnessUtils.docker.stopAndRemoveContainer(
            cs.docker,
            DOCKER_CONTAINERS.ElasticSearch.name
        ));

        it('should start new ElasticSearch docker container', () => harnessUtils.docker.startNewContainer(
            cs.docker,
            getDockerConfig(elsVer)
        )
            .then(() => {
                CONTAINER_STARTED = true;
            }));

        it('should check service is up', () => cs.http.elastic.makeRequest({
            uri: '/_nodes'
        })
            .then((data) => {
                const nodeInfo = data._nodes;
                assert.deepStrictEqual(nodeInfo.total, 1);
                assert.deepStrictEqual(nodeInfo.successful, 1);
            })
            .catch((err) => {
                cs.logger.error('Caught error on attempt to check service state. Re-trying in 3sec', err);
                return promiseUtils.sleepAndReject(3000, err);
            }));
    });

    describe('Configure service', () => {
        before(() => {
            assert.isOk(CONTAINER_STARTED, 'should start ElasticSearch container!');
        });

        harness.bigip.forEach((bigip) => it(
            `should configure index limits - ${bigip.name}`,
            () => cs.http.elastic.makeRequest({
                body: {
                    settings: {
                        'index.mapping.total_fields.limit': ES_MAX_FIELDS
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true,
                method: 'PUT',
                uri: `/${bigip.name}`
            })
                .then(() => {
                    SERVICE_IS_READY = true;
                })
                .catch((err) => {
                    cs.logger.error('Caught error on attempt to configure service. Re-trying in 1sec', err);
                    return promiseUtils.sleepAndReject(1000, err);
                })
        ));
    });

    describe('Configure TS and generate data', () => {
        let consumerDeclaration;

        before(() => {
            assert.isOk(SERVICE_IS_READY, 'should start ElasticSearch service!');

            consumerDeclaration = miscUtils.deepCopy(DECLARATION);
            consumerDeclaration[ES_CONSUMER_NAME] = {
                class: 'Telemetry_Consumer',
                type: 'ElasticSearch',
                host: cs.host.host,
                protocol: ES_PROTOCOL,
                port: ES_HTTP_PORT,
                apiVersion: elsVer
            };
        });

        testUtils.shouldConfigureTS(harness.bigip, (bigip) => {
            const decl = miscUtils.deepCopy(consumerDeclaration);
            decl[ES_CONSUMER_NAME].index = bigip.name;
            return decl;
        });

        testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => `hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${ES_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"`);
    });

    /**
     * Send query to ElasticSearch
     *
     * @param {string} searchString - search string
     *
     * @returns {Promise} resolved with data
     */
    const esQuery = (index, searchString) => cs.http.elastic.makeRequest({
        retry: {
            maxTries: 5,
            delay: 30000
        },
        uri: `/${index}/_search?${searchString}`
    });

    describe('Event Listener data', () => {
        const timestampStr = testDataTimestamp.toString();

        before(() => {
            assert.isOk(SERVICE_IS_READY, 'should start ElasticSearch service!');
        });

        harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
            .forEach((proto) => it(
                `should check ElasticSearch for event listener data (over ${proto}) for - ${bigip.name}`,
                () => esQuery(bigip.name, `size=1&q=data.protocol:${proto}%20AND%20data.testType:${ES_CONSUMER_NAME}%20AND%20data.hostname=${bigip.hostname}`)
                    .then((data) => {
                        const esData = data.hits.hits;
                        assert.isNotEmpty(esData, 'ElasticSearch should return search results');

                        const found = esData.some((hit) => {
                            const eventData = hit._source.data;
                            return eventData
                                && eventData.testDataTimestamp === timestampStr
                                && eventData.hostname === bigip.hostname
                                && eventData.protocol === proto;
                        });
                        if (found) {
                            return Promise.resolve();
                        }
                        return Promise.reject(new Error('should have events indexed from event listener data'));
                    })
                    .catch((err) => {
                        bigip.logger.error('No event listener data found. Going to wait another 10sec', err);
                        return promiseUtils.sleepAndReject(10000, err);
                    })
            )));
    });

    describe('System Poller data', () => {
        before(() => {
            assert.isOk(SERVICE_IS_READY, 'should start ElasticSearch service!');
        });

        harness.bigip.forEach((bigip) => it(
            `should check ElasticSearch for system poller data - ${bigip.name}`,
            () => esQuery(bigip.name, `size=1&q=system.hostname:${bigip.hostname}`)
                .then((data) => {
                    const esData = data.hits.hits;
                    assert.isNotEmpty(esData, 'ElasticSearch should return search results');

                    const found = esData.some((hit) => {
                        const eventData = hit._source;
                        if (eventData && eventData.system
                            && eventData.system.hostname === bigip.hostname) {
                            const schema = miscUtils.readJsonFile(constants.DECL.SYSTEM_POLLER_SCHEMA);
                            return miscUtils.validateAgainstSchema(eventData, schema);
                        }
                        return false;
                    });
                    if (found) {
                        return Promise.resolve();
                    }
                    return Promise.reject(new Error('should have data indexed from system poller data'));
                })
                .catch((err) => {
                    bigip.logger.error('No system poller data found. Going to wait another 20sec', err);
                    return promiseUtils.sleepAndReject(20000, err);
                })
        ));
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer Teardown: ElasticSearch', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        it('should stop and remove ElasticSearch docker container', () => harnessUtils.docker.stopAndRemoveContainer(
            cs.docker,
            DOCKER_CONTAINERS.ElasticSearch.name
        ));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
