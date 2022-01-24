/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const defaultProperties = require('../../../../src/lib/properties.json');

const TMCTL_CMD_REGEXP = /'tmctl\s+-c\s+(.*)'/;

const ADD_DEFAULT_CONTEXT_ENDPOINTS = (testEndpoints) => testEndpoints.concat([
    {
        endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
        method: 'get',
        response: {
            kind: 'tm:sys:db:dbstate',
            name: 'systemauth.disablebash',
            fullPath: 'systemauth.disablebash',
            generation: 1,
            selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2.3',
            defaultValue: 'false',
            scfConfig: 'true',
            value: 'false',
            valueRange: 'false true'
        }
    },
    {
        endpoint: '/mgmt/tm/sys/provision',
        response: {
            kind: 'tm:sys:provision:provisioncollectionstate',
            selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0',
            items: []
        }
    },
    {
        endpoint: '/mgmt/shared/identified-devices/config/device-info',
        options: {
            times: 999
        },
        response: {
            kind: 'shared:resolver:device-groups:deviceinfostate',
            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
        }
    }
]);

/* eslint-disable no-useless-escape */

/**
 * NOTE: DO NOT REMOVE 'kind' AND 'selfLink' PROPERTIES FROM RESPONSE's TOP LEVEL
 */
/**
 * TODO: update/remove 'options: { times: XXXX }' when EndpointLoader's cache will be fixed
 */

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    name: 'TMStats stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set tmstats to empty folder',
            statsToCollect: ['tmstats'],
            contextToCollect: [],
            expectedData: {
                tmstats: {}
            }
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect tmstats',
            statsToCollect: (stats) => {
                const ret = {
                    tmstats: stats.tmstats
                };
                Object.keys(stats).forEach((statKey) => {
                    const stat = stats[statKey];
                    if (stat.structure && stat.structure.parentKey === 'tmstats') {
                        ret[statKey] = stat;
                    }
                });
                return ret;
            },
            contextToCollect: (context) => context,
            expectedData: {
                tmstats: {
                    asmCpuUtilStats: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    cpuInfoStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    diskInfoStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    dnsCacheResolverStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    dnsexpressZoneStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    dosStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    dosl7PluginStats: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    dosl7dStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    flowEvictionPolicyStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            context_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            context_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    gtmDcStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    gtmWideipStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    hostInfoStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    ifcStats: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    interfaceStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    ipIntelligenceStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    ipStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    iprepdStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    kvmVcpuStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    kvmVmStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    mcpRequestStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    mcpTransactionStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    memoryUsageStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    monitorInstanceStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    monitorStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    poolMemberStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            pool_name: '/Tenant/app/test',
                            addr: '1.2.3.4',
                            port: '8080',
                            name: '/Tenant/app/test_1.2.3.4_8080',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            pool_name: '/Tenant/test',
                            addr: '5.6.7.8',
                            port: '8080',
                            name: '/Tenant/test_5.6.7.8_8080',
                            tenant: 'Tenant'
                        }
                    ],
                    poolStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    procPidStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    profileBigprotoStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileClientsslStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileConnpoolStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileDnsStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileFtpStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileHttpStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileHttpcompressionStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileServersslStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileTcpStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileUdpStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    profileWebaccelerationStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            vs_name: '/Tenant/app/test',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            vs_name: '/Tenant/test',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    ruleStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    tmmStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    tmmdnsServerStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    tmmdnsZoneStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    vcmpGlobalStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    vcmpStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    virtualServerConnStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            someKey: '/Tenant/app/test'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            someKey: '/Tenant/test'
                        }
                    ],
                    virtualServerCpuStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ],
                    virtualServerStat: [
                        {
                            a: '1',
                            b: '2',
                            c: 'spam',
                            name: '/Tenant/app/test',
                            tenant: 'Tenant',
                            application: 'app'
                        },
                        {
                            a: '3',
                            b: '4',
                            c: 'eggs',
                            name: '/Tenant/test',
                            tenant: 'Tenant'
                        }
                    ]
                }
            },
            endpoints: ADD_DEFAULT_CONTEXT_ENDPOINTS([
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    options: {
                        times: 47
                    },
                    request: (body) => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
                    response: (uri, requestBody) => {
                        // requestBody is string
                        let tmctlTable = requestBody.match(TMCTL_CMD_REGEXP);
                        if (!tmctlTable) {
                            throw new Error(`Unable to find tmctl table in request: ${JSON.stringify(requestBody)}`);
                        }
                        tmctlTable = tmctlTable[1];
                        let tmctlStat;

                        Object.keys(defaultProperties.stats).some((statKey) => {
                            const stat = defaultProperties.stats[statKey];
                            if (stat.structure && stat.structure.parentKey === 'tmstats' && stat.then
                                && stat.then.keyArgs.replaceStrings['\\$tmctlArgs'].indexOf(tmctlTable) !== -1) {
                                tmctlStat = stat.then;
                                return true;
                            }
                            return false;
                        });
                        if (!tmctlStat) {
                            throw new Error(`Unable to find stat for ${tmctlTable}`);
                        }
                        const mapKey = tmctlStat.normalization[0].runFunctions[0].args.mapKey;
                        if (Array.isArray(mapKey)) {
                            return {
                                kind: 'tm:util:bash:runstate',
                                commandResult: [
                                    ['a', 'b', 'c', mapKey[0], mapKey[1], mapKey[2]],
                                    [1, 2, 'spam', '/Tenant/app/test', '1.2.3.4', 8080],
                                    [3, 4, 'eggs', '/Tenant/test', '5.6.7.8', 8080]
                                ].join('\n')
                            };
                        }
                        return {
                            kind: 'tm:util:bash:runstate',
                            commandResult: [
                                ['a', 'b', 'c', mapKey || 'someKey'],
                                [1, 2, 'spam', '/Tenant/app/test'],
                                [3, 4, 'eggs', '/Tenant/test']
                            ].join('\n')
                        };
                    }
                }
            ])
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not fail when command returns headers only',
            statsToCollect: (stats) => {
                const ret = {
                    tmstats: stats.tmstats
                };
                Object.keys(stats).forEach((statKey) => {
                    const stat = stats[statKey];
                    if (stat.structure && stat.structure.parentKey === 'tmstats') {
                        ret[statKey] = stat;
                    }
                });
                return ret;
            },
            contextToCollect: (context) => context,
            expectedData: {
                tmstats: { }
            },
            endpoints: ADD_DEFAULT_CONTEXT_ENDPOINTS([
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    options: {
                        times: 47
                    },
                    request: (body) => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
                    response: (uri, requestBody) => {
                        // requestBody is string
                        let tmctlTable = requestBody.match(TMCTL_CMD_REGEXP);
                        if (!tmctlTable) {
                            throw new Error(`Unable to find tmctl table in request: ${JSON.stringify(requestBody)}`);
                        }
                        tmctlTable = tmctlTable[1];
                        let tmctlStat;

                        Object.keys(defaultProperties.stats).some((statKey) => {
                            const stat = defaultProperties.stats[statKey];
                            if (stat.structure && stat.structure.parentKey === 'tmstats' && stat.then
                                && stat.then.keyArgs.replaceStrings['\\$tmctlArgs'].indexOf(tmctlTable) !== -1) {
                                tmctlStat = stat.then;
                                return true;
                            }
                            return false;
                        });
                        if (!tmctlStat) {
                            throw new Error(`Unable to find stat for ${tmctlTable}`);
                        }
                        const mapKey = tmctlStat.normalization[0].runFunctions[0].args.mapKey;
                        return {
                            kind: 'tm:util:bash:runstate',
                            commandResult: [
                                ['a', 'b', 'c', mapKey || 'someKey']
                            ].join('\n')
                        };
                    }
                }
            ])
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not fail when table doesn\'t exist',
            statsToCollect: (stats) => {
                const ret = {
                    tmstats: stats.tmstats
                };
                Object.keys(stats).forEach((statKey) => {
                    const stat = stats[statKey];
                    if (stat.structure && stat.structure.parentKey === 'tmstats') {
                        ret[statKey] = stat;
                    }
                });
                return ret;
            },
            contextToCollect: (context) => context,
            expectedData: {
                tmstats: { }
            },
            endpoints: ADD_DEFAULT_CONTEXT_ENDPOINTS([
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    options: {
                        times: 47
                    },
                    request: (body) => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
                    response: {
                        kind: 'tm:util:bash:runstate',
                        commandResult: 'tmctl: qwerty: No such table'
                    }
                }
            ])
        }
    ]
};
