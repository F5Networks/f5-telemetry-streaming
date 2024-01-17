/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const assert = require('../shared/assert');
const dataUtilTestsData = require('../data/dataUtilTestsData');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const dataUtil = sourceCode('src/lib/utils/data');

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
