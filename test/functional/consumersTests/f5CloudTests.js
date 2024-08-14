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

/**
 * ATTENTION: F5 Cloud tests disabled until F5_Cloud interactions resolved
 */

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const constants = require('../shared/constants');
const harnessUtils = require('../shared/harness');
const logger = require('../shared/utils/logger').getChild('f5cloudTests');
const miscUtils = require('../shared/utils/misc');
const promiseUtils = require('../shared/utils/promise');
const srcMiscUtils = require('../../../src/lib/utils/misc');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/f5cloud
 */

const MODULE_REQUIREMENTS = { DOCKER: true };

const F5_CLOUD_CONSUMER_NAME = 'GRPC_F5_CLOUD';
const GRPC_MOCK_SENDING_PORT = 4770;
const GRPC_MOCK_ADMIN_PORT = 4771;
const PROTO_PATH = `${__dirname}/../../../src/lib/consumers/F5_Cloud/deos.proto`;
const REMOTE_PROTO_PATH = '/home/deos.proto';

const DOCKER_CONTAINERS = {
    F5CloudGRPC: {
        command: '/proto/deos.proto',
        detach: true,
        image: `${constants.ARTIFACTORY_DOCKER_HUB_PREFIX}f5-magneto-docker/grpc-mock-server:1.0.1`,
        name: 'grpc-mock-server',
        publish: {
            [GRPC_MOCK_ADMIN_PORT]: GRPC_MOCK_ADMIN_PORT,
            [GRPC_MOCK_SENDING_PORT]: GRPC_MOCK_SENDING_PORT
        },
        restart: 'always',
        volume: {
            '/home': '/proto'
        }
    }
};

// read in example config
const DECLARATION = testUtils.alterPollerInterval(miscUtils.readJsonFile(constants.DECL.BASIC));
const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

let CONTAINER_STARTED;
let SHOULD_SKIP_DUE_VERSION;
let SERVICE_ACCOUNT = null;

/*
    --- Notes about viktorfefilovf5/magneto-grpc-mock-server:0.0.7 ---
    custom extension of https://github.com/tokopedia/gripmock
    original api's:
    GET / Will list all stubs mapping.
    POST /add Will add stub with provided stub data
    POST /find Find matching stub with provided input. see Input Matching below.
    GET /clear Clear stub mappings.
    additional api's:
    GET /interactions - this way we can check which called got to the mock GRPC server
    GET /clearInteractions - clear interactions
 */

/**
 * Setup CS and DUTs
 */
