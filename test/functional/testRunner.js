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

/* eslint-disable no-console */

/**
 * @module test/functional/testRunner
 */

const constants = require('./shared/constants');
const consumerHostTests = require('./consumerSystemTests');
const dutTests = require('./dutTests');
const harnessUtils = require('./shared/harness');
const miscUtils = require('./shared/utils/misc');

const runConsumerTests = !miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.TESTS.SKIP_CONSUMER_TESTS, {
    castTo: 'boolean',
    defaultValue: false
});
const runDutSetup = !miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.TESTS.SKIP_DUT_SETUP, {
    castTo: 'boolean',
    defaultValue: false
});
const runDutTeardown = !miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.TESTS.SKIP_DUT_TEARDOWN, {
    castTo: 'boolean',
    defaultValue: false
});
const runDutTests = !miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.TESTS.SKIP_DUT_TESTS, {
    castTo: 'boolean',
    defaultValue: false
});
const tsDevEnv = miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.TESTS.DEV_ENV, {
    castTo: 'boolean',
    defaultValue: false
});

console.info('Directory for artifacts:', constants.ARTIFACTS_DIR);
miscUtils.createDir(constants.ARTIFACTS_DIR);

console.info('Harness initialization');
const harness = harnessUtils.initializeFromEnv();
harnessUtils.setDefaultHarness(harness);

describe('Global: Setup', () => {
    if (tsDevEnv) {
        console.warn('WARN: Dev env detected! Polling and waiting interval will be altered to speedup testing!');
    }

    if (runDutSetup) {
        describe('DUT(s) setup', dutTests.setup);
    } else {
        console.warn('WARN: skipping DUT setup');
    }

    if (runConsumerTests) {
        describe('CS(s) and tests setup', consumerHostTests.setup);
    } else {
        console.warn('WARN: skipping Consumer setup');
    }
});

describe('Global: Test', () => {
    if (runDutTests) {
        describe('DUT(s) tests', dutTests.test);
    } else {
        console.warn('WARN: skipping DUT tests');
    }

    if (runConsumerTests) {
        describe('CS(s) tests', consumerHostTests.test);
    } else {
        console.warn('WARN: skipping Consumers tests');
    }
});

describe('Global: Teardown', () => {
    if (runDutTeardown) {
        describe('DUT(s) teardown', dutTests.teardown);
    } else {
        console.warn('WARN: skipping DUT teardown');
    }

    if (runConsumerTests) {
        describe('CS(s) teardown', consumerHostTests.teardown);
    } else {
        console.warn('WARN: skipping Consumer teardown');
    }
});
