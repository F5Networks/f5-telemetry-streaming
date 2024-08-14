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
const deepDiff = require('deep-diff');

const constants = require('../shared/constants');
const DEFAULT_HOSTNAME = require('../../../src/lib/constants').DEFAULT_HOSTNAME;
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/statsd
 */

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const STATSD_DEFAULT_DATA_PORT = 8125;
const STATSD_DEFAULT_HTTP_PORT = 8080;
const STATSD_DEFAULT_HTTP_PROTO = 'http';
const STATSD_DEFAULT_HTTP_TIMEOUT = 10000;

const STATSD_DOCKER_CONF = {
    detach: true,
    image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}graphiteapp/graphite-statsd:latest`,
    restart: 'always'
};

const STATSD_CONFIGS = {
    tcp: {
        CONSUMER_NAME: 'StatsD_Consumer_TCP',
        DATA_PORT: 58125,
        HTTP_PORT: 58080,
        SERVICE_NAME: 'StatsD_TCP'
    },
    udp: {
        CONSUMER_NAME: 'StatsD_Consumer_UDP',
        DATA_PORT: 58126,
        HTTP_PORT: 58081,
        SERVICE_NAME: 'StatsD_UDP'
    }
};

const DOCKER_CONTAINERS = {
    StatsD_TCP: Object.assign(miscUtils.deepCopy(STATSD_DOCKER_CONF), {
        env: {
            GOCARBON: 1,
            STATSD_INTERFACE: 'tcp'
        },
        name: 'ts_statsd_consumer_tcp',
        publish: {
            [STATSD_CONFIGS.tcp.DATA_PORT]: `${STATSD_DEFAULT_DATA_PORT}/tcp`,
            [STATSD_CONFIGS.tcp.HTTP_PORT]: STATSD_DEFAULT_HTTP_PORT
        }
    }),
    StatsD_UDP: Object.assign(miscUtils.deepCopy(STATSD_DOCKER_CONF), {
        env: {
            GOCARBON: 1,
            STATSD_INTERFACE: 'udp'
        },
        name: 'ts_statsd_consumer_udp',
        publish: {
            [STATSD_CONFIGS.udp.DATA_PORT]: `${STATSD_DEFAULT_DATA_PORT}/udp`,
            [STATSD_CONFIGS.udp.HTTP_PORT]: STATSD_DEFAULT_HTTP_PORT
        }
    })
};

// read in example config
const DECLARATION = testUtils.alterPollerInterval(miscUtils.readJsonFile(constants.DECL.BASIC));

let SERVICES_ARE_READY;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: StatsD', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];
        let CONTAINERS_STARTED;

        Object.keys(STATSD_CONFIGS).forEach((proto) => {
            cs.http.createAndSave(`${proto}Statsd`, {
                port: STATSD_CONFIGS[proto].HTTP_PORT,
                protocol: STATSD_DEFAULT_HTTP_PROTO,
                timeout: STATSD_DEFAULT_HTTP_TIMEOUT
            });
        });

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

            it('should pull StatsD docker image', () => cs.docker.pull(DOCKER_CONTAINERS.StatsD_TCP.image, { existing: true }));

            Object.keys(STATSD_CONFIGS).forEach((proto) => {
                it(`should remove pre-existing StatsD docker container (over ${proto})`, () => harnessUtils.docker.stopAndRemoveContainer(
                    cs.docker, DOCKER_CONTAINERS[STATSD_CONFIGS[proto].SERVICE_NAME].name
                ));
            });

            Object.keys(STATSD_CONFIGS).forEach((proto) => {
                it(`should start new StatsD container (over ${proto})`, () => harnessUtils.docker.startNewContainer(
                    cs.docker, DOCKER_CONTAINERS[STATSD_CONFIGS[proto].SERVICE_NAME]
                )
                    .then(() => {
                        CONTAINERS_STARTED.push(true);
                    }));
            });
        });

        describe('Configure service', () => {
            before(() => {
                assert.isOk(CONTAINERS_STARTED, 'should start StatsD TCP and UDP containers!');
                SERVICES_ARE_READY = [];
            });

            after(() => {
                SERVICES_ARE_READY = SERVICES_ARE_READY.every((v) => v);
            });

            Object.keys(STATSD_CONFIGS).forEach((proto) => {
                it(`should check StatsD container is up and running (over ${proto})`, () => cs.http[`${proto}Statsd`].makeRequest({
                    retry: {
                        maxTries: 10,
                        delay: 1000
                    },
                    uri: '/render?someUnknownKey&format=json'
                })
                    .then((data) => {
                        cs.logger.info('StatsD response', { data, proto });
                        assert.isArray(data);
                        assert.isEmpty(data);
                        SERVICES_ARE_READY.push(true);
                    }));
            });
        });
    });
}

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: StatsD', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harness.other[0];
        const sysPollerMetricNames = {};

        before(() => {
            assert.isOk(SERVICES_ARE_READY, 'should start StatsD TCP and UDP services!');
        });

        describe('Configure TS and generate data', () => {
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                Object.keys(STATSD_CONFIGS).forEach((proto) => {
                    const config = STATSD_CONFIGS[proto];
                    consumerDeclaration[config.CONSUMER_NAME] = {
                        class: 'Telemetry_Consumer',
                        type: 'Statsd',
                        host: cs.host.host,
                        protocol: proto,
                        port: config.DATA_PORT
                    };
                });
            });

            testUtils.shouldConfigureTS(harness.bigip, () => consumerDeclaration);
        });

        describe('System Poller data', () => {
            /**
             * Note: statsd/graphite stores only counters, no strings.
             * Verification is simple - just check that at least one metric is not empty
             */
            /**
             * Query metrics from StatsD
             *
             * @param {string} searchString - search string
             *
             * @returns {Promise<Array<string, string>>} resolved with search results
             */
            const queryStatsD = (proto, searchString) => cs.http[`${proto}Statsd`].makeRequest({
                retry: {
                    maxTries: 10,
                    delay: 200
                },
                uri: `/render?target=stats.gauges.${searchString}&format=json&from=-3minutes`
            })
                .then((data) => [searchString, data]);

            /**
             * Remove metrics from data
             *
             * @param {Object} data - data
             */
            const stripMetrics = (data) => {
                Object.keys(data).forEach((item) => {
                    if (Number.isInteger(data[item])) {
                        delete data[item];
                    } else if (typeof data[item] === 'object') {
                        stripMetrics(data[item]);
                    }
                });
            };

            /**
             * Get metric names from data
             *
             * @param {Object} data - data
             *
             * @returns {Array<string>} array of metric names
             */
            const getMetricNames = (data) => {
                const copyData = miscUtils.deepCopy(data);
                stripMetrics(copyData);
                const diff = deepDiff(copyData, data) || [];

                // add prefixes to support multiple BIG-IP(s) in a single statsd instance
                const basePrefix = 'f5telemetry';
                const hostnamePrefix = data.system ? data.system.hostname : DEFAULT_HOSTNAME;

                // account for item in path having '.' or '/'
                return diff.map((item) => [
                    basePrefix,
                    hostnamePrefix
                ].concat(item.path).map((i) => i.replace(/\.|\/|:/g, '-')).join('.'));
            };

            harness.bigip.forEach((bigip) => it(
                `should fetch system poller data via debug endpoint - ${bigip.name}`,
                () => bigip.telemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME, 'SystemPoller_1')
                    .then((data) => {
                        sysPollerMetricNames[bigip.hostname] = getMetricNames(data);
                    })
            ));

            Object.keys(STATSD_CONFIGS).forEach(
                (proto) => harness.bigip.forEach((bigip) => it(
                    `should check StatsD for system poller data - ${bigip.name} (over ${proto})`,
                    () => {
                        const metricNames = sysPollerMetricNames[bigip.hostname];
                        let metricsFound = false;

                        assert.isNotEmpty(metricNames, 'should have metric names from system poller data');

                        return promiseUtils.loopForEach(
                            metricNames,
                            (metricName, idx, arr, breakCb) => queryStatsD(proto, metricName)
                                .then((queryRet) => {
                                    /**
                                     * queryRet = [metricName, data]
                                     * data is array of objects like { targets: {}, tags: {}, datapoints: []}
                                     */
                                    const data = queryRet[1];
                                    if (Array.isArray(data) && data.length > 0
                                        && data[0].datapoints && data[0].datapoints.length > 0) {
                                        bigip.logger.info('StatsD metric was found', { idx, queryRet });
                                        metricsFound = true;
                                        return breakCb();
                                    }
                                    return Promise.resolve();
                                })
                        )
                            .then(() => {
                                if (metricsFound) {
                                    return Promise.resolve();
                                }
                                bigip.logger.error('Waiting for data to be indexed...');
                                // more sleep time for system poller data to be indexed
                                return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data');
                            });
                    }
                ))
            );
        });
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer Teardown: StatsD', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        Object.keys(STATSD_CONFIGS).forEach((proto) => it(
            `should stop and remove StatsD docker container (${proto} data transport)`,
            () => harnessUtils.docker.stopAndRemoveContainer(
                cs.docker, DOCKER_CONTAINERS[STATSD_CONFIGS[proto].SERVICE_NAME].name
            )
        ));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
