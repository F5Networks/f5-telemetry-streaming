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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const querystring = require('querystring');

const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/splunk
 */

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const SPLUNK_USERNAME = 'admin';
const SPLUNK_PASSWORD = `${miscUtils.randomString()}splunk!`; // might want to generate one instead
const SPLUNK_AUTH_HEADER = `Basic ${Buffer.from(`${SPLUNK_USERNAME}:${SPLUNK_PASSWORD}`).toString('base64')}`;
const SPLUNK_HTTP_PORT = 8000;
const SPLUNK_HTTP_PROTOCOL = 'https';
const SPLUNK_HEC_PORT = 8088;
const SPLUNK_SVC_PORT = 8089;
const SPLUNK_CONSUMER_NAME = 'Splunk_Consumer';

const DOCKER_CONTAINERS = {
    Splunk: {
        detach: true,
        env: {
            SPLUNK_START_ARGS: '--accept-license',
            SPLUNK_PASSWORD
        },
        image: 'splunk/splunk:latest',
        name: 'ts_splunk_consumer',
        publish: {
            [SPLUNK_HEC_PORT]: SPLUNK_HEC_PORT,
            [SPLUNK_HTTP_PORT]: SPLUNK_HTTP_PORT,
            [SPLUNK_SVC_PORT]: SPLUNK_SVC_PORT
        },
        restart: 'always'
    }
};

// read in example config
const DECLARATION = testUtils.alterPollerInterval(miscUtils.readJsonFile(constants.DECL.BASIC));
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

