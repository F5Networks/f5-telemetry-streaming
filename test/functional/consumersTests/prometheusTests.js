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

const constants = require('../shared/constants');
const DEFAULT_UNNAMED_NAMESPACE = require('../../../src/lib/constants').DEFAULT_UNNAMED_NAMESPACE;
const harnessUtils = require('../shared/harness');
const miscUtils = require('../shared/utils/misc');
const testUtils = require('../shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/consumersTests/prometheus
 */

// read in example config
const BASIC_DECL = miscUtils.readJsonFile(constants.DECL.PULL_CONSUMER_BASIC);
const NAMESPACE_DECL = miscUtils.readJsonFile(constants.DECL.PULL_CONSUMER_WITH_NAMESPACE);

const PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Prometheus', () => {
        const harness = harnessUtils.getDefaultHarness();

        const verifyResponseData = (response) => {
            const body = response[0];
            const headers = response[1].headers;

            assert.notStrictEqual(
                body.indexOf('# HELP f5_counters_bitsIn counters.bitsIn'),
                -1,
                'help text should exist, and contain original metric name'
            );
            assert.notStrictEqual(
                body.indexOf('f5_counters_bitsIn{networkInterfaces="mgmt"}'),
                -1,
                'metric should include label with label value'
            );
            assert.notStrictEqual(
                body.indexOf('f5_system_tmmTraffic_serverSideTraffic_bitsIn'),
                -1,
                'metrics without labels should store path in metric name'
            );
            assert.notStrictEqual(
                body.match(/(f5_system_memory )[0-9]{1,2}\n/),
                null,
                'metric\'s value should only be a numeric, followed by a newline'
            );
            assert.deepStrictEqual(headers['content-type'], PROMETHEUS_CONTENT_TYPE, 'content-type should be of type text/plain');
        };

        describe('Without namespace', () => {
            const pullConsumerName = 'My_Pull_Consumer';
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(BASIC_DECL);
                consumerDeclaration[pullConsumerName].type = 'Prometheus';
            });

            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
            });

            describe('System Poller data', () => {
                harness.bigip.forEach((bigip) => it(
                    `should get the Pull Consumer's formatted data - ${bigip.name}`,
                    () => bigip.telemetry.getPullConsumerData(pullConsumerName)
                        .then((response) => verifyResponseData(response))
                ));

                harness.bigip.forEach((bigip) => it(
                    `should get the Pull Consumer's formatted data using namespace endpoint - ${bigip.name}`,
                    () => bigip.telemetry
                        .toNamespace(DEFAULT_UNNAMED_NAMESPACE, true)
                        .getPullConsumerData(pullConsumerName)
                        .then((response) => verifyResponseData(response))
                ));
            });
        });

        describe('With namespace', () => {
            const namespace = 'Second_Namespace';
            const pullConsumerName = 'Pull_Consumer';
            let consumerDeclaration;

            before(() => {
                consumerDeclaration = miscUtils.deepCopy(NAMESPACE_DECL);
                consumerDeclaration[namespace][pullConsumerName].type = 'Prometheus';
            });

            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(consumerDeclaration));
            });

            describe('System Poller data', () => {
                harness.bigip.forEach((bigip) => it(
                    `should get the Pull Consumer's formatted data using namespace endpoint - ${bigip.name}`,
                    () => bigip.telemetry
                        .toNamespace(namespace)
                        .getPullConsumerData(pullConsumerName)
                        .then((response) => verifyResponseData(response))
                ));
            });
        });
    });
}

module.exports = {
    test
};
