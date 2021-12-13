/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const DECLARATION = JSON.parse(fs.readFileSync(constants.DECL.BASIC));
/**
 * Should look like:
 * [
 *    {
 *       "appID": "...",
 *       "apiKey": "...",
 *       "instrKey": "...",
 *       "region": '..." // optional
 *    },
 *    {
 *    ...
 *    }
 * ]
 */
let APPINS_API_DATA;

function setup() {
    const fileName = process.env[constants.ENV_VARS.AZURE.APPINS_API_DATA];
    assert.ok(fileName, `should define env variable ${constants.ENV_VARS.AZURE.APPINS_API_DATA} (path to file with Azure App Insights API info)`);

    testUtil.logger.info(`Reading and parsing file '${fileName}' for Azure App Insights`);
    APPINS_API_DATA = JSON.parse(fs.readFileSync(fileName));

    assert.ok(Array.isArray(APPINS_API_DATA) && APPINS_API_DATA.length > 0, 'should be an array and have 1 or more elements in it');
    APPINS_API_DATA.forEach((item, idx) => {
        assert.ok(item.instrKey, `APPINS_API_DATA item #${idx} should have instrKey`);
        assert.ok(item.apiKey, `APPINS_API_DATA item #${idx} should have apiKey`);
        assert.ok(item.appID, `APPINS_API_DATA item #${idx} should have appID`);
    });
    testUtil.logger.debug(`APPINS_API_DATA has ${APPINS_API_DATA.length} items`);
}

function test() {
    const getAppInsightAPIInfo = (function () {
        const key2application = {};
        let lastID = -1;
        return function getter(key) {
            let value = key2application[key];
            if (!value) {
                lastID += 1;
                value = APPINS_API_DATA[lastID];
                if (!value) {
                    throw new Error(`Not enough items in APPINS_API_DATA: ${APPINS_API_DATA.length} items configured, but requests for #${lastID}`);
                }
                key2application[key] = value;
            }
            return value;
        };
    }());

    describe('Consumer Test: Azure App Insights - Configure TS and generate data', () => {
        const referenceDeclaration = testUtil.deepCopy(DECLARATION);
        referenceDeclaration.My_Consumer = {
            class: 'Telemetry_Consumer',
            type: 'Azure_Application_Insights',
            instrumentationKey: null,
            maxBatchIntervalMs: 2000
        };
        DUTS.forEach((dut) => it(`should configure TS - ${dut.hostalias}`, () => {
            const declaration = testUtil.deepCopy(referenceDeclaration);
            const apiInfo = getAppInsightAPIInfo(dut.ip);
            declaration.My_Consumer.instrumentationKey = apiInfo.instrKey;
            if (apiInfo.region) {
                declaration.My_Consumer.region = apiInfo.region;
            }
            return dutUtils.postDeclarationToDUT(dut, declaration);
        }));
    });

    describe('Consumer Test: Azure App Insights - Test', function () {
        this.timeout(180000);
        let firstAttemptOverAll = true;

        DUTS.forEach((dut) => {
            let triedWithoutAddtlDelay = false;

            it(`should check for system poller data from:${dut.hostalias}`, () => {
                const apiInfo = getAppInsightAPIInfo(dut.ip);
                return Promise.resolve()
                    .then(() => {
                        if (firstAttemptOverAll) {
                            // first attempt in entire suite - data might not be ready yet
                            firstAttemptOverAll = false;
                            testUtil.logger.info('Delay 120000ms to ensure App Insights api data ready (first attempt in entire suite)');
                            return testUtil.sleep(120000);
                        }
                        if (!triedWithoutAddtlDelay) {
                            // let's try to fetch data without delay
                            triedWithoutAddtlDelay = true;
                            return Promise.resolve();
                        }
                        testUtil.logger.info('Delay 30000ms to ensure App Insights api data ready');
                        return testUtil.sleep(30000);
                    })
                    .then(() => azureUtil.queryAppInsights(apiInfo.appID, apiInfo.apiKey))
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
                        assert.ok(val && val.avg > 0);
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