let SERVICE_IS_READY;
let SPLUNK_TOKENS;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: Splunk', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];
        let CONTAINER_STARTED;

        cs.http.createAndSave('splunk', {
            allowSelfSignedCert: true,
            headers: {
                Authorization: SPLUNK_AUTH_HEADER
            },
            json: false,
            port: SPLUNK_SVC_PORT,
            protocol: SPLUNK_HTTP_PROTOCOL
        });

        describe('Clean-up TS before service configuration', () => {
            harnessUtils.getDefaultHarness()
                .bigip
                .forEach((bigip) => testUtils.shouldRemovePreExistingTSDeclaration(bigip));
        });

        describe('Docker container setup', () => {
            before(() => {
                CONTAINER_STARTED = false;
            });

            it('should pull Splunk docker image', () => cs.docker.pull(DOCKER_CONTAINERS.Splunk.image, { existing: true }));

            it('should remove pre-existing Splunk docker container', () => harnessUtils.docker.stopAndRemoveContainer(
                cs.docker,
                DOCKER_CONTAINERS.Splunk.name
            ));

            it('should start new Splunk docker container', () => harnessUtils.docker.startNewContainer(
                cs.docker,
                DOCKER_CONTAINERS.Splunk
            )
                .then(() => {
                    CONTAINER_STARTED = true;
                }));
        });

        describe('Configure service', () => {
            before(() => {
                SPLUNK_TOKENS = {
                    events: null,
                    metrics: null
                };
                SERVICE_IS_READY = false;
                assert.isOk(CONTAINER_STARTED, 'should start Splunk container!');
            });

            it('should check service is up', () => cs.http.splunk.makeRequest({
                uri: '/services/server/control?output_mode=json'
            })
                // splunk container takes about 30 seconds to come up
                .then((data) => {
                    cs.logger.info('Splunk output:', { data });
                    assert.deepStrictEqual(data.links.restart, '/services/server/control/restart', 'should return expected response');
                })
                .catch((err) => {
                    cs.logger.error('Caught error on attempt to check service state. Re-trying in 10 sec.', err);
                    return promiseUtils.sleepAndReject(10000, err);
                }));

            it('should configure HTTP data collector for events', () => {
                const baseUri = '/services/data/inputs/http';
                const outputMode = 'output_mode=json';
                const tokenName = 'eventsToken';

                return cs.http.splunk.makeRequest({
                    method: 'POST',
                    uri: `${baseUri}/http?${outputMode}&enableSSL=1&disabled=0`
                })
                    .then(() => cs.http.splunk.makeRequest({
                        method: 'GET',
                        uri: `${baseUri}?${outputMode}`
                    }))
                    .then((data) => {
                        data = data || {};
                        // check for existence of the token first
                        if (data.entry && data.entry.length) {
                            const exists = data.entry.filter((item) => item.name.indexOf(tokenName) !== -1);
                            if (exists.length) {
                                return Promise.resolve({ entry: exists }); // exists, continue
                            }
                        }
                        return cs.http.splunk.makeRequest({
                            body: `name=${tokenName}`,
                            method: 'POST',
                            uri: `${baseUri}?${outputMode}`
                        });
                    })
                    .then((data) => {
                        SPLUNK_TOKENS.events = data.entry[0].content.token;
                        assert.isNotEmpty(SPLUNK_TOKENS.events, 'should acquire token for events');
                    })
                    .catch((err) => {
                        cs.logger.error('Caught error on attempt to configured HTT data collector. Re-trying in 500ms', err);
                        return promiseUtils.sleepAndReject(500, err);
                    });
            });

            it('should configure HTTP data collector for metrics', () => {
                const indexesUri = '/services/data/indexes';
                const tokensUri = '/services/data/inputs/http';
                const outputMode = 'output_mode=json';
                const indexName = 'metrics_index';
                const tokenName = 'metrics_token';

                return cs.http.splunk.makeRequest({
                    method: 'POST',
                    uri: `${tokensUri}/http?${outputMode}&enableSSL=1&disabled=0`
                })
                    .then(() => cs.http.splunk.makeRequest({
                        uri: `${indexesUri}/${indexName}?${outputMode}`
                    })
                        .catch((err) => {
                            // index doesn't exist, let's create it
                            cs.logger.error(`Index "${indexName}" doesn't exit. Going to create new one...`, err);
                            return cs.http.splunk.makeRequest({
                                body: `name=${indexName}&datatype=metric`,
                                method: 'POST',
                                uri: `${indexesUri}?${outputMode}`
                            });
                        }))
                    // create new token for metrics
                    .then(() => cs.http.splunk.makeRequest({
                        uri: `${tokensUri}?${outputMode}`
                    }))
                    .then((data) => {
                        data = data || {};
                        // check for existence of the token first
                        if (data.entry && data.entry.length) {
                            const exists = data.entry.filter((item) => item.name.indexOf(tokenName) !== -1);
                            if (exists.length) {
                                return Promise.resolve({ entry: exists }); // exists, continue
                            }
                        }
                        return cs.http.splunk.makeRequest({
                            body: `name=${tokenName}&index=${indexName}&source=metricsSourceType&sourcetype=Metrics`,
                            method: 'POST',
                            uri: `${tokensUri}?${outputMode}`
                        });
                    })
                    .then((data) => {
                        SPLUNK_TOKENS.metrics = data.entry[0].content.token;
                        assert.isNotEmpty(SPLUNK_TOKENS.metrics, 'should acquire token for metrics');
                    })
                    .catch((err) => {
                        cs.logger.error('Caught error on attempt to configured HTT metrics collector. Re-trying in 500ms', err);
                        return promiseUtils.sleepAndReject(500, err);
                    });
            });

            it('should acquire all tokens', () => {
                assert.isNotNull(SPLUNK_TOKENS.events, 'should acquire token for events');
                assert.isNotNull(SPLUNK_TOKENS.metrics, 'should acquire token for metrics');
                SERVICE_IS_READY = true;
            });
        });
    });
}

/**
 * Tests for DUTs
 */
