/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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

console.info('Directory for artifacts:', constants.ARTIFACTS_DIR);
miscUtils.createDir(constants.ARTIFACTS_DIR);

console.info('Harness initialization');
const harness = harnessUtils.initializeFromEnv();
harnessUtils.setDefaultHarness(harness);

describe('Global: Setup', () => {
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
