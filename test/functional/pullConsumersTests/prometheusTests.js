/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const fs = require('fs');
const assert = require('assert');
const testConstants = require('../shared/constants');
const constants = require('../../../src/lib/constants');
const util = require('../shared/util');
const dutUtils = require('../dutTests').utils;

const DUTS = util.getHosts('BIGIP');

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(testConstants.DECL.BASIC_PULL_CONSUMER_EXAMPLE));
const PULL_CONSUMER_NAME = 'My_Pull_Consumer';
const PROMETHEUS_PULL_CONSUMER_TYPE = 'Prometheus';

function test() {
    before(() => {
        // Update Declaration to reference Prometheus
        DECLARATION[PULL_CONSUMER_NAME].type = PROMETHEUS_PULL_CONSUMER_TYPE;
    });

    describe('Pull Consumer Test: Prometheus - Configure TS', () => {
        DUTS.forEach(dut => it(
            `should configure TS - ${dut.hostname}`,
            () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(DECLARATION))
        ));
    });

    describe('Pull Consumer Test: Prometheus - Tests', () => {
        const verifyResponseData = (response) => {
            assert.notStrictEqual(
                response.indexOf('# HELP f5_counters_bitsIn counters.bitsIn'),
                -1,
                'help text should exist, and contain original metric name'
            );
            assert.notStrictEqual(
                response.indexOf('f5_counters_bitsIn{networkInterfaces="mgmt"}'),
                -1,
                'metric should include label with label value'
            );
            assert.notStrictEqual(
                response.indexOf('f5_system_tmmTraffic_serverSideTraffic_bitsIn'),
                -1,
                'metrics without labels should store path in metric name'
            );
            assert.notStrictEqual(
                response.match(/(f5_system_memory )[0-9]{1,2}\n/),
                null,
                'metric\'s value should only be a numeric, followed by a newline'
            );
        };

        DUTS.forEach((dut) => {
            it(`should the Pull Consumer's formatted data from: ${dut.hostname}`,
                () => dutUtils.getPullConsumerData(dut, PULL_CONSUMER_NAME)
                    .then((response) => {
                        verifyResponseData(response);
                    }));

            it(`should the Pull Consumer's formatted data from: ${dut.hostname} (using namespace endpoint)`,
                () => dutUtils.getPullConsumerData(dut, PULL_CONSUMER_NAME, constants.DEFAULT_UNNAMED_NAMESPACE)
                    .then((response) => {
                        verifyResponseData(response);
                    }));
        });
    });
}

module.exports = {
    test
};
