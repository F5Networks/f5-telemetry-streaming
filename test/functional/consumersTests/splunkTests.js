/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const querystring = require('querystring');

const util = require('../shared/util');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;

chai.use(chaiAsPromised);
const assert = chai.assert;

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const DUTS = util.getHosts('BIGIP');
const CONSUMER_HOST = util.getHosts('CONSUMER')[0]; // only expect one
const SPLUNK_IMAGE_NAME = `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}splunk/splunk:latest`;
const SPLUNK_CONTAINER_NAME = 'ts_splunk_consumer';
const SPLUNK_USERNAME = 'admin';
const SPLUNK_PASSWORD = `${CONSUMER_HOST.password}splunk!`; // might want to generate one instead
const SPLUNK_AUTH_HEADER = `Basic ${Buffer.from(`${SPLUNK_USERNAME}:${SPLUNK_PASSWORD}`).toString('base64')}`;
const SPLUNK_HTTP_PORT = 8000;
const SPLUNK_HEC_PORT = 8088;
const SPLUNK_SVC_PORT = 8089;
const SPLUNK_CONSUMER_NAME = 'Splunk_Consumer';

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC));

function runRemoteCmd(cmd) {
    return util.performRemoteCmd(CONSUMER_HOST.ip, CONSUMER_HOST.username, cmd, { password: CONSUMER_HOST.password });
}

function setup() {
    describe('Consumer Setup: Splunk - pull docker image', () => {
        it('should pull container image', () => runRemoteCmd(`docker pull ${SPLUNK_IMAGE_NAME}`));
    });
}