function setup() {
    describe.skip('Consumer Setup: F5 Cloud', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harnessUtils.getDefaultHarness().other[0];

        cs.http.createAndSave('f5cloud', {
            port: GRPC_MOCK_ADMIN_PORT,
            protocol: 'http',
            retry: {
                maxTries: 10,
                delay: 1000
            }
        });

        before(() => {
            CONTAINER_STARTED = false;
            SERVICE_ACCOUNT = null;
            SHOULD_SKIP_DUE_VERSION = {};

            const envVar = miscUtils.getEnvArg(constants.ENV_VARS.F5_CLOUD.SERVICE_ACCOUNT);
            logger.info('Reading service account info from file', {
                envVar: constants.ENV_VARS.F5_CLOUD.SERVICE_ACCOUNT,
                envVal: envVar
            });
            return miscUtils.readJsonFile(envVar, true)
                .then((serviceAccount) => {
                    assert.isDefined(serviceAccount.type, 'service account is not valid');
                    SERVICE_ACCOUNT = serviceAccount;
                    SERVICE_ACCOUNT.privateKey = {
                        cipherText: SERVICE_ACCOUNT.privateKey
                    };
                });
        });

        describe('Clean-up TS before service configuration', () => {
            harness.bigip.forEach((bigip) => testUtils.shouldRemovePreExistingTSDeclaration(bigip));
        });

        // .skip() until F5_Cloud interactions resolved
        describe('Docker container setup', () => {
            it('should pull F5 Cloud GRPC docker image', () => cs.docker.pull(DOCKER_CONTAINERS.F5CloudGRPC.image, { existing: true }));

            it('should delete proto file if exist', () => cs.ssh.default.unlinkIfExists(REMOTE_PROTO_PATH));

            it('should copy proto file', () => cs.ssh.default.copyFileToRemote(PROTO_PATH, REMOTE_PROTO_PATH));

            it('should start new F5 Cloud GRPC docker container', () => harnessUtils.docker.startNewContainer(
                cs.docker,
                DOCKER_CONTAINERS.F5CloudGRPC
            )
                .then(() => {
                    CONTAINER_STARTED = true;
                }));

            it('should add stub to mock server', () => cs.http.f5cloud.makeRequest({
                body: {
                    service: 'Ingestion',
                    method: 'Post',
                    input: {
                        contains: {
                            account_id: 'urn:f5_cs::account:a-blabla-a'
                        }
                    },
                    output: {
                        data: {}
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true,
                method: 'POST',
                uri: '/add'
            }));
        });

        describe('Gather information about DUTs version', () => {
            harness.bigip.forEach((bigip) => it(
                `should get bigip version and check if version is high enough for F5 Cloud - ${bigip.name}`,
                () => bigip.icAPI.default.getSoftwareVersion()
                    .then((version) => {
                        // OpenTelemetry Exporter consumer is supported on bigip 14.1 and above
                        SHOULD_SKIP_DUE_VERSION[bigip.hostname] = srcMiscUtils.compareVersionStrings(version, '<', '14.0');

                        logger.info('DUT version', {
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
    describe.skip('Consumer Test: F5 Cloud', () => {
        const harness = harnessUtils.getDefaultHarness();
        const cs = harness.other[0];
        const testDataTimestamp = Date.now();

        /**
         * @returns {boolean} true if DUt satisfies version restriction
         */
        const isValidDut = (dut) => !SHOULD_SKIP_DUE_VERSION[dut.hostname];

        before(() => {
            assert.isOk(CONTAINER_STARTED, 'should start F5 Cloud GRPC container!');
            assert.isNotNull(SERVICE_ACCOUNT, 'should fetch F5 Cloud API metadata from process.env');
        });

        describe('Configure TS and generate data', () => {
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(DECLARATION);
                consumerDeclaration[F5_CLOUD_CONSUMER_NAME] = {
                    allowSelfSignedCert: true,
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    enable: true,
                    trace: true,
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    serviceAccount: miscUtils.deepCopy(SERVICE_ACCOUNT),
                    targetAudience: cs.host.host,
                    useSSL: false,
                    port: GRPC_MOCK_SENDING_PORT
                };
            });

            testUtils.shouldConfigureTS(harness.bigip, (bigip) => (isValidDut(bigip)
                ? miscUtils.deepCopy(consumerDeclaration)
                : null));

            testUtils.shouldSendListenerEvents(harness.bigip, (bigip, proto, port, idx) => (isValidDut(bigip)
                ? `functionalTestMetric="147",EOCTimestamp="1231232",hostname="${bigip.hostname}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${F5_CLOUD_CONSUMER_NAME}",protocol="${proto}",msgID="${idx}"\n`
                : null));
        });

        describe('Event Listener data', () => {
            harness.bigip.forEach((bigip) => LISTENER_PROTOCOLS
                .forEach((proto) => it(
                    `should check F5 Cloud gRPC server for event listener data (over ${proto}) for - ${bigip.name}`,
                    function () {
                        if (!isValidDut(bigip)) {
                            return this.skip();
                        }
                        return cs.http.otel.makeRequest({
                            headers: {},
                            method: 'GET',
                            uri: '/interactions'
                        })
                            .then((data) => {
                                assert.isArray(data, 'should be array');
                                assert.isNotEmpty(data, 'should not be empty');

                                const responseDataJSONList = [];
                                data.forEach((response) => {
                                    assert(response.service === 'Ingestion', `Test Error: Incorrect service name, should be 'Ingestion', got '${response.service}'`);
                                    assert(response.method === 'Post', `Test Error: Incorrect method name, should be 'Post', got '${response.method}'`);
                                    assert(response.data.account_id === 'urn:f5_cs::account:a-blabla-a', `Test Error: Incorrect method name, should be 'urn:f5_cs::account:a-blabla-a', got '${response.data.account_id}'`);
                                    const stringData = Buffer.from(response.data.payload, 'base64').toString(); // decode base64
                                    const jsonData = JSON.parse(stringData);
                                    if (jsonData.testType === F5_CLOUD_CONSUMER_NAME) {
                                        responseDataJSONList.push(jsonData);
                                    }
                                });
                                assert.isOk(
                                    responseDataJSONList.some((responseDataJSON) => (
                                        responseDataJSON.hostname === bigip.hostname
                                        && responseDataJSON.testDataTimestamp === testDataTimestamp.toString()
                                        && responseDataJSON.protocol === proto)),
                                    `Test Error: no valid event listener data for ${bigip.hostname}`
                                );
                            })
                            .catch((err) => {
                                bigip.logger.info('No event listener data found. Going to wait another 20 sec.');
                                return promiseUtils.sleepAndReject(20000, err);
                            });
                    }
                )));
        });
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe.skip('Consumer Teardown: F5 Cloud', () => {
        const cs = harnessUtils.getDefaultHarness().other[0];

        it('should stop and remove F5 Cloud GRPC docker container', () => harnessUtils.docker.stopAndRemoveContainer(
            cs.docker,
            DOCKER_CONTAINERS.F5CloudGRPC.name
        ));

        it('should remove GRPC proto file', () => cs.ssh.default.unlinkIfExists(REMOTE_PROTO_PATH));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
