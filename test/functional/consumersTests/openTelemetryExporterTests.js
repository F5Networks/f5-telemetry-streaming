/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const assert = require('assert');
const fs = require('fs');
const testUtil = require('../shared/util');
const utils = require('../../../src/lib/utils/misc');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const DUTS = testUtil.getHosts('BIGIP');
const SHOULD_SKIP_TESTS = {};

const CONSUMER_HOST = testUtil.getHosts('CONSUMER')[0]; // only expect one
const OTEL_METRICS_PATH = '/v1/metrics';
const OTEL_COLLECTOR_IMAGE_NAME = `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}otel/opentelemetry-collector-contrib`;
const OTEL_COLLECTOR_NAME = 'otel-collector';
const OTEL_COLLECTOR_HOST = CONSUMER_HOST.ip;
const OTEL_COLLECTOR_FOLDER = 'otel';
const OTEL_COLLECTOR_CONF_FILE = 'config.yaml';
const OTEL_COLLECTOR_RECEIVER_PORT = 55681;
const OTEL_COLLECTOR_PROMETHEUS_PORT = 9088;
const OTEL_COLLECTOR_CONSUMER_NAME = 'OpenTelemetry_Consumer';
const OTEL_COLLECTOR_CONF = `receivers:
  otlp:
    protocols:
      http:

processors:
  batch:

exporters:
  prometheus:
    endpoint: "0.0.0.0:${OTEL_COLLECTOR_PROMETHEUS_PORT}"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]`;

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC));


function runRemoteCmd(cmd) {
    return testUtil.performRemoteCmd(
        CONSUMER_HOST.ip, CONSUMER_HOST.username, cmd, { password: CONSUMER_HOST.password }
    );
}

function setup() {
    describe('Consumer Setup: OpenTelemetry Exporter', () => {
        it('should pull OpenTelemetry Collector docker image', () => runRemoteCmd(`docker pull ${OTEL_COLLECTOR_IMAGE_NAME}`));

        it('should write OpenTelemetry Collector configuration', () => runRemoteCmd(`mkdir -p ${OTEL_COLLECTOR_FOLDER} && echo "${OTEL_COLLECTOR_CONF}" > ${OTEL_COLLECTOR_FOLDER}/${OTEL_COLLECTOR_CONF_FILE}`));

        it('should start OpenTelemetry Collector docker container', () => {
            const otelCollectorParams = `-p ${OTEL_COLLECTOR_RECEIVER_PORT}:${OTEL_COLLECTOR_RECEIVER_PORT} -p ${OTEL_COLLECTOR_PROMETHEUS_PORT}:${OTEL_COLLECTOR_PROMETHEUS_PORT} -v $(pwd)/${OTEL_COLLECTOR_FOLDER}/${OTEL_COLLECTOR_CONF_FILE}:/etc/otel/config.yaml`;
            const cmdOtelCollector = `docker run -d ${otelCollectorParams} --name ${OTEL_COLLECTOR_NAME} ${OTEL_COLLECTOR_IMAGE_NAME}`;

            // simple check to see if OpenTelemetry Collector container already exists
            return runRemoteCmd(`docker ps | grep ${OTEL_COLLECTOR_NAME}`)
                .then((data) => {
                    if (data) {
                        return Promise.resolve(); // exists, continue
                    }
                    return runRemoteCmd(cmdOtelCollector);
                });
        });

        DUTS.forEach(dut => it(
            `get bigip version and check if version is high enough for OpenTelemetry Exporter - ${dut.hostalias}`,
            () => testUtil.getBigipVersion(dut)
                .then((response) => {
                    // OpenTelemetry Exporter consumer is supported on bigip 14.1 and above
                    SHOULD_SKIP_TESTS[dut.hostalias] = utils.compareVersionStrings(response, '<', '14.1');
                })
        ));
    });
}

function test() {
    const verifyResponse = (response, dutHostname) => {
        const dutSystemMemoryRegex = new RegExp(`\\nsystem_memory{.*hostname="${dutHostname}".*} \\d{1,2}\\n`);
        const mockAVRMetricRegex = new RegExp(`\\nfunctionalTestMetric{.*hostname="${dutHostname}".*} 147\\n`);

        assert.notStrictEqual(
            response.indexOf('# HELP system_tmmCpu system.tmmCpu'),
            -1,
            'help text should exist, and contain original metric name'
        );

        assert.notStrictEqual(
            response.indexOf('# TYPE system_tmmCpu gauge'),
            -1,
            'metric type should be of type \'gauge\''
        );

        assert.ok(
            dutSystemMemoryRegex.test(response),
            'response should include \'system_memory\' metric with appropriate label, and a value'
        );

        assert.ok(
            mockAVRMetricRegex.test(response),
            'response should include \'functionalTestMetric\' metric with appropriate label, and a value'
        );
    };

    describe('Consumer Test: OpenTelemetry Exporter - Configure TS and generate data', () => {
        const consumerDeclaration = testUtil.deepCopy(DECLARATION);
        delete consumerDeclaration.My_Consumer;
        consumerDeclaration[OTEL_COLLECTOR_CONSUMER_NAME] = {
            class: 'Telemetry_Consumer',
            type: 'OpenTelemetry_Exporter',
            host: OTEL_COLLECTOR_HOST,
            port: OTEL_COLLECTOR_RECEIVER_PORT,
            metricsPath: `${OTEL_METRICS_PATH}`
        };
        DUTS.forEach((dut) => {
            it(`should configure TS - ${dut.hostalias}`, function () {
                if (SHOULD_SKIP_TESTS[dut.hostalias]) {
                    this.skip();
                }
                return dutUtils.postDeclarationToDUT(dut, testUtil.deepCopy(consumerDeclaration));
            });

            it(`should send known event to TS Event Listener - ${dut.hostalias}`, function () {
                if (SHOULD_SKIP_TESTS[dut.hostalias]) {
                    this.skip();
                }
                const mockMsgAVR = `EOCTimestamp="1231232",hostname="${dut.hostname}",functionalTestMetric="147"`;
                return dutUtils.sendDataToEventListener(dut, mockMsgAVR, { numOfMsg: 4 });
            });
        });
    });

    describe('Consumer Test: OpenTelemetry Exporter - Tests', () => {
        DUTS.forEach((dut) => {
            it(`should check the OpenTelemetry Collector for published data data for - ${dut.hostalias}`, function () {
                if (SHOULD_SKIP_TESTS[dut.hostalias]) {
                    this.skip();
                }
                const httpOptions = {
                    method: 'GET',
                    port: OTEL_COLLECTOR_PROMETHEUS_PORT,
                    protocol: 'http'
                };

                testUtil.logger.info('Delay 15000ms to ensure data is sent to OpenTelemetry Collector');
                return testUtil.sleep(15 * 1000)
                    .then(() => testUtil.makeRequest(OTEL_COLLECTOR_HOST, '/metrics', httpOptions))
                    .then(response => verifyResponse(response, dut.hostname));
            });
        });
    });
}

function teardown() {
    describe('Consumer Teardown: OpenTelemetry Exporter', () => {
        it('should remove OpenTelemetry Collector container', () => runRemoteCmd(`docker container rm -f ${OTEL_COLLECTOR_NAME}`));
        it('should remove OpenTelemetry Collector configuration file', () => runRemoteCmd(`rm -rf ${OTEL_COLLECTOR_FOLDER}`));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
