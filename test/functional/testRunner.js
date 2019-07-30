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

describe('Global: Setup', () => {
    dutTests.setup();
    consumerHostTests.setup();
});

describe('Global: Test', () => {
    if (process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_DUT_TESTS] !== '1') {
        dutTests.test();
    } else {
        console.warn('WARN: skip DUT tests');
    }
    if (process.env[constants.ENV_VARS.TEST_CONTROLS.SKIP_CONSUMER_TESTS] !== '1') {
        consumerHostTests.test();
    } else {
        console.warn('WARN: skip Consumers tests');
    }
});

describe('Global: Teardown', () => {
    dutTests.teardown();
    consumerHostTests.teardown();
});
