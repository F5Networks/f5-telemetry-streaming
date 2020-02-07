/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const util = require('./shared/util');
const systemStatsUtil = require('../../src/lib/systemStatsUtil.js');
const systemStatsUtilTestsData = require('./systemStatsUtilTestsData.js');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('System Stats Utils', () => {
    describe('._resolveConditional()', () => {
        systemStatsUtilTestsData._resolveConditional.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const promise = new Promise((resolve, reject) => {
                    try {
                        resolve(systemStatsUtil._resolveConditional(
                            util.deepCopy(testConf.contextData),
                            util.deepCopy(testConf.conditionalBlock)
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
            util.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil._preprocessProperty(
                    util.deepCopy(testConf.contextData),
                    util.deepCopy(testConf.propertyData)
                ),
                testConf.expectedData
            ));
        });
    });

    describe('._renderTemplate()', () => {
        systemStatsUtilTestsData._renderTemplate.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil._renderTemplate(
                    util.deepCopy(testConf.contextData),
                    util.deepCopy(testConf.propertyData)
                ),
                testConf.expectedData
            ));
        });
    });

    describe('.renderProperty()', () => {
        systemStatsUtilTestsData.renderProperty.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil.renderProperty(
                    util.deepCopy(testConf.contextData),
                    util.deepCopy(testConf.propertyData)
                ),
                testConf.expectedData
            ));
        });
    });
});
