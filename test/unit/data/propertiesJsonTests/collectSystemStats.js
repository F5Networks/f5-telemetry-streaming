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
    name: 'System stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should create empty system folder',
            statsToCollect: ['system'],
            contextToCollect: [],
            expectedData: {
                system: {}
            }
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not have properties when conditional block results to false',
            statsToCollect: [
                'system',
                'configReady',
                'licenseReady',
                'provisionReady',
                'asmState',
                'lastAsmChange',
                'apmState',
                'afmState',
                'lastAfmDeploy',
                'ltmConfigTime',
                'gtmConfigTime'
            ],
            contextToCollect: ['deviceVersion', 'provisioning'],
            expectedData: {
                system: {}
            },
            endpoints: [
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info',
                        version: '12.0.0',
                        machineId: '00000000-0000-0000-0000-000000000000',
                        hostname: 'test.local'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0',
                        items: [
                            {
                                name: 'afm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'apm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'asm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'gtm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'ltm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            }
                        ]
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect system stats',
            statsToCollect: (stats) => {
                const ret = {
                    system: stats.system
                };
                Object.keys(stats).forEach((statKey) => {
                    const stat = stats[statKey];
                    if (stat.structure && stat.structure.parentKey === 'system') {
                        ret[statKey] = stat;
                    }
                });
                return ret;
            },
            contextToCollect: (context) => context,
            expectedData: {
                system: {
                    hostname: 'test.local',
                    machineId: '00000000-0000-0000-0000-000000000000',
                    version: '14.1.2',
                    versionBuild: '0.0.5',
                    location: 'Location',
                    description: 'Description',
                    marketingName: 'Marketing Name',
                    platformId: 'Platform ID',
                    chassisId: '00000000-0000-0000-0000-000000000001',
                    baseMac: '00:01:0A:0B:0C:0D',
                    callBackUrl: 'https://10.0.0.107',
                    configReady: 'yes',
                    configSyncSucceeded: true,
                    licenseReady: 'yes',
                    provisionReady: 'yes',
                    syncColor: 'green',
                    syncMode: 'standalone',
                    syncStatus: 'Standalone',
                    syncSummary: 'Description',
                    failoverStatus: 'ACTIVE',
                    failoverColor: 'green',
                    systemTimestamp: '2020-01-26T08:42:48.000Z',
                    afmState: 'quiescent',
                    apmState: 'Pending Policy Changes',
                    asmState: 'Policies Consistent',
                    gtmConfigTime: '2020-01-24T03:47:29.000Z',
                    lastAfmDeploy: '2020-01-23T08:00:56.000Z',
                    lastAsmChange: '2020-01-24T03:47:29.000Z',
                    ltmConfigTime: '2020-01-24T03:47:29.000Z',
                    cpu: 7,
                    memory: 16,
                    swap: 43,
                    tmmCpu: 0,
                    tmmMemory: 3,
                    tmmTraffic: {
                        'clientSideTraffic.bitsIn': 197416,
                        'clientSideTraffic.bitsOut': 470632,
                        'serverSideTraffic.bitsIn': 179496,
                        'serverSideTraffic.bitsOut': 469992
                    },
                    diskLatency: {
                        nvme0n1: {
                            name: 'nvme0n1',
                            '%util': '0.19',
                            'r/s': '2.77',
                            'w/s': '4.80'
                        }
                    },
                    diskStorage: {
                        '/': {
                            '1024-blocks': '428150',
                            Capacity: '35%',
                            Capacity_Float: 0.35,
                            name: '/'
                        }
                    },
                    networkInterfaces: {
                        '1.0': {
                            'counters.bitsIn': 2,
                            'counters.bitsOut': 0,
                            name: '1.0',
                            status: 'up'
                        },
                        1.1: {
                            'counters.bitsIn': 1,
                            'counters.bitsOut': 0,
                            name: '1.1',
                            status: 'up'
                        },
                        1.2: {
                            'counters.bitsIn': 3,
                            'counters.bitsOut': 4,
                            name: '1.2',
                            status: 'uninit'
                        },
                        '1.10': {
                            'counters.bitsIn': 5,
                            'counters.bitsOut': 6,
                            name: '1.10',
                            status: 'down'
                        },
                        11.2349: {
                            'counters.bitsIn': 7,
                            'counters.bitsOut': 8,
                            name: '11.2349',
                            status: 'pend'
                        },
                        2.1: {
                            'counters.bitsIn': 44,
                            'counters.bitsOut': 55,
                            name: '2.1',
                            status: 'up'
                        }
                    },
                    provisioning: {
                        afm: {
                            level: 'nominal',
                            name: 'afm'
                        },
                        apm: {
                            level: 'nominal',
                            name: 'apm'
                        },
                        asm: {
                            level: 'nominal',
                            name: 'asm'
                        },
                        gtm: {
                            level: 'nominal',
                            name: 'gtm'
                        },
                        ltm: {
                            level: 'nominal',
                            name: 'ltm'
                        }
                    },
                    throughputPerformance: {
                        clientBitsIn: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'clientBitsIn'
                        },
                        clientBitsOut: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'clientBitsOut'
                        },
                        clientIn: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'clientIn'
                        },
                        clientOut: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'clientOut'
                        },
                        compression: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'compression'
                        },
                        inBits: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'inBits'
                        },
                        inPackets: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'inPackets'
                        },
                        managementBitsIn: {
                            average: 2969820,
                            current: 846485,
                            max: 36591317,
                            name: 'managementBitsIn'
                        },
                        managementBitsOut: {
                            average: 133,
                            current: 0,
                            max: 12478,
                            name: 'managementBitsOut'
                        },
                        outBits: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'outBits'
                        },
                        outPackets: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'outPackets'
                        },
                        serverBitsIn: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverBitsIn'
                        },
                        serverBitsOut: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverBitsOut'
                        },
                        serverIn: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverIn'
                        },
                        serverOut: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverOut'
                        },
                        serviceBits: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serviceBits'
                        },
                        servicePackets: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'servicePackets'
                        },
                        sslTps: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'sslTps'
                        }
                    },
                    connectionsPerformance: {
                        blade1: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'blade1'
                        },
                        blade2: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'blade2'
                        },
                        client: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'client'
                        },
                        clientAccepts: {
                            average: 0,
                            current: 0,
                            max: 1,
                            name: 'clientAccepts'
                        },
                        clientConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'clientConnections'
                        },
                        clientConnects: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'clientConnects'
                        },
                        connections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'connections'
                        },
                        httpRequests: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'httpRequests'
                        },
                        pvaClient: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'pvaClient'
                        },
                        pvaServer: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'pvaServer'
                        },
                        server: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'server'
                        },
                        serverConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverConnections'
                        },
                        activeSslClientConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'activeSslClientConnections'
                        },
                        newSslClientConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'newSslClientConnections'
                        },
                        activeSslServerConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'activeSslServerConnections'
                        },
                        newSslServerConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'newSslServerConnections'
                        },
                        serverNewConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverNewConnections'
                        },
                        serverNewTcpConnections: {
                            average: 0,
                            current: 0,
                            max: 0,
                            name: 'serverNewTcpConnections'
                        }
                    },
                    asmAttackSignatures: {
                        ff8080817a3a4908017a3a490958000e: {
                            filename: 'ASM-AttackSignatures_20190716_122131.im',
                            name: 'ff8080817a3a4908017a3a490958000e',
                            createDateTime: 1563279691000
                        }
                    }
                }
            },
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0',
                        items: [
                            {
                                name: 'afm',
                                level: 'nominal',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'apm',
                                level: 'nominal',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'asm',
                                level: 'nominal',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'gtm',
                                level: 'nominal',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'ltm',
                                level: 'nominal',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info',
                        machineId: '00000000-0000-0000-0000-000000000000',
                        hostname: 'test.local',
                        version: '14.1.2',
                        build: '0.0.5',
                        chassisSerialNumber: '00000000-0000-0000-0000-000000000001',
                        platformMarketingName: 'Marketing Name',
                        platform: 'Platform ID',
                        baseMac: '00:1:a:0B:c:D',
                        cpu: 'cpu info'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        name: 'systemauth.disablebash',
                        fullPath: 'systemauth.disablebash',
                        generation: 1,
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2',
                        defaultValue: 'false',
                        scfConfig: 'true',
                        value: 'false',
                        valueRange: 'false true'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/device',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:device:devicecollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/cm/device?ver=14.1.0',
                        items: [
                            {
                                name: 'test.local',
                                baseMac: '00:1:a:0B:c:D',
                                description: 'Description',
                                location: 'Location',
                                chassisType: 'individual',
                                configsyncIp: '10.0.2.7',
                                edition: 'Final',
                                failoverState: 'active',
                                haCapacity: 0
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/management-ip',
                    response: {
                        kind: 'tm:sys:management-ip:management-ipcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/management-ip?ver=14.1.0',
                        items: [
                            {
                                name: '10.0.0.107/24'
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/ready',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:ready:readystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/ready?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/ready/0': {
                                nestedStats: {
                                    entries: {
                                        configReady: {
                                            description: 'yes'
                                        },
                                        licenseReady: {
                                            description: 'yes'
                                        },
                                        provisionReady: {
                                            description: 'yes'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/net/interface/stats',
                    response: {
                        kind: 'tm:net:interface:interfacecollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/net/interface/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/net/interface/1.0/stats': {
                                nestedStats: {
                                    entries: {
                                        'counters.bitsIn': {
                                            value: 2
                                        },
                                        'counters.bitsOut': {
                                            value: 0
                                        },
                                        // just to be sure that filterKeys works
                                        'counters.dropsAll': {
                                            value: 5504272
                                        },
                                        status: {
                                            description: 'up'
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/net/interface/1.1/stats': {
                                nestedStats: {
                                    entries: {
                                        'counters.bitsIn': {
                                            value: 1
                                        },
                                        'counters.bitsOut': {
                                            value: 0
                                        },
                                        // just to be sure that filterKeys works
                                        'counters.dropsAll': {
                                            value: 5504272
                                        },
                                        status: {
                                            description: 'up'
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/net/interface/1.2/stats': {
                                nestedStats: {
                                    entries: {
                                        'counters.bitsIn': {
                                            value: 3
                                        },
                                        'counters.bitsOut': {
                                            value: 4
                                        },
                                        // just to be sure that filterKeys works
                                        'counters.dropsAll': {
                                            value: 5504272
                                        },
                                        status: {
                                            description: 'uninit'
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/net/interface/1.10/stats': {
                                nestedStats: {
                                    entries: {
                                        'counters.bitsIn': {
                                            value: 5
                                        },
                                        'counters.bitsOut': {
                                            value: 6
                                        },
                                        // just to be sure that filterKeys works
                                        'counters.dropsAll': {
                                            value: 5504272
                                        },
                                        status: {
                                            description: 'down'
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/net/interface/11.2349/stats': {
                                nestedStats: {
                                    entries: {
                                        'counters.bitsIn': {
                                            value: 7
                                        },
                                        'counters.bitsOut': {
                                            value: 8
                                        },
                                        // just to be sure that filterKeys works
                                        'counters.dropsAll': {
                                            value: 5504272
                                        },
                                        status: {
                                            description: 'pend'
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/net/interface/2.1/stats': {
                                nestedStats: {
                                    entries: {
                                        'counters.bitsIn': {
                                            value: 44
                                        },
                                        'counters.bitsOut': {
                                            value: 55
                                        },
                                        // just to be sure that filterKeys works
                                        'counters.dropsAll': {
                                            value: 5504272
                                        },
                                        status: {
                                            description: 'up'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/sync-status',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:sync-status:sync-statusstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/sync-status?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/cm/sync-status/0': {
                                nestedStats: {
                                    entries: {
                                        color: {
                                            description: 'green'
                                        },
                                        mode: {
                                            description: 'standalone'
                                        },
                                        status: {
                                            description: 'Standalone'
                                        },
                                        summary: {
                                            description: 'Description'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/failover-status',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:failover-status:failover-statusstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/failover-status?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/cm/failover-status/0': {
                                nestedStats: {
                                    entries: {
                                        color: {
                                            description: 'green'
                                        },
                                        status: {
                                            description: 'ACTIVE'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/clock',
                    response: {
                        kind: 'tm:sys:clock:clockstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/clock?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/clock/0': {
                                nestedStats: {
                                    entries: {
                                        fullDate: {
                                            description: '2020-01-26T08:42:48Z'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/host-info',
                    response: {
                        kind: 'tm:sys:host-info:host-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/host-info?ver=14.1.0',
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
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/memory',
                    options: {
                        times: 3
                    },
                    response: {
                        kind: 'tm:sys:memory:memorystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/memory?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/memory/memory-host': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/memory/memory-host/0': {
                                            nestedStats: {
                                                entries: {
                                                    memoryTotal: {
                                                        value: 8062742528
                                                    },
                                                    memoryUsed: {
                                                        value: 1314352272
                                                    },
                                                    swapTotal: {
                                                        value: 1048571904
                                                    },
                                                    swapUsed: {
                                                        value: 455475200
                                                    },
                                                    tmmMemoryTotal: {
                                                        value: 6320816128
                                                    },
                                                    tmmMemoryUsed: {
                                                        value: 169258128
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/tmm-info',
                    response: {
                        kind: 'tm:sys:tmm-info:tmm-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/tmm-info?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/tmm-info/0.0': {
                                nestedStats: {
                                    entries: {
                                        oneMinAvgUsageRatio: {
                                            value: 0
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/sys/tmm-info/0.1': {
                                nestedStats: {
                                    entries: {
                                        oneMinAvgUsageRatio: {
                                            value: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/tmm-traffic',
                    response: {
                        kind: 'tm:sys:tmm-traffic:tmm-trafficstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/tmm-traffic?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/tmm-traffic/0.0': {
                                nestedStats: {
                                    entries: {
                                        'clientSideTraffic.bitsIn': {
                                            value: 17768
                                        },
                                        'clientSideTraffic.bitsOut': {
                                            value: 9960
                                        },
                                        // just to be sure that filterKeys works
                                        'clientSideTraffic.curConns': {
                                            value: 0
                                        },
                                        'serverSideTraffic.bitsIn': {
                                            value: 3632
                                        },
                                        'serverSideTraffic.bitsOut': {
                                            value: 9640
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/sys/tmm-traffic/0.1': {
                                nestedStats: {
                                    entries: {
                                        'clientSideTraffic.bitsIn': {
                                            value: 179648
                                        },
                                        'clientSideTraffic.bitsOut': {
                                            value: 460672
                                        },
                                        // just to be sure that filterKeys works
                                        'clientSideTraffic.curConns': {
                                            value: 0
                                        },
                                        'serverSideTraffic.bitsIn': {
                                            value: 175864
                                        },
                                        'serverSideTraffic.bitsOut': {
                                            value: 460352
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/asm/policies',
                    options: {
                        times: 2
                    },
                    response: {
                        kind: 'tm:asm:policies:policycollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/asm/policies?ver=14.1.4',
                        totalItems: 3,
                        items: [
                            {
                                createdDatetime: '2019-07-01T17:32:44Z',
                                name: 'Policy_one',
                                versionDatetime: '2019-07-31T17:34:32Z',
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
                                versionDatetime: '2020-01-24T03:47:29Z',
                                isModified: false
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "/bin/df -P | /usr/bin/tr -s \' \' \',\'"'
                    },
                    response: {
                        kind: 'tm:util:bash:runstate',
                        commandResult: 'Filesystem,1024-blocks,Used,Available,Capacity,Mounted,on\n/dev/mapper/vg--db--vda-set.1.root,428150,140352,261174,35%,/\n'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "/usr/bin/iostat -x -d | /usr/bin/tail -n +3 | /usr/bin/tr -s \' \' \',\'"'
                    },
                    response: {
                        kind: 'tm:util:bash:runstate',
                        commandResult: 'Device:,rrqm/s,wrqm/s,r/s,w/s,rkB/s,wkB/s,avgrq-sz,avgqu-sz,await,r_await,w_await,svctm,%util\nnvme0n1,0.16,3.60,2.77,4.80,95.04,54.34,39.44,0.01,1.77,2.39,1.41,0.25,0.19\n\n'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    options: {
                        times: 2
                    },
                    method: 'post',
                    request: (body) => body.utilCmdArgs.indexOf('profile_access_misc_stat') !== -1,
                    response: {
                        kind: 'tm:util:bash:runstate',
                        commandResult: 'apm_state\nPending Policy Changes'
                    }
                },
                {
                    endpoint: '/mgmt/tm/security/firewall/current-state/stats',
                    options: {
                        times: 2
                    },
                    response: {
                        kind: 'tm:security:firewall:current-state:current-statestats',
                        selfLink: 'https://localhost/mgmt/tm/security/firewall/current-state/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/security/firewall/current-state/0/stats': {
                                nestedStats: {
                                    entries: {
                                        pccdStatus: {
                                            description: 'quiescent'
                                        },
                                        ruleDeployEndTimeFmt: {
                                            description: 'Jan 23 2020 00:00:56-0800'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/ltm.configtime',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/ltm.configtime?ver=14.1.0',
                        value: '1579837649'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/gtm.configtime',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/gtm.configtime?ver=14.1.0',
                        value: '1579837649'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/performance/throughput/stats?options=detail',
                    response: `{
                        "kind": "tm:sys:performance:throughput:throughputstats",
                        "selfLink": "https://localhost/mgmt/tm/sys/performance/throughput/stats?options=detail&ver=14.1.0",
                        "entries": {
                            "https://localhost/mgmt/tm/sys/performance/throughput/Client%20Bits%20In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ClientSide Throughput": {
                                            "description": "Client Bits In"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Client%20Bits%20Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ClientSide Throughput": {
                                            "description": "Client Bits Out"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Client%20In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ClientSide Throughput": {
                                            "description": "Client In"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Client%20Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ClientSide Throughput": {
                                            "description": "Client Out"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Compression/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "HTTP Compression Rate": {
                                            "description": "Compression"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "Throughput(bits)": {
                                            "description": "In"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "Throughput(packets)": {
                                            "description": "In"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Management%20Bits%20In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "2969820"
                                        },
                                        "Current": {
                                            "description": "846485"
                                        },
                                        "Management Interface": {
                                            "description": "Management Bits In"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "36591317"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Management%20Bits%20Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "133"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Management Interface": {
                                            "description": "Management Bits Out"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "12478"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "Throughput(bits)": {
                                            "description": "Out"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "Throughput(packets)": {
                                            "description": "Out"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/SSL%20TPS/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "SSL Transactions": {
                                            "description": "SSL TPS"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Server%20Bits%20In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ServerSide Throughput": {
                                            "description": "Server Bits In"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Server%20Bits%20Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ServerSide Throughput": {
                                            "description": "Server Bits Out"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Server%20In/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ServerSide Throughput": {
                                            "description": "Server In"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Server%20Out/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "TMM ServerSide Throughput": {
                                            "description": "Server Out"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Service/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "Throughput(bits)": {
                                            "description": "Service"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/throughput/Service/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2021_08_06T19:26:28Z)": {
                                            "description": "0"
                                        },
                                        "Throughput(packets)": {
                                            "description": "Service"
                                        }
                                    }
                                }
                            }
                        }
                    }`
                },
                {
                    endpoint: '/mgmt/tm/sys/performance/connections/stats?options=detail',
                    response: `{
                        "kind": "tm:sys:performance:connections:connectionsstats",
                        "selfLink": "https://localhost/mgmt/tm/sys/performance/connections/stats?options=detail&ver=15.1.6",
                        "entries": {
                            "https://localhost/mgmt/tm/sys/performance/connections/Blade%201/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active Connections per Blade": {
                                            "description": "Blade 1"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Blade%202/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active Connections per Blade": {
                                            "description": "Blade 2"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Client/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active Connections": {
                                            "description": "Client"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Client%20Accepts/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "1"
                                        },
                                        "New TCP Accepts/Connects": {
                                            "description": "Client Accepts"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Client%20Connections/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "Total New Connections": {
                                            "description": "Client Connections"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Client%20Connects/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New Connections": {
                                            "description": "Client Connects"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Connections/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active Connections": {
                                            "description": "Connections"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/HTTP%20Requests/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "HTTP Requests": {
                                            "description": "HTTP Requests"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/PVA%20Client/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New PVA Connections": {
                                            "description": "PVA Client"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/PVA%20Server/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New PVA Connections": {
                                            "description": "PVA Server"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/SSL%20Client/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active SSL Connections": {
                                            "description": "SSL Client"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/SSL%20Client/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New ClientSSL Profile Connections": {
                                            "description": "SSL Client"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/SSL%20Server/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active SSL Connections": {
                                            "description": "SSL Server"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/SSL%20Server/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New ClientSSL Profile Connections": {
                                            "description": "SSL Server"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Server/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Active Connections": {
                                            "description": "Server"
                                        },
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Server%20Connections/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "Total New Connections": {
                                            "description": "Server Connections"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Server%20Connects/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New Connections": {
                                            "description": "Server Connects"
                                        }
                                    }
                                }
                            },
                            "https://localhost/mgmt/tm/sys/performance/connections/Server%20Connects/stats": {
                                "nestedStats": {
                                    "entries": {
                                        "Average": {
                                            "description": "0"
                                        },
                                        "Current": {
                                            "description": "0"
                                        },
                                        "Max(since 2022_07_08T20:28:51Z)": {
                                            "description": "0"
                                        },
                                        "New TCP Accepts/Connects": {
                                            "description": "Server Connects"
                                        }
                                    }
                                }
                            }
                        }
                    }`
                },
                {
                    endpoint: '/mgmt/tm/live-update/asm-attack-signatures/installations',
                    response: {
                        kind: 'tm:live-update:asm-attack-signatures:installations-collectionstate',
                        totalItems: 1,
                        selfLink: 'https://localhost/mgmt/tm/live-update/asm-attack-signatures/installations',
                        items: [
                            {
                                id: 'ff8080817a3a4908017a3a490a9a0014',
                                lastUpdateMicros: 1624475503245000,
                                loadDateTime: '2021-06-21T06:48:29Z',
                                updateFileReference: {
                                    link: 'https://localhost/mgmt/tm/live-update/asm-attack-signatures/update-files/ff8080817a3a4908017a3a490958000e'
                                },
                                status: 'install-complete',
                                kind: 'tm:live-update:asm-attack-signatures:installationsstate',
                                selfLink: 'https://localhost/mgmt/tm/live-update/asm-attack-signatures/installations/ff8080817a3a4908017a3a490a9a0014'
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/live-update/asm-attack-signatures/update-files/ff8080817a3a4908017a3a490958000e',
                    response: {
                        id: 'ff8080817a3a4908017a3a490958000e',
                        filename: 'ASM-AttackSignatures_20190716_122131.im',
                        md5: 'B6E8F0C59B1C91D65F1BC357C4222714',
                        fileLocationReference: {
                            link: 'https://localhost/mgmt/tm/live-update/file-transfer/downloads/ASM-AttackSignatures_20190716_122131.im'
                        },
                        createDateTime: '2019-07-16T12:21:31Z',
                        isFileAvailable: true,
                        isFileManuallyUploaded: false,
                        isGenesis: true,
                        kind: 'tm:live-update:asm-attack-signatures:update-filesstate',
                        selfLink: 'https://localhost/mgmt/tm/live-update/asm-attack-signatures/update-files/ff8080817a3a4908017a3a490958000e'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         */
        {
            name: 'should collect cpuInfo on a multi CPU device',
            statsToCollect: ['system', 'cpu'],
            contextToCollect: (context) => context,
            expectedData: {
                system: {
                    cpu: 20
                }
            },
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/host-info',
                    response: {
                        kind: 'tm:sys:host-info:host-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/host-info?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/host-info/1': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/hostInfo/1/cpuInfo': {
                                            nestedStats: {
                                                entries: {
                                                    'https://localhost/mgmt/tm/sys/hostInfo/1/cpuInfo/0': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 2
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/1/cpuInfo/1': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 4
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/1/cpuInfo/2': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 6
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/1/cpuInfo/3': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 8
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/sys/host-info/2': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/hostInfo/2/cpuInfo': {
                                            nestedStats: {
                                                entries: {
                                                    'https://localhost/mgmt/tm/sys/hostInfo/2/cpuInfo/0': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 12
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/2/cpuInfo/1': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 14
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/2/cpuInfo/2': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 16
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/2/cpuInfo/3': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 18
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/sys/host-info/3': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/hostInfo/3/cpuInfo': {
                                            nestedStats: {
                                                entries: {
                                                    'https://localhost/mgmt/tm/sys/hostInfo/3/cpuInfo/0': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 22
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/3/cpuInfo/1': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 24
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/3/cpuInfo/2': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 26
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/3/cpuInfo/3': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 28
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/sys/host-info/4': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/hostInfo/4/cpuInfo': {
                                            nestedStats: {
                                                entries: {
                                                    'https://localhost/mgmt/tm/sys/hostInfo/4/cpuInfo/0': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 32
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/4/cpuInfo/1': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 34
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/4/cpuInfo/2': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 36
                                                                }
                                                            }
                                                        }
                                                    },
                                                    'https://localhost/mgmt/tm/sys/hostInfo/4/cpuInfo/3': {
                                                        nestedStats: {
                                                            entries: {
                                                                oneMinAvgSystem: {
                                                                    value: 38
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
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info',
                        baseMac: '00:01:2:a:B:d0',
                        hostname: 'bigip1',
                        version: '12.1.5',
                        machineId: '00000000-0000-0000-0000-000000000000'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        name: 'systemauth.disablebash',
                        fullPath: 'systemauth.disablebash',
                        generation: 1,
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2',
                        defaultValue: 'false',
                        scfConfig: 'true',
                        value: 'false',
                        valueRange: 'false true'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         */
        {
            name: 'should collect memory-host on a multi host device',
            statsToCollect: ['system', 'memory', 'tmmMemory', 'swap'],
            contextToCollect: (context) => context,
            expectedData: {
                system: {
                    memory: 70,
                    swap: 38,
                    tmmMemory: 7
                }
            },
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/memory',
                    options: {
                        times: 3
                    },
                    response: {
                        kind: 'tm:sys:memory:memorystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/memory?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/sys/memory/memory-host': {
                                nestedStats: {
                                    entries: {
                                        'https://localhost/mgmt/tm/sys/memory/memory-host/0': {
                                            nestedStats: {
                                                entries: {
                                                    memoryTotal: {
                                                        value: 8062742528
                                                    },
                                                    memoryUsed: {
                                                        value: 1314352272
                                                    },
                                                    swapTotal: {
                                                        value: 1048571904
                                                    },
                                                    swapUsed: {
                                                        value: 455475200
                                                    },
                                                    tmmMemoryTotal: {
                                                        value: 6320816128
                                                    },
                                                    tmmMemoryUsed: {
                                                        value: 169258128
                                                    }
                                                }
                                            }
                                        },
                                        'https://localhost/mgmt/tm/sys/memory/memory-host/1': {
                                            nestedStats: {
                                                entries: {
                                                    memoryTotal: {
                                                        value: 16759459840
                                                    },
                                                    memoryUsed: {
                                                        value: 16091751448
                                                    },
                                                    swapTotal: {
                                                        value: 1098571904
                                                    },
                                                    swapUsed: {
                                                        value: 355475200
                                                    },
                                                    tmmMemoryTotal: {
                                                        value: 423624704
                                                    },
                                                    tmmMemoryUsed: {
                                                        value: 283849752
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info',
                        baseMac: '00:01:2:a:B:d0',
                        hostname: 'bigip1',
                        version: '12.1.5',
                        machineId: '00000000-0000-0000-0000-000000000000'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not fail when no data (with items property)',
            statsToCollect: (stats) => {
                const ret = {
                    system: stats.system
                };
                Object.keys(stats).forEach((statKey) => {
                    const stat = stats[statKey];
                    if (stat.structure && stat.structure.parentKey === 'system') {
                        ret[statKey] = stat;
                    }
                });
                return ret;
            },
            contextToCollect: (context) => context,
            expectedData: {
                system: {
                    hostname: 'missing data',
                    machineId: 'missing data',
                    version: 'missing data',
                    versionBuild: 'missing data',
                    location: 'missing data',
                    description: 'missing data',
                    marketingName: 'missing data',
                    platformId: 'missing data',
                    chassisId: 'missing data',
                    baseMac: 'missing data',
                    callBackUrl: 'null',
                    configSyncSucceeded: false,
                    syncColor: 'missing data',
                    syncMode: 'missing data',
                    syncStatus: 'missing data',
                    syncSummary: 'missing data',
                    failoverStatus: 'missing data',
                    failoverColor: 'missing data',
                    systemTimestamp: 'missing data',
                    cpu: 'missing data',
                    memory: NaN, // should be fixed and set to missing data
                    swap: NaN, // should be fixed and set to missing data
                    tmmCpu: NaN, // should be fixed and set to missing data
                    tmmMemory: NaN, // should be fixed and set to missing data
                    tmmTraffic: {},
                    networkInterfaces: {},
                    provisioning: {},
                    throughputPerformance: {},
                    connectionsPerformance: {},
                    diskLatency: {},
                    diskStorage: {}
                }
            },
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    options: {
                        times: 999
                    },
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
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/device',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:device:devicecollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/cm/device?ver=14.1.0',
                        items: []
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/management-ip',
                    response: {
                        kind: 'tm:sys:management-ip:management-ipcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/management-ip?ver=14.1.0',
                        items: []
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/ready',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:ready:readystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/ready?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/net/interface/stats',
                    response: {
                        kind: 'tm:net:interface:interfacecollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/net/interface/stats?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/sync-status',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:sync-status:sync-statusstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/sync-status?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/failover-status',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:failover-status:failover-statusstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/failover-status?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/clock',
                    response: {
                        kind: 'tm:sys:clock:clockstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/clock?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/host-info',
                    response: {
                        kind: 'tm:sys:host-info:host-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/host-info?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/memory',
                    options: {
                        times: 3
                    },
                    response: {
                        kind: 'tm:sys:memory:memorystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/memory?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/tmm-info',
                    response: {
                        kind: 'tm:sys:tmm-info:tmm-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/tmm-info?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/tmm-traffic',
                    response: {
                        kind: 'tm:sys:tmm-traffic:tmm-trafficstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/tmm-traffic?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "/bin/df -P | /usr/bin/tr -s \' \' \',\'"'
                    },
                    response: {
                        kind: 'tm:util:bash:runstate'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "/usr/bin/iostat -x -d | /usr/bin/tail -n +3 | /usr/bin/tr -s \' \' \',\'"'
                    },
                    response: {
                        kind: 'tm:util:bash:runstate'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    options: {
                        times: 2
                    },
                    method: 'post',
                    request: (body) => body.utilCmdArgs.indexOf('profile_access_misc_stat') !== -1,
                    response: {
                        kind: 'tm:util:bash:runstate'
                    }
                },
                {
                    endpoint: '/mgmt/tm/security/firewall/current-state/stats',
                    options: {
                        times: 2
                    },
                    response: {
                        kind: 'tm:security:firewall:current-state:current-statestats',
                        selfLink: 'https://localhost/mgmt/tm/security/firewall/current-state/stats?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/ltm.configtime',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/ltm.configtime?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/gtm.configtime',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/gtm.configtime?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/performance/throughput/stats?options=detail',
                    response: {
                        kind: 'tm:sys:performance:throughput:throughputstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/performance/throughput/stats?options=detail&ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/performance/connections/stats?options=detail',
                    response: {
                        kind: 'tm:sys:performance:connections:connectionsstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/performance/connections/stats?options=detail&ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not fail when no data (without items property)',
            statsToCollect: (stats) => {
                const ret = {
                    system: stats.system
                };
                Object.keys(stats).forEach((statKey) => {
                    const stat = stats[statKey];
                    if (stat.structure && stat.structure.parentKey === 'system') {
                        ret[statKey] = stat;
                    }
                });
                return ret;
            },
            contextToCollect: (context) => context,
            expectedData: {
                system: {
                    hostname: 'missing data',
                    machineId: 'missing data',
                    version: 'missing data',
                    versionBuild: 'missing data',
                    location: 'missing data',
                    description: 'missing data',
                    marketingName: 'missing data',
                    platformId: 'missing data',
                    chassisId: 'missing data',
                    baseMac: 'missing data',
                    callBackUrl: 'null',
                    configSyncSucceeded: false,
                    syncColor: 'missing data',
                    syncMode: 'missing data',
                    syncStatus: 'missing data',
                    syncSummary: 'missing data',
                    failoverStatus: 'missing data',
                    failoverColor: 'missing data',
                    systemTimestamp: 'missing data',
                    cpu: 'missing data',
                    memory: NaN, // should be fixed and set to missing data
                    swap: NaN, // should be fixed and set to missing data
                    tmmCpu: NaN, // should be fixed and set to missing data
                    tmmMemory: NaN, // should be fixed and set to missing data
                    tmmTraffic: {},
                    networkInterfaces: {},
                    provisioning: {},
                    throughputPerformance: {},
                    connectionsPerformance: {},
                    diskLatency: {},
                    diskStorage: {}
                }
            },
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0'
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
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/device',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:device:devicecollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/cm/device?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/management-ip',
                    response: {
                        kind: 'tm:sys:management-ip:management-ipcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/management-ip?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/ready',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:sys:ready:readystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/ready?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/net/interface/stats',
                    response: {
                        kind: 'tm:net:interface:interfacecollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/net/interface/stats?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/sync-status',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:sync-status:sync-statusstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/sync-status?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/failover-status',
                    options: {
                        times: 999
                    },
                    response: {
                        kind: 'tm:cm:failover-status:failover-statusstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/failover-status?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/clock',
                    response: {
                        kind: 'tm:sys:clock:clockstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/clock?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/host-info',
                    response: {
                        kind: 'tm:sys:host-info:host-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/host-info?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/memory',
                    options: {
                        times: 3
                    },
                    response: {
                        kind: 'tm:sys:memory:memorystats',
                        selfLink: 'https://localhost/mgmt/tm/sys/memory?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/tmm-info',
                    response: {
                        kind: 'tm:sys:tmm-info:tmm-infostats',
                        selfLink: 'https://localhost/mgmt/tm/sys/tmm-info?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/tmm-traffic',
                    response: {
                        kind: 'tm:sys:tmm-traffic:tmm-trafficstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/tmm-traffic?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "/bin/df -P | /usr/bin/tr -s \' \' \',\'"'
                    },
                    response: {
                        kind: 'tm:util:bash:runstate'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "/usr/bin/iostat -x -d | /usr/bin/tail -n +3 | /usr/bin/tr -s \' \' \',\'"'
                    },
                    response: {
                        kind: 'tm:util:bash:runstate'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/bash',
                    options: {
                        times: 2
                    },
                    method: 'post',
                    request: (body) => body.utilCmdArgs.indexOf('profile_access_misc_stat') !== -1,
                    response: {
                        kind: 'tm:util:bash:runstate'
                    }
                },
                {
                    endpoint: '/mgmt/tm/security/firewall/current-state/stats',
                    options: {
                        times: 2
                    },
                    response: {
                        kind: 'tm:security:firewall:current-state:current-statestats',
                        selfLink: 'https://localhost/mgmt/tm/security/firewall/current-state/stats?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/ltm.configtime',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/ltm.configtime?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/gtm.configtime',
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/gtm.configtime?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/performance/throughput/stats?options=detail',
                    response: {
                        kind: 'tm:sys:performance:throughput:throughputstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/performance/throughput/stats?options=detail&ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/performance/connections/stats?options=detail',
                    response: {
                        kind: 'tm:sys:performance:connections:connectionsstats',
                        selfLink: 'https://localhost/mgmt/tm/sys/performance/connections/stats?options=detail&ver=14.1.0'
                    }
                }
            ]
        }
    ]
};
