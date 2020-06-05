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
const deepDiff = require('deep-diff');
const util = require('../shared/util');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const DUTS = util.getHosts('BIGIP');
const CONSUMER_HOST = util.getHosts('CONSUMER')[0]; // only expect one
const STATSD_IMAGE_NAME = 'graphiteapp/graphite-statsd:latest';
const STATSD_CONTAINER_NAME = 'ts_statsd_consumer';
const STATSD_HTTP_PROTO = 'http';
const STATSD_HTTP_PORT = 80;
const STATSD_DATA_PORT = 8125;
const STATSD_CONSUMER_NAME = 'StatsD_Consumer';
const STATSD_PROTOCOLS = ['tcp', 'udp'];

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));


function runRemoteCmd(cmd) {
    return util.performRemoteCmd(CONSUMER_HOST.ip, CONSUMER_HOST.username, cmd, { password: CONSUMER_HOST.password });
}

function setup() {
    describe('Consumer Setup: Statsd - pull docker image', () => {
        it('should pull container image', () => runRemoteCmd(`docker pull ${STATSD_IMAGE_NAME}`));
    });
}

function test() {
    STATSD_PROTOCOLS.forEach(protocol => describe(`Consumer Test: Statsd | Protocol: ${protocol}`, () => {
        const containerName = `${STATSD_CONTAINER_NAME}-${protocol}`;
        describe('Consumer Test: Statsd - Configure Service', () => {
            it('should start container', () => {
                const portArgs = `-p ${STATSD_HTTP_PORT}:${STATSD_HTTP_PORT} -p ${STATSD_DATA_PORT}:${STATSD_DATA_PORT}/${protocol} -e STATSD_INTERFACE=${protocol}`;
                const cmd = `docker run -d --restart=always --name ${containerName} ${portArgs} ${STATSD_IMAGE_NAME}`;

                // simple check to see if container already exists
                return runRemoteCmd(`docker ps | grep ${containerName}`)
                    .then((data) => {
                        if (data) {
                            return Promise.resolve(); // exists, continue
                        }
                        return runRemoteCmd(cmd);
                    });
            });

            it('should check service is up', () => {
                const uri = '/render?someUnknownKey&format=json';
                const options = {
                    port: STATSD_HTTP_PORT,
                    protocol: STATSD_HTTP_PROTO

                };

                // splunk container takes about 30 seconds to come up
                return new Promise(resolve => setTimeout(resolve, 3000))
                    .then(() => util.makeRequest(CONSUMER_HOST.ip, uri, options))
                    .then((data) => {
                        util.logger.info('Statsd response:', data);
                        assert.strictEqual(Array.isArray(data), true);
                        assert.strictEqual(data.length, 0);
                    });
            });
        });

        describe('Consumer Test: Statsd - Configure TS', () => {
            const consumerDeclaration = util.deepCopy(DECLARATION);
            consumerDeclaration[STATSD_CONSUMER_NAME] = {
                class: 'Telemetry_Consumer',
                type: 'Statsd',
                host: CONSUMER_HOST.ip,
                protocol,
                port: STATSD_DATA_PORT
            };
            DUTS.forEach(dut => it(
                `should configure TS - ${dut.hostname}`,
                () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(consumerDeclaration))
            ));
        });

        describe('Consumer Test: Statsd - Test', () => {
            /**
             * Note: statsd/graphite stores only counters, no strings.
             * Verification is simple - just check that at least one metric is not empty
             */
            // helper function to query statsd for data
            const query = (searchString) => {
                const uri = `/render?target=stats.gauges.${searchString}&format=json&from=-3minutes`;
                const options = {
                    port: STATSD_HTTP_PORT,
                    protocol: STATSD_HTTP_PROTO
                };

                return util.makeRequest(CONSUMER_HOST.ip, uri, options)
                    .then(data => Promise.resolve([searchString, data]));
            };

            const stripMetrics = (data) => {
                Object.keys(data).forEach((item) => {
                    if (Number.isInteger(data[item])) {
                        delete data[item];
                    } else if (typeof data[item] === 'object') {
                        stripMetrics(data[item]);
                    }
                });
            };

            const getMetricsName = (data) => {
                const copyData = JSON.parse(JSON.stringify(data));
                stripMetrics(copyData);
                const diff = deepDiff(copyData, data) || [];

                // add prefixes to support multiple BIG-IP(s) in a single statsd instance
                const basePrefix = 'f5telemetry';
                let hostnamePrefix = 'base.bigip.com';
                try {
                    // if this consumer processes other events besides system info
                    // in the future, this will always fail
                    hostnamePrefix = data.system.hostname;
                } catch (error) {
                    // leave it as is
                }
                // account for item in path having '.' or '/'
                return diff.map(item => [
                    basePrefix,
                    hostnamePrefix
                ].concat(item.path).map(i => i.replace(/\.|\/|:/g, '-')).join('.'));
            };

            const verifyMetrics = (metrics) => {
                let idx = 0;
                let hasIndexed = false;

                const getNextMetrics = () => {
                    const promises = [];

                    for (let i = 0; i < 4 && idx < metrics.length; i += 1) {
                        promises.push(query(metrics[idx]));
                        idx += 1;
                    }
                    return Promise.all(promises)
                        .then((data) => {
                            data.forEach((item) => {
                                /**
                                 * item = [metricName, data]
                                 * data is array of objects like { targets: {}, tags: {}, datapoints: []}
                                 */
                                if (Array.isArray(item[1]) && item[1].length > 0
                                    && item[1][0].datapoints && item[1][0].datapoints.length > 0) {
                                    util.logger.info(`Metic ${item[0]}: `, item[1]);
                                    hasIndexed = true;
                                }
                            });
                            if (hasIndexed) {
                                return Promise.resolve();
                            }
                            if (idx < metrics.length) {
                                return getNextMetrics();
                            }
                            /**
                             * Reasons for retry:
                             * - indexing is strill in process
                             * - system poller not sent data yet
                             * Sleep for 30 second(s) and return Promise.reject to allow retry
                             */
                            util.logger.info('Waiting for data to be indexed...');
                            return new Promise(resolveTimer => setTimeout(resolveTimer, 30000))
                                .then(() => Promise.reject(new Error('Metrics are empty / not indexed')));
                        });
                };
                return getNextMetrics();
            };

            // end helper function

            const sysPollerMetricsData = {};

            it('should fetch system poller data via debug endpoint from DUTs', () => dutUtils.getSystemPollersData((hostObj, data) => {
                sysPollerMetricsData[hostObj.hostname] = getMetricsName(data[0]);
            }));

            DUTS.forEach((dut) => {
                // at first we need to retrieve list of metrics to poll
                it(`should check for system poller data from - ${dut.hostname}`, () => {
                    const metrics = sysPollerMetricsData[dut.hostname];
                    if (!metrics) {
                        throw new Error(`No System Poller Metrics data for ${dut.hostname} !`);
                    }
                    // all metrics should be non-empty array - it means they were added to index
                    return verifyMetrics(metrics);
                });
            });
        });

        // Just stop the container, so we can reuse ports on next run
        describe('Consumer Test: Statsd - Stop container', () => {
            it('should remove container(s)', () => runRemoteCmd(`docker stop ${containerName}`));
        });
    }));
}

function teardown() {
    describe('Consumer Test: Statsd - teardown', () => {
        STATSD_PROTOCOLS.forEach(protocol => it(
            `should remove ${protocol} container(s)`, () => runRemoteCmd(`docker container rm -f ${STATSD_CONTAINER_NAME}-${protocol}`)
        ));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
