/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const scp = require('node-scp');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;
const sharedUtil = require('../shared/util');
const util = require('../../../src/lib/utils/misc');
const requestsUtil = require('../../../src/lib/utils/requests');
const testUtil = require('../../unit/shared/util');

const MODULE_REQUIREMENTS = { DOCKER: true };
const CONSUMER_HOST = sharedUtil.getHosts('CONSUMER')[0]; // only expect one
const DUTS = sharedUtil.getHosts('BIGIP');
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC));
const F5_CLOUD_NAME = 'GRPC_F5_CLOUD';
const MOCK_SERVER_NAME = 'grpc_mock_server';
const PROTO_PATH = `${__dirname}/../../../src/lib/consumers/F5_Cloud/deos.proto`;
const GRPC_MOCK_SERVER_DOCKER = `${process.env[constants.ENV_VARS.ARTIFACTORY_SERVER]}/f5-magneto-docker/grpc-mock-server:1.0.1`;
const GRPC_MOCK_SENDING_PORT = 4770;
const GRPC_MOCK_ADMIN_PORT = 4771;
const SHOULD_RUN_TESTS = {};

let VALID_SERVICE_ACCOUNT = {};

function runRemoteCmd(cmd) {
    return sharedUtil.performRemoteCmd(
        CONSUMER_HOST.ip,
        CONSUMER_HOST.username,
        cmd,
        { password: CONSUMER_HOST.password }
    );
}

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

function setup() {
    const serviceAccount = process.env[constants.ENV_VARS.F5_CLOUD.SERVICE_ACCOUNT];
    assert.ok(serviceAccount, `should define env variable ${constants.ENV_VARS.F5_CLOUD.SERVICE_ACCOUNT} with real service account`);
    const parsedServiceAccount = JSON.parse(fs.readFileSync(serviceAccount));
    parsedServiceAccount.privateKey = {
        cipherText: parsedServiceAccount.privateKey
    };
    VALID_SERVICE_ACCOUNT = parsedServiceAccount;
    assert.ok(VALID_SERVICE_ACCOUNT.type, 'service account is not valid');

    describe('Consumer Setup Check: check bigip requirements', () => {
        DUTS.forEach(dut => it(
            `get bigip version and check if version is good for F5 Cloud - ${dut.hostalias}`,
            () => sharedUtil.getBigipVersion(dut)
                .then((response) => {
                    // F5 Cloud should support bigip 14 and above
                    SHOULD_RUN_TESTS[dut.hostalias] = util.compareVersionStrings(response, '>=', '14.0.0');
                })
        ));
    });

    // .skip() until F5_Cloud interactions resolved
    describe.skip('Consumer Setup: configuration', () => {
        it('should pull grpc-mock-server docker image', () => runRemoteCmd(`docker pull ${GRPC_MOCK_SERVER_DOCKER}`));

        it('should delete proto file if exist', () => runRemoteCmd('rm -f ~/deos.proto'));

        it('should copy proto file using node-scp', () => scp({
            host: CONSUMER_HOST.ip,
            port: 22,
            username: CONSUMER_HOST.username,
            password: CONSUMER_HOST.password
        }).then((client) => {
            client.uploadFile(PROTO_PATH, '/home/ubuntu/deos.proto')
                .then(() => {
                    client.close();
                    assert(true);
                })
                .catch((error) => {
                    assert(false, `Test Error: Couldnt upload proto files to ${CONSUMER_HOST.ip} using scp, error: ${error}`);
                });
        }).catch((error) => {
            assert(false, `Test Error: Couldnt create scp client, error: ${error}`);
        }));

        it('should set up mock GRPC server', () => runRemoteCmd(`docker ps | grep ${MOCK_SERVER_NAME}`).then((data) => {
            if (data) {
                return Promise.resolve(); // exists, continue
            }
            return runRemoteCmd(`docker run -d -p ${GRPC_MOCK_SENDING_PORT}:${GRPC_MOCK_SENDING_PORT} -p ${GRPC_MOCK_ADMIN_PORT}:${GRPC_MOCK_ADMIN_PORT} -v /home/ubuntu:/proto --name ${MOCK_SERVER_NAME} ${GRPC_MOCK_SERVER_DOCKER} /proto/deos.proto`);
        }));

        it('should add stub to mock server', () => {
            const options = {
                method: 'POST',
                fullURI: `http://${CONSUMER_HOST.ip}:${GRPC_MOCK_ADMIN_PORT}/add`,
                headers: {
                    'Content-Type': 'application/json'
                },
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
                }
            };
            return requestsUtil.makeRequest(options);
        });
    });
}

