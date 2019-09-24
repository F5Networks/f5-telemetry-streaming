/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-console */

// initliaze logger
const util = require('./shared/util.js'); // eslint-disable-line
const constants = require('./shared/constants.js');
const dutTests = require('./dutTests.js');
const consumerHostTests = require('./consumerSystemTests.js');

const skipDut = process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_DUT_TESTS];
const skipConsumer = process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_CONSUMER_TESTS];
const truthyRegex = /^\s*(true|1)\s*$/i;

const runDut = !skipDut || !truthyRegex.test(skipDut);
const runConsumer = !skipConsumer || !truthyRegex.test(skipConsumer);

describe('Global: Setup', () => {
    dutTests.setup();
    if (runConsumer) {
        consumerHostTests.setup();
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
});

describe('Global: Teardown', () => {
    dutTests.teardown();
    if (runConsumer) {
        consumerHostTests.teardown();
    }
});
