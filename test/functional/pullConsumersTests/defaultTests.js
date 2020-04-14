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
const util = require('../shared/util');
const dutUtils = require('../dutTests').utils;

const DUTS = util.getHosts('BIGIP');

// read in example config
const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_PULL_CONSUMER_EXAMPLE));
const PULL_CONSUMER_NAME = 'My_Pull_Consumer';

function test() {
    describe('Pull Consumer Test: default - Configure TS', () => {
        DUTS.forEach(dut => it(
            `should configure TS - ${dut.hostname}`,
            () => dutUtils.postDeclarationToDUT(dut, util.deepCopy(DECLARATION))
        ));
    });

    describe('Pull Consumer Test: default - Tests', () => {
        DUTS.forEach((dut) => {
            it(`should the Pull Consumer's formatted data from: ${dut.hostname}`,
                () => dutUtils.getPullConsumerData(dut, PULL_CONSUMER_NAME)
                    .then((response) => {
                        assert.strictEqual(response.length, 1);
                        assert.notStrictEqual(
                            Object.keys(response[0].system).indexOf('hostname'),
                            -1,
                            'should have \'hostname\' in expected data position'
                        );
                    }));
        });
    });
}

module.exports = {
    test
};