function test() {
    const testDataTimestamp = Date.now();
    const msg = hostName => `hostname="${hostName}",testDataTimestamp="${testDataTimestamp}",test="true",testType="${F5_CLOUD_NAME}"`;

    // .skip() until F5_Cloud interactions resolved
    describe.skip('Consumer Test: F5 Cloud - Configure TS', () => {
        DUTS.forEach(dut => it(`should configure TS - ${dut.hostalias}`, function () {
            if (!SHOULD_RUN_TESTS[dut.hostalias]) {
                this.skip();
            }
            const consumerDeclaration = sharedUtil.deepCopy(DECLARATION);
            consumerDeclaration[F5_CLOUD_NAME] = {
                allowSelfSignedCert: true,
                class: 'Telemetry_Consumer',
                type: 'F5_Cloud',
                enable: true,
                trace: true,
                f5csTenantId: 'a-blabla-a',
                f5csSensorId: '12345',
                payloadSchemaNid: 'f5',
                serviceAccount: testUtil.deepCopy(VALID_SERVICE_ACCOUNT),
                targetAudience: CONSUMER_HOST.ip,
                useSSL: false,
                port: GRPC_MOCK_SENDING_PORT
            };
            return dutUtils.postDeclarationToDUT(dut, sharedUtil.deepCopy(consumerDeclaration));
        }));
        DUTS.forEach(dut => it(`should send event to TS Event Listener - ${dut.hostalias}`, function () {
            if (!SHOULD_RUN_TESTS[dut.hostalias]) {
                this.skip();
            }
            return dutUtils.sendDataToEventListener(dut, `${msg(dut.hostname)}`);
        }));
    });

    // .skip() until F5_Cloud interactions resolved
    describe.skip('Consumer Test: F5 Cloud - Test', () => {
        DUTS.forEach(dut => it(`should find the right interactions on mock server - ${dut.hostalias}`, function () {
            if (!SHOULD_RUN_TESTS[dut.hostalias]) {
                this.skip();
            }
            const options = {
                method: 'GET',
                fullURI: `http://${CONSUMER_HOST.ip}:${GRPC_MOCK_ADMIN_PORT}/interactions`,
                headers: {}
            };
            const responseDataJSONList = [];
            return requestsUtil.makeRequest(options).then((responseList) => {
                if (responseList && responseList.length > 0) {
                    responseList.forEach((response) => {
                        assert(response.service === 'Ingestion', `Test Error: Incorrect service name, should be 'Ingestion', got '${response.service}'`);
                        assert(response.method === 'Post', `Test Error: Incorrect method name, should be 'Post', got '${response.method}'`);
                        assert(response.data.account_id === 'urn:f5_cs::account:a-blabla-a', `Test Error: Incorrect method name, should be 'urn:f5_cs::account:a-blabla-a', got '${response.data.account_id}'`);
                        const stringData = Buffer.from(response.data.payload, 'base64').toString(); // decode base64
                        const jsonData = JSON.parse(stringData);
                        if (jsonData.testType === F5_CLOUD_NAME) {
                            responseDataJSONList.push(jsonData);
                        }
                    });
                    assert(responseDataJSONList.some(responseDataJSON => responseDataJSON.hostname === dut.hostname), `Test Error: ${dut.hostname} does not exist`);
                    assert(responseDataJSONList.every(responseDataJSON => responseDataJSON.testDataTimestamp === testDataTimestamp.toString()), `Test Error: testDataTimestamp should be ${testDataTimestamp}`);
                } else {
                    assert(false, 'no response from mock server');
                }
            });
        }));
    });
}

function teardown() {
    // .skip() until F5_Cloud interactions resolved
    describe.skip('Consumer Test: teardown mock server', () => {
        it(`should remove ${MOCK_SERVER_NAME} container`, () => runRemoteCmd(`docker container rm -f ${MOCK_SERVER_NAME}`));
    });
}

module.exports = {
    MODULE_REQUIREMENTS,
    setup,
    test,
    teardown
};
