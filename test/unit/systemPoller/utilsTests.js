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
const filterStatsUtilTestsData = require('./data/filterStatsTestsData');
const sourceCode = require('../shared/sourceCode');
const systemStatsUtilTestsData = require('./data/utilsTestsData');
const testUtil = require('../shared/util');

const defaultProperties = sourceCode('src/lib/properties.json');
const systemStatsUtil = sourceCode('src/lib/systemPoller/utils');

moduleCache.remember();

describe('System Poller / Utils', () => {
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

    describe('.filterStats()', () => {
        filterStatsUtilTestsData.filterStats.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const stats = typeof testConf.customEndpoints !== 'undefined' ? testConf.customEndpoints : defaultProperties.stats;
                const dataStateValidator = testUtil.getSpoiledDataValidator(stats);
                const filteredStats = systemStatsUtil.filterStats(stats, testConf.actions, !!testConf.skipTMStats);

                const activeStats = Object.keys(filteredStats);

                // not strict, just verifies that properties are not in skip list
                // so, if property in skip list -> it is an error
                const shouldKeep = (testConf.shouldKeep || testConf.shouldKeepOnly || []).filter(
                    (statKey) => activeStats.indexOf(statKey) === -1
                );
                assert.isEmpty(shouldKeep, `[shouldKeep] should keep following properties - '${JSON.stringify(shouldKeep)}'`);

                // not strict, just verifies that properties are in skip list
                // so, if property not in skip list -> it is an error
                const shouldRemove = (testConf.shouldRemove || testConf.shouldRemoveOnly || []).filter(
                    // stats key SHOULD be in skip list
                    (statKey) => activeStats.indexOf(statKey) !== -1
                );
                assert.isEmpty(shouldRemove, `[shouldRemove] should remove following properties - '${JSON.stringify(shouldRemove)}'`);

                // strict, that only certain properties are presented.
                // [] (empty array) - means 'keep nothing'
                let notRemoved = [];
                if (testConf.shouldKeepOnly) {
                    notRemoved = Object.keys(stats).filter(
                        (statKey) => activeStats.indexOf(statKey) !== -1
                            && testConf.shouldKeepOnly.indexOf(statKey) === -1
                    );
                }
                assert.isEmpty(notRemoved, `[shouldKeepOnly] should remove following properties - '${JSON.stringify(notRemoved)}'`);

                // strict, verifies only that properties are removed.
                // [] (empty array) - means 'remove nothing'
                let notKept = [];
                if (testConf.shouldRemoveOnly) {
                    notKept = Object.keys(stats).filter(
                        (statKey) => activeStats.indexOf(statKey) === -1
                            && testConf.shouldRemoveOnly.indexOf(statKey) === -1
                    );
                }
                assert.isEmpty(notKept, `[shouldRemoveOnly] should keep following properties - '${JSON.stringify(notKept)}'`);

                dataStateValidator();
            });
        });
    });
});
