/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-console */

// initialize logger
const util = require('./shared/util'); // eslint-disable-line
const constants = require('./shared/constants');
const dutTests = require('./dutTests');
const consumerHostTests = require('./consumerSystemTests');
const pullConsumerHostTests = require('./pullConsumerSystemTests');

const skipDut = process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_DUT_TESTS];
const skipConsumer = process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_CONSUMER_TESTS];
const skipPullConsumer = process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_PULL_CONSUMER_TESTS];
const truthyRegex = /^\s*(true|1)\s*$/i;

const runDut = !skipDut || !truthyRegex.test(skipDut);
const runConsumer = !skipConsumer || !truthyRegex.test(skipConsumer);
const runPullConsumer = !skipPullConsumer || !truthyRegex.test(skipPullConsumer);

describe('Global: Setup', () => {
    dutTests.setup();
    if (runConsumer) {
        consumerHostTests.setup();
    }
    if (runPullConsumer) {
        pullConsumerHostTests.setup();
    }
});

describe('Global: Test', () => {
    if (runDut) {
        dutTests.test();
    } else {
        console.warn('WARN: skipping DUT tests');
    }
    if (runConsumer) {
        consumerHostTests.test();
    } else {
        console.warn('WARN: skipping Consumers tests');
    }
    if (runPullConsumer) {
        pullConsumerHostTests.test();
    } else {
        console.warn('WARN: skipping Pull Consumers tests');
    }
});

describe('Global: Teardown', () => {
    dutTests.teardown();
    if (runConsumer) {
        consumerHostTests.teardown();
    }
});
