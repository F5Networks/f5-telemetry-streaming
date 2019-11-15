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
        function filterPaths(name) {
            return {
                endpoints: [paths.endpoints.find(
                    p => p.name === name || p.endpoint === name
                )]

            };
        }
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
                paths: filterPaths('tmctl'),
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

        describe('tmstats', () => {
            const stats = allProperties.stats;
            const tmctlArgs = '\\$tmctlArgs';

            Object.keys(stats).forEach((stat) => {
                if ((stats[stat].structure || {}).parentKey === 'tmstats') {
                    const tableName = stats[stat].keyArgs.replaceStrings[tmctlArgs].split('-c').pop().trim();
                    it(`should collect ${stat}`, () => assertTmStat(stat, tableName));
                }
            });
        });

        it('should collect hostname and machineId', () => {
            nock('http://localhost:8100')
                .get('/mgmt/shared/identified-devices/config/device-info')
                .times(2)
                .reply(200, {
                    machineId: 'cc4826c5-d557-40c0-aa3f-3fc3aca0e40c',
                    hostname: 'test.local'
                });
            const host = {};
            const options = {
                paths: filterPaths('deviceInfo'),
                properties: {
                    stats: {
                        system: allProperties.stats.system,
                        hostname: allProperties.stats.hostname,
                        machineId: allProperties.stats.machineId
                    },
                    global: allProperties.global
                }
            };
            const stats = new SystemStats(host, options);
            return assert.becomes(stats.collect(), {
                system: {
                    hostname: 'test.local',
                    machineId: 'cc4826c5-d557-40c0-aa3f-3fc3aca0e40c'
                }
            });
        });

        it('should collect virtualServers', () => {
            const query = `$select=${[
                'name',
                'fullPath',
                'selfLink',
                'appService',
                'ipProtocol',
                'mask',
                'pool'
            ].join(',')}`;
            nock('http://localhost:8100')
                .get(`/mgmt/tm/ltm/virtual?${query}`)
                .reply(200, {
                    items: [
                        {
                            name: 'test',
                            fullPath: '/Common/test',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test?ver=13.1.1.3',
                            ipProtocol: 'tcp',
                            mask: '255.255.255.255',
                            pool: '/Common/pool',
                            poolReference: {
                                link: 'https://localhost/mgmt/tm/ltm/pool/~Common~pool?ver=13.1.1.3'
                            }
                        }
                    ]
                });
            nock('http://localhost:8100')
                .get('/mgmt/tm/ltm/virtual/~Common~test/stats')
                .reply(200, {
                    kind: 'tm:ltm:virtual:virtualstats',
                    generation: 1,
                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test/stats?ver=13.1.1.3',
                    entries: {
                        'https://localhost/mgmt/tm/ltm/virtual/~Common~test/~Common~test/stats': {
                            nestedStats: {
                                kind: 'tm:ltm:virtual:virtualstats',
                                selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test/~Common~test/stats?ver=13.1.1.3',
                                entries: {
                                    'clientside.bitsIn': {
                                        value: 1
                                    },
                                    'clientside.bitsOut': {
                                        value: 2
                                    },
                                    'clientside.curConns': {
                                        value: 3
                                    },
                                    'clientside.evictedConns': {
                                        value: 0
                                    },
                                    'clientside.maxConns': {
                                        value: 0
                                    },
                                    'clientside.pktsIn': {
                                        value: 0
                                    },
                                    'clientside.pktsOut': {
                                        value: 0
                                    },
                                    'clientside.slowKilled': {
                                        value: 0
                                    },
                                    'clientside.totConns': {
                                        value: 0
                                    },
                                    cmpEnableMode: {
                                        description: 'all-cpus'
                                    },
                                    cmpEnabled: {
                                        description: 'enabled'
                                    },
                                    csMaxConnDur: {
                                        value: 0
                                    },
                                    csMeanConnDur: {
                                        value: 0
                                    },
                                    csMinConnDur: {
                                        value: 0
                                    },
                                    destination: {
                                        description: '192.0.2.1:80'
                                    },
                                    'ephemeral.bitsIn': {
                                        value: 0
                                    },
                                    'ephemeral.bitsOut': {
                                        value: 0
                                    },
                                    'ephemeral.curConns': {
                                        value: 0
                                    },
                                    'ephemeral.evictedConns': {
                                        value: 0
                                    },
                                    'ephemeral.maxConns': {
                                        value: 0
                                    },
                                    'ephemeral.pktsIn': {
                                        value: 0
                                    },
                                    'ephemeral.pktsOut': {
                                        value: 0
                                    },
                                    'ephemeral.slowKilled': {
                                        value: 0
                                    },
                                    'ephemeral.totConns': {
                                        value: 0
                                    },
                                    fiveMinAvgUsageRatio: {
                                        value: 0
                                    },
                                    fiveSecAvgUsageRatio: {
                                        value: 0
                                    },
                                    tmName: {
                                        description: '/Common/test'
                                    },
                                    oneMinAvgUsageRatio: {
                                        value: 0
                                    },
                                    'status.availabilityState': {
                                        description: 'unknown'
                                    },
                                    'status.enabledState': {
                                        description: 'enabled'
                                    },
                                    'status.statusReason': {
                                        description: 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet'
                                    },
                                    syncookieStatus: {
                                        description: 'not-activated'
                                    },
                                    'syncookie.accepts': {
                                        value: 0
                                    },
                                    'syncookie.hwAccepts': {
                                        value: 0
                                    },
                                    'syncookie.hwSyncookies': {
                                        value: 0
                                    },
                                    'syncookie.hwsyncookieInstance': {
                                        value: 0
                                    },
                                    'syncookie.rejects': {
                                        value: 0
                                    },
                                    'syncookie.swsyncookieInstance': {
                                        value: 0
                                    },
                                    'syncookie.syncacheCurr': {
                                        value: 0
                                    },
                                    'syncookie.syncacheOver': {
                                        value: 0
                                    },
                                    'syncookie.syncookies': {
                                        value: 0
                                    },
                                    totRequests: {
                                        value: 0
                                    }
                                }
                            }
                        }
                    }
                });
            const host = {};
            const options = {
                paths: filterPaths('virtualServers'),
                properties: {
                    stats: {
                        virtualServers: allProperties.stats.virtualServers
                    },
                    global: allProperties.global
                }
            };
            const stats = new SystemStats(host, options);
            return assert.becomes(stats.collect(), {
                virtualServers: {
                    '/Common/test': {
                        availabilityState: 'unknown',
                        'clientside.bitsIn': 1,
                        'clientside.bitsOut': 2,
                        'clientside.curConns': 3,
                        destination: '192.0.2.1:80',
                        enabledState: 'enabled',
                        ipProtocol: 'tcp',
                        mask: '255.255.255.255',
                        name: '/Common/test',
                        pool: '/Common/pool'
                    }
                }
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
