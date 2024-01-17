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
const pathUtil = require('path');

const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const logger = require('../shared/utils/logger').getChild('otelTests');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const srcMiscUtils = require('../../../src/lib/utils/misc');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/openTelemetryExporter
 */

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const OTEL_EXPORTERS = [
    'grpc',
    'json',
    'protobuf'
];
const OTEL_METRICS_PATH = '/v1/metrics';
const OTEL_COLLECTOR_FOLDER = 'otel';
const OTEL_COLLECTOR_CONF_FILE = 'config.yaml';
const OTEL_COLLECTOR_GRPC_RECEIVER_PORT = 55681;
const OTEL_COLLECTOR_HTTP_RECEIVER_PORT = 55682;
const OTEL_COLLECTOR_PROMETHEUS_PORT = 9088;
const OTEL_COLLECTOR_CONSUMER_NAME = 'OpenTelemetry_Consumer';
const OTEL_COLLECTOR_CONF = `receivers:
  otlp:
    protocols:
      grpc:
        endpoint: ":${OTEL_COLLECTOR_GRPC_RECEIVER_PORT}"
      http:
        endpoint: ":${OTEL_COLLECTOR_HTTP_RECEIVER_PORT}"

processors:
  batch:

exporters:
  prometheus:
    endpoint: ":${OTEL_COLLECTOR_PROMETHEUS_PORT}"
    metric_expiration: 1m
    send_timestamps: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
  telemetry:
    logs:
      level: "verbose"
`;

