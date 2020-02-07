/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const normalizeUtil = require('../../src/lib/normalizeUtil.js');


describe('Normalize Util', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should convert array to map', () => {
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
        assert.deepEqual(actualMap, expectedMap);
    });

    it('should fail to convert array to map', () => {
        assert.throws(
            () => {
                normalizeUtil._convertArrayToMap({}, 'name');
            },
            (err) => {
                if ((err instanceof Error) && /array required/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
    });

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
        assert.deepEqual(actualObj, expectedObj);
        // exclude
        actualObj = normalizeUtil._filterDataByKeys(obj, { exclude: ['removeMe'] });
        assert.deepEqual(actualObj, expectedObj);
    });

    it('should not filter array', () => {
        const obj = [1, 2, 3];
        const actualObj = normalizeUtil._filterDataByKeys(obj, { include: ['name'] });
        assert.deepEqual(actualObj, obj);
    });


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
        assert.strictEqual(result, expectedResult);
    });

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
        assert.deepEqual(result, expectedResult);

        // check empty object is returned
        result = normalizeUtil.getSum({ data: '' });
        assert.deepEqual(result, {});

        // check that child non object does not cause issues
        data.mangled = 'foo';
        result = normalizeUtil.getSum({ data });
        assert.deepEqual(result, expectedResult);
    });

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

    it('should get percent from keys', () => {
        const data = {
            total: 10000,
            partial: 2000
        };
        const expectedResult = 20; // percent

        const result = normalizeUtil.getPercentFromKeys({ data, totalKey: 'total', partialKey: 'partial' });
        assert.strictEqual(result, expectedResult);
    });

    it('should format as json', () => {
        const data = 'named_key,key1\nname,value';
        const expectedResult = {
            name: {
                named_key: 'name',
                key1: 'value'
            }
        };

        const result = normalizeUtil.formatAsJson({ data, type: 'csv', mapKey: 'named_key' });
        assert.deepEqual(result, expectedResult);
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
        assert.deepEqual(result, expectedResult);
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
        assert.deepEqual(result, expectedResult);
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

    it('should restructure rules', () => {
        const args = {
            data: {
                '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                    aborts: 0,
                    avgCycles: 30660,
                    eventType: 'RULE_INIT',
                    failures: 0,
                    maxCycles: 30660,
                    minCycles: 23832,
                    priority: 500,
                    totalExecutions: 4
                },
                '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth': {
                    aborts: 0,
                    avgCycles: 26028,
                    eventType: 'RULE_INIT',
                    failures: 0,
                    maxCycles: 26028,
                    minCycles: 23876,
                    priority: 500,
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
                        failures: 0,
                        maxCycles: 30660,
                        minCycles: 23832,
                        priority: 500,
                        totalExecutions: 4
                    }
                }
            },
            '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth': {
                events: {
                    RULE_INIT: {
                        aborts: 0,
                        avgCycles: 26028,
                        failures: 0,
                        maxCycles: 26028,
                        minCycles: 23876,
                        priority: 500,
                        totalExecutions: 4
                    }
                }
            }
        };
        const result = normalizeUtil.restructureRules(args);
        assert.deepStrictEqual(result, expected);
    });

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
            assert.deepEqual(actual, expected[index]);
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
        assert.deepEqual(actual.membersReference.entries, expected);
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
        assert.deepEqual(actual, expected);
    });

    describe('normalizeMACAddress', () => {
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
});