function test() {
    let testDataTimestamp;
    const splunkHecTokens = {
        events: null,
        metrics: null
    };

    describe('Consumer Test: Splunk - Configure Service', () => {
        it('should start container', () => {
            const portArgs = `-p ${SPLUNK_HTTP_PORT}:${SPLUNK_HTTP_PORT} -p ${SPLUNK_SVC_PORT}:${SPLUNK_SVC_PORT} -p ${SPLUNK_HEC_PORT}:${SPLUNK_HEC_PORT}`;
            const eArgs = `-e 'SPLUNK_START_ARGS=--accept-license' -e 'SPLUNK_PASSWORD=${SPLUNK_PASSWORD}'`;
            const cmd = `docker run -d --name ${SPLUNK_CONTAINER_NAME} ${portArgs} ${eArgs} ${SPLUNK_IMAGE_NAME}`;

            // simple check to see if container already exists
            return runRemoteCmd(`docker ps | grep ${SPLUNK_CONTAINER_NAME}`)
                .then((data) => {
                    if (data) {
                        return Promise.resolve(); // exists, continue
                    }
                    return runRemoteCmd(cmd);
                });
        });

        it('should check service is up', () => {
            const uri = '/services/server/control?output_mode=json';
            const options = {
                port: SPLUNK_SVC_PORT,
                headers: {
                    Authorization: SPLUNK_AUTH_HEADER
                }
            };

            // splunk container takes about 30 seconds to come up
            return new Promise((resolve) => { setTimeout(resolve, 10000); })
                .then(() => util.makeRequest(CONSUMER_HOST.ip, uri, options))
                .then((data) => {
                    util.logger.info(`Splunk response ${uri}`, data);
                    assert.strictEqual(data.links.restart, '/services/server/control/restart');
                });
        });

        it('should configure HTTP data collector for events', () => {
            const baseUri = '/services/data/inputs/http';
            const outputMode = 'output_mode=json';
            const tokenName = 'eventsToken';

            let uri = `${baseUri}/http?${outputMode}&enableSSL=1&disabled=0`;
            const options = {
                method: 'POST',
                port: SPLUNK_SVC_PORT,
                headers: {
                    Authorization: SPLUNK_AUTH_HEADER
                }
            };

            // configure global settings, create token
            return util.makeRequest(CONSUMER_HOST.ip, uri, options)
                .then(() => {
                    uri = `${baseUri}?${outputMode}`;
                    return util.makeRequest(CONSUMER_HOST.ip, uri, Object.assign(util.deepCopy(options), { method: 'GET' }));
                })
                .then((data) => {
                    data = data || {};
                    // check for existence of the token first
                    if (data.entry && data.entry.length) {
                        const exists = data.entry.filter((item) => item.name.indexOf(tokenName) !== -1);
                        if (exists.length) {
                            return Promise.resolve({ entry: exists }); // exists, continue
                        }
                    }
                    uri = `${baseUri}?${outputMode}`;
                    return util.makeRequest(CONSUMER_HOST.ip, uri, Object.assign(util.deepCopy(options), { body: `name=${tokenName}` }));
                })
                .then((data) => {
                    try {
                        splunkHecTokens.events = data.entry[0].content.token;
                    } catch (error) {
                        throw new Error('HTTP data collector api token could not be retrieved');
                    }
                    assert.notStrictEqual(splunkHecTokens.events, undefined);
                });
        });

        it('should configure HTTP data collector for metrics', () => {
            const indexesUri = '/services/data/indexes';
            const tokensUri = '/services/data/inputs/http';
            const outputMode = 'output_mode=json';
            const indexName = 'metrics_index';
            const tokenName = 'metrics_token';
            const options = {
                method: 'POST',
                port: SPLUNK_SVC_PORT,
                headers: {
                    Authorization: SPLUNK_AUTH_HEADER
                }
            };

            // configure global settings, create index and token
            let uri = `${tokensUri}/http?${outputMode}&enableSSL=1&disabled=0`;
            return util.makeRequest(CONSUMER_HOST.ip, uri, options)
                .then(() => {
                    uri = `${indexesUri}/${indexName}?${outputMode}`;
                    return util.makeRequest(CONSUMER_HOST.ip, uri, Object.assign(util.deepCopy(options), { method: 'GET' }))
                        .catch(() => {
                            // index doesn't exist, let's create it
                            uri = `${indexesUri}?${outputMode}`;
                            return util.makeRequest(CONSUMER_HOST.ip, uri, Object.assign(util.deepCopy(options), { body: `name=${indexName}&datatype=metric` }));
                        });
                })
                .then(() => {
                    // create new token for metrics
                    uri = `${tokensUri}?${outputMode}`;
                    return util.makeRequest(CONSUMER_HOST.ip, uri, Object.assign(util.deepCopy(options), { method: 'GET' }));
                })
                .then((data) => {
                    data = data || {};
                    // check for existence of the token first
                    if (data.entry && data.entry.length) {
                        const exists = data.entry.filter((item) => item.name.indexOf(tokenName) !== -1);
                        if (exists.length) {
                            return Promise.resolve({ entry: exists }); // exists, continue
                        }
                    }
                    uri = `${tokensUri}?${outputMode}`;
                    return util.makeRequest(CONSUMER_HOST.ip, uri, Object.assign(util.deepCopy(options), {
                        body: `name=${tokenName}&index=${indexName}&source=metricsSourceType&sourcetype=Metrics`
                    }));
                })
                .then((data) => {
                    try {
                        splunkHecTokens.metrics = data.entry[0].content.token;
                    } catch (error) {
                        throw new Error('HTTP data collector api token could not be retrieved');
                    }
                    assert.notStrictEqual(splunkHecTokens.metrics, undefined);
                });
        });
    });

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
        describe(`${testSetup.compression.name}, ${testSetup.format.name}`, () => {
            describe('Consumer Test: Splunk - Configure TS and generate data', () => {
                const consumerDeclaration = util.deepCopy(DECLARATION);

                // this need only to insert 'splunkHecEventsToken'
                it('should compute declaration', () => {
                    consumerDeclaration[SPLUNK_CONSUMER_NAME] = {
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        host: CONSUMER_HOST.ip,
                        protocol: 'https',
                        port: SPLUNK_HEC_PORT,
                        passphrase: {
                            cipherText: splunkHecTokens[testSetup.format.tokenName]
                        },
                        format: testSetup.format.value,
                        allowSelfSignedCert: true,
                        compressionType: testSetup.compression.value
                    };
                });

                DUTS.forEach((dut) => it(
                    `should configure TS - ${dut.hostalias}`,
                    () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(consumerDeclaration))
                ));

                if (testSetup.format.eventListenerTests) {
                    it('set data timestamp', () => {
                        testDataTimestamp = (new Date()).getTime();
                    });

                    it('should send event to TS Event Listener', () => {
                        const msg = `testDataTimestamp="${testDataTimestamp}",test="true",testType="${SPLUNK_CONSUMER_NAME}"`;
                        return dutUtils.sendDataToEventListeners((dut) => `hostname="${dut.hostname}",${msg}`);
                    });
                }
            });

            describe('Consumer Test: Splunk - Test', () => {
                const splunkSourceStr = 'f5.telemetry';
                const splunkSourceTypeStr = 'f5:telemetry:json';

                // helper function to query splunk for data
                const query = (searchString) => {
                    const baseUri = '/services/search/jobs';
                    const outputMode = 'output_mode=json';
                    const options = {
                        port: SPLUNK_SVC_PORT,
                        headers: {
                            Authorization: SPLUNK_AUTH_HEADER
                        }
                    };

                    let uri = `${baseUri}?${outputMode}`;
                    let sid;

                    return util.makeRequest(
                        CONSUMER_HOST.ip,
                        uri,
                        Object.assign(util.deepCopy(options), {
                            method: 'POST',
                            body: querystring.stringify({
                                search: searchString
                            })
                        })
                    )
                        .then((data) => {
                            sid = data.sid;
                            assert.notStrictEqual(sid, undefined);

                            // wait until job search is complete using dispatchState:'DONE'
                            return new Promise((resolve, reject) => {
                                const waitUntilDone = () => {
                                    uri = `${baseUri}/${sid}?${outputMode}`;
                                    return new Promise((resolveTimer) => { setTimeout(resolveTimer, 100); })
                                        .then(() => util.makeRequest(CONSUMER_HOST.ip, uri, options))
                                        .then((status) => {
                                            const dispatchState = status.entry[0].content.dispatchState;
                                            if (dispatchState === 'DONE') {
                                                resolve(status);
                                                return Promise.resolve(status);
                                            }
                                            return waitUntilDone();
                                        })
                                        .catch(reject);
                                };
                                waitUntilDone(); // start
                            });
                        })
                        .then(() => {
                            uri = `${baseUri}/${sid}/results/?${outputMode}`;
                            return util.makeRequest(CONSUMER_HOST.ip, uri, options);
                        });
                };
                // end helper function

                DUTS.forEach((dut) => {
                    // use earliest and latests query modifiers to filter results
                    const searchMetrics = () => `| mcatalog values(metric_name) WHERE index=* AND host="${dut.hostname}" AND earliest=-30s latest=now`;
                    const searchQuerySP = () => `search source=f5.telemetry earliest=-30s latest=now | search "system.hostname"="${dut.hostname}" | head 1`;
                    const searchQueryEL = () => `search source=f5.telemetry | spath testType | search testType="${SPLUNK_CONSUMER_NAME}" | search hostname="${dut.hostname}" | search testDataTimestamp="${testDataTimestamp}" | head 1`;

                    if (testSetup.format.queryEventsTests) {
                        it(`should check for system poller data from:${dut.hostalias}`, () => new Promise((resolve) => { setTimeout(resolve, 30000); })
                            .then(() => {
                                util.logger.info(`Splunk search query for system poller data: ${searchQuerySP()}`);
                                return query(searchQuerySP());
                            })
                            .then((data) => {
                                util.logger.info('Splunk response:', data);
                                // check we have results
                                const results = data.results;
                                assert.strictEqual(results.length > 0, true, 'No results');
                                // check that the event is what we expect
                                const result = results[0];
                                const rawData = JSON.parse(result._raw);
                                // validate raw data against schema
                                const schema = JSON.parse(fs.readFileSync(constants.DECL.SYSTEM_POLLER_SCHEMA));
                                const valid = util.validateAgainstSchema(rawData, schema);
                                if (valid !== true) {
                                    assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                                }
                                // validate data parsed by Splunk
                                assert.strictEqual(result.host, dut.hostname);
                                assert.strictEqual(result.source, splunkSourceStr);
                                assert.strictEqual(result.sourcetype, splunkSourceTypeStr);
                            }));
                    }

                    if (testSetup.format.metricsTests) {
                        it(`should check for system poller metrics from:${dut.hostalias}`, () => new Promise((resolve) => { setTimeout(resolve, 30000); })
                            .then(() => {
                                util.logger.info(`Splunk search query for system poller data: ${searchMetrics()}`);
                                return query(searchMetrics());
                            })
                            .then((data) => {
                                util.logger.info('Splunk response:', data);
                                // check we have results
                                const results = data.results;
                                assert.strictEqual(results.length > 0, true, 'No results');
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
                            }));
                    }

                    if (testSetup.format.eventListenerTests) {
                        it(`should check for event listener data from:${dut.hostalias}`, () => new Promise((resolve) => { setTimeout(resolve, 30000); })
                            .then(() => {
                                util.logger.info(`Splunk search query for event listener data: ${searchQueryEL()}`);
                                return query(searchQueryEL());
                            })
                            .then((data) => {
                                util.logger.info('Splunk response:', data);
                                // check we have results
                                const results = data.results;
                                assert.strictEqual(results.length > 0, true, 'No results');
                                // check that the event is what we expect
                                const result = results[0];
                                const rawData = JSON.parse(result._raw);

                                assert.strictEqual(rawData.testType, SPLUNK_CONSUMER_NAME);
                                assert.strictEqual(rawData.hostname, dut.hostname);
                                // validate data parsed by Splunk
                                assert.strictEqual(result.host, dut.hostname);
                                assert.strictEqual(result.source, splunkSourceStr);
                                assert.strictEqual(result.sourcetype, splunkSourceTypeStr);
                                assert.strictEqual(result.hostname, dut.hostname);
                                assert.strictEqual(result.testType, SPLUNK_CONSUMER_NAME);
                                assert.strictEqual(result.testDataTimestamp, `${testDataTimestamp}`);
                            }));
                    }
                });
            });
        });
    });
}

function teardown() {
    describe('Consumer Test: Splunk - teardown', () => {
        it('should remove container', () => runRemoteCmd(`docker container rm -f ${SPLUNK_CONTAINER_NAME}`));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