const DOCKER_CONTAINERS = {
    OTELCollector: {
        detach: true,
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}otel/opentelemetry-collector-contrib`,
        name: 'otel-collector',
        publish: {
            [OTEL_COLLECTOR_GRPC_RECEIVER_PORT]: OTEL_COLLECTOR_GRPC_RECEIVER_PORT,
            [OTEL_COLLECTOR_HTTP_RECEIVER_PORT]: OTEL_COLLECTOR_HTTP_RECEIVER_PORT,
            [OTEL_COLLECTOR_PROMETHEUS_PORT]: OTEL_COLLECTOR_PROMETHEUS_PORT
        },
        restart: 'always',
        volume: {
            [`$(pwd)/${OTEL_COLLECTOR_FOLDER}/${OTEL_COLLECTOR_CONF_FILE}`]: '/etc/otelcol-contrib/config.yaml'
        }
    }
};

// read in example config
const DECLARATION = testUtils.alterPollerInterval(miscUtils.readJsonFile(constants.DECL.BASIC));
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

let CONTAINER_STARTED;
let SHOULD_SKIP_DUE_VERSION;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: OpenTelemetry Exporter', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harnessUtils.getDefaultHarness().other[0];
        cs.http.createAndSave('otel', {
            port: OTEL_COLLECTOR_PROMETHEUS_PORT,
            protocol: 'http',
            retry: {
                maxTries: 10,
                delay: 1000
            }
        });

        describe('Clean-up TS before service configuration', () => {
            harness.bigip
                .forEach((bigip) => testUtils.shouldRemovePreExistingTSDeclaration(bigip));
        });

        describe('Docker container setup', () => {
            before(() => {
                CONTAINER_STARTED = false;
                SHOULD_SKIP_DUE_VERSION = {};
            });

            it('should pull OTEL docker image', () => cs.docker.pull(DOCKER_CONTAINERS.OTELCollector.image, { existing: true }));

            it('should remove pre-existing OTEL docker container', () => harnessUtils.docker.stopAndRemoveContainer(
                cs.docker,
                DOCKER_CONTAINERS.OTELCollector.name
            ));

            it('should write OTEL configuration', () => cs.ssh.default.mkdirIfNotExists(OTEL_COLLECTOR_FOLDER)
                .then(() => cs.ssh.default.writeToFile(
                    pathUtil.join(OTEL_COLLECTOR_FOLDER, OTEL_COLLECTOR_CONF_FILE),
                    OTEL_COLLECTOR_CONF
                )));

            it('should start new OTEL docker container', () => harnessUtils.docker.startNewContainer(
                cs.docker,
                DOCKER_CONTAINERS.OTELCollector
            )
                .then(() => {
                    CONTAINER_STARTED = true;
                }));
        });

        describe('Gather information about DUTs version', () => {
            harness.bigip.forEach((bigip) => it(
                `should get bigip version and check if version is high enough for OpenTelemetry Exporter - ${bigip.name}`,
                () => bigip.icAPI.default.getSoftwareVersion()
                    .then((version) => {
                        // OpenTelemetry Exporter consumer is supported on bigip 14.1 and above
                        SHOULD_SKIP_DUE_VERSION[bigip.hostname] = srcMiscUtils.compareVersionStrings(version, '<', '14.1');

                        logger.info('DUT\' version', {
                            hostname: bigip.hostname,
                            shouldSkipTests: SHOULD_SKIP_DUE_VERSION[bigip.hostname],
                            version
                        });
                    })
            ));
        });
    });
}

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: OpenTelemetry Exporter', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harness.other[0];
        const testDataTimestamp = Date.now();

        /**
         * @returns {boolean} true if DUt satisfies version restriction
         */
        const isValidDut = (dut) => !SHOULD_SKIP_DUE_VERSION[dut.hostname];

        before(() => {
            assert.isOk(CONTAINER_STARTED, 'should start OTEL container!');
        });

        function generateTestsForExporter(exporter, last) {
            function getConsumerDeclaration() {
                return {
                    class: 'Telemetry_Consumer',
                    type: 'OpenTelemetry_Exporter',
                    host: cs.host.host,
                    port: exporter === 'grpc' ? OTEL_COLLECTOR_GRPC_RECEIVER_PORT : OTEL_COLLECTOR_HTTP_RECEIVER_PORT,
                    exporter
                };
            }

            describe('Configure TS and generate data', () => {
                let consumerDeclaration;

                before(() => {
                    consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                    consumerDeclaration[OTEL_COLLECTOR_CONSUMER_NAME] = getConsumerDeclaration();
                    if (exporter === 'grpc') {
                        consumerDeclaration[OTEL_COLLECTOR_CONSUMER_NAME].useSSL = false;
                    } else {
                        consumerDeclaration[OTEL_COLLECTOR_CONSUMER_NAME].metricsPath = OTEL_METRICS_PATH;
                    }
                });

                testUtils.shouldConfigureTS(harness.bigip, (bigip) => (isValidDut(bigip)
                    ? miscUtils.deepCopy(consumerDeclaration)
                    : null));

                testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => (isValidDut(bigip)
                    ? `functionalTestMetric="147",EOCTimestamp="1231232",hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${OTEL_COLLECTOR_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}",exporter="${exporter}"`
                    : null));
            });

            describe('Event Listener data', () => {
                harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
                    .forEach((proto) => it(
                        `should check OTEL for event listener data (over ${proto}) for - ${bigip.name}`,
                        function () {
                            if (!isValidDut(bigip)) {
                                return this.skip();
                            }
                            return cs.http.otel.makeRequest({
                                uri: '/metrics'
                            })
                                .then((data) => {
                                    const hostnameRegex = new RegExp(`functionalTestMetric{.*hostname="${bigip.hostname}".*} 147`);
                                    const exporterRegex = new RegExp(`functionalTestMetric{.*exporter="${exporter}".*} 147`);
                                    assert.isOk(
                                        data.split('\n')
                                            .some((line) => hostnameRegex.test(line)
                                            && exporterRegex.test(line)
                                            && line.indexOf(`protocol="${proto}"`) !== -1),
                                        `should have metrics(s) for a data from event listener (over ${proto})`
                                    );
                                })
                                .catch((err) => {
                                    bigip.logger.info('No event listener data found. Going to wait another 20 sec.');
                                    return promiseUtils.sleepAndReject(20000, err);
                                });
                        }
                    )));
            });

            describe('System Poller data', () => {
                harness.bigip.forEach((bigip) => it(
                    `should check OTEL for system poller data - ${bigip.name}`,
                    function () {
                        if (!isValidDut(bigip)) {
                            return this.skip();
                        }
                        return cs.http.otel.makeRequest({
                            uri: '/metrics'
                        })
                            .then((data) => {
                                const dutSystemMemoryRegex = new RegExp(`system_memory{.*hostname="${bigip.hostname}".*} \\d{1,2}`);
                                assert.isOk(
                                    data.split('\n')
                                        .some((line) => dutSystemMemoryRegex.test(line)),
                                    'should have metric(s) for a data from system poller'
                                );
                            })
                            .catch((err) => {
                                bigip.logger.error('Waiting for data to be indexed...', err);
                                // more sleep time for system poller data to be indexed
                                return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data', err);
                            });
                    }
                ));
            });

            if (!last) {
                describe('Stop TS sending data to Open Telemetry Collector', () => {
                    let consumerDeclaration;

                    before(() => {
                        consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                        consumerDeclaration[OTEL_COLLECTOR_CONSUMER_NAME] = getConsumerDeclaration();
                        consumerDeclaration[OTEL_COLLECTOR_CONSUMER_NAME].enable = false;
                    });

                    testUtils.shouldConfigureTS(harness.bigip, (bigip) => (isValidDut(bigip)
                        ? miscUtils.deepCopy(consumerDeclaration)
                        : null));

                    it('should wait till metrics expired', () => cs.http.otel.makeRequest({
                        uri: '/metrics'
                    })
                        .then((data) => {
                            const dutSystemMemoryRegex = /system_memory\{.*hostname=.*\}/;
                            const mockAVRMetricRegex = /functionalTestMetric.*147/;

                            assert.isNotOk(
                                data.split('\n')
                                    .some((line) => dutSystemMemoryRegex.test(line) || mockAVRMetricRegex.test(line)),
                                'should have no metric(s) for a data from system poller and event listener'
                            );
                        })
                        .catch((err) => {
                            cs.logger.info('Metrics are not expired yet. Going to wait another 20 sec.');
                            return promiseUtils.sleepAndReject(20000, err);
                        }));
                });
            }
        }

        OTEL_EXPORTERS.forEach((exporter, idx) => {
            describe(`Exporter = ${exporter}`, () => generateTestsForExporter(exporter, idx === OTEL_EXPORTERS.length - 1));
        });
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer Teardown: OpenTelemetry Exporter', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        it('should stop and remove OTEL docker container', () => harnessUtils.docker.stopAndRemoveContainer(
            cs.docker,
            DOCKER_CONTAINERS.OTELCollector.name
        ));

        it('should remove OTEL configuration file', () => cs.ssh.default.unlinkIfExists(pathUtil.join(OTEL_COLLECTOR_FOLDER, OTEL_COLLECTOR_CONF_FILE)));

        it('should remove OTEL directory', () => cs.ssh.default.rmdirIfExists(OTEL_COLLECTOR_FOLDER));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
