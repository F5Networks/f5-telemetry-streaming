/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const defaultProperties = require('../../src/lib/properties.json');
const systemStatsTestsData = require('./data/systemStatsTestsData');
const SystemStats = require('../../src/lib/systemStats');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

const defaultPropertiesStateValidator = testUtil.getSpoiledDataValidator(defaultProperties);

moduleCache.remember();

describe('System Stats', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        defaultPropertiesStateValidator();
    });

    describe('.processData', () => {
        let sysStats;

        beforeEach(() => {
            sysStats = new SystemStats();
        });

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
            assert.deepStrictEqual(result, expected);
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
            assert.deepStrictEqual(result, expected);
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
            assert.deepStrictEqual(result, expected);
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
            assert.deepStrictEqual(result, expected);
        });

        it('should not apply default normalization to custom property', () => {
            const property = {
                key: 'propKey',
                isCustom: true
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
                'tenant~app~something': {
                    prop: 'value',
                    kind: 'dataKind',
                    selfLink: '/link/to/self'
                }
            };
            const dataStateValidator = testUtil.getSpoiledDataValidator(property);

            const result = sysStats._processData(property, data, key);
            assert.deepStrictEqual(result, expected);
            dataStateValidator();
        });
    });

    describe('._filterStats', () => {
        systemStatsTestsData._filterStats.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                const stats = typeof testConf.customEndpoints !== 'undefined' ? testConf.customEndpoints : defaultProperties.stats;
                const dataStateValidator = testUtil.getSpoiledDataValidator(stats);

                const systemStats = new SystemStats({
                    dataOpts: {
                        actions: testConf.actions,
                        noTMStats: testConf.skipTMStats
                    },
                    endpoints: testConf.customEndpoints
                });
                systemStats._filterStats();

                const activeStats = Object.keys(systemStats.isCustom ? systemStats.endpoints : systemStats.stats);

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

    describe('._processProperty()', () => {
        it('should return empty promise when disabled', () => {
            const systemStats = new SystemStats({ dataOpts: { noTMStats: true } });
            const property = {
                disabled: true
            };
            const dataStateValidator = testUtil.getSpoiledDataValidator(property);
            return systemStats._processProperty('', property)
                .then(() => {
                    assert.deepStrictEqual(systemStats.collectedData, {});
                    dataStateValidator();
                });
        });

        it('should add theKey to collectedData', () => {
            const systemStats = new SystemStats();
            const property = {
                structure: {
                    folder: true
                }
            };
            const dataStateValidator = testUtil.getSpoiledDataValidator(property);
            return systemStats._processProperty('theKey', property)
                .then(() => {
                    assert.deepStrictEqual(systemStats.collectedData.theKey, {});
                    dataStateValidator();
                });
        });

        it('should add to collectedData', () => {
            const systemStats = new SystemStats();
            const property = {
                key: 'theKey'
            };
            const expected = {
                theKey: {
                    key: 'theKey'
                }
            };
            sinon.stub(systemStats, '_loadData').resolves(property);
            const dataStateValidator = testUtil.getSpoiledDataValidator(property);
            return systemStats._processProperty('theKey', property)
                .then(() => {
                    assert.deepStrictEqual(systemStats.collectedData, expected);
                    dataStateValidator();
                });
        });
    });
});
