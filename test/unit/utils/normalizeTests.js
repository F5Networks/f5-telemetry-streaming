/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
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

const normalizeUtil = require('../../../src/lib/utils/normalize');
const util = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Normalize Util', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('._convertArrayToMap()', () => {
        it('should convert array to map with single key', () => {
            const array = [
                {
                    name: 'foo'
                }
            ];
            const expectedMap = {
                foo: {
                    name: 'foo'
                }
            };
            const actualMap = normalizeUtil._convertArrayToMap(array, 'name');
            assert.deepStrictEqual(actualMap, expectedMap);
        });

        it('should convert array to map when mapKey is an array (compound key)', () => {
            const array = [
                {
                    name: 'foo',
                    key1: 'ok',
                    key2: 'yes',
                    nonKey: 'maybe'
                }
            ];
            const expectedMap = {
                ok_yes: {
                    name: 'foo',
                    key1: 'ok',
                    key2: 'yes',
                    nonKey: 'maybe'
                }
            };
            const actualMap = normalizeUtil._convertArrayToMap(array, ['key1', 'key2']);
            assert.deepStrictEqual(actualMap, expectedMap);
        });

        it('should convert array to map when mapKey is an array (compound key) and separator specified', () => {
            const array = [
                {
                    name: 'foo',
                    key1: 'ok',
                    key2: 'yes',
                    key3: 'sure',
                    nonKey: 'maybe'
                }
            ];
            const expectedMap = {
                'ok-yes-sure': {
                    name: 'foo',
                    key1: 'ok',
                    key2: 'yes',
                    key3: 'sure',
                    nonKey: 'maybe'
                }
            };
            const actualMap = normalizeUtil._convertArrayToMap(array, ['key1', 'key2', 'key3'], { keyNamesSeparator: '-' });
            assert.deepStrictEqual(actualMap, expectedMap);
        });

        it('should fail to convert array to map when data is not array', () => assert.throws(
            () => normalizeUtil._convertArrayToMap({}, 'name'),
            /array required/
        ));
    });

    describe('._filterDataByKeys()', () => {
        it('should filter data by keys', () => {
            const obj = {
                'name/foo': {
                    name: 'foo',
                    removeMe: 'foo'
                }
            };
            const expectedObj = {
                'name/foo': {
                    name: 'foo'
                }
            };
            // include
            let actualObj = normalizeUtil._filterDataByKeys(obj, { include: ['name'] });
            assert.deepStrictEqual(actualObj, expectedObj);
            // exclude
            actualObj = normalizeUtil._filterDataByKeys(obj, { exclude: ['removeMe'] });
            assert.deepStrictEqual(actualObj, expectedObj);
        });

        it('should not filter array', () => {
            const obj = [1, 2, 3];
            const actualObj = normalizeUtil._filterDataByKeys(obj, { include: ['name'] });
            assert.deepStrictEqual(actualObj, obj);
        });
    });

    describe('.getAverage()', () => {
        it('should get average', () => {
            const data = {
                tmm0: {
                    oneMinAverageSystem: 10
                },
                tmm1: {
                    oneMinAverageSystem: 20
                }
            };
            const expectedResult = 15;
            const result = normalizeUtil.getAverage({ data, keyWithValue: 'oneMinAverageSystem' });
            assert.deepStrictEqual(result, expectedResult);
        });
    });

    describe('restructureHostCpuInfo', () => {
        const cpuInfoPattern = '^sys/host-info/\\d+::^sys/hostInfo/\\d+/cpuInfo';

        it('should get cpuInfo properties via regex', () => {
            const data = {
                'sys/host-info/0': {
                    'sys/hostInfo/0/cpuInfo': {
                        'sys/hostInfo/0/cpuInfo/0': {
                            oneMinAvgSystem: 2
                        },
                        'sys/hostInfo/0/cpuInfo/1': {
                            oneMinAvgSystem: 4
                        }
                    }
                },
                'sys/host-info/1': {
                    'sys/hostInfo/1/cpuInfo': {
                        'sys/hostInfo/1/cpuInfo/0': {
                            oneMinAvgSystem: 6
                        },
                        'sys/hostInfo/1/cpuInfo/1': {
                            oneMinAvgSystem: 8
                        }
                    }
                },
                'notsys/host-info/2': {
                    'sys/hostInfo/2/cpuInfo': {
                        'sys/hostInfo/2/cpuInfo/0': {
                            oneMinAvgSystem: 77
                        },
                        'sys/hostInfo/2/cpuInfo/1': {
                            oneMinAvgSystem: 78
                        }
                    }
                },
                'sys/host-info/3': {
                    'sys/hostInfo/notNumber/cpuInfo': {
                        'sys/hostInfo/notNumber/cpuInfo/0': {
                            oneMinAvgSystem: 87
                        },
                        'sys/hostInfo/notNumber/cpuInfo/1': {
                            oneMinAvgSystem: 88
                        }
                    }
                }
            };
            const expectedResult = {
                'sys/hostInfo/0/cpuInfo/0': {
                    oneMinAvgSystem: 2
                },
                'sys/hostInfo/0/cpuInfo/1': {
                    oneMinAvgSystem: 4
                },
                'sys/hostInfo/1/cpuInfo/0': {
                    oneMinAvgSystem: 6
                },
                'sys/hostInfo/1/cpuInfo/1': {
                    oneMinAvgSystem: 8
                }
            };
            const result = normalizeUtil.restructureHostCpuInfo({ data, keyPattern: cpuInfoPattern });
            assert.deepStrictEqual(result, expectedResult);
        });

        it('should return \'missing data\' if empty data', () => {
            const data = {};

            const result = normalizeUtil.restructureHostCpuInfo({ data, keyPattern: cpuInfoPattern });
            assert.deepStrictEqual(result, 'missing data');
        });

        it('should return \'missing data\' if no matches', () => {
            const data = {
                a: {
                    b: '1'
                }
            };

            const result = normalizeUtil.restructureHostCpuInfo({ data, keyPattern: cpuInfoPattern });
            assert.deepStrictEqual(result, 'missing data');
        });
    });
    describe('.getSum()', () => {
        it('should get sum', () => {
            const data = {
                tmm0: {
                    clientSideTrafficBitsIn: 10,
                    clientSideTrafficBitsOut: 20
                },
                tmm1: {
                    clientSideTrafficBitsIn: 20,
                    clientSideTrafficBitsOut: 40
                }
            };
            const expectedResult = {
                clientSideTrafficBitsIn: 30,
                clientSideTrafficBitsOut: 60
            };

            let result = normalizeUtil.getSum({ data });
            assert.deepStrictEqual(result, expectedResult);

            // check empty object is returned
            result = normalizeUtil.getSum({ data: '' });
            assert.deepStrictEqual(result, {});

            // check that child non object does not cause issues
            data.mangled = 'foo';
            result = normalizeUtil.getSum({ data });
            assert.deepStrictEqual(result, expectedResult);
        });
    });

    describe('.getFirstKey()', () => {
        it('should get first key', () => {
            const data = {
                '10.0.0.1/24': {
                    description: 'foo'
                },
                '10.0.0.2/24': {
                    description: 'foo'
                }
            };
            // check multiple branches
            let expectedResult = '10.0.0.1/24';
            let result = normalizeUtil.getFirstKey({ data });
            assert.strictEqual(result, expectedResult);

            expectedResult = 'https://10.0.0.1';
            result = normalizeUtil.getFirstKey({ data, splitOnValue: '/', keyPrefix: 'https://' });
            assert.strictEqual(result, expectedResult);

            expectedResult = 'null';
            result = normalizeUtil.getFirstKey({ data: '' });
            assert.strictEqual(result, expectedResult);
        });
    });

    describe('.getPercentFromKeys()', () => {
        it('should get percent from keys', () => {
            const data = {
                total: 10000,
                partial: 2000
            };
            const expectedResult = 20; // percent

            const result = normalizeUtil.getPercentFromKeys({ data, totalKey: 'total', partialKey: 'partial' });
            assert.strictEqual(result, expectedResult);
        });

        it('should get percent from nested keys', () => {
            const data = {
                one: {
                    total: 10000,
                    partial: 2000
                },
                two: {
                    total: 30000,
                    partial: 4000
                }
            };
            const expectedResult = 15; // percent

            const result = normalizeUtil.getPercentFromKeys({
                data, totalKey: 'total', partialKey: 'partial', nestedObjects: true
            });
            assert.strictEqual(result, expectedResult);
        });

        it('should not fail when \'missing data\'', () => {
            const data = 'missing data';

            assert.doesNotThrow(() => normalizeUtil.getPercentFromKeys({
                data, totalKey: 'total', partialKey: 'partial', nestedObjects: true
            }));
        });
    });

    describe('.formatAsJson()', () => {
        it('should format as json', () => {
            const data = 'named_key,key1\nname,value';
            const expectedResult = {
                name: {
                    named_key: 'name',
                    key1: 'value'
                }
            };

            const result = normalizeUtil.formatAsJson({ data, type: 'csv', mapKey: 'named_key' });
            assert.deepStrictEqual(result, expectedResult);
        });

        it('should format as json and filter/rename', () => {
            const data = 'named_key,key1,key2,key3\nname,value,value,value';
            const expectedResult = {
                name: {
                    named_key: 'name',
                    key1: 'value',
                    renamedKey: 'value'
                }
            };

            const result = normalizeUtil.formatAsJson({
                data,
                type: 'csv',
                mapKey: 'named_key',
                filterKeys: { exclude: ['key2'] },
                renameKeys: { patterns: { key3: { constant: 'renamedKey' } } }
            });
            assert.deepStrictEqual(result, expectedResult);
        });

        it('should format as json array and skip mapping keys', () => {
            const data = 'named_key,key1\nnameOne,valueOne\nnameTwo,valueTwo';
            const expectedResult = [
                {
                    named_key: 'nameOne',
                    key1: 'valueOne'
                },
                {
                    named_key: 'nameTwo',
                    key1: 'valueTwo'
                }
            ];

            const result = normalizeUtil.formatAsJson({ data, type: 'csv' });
            assert.deepStrictEqual(result, expectedResult);
        });

        it('should throw error about incorrect type', () => {
            const data = 'named_key,key1\nname,value';

            try {
                normalizeUtil.formatAsJson({ data, type: 'foo', mapKey: 'named_key' });
                assert.fail('Error expected');
            } catch (err) {
                const msg = err.message || err;
                assert.notStrictEqual(msg.indexOf('Unsupported type'), -1);
            }
        });

        it('should format as json when mapKey is an array (compound key)', () => {
            const data = 'pool_name,addr,port\nthePool,1.2.3.4,8080';
            const expectedResult = {
                'thePool_1.2.3.4_8080': {
                    pool_name: 'thePool',
                    addr: '1.2.3.4',
                    port: '8080'
                }
            };

            const result = normalizeUtil.formatAsJson({ data, type: 'csv', mapKey: ['pool_name', 'addr', 'port'] });
            assert.deepStrictEqual(result, expectedResult);
        });
    });

    describe('.restructureRules()', () => {
        it('should restructure rules', () => {
            const args = {
                data: {
                    '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth:RULE_INIT': {
                        aborts: 0,
                        avgCycles: 30660,
                        eventType: 'RULE_INIT',
                        failures: 0,
                        maxCycles: 30660,
                        minCycles: 23832,
                        priority: 500,
                        tmName: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth',
                        totalExecutions: 4
                    },
                    '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth:RULE_INIT': {
                        aborts: 0,
                        avgCycles: 26028,
                        eventType: 'RULE_INIT',
                        failures: 0,
                        maxCycles: 26028,
                        minCycles: 23876,
                        priority: 500,
                        tmName: '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth',
                        totalExecutions: 4
                    },
                    '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth:HTTP_REQUEST': {
                        aborts: 0,
                        avgCycles: 26028,
                        eventType: 'HTTP_REQUEST',
                        failures: 0,
                        maxCycles: 9999,
                        minCycles: 23876,
                        priority: 500,
                        tmName: '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth',
                        totalExecutions: 4
                    }
                }
            };
            const expected = {
                '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                    events: {
                        RULE_INIT: {
                            aborts: 0,
                            avgCycles: 30660,
                            eventType: 'RULE_INIT',
                            failures: 0,
                            maxCycles: 30660,
                            minCycles: 23832,
                            priority: 500,
                            tmName: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth',
                            totalExecutions: 4
                        }
                    }
                },
                '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth': {
                    events: {
                        RULE_INIT: {
                            aborts: 0,
                            avgCycles: 26028,
                            eventType: 'RULE_INIT',
                            failures: 0,
                            maxCycles: 26028,
                            minCycles: 23876,
                            priority: 500,
                            tmName: '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth',
                            totalExecutions: 4
                        },
                        HTTP_REQUEST: {
                            aborts: 0,
                            avgCycles: 26028,
                            eventType: 'HTTP_REQUEST',
                            failures: 0,
                            maxCycles: 9999,
                            minCycles: 23876,
                            priority: 500,
                            tmName: '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth',
                            totalExecutions: 4
                        }
                    }
                }
            };
            const result = normalizeUtil.restructureRules(args);
            assert.deepStrictEqual(result, expected);
        });
    });

    describe('.restructureSNMPEndpoint', () => {
        it('should restructure single snmp mib (one stat)', () => {
            const args = {
                data: {
                    commandResult: 'sysStatMemoryTotal.0 = 3179282432\n'
                }
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {
                'sysStatMemoryTotal.0': 3179282432
            });
        });

        it('should restructure single snmp mib (one stat, non-numeric)', () => {
            const args = {
                data: {
                    commandResult: 'ifAdmin.isUp = false\n'
                }
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {
                'ifAdmin.isUp': 'false'
            });
        });

        it('should ignore invalid response (one stat)', () => {
            const args = {
                data: {
                    commandResult: 'ifAdmin.isUp false\n'
                }
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {});
        });

        it('should ignore invalid response (multiple stats)', () => {
            const args = {
                data: {
                    commandResult: 'sysTmmPagesStatSlot.0.0 = 0\nsysTmmPagesStatSlot.0.1 = 0\nifAdmin.isUp false\nsysTmmPagesStatTmm.0.0 = 0\nsysTmmPagesStatTmm.0.1 = 1\ninvalidVal = 10.0.0'
                }
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {
                invalidVal: '10.0.0',
                'sysTmmPagesStatSlot.0.0': 0,
                'sysTmmPagesStatSlot.0.1': 0,
                'sysTmmPagesStatTmm.0.0': 0,
                'sysTmmPagesStatTmm.0.1': 1
            });
        });

        it('should restructure single snmp mib (multiple stats)', () => {
            const args = {
                data: {
                    commandResult: 'sysTmmPagesStatSlot.0.0 = 0\nsysTmmPagesStatSlot.0.1 = 0\nifAdmin.isUp = false\nsysTmmPagesStatTmm.0.0 = 0\nsysTmmPagesStatTmm.0.1 = 1\nsysTmmPagesStatPagesUsed.0.0 = 45869\nsysTmmPagesStatPagesUsed.0.1 = 50462\nsysTmmPagesStatPagesAvail.0.0 = 387584\nsysTmmPagesStatPagesAvail.0.1 = 388608\n'
                }
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {
                'ifAdmin.isUp': 'false',
                'sysTmmPagesStatSlot.0.0': 0,
                'sysTmmPagesStatSlot.0.1': 0,
                'sysTmmPagesStatTmm.0.0': 0,
                'sysTmmPagesStatTmm.0.1': 1,
                'sysTmmPagesStatPagesUsed.0.0': 45869,
                'sysTmmPagesStatPagesUsed.0.1': 50462,
                'sysTmmPagesStatPagesAvail.0.0': 387584,
                'sysTmmPagesStatPagesAvail.0.1': 388608
            });
        });

        it('should not fail on empty data', () => {
            const args = {
                data: {
                    commandResult: ''
                }
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {});
        });

        it('should not fail on missing \'commandResult\' property', () => {
            const args = {
                data: {}
            };
            const actual = normalizeUtil.restructureSNMPEndpoint(args);
            assert.deepStrictEqual(actual, {});
        });
    });

    describe('.restructureGslbWideIp()', () => {
        it('should restructure gslb wideip', () => {
            const pools = [
                [
                    {
                        name: 'poolInCommon',
                        nameReference: {
                            link: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~poolInCommon'
                        },
                        order: 0,
                        partition: 'Common',
                        ratio: 1
                    }
                ],
                [
                    {
                        name: 'poolInPartition',
                        nameReference: {
                            link: 'https://localhost/mgmt/tm/gtm/pool/a/~Partition~poolInPartition'
                        },
                        order: 0,
                        partition: 'Partition',
                        ratio: 10
                    },
                    {
                        name: 'poolInPartitionSubpath',
                        nameReference: {
                            link: 'https://localhost/mgmt/tm/gtm/pool/a/~Partition~Subpath~poolInPartitionSubpath'
                        },
                        order: 1,
                        partition: 'Partition',
                        subPath: 'Subpath',
                        ratio: 20
                    }
                ],
                [
                    {
                        name: 'anotherPoolInCommon',
                        nameReference: {
                            link: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~anotherPoolInCommon'
                        },
                        order: 0,
                        partition: 'Common',
                        ratio: 100
                    }
                ]
            ];
            const poolsCname = [
                undefined,
                undefined,
                [
                    {
                        name: 'poolCname',
                        nameReference: {
                            link: 'https://localhost/mgmt/tm/gtm/pool/cname/~Common~poolCname'
                        },
                        order: 0,
                        partition: 'Common',
                        ratio: 1
                    }
                ]
            ];
            const args = {
                data: {
                    'www.wide.com': {
                        persisted: 0,
                        preferred: 2,
                        rcode: 0,
                        requests: 8
                    }
                }
            };
            const expected = [
                {
                    'www.wide.com': {
                        persisted: 0,
                        preferred: 2,
                        rcode: 0,
                        requests: 8,
                        pools: ['/Common/poolInCommon']
                    }
                },
                {
                    'www.wide.com': {
                        persisted: 0,
                        preferred: 2,
                        rcode: 0,
                        requests: 8,
                        pools: [
                            '/Partition/poolInPartition',
                            '/Partition/Subpath/poolInPartitionSubpath'
                        ]
                    }
                },
                {
                    'www.wide.com': {
                        persisted: 0,
                        preferred: 2,
                        rcode: 0,
                        requests: 8,
                        pools: [
                            '/Common/anotherPoolInCommon',
                            '/Common/poolCname'
                        ]
                    }
                }
            ];
            pools.forEach((p, index) => {
                args.data['www.wide.com'].pools = p;
                args.data['www.wide.com'].poolsCname = poolsCname[index];
                const actual = normalizeUtil.restructureGslbWideIp(args);
                assert.deepStrictEqual(actual, expected[index]);
            });
        });

        it('should restructure gslb pool with members', () => {
            const args = {
                data: {
                    alternateMode: 'round-robin',
                    limitMaxBps: 100,
                    membersReference: {
                        entries: {
                            'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/vs1:~Common~server1/stats': {
                                nestedStats: {
                                    selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/vs1:~Common~server1/stats?ver=13.1.1.4',
                                    entries: {
                                        alternate: { value: 20 },
                                        'status.availabilityState': { description: 'offline' }
                                    }
                                }
                            }
                        },
                        items: [
                            {
                                fullPath: '/Common/server:vs1',
                                name: 'server1:vs1',
                                selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/~Common~server1:vs1?ver=13.1.1.4',
                                memberOrder: 100,
                                monitor: 'default'
                            }
                        ]
                    }
                }
            };
            const expected = {
                'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/vs1:~Common~server1/stats': {
                    nestedStats: {
                        selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/vs1:~Common~server1/stats?ver=13.1.1.4',
                        entries: {
                            alternate: { value: 20 },
                            'status.availabilityState': { description: 'offline' },
                            fullPath: '/Common/server:vs1',
                            name: 'server1:vs1',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/~Common~server1:vs1?ver=13.1.1.4',
                            memberOrder: 100,
                            monitor: 'default'
                        }
                    }
                }
            };
            const actual = normalizeUtil.restructureGslbPool(args);
            // merge config with stats
            assert.deepStrictEqual(actual.membersReference.entries, expected);
        });

        it('should restructure gslb pool without members', () => {
            const args = {
                data: {
                    alternateMode: 'packet-rate',
                    dynamicRatio: 'disabled',
                    enabled: true,
                    fallbackMode: 'quality-of-service',
                    loadBalancingMode: 'virtual-server-capacity',
                    membersReference: {
                        items: []
                    }
                }
            };
            const expected = {
                alternateMode: 'packet-rate',
                dynamicRatio: 'disabled',
                enabled: true,
                fallbackMode: 'quality-of-service',
                loadBalancingMode: 'virtual-server-capacity',
                membersReference: {}
            };
            const actual = normalizeUtil.restructureGslbPool(args);
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe('.addFqdnToLtmPool()', () => {
        it('should add \'fqdn\' when pool member is fqdn node, and not add \'fqdn\' when not fqdn node', () => {
            const args = {
                data: {
                    kind: 'tm:ltm:pool:poolstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                    name: 'test_pool_0',
                    membersReference: {
                        kind: 'tm:ltm:pool:members:memberscollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4.2',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.0.2.2:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.0.2.2:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            }
                        },
                        items: [
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80?ver=14.1.4.2',
                                fqdn: {
                                    autopopulate: 'disabled'
                                }
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80?ver=14.1.4.2',
                                fqdn: {
                                    autopopulate: 'disabled'
                                }
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.0.2.2:80?ver=14.1.4.2',
                                fqdn: {
                                    autopopulate: 'enabled',
                                    tmName: 'www.thebestwebsite.com'
                                }
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80?ver=14.1.4.2',
                                fqdn: {
                                    autopopulate: 'enabled',
                                    tmName: 'www.thebestwebsite.com'
                                }
                            }
                        ]
                    }
                }
            };
            const expected = {
                kind: 'tm:ltm:pool:poolstate',
                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                name: 'test_pool_0',
                membersReference: {
                    kind: 'tm:ltm:pool:members:memberscollectionstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4.2',
                    entries: {
                        'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats': {
                            nestedStats: {
                                kind: 'tm:ltm:pool:members:membersstats',
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats?ver=14.1.0',
                                entries: {}
                            }
                        },
                        'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats': {
                            nestedStats: {
                                kind: 'tm:ltm:pool:members:membersstats',
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats?ver=14.1.0',
                                entries: {}
                            }
                        },
                        'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.0.2.2:80/stats': {
                            nestedStats: {
                                kind: 'tm:ltm:pool:members:membersstats',
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.0.2.2:80/stats?ver=14.1.0',
                                entries: {
                                    fqdn: 'www.thebestwebsite.com'
                                }
                            }
                        },
                        'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80/stats': {
                            nestedStats: {
                                kind: 'tm:ltm:pool:members:membersstats',
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80/stats?ver=14.1.0',
                                entries: {
                                    fqdn: 'www.thebestwebsite.com'
                                }
                            }
                        }
                    },
                    items: [
                        {
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80?ver=14.1.4.2',
                            fqdn: {
                                autopopulate: 'disabled'
                            }
                        },
                        {
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80?ver=14.1.4.2',
                            fqdn: {
                                autopopulate: 'disabled'
                            }
                        },
                        {
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.0.2.2:80?ver=14.1.4.2',
                            fqdn: {
                                autopopulate: 'enabled',
                                tmName: 'www.thebestwebsite.com'
                            }
                        },
                        {
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80?ver=14.1.4.2',
                            fqdn: {
                                autopopulate: 'enabled',
                                tmName: 'www.thebestwebsite.com'
                            }
                        }
                    ]
                }
            };
            assert.deepStrictEqual(normalizeUtil.addFqdnToLtmPool(args), expected, 'should add fqdn property when pool member is fqdn node');
        });

        it('should not fail when no fqdn property', () => {
            const args = {
                data: {
                    kind: 'tm:ltm:pool:poolstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                    name: 'test_pool_0',
                    membersReference: {
                        kind: 'tm:ltm:pool:members:memberscollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4.2',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            }
                        },
                        items: [
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80?ver=14.1.4.2'
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80?ver=14.1.4.2'
                            }
                        ]
                    }
                }
            };
            assert.doesNotThrow(() => { normalizeUtil.addFqdnToLtmPool(args); }, 'should not throw if no fqdn property in iControlRest');
        });

        it('should not fail when no pool members', () => {
            const args = {
                data: {
                    kind: 'tm:ltm:pool:poolstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                    name: 'test_pool_0',
                    membersReference: {
                        kind: 'tm:ltm:pool:members:memberscollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4.2',
                        items: []
                    }
                }
            };
            const expected = {
                kind: 'tm:ltm:pool:poolstate',
                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                name: 'test_pool_0',
                membersReference: {
                    kind: 'tm:ltm:pool:members:memberscollectionstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4.2'
                }
            };
            assert.deepStrictEqual(normalizeUtil.addFqdnToLtmPool(args), expected, 'should add fqdn property when pool member is fqdn node');
        });

        it('should not fail when no pool member config data', () => {
            const args = {
                data: {
                    kind: 'tm:ltm:pool:poolstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                    name: 'test_pool_0',
                    membersReference: {
                        kind: 'tm:ltm:pool:members:memberscollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4.2',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats?ver=14.1.0',
                                    entries: {}
                                }
                            }
                        },
                        items: []
                    }
                }
            };
            // Shouldn't need to modify data at all
            const expected = util.deepCopy(args.data);
            assert.deepStrictEqual(normalizeUtil.addFqdnToLtmPool(args), expected, 'should still succeed if not able to get pool member config data');
        });
    });

    describe('.normalizeMACAddress()', () => {
        it('should normalize mac address (string)', () => {
            const inputOutputMap = {
                '00:11:22:33:44:55': '00:11:22:33:44:55',
                '0:a:B:c:D:e': '00:0A:0B:0C:0D:0E'
            };
            Object.keys(inputOutputMap).forEach((input) => {
                assert.strictEqual(
                    normalizeUtil.normalizeMACAddress({ data: input }),
                    inputOutputMap[input]
                );
            });
        });

        it('should normalize mac address (object)', () => {
            const data = {
                obj1: [
                    {
                        mac: '0:a:B:c:D:e'
                    }
                ],
                mac: '0:a:B:c:D:e'
            };
            const properties = ['mac'];
            const expected = {
                obj1: [
                    {
                        mac: '00:0A:0B:0C:0D:0E'
                    }
                ],
                mac: '00:0A:0B:0C:0D:0E'
            };
            assert.deepStrictEqual(
                normalizeUtil.normalizeMACAddress({ data, properties }),
                expected
            );
        });

        it('should return data as is when no colon in it', () => {
            assert.strictEqual(
                normalizeUtil.normalizeMACAddress({ data: 'missing data' }),
                'missing data'
            );
        });
    });

    describe('restructureVirtualServerProfiles', () => {
        it('should restructure virtual server profiles (without items property)', () => {
            const data = {
                vs1: {
                    profiles: {
                        name: 'profiles'
                    }
                }
            };
            const expected = {
                vs1: {
                    profiles: {}
                }
            };
            assert.deepStrictEqual(normalizeUtil.restructureVirtualServerProfiles({ data }), expected);
        });

        it('should restructure virtual server profiles (with items property but without profiles data)', () => {
            const data = {
                vs1: {
                    profiles: {
                        name: 'profiles',
                        items: {
                            name: 'items'
                        }
                    }
                }
            };
            const expected = {
                vs1: {
                    profiles: {}
                }
            };
            assert.deepStrictEqual(normalizeUtil.restructureVirtualServerProfiles({ data }), expected);
        });

        it('should restructure virtual server profiles', () => {
            const data = {
                vs1: {
                    profiles: {
                        name: 'profiles',
                        items: {
                            name: 'items',
                            profile1: {
                                name: 'profile1',
                                tenant: 'Common'
                            },
                            profile2: {
                                name: 'profile2',
                                tenant: 'Common'
                            }
                        }
                    }
                }
            };
            const expected = {
                vs1: {
                    profiles: {
                        profile1: {
                            name: 'profile1',
                            tenant: 'Common'
                        },
                        profile2: {
                            name: 'profile2',
                            tenant: 'Common'
                        }
                    }
                }
            };
            assert.deepStrictEqual(normalizeUtil.restructureVirtualServerProfiles({ data }), expected);
        });
    });

    describe('.virtualServerPostProcessing()', () => {
        it('should not isEnabled and isAvailable properties when source properties don\'t exist', () => {
            const data = {
                vs1: {
                    'clientside.bitsIn': 0,
                    'clientside.bitsOut': 0,
                    'clientside.curConns': 0
                }
            };
            const expected = {
                vs1: {
                    'clientside.bitsIn': 0,
                    'clientside.bitsOut': 0,
                    'clientside.curConns': 0
                }
            };
            assert.deepStrictEqual(normalizeUtil.virtualServerPostProcessing({ data }), expected);
        });

        it('should set isEnabled property correctly according to enabledState', () => {
            const data = {
                vs1: {
                    enabledState: 'enabled'
                },
                vs2: {
                    enabledState: 'disabled'
                }
            };
            const expected = {
                vs1: {
                    enabledState: 'enabled',
                    isEnabled: true
                },
                vs2: {
                    enabledState: 'disabled',
                    isEnabled: false
                }
            };
            assert.deepStrictEqual(normalizeUtil.virtualServerPostProcessing({ data }), expected);
        });

        it('should set isAvailable property correctly according to availabilityState', () => {
            const data = {
                vs1: {
                    availabilityState: 'unknown'
                },
                vs2: {
                    availabilityState: 'offline'
                },
                vs3: {
                    availabilityState: 'available'
                }
            };
            const expected = {
                vs1: {
                    availabilityState: 'unknown',
                    isAvailable: true
                },
                vs2: {
                    availabilityState: 'offline',
                    isAvailable: false
                },
                vs3: {
                    availabilityState: 'available',
                    isAvailable: true
                }
            };
            assert.deepStrictEqual(normalizeUtil.virtualServerPostProcessing({ data }), expected);
        });
    });

    describe('.convertEmptyToObject()', () => {
        it('should convert empty data to object', () => {
            let actual = normalizeUtil.convertEmptyToObject({ data: [] });
            assert.deepStrictEqual(actual, {}, 'should return empty object when array has no items');

            actual = normalizeUtil.convertEmptyToObject({ data: {} });
            assert.deepStrictEqual(actual, {}, 'should return empty object when data is empty object');

            actual = normalizeUtil.convertEmptyToObject({});
            assert.deepStrictEqual(actual, {}, 'should return empty object when data is not defined');
        });

        it('should return same data if not empty (not a copy)', () => {
            const data = {
                a: 1,
                b: {
                    c: 1
                }
            };

            const actual = normalizeUtil.convertEmptyToObject({ data });
            assert.deepStrictEqual(actual, data, 'should return the same data');

            // check that it is not a copy
            data.b.c = 10;
            assert.deepStrictEqual(actual, data, 'should return the same data and not a copy');
        });
    });

    describe('.diskStoragePercentsToFloating()', () => {
        it('should not fail when no Capacity property or unexpected value', () => {
            let actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/' } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity_Float: NaN } });

            actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: undefined } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: undefined, Capacity_Float: NaN } });

            actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: 'NotANumber' } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: 'NotANumber', Capacity_Float: NaN } });
        });

        it('should convert Capacity value to Capacity_Float', () => {
            let actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: '0%' } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: '0%', Capacity_Float: 0 } }, 'should convert value');

            actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: '100%' } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: '100%', Capacity_Float: 1 } }, 'should convert value');

            actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: '50.50%' } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: '50.50%', Capacity_Float: 0.5050 } }, 'should convert value');

            actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: '50.50%90' } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: '50.50%90', Capacity_Float: 0.5050 } }, 'should convert value');

            actual = normalizeUtil.diskStoragePercentsToFloating({ data: { '/': { name: '/', Capacity: 50 } } });
            assert.deepStrictEqual(actual, { '/': { name: '/', Capacity: 50, Capacity_Float: 0.5 } }, 'should convert value');
        });
    });

    describe('.convertToBoolean()', () => {
        it('should convert string values to booleans', () => {
            const truthyValues = ['true', 'TRUE', '1', 'on', 'ON', 'yes', 'YES'];
            truthyValues.forEach((val) => {
                assert.isTrue(normalizeUtil.convertStringToTruthyBoolean({ data: val }), `should convert string (${val})`);
            });

            const falseyValues = ['false', 'FALSE', '0', 'off', 'OFF', 'no', 'NO', 'invalid', 'NotValid'];
            falseyValues.forEach((val) => {
                assert.isNotTrue(normalizeUtil.convertStringToTruthyBoolean({ data: val }), `should convert string (${val})`);
            });
        });
    });

    describe('.sysPerformancePreProcessing()', () => {
        it('should convert array to mapping and set appropriate keys according to description', () => {
            const actual = normalizeUtil.sysPerformancePreProcessing({
                data: {
                    In: [
                        { val: 20, 'Throughput(packets)': 'stats' },
                        { val: 30, 'Throughput(bits)': 'stats' },
                        { val: 40 },
                        { val: 50 },
                        { val: 60, 'Throughput(bits)': 'stats' }
                    ],
                    stats: { val: 40 },
                    statsArray0: { val: 70 },
                    'statsArray Bits0': { val: 80 }
                }
            });
            assert.deepStrictEqual(actual, {
                In: { val: 40 },
                In0: { val: 50 },
                'In Packets': { val: 20, 'Throughput(packets)': 'stats' },
                'In Bits': { val: 30, 'Throughput(bits)': 'stats' },
                'In Bits0': { val: 60, 'Throughput(bits)': 'stats' },
                stats: { val: 40 },
                statsArray0: { val: 70 },
                'statsArray Bits0': { val: 80 }
            });
        });
    });

    describe('.sysPerformancePostProcessing()', () => {
        it('should convert keys to camelCase and include only average, current and max properties', () => {
            const actual = normalizeUtil.sysPerformancePostProcessing({
                data: {
                    'statsArray Packets': {
                        average: '100',
                        current: '20',
                        max: '10000',
                        'Throughput(packets)': 'stats',
                        otherProps: true
                    },
                    'statsArray Bits': {
                        average: '101',
                        current: '21',
                        max: '10001',
                        'Throughput(bits)': 'stats',
                        otherProps: true
                    },
                    statsArray_Bits: {
                        average: '101',
                        current: '21',
                        max: '10001',
                        'Throughput(bits)': 'stats',
                        otherProps: true
                    },
                    'stats stats stats': {
                        average: '102',
                        current: '22',
                        max: '10002',
                        otherProps: true
                    }
                }
            });
            assert.deepStrictEqual(actual, {
                statsArrayPackets: {
                    average: 100,
                    current: 20,
                    max: 10000
                },
                statsArrayBits: {
                    average: 101,
                    current: 21,
                    max: 10001
                },
                statsArrayBits0: {
                    average: 101,
                    current: 21,
                    max: 10001
                },
                statsStatsStats: {
                    average: 102,
                    current: 22,
                    max: 10002
                }
            });
        });
    });

    describe('ASM Functions', () => {
        const inputData = {
            data: [
                {
                    createdDatetime: '2019-07-01T17:32:44Z',
                    name: 'Policy_one',
                    isModified: false
                },
                {
                    createdDatetime: '2020-01-04T17:32:44Z',
                    name: 'Policy_two',
                    versionDatetime: '2020-01-17T17:34:32Z',
                    isModified: false
                },
                {
                    createdDatetime: '2020-01-01T17:32:44Z',
                    name: 'Policy_three',
                    versionDatetime: '2020-01-24T03:47:29Z'
                },
                {
                    createdDatetime: '2020-01-01T17:32:44Z',
                    name: 'Policy_three',
                    versionDatetime: 'blah'
                },
                {
                    createdDatetime: '2017-01-04T17:32:44Z',
                    name: 'Policy_two',
                    versionDatetime: '2019-01-17T17:34:32Z',
                    isModified: false
                }
            ]
        };
        describe('.getAsmState', () => {
            it('should return \'Policies Consistent\' when no policies are modified', () => {
                assert.strictEqual(normalizeUtil.getAsmState(inputData), 'Policies Consistent');
            });

            it('should return \'Pending Policy Changes\' when a policy is modified', () => {
                const actual = util.deepCopy(inputData);
                actual.data.push({
                    createdDatetime: '2020-01-04T17:32:44Z',
                    name: 'Policy_four',
                    versionDatetime: '2020-01-17T17:34:32Z',
                    isModified: true
                });
                assert.strictEqual(normalizeUtil.getAsmState(actual), 'Pending Policy Changes');
            });

            it('should return \'Policies Consistent\' if no policies exist', () => {
                assert.strictEqual(normalizeUtil.getAsmState({ data: [] }), 'Policies Consistent');
            });
        });

        describe('.getLastAsmChange', () => {
            it('should get the latest ASM change date', () => {
                assert.strictEqual(normalizeUtil.getLastAsmChange(inputData), '2020-01-24T03:47:29.000Z');
            });

            it('should return empty string if no policies exist', () => {
                assert.strictEqual(normalizeUtil.getLastAsmChange({ data: [] }), '');
            });
        });

        describe('.getAsmAttackSignatures', () => {
            it('should return empty object if no signatures exist',
                () => assert.isEmpty(normalizeUtil.getAsmAttackSignatures({ data: {} })));

            const oneSignatureWithoutStatus = {
                data: {
                    d11: {
                        updateFileReference: {
                            createDateTime: '2021-07-13T09:45:23Z',
                            id: '123'
                        }
                    }
                }
            };
            it('one signature without status', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(oneSignatureWithoutStatus), {});
            });

            const oneSignatureWithBadStatus = util.deepCopy(oneSignatureWithoutStatus);
            oneSignatureWithBadStatus.data.d11.status = 'not install-complete';
            it('one signature with bad status', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(oneSignatureWithBadStatus), {});
            });

            const oneSignatureWithGoodStatus = util.deepCopy(oneSignatureWithoutStatus);
            oneSignatureWithGoodStatus.data.d11.status = 'install-complete';
            it('one signature with good status', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(oneSignatureWithGoodStatus),
                    { 123: { createDateTime: 1626169523000 } });
            });

            it('one signature without updateFileReference', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures({ data: { d11: { status: 'install-complete' } } }), {});
            });

            const oneSignatureWithoutId = {
                data: {
                    d11: {
                        status: 'install-complete',
                        updateFileReference: {
                            createDateTime: '2021-07-13T09:45:23Z'
                        }
                    }
                }
            };
            it('one signature without id', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(oneSignatureWithoutId),
                    {});
            });

            const oneSignatureWithoutCreateDateTime = {
                data: {
                    d11: {
                        status: 'install-complete',
                        updateFileReference: {
                            id: '123'
                        }
                    }
                }
            };
            it('one signature without createDateTime', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(oneSignatureWithoutCreateDateTime),
                    {});
            });

            const oneSignatureWithBadCreateDateTime = {
                data: {
                    d11: {
                        status: 'install-complete',
                        updateFileReference: {
                            createDateTime: 'not a date',
                            id: '123'
                        }
                    }
                }
            };
            it('one signature with bad createDateTime', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(oneSignatureWithBadCreateDateTime),
                    { 123: { createDateTime: 'not a date' } });
            });

            const twoGoodSignatures = {
                data: {
                    d11: {
                        status: 'install-complete',
                        updateFileReference: {
                            createDateTime: '2021-07-13T09:45:23Z',
                            id: '123',
                            filename: 'fileA',
                            someTag: 'valueA'
                        },
                        upperLevelTag: 'irrelevant'
                    },
                    d22: {
                        status: 'install-complete',
                        updateFileReference: {
                            createDateTime: '2021-12-13T09:45:23Z',
                            id: '124',
                            filename: 'fileB',
                            someTag: 'valueB'
                        },
                        upperLevelTag: 'irrelevant'
                    }
                }
            };
            it('two good signatures', () => {
                assert.deepStrictEqual(normalizeUtil.getAsmAttackSignatures(twoGoodSignatures),
                    {
                        123: {
                            createDateTime: 1626169523000,
                            filename: 'fileA',
                            someTag: 'valueA'
                        },
                        124: {
                            createDateTime: 1639388723000,
                            filename: 'fileB',
                            someTag: 'valueB'
                        }
                    });
            });
        });
    });
});
