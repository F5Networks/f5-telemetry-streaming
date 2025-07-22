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
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/fluentd
 */

// module requirements
const MODULE_REQUIREMENTS = { DOCKER: true };

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

const DOCKER_CONTAINERS = {
    FluentD: {
        detach: true,
        env: {
            FLUENTD_CONF: FLUENTD_CONF_FILE
        },
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}fluent/fluentd:v1.6-debian-1`,
        name: 'fluentd-server',
        publish: {
            [FLUENTD_PORT]: FLUENTD_PORT
        },
        restart: 'always',
        volume: {
            [`$(pwd)/${FLUENTD_FOLDER}`]: '/fluentd/etc'
        }
    }
};

// read in example config
const DECLARATION = miscUtils.readJsonFile(constants.DECL.BASIC);
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

let CONTAINER_STARTED;

/**
 * Setup CS and DUTs
 */
function setup() {
    describe('Consumer Setup: Fluentd', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        describe('Clean-up TS before service configuration', () => {
            harnessUtils.getDefaultHarness()
                .bigip
                .forEach((bigip) => testUtils.shouldRemovePreExistingTSDeclaration(bigip));
        });

        describe('Docker container setup', () => {
            before(() => {
                CONTAINER_STARTED = false;
            });

            it('should pull Fluentd docker image', () => cs.docker.pull(DOCKER_CONTAINERS.FluentD.image, { existing: true }));

            it('should remove pre-existing FluentD docker container', () => harnessUtils.docker.stopAndRemoveContainer(
                cs.docker,
                DOCKER_CONTAINERS.FluentD.name
            ));

            it('should write Fluentd configuration', () => cs.ssh.default.mkdirIfNotExists(FLUENTD_FOLDER)
                .then(() => cs.ssh.default.writeToFile(
                    pathUtil.join(FLUENTD_FOLDER, FLUENTD_CONF_FILE),
                    FLUENTD_CONF
                )));

            it('should start new Fluentd docker container', () => harnessUtils.docker.startNewContainer(
                cs.docker,
                DOCKER_CONTAINERS.FluentD
            )
                .then(() => {
                    CONTAINER_STARTED = true;
                }));
        });
    });
}

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Fluentd', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harness.other[0];
        const testDataTimestamp = Date.now();

        before(() => {
            assert.isOk(CONTAINER_STARTED, 'should start FluentD container!');
        });

        describe('Configure TS and generate data', () => {
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                consumerDeclaration[FLUENTD_CONSUMER_NAME] = {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: cs.host.host,
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
            });

            testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
            testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => `hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${FLUENTD_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"\n`);
        });

        /**
         * Fetch logs from FluentD container
         *
         * @param {function} filter - function to filer logs
         *
         * @returns {Promise<Array<Object>>} resolved with parsed logs
         */
        async function getContainerLogs(filter) {
            await new Promise((resolve) => { setTimeout(resolve, 10000); });
            return cs.docker.containerLogs(DOCKER_CONTAINERS.FluentD.name)
                .then((data) => {
                    cs.logger.info('Fluentd docker logs:', data);
                    data = data.stdout;
                    // push all relevant logs lines into log array for later tests
                    const fluentdLogRegex = /\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}.\d{1,10}\s\+\d{1,5} /;
                    const logLines = data.split(fluentdLogRegex);
                    const validLogs = [];
                    logLines.forEach((line) => {
                        if (line.startsWith(FLUENTD_TAG_NAME)) {
                            const parsed = JSON.parse(line.split(`${FLUENTD_TAG_NAME}:`).pop().trim());
                            if (!filter || filter(parsed, line)) {
                                validLogs.push(parsed);
                            }
                        }
                    });
                    return validLogs;
                });
        }

        describe('Event Listener data', () => {
            const timestampStr = testDataTimestamp.toString();

            harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
                .forEach((proto) => it(
                    `should check FluentD for event listener data (over ${proto}) for - ${bigip.name}`,
                    () => getContainerLogs((log) => log.test === 'true'
                        && log.hostname === bigip.hostname
                        && log.protocol === proto
                        && log.testDataTimestamp === timestampStr
                        && log.testType === FLUENTD_CONSUMER_NAME)
                        .then((logs) => {
                            if (logs.length === 0) {
                                bigip.logger.info('No event listener data found. Going to wait another 10 sec.');
                                return promiseUtils.sleepAndReject(10000, `should have event(s) for a data from event listener (over ${proto})`);
                            }
                            return Promise.resolve();
                        })
                )));
        });

        describe('System Poller data', () => {
            harness.bigip.forEach((bigip) => it(
                `should check FluentD for system poller data - ${bigip.name}`,
                () => getContainerLogs((log) => {
                    if (typeof log.system === 'object' && log.system.hostname === bigip.hostname) {
                        const schema = miscUtils.readJsonFile(constants.DECL.SYSTEM_POLLER_SCHEMA);
                        return miscUtils.validateAgainstSchema(log, schema);
                    }
                    return false;
                })
                    .then((logs) => {
                        if (logs.length === 0) {
                            bigip.logger.error('Waiting for data to be indexed...');
                            // more sleep time for system poller data to be indexed
                            return promiseUtils.sleepAndReject(testUtils.alterPollerWaitingTime(), 'should have metrics indexed from system poller data');
                        }
                        return Promise.resolve();
                    })
            ));
        });
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer Teardown: Fluentd', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        it('should stop and remove FluentD docker container', () => harnessUtils.docker.stopAndRemoveContainer(
            cs.docker,
            DOCKER_CONTAINERS.FluentD.name
        ));

        it('should remove Fluentd configuration file', () => cs.ssh.default.unlinkIfExists(pathUtil.join(FLUENTD_FOLDER, FLUENTD_CONF_FILE)));

        it('should remove Fluentd directory', () => cs.ssh.default.rmdirIfExists(FLUENTD_FOLDER));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
