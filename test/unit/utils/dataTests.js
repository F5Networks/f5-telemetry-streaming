/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const dataUtil = require('../../../src/lib/utils/data');
const dataUtilTestsData = require('../data/dataUtilTestsData');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Data Util', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('getMatches', () => {
        dataUtilTestsData.getMatches.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = dataUtil.getMatches(
                    testConf.data,
                    testConf.propertyCtx,
                    testConf.propertyRegexCtx
                );
                assert.deepStrictEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('getDeepMatches', () => {
        dataUtilTestsData.getDeepMatches.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = dataUtil.getDeepMatches(
                    testConf.data,
                    testConf.propertiesCtx
                );
                assert.deepStrictEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('applyJMESPathExpression', () => {
        dataUtilTestsData.applyJMESPathExpression.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                dataUtil.applyJMESPathExpression(
                    testConf.dataCtx,
                    testConf.expression
                );
                assert.deepStrictEqual(testConf.dataCtx, testConf.expectedCtx);
            });
        });
    });

    describe('checkConditions', () => {
        ['', '_ifAnyMatch', '_ifAllMatch'].forEach((matchType) => {
            describe(matchType, () => {
                dataUtilTestsData[`checkConditions${matchType}`].forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, () => {
                        const resultCtx = dataUtil.checkConditions(
                            testConf.dataCtx,
                            testConf.actionsCtx
                        );
                        assert.strictEqual(resultCtx, testConf.expectedCtx);
                    });
                });
            });
        });
    });

    describe('searchAnyMatches', () => {
        dataUtilTestsData.searchAnyMatches.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const resultCtx = [];
                const callback = (key, item) => {
                    resultCtx.push(key);
                    return testConf.nestedKey ? item[testConf.nestedKey] : null;
                };
                dataUtil.searchAnyMatches(
                    testConf.data,
                    testConf.propertiesCtx,
                    callback
                );
                assert.deepStrictEqual(resultCtx, testConf.expectedCtx);
            });
        });
    });

    describe('removeStrictMatches', () => {
        dataUtilTestsData.removeStrictMatches.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
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
                    testConf.data,
                    testConf.propertiesCtx,
                    testConf.useCallback === false ? undefined : callback
                );
                assert.deepStrictEqual(testConf.data, expectedCtx);
                assert.strictEqual(actualRetVal, testConf.expectedRetVal);
            });
        });
    });

    [true, false].forEach((strictVal) => {
        describe(`preserveStrictMatches - strict=${strictVal}`, () => {
            dataUtilTestsData[`preserveStrictMatches_strict_${strictVal}`].forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, () => {
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
                        testConf.data,
                        testConf.propertiesCtx,
                        strictVal,
                        testConf.useCallback === false ? undefined : callback
                    );
                    assert.deepStrictEqual(testConf.data, expectedCtx);
                    assert.strictEqual(actualRetVal, testConf.expectedRetVal);
                });
            });
        });
    });
});
