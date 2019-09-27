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
const nock = require('nock');
const sinon = require('sinon');

const SystemStats = require('../../src/lib/systemStats');
const paths = require('../../src/lib/paths.json');
const allProperties = require('../../src/lib/properties.json');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('systemStats', () => {
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

    describe('.collect()', () => {
        function assertTmStat(statKey, tmctlKey) {
            nock('http://localhost:8100')
                .post(
                    '/mgmt/tm/util/bash',
                    {
                        command: 'run',
                        utilCmdArgs: `-c '/bin/tmctl -c ${tmctlKey}'`
                    }
                )
                .reply(200, {
                    commandResult: [
                        'a,b,c',
                        '0,0,spam',
                        '0,1,eggs'
                    ].join('\n')
                });

            const host = {};
            const options = {
                paths: {
                    endpoints: [paths.endpoints.find(p => p.name === 'tmctl')]
                },
                properties: {
                    stats: {
                        tmstats: allProperties.stats.tmstats,
                        [statKey]: allProperties.stats[statKey]
                    },
                    global: allProperties.global
                }
            };
            const stats = new SystemStats(host, options);
            return assert.becomes(stats.collect(), {
                tmstats: {
                    [statKey]: [
                        {
                            a: '0',
                            b: '0',
                            c: 'spam'
                        },
                        {
                            a: '0',
                            b: '1',
                            c: 'eggs'
                        }
                    ]
                }
            });
        }
        const stats = allProperties.stats;
        const tmctlArgs = '\\$tmctlArgs';

        Object.keys(stats).forEach((stat) => {
            if ((stats[stat].structure || {}).parentKey === 'tmstats') {
                const tableName = stats[stat].keyArgs.replaceStrings[tmctlArgs].split('-c').pop().trim();
                it(`should collect ${stat}`, () => assertTmStat(stat, tableName));
            }
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
