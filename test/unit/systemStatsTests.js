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
const systemStatsTestsData = require('./systemStatsTestsData.js');

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

        describe('tmstats', () => {
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

            const stats = allProperties.stats;
            const tmctlArgs = '\\$tmctlArgs';

            Object.keys(stats).forEach((stat) => {
                if ((stats[stat].structure || {}).parentKey === 'tmstats') {
                    const tableName = stats[stat].keyArgs.replaceStrings[tmctlArgs].split('-c').pop().trim();
                    it(`should collect ${stat}`, () => assertTmStat(stat, tableName));
                }
            });
        });

        describe('system info', () => {
            it('should collect cpu data', () => {
                nock('http://localhost:8100')
                    .get('/mgmt/tm/sys/host-info')
                    .times(1)
                    .reply(200, {
                        entries: {
                            'https://localhost/mgmt/tm/sys/host-info/0': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/hostInfo/0/cpuInfo': {
                                            nestedStats: {
                                                entries: {
                                                    'https://localhost/mgmt/tm/sys/hostInfo/0/cpuInfo/0': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 6
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/0/cpuInfo/1': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 8
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/0/cpuInfo/2': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 12
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/0/cpuInfo/3': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 2
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                const host = {};
                const options = {
                    paths: filterPaths('/mgmt/tm/sys/host-info'),
                    properties: {
                        stats: {
                            system: allProperties.stats.system,
                            cpu: allProperties.stats.cpu
                        },
                        global: allProperties.global
                    }
                };
                const stats = new SystemStats(host, options);
                return assert.becomes(stats.collect(), {
                    system: {
                        cpu: 7
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
        });

        describe('virtual servers', () => {
            before(() => {
                const mockResps = systemStatsTestsData.collectVirtualServers;
                mockResps.forEach((mock) => {
                    nock('http://localhost:8100')
                        .get(mock.endpoint)
                        .reply(200, mock.response);
                });
            });

            it('should collect virtualServers config and stats', () => {
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

        describe('dns and gslb', () => {
            let stats;

            before(() => {
                sinon.stub(SystemStats.prototype, '_computeContextData').resolves();
            });

            beforeEach(() => {
                const mockResps = systemStatsTestsData.collectGtm;
                mockResps.forEach((mock) => {
                    nock('http://localhost:8100')
                        .get(mock.endpoint)
                        .reply(200, mock.response);
                });
                const endpointNames = [
                    'aWideIps',
                    'cnameWideIps',
                    'aPools',
                    'mxPools'
                ];
                const host = {};
                const options = {
                    paths: {
                        endpoints: paths.endpoints.filter(p => endpointNames.indexOf(p.name) > -1)
                    },
                    properties: {
                        stats: {
                            aWideIps: allProperties.stats.aWideIps,
                            cnameWideIps: allProperties.stats.cnameWideIps,
                            aPools: allProperties.stats.aPools,
                            mxPools: allProperties.stats.mxPools
                        },
                        global: allProperties.global
                    }
                };
                stats = new SystemStats(host, options);
                SystemStats.prototype._computeContextData.restore();
                sinon.stub(SystemStats.prototype, '_computeContextData').callsFake(() => {
                    stats.contextData = {
                        provisioning: {
                            gtm: {
                                name: 'gtm',
                                level: 'minimum'
                            }
                        }
                    };
                    return Promise.resolve();
                });
            });

            afterEach(() => {
                nock.cleanAll();
            });

            it('should collect wideip config and stats', () => stats.collect()
                .then((actualStats) => {
                    assert.deepEqual(actualStats.aWideIps,
                        {
                            '/Common/www.aone.tstest.com': {
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                fallback: 0,
                                persisted: 0,
                                preferred: 2,
                                rcode: 0,
                                requests: 8,
                                resolutions: 2,
                                returnFromDns: 0,
                                returnToDns: 3,
                                'status.availabilityState': 'offline',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'No enabled pools available',
                                wipType: 'A',
                                lastResortPool: '',
                                name: '/Common/www.aone.tstest.com',
                                partition: 'Common',
                                persistCidrIpv4: 32,
                                loadBalancingDecisionLogVerbosity: [
                                    'pool-selection',
                                    'pool-traversal',
                                    'pool-member-selection',
                                    'pool-member-traversal'
                                ],
                                pools: [
                                    '/Common/ts_a_pool'
                                ],
                                poolLbMode: 'round-robin',
                                persistence: 'disabled',
                                ttlPersistence: 3600,
                                failureRcode: 'noerror',
                                minimalResponse: 'enabled',
                                failureRcodeTtl: 0,
                                aliases: [
                                    'www.aone.com'
                                ],
                                enabled: true,
                                persistCidrIpv6: 128,
                                failureRcodeResponse: 'disabled'
                            }
                        });

                    assert.deepEqual(actualStats.cnameWideIps,
                        {
                            '/Common/www.cnameone.tstest.com': {
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                fallback: 0,
                                persisted: 0,
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.availabilityState': 'unknown',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'Checking',
                                wipType: 'CNAME',
                                name: 'www.cnameone.tstest.com',
                                partition: 'Common',
                                enabled: true,
                                failureRcode: 'noerror',
                                failureRcodeResponse: 'disabled',
                                failureRcodeTtl: 0,
                                lastResortPool: '',
                                minimalResponse: 'enabled',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persistence: 'disabled',
                                poolLbMode: 'round-robin',
                                ttlPersistence: 3600
                            }
                        });
                }));

            it('should collect pools and members config and stats', () => stats.collect().then((actualStats) => {
                assert.deepEqual(actualStats.aPools,
                    {
                        '/Common/ts_a_pool': {
                            alternate: 10,
                            dropped: 10,
                            fallback: 10,
                            poolType: 'A',
                            preferred: 10,
                            returnFromDns: 10,
                            returnToDns: 10,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_a_pool',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackIp: '8.8.8.8',
                            fallbackMode: 'return-to-dns',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            loadBalancingMode: 'ratio',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
                            monitor: '/Common/gateway_icmp',
                            partition: 'Common',
                            qosHitRatio: 5,
                            qosHops: 0,
                            qosKilobytesSecond: 3,
                            qosLcs: 30,
                            qosPacketRate: 1,
                            qosRtt: 50,
                            qosTopology: 0,
                            qosVsCapacity: 0,
                            qosVsScore: 0,
                            ttl: 30,
                            verifyMemberAvailability: 'disabled',
                            members: {
                                'vs1:/Common/server1': {
                                    enabled: true,
                                    limitMaxBps: 100,
                                    limitMaxBpsStatus: 'disabled',
                                    limitMaxConnections: 100,
                                    limitMaxConnectionsStatus: 'disabled',
                                    limitMaxPps: 100,
                                    limitMaxPpsStatus: 'disabled',
                                    memberOrder: 100,
                                    monitor: 'default',
                                    name: 'server1:vs1',
                                    ratio: 1,
                                    alternate: 20,
                                    fallback: 20,
                                    partition: 'Common',
                                    poolName: '/Common/ts_a_pool',
                                    poolType: 'A',
                                    preferred: 20,
                                    serverName: '/Common/server1',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' Monitor /Common/gateway_icmp from 172.16.100.17 : no route',
                                    vsName: 'vs1'
                                }
                            }
                        }
                    });

                assert.deepEqual(actualStats.mxPools,
                    {
                        '/Common/ts_mx_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'MX',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            fallbackMode: 'return-to-dns',
                            ttl: 30,
                            name: '/Common/ts_mx_pool',
                            partition: 'Common',
                            members: {
                                'www.aaaaone.tstest.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_mx_pool',
                                    poolType: 'MX',
                                    preferred: 0,
                                    serverName: 'www.aaaaone.tstest.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                    vsName: ' '
                                },
                                'www.aone.tstest.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_mx_pool',
                                    poolType: 'MX',
                                    preferred: 0,
                                    serverName: 'www.aone.tstest.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                    vsName: ' '
                                }
                            },
                            alternateMode: 'topology',
                            qosHops: 0,
                            verifyMemberAvailability: 'enabled',
                            qosPacketRate: 1,
                            qosRtt: 50,
                            enabled: true,
                            qosLcs: 30,
                            qosVsCapacity: 0,
                            qosVsScore: 0,
                            maxAnswersReturned: 12,
                            loadBalancingMode: 'round-robin',
                            qosHitRatio: 5,
                            qosKilobytesSecond: 3,
                            qosTopology: 0,
                            manualResume: 'enabled',
                            dynamicRatio: 'enabled'
                        }
                    });
            }));

            it('data should be undefined if gtm is not provisioned', () => {
                SystemStats.prototype._computeContextData.restore();
                sinon.stub(SystemStats.prototype, '_computeContextData').callsFake(() => {
                    stats.contextData = {
                        provisioning: {
                            ltm: {
                                name: 'ltm',
                                level: 'nominal'
                            }
                        }
                    };
                    return Promise.resolve();
                });

                return assert.becomes(stats.collect(), {
                    aWideIps: undefined,
                    aPools: undefined,
                    cnameWideIps: undefined,
                    mxPools: undefined
                });
            });
        });
    });

    describe('._filterStats', () => {
        const getCallableIt = testConf => (testConf.testOpts && testConf.testOpts.only ? it.only : it);

        systemStatsTestsData._filterStats.forEach((testConf) => {
            getCallableIt(testConf)(testConf.name, () => {
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
