
/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
/* eslint-disable object-curly-newline */
module.exports = {
    getDefaultDimensions: {
        tests: [
            {
                name: 'should return dimensions from system properties',
                input: {
                    data: {
                        system: {
                            hostname: 'telemetry.bigip.com',
                            machineId: 'cd5e51b8-74ef-44c8-985c-7965512c2e87',
                            version: '14.0.0.1',
                            versionBuild: '0.0.2',
                            location: 'Seattle',
                            description: 'Telemetry BIG-IP',
                            marketingName: 'BIG-IP Virtual Edition',
                            platformId: 'Z100',
                            chassisId: '9c3abad5-513a-1c43-5bc2be62e957',
                            baseMac: '00:0d:3a:30:34:51',
                            callBackUrl: 'https://10.0.1.100',
                            configReady: 'yes',
                            licenseReady: 'yes',
                            provisionReady: 'yes',
                            syncMode: 'standalone',
                            syncColor: 'green',
                            syncStatus: 'Standalone',
                            syncSummary: ' ',
                            failoverStatus: 'ACTIVE',
                            failoverColor: 'green',
                            systemTimestamp: '2019-01-01T01:01:01Z',
                            asmState: 'Policies Consistent',
                            lastAsmChange: '2019-06-19T20:15:28.000Z',
                            apmState: 'Policies Consistent',
                            afmState: 'quiescent',
                            cpu: 0,
                            memory: 0,
                            tmmCpu: 0,
                            tmmMemory: 0,
                            tmmTraffic: {
                                'clientSideTraffic.bitsIn': 0,
                                'clientSideTraffic.bitsOut': 0,
                                'serverSideTraffic.bitsIn': 0,
                                'serverSideTraffic.bitsOut': 0
                            }
                        }
                    }
                },
                expected: [
                    { Name: 'hostname', Value: 'telemetry.bigip.com' },
                    { Name: 'machineId', Value: 'cd5e51b8-74ef-44c8-985c-7965512c2e87' },
                    { Name: 'version', Value: '14.0.0.1' },
                    { Name: 'versionBuild', Value: '0.0.2' },
                    { Name: 'platformId', Value: 'Z100' },
                    { Name: 'chassisId', Value: '9c3abad5-513a-1c43-5bc2be62e957' },
                    { Name: 'baseMac', Value: '00:0d:3a:30:34:51' }
                ]
            },
            {
                name: 'should only include dimensions with values',
                input: {
                    data: {
                        system: {
                            hostname: 'telemetry.bigip.com',
                            machineId: 'cd5e51b8-74ef-44c8-985c-7965512c2e87',
                            version: '14.0.0.1',
                            versionBuild: '0.0.2',
                            location: 'Seattle',
                            description: 'Telemetry BIG-IP',
                            marketingName: 'BIG-IP Virtual Edition',
                            platformId: ''
                        }
                    }
                },
                expected: [
                    { Name: 'hostname', Value: 'telemetry.bigip.com' },
                    { Name: 'machineId', Value: 'cd5e51b8-74ef-44c8-985c-7965512c2e87' },
                    { Name: 'version', Value: '14.0.0.1' },
                    { Name: 'versionBuild', Value: '0.0.2' }
                ]
            }
        ]
    },
    getMetrics: {
        timestamp: '2020-08-04T22:23:33.692Z',
        tests: [
            {
                name: 'should convert primitive properties and an object prop',
                input: {
                    data: {
                        topObj: {
                            stringProp: 'string',
                            numProp: 1234,
                            numStringProp: '1.342',
                            objProp: {
                                objKey1: false,
                                objKey2: 145,
                                objChild: {
                                    objChildKey1: '131333',
                                    objChildKey2: 222222
                                }
                            }
                        }
                    },
                    defDimensions: [
                        { Name: 'defName', Value: 'Dieffenbachia' },
                        { Name: 'defType', Value: 'tropical' }
                    ]
                },
                expected: [
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'Dieffenbachia' },
                            { Name: 'defType', Value: 'tropical' }
                        ],
                        MetricName: 'F5_topObj_numProp',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 1234
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'Dieffenbachia' },
                            { Name: 'defType', Value: 'tropical' }
                        ],
                        MetricName: 'F5_topObj_numStringProp',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 1.342
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'Dieffenbachia' },
                            { Name: 'defType', Value: 'tropical' }
                        ],
                        MetricName: 'F5_topObj_objProp_objKey2',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 145
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'Dieffenbachia' },
                            { Name: 'defType', Value: 'tropical' }
                        ],
                        MetricName: 'F5_topObj_objProp_objChild_objChildKey1',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 131333
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'Dieffenbachia' },
                            { Name: 'defType', Value: 'tropical' }
                        ],
                        MetricName: 'F5_topObj_objProp_objChild_objChildKey2',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 222222
                    }
                ]
            },
            {
                name: 'should convert object with name property',
                input: {
                    data: {
                        topObj: {
                            objWithNameProp: {
                                name: 'i.am.the.object.with.name',
                                someValue: 10900,
                                skipValue: 'ignoreme'
                            },
                            objWithNamedChildren: {
                                child1: {
                                    name: 'child1',
                                    average: 98,
                                    total: '556677',
                                    bool: false
                                },
                                child2: {
                                    name: 'child2',
                                    average: 99,
                                    total: '667788',
                                    bool: true
                                }
                            }
                        }
                    },
                    defDimensions: [
                        { Name: 'defName', Value: 'fitzgerald' },
                        { Name: 'defType', Value: 'author' }
                    ]
                },
                expected: [
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'fitzgerald' },
                            { Name: 'defType', Value: 'author' },
                            { Name: 'name', Value: 'i.am.the.object.with.name' }
                        ],
                        MetricName: 'F5_topObj_someValue',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 10900
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'fitzgerald' },
                            { Name: 'defType', Value: 'author' },
                            { Name: 'name', Value: 'child1' }
                        ],
                        MetricName: 'F5_topObj_objWithNamedChildren_average',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 98
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'fitzgerald' },
                            { Name: 'defType', Value: 'author' },
                            { Name: 'name', Value: 'child1' }
                        ],
                        MetricName: 'F5_topObj_objWithNamedChildren_total',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 556677
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'fitzgerald' },
                            { Name: 'defType', Value: 'author' },
                            { Name: 'name', Value: 'child2' }
                        ],
                        MetricName: 'F5_topObj_objWithNamedChildren_average',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 99
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'fitzgerald' },
                            { Name: 'defType', Value: 'author' },
                            { Name: 'name', Value: 'child2' }
                        ],
                        MetricName: 'F5_topObj_objWithNamedChildren_total',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 667788
                    }
                ]
            },
            {
                name: 'should convert object with array',
                input: {
                    data: {
                        topObjWithArray: {
                            statsType1: [
                                {
                                    name: 'statsname1',
                                    statsValue: 410,
                                    ignoreMe: true
                                },
                                {
                                    name: 'statsname2',
                                    statsValue: '411',
                                    ignoreMe: true
                                }
                            ],
                            statsType2: [
                                {
                                    no_name: 'statsno_name1',
                                    statsValue: '88888888888',
                                    ignoreMe: false
                                },
                                {
                                    no_name: 'statsno_name2',
                                    statsValue: 99999999999,
                                    ignoreMe: false
                                }
                            ]
                        }
                    },
                    defDimensions: [
                        { Name: 'defName', Value: 'theSystemName' },
                        { Name: 'defType', Value: 'systemStats' }
                    ]
                },
                expected: [
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'theSystemName' },
                            { Name: 'defType', Value: 'systemStats' },
                            { Name: 'name', Value: 'statsname1' }
                        ],
                        MetricName: 'F5_topObjWithArray_statsType1_statsValue',

                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 410
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'theSystemName' },
                            { Name: 'defType', Value: 'systemStats' },
                            { Name: 'name', Value: 'statsname2' }
                        ],
                        MetricName: 'F5_topObjWithArray_statsType1_statsValue',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 411
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'theSystemName' },
                            { Name: 'defType', Value: 'systemStats' },
                            { Name: 'name', Value: '0' }
                        ],
                        MetricName: 'F5_topObjWithArray_statsType2_statsValue',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 88888888888
                    },
                    {
                        Dimensions: [
                            { Name: 'defName', Value: 'theSystemName' },
                            { Name: 'defType', Value: 'systemStats' },
                            { Name: 'name', Value: '1' }
                        ],
                        MetricName: 'F5_topObjWithArray_statsType2_statsValue',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 99999999999
                    }
                ]
            },
            {
                name: 'should convert pool and pool members (special case)',
                input: {
                    data: {
                        pools: {
                            '/Common/pool1': {
                                'serverside.curConns': 78811,
                                name: '/Common/pool1',
                                enabledState: 'enabled',
                                members: {
                                    '/Common/192.168.19.38:443': {
                                        'serverside.curConns': 75000,
                                        monitorStatus: 'up'
                                    },
                                    '/Common/192.168.19.39:443': {
                                        'serverside.curConns': 3811,
                                        monitorStatus: 'up'
                                    }
                                }
                            },
                            '/Common/app/poolA': {
                                'serverside.curConns': 92019,
                                name: '/Common/app/poolA',
                                enabledState: 'enabled',
                                members: {
                                    '/Common/app/10.1.2.4:80': {
                                        'serverside.curConns': 42019
                                    },
                                    '/Common/app/10.1.2.5:80': {
                                        'serverside.curConns': 50000
                                    }
                                }
                            }
                        }
                    },
                    defDimensions: [
                        { Name: 'hostname', Value: 'host.big.ip' },
                        { Name: 'version', Value: '14.0.0.0.1' }
                    ]
                },
                expected: [
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.big.ip' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/pool1' }
                        ],
                        MetricName: 'F5_pools_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 78811
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.big.ip' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/192.168.19.38:443' },
                            { Name: 'poolName', Value: '/Common/pool1' }
                        ],
                        MetricName: 'F5_pools_members_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 75000
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.big.ip' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/192.168.19.39:443' },
                            { Name: 'poolName', Value: '/Common/pool1' }
                        ],
                        MetricName: 'F5_pools_members_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 3811
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.big.ip' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/app/poolA' }
                        ],
                        MetricName: 'F5_pools_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 92019
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.big.ip' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/app/10.1.2.4:80' },
                            { Name: 'poolName', Value: '/Common/app/poolA' }
                        ],
                        MetricName: 'F5_pools_members_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 42019
                    },
                    {
                        Dimensions: [
                            { Name: 'hostname', Value: 'host.big.ip' },
                            { Name: 'version', Value: '14.0.0.0.1' },
                            { Name: 'name', Value: '/Common/app/10.1.2.5:80' },
                            { Name: 'poolName', Value: '/Common/app/poolA' }
                        ],
                        MetricName: 'F5_pools_members_serverside.curConns',
                        Timestamp: '2020-08-04T22:23:33.692Z',
                        Value: 50000
                    }
                ]
            }
        ]
    },
    sendMetrics: {
        timestamp: 1596579813692,
        tests: [
            {
                name: 'should batch metrics to max 20 each',
                input: {
                    data: {
                        topObj1: {
                            s1: 'string',
                            n1: 1,
                            n2: 2,
                            objProp: {
                                objKey1: false,
                                n3: 3,
                                child1: {
                                    n4: 4,
                                    n5: 5,
                                    n6: 6
                                },
                                child2: {
                                    n7: 7,
                                    n8: 8,
                                    n9: 9,
                                    n10: 10
                                }
                            },
                            n11: 11
                        },
                        topObj2: {
                            s1: 'string',
                            n1: 1,
                            n2: 2,
                            objProp: {
                                objKey1: false,
                                n3: 3,
                                child1: {
                                    n4: 4,
                                    n5: 5,
                                    n6: 6
                                },
                                child2: {
                                    n7: 7,
                                    n8: 8,
                                    n9: 9,
                                    n10: 10
                                }
                            },
                            n11: 11
                        }
                    },
                    defDimensions: [
                        { Name: 'name', Value: 'batched' }
                    ],
                    namespace: 'lemonade'
                },
                expected: [
                    {
                        MetricData:
                            [
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_n1', Value: 1 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_n2', Value: 2 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_n3', Value: 3 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child1_n4', Value: 4 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child1_n5', Value: 5 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child1_n6', Value: 6 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child2_n7', Value: 7 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child2_n8', Value: 8 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child2_n9', Value: 9 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_objProp_child2_n10', Value: 10 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj1_n11', Value: 11 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_n1', Value: 1 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_n2', Value: 2 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_n3', Value: 3 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child1_n4', Value: 4 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child1_n5', Value: 5 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child1_n6', Value: 6 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child2_n7', Value: 7 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child2_n8', Value: 8 },
                                { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child2_n9', Value: 9 }
                            ],
                        Namespace: 'lemonade'
                    },
                    {
                        MetricData:
                        [
                            { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_objProp_child2_n10', Value: 10 },
                            { Dimensions: [{ Name: 'name', Value: 'batched' }], Timestamp: '2020-08-04T22:23:33.692Z', MetricName: 'F5_topObj2_n11', Value: 11 }
                        ],
                        Namespace: 'lemonade'
                    }
                ]
            }
        ]
    }
};