function test() {
    const testSetupOptions = {
        compression: [
            {
                name: 'compression = default (gzip)',
                value: undefined
            },
            {
                name: 'compression = none',
                value: 'none'
            }
        ],
        format: [
            {
                name: 'multi metric events (format = multiMetric)',
                value: 'multiMetric',
                tokenName: 'metrics',
                metricsTests: true
            },
            {
                name: 'hec events (format = default)',
                value: 'default',
                tokenName: 'events',
                eventListenerTests: true,
                queryEventsTests: true
            }
        ]
    };
    const testSetups = [];
    testSetupOptions.compression.forEach((compression) => {
        testSetupOptions.format.forEach((format) => {
            testSetups.push({ compression, format });
        });
    });

    testSetups.forEach((testSetup) => {
        describe(`Consumer Test: Splunk - ${testSetup.compression.name}, ${testSetup.format.name}`, () => {
            before(() => {
                assert.isTrue(SERVICE_IS_READY, 'should start Splunk service');
            });
            testsForSuite(testSetup);
        });
    });
}

/**
 * Generate tests using test config
 *
 * @param {Object} testSetup - test config
 */
function testsForSuite(testSetup) {
    const harness = harnessUtils.getDefaultHarness();
    const cs = harnessUtils.getDefaultHarness().other[0];
    let testDataTimestamp;

    describe('Configure TS and generate data', () => {
        let consumerDeclaration;

        before(() => {
            testDataTimestamp = Date.now();

            consumerDeclaration = miscUtils.deepCopy(DECLARATION);
            consumerDeclaration[SPLUNK_CONSUMER_NAME] = {
                class: 'Telemetry_Consumer',
                type: 'Splunk',
                host: cs.host.host,
                protocol: 'https',
                port: SPLUNK_HEC_PORT,
                passphrase: {
                    cipherText: SPLUNK_TOKENS[testSetup.format.tokenName]
                },
                format: testSetup.format.value,
                allowSelfSignedCert: true,
                compressionType: testSetup.compression.value
            };
        });

        testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
        testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => `hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${SPLUNK_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"\n`);
    });

    /**
     * Query to search metrics
     *
     * @param {harness.BigIp} bigip - BIG-IP
     *
     * @returns {string} query
     */
    const searchMetrics = (bigip) => `| mcatalog values(metric_name) WHERE index=* AND host="${bigip.hostname}" AND earliest=-30s latest=now`;

    /**
     * Query to search system poller data
     *
     * @param {harness.BigIp} bigip - BIG-IP
     *
     * @returns {string} query
     */
    const searchQuerySP = (bigip) => `search source=f5.telemetry earliest=-30s latest=now | search "system.hostname"="${bigip.hostname}" | head 1`;

    /**
     * Query to search event listener data
     *
     * @param {harness.BigIp} bigip - BIG-IP
     *
     * @returns {string} query
     */
    const searchQueryEL = (bigip, proto) => `search source=f5.telemetry | spath testType | search testType="${SPLUNK_CONSUMER_NAME}" | search hostname="${bigip.hostname}" | search testDataTimestamp="${testDataTimestamp}" | search protocol="${proto}" | head 1`;

    const splunkSourceStr = 'f5.telemetry';
    const splunkSourceTypeStr = 'f5:telemetry:json';

    /**
     * Send query to Splunk
     *
     * @param {string} searchString - query string
     *
     * @returns {Promise<Object>} resolved once search request processed
     */
    const query = (searchString) => {
        const baseUri = '/services/search/jobs';
        const outputMode = 'output_mode=json';
        let sid;

        return cs.http.splunk.makeRequest({
            body: querystring.stringify({
                search: searchString
            }),
            expectedResponseCode: [200, 201],
            method: 'POST',
            uri: `${baseUri}?${outputMode}`
        })
            .then((data) => {
                sid = data.sid;
                assert.isDefined(sid, 'should have sid');

                return promiseUtils.loopUntil((breakCb) => cs.http.splunk.makeRequest({
                    uri: `${baseUri}/${sid}?${outputMode}`
                })
                    .then((status) => {
                        if (status.entry[0].content.dispatchState === 'DONE') {
                            return breakCb();
                        }
                        return promiseUtils.sleep(300);
                    }));
            })
            .then(() => cs.http.splunk.makeRequest({
                uri: `${baseUri}/${sid}/results/?${outputMode}`
            }));
    };

    if (testSetup.format.eventListenerTests) {
        describe('Event Listener data', () => {
            harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
                .forEach((proto) => it(
                    `should check Splunk for event listener data (over ${proto}) for - ${bigip.name}`,
                    () => query(searchQueryEL(bigip, proto))
                        .then((data) => {
                            // check we have results
                            const results = data.results;
                            assert.isArray(results, 'should be array');
                            assert.isNotEmpty(results, 'should return search results');

                            // check that the event is what we expect
                            const result = results[0];
                            const rawData = JSON.parse(result._raw);

                            assert.deepStrictEqual(rawData.testType, SPLUNK_CONSUMER_NAME);
                            assert.deepStrictEqual(rawData.hostname, bigip.hostname);
                            // validate data parsed by Splunk
                            assert.deepStrictEqual(result.host, bigip.hostname);
                            assert.deepStrictEqual(result.source, splunkSourceStr);
                            assert.deepStrictEqual(result.sourcetype, splunkSourceTypeStr);
                            assert.deepStrictEqual(result.hostname, bigip.hostname);
                            assert.deepStrictEqual(result.protocol, proto);
                            assert.deepStrictEqual(result.testType, SPLUNK_CONSUMER_NAME);
                            assert.deepStrictEqual(result.testDataTimestamp, `${testDataTimestamp}`);
                        })
                        .catch((err) => {
                            bigip.logger.info('No event listener data found. Going to wait another 20 sec.');
                            return promiseUtils.sleepAndReject(20000, err);
                        })
                )));
        });
    }

    describe('System Poller data', () => {
        // use earliest and latests query modifiers to filter results
        if (testSetup.format.queryEventsTests) {
            harness.bigip.forEach((bigip) => it(
                `should check Splunk for system poller data - ${bigip.name}`,
                () => query(searchQuerySP(bigip))
                    .then((data) => {
                        // check we have results
                        const results = data.results;
                        assert.isArray(results, 'should be array');
                        assert.isNotEmpty(results, 'should return search results');

                        // check that the event is what we expect
                        const result = results[0];
                        const rawData = JSON.parse(result._raw);

                        // validate raw data against schema
                        const schema = miscUtils.readJsonFile(constants.DECL.SYSTEM_POLLER_SCHEMA);
                        const valid = miscUtils.validateAgainstSchema(rawData, schema);
                        assert.isTrue(valid, `should have valid output: ${JSON.stringify(valid.errors)}`);

                        // validate data parsed by Splunk
                        assert.deepStrictEqual(result.host, bigip.hostname);
                        assert.deepStrictEqual(result.source, splunkSourceStr);
                        assert.deepStrictEqual(result.sourcetype, splunkSourceTypeStr);
                    })
                    .catch((err) => {
                        bigip.logger.error('Waiting for data to be indexed...', err);
                        // more sleep time for system poller data to be indexed
                        return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data', err);
                    })
            ));
        }

        if (testSetup.format.metricsTests) {
            harness.bigip.forEach((bigip) => it(
                `should check Splunk for system poller metrics for - ${bigip.name}`,
                () => query(searchMetrics(bigip))
                    .then((data) => {
                        // check we have results
                        const results = data.results;
                        assert.isArray(results, 'should be array');
                        assert.isNotEmpty(results, 'should return search results');

                        // check that the event is what we expect
                        const metrics = results[0]['values(metric_name)'];
                        // check that at least some metrics exists
                        assert.includeMembers(metrics, [
                            'avgCycles',
                            'cpu',
                            'systemTimestamp',
                            'tmmCpu',
                            'tmmMemory'
                        ], 'should at least have some metrics');
                    })
                    .catch((err) => {
                        bigip.logger.error('Waiting for data to be indexed...', err);
                        // more sleep time for system poller data to be indexed
                        return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data', err);
                    })
            ));
        }
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer Teardown: Splunk', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        it('should stop and remove Splunk docker container', () => harnessUtils.docker.stopAndRemoveContainer(
            cs.docker,
            DOCKER_CONTAINERS.Splunk.name
        ));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
