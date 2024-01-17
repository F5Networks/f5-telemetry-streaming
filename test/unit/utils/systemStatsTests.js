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
const systemStatsUtilTestsData = require('../data/systemStatsUtilTestsData');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const systemStatsUtil = sourceCode('src/lib/utils/systemStats');

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
