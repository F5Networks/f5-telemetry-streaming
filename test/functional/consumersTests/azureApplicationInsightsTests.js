/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const assert = require('assert');
const fs = require('fs');
const testUtil = require('../shared/util');
const azureUtil = require('../shared/azureUtil');
const constants = require('../shared/constants');
const dutUtils = require('../dutTests').utils;

const DUTS = testUtil.getHosts('BIGIP');

const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));
const APPINS_INSTR_KEY = process.env[constants.ENV_VARS.AZURE.APPINS_INSTR_KEY];
const APPINS_API_KEY = process.env[constants.ENV_VARS.AZURE.APPINS_API_KEY];
const APPINS_APP_ID = process.env[constants.ENV_VARS.AZURE.APPINS_APP_ID];

function setup() {
}

function test() {
    describe('Consumer Test: Azure App Insights - Configure TS and generate data', () => {
        const consumerDeclaration = testUtil.deepCopy(DECLARATION);
        consumerDeclaration.My_Consumer = {
            class: 'Telemetry_Consumer',
            type: 'Azure_Application_Insights',
            instrumentationKey: APPINS_INSTR_KEY,
            maxBatchIntervalMs: 2000
        };
        DUTS.forEach(dut => it(
            `should configure TS - ${dut.hostname}`,
            () => dutUtils.postDeclarationToDUT(dut, testUtil.deepCopy(consumerDeclaration))
        ));
    });

    describe('Consumer Test: Azure App Insights - Test', function () {
        this.timeout(180000);
        DUTS.forEach((dut) => {
            it(`should check for system poller data from - ${dut.hostname}`, () => {
                testUtil.logger.info('Delay 120000ms to ensure App Insights api data ready');
                return new Promise(resolve => setTimeout(resolve, 120000))
                    .then(() => azureUtil.queryAppInsights(APPINS_APP_ID, APPINS_API_KEY))
                    .then((response) => {
                        // Sample response
                        // {
                        //     "value": {
                        //         "start": "2020-03-23T21:44:59.198Z",
                        //         "end": "2020-03-23T21:47:59.198Z",
                        //         "customMetrics/F5_system_tmmMemory": {
                        //             "avg": 15
                        //         }
                        //     }
                        // }
                        testUtil.logger.info(response);
                        const val = response.value['customMetrics/F5_system_tmmMemory'];
                        return assert.ok(val && val.avg > 0);
                    });
            });
        });
    });
}

function teardown() {
}

module.exports = {
    setup,
    test,
    teardown
};
