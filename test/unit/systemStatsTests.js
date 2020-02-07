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
const sinon = require('sinon');

const util = require('./shared/util');
const defaultProperties = require('../../src/lib/properties.json');
const SystemStats = require('../../src/lib/systemStats');
const systemStatsTestsData = require('./systemStatsTestsData.js');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('System Stats', () => {
    // global vars - to avoid problems with 'before(Each)'
    let allProperties = util.deepCopy(defaultProperties);

    beforeEach(() => {
        // do copy before each test to avoid modifications
        allProperties = util.deepCopy(defaultProperties);
    });

    describe('.processData', () => {
        const sysStats = new SystemStats({}, {});

        it('should skip normalization', () => {
            const property = {
                key: 'propKey',
                normalize: false
            };
            const data = {
                kind: 'dataKind'
            };
            const key = 'keyForData';
            const expected = {
                kind: 'dataKind'
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });

        it('should normalize data', () => {
            const property = {
                key: 'propKey',
                normalization: [
                    {
                        convertArrayToMap: { keyName: 'name', keyNamePrefix: 'name/' }
                    },
                    {
                        includeFirstEntry: ''
                    },
                    {
                        filterKeys: { exclude: ['fullPath'] }
                    },
                    {
                        renameKeys: { patterns: { prop1: { pattern: 'prop' } } }
                    },
                    {
                        runFunctions: []
                    },
                    {
                        addKeysByTag: { skip: ['something'] }
                    }
                ]
            };
            const data = {
                'tenant/app/item': {
                    prop1: 'someData',
                    prop2: 'someMoreData',
                    fullPath: 'the/full/path'
                }
            };
            const key = 'keyValue';
            const expected = {
                'tenant/app/item': {
                    prop: 'someData',
                    prop2: 'someMoreData',
                    name: 'tenant/app/item'
                }
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });

        it('should normalize data and use defaults without normalization array', () => {
            const property = {
                key: 'propKey'
            };
            const data = {
                'tenant~app~name': {
                    prop: 'value',
                    kind: 'dataKind',
                    selfLink: '/link/to/self'
                }
            };
            const key = 'keyValue';
            const expected = {
                'tenant/app/name': {
                    prop: 'value'
                }
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });

        it('should normalize data and use defaults with normalization array', () => {
            const property = {
                key: 'propKey',
                normalization: [
                    {
                        addKeysByTag: { skip: ['prop2'] }
                    }
                ]
            };
            const data = {
                'tenant~app~something': {
                    prop: 'value',
                    kind: 'dataKind',
                    selfLink: '/link/to/self'
                }
            };
            const key = 'keyValue';
            const expected = {
                'tenant/app/something': {
                    prop: 'value',
                    name: 'tenant/app/something'
                }
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });
    });

    describe('._filterStats', () => {
        systemStatsTestsData._filterStats.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                const systemStats = new SystemStats({}, { noTmstats: true, actions: testConf.actions });
                systemStats._filterStats();
                const statsKeys = Object.keys(systemStats.stats);

                // not strict, just verifies that properties are presented
                const shouldKeep = (testConf.shouldKeep || testConf.shouldKeepOnly || []).filter(
                    statKey => statsKeys.indexOf(statKey) === -1
                );
                assert.strictEqual(shouldKeep.length, 0,
                    `[shouldKeep] should keep following properties - '${JSON.stringify(shouldKeep)}'`);

                // not strict, just verifies that properties are removed
                const shouldRemove = (testConf.shouldRemove || testConf.shouldRemoveOnly || []).filter(
                    statKey => statsKeys.indexOf(statKey) !== -1
                );
                assert.strictEqual(shouldRemove.length, 0,
                    `[shouldRemove] should remove following properties - '${JSON.stringify(shouldRemove)}'`);

                // strict, verifies only that properties are presented.
                // [] (empty array) - means 'keep nothing'
                let notRemoved = [];
                if (testConf.shouldKeepOnly) {
                    notRemoved = statsKeys.filter(
                        statKey => testConf.shouldKeepOnly.indexOf(statKey) === -1
                    );
                }
                assert.strictEqual(notRemoved.length, 0,
                    `[shouldKeepOnly] should remove following properties - '${JSON.stringify(notRemoved)}'`);

                // strict, verifies only that properties are removed.
                // [] (empty array) - means 'remove nothing'
                let notKept = [];
                if (testConf.shouldRemoveOnly) {
                    const defaultKeys = Object.keys(allProperties.stats);
                    notKept = defaultKeys.filter(
                        statKey => statsKeys.indexOf(statKey) === -1
                                    && testConf.shouldRemoveOnly.indexOf(statKey) === -1
                    );
                }
                assert.strictEqual(notKept.length, 0,
                    `[shouldRemoveOnly] should keep following properties - '${JSON.stringify(notKept)}'`);
            });
        });
    });

    describe('._processProperty()', () => {
        it('should return empty promise when noTmstats is true', () => {
            const systemStats = new SystemStats({}, { noTmstats: true });
            const property = {
                structure: {
                    parentKey: 'tmstats'
                }
            };
            return systemStats._processProperty('', property)
                .then(() => {
                    assert.deepEqual(systemStats.collectedData, {});
                });
        });

        it('should return empty promise when disabled', () => {
            const systemStats = new SystemStats({}, { noTmstats: true });
            const property = {
                disabled: true
            };
            return systemStats._processProperty('', property)
                .then(() => {
                    assert.deepEqual(systemStats.collectedData, {});
                });
        });

        it('should add theKey to collectedData', () => {
            const systemStats = new SystemStats({}, {});
            const property = {
                structure: {
                    folder: true
                }
            };
            return systemStats._processProperty('theKey', property)
                .then(() => {
                    assert.deepEqual(systemStats.collectedData.theKey, {});
                });
        });

        it('should add to collectedData', () => {
            const systemStats = new SystemStats({}, {});
            const property = {
                key: 'theKey'
            };
            const expected = {
                theKey: {
                    key: 'theKey'
                }
            };
            sinon.stub(systemStats, '_loadData').callsFake(() => Promise.resolve(property));
            return systemStats._processProperty('theKey', property)
                .then(() => {
                    assert.deepEqual(systemStats.collectedData, expected);
                });
        });
    });
});
