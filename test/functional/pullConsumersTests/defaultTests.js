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

// read in example configs
const BASIC_DECL = JSON.parse(fs.readFileSync(constants.DECL.PULL_CONSUMER_BASIC));
const NAMESPACE_DECL = JSON.parse(fs.readFileSync(constants.DECL.PULL_CONSUMER_WITH_NAMESPACE));

function test() {
    const verifyResponseData = (response) => {
        assert.strictEqual(response.length, 1);
        assert.notStrictEqual(
            Object.keys(response[0].system).indexOf('hostname'),
            -1,
            'should have \'hostname\' in expected data position'
        );
    };

    describe('Pull Consumer Test: default consumer type - no namespace', () => {
        describe('default - Configure TS', () => {
            DUTS.forEach(dut => it(
                `should configure TS - ${dut.hostalias}`,
                () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(BASIC_DECL))
            ));
        });

        describe('default - Tests', () => {
            const pullConsumerName = 'My_Pull_Consumer';
            DUTS.forEach((dut) => {
                it(`should get the Pull Consumer's formatted data from: ${dut.hostalias}`,
                    () => dutUtils.getPullConsumerData(dut, pullConsumerName)
                        .then((response) => {
                            verifyResponseData(response);
                        }));

                it(`should get the Pull Consumer's formatted data from: ${dut.hostalias} (using namespace endpoint)`,
                    () => dutUtils.getPullConsumerData(dut, pullConsumerName, DEFAULT_UNNAMED_NAMESPACE)
                        .then((response) => {
                            verifyResponseData(response);
                        }));
            });
        });
    });

    describe('Pull Consumer Test: default consumer type - with namespace', () => {
        describe('default with namespace - Configure TS', () => {
            DUTS.forEach(dut => it(
                `should configure TS - ${dut.hostalias}`,
                () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(NAMESPACE_DECL))
            ));
        });

        describe('default with namespace - Tests', () => {
            const pullConsumerName = 'Pull_Consumer';
            const namespace = 'Second_Namespace';
            DUTS.forEach((dut) => {
                it(`should get the Pull Consumer's formatted data from: ${dut.hostalias}`,
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
