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
const constants = require('../shared/constants');
const DEFAULT_UNNAMED_NAMESPACE = require('../../../src/lib/constants').DEFAULT_UNNAMED_NAMESPACE;
const util = require('../shared/util');
const dutUtils = require('../dutTests').utils;

const DUTS = util.getHosts('BIGIP');

// read in example config
const BASIC_DECL = JSON.parse(fs.readFileSync(constants.DECL.PULL_CONSUMER_BASIC));
const NAMESPACE_DECL = JSON.parse(fs.readFileSync(constants.DECL.PULL_CONSUMER_WITH_NAMESPACE));
const PROMETHEUS_PULL_CONSUMER_TYPE = 'Prometheus';

function test() {
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

    describe('Pull Consumer Test: Prometheus - no namespace', () => {
        const pullConsumerName = 'My_Pull_Consumer';
        before(() => {
            // Update Declaration to reference Prometheus
            BASIC_DECL[pullConsumerName].type = PROMETHEUS_PULL_CONSUMER_TYPE;
        });
        describe('Prometheus - Configure TS', () => {
            DUTS.forEach(dut => it(
                `should configure TS - ${dut.hostalias}`,
                () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(BASIC_DECL))
            ));
        });

        describe('Prometheus - Tests', () => {
            DUTS.forEach((dut) => {
                it(`should the Pull Consumer's formatted data from: ${dut.hostalias}`,
                    () => dutUtils.getPullConsumerData(dut, pullConsumerName)
                        .then((response) => {
                            verifyResponseData(response);
                        }));

                it(`should the Pull Consumer's formatted data from: ${dut.hostalias} (using namespace endpoint)`,
                    () => dutUtils.getPullConsumerData(dut, pullConsumerName, DEFAULT_UNNAMED_NAMESPACE)
                        .then((response) => {
                            verifyResponseData(response);
                        }));
            });
        });
    });

    describe('Pull Consumer Test: Prometheus - with namespace', () => {
        const pullConsumerName = 'Pull_Consumer';
        const namespace = 'Second_Namespace';

        before(() => {
            // Update Declaration to reference Prometheus
            NAMESPACE_DECL[namespace][pullConsumerName].type = PROMETHEUS_PULL_CONSUMER_TYPE;
        });
        describe('Prometheus with namespace - Configure TS', () => {
            DUTS.forEach(dut => it(
                `should configure TS - ${dut.hostalias}`,
                () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(NAMESPACE_DECL))
            ));
        });

        describe('Prometheus with namespace - Tests', () => {
            DUTS.forEach((dut) => {
                it(`should the Pull Consumer's formatted data from: ${dut.hostalias}`,
                    () => dutUtils.getPullConsumerData(dut, pullConsumerName, namespace)
                        .then((response) => {
                            verifyResponseData(response);
                        }));
            });
        });
    });
}

module.exports = {
    test
};
