/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const systemStatsUtil = require('../../../src/lib/utils/systemStats');
const systemStatsUtilTestsData = require('../data/systemStatsUtilTestsData');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('System Stats Utils', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('.renderProperty()', () => {
        systemStatsUtilTestsData.renderProperty.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const contextStateValidator = testUtil.getSpoiledDataValidator(testConf.contextData);
                const propertyCopy = testUtil.deepCopy(testConf.propertyData);

                const promise = new Promise((resolve, reject) => {
                    try {
                        resolve(systemStatsUtil.renderProperty(testConf.contextData, propertyCopy));
                    } catch (err) {
                        reject(err);
                    }
                });
                if (testConf.errorMessage) {
                    return assert.isRejected(promise, testConf.errorMessage);
                }
                return promise.then((result) => {
                    assert.deepStrictEqual(result, testConf.expectedData, 'should match expected data');
                    assert.deepStrictEqual(result, propertyCopy, 'should modify property in place');
                    contextStateValidator();
                });
            });
        });
    });

    describe('.splitKey()', () => {
        systemStatsUtilTestsData.splitKey.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                systemStatsUtil.splitKey(testConf.key),
                testConf.expected
            ));
        });
    });
});
