/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');

const util = require('./shared/util');
const dataUtil = require('../../src/lib/dataUtil.js');
const dataUtilTestsData = require('./dataUtilTestsData.js');

describe('Data Util', () => {
    describe('getMatches', () => {
        dataUtilTestsData.getMatches.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = dataUtil.getMatches(
                    testConf.dataCtx,
                    testConf.propertyCtx,
                    testConf.propertyRegexCtx
                );
                assert.deepEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('getDeepMatches', () => {
        dataUtilTestsData.getDeepMatches.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = dataUtil.getDeepMatches(
                    testConf.dataCtx,
                    testConf.propertiesCtx
                );
                assert.deepEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('checkConditions', () => {
        dataUtilTestsData.checkConditions.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = dataUtil.checkConditions(
                    testConf.dataCtx,
                    testConf.conditionsCtx
                );
                assert.strictEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('searchAnyMatches', () => {
        dataUtilTestsData.searchAnyMatches.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = [];
                const callback = (key, item) => {
                    resultCtx.push(key);
                    return testConf.nestedKey ? item[testConf.nestedKey] : null;
                };
                dataUtil.searchAnyMatches(
                    testConf.dataCtx,
                    testConf.propertiesCtx,
                    callback
                );
                assert.deepEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('removeStrictMatches', () => {
        dataUtilTestsData.removeStrictMatches.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const callback = (key, item, getNestedKey) => {
                    if (getNestedKey) {
                        return testConf.nestedKey ? item[testConf.nestedKey] : null;
                    }
                    if (testConf.propertiesToKeep
                            && Object.prototype.hasOwnProperty.call(testConf.propertiesToKeep, key)) {
                        return !testConf.propertiesToKeep[key];
                    }
                    return true;
                };
                let expectedCtx = testConf.expectedCtx;
                if (typeof expectedCtx === 'function') {
                    expectedCtx = expectedCtx();
                }
                const actualRetVal = dataUtil.removeStrictMatches(
                    testConf.dataCtx,
                    testConf.propertiesCtx,
                    testConf.useCallback === false ? undefined : callback
                );
                assert.deepStrictEqual(testConf.dataCtx, expectedCtx);
                assert.strictEqual(actualRetVal, testConf.expectedRetVal);
            });
        });
    });

    [true, false].forEach((strictVal) => {
        describe(`preserveStrictMatches - strict=${strictVal}`, () => {
            dataUtilTestsData[`preserveStrictMatches_strict_${strictVal}`].forEach((testConf) => {
                util.getCallableIt(testConf)(testConf.name, () => {
                    const callback = (key, item, getNestedKey) => {
                        if (getNestedKey) {
                            return testConf.nestedKey ? item[testConf.nestedKey] : null;
                        }
                        if (testConf.propertiesToKeep
                                && Object.prototype.hasOwnProperty.call(testConf.propertiesToKeep, key)) {
                            return !testConf.propertiesToKeep[key];
                        }
                        return true;
                    };
                    let expectedCtx = testConf.expectedCtx;
                    if (typeof expectedCtx === 'function') {
                        expectedCtx = expectedCtx();
                    }
                    const actualRetVal = dataUtil.preserveStrictMatches(
                        testConf.dataCtx,
                        testConf.propertiesCtx,
                        strictVal,
                        testConf.useCallback === false ? undefined : callback
                    );
                    assert.deepStrictEqual(testConf.dataCtx, expectedCtx);
                    assert.strictEqual(actualRetVal, testConf.expectedRetVal);
                });
            });
        });
    });
});
