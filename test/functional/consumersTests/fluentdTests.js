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
const util = require('../shared/util');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

const DUTS = util.getHosts('BIGIP');

const CONSUMER_HOST = util.getHosts('CONSUMER')[0]; // only expect one
const FLUENTD_IMAGE_NAME = `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}fluent/fluentd:v1.6-debian-1`;
const FLUENTD_NAME = 'fluentd-server';
const FLUENTD_HOST = CONSUMER_HOST.ip;
const FLUENTD_FOLDER = 'fluentd';
const FLUENTD_CONF_FILE = 'fluentd.conf';
const FLUENTD_PROTOCOL = 'http';
const FLUENTD_TAG_NAME = 'bigip.ts';
const FLUENTD_PORT = 9880;
const FLUENTD_CONSUMER_NAME = 'Fluentd_Consumer';
const FLUENTD_CONF = `<source>
  @type http
  port 9880
  bind 0.0.0.0
</source>

<match ${FLUENTD_TAG_NAME}>
  @type stdout
</match>`;

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC));

function runRemoteCmd(cmd) {
    return util.performRemoteCmd(CONSUMER_HOST.ip, CONSUMER_HOST.username, cmd, { password: CONSUMER_HOST.password });
}

function setup() {
    describe('Consumer Setup: Fluentd', () => {
        it('should pull Fluentd docker image', () => runRemoteCmd(`docker pull ${FLUENTD_IMAGE_NAME}`));

        it('should write Fluentd configuration', () => runRemoteCmd(`mkdir ${FLUENTD_FOLDER} && echo "${FLUENTD_CONF}" > ${FLUENTD_FOLDER}/${FLUENTD_CONF_FILE}`));

        it('should start Fluentd docker containers', () => {
            const fluentdParams = `-p ${FLUENTD_PORT}:${FLUENTD_PORT} -v $(pwd)/${FLUENTD_FOLDER}:/fluentd/etc -e FLUENTD_CONF=${FLUENTD_CONF_FILE}`;
            const cmdFluentd = `docker run -d ${fluentdParams} --name ${FLUENTD_NAME} ${FLUENTD_IMAGE_NAME}`;

            // simple check to see if fluentd container already exists
            return runRemoteCmd(`docker ps | grep ${FLUENTD_NAME}`)
                .then((data) => {
                    if (data) {
                        return Promise.resolve(); // exists, continue
                    }
                    return runRemoteCmd(cmdFluentd);
                });
        });
    });
}

function test() {
    const testDataTimestamp = Date.now();

    describe('Consumer Test: Fluentd - Configure TS and generate data', () => {
        const consumerDeclaration = util.deepCopy(DECLARATION);
        consumerDeclaration[FLUENTD_CONSUMER_NAME] = {
            class: 'Telemetry_Consumer',
            type: 'Generic_HTTP',
            host: FLUENTD_HOST,
            protocol: FLUENTD_PROTOCOL,
            port: FLUENTD_PORT,
            path: `/${FLUENTD_TAG_NAME}`,
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json'
                }
            ]
        };
        DUTS.forEach((dut) => it(
            `should configure TS - ${dut.hostalias}`,
            () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(consumerDeclaration))
        ));

        it('should send event to TS Event Listener', () => {
            const msg = `testDataTimestamp="${testDataTimestamp}",test="true",testType="${FLUENTD_CONSUMER_NAME}"`;
            return dutUtils.sendDataToEventListeners((dut) => `hostname="${dut.hostname}",${msg}`);
        });
    });

    describe('Consumer Test: Fluentd - Tests', () => {
        const systemPollerData = {};
        const fluentLogs = [];

        before(() => new Promise((resolve) => setTimeout(resolve, 30 * 1000))
            .then(() => dutUtils.getSystemPollersData((hostObj, data) => {
                systemPollerData[hostObj.hostname] = data[0];
            })));

        it('should get log data from Fluentd stdout', () => runRemoteCmd(`docker logs ${FLUENTD_NAME}`)
            .then((data) => {
                util.logger.info('Fluentd docker logs:', data);
                // push all relevant logs lines into log array for later tests
                const fluentdLogRegex = new RegExp(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}.\d{1,10}\s\+\d{1,5} /);
                const logLines = data.split(fluentdLogRegex);
                logLines.forEach((line) => {
                    if (line.startsWith(FLUENTD_TAG_NAME)) {
                        fluentLogs.push(JSON.parse(line.split(`${FLUENTD_TAG_NAME}:`).pop().trim()));
                    }
                });
                if (!fluentLogs.length > 0) {
                    assert.fail(`Did not find any log lines with the configured Fluentd tag name: ${FLUENTD_TAG_NAME}`);
                }
            }));

        DUTS.forEach((dut) => {
            it(`should have system poller config for - ${dut.hostalias}`, () => {
                const hostname = systemPollerData[dut.hostname];
                assert.notStrictEqual(hostname, undefined);
            });

            it(`should check fluentd for event listener data for - ${dut.hostalias}`, () => {
                let found = false;
                fluentLogs.forEach((logEntry) => {
                    if (logEntry.test === 'true' && logEntry.hostname === dut.hostname) {
                        assert.strictEqual(logEntry.testDataTimestamp, testDataTimestamp.toString());
                        assert.strictEqual(logEntry.testType, FLUENTD_CONSUMER_NAME);
                        found = true;
                    }
                });
                if (!found) {
                    return Promise.reject(new Error('Fluentd log should include event data'));
                }
                return Promise.resolve();
            });

            it(`should check fluentd for system poller data for - ${dut.hostalias}`, () => {
                let found = false;
                fluentLogs.forEach((logEntry) => {
                    if (logEntry.system && logEntry.system.hostname === dut.hostname) {
                        const schema = JSON.parse(fs.readFileSync(constants.DECL.SYSTEM_POLLER_SCHEMA));
                        const valid = util.validateAgainstSchema(logEntry, schema);
                        if (valid !== true) {
                            assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                        }
                        found = true;
                    }
                });
                if (!found) {
                    return Promise.reject(new Error('Fluentd log should include event data'));
                }
                return Promise.resolve();
            });
        });
    });
}

function teardown() {
    describe('Consumer Teardown: Fluentd', () => {
        it('should remove container', () => runRemoteCmd(`docker container rm -f ${FLUENTD_NAME}`));
        it('should remove Fluentd configuration file', () => runRemoteCmd(`rm -rf ${FLUENTD_FOLDER}`));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
