/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const systemStatsUtil = require('../../src/lib/systemStatsUtil');
const systemStatsUtilTestsData = require('./systemStatsUtilTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('System Stats Utils', () => {
    describe('._resolveConditional()', () => {
        systemStatsUtilTestsData._resolveConditional.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const promise = new Promise((resolve, reject) => {
                    try {
                        resolve(systemStatsUtil._resolveConditional(
                            testUtil.deepCopy(testConf.contextData),
                            testUtil.deepCopy(testConf.conditionalBlock)
                        ));
                    } catch (err) {
                        reject(err);
                    }
                });
                if (testConf.errorMessage) {
                    return assert.isRejected(promise, testConf.errorMessage);
                }
                return assert.becomes(promise, testConf.expectedData);
            });
        });
    });

    describe('._preprocessProperty()', () => {
        systemStatsUtilTestsData._preprocessProperty.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil._preprocessProperty(
                    testUtil.deepCopy(testConf.contextData),
                    testUtil.deepCopy(testConf.propertyData)
                ),
                testConf.expectedData
            ));
        });
    });

    describe('._renderTemplate()', () => {
        systemStatsUtilTestsData._renderTemplate.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil._renderTemplate(
                    testUtil.deepCopy(testConf.contextData),
                    testUtil.deepCopy(testConf.propertyData)
                ),
                testConf.expectedData
            ));
        });
    });

    describe('.renderProperty()', () => {
        systemStatsUtilTestsData.renderProperty.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil.renderProperty(
                    testUtil.deepCopy(testConf.contextData),
                    testUtil.deepCopy(testConf.propertyData)
                ),
                testConf.expectedData
            ));
        });
    });
});
