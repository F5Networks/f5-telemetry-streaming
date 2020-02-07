/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const defaultProperties = require('../../src/lib/properties.json');

const TMCTL_CMD_REGEXP = /'tmctl\s+-c\s+(.*)'/;

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
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectContextData: {
        name: 'context data',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect context data',
                statsToCollect: () => ({}),
                contextToCollect: context => context,
                getCollectedData: (promise, stats) => promise.then(() => stats.contextData),
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/sys/provision',
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
                                    name: 'ltm',
                                    level: 'none',
                                    // just to be sure that filterKeys works
                                    cpuRatio: 0
                                },
                                {
                                    name: 'asm',
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
                            baseMac: '00:01:2:a:B:d0',
                            hostname: 'bigip1',
                            version: '12.1.5.1',
                            machineId: '00000000-0000-0000-0000-000000000000'
                        }
                    }
                ],
                expectedData: {
                    HOSTNAME: 'bigip1',
                    BASE_MAC_ADDR: '00:01:02:0A:0B:D0',
                    deviceVersion: '12.1.5.1',
                    provisioning: {
                        afm: {
                            name: 'afm',
                            level: 'none'
                        },
                        ltm: {
                            name: 'ltm',
                            level: 'none'
                        },
                        asm: {
                            name: 'asm',
                            level: 'nominal'
                        }
                    }
                }
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should not fail when no data (with items property)',
                statsToCollect: () => ({}),
                contextToCollect: context => context,
                getCollectedData: (promise, stats) => promise.then(() => stats.contextData),
                endpoints: [
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
                ],
                expectedData: {
                    HOSTNAME: 'missing data',
                    BASE_MAC_ADDR: 'missing data',
                    deviceVersion: 'missing data',
                    provisioning: {}
                }
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should not fail when no data (without items property)',
                statsToCollect: () => ({}),
                contextToCollect: context => context,
                getCollectedData: (promise, stats) => promise.then(() => stats.contextData),
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/sys/provision',
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
                    }
                ],
                expectedData: {
                    HOSTNAME: 'missing data',
                    BASE_MAC_ADDR: 'missing data',
                    deviceVersion: 'missing data',
                    provisioning: {}
                }
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectSystemStats: {
        name: 'system stats',
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
                name: 'should set properties to undefined when conditional block results to false',
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
                    system: {
                        configReady: undefined,
                        licenseReady: undefined,
                        provisionReady: undefined,
                        asmState: undefined,
                        lastAsmChange: undefined,
                        apmState: undefined,
                        afmState: undefined,
                        lastAfmDeploy: undefined,
                        ltmConfigTime: undefined,
                        gtmConfigTime: undefined
                    }
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
                contextToCollect: context => context,
                expectedData: {
                    system: {
                        hostname: 'test.local',
                        machineId: '00000000-0000-0000-0000-000000000000',
                        version: '14.1.2.3',
                        versionBuild: '0.0.5',
                        location: 'Location',
                        description: 'Description',
                        marketingName: 'Marketing Name',
                        platformId: 'Platform ID',
                        chassisId: '00000000-0000-0000-0000-000000000001',
                        baseMac: '00:01:0A:0B:0C:0D',
                        callBackUrl: 'https://10.0.0.107',
                        configReady: 'yes',
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
                            version: '14.1.2.3',
                            build: '0.0.5',
                            chassisSerialNumber: '00000000-0000-0000-0000-000000000001',
                            platformMarketingName: 'Marketing Name',
                            platform: 'Platform ID',
                            baseMac: '00:1:a:0B:c:D',
                            cpu: 'cpu info'
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
                            times: 2
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
                        request: body => body.utilCmdArgs.indexOf('Policies Consistent') !== -1,
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'asm_state,last_asm_change\nPolicies Consistent,1579837649\n'
                        }
                    },
                    {
                        endpoint: '/mgmt/tm/util/bash',
                        options: {
                            times: 2
                        },
                        method: 'post',
                        request: body => body.utilCmdArgs.indexOf('profile_access_misc_stat') !== -1,
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
                contextToCollect: context => context,
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
                        configReady: undefined, // device version missed
                        licenseReady: undefined, // device version missed
                        provisionReady: undefined, // device version missed
                        syncColor: 'missing data',
                        syncMode: 'missing data',
                        syncStatus: 'missing data',
                        syncSummary: 'missing data',
                        failoverStatus: 'missing data',
                        failoverColor: 'missing data',
                        systemTimestamp: 'missing data',
                        afmState: undefined, // not provisioned
                        apmState: undefined, // not provisioned
                        asmState: undefined, // not provisioned
                        gtmConfigTime: undefined, // not provisioned
                        lastAfmDeploy: undefined, // not provisioned
                        lastAsmChange: undefined, // not provisioned
                        ltmConfigTime: undefined, // not provisioned
                        cpu: 'missing data',
                        memory: NaN, // should be fixed and set to missing data
                        tmmCpu: NaN, // should be fixed and set to missing data
                        tmmMemory: NaN, // should be fixed and set to missing data
                        tmmTraffic: {},
                        diskLatency: {},
                        diskStorage: {},
                        networkInterfaces: {},
                        provisioning: {}
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
                            times: 2
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
                        request: body => body.utilCmdArgs.indexOf('Policies Consistent') !== -1,
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
                        request: body => body.utilCmdArgs.indexOf('profile_access_misc_stat') !== -1,
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
                contextToCollect: context => context,
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
                        configReady: undefined, // device version missed
                        licenseReady: undefined, // device version missed
                        provisionReady: undefined, // device version missed
                        syncColor: 'missing data',
                        syncMode: 'missing data',
                        syncStatus: 'missing data',
                        syncSummary: 'missing data',
                        failoverStatus: 'missing data',
                        failoverColor: 'missing data',
                        systemTimestamp: 'missing data',
                        afmState: undefined, // not provisioned
                        apmState: undefined, // not provisioned
                        asmState: undefined, // not provisioned
                        gtmConfigTime: undefined, // not provisioned
                        lastAfmDeploy: undefined, // not provisioned
                        lastAsmChange: undefined, // not provisioned
                        ltmConfigTime: undefined, // not provisioned
                        cpu: 'missing data',
                        memory: NaN, // should be fixed and set to missing data
                        tmmCpu: NaN, // should be fixed and set to missing data
                        tmmMemory: NaN, // should be fixed and set to missing data
                        tmmTraffic: {},
                        diskLatency: {},
                        diskStorage: {},
                        networkInterfaces: {},
                        provisioning: {}
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
                            times: 2
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
                        request: body => body.utilCmdArgs.indexOf('Policies Consistent') !== -1,
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
                        request: body => body.utilCmdArgs.indexOf('profile_access_misc_stat') !== -1,
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
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectGtmStats: {
        name: 'gtm stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set gtm properties to undefined when gtm module is not provisioned',
                statsToCollect: [
                    'aWideIps',
                    'aaaaWideIps',
                    'cnameWideIps',
                    'mxWideIps',
                    'naptrWideIps',
                    'srvWideIps',
                    'aPools',
                    'aaaaPools',
                    'cnamePools',
                    'mxPools',
                    'naptrPools',
                    'srvPools'
                ],
                contextToCollect: ['provisioning'],
                expectedData: {
                    aWideIps: undefined,
                    aaaaWideIps: undefined,
                    cnameWideIps: undefined,
                    mxWideIps: undefined,
                    naptrWideIps: undefined,
                    srvWideIps: undefined,
                    aPools: undefined,
                    aaaaPools: undefined,
                    cnamePools: undefined,
                    mxPools: undefined,
                    naptrPools: undefined,
                    srvPools: undefined
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
                                    name: 'gtm',
                                    level: 'none',
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
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set gtm properties to empty objects if not configured (with items property)',
                statsToCollect: [
                    'aWideIps',
                    'aaaaWideIps',
                    'cnameWideIps',
                    'mxWideIps',
                    'naptrWideIps',
                    'srvWideIps',
                    'aPools',
                    'aaaaPools',
                    'cnamePools',
                    'mxPools',
                    'naptrPools',
                    'srvPools'
                ],
                contextToCollect: ['provisioning'],
                expectedData: {
                    aWideIps: undefined,
                    aaaaWideIps: undefined,
                    cnameWideIps: undefined,
                    mxWideIps: undefined,
                    naptrWideIps: undefined,
                    srvWideIps: undefined,
                    aPools: {},
                    aaaaPools: {},
                    cnamePools: {},
                    mxPools: {},
                    naptrPools: {},
                    srvPools: {}
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
                        endpoint: /\/mgmt\/tm\/gtm\/\w+\/\w+$/,
                        options: {
                            times: 12
                        },
                        response: (uri) => {
                            const match = uri.match(/\/mgmt\/tm\/gtm\/(\w+)\/(\w+)$/);
                            return {
                                kind: `tm:gtm:${match[1]}:${match[2]}:${match[2]}collectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/${match[1]}/${match[2]}?ver=14.1.0`,
                                items: []
                            };
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set gtm properties to empty objects if not configured (without items property)',
                statsToCollect: [
                    'aWideIps',
                    'aaaaWideIps',
                    'cnameWideIps',
                    'mxWideIps',
                    'naptrWideIps',
                    'srvWideIps',
                    'aPools',
                    'aaaaPools',
                    'cnamePools',
                    'mxPools',
                    'naptrPools',
                    'srvPools'
                ],
                contextToCollect: ['provisioning'],
                expectedData: {
                    aWideIps: undefined,
                    aaaaWideIps: undefined,
                    cnameWideIps: undefined,
                    mxWideIps: undefined,
                    naptrWideIps: undefined,
                    srvWideIps: undefined,
                    aPools: {},
                    aaaaPools: {},
                    cnamePools: {},
                    mxPools: {},
                    naptrPools: {},
                    srvPools: {}
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
                        endpoint: /\/mgmt\/tm\/gtm\/\w+\/\w+$/,
                        options: {
                            times: 12
                        },
                        response: (uri) => {
                            const match = uri.match(/\/mgmt\/tm\/gtm\/(\w+)\/(\w+)$/);
                            return {
                                kind: `tm:gtm:${match[1]}:${match[2]}:${match[2]}collectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/${match[1]}/${match[2]}?ver=14.1.0`
                            };
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect gtm stats',
                statsToCollect: [
                    'aWideIps',
                    'aaaaWideIps',
                    'cnameWideIps',
                    'mxWideIps',
                    'naptrWideIps',
                    'srvWideIps',
                    'aPools',
                    'aaaaPools',
                    'cnamePools',
                    'mxPools',
                    'naptrPools',
                    'srvPools'
                ],
                contextToCollect: ['provisioning'],
                expectedData: {
                    aWideIps: {
                        '/Common/testA.com': {
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
                            wipType: 'A',
                            name: '/Common/testA.com',
                            partition: 'Common',
                            enabled: true,
                            failureRcode: 'noerror',
                            failureRcodeResponse: 'disabled',
                            failureRcodeTtl: 0,
                            lastResortPool: '/Common/ts_a_pool',
                            loadBalancingDecisionLogVerbosity: [
                                'pool-selection',
                                'pool-traversal',
                                'pool-member-selection',
                                'pool-member-traversal'
                            ],
                            minimalResponse: 'enabled',
                            persistCidrIpv4: 32,
                            persistCidrIpv6: 128,
                            persistence: 'disabled',
                            poolLbMode: 'round-robin',
                            topologyPreferEdns0ClientSubnet: 'disabled',
                            ttlPersistence: 3600,
                            aliases: [
                                'www.aone.com'
                            ],
                            pools: [
                                '/Common/ts_a_pool'
                            ]
                        }
                    },
                    aaaaWideIps: {
                        '/Common/testAAAA.com': {
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
                            wipType: 'AAAA',
                            name: '/Common/testAAAA.com',
                            partition: 'Common',
                            enabled: true,
                            failureRcode: 'noerror',
                            failureRcodeResponse: 'disabled',
                            failureRcodeTtl: 0,
                            lastResortPool: '/Common/ts_aaaa_pool',
                            loadBalancingDecisionLogVerbosity: [
                                'pool-selection',
                                'pool-traversal',
                                'pool-member-selection',
                                'pool-member-traversal'
                            ],
                            minimalResponse: 'enabled',
                            persistCidrIpv4: 32,
                            persistCidrIpv6: 128,
                            persistence: 'disabled',
                            poolLbMode: 'round-robin',
                            topologyPreferEdns0ClientSubnet: 'disabled',
                            ttlPersistence: 3600,
                            aliases: [
                                'www.aone.com'
                            ],
                            pools: [
                                '/Common/ts_aaaa_pool'
                            ]
                        }
                    },
                    cnameWideIps: {
                        '/Common/testCNAME.com': {
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
                            name: '/Common/testCNAME.com',
                            partition: 'Common',
                            enabled: true,
                            failureRcode: 'noerror',
                            failureRcodeResponse: 'disabled',
                            failureRcodeTtl: 0,
                            lastResortPool: '/Common/ts_cname_pool',
                            loadBalancingDecisionLogVerbosity: [
                                'pool-selection',
                                'pool-traversal',
                                'pool-member-selection',
                                'pool-member-traversal'
                            ],
                            minimalResponse: 'enabled',
                            persistCidrIpv4: 32,
                            persistCidrIpv6: 128,
                            persistence: 'disabled',
                            poolLbMode: 'round-robin',
                            topologyPreferEdns0ClientSubnet: 'disabled',
                            ttlPersistence: 3600,
                            aliases: [
                                'www.aone.com'
                            ],
                            pools: [
                                '/Common/ts_cname_pool'
                            ]
                        }
                    },
                    mxWideIps: {
                        '/Common/testMX.com': {
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
                            wipType: 'MX',
                            name: '/Common/testMX.com',
                            partition: 'Common',
                            enabled: true,
                            failureRcode: 'noerror',
                            failureRcodeResponse: 'disabled',
                            failureRcodeTtl: 0,
                            lastResortPool: '/Common/ts_mx_pool',
                            loadBalancingDecisionLogVerbosity: [
                                'pool-selection',
                                'pool-traversal',
                                'pool-member-selection',
                                'pool-member-traversal'
                            ],
                            minimalResponse: 'enabled',
                            persistCidrIpv4: 32,
                            persistCidrIpv6: 128,
                            persistence: 'disabled',
                            poolLbMode: 'round-robin',
                            topologyPreferEdns0ClientSubnet: 'disabled',
                            ttlPersistence: 3600,
                            aliases: [
                                'www.aone.com'
                            ],
                            pools: [
                                '/Common/ts_mx_pool'
                            ]
                        }
                    },
                    naptrWideIps: {
                        '/Common/testNAPTR.com': {
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
                            wipType: 'NAPTR',
                            name: '/Common/testNAPTR.com',
                            partition: 'Common',
                            enabled: true,
                            failureRcode: 'noerror',
                            failureRcodeResponse: 'disabled',
                            failureRcodeTtl: 0,
                            lastResortPool: '/Common/ts_naptr_pool',
                            loadBalancingDecisionLogVerbosity: [
                                'pool-selection',
                                'pool-traversal',
                                'pool-member-selection',
                                'pool-member-traversal'
                            ],
                            minimalResponse: 'enabled',
                            persistCidrIpv4: 32,
                            persistCidrIpv6: 128,
                            persistence: 'disabled',
                            poolLbMode: 'round-robin',
                            topologyPreferEdns0ClientSubnet: 'disabled',
                            ttlPersistence: 3600,
                            aliases: [
                                'www.aone.com'
                            ],
                            pools: [
                                '/Common/ts_naptr_pool'
                            ]
                        }
                    },
                    srvWideIps: {
                        '/Common/testSRV.com': {
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
                            wipType: 'SRV',
                            name: '/Common/testSRV.com',
                            partition: 'Common',
                            enabled: true,
                            failureRcode: 'noerror',
                            failureRcodeResponse: 'disabled',
                            failureRcodeTtl: 0,
                            lastResortPool: '/Common/ts_srv_pool',
                            loadBalancingDecisionLogVerbosity: [
                                'pool-selection',
                                'pool-traversal',
                                'pool-member-selection',
                                'pool-member-traversal'
                            ],
                            minimalResponse: 'enabled',
                            persistCidrIpv4: 32,
                            persistCidrIpv6: 128,
                            persistence: 'disabled',
                            poolLbMode: 'round-robin',
                            topologyPreferEdns0ClientSubnet: 'disabled',
                            ttlPersistence: 3600,
                            aliases: [
                                'www.aone.com'
                            ],
                            pools: [
                                '/Common/ts_srv_pool'
                            ]
                        }
                    },
                    aPools: {
                        '/Common/ts_a_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'A',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_a_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {
                                'vs1:testA.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_a_pool',
                                    poolType: 'A',
                                    preferred: 0,
                                    serverName: 'testA.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' ',
                                    vsName: 'vs1',
                                    name: 'testA.com:vs1',
                                    enabled: true,
                                    memberOrder: 0,
                                    ratio: 1,
                                    limitMaxBps: 100,
                                    limitMaxBpsStatus: 'disabled',
                                    limitMaxConnections: 100,
                                    limitMaxConnectionsStatus: 'disabled',
                                    limitMaxPps: 100,
                                    limitMaxPpsStatus: 'disabled',
                                    monitor: 'default'
                                }
                            },
                            fallbackIp: '8.8.8.8',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            monitor: '/Common/gateway_icmp'
                        }
                    },
                    aaaaPools: {
                        '/Common/ts_aaaa_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'AAAA',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_aaaa_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {
                                'vs1:testAAAA.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_aaaa_pool',
                                    poolType: 'AAAA',
                                    preferred: 0,
                                    serverName: 'testAAAA.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' ',
                                    vsName: 'vs1',
                                    name: 'testAAAA.com:vs1',
                                    enabled: true,
                                    memberOrder: 0,
                                    ratio: 1,
                                    limitMaxBps: 100,
                                    limitMaxBpsStatus: 'disabled',
                                    limitMaxConnections: 100,
                                    limitMaxConnectionsStatus: 'disabled',
                                    limitMaxPps: 100,
                                    limitMaxPpsStatus: 'disabled',
                                    monitor: 'default'
                                }
                            },
                            fallbackIp: '8.8.8.8',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            monitor: '/Common/gateway_icmp'
                        }
                    },
                    cnamePools: {
                        '/Common/ts_cname_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'CNAME',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: 'ts_cname_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {
                                'testCNAME.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_cname_pool',
                                    poolType: 'CNAME',
                                    preferred: 0,
                                    serverName: 'testCNAME.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' ',
                                    vsName: ' '
                                }
                            }
                        }
                    },
                    mxPools: {
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
                            name: '/Common/ts_mx_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {
                                'testMX.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_mx_pool',
                                    poolType: 'MX',
                                    preferred: 0,
                                    serverName: 'testMX.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' ',
                                    vsName: ' '
                                }
                            }
                        }
                    },
                    naptrPools: {
                        '/Common/ts_naptr_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'NAPTR',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_naptr_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {
                                'testNAPTR.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_naptr_pool',
                                    poolType: 'NAPTR',
                                    preferred: 0,
                                    serverName: 'testNAPTR.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' ',
                                    vsName: ' '
                                }
                            }
                        }
                    },
                    srvPools: {
                        '/Common/ts_srv_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'SRV',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_srv_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {
                                'testSRV.com': {
                                    alternate: 0,
                                    fallback: 0,
                                    poolName: '/Common/ts_srv_pool',
                                    poolType: 'SRV',
                                    preferred: 0,
                                    serverName: 'testSRV.com',
                                    availabilityState: 'offline',
                                    enabledState: 'enabled',
                                    'status.statusReason': ' ',
                                    vsName: ' '
                                }
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
                        endpoint: /\/mgmt\/tm\/gtm\/wideip\/\w+$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/wideip\/(\w+)$/)[1].toLowerCase();
                            const recTypeUC = recType.toUpperCase();
                            return {
                                kind: `tm:gtm:wideip:${recType}:srvcollectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/wideip/${recType}?ver=14.1.0`,
                                items: [
                                    {
                                        kind: `tm:gtm:wideip:${recType}:${recType}state`,
                                        name: `test${recTypeUC}.com`,
                                        partition: 'Common',
                                        fullPath: `/Common/test${recTypeUC}.com`,
                                        generation: 9060,
                                        selfLink: `https://localhost/mgmt/tm/gtm/wideip/${recType}/~Common~test${recTypeUC}.com?ver=14.1.0`,
                                        enabled: true,
                                        failureRcode: 'noerror',
                                        failureRcodeResponse: 'disabled',
                                        failureRcodeTtl: 0,
                                        lastResortPool: `${recType} /Common/ts_${recType}_pool`,
                                        loadBalancingDecisionLogVerbosity: [
                                            'pool-selection',
                                            'pool-traversal',
                                            'pool-member-selection',
                                            'pool-member-traversal'
                                        ],
                                        minimalResponse: 'enabled',
                                        persistCidrIpv4: 32,
                                        persistCidrIpv6: 128,
                                        persistence: 'disabled',
                                        poolLbMode: 'round-robin',
                                        topologyPreferEdns0ClientSubnet: 'disabled',
                                        ttlPersistence: 3600,
                                        aliases: [
                                            'www.aone.com'
                                        ],
                                        pools: [
                                            {
                                                name: `ts_${recType}_pool`,
                                                partition: 'Common',
                                                order: 0,
                                                ratio: 1,
                                                nameReference: {
                                                    link: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool?ver=14.1.0`
                                                }
                                            }
                                        ]
                                    }
                                ]
                            };
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/wideip\/\w+\/~Common~test\w+.com\/stats$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/wideip\/(\w+)\/~Common~test\w+.com\/stats$/)[1].toLowerCase();
                            const recTypeUC = recType.toUpperCase();
                            return {
                                kind: `tm:gtm:wideip:${recType}:${recType}stats`,
                                selfLink: `https://localhost/mgmt/tm/gtm/wideip/${recType}/~Common~test${recTypeUC}.com/stats?ver=14.1.0`,
                                entries: {
                                    [`https://localhost/mgmt/tm/gtm/wideip/${recType}/~Common~test${recTypeUC}.com/~Common~test${recTypeUC}.com:${recTypeUC}/stats`]: {
                                        nestedStats: {
                                            kind: `tm:gtm:wideip:${recType}:${recType}stats`,
                                            selfLink: `https://localhost/mgmt/tm/gtm/wideip/${recType}/~Common~test${recTypeUC}.com/~Common~test${recTypeUC}.com:${recTypeUC}/stats?ver=14.1.0`,
                                            entries: {
                                                alternate: {
                                                    value: 0
                                                },
                                                cnameResolutions: {
                                                    value: 0
                                                },
                                                dropped: {
                                                    value: 0
                                                },
                                                fallback: {
                                                    value: 0
                                                },
                                                persisted: {
                                                    value: 0
                                                },
                                                preferred: {
                                                    value: 0
                                                },
                                                rcode: {
                                                    value: 0
                                                },
                                                requests: {
                                                    value: 0
                                                },
                                                resolutions: {
                                                    value: 0
                                                },
                                                returnFromDns: {
                                                    value: 0
                                                },
                                                returnToDns: {
                                                    value: 0
                                                },
                                                'status.availabilityState': {
                                                    description: 'unknown'
                                                },
                                                'status.enabledState': {
                                                    description: 'enabled'
                                                },
                                                'status.statusReason': {
                                                    description: 'Checking'
                                                },
                                                wipName: {
                                                    description: `/Common/test${recTypeUC}.com`
                                                },
                                                wipType: {
                                                    description: recTypeUC
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)$/)[1].toLowerCase();
                            const ret = {
                                kind: `tm:gtm:pool:${recType}:${recType}collectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}?ver=14.1.0`,
                                items: [
                                    {
                                        kind: `tm:gtm:pool:${recType}:${recType}state`,
                                        name: `ts_${recType}_pool`,
                                        partition: 'Common',
                                        fullPath: `/Common/ts_${recType}_pool`,
                                        generation: 9053,
                                        selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool?ver=14.1.0`,
                                        alternateMode: 'round-robin',
                                        dynamicRatio: 'disabled',
                                        enabled: true,
                                        fallbackMode: 'return-to-dns',
                                        loadBalancingMode: 'round-robin',
                                        manualResume: 'disabled',
                                        maxAnswersReturned: 1,
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
                                        verifyMemberAvailability: 'enabled',
                                        membersReference: {
                                            link: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members?ver=14.1.0`,
                                            isSubcollection: true
                                        }
                                    }
                                ]
                            };
                            if (recType === 'a' || recType === 'aaaa') {
                                Object.assign(ret.items[0], {
                                    fallbackIp: '8.8.8.8',
                                    fallbackMode: 'return-to-dns',
                                    limitMaxBps: 0,
                                    limitMaxBpsStatus: 'disabled',
                                    limitMaxConnections: 0,
                                    limitMaxConnectionsStatus: 'disabled',
                                    limitMaxPps: 0,
                                    limitMaxPpsStatus: 'disabled',
                                    monitor: '/Common/gateway_icmp'
                                });
                            }
                            return ret;
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+\/~Common~ts_\w+_pool\/members\/stats$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)\/~Common~ts_\w+_pool\/members\/stats$/)[1].toLowerCase();
                            const recTypeUC = recType.toUpperCase();
                            let vsName = '%20';
                            if (recType === 'a' || recType === 'aaaa') {
                                vsName = 'vs1';
                            }
                            return {
                                kind: `tm:gtm:pool:${recType}:members:memberscollectionstats`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members/stats?ver=14.1.0`,
                                entries: {
                                    [`https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members/${vsName}:test${recTypeUC}.com/stats`]: {
                                        nestedStats: {
                                            kind: 'tm:gtm:pool:mx:members:membersstats',
                                            selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members/${vsName}:test${recTypeUC}.com/stats?ver=14.1.0`,
                                            entries: {
                                                alternate: {
                                                    value: 0
                                                },
                                                fallback: {
                                                    value: 0
                                                },
                                                poolName: {
                                                    description: `/Common/ts_${recType}_pool`
                                                },
                                                poolType: {
                                                    description: recTypeUC
                                                },
                                                preferred: {
                                                    value: 0
                                                },
                                                serverName: {
                                                    description: `test${recTypeUC}.com`
                                                },
                                                'status.availabilityState': {
                                                    description: 'offline'
                                                },
                                                'status.enabledState': {
                                                    description: 'enabled'
                                                },
                                                'status.statusReason': {
                                                    description: ' '
                                                },
                                                vsName: {
                                                    description: vsName === '%20' ? ' ' : vsName
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+\/~Common~ts_\w+_pool\/members$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)\/~Common~ts_\w+_pool\/members$/)[1].toLowerCase();
                            const recTypeUC = recType.toUpperCase();
                            let vsName = '';
                            if (recType === 'a' || recType === 'aaaa') {
                                vsName = ':vs1';
                            }

                            const ret = {
                                kind: `tm:gtm:pool:${recType}:members:memberscollectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members?ver=14.1.0`,
                                items: [
                                    {
                                        kind: `tm:gtm:pool:${recType}:members:membersstate`,
                                        name: `test${recTypeUC}.com${vsName}`,
                                        fullPath: `test${recTypeUC}.com${vsName}`,
                                        generation: 237,
                                        selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members/test${recTypeUC}.com${vsName}?ver=14.1.0`,
                                        enabled: true,
                                        memberOrder: 0,
                                        ratio: 1
                                    }
                                ]
                            };
                            if (recType === 'mx') {
                                ret.items[0].priority = 100;
                            }
                            if (recType === 'cname') {
                                ret.items[0].staticTarget = 'no';
                            }
                            if (recType === 'naptr') {
                                Object.assign(ret.items[0], {
                                    flags: 'a',
                                    preference: 100,
                                    service: '80'
                                });
                            }
                            if (recType === 'srv') {
                                Object.assign(ret.items[0], {
                                    port: 80,
                                    priority: 10,
                                    weight: 10
                                });
                            }
                            if (recType === 'a' || recType === 'aaaa') {
                                Object.assign(ret.items[0], {
                                    limitMaxBps: 100,
                                    limitMaxBpsStatus: 'disabled',
                                    limitMaxConnections: 100,
                                    limitMaxConnectionsStatus: 'disabled',
                                    limitMaxPps: 100,
                                    limitMaxPpsStatus: 'disabled',
                                    monitor: 'default'
                                });
                            }
                            return ret;
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+\/~Common~ts_\w+_pool\/stats$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)\/~Common~ts_\w+_pool\/stats$/)[1].toLowerCase();
                            const recTypeUC = recType.toUpperCase();
                            return {
                                kind: `tm:gtm:pool:${recType}:${recType}stats`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/stats?ver=14.1.0`,
                                entries: {
                                    [`https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/~Common~ts_${recType}_pool:${recTypeUC}/stats`]: {
                                        nestedStats: {
                                            kind: `tm:gtm:pool:${recType}:${recType}stats`,
                                            selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/~Common~ts_${recType}_pool:${recTypeUC}/stats?ver=14.1.0`,
                                            entries: {
                                                alternate: {
                                                    value: 0
                                                },
                                                dropped: {
                                                    value: 0
                                                },
                                                fallback: {
                                                    value: 0
                                                },
                                                tmName: {
                                                    description: `/Common/ts_${recType}_pool`
                                                },
                                                poolType: {
                                                    description: recTypeUC
                                                },
                                                preferred: {
                                                    value: 0
                                                },
                                                returnFromDns: {
                                                    value: 0
                                                },
                                                returnToDns: {
                                                    value: 0
                                                },
                                                'status.availabilityState': {
                                                    description: 'offline'
                                                },
                                                'status.enabledState': {
                                                    description: 'enabled'
                                                },
                                                'status.statusReason': {
                                                    description: 'No enabled pool members available'
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set members to empty object when pool has no members',
                statsToCollect: [
                    'aPools',
                    'aaaaPools',
                    'cnamePools',
                    'mxPools',
                    'naptrPools',
                    'srvPools'
                ],
                contextToCollect: ['provisioning'],
                expectedData: {
                    aPools: {
                        '/Common/ts_a_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'A',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_a_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {},
                            fallbackIp: '8.8.8.8',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            monitor: '/Common/gateway_icmp'
                        }
                    },
                    aaaaPools: {
                        '/Common/ts_aaaa_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'AAAA',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_aaaa_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {},
                            fallbackIp: '8.8.8.8',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            monitor: '/Common/gateway_icmp'
                        }
                    },
                    cnamePools: {
                        '/Common/ts_cname_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'CNAME',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: 'ts_cname_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {}
                        }
                    },
                    mxPools: {
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
                            name: '/Common/ts_mx_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {}
                        }
                    },
                    naptrPools: {
                        '/Common/ts_naptr_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'NAPTR',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_naptr_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {}
                        }
                    },
                    srvPools: {
                        '/Common/ts_srv_pool': {
                            alternate: 0,
                            dropped: 0,
                            fallback: 0,
                            poolType: 'SRV',
                            preferred: 0,
                            returnFromDns: 0,
                            returnToDns: 0,
                            availabilityState: 'offline',
                            enabledState: 'enabled',
                            'status.statusReason': 'No enabled pool members available',
                            name: '/Common/ts_srv_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled',
                            enabled: true,
                            fallbackMode: 'return-to-dns',
                            loadBalancingMode: 'round-robin',
                            manualResume: 'disabled',
                            maxAnswersReturned: 1,
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
                            verifyMemberAvailability: 'enabled',
                            members: {}
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
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)$/)[1].toLowerCase();
                            const ret = {
                                kind: `tm:gtm:pool:${recType}:${recType}collectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}?ver=14.1.0`,
                                items: [
                                    {
                                        kind: `tm:gtm:pool:${recType}:${recType}state`,
                                        name: `ts_${recType}_pool`,
                                        partition: 'Common',
                                        fullPath: `/Common/ts_${recType}_pool`,
                                        generation: 9053,
                                        selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool?ver=14.1.0`,
                                        alternateMode: 'round-robin',
                                        dynamicRatio: 'disabled',
                                        enabled: true,
                                        fallbackMode: 'return-to-dns',
                                        loadBalancingMode: 'round-robin',
                                        manualResume: 'disabled',
                                        maxAnswersReturned: 1,
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
                                        verifyMemberAvailability: 'enabled',
                                        membersReference: {
                                            link: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members?ver=14.1.0`,
                                            isSubcollection: true
                                        }
                                    }
                                ]
                            };
                            if (recType === 'a' || recType === 'aaaa') {
                                Object.assign(ret.items[0], {
                                    fallbackIp: '8.8.8.8',
                                    fallbackMode: 'return-to-dns',
                                    limitMaxBps: 0,
                                    limitMaxBpsStatus: 'disabled',
                                    limitMaxConnections: 0,
                                    limitMaxConnectionsStatus: 'disabled',
                                    limitMaxPps: 0,
                                    limitMaxPpsStatus: 'disabled',
                                    monitor: '/Common/gateway_icmp'
                                });
                            }
                            return ret;
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+\/~Common~ts_\w+_pool\/members\/stats$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)\/~Common~ts_\w+_pool\/members\/stats$/)[1].toLowerCase();
                            return {
                                kind: `tm:gtm:pool:${recType}:members:memberscollectionstats`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members/stats?ver=14.1.0`
                            };
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+\/~Common~ts_\w+_pool\/members$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)\/~Common~ts_\w+_pool\/members$/)[1].toLowerCase();
                            return {
                                kind: `tm:gtm:pool:${recType}:members:memberscollectionstate`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/members?ver=14.1.0`
                            };
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/gtm\/pool\/\w+\/~Common~ts_\w+_pool\/stats$/,
                        options: {
                            times: 6
                        },
                        response: (uri) => {
                            const recType = uri.match(/\/mgmt\/tm\/gtm\/pool\/(\w+)\/~Common~ts_\w+_pool\/stats$/)[1].toLowerCase();
                            const recTypeUC = recType.toUpperCase();
                            return {
                                kind: `tm:gtm:pool:${recType}:${recType}stats`,
                                selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/stats?ver=14.1.0`,
                                entries: {
                                    [`https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/~Common~ts_${recType}_pool:${recTypeUC}/stats`]: {
                                        nestedStats: {
                                            kind: `tm:gtm:pool:${recType}:${recType}stats`,
                                            selfLink: `https://localhost/mgmt/tm/gtm/pool/${recType}/~Common~ts_${recType}_pool/~Common~ts_${recType}_pool:${recTypeUC}/stats?ver=14.1.0`,
                                            entries: {
                                                alternate: {
                                                    value: 0
                                                },
                                                dropped: {
                                                    value: 0
                                                },
                                                fallback: {
                                                    value: 0
                                                },
                                                tmName: {
                                                    description: `/Common/ts_${recType}_pool`
                                                },
                                                poolType: {
                                                    description: recTypeUC
                                                },
                                                preferred: {
                                                    value: 0
                                                },
                                                returnFromDns: {
                                                    value: 0
                                                },
                                                returnToDns: {
                                                    value: 0
                                                },
                                                'status.availabilityState': {
                                                    description: 'offline'
                                                },
                                                'status.enabledState': {
                                                    description: 'enabled'
                                                },
                                                'status.statusReason': {
                                                    description: 'No enabled pool members available'
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectVirtualServers: {
        name: 'virtual servers stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set virtualServers to empty object if not configured (with items property)',
                statsToCollect: ['virtualServers'],
                contextToCollect: [],
                expectedData: {
                    virtualServers: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/virtual/,
                        response: {
                            kind: 'tm:ltm:virtual:virtualcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?ver=14.1.0',
                            items: []
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set virtualServers to empty object if not configured (without items property)',
                statsToCollect: ['virtualServers'],
                contextToCollect: [],
                expectedData: {
                    virtualServers: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/virtual/,
                        response: {
                            kind: 'tm:ltm:virtual:virtualcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect virtual servers stats',
                statsToCollect: ['virtualServers'],
                contextToCollect: [],
                expectedData: {
                    virtualServers: {
                        '/Common/test_vs_0': {
                            availabilityState: 'unknown',
                            'clientside.bitsIn': 0,
                            'clientside.bitsOut': 0,
                            'clientside.curConns': 0,
                            destination: '10.11.0.2:80',
                            enabledState: 'enabled',
                            ipProtocol: 'tcp',
                            mask: '255.255.255.255',
                            name: '/Common/test_vs_0',
                            pool: '/Common/test_pool_0'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/virtual/,
                        response: {
                            kind: 'tm:ltm:virtual:virtualcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?ver=14.1.0',
                            items: [
                                {
                                    name: 'test_vs_0',
                                    fullPath: '/Common/test_vs_0',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0?ver=14.1.0',
                                    ipProtocol: 'tcp',
                                    mask: '255.255.255.255',
                                    pool: '/Common/test_pool_0',
                                    poolReference: {
                                        link: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        endpoint: '/mgmt/tm/ltm/virtual/~Common~test_vs_0/stats',
                        response: {
                            kind: 'tm:ltm:virtual:virtualstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:virtual:virtualstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0/stats?ver=14.1.0',
                                        entries: {
                                            'clientside.bitsIn': {
                                                value: 0
                                            },
                                            'clientside.bitsOut': {
                                                value: 0
                                            },
                                            'clientside.curConns': {
                                                value: 0
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
                                                description: '10.11.0.2:80'
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
                                                description: '/Common/test_vs_0'
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
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectPools: {
        name: 'pools stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set pools to empty object if not configured (with items property)',
                statsToCollect: ['pools'],
                contextToCollect: [],
                expectedData: {
                    pools: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/pool/,
                        response: {
                            kind: 'tm:ltm:pool:poolcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool?ver=14.1.0',
                            items: []
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set pools to empty object if not configured (without items property)',
                statsToCollect: ['pools'],
                contextToCollect: [],
                expectedData: {
                    pools: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/pool/,
                        response: {
                            kind: 'tm:ltm:pool:poolcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect pools stats',
                statsToCollect: ['pools'],
                contextToCollect: [],
                expectedData: {
                    pools: {
                        '/Common/test_pool_0': {
                            activeMemberCnt: 0,
                            availabilityState: 'unknown',
                            curPriogrp: 0,
                            enabledState: 'enabled',
                            highestPriogrp: 0,
                            lowestPriogrp: 0,
                            members: {
                                '/Common/10.10.0.2:80': {
                                    addr: '10.10.0.2',
                                    availabilityState: 'unknown',
                                    enabledState: 'enabled',
                                    port: 80,
                                    'serverside.bitsIn': 0,
                                    'serverside.bitsOut': 0,
                                    'serverside.curConns': 0
                                }
                            },
                            name: '/Common/test_pool_0',
                            'serverside.bitsIn': 0,
                            'serverside.bitsOut': 0,
                            'serverside.curConns': 0
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/pool/,
                        response: {
                            kind: 'tm:ltm:pool:poolcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool?$top=1&ver=14.1.0',
                            currentItemCount: 1,
                            itemsPerPage: 1,
                            pageIndex: 2,
                            startIndex: 1,
                            totalItems: 2000,
                            totalPages: 2000,
                            items: [
                                {
                                    kind: 'tm:ltm:pool:poolstate',
                                    name: 'test_pool_0',
                                    partition: 'Common',
                                    fullPath: '/Common/test_pool_0',
                                    generation: 1876,
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                                    allowNat: 'yes',
                                    allowSnat: 'yes',
                                    ignorePersistedWeight: 'disabled',
                                    ipTosToClient: 'pass-through',
                                    ipTosToServer: 'pass-through',
                                    linkQosToClient: 'pass-through',
                                    linkQosToServer: 'pass-through',
                                    loadBalancingMode: 'round-robin',
                                    minActiveMembers: 0,
                                    minUpMembers: 0,
                                    minUpMembersAction: 'failover',
                                    minUpMembersChecking: 'disabled',
                                    queueDepthLimit: 0,
                                    queueOnConnectionLimit: 'disabled',
                                    queueTimeLimit: 0,
                                    reselectTries: 0,
                                    serviceDownAction: 'none',
                                    slowRampTime: 10,
                                    membersReference: {
                                        link: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?ver=14.1.0',
                                        isSubcollection: true
                                    }
                                }
                            ],
                            nextLink: 'https://localhost/mgmt/tm/ltm/pool?$top=1&$skip=1&ver=14.1.0'
                        }
                    },
                    {
                        endpoint: '/mgmt/tm/ltm/pool/~Common~test_pool_0/members/stats',
                        response: {
                            kind: 'tm:ltm:pool:members:memberscollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:pool:members:membersstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats?ver=14.1.0',
                                        entries: {
                                            addr: {
                                                description: '10.10.0.2'
                                            },
                                            'connq.ageEdm': {
                                                value: 0
                                            },
                                            'connq.ageEma': {
                                                value: 0
                                            },
                                            'connq.ageHead': {
                                                value: 0
                                            },
                                            'connq.ageMax': {
                                                value: 0
                                            },
                                            'connq.depth': {
                                                value: 0
                                            },
                                            'connq.serviced': {
                                                value: 0
                                            },
                                            curSessions: {
                                                value: 0
                                            },
                                            monitorRule: {
                                                description: 'none'
                                            },
                                            monitorStatus: {
                                                description: 'unchecked'
                                            },
                                            nodeName: {
                                                description: '/Common/10.10.0.2'
                                            },
                                            poolName: {
                                                description: '/Common/test_pool_0'
                                            },
                                            port: {
                                                value: 80
                                            },
                                            'serverside.bitsIn': {
                                                value: 0
                                            },
                                            'serverside.bitsOut': {
                                                value: 0
                                            },
                                            'serverside.curConns': {
                                                value: 0
                                            },
                                            'serverside.maxConns': {
                                                value: 0
                                            },
                                            'serverside.pktsIn': {
                                                value: 0
                                            },
                                            'serverside.pktsOut': {
                                                value: 0
                                            },
                                            'serverside.totConns': {
                                                value: 0
                                            },
                                            sessionStatus: {
                                                description: 'enabled'
                                            },
                                            'status.availabilityState': {
                                                description: 'unknown'
                                            },
                                            'status.enabledState': {
                                                description: 'enabled'
                                            },
                                            'status.statusReason': {
                                                description: 'Pool member does not have service checking enabled'
                                            },
                                            totRequests: {
                                                value: 0
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        endpoint: '/mgmt/tm/ltm/pool/~Common~test_pool_0/stats',
                        response: {
                            kind: 'tm:ltm:pool:poolstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:pool:poolstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/stats?ver=14.1.0',
                                        entries: {
                                            activeMemberCnt: {
                                                value: 0
                                            },
                                            availableMemberCnt: {
                                                value: 3
                                            },
                                            'connqAll.ageEdm': {
                                                value: 0
                                            },
                                            'connqAll.ageEma': {
                                                value: 0
                                            },
                                            'connqAll.ageHead': {
                                                value: 0
                                            },
                                            'connqAll.ageMax': {
                                                value: 0
                                            },
                                            'connqAll.depth': {
                                                value: 0
                                            },
                                            'connqAll.serviced': {
                                                value: 0
                                            },
                                            'connq.ageEdm': {
                                                value: 0
                                            },
                                            'connq.ageEma': {
                                                value: 0
                                            },
                                            'connq.ageHead': {
                                                value: 0
                                            },
                                            'connq.ageMax': {
                                                value: 0
                                            },
                                            'connq.depth': {
                                                value: 0
                                            },
                                            'connq.serviced': {
                                                value: 0
                                            },
                                            curPriogrp: {
                                                value: 0
                                            },
                                            curSessions: {
                                                value: 0
                                            },
                                            highestPriogrp: {
                                                value: 0
                                            },
                                            lowestPriogrp: {
                                                value: 0
                                            },
                                            memberCnt: {
                                                value: 3
                                            },
                                            minActiveMembers: {
                                                value: 0
                                            },
                                            monitorRule: {
                                                description: 'none'
                                            },
                                            tmName: {
                                                description: '/Common/test_pool_0'
                                            },
                                            'serverside.bitsIn': {
                                                value: 0
                                            },
                                            'serverside.bitsOut': {
                                                value: 0
                                            },
                                            'serverside.curConns': {
                                                value: 0
                                            },
                                            'serverside.maxConns': {
                                                value: 0
                                            },
                                            'serverside.pktsIn': {
                                                value: 0
                                            },
                                            'serverside.pktsOut': {
                                                value: 0
                                            },
                                            'serverside.totConns': {
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
                                            totRequests: {
                                                value: 0
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectLtmPolicies: {
        name: 'ltm policies stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set ltm policies to empty object if not configured',
                statsToCollect: ['ltmPolicies'],
                contextToCollect: [],
                expectedData: {
                    ltmPolicies: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/policy\/stats/,
                        response: {
                            kind: 'tm:ltm:policy:policycollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/policy/stats?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect ltm policies stats',
                statsToCollect: ['ltmPolicies'],
                contextToCollect: [],
                expectedData: {
                    ltmPolicies: {
                        '/Common/asm_auto_l7_policy__test_vs': {
                            actions: {
                                'default:1': {
                                    invoked: 1,
                                    succeeded: 1
                                }
                            },
                            invoked: 1,
                            name: '/Common/asm_auto_l7_policy__test_vs',
                            succeeded: 1
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/policy\/stats/,
                        response: {
                            kind: 'tm:ltm:policy:policycollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/policy/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:policy:policystats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/stats?ver=14.1.0',
                                        entries: {
                                            invoked: {
                                                value: 1
                                            },
                                            policyName: {
                                                description: '/Common/asm_auto_l7_policy__test_vs'
                                            },
                                            succeeded: {
                                                value: 1
                                            },
                                            vsName: {
                                                description: 'N/A'
                                            },
                                            'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/actions/stats': {
                                                nestedStats: {
                                                    entries: {
                                                        'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/actions/default:1/stats': {
                                                            nestedStats: {
                                                                entries: {
                                                                    action: {
                                                                        description: 'enable'
                                                                    },
                                                                    actionId: {
                                                                        value: 1
                                                                    },
                                                                    invoked: {
                                                                        value: 1
                                                                    },
                                                                    ruleName: {
                                                                        description: 'default'
                                                                    },
                                                                    succeeded: {
                                                                        value: 1
                                                                    },
                                                                    tmTarget: {
                                                                        description: 'asm'
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
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectHttpProfiles: {
        name: 'http profiles stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set http profiles to empty object if not configured',
                statsToCollect: ['httpProfiles'],
                contextToCollect: [],
                expectedData: {
                    httpProfiles: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/profile\/http\/stats/,
                        response: {
                            kind: 'tm:ltm:policy:policycollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/policy/stats?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect http profiles stats',
                statsToCollect: ['httpProfiles'],
                contextToCollect: [],
                expectedData: {
                    httpProfiles: {
                        '/Common/http': {
                            '2xxResp': 1,
                            '3xxResp': 0,
                            '4xxResp': 0,
                            '5xxResp': 0,
                            cookiePersistInserts: 0,
                            getReqs: 1,
                            maxKeepaliveReq: 1,
                            name: '/Common/http',
                            numberReqs: 1,
                            postReqs: 0,
                            respGreaterThan2m: 0,
                            respLessThan2m: 0,
                            v10Reqs: 0,
                            v10Resp: 0,
                            v11Reqs: 1,
                            v11Resp: 1,
                            v9Reqs: 0,
                            v9Resp: 0
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/profile\/http\/stats/,
                        response: {
                            kind: 'tm:ltm:profile:http:httpcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/profile/http/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/profile/http/~Common~http/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:profile:http:httpstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/profile/http/~Common~http/stats?ver=14.1.0',
                                        entries: {
                                            cookiePersistInserts: {
                                                value: 0
                                            },
                                            getReqs: {
                                                value: 1
                                            },
                                            maxKeepaliveReq: {
                                                value: 1
                                            },
                                            tmName: {
                                                description: '/Common/http'
                                            },
                                            numberReqs: {
                                                value: 1
                                            },
                                            passthroughConnect: {
                                                value: 0
                                            },
                                            passthroughExcessClientHeaders: {
                                                value: 0
                                            },
                                            passthroughExcessServerHeaders: {
                                                value: 0
                                            },
                                            passthroughHeaders: {
                                                value: 0
                                            },
                                            passthroughIrule: {
                                                value: 0
                                            },
                                            passthroughOversizeClientHeaders: {
                                                value: 0
                                            },
                                            passthroughOversizeServerHeaders: {
                                                value: 0
                                            },
                                            passthroughPipeline: {
                                                value: 0
                                            },
                                            passthroughUnknownMethod: {
                                                value: 0
                                            },
                                            passthroughWebSockets: {
                                                value: 0
                                            },
                                            postReqs: {
                                                value: 0
                                            },
                                            proxyConnReqs: {
                                                value: 0
                                            },
                                            proxyReqs: {
                                                value: 0
                                            },
                                            resp_2xxCnt: {
                                                value: 1
                                            },
                                            resp_3xxCnt: {
                                                value: 0
                                            },
                                            resp_4xxCnt: {
                                                value: 0
                                            },
                                            resp_5xxCnt: {
                                                value: 0
                                            },
                                            respBucket_128k: {
                                                value: 0
                                            },
                                            respBucket_16k: {
                                                value: 1
                                            },
                                            respBucket_1k: {
                                                value: 0
                                            },
                                            respBucket_2m: {
                                                value: 0
                                            },
                                            respBucket_32k: {
                                                value: 0
                                            },
                                            respBucket_4k: {
                                                value: 0
                                            },
                                            respBucket_512k: {
                                                value: 0
                                            },
                                            respBucket_64k: {
                                                value: 0
                                            },
                                            respBucketLarge: {
                                                value: 0
                                            },
                                            typeId: {
                                                description: 'ltm profile http'
                                            },
                                            v10Reqs: {
                                                value: 0
                                            },
                                            v10Resp: {
                                                value: 0
                                            },
                                            v11Reqs: {
                                                value: 1
                                            },
                                            v11Resp: {
                                                value: 1
                                            },
                                            v9Reqs: {
                                                value: 0
                                            },
                                            v9Resp: {
                                                value: 0
                                            },
                                            vsName: {
                                                description: 'N/A'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectClientSslProfiles: {
        name: 'client ssl profiles stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set client ssl to empty object if not configured',
                statsToCollect: ['clientSslProfiles'],
                contextToCollect: [],
                expectedData: {
                    clientSslProfiles: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/profile\/client-ssl\/stats/,
                        response: {
                            kind: 'tm:ltm:profile:client-ssl:client-sslcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/client-ssl/stats?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect client ssl profiles stats',
                statsToCollect: ['clientSslProfiles'],
                contextToCollect: [],
                expectedData: {
                    clientSslProfiles: {
                        '/Common/clientssl': {
                            activeHandshakeRejected: 0,
                            'cipherUses.chacha20Poly1305Bulk': 0,
                            currentCompatibleConnections: 0,
                            currentConnections: 0,
                            currentNativeConnections: 0,
                            currentActiveHandshakes: 0,
                            decryptedBytesIn: 0,
                            decryptedBytesOut: 0,
                            encryptedBytesIn: 0,
                            encryptedBytesOut: 0,
                            fatalAlerts: 0,
                            handshakeFailures: 0,
                            peercertInvalid: 0,
                            peercertNone: 0,
                            peercertValid: 0,
                            'protocolUses.dtlsv1': 0,
                            'protocolUses.sslv2': 0,
                            'protocolUses.sslv3': 0,
                            'protocolUses.tlsv1': 0,
                            'protocolUses.tlsv1_1': 0,
                            'protocolUses.tlsv1_2': 0,
                            'protocolUses.tlsv1_3': 0,
                            recordsIn: 0,
                            recordsOut: 0,
                            sniRejects: 0,
                            name: '/Common/clientssl'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/profile\/client-ssl\/stats/,
                        response: {
                            kind: 'tm:ltm:profile:client-ssl:client-sslcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/profile/client-ssl/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/profile/client-ssl/~Common~clientssl/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:profile:client-ssl:client-sslstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/profile/client-ssl/~Common~clientssl/stats?ver=14.1.0',
                                        entries: {
                                            'common.activeHandshakeRejected': {
                                                value: 0
                                            },
                                            'common.aggregateRenegotiationsRejected': {
                                                value: 0
                                            },
                                            'common.badRecords': {
                                                value: 0
                                            },
                                            'common.c3dUses.conns': {
                                                value: 0
                                            },
                                            'common.cipherUses.adhKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.aesBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.aesGcmBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.camelliaBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.chacha20Poly1305Bulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.desBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.dhRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.dheDssKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdhEcdsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdhRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdheEcdsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdheRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.edhRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ideaBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.md5Digest': {
                                                value: 0
                                            },
                                            'common.cipherUses.nullBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.nullDigest': {
                                                value: 0
                                            },
                                            'common.cipherUses.rc2Bulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.rc4Bulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.rsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.shaDigest': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haCtxRecv': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haCtxSent': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haFailure': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haHsSuccess': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haPeerReady': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haTimeout': {
                                                value: 0
                                            },
                                            'common.curCompatConns': {
                                                value: 0
                                            },
                                            'common.curConns': {
                                                value: 0
                                            },
                                            'common.curNativeConns': {
                                                value: 0
                                            },
                                            'common.currentActiveHandshakes': {
                                                value: 0
                                            },
                                            'common.decryptedBytesIn': {
                                                value: 0
                                            },
                                            'common.decryptedBytesOut': {
                                                value: 0
                                            },
                                            'common.dtlsTxPushbacks': {
                                                value: 0
                                            },
                                            'common.encryptedBytesIn': {
                                                value: 0
                                            },
                                            'common.encryptedBytesOut': {
                                                value: 0
                                            },
                                            'common.extendedMasterSecrets': {
                                                value: 0
                                            },
                                            'common.fatalAlerts': {
                                                value: 0
                                            },
                                            'common.fullyHwAcceleratedConns': {
                                                value: 0
                                            },
                                            'common.fwdpUses.alertBypasses': {
                                                value: 0
                                            },
                                            'common.fwdpUses.cachedCerts': {
                                                value: 0
                                            },
                                            'common.fwdpUses.clicertFailBypasses': {
                                                value: 0
                                            },
                                            'common.fwdpUses.conns': {
                                                value: 0
                                            },
                                            'common.fwdpUses.dipBypasses': {
                                                value: 0
                                            },
                                            'common.fwdpUses.enforceResumeFailures': {
                                                value: 0
                                            },
                                            'common.fwdpUses.hnBypasses': {
                                                value: 0
                                            },
                                            'common.fwdpUses.sipBypasses': {
                                                value: 0
                                            },
                                            'common.fwdpUses.transparentResumeCnt': {
                                                value: 0
                                            },
                                            'common.fwdpUses.verifiedHsCnt': {
                                                value: 0
                                            },
                                            'common.handshakeFailures': {
                                                value: 0
                                            },
                                            'common.insecureHandshakeAccepts': {
                                                value: 0
                                            },
                                            'common.insecureHandshakeRejects': {
                                                value: 0
                                            },
                                            'common.insecureRenegotiationRejects': {
                                                value: 0
                                            },
                                            'common.maxCompatConns': {
                                                value: 0
                                            },
                                            'common.maxConns': {
                                                value: 0
                                            },
                                            'common.maxNativeConns': {
                                                value: 0
                                            },
                                            'common.midstreamRenegotiations': {
                                                value: 0
                                            },
                                            'common.nonHwAcceleratedConns': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.cachedResp': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.certStatusReq': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.invalidCertResp': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.respstatusErrResp': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.revokedResp': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.stapledResp': {
                                                value: 0
                                            },
                                            'common.ocspFwdpClientssl.unknownResp': {
                                                value: 0
                                            },
                                            'common.partiallyHwAcceleratedConns': {
                                                value: 0
                                            },
                                            'common.peercertInvalid': {
                                                value: 0
                                            },
                                            'common.peercertNone': {
                                                value: 0
                                            },
                                            'common.peercertValid': {
                                                value: 0
                                            },
                                            'common.prematureDisconnects': {
                                                value: 0
                                            },
                                            'common.protocolUses.dtlsv1': {
                                                value: 0
                                            },
                                            'common.protocolUses.sslv2': {
                                                value: 0
                                            },
                                            'common.protocolUses.sslv3': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1_1': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1_2': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1_3': {
                                                value: 0
                                            },
                                            'common.recordsIn': {
                                                value: 0
                                            },
                                            'common.recordsOut': {
                                                value: 0
                                            },
                                            'common.renegotiationsRejected': {
                                                value: 0
                                            },
                                            'common.secureHandshakes': {
                                                value: 0
                                            },
                                            'common.sessCacheCurEntries': {
                                                value: 0
                                            },
                                            'common.sessCacheHits': {
                                                value: 0
                                            },
                                            'common.sessCacheInvalidations': {
                                                value: 0
                                            },
                                            'common.sessCacheLookups': {
                                                value: 0
                                            },
                                            'common.sessCacheOverflows': {
                                                value: 0
                                            },
                                            'common.sessionMirroring.failure': {
                                                value: 0
                                            },
                                            'common.sessionMirroring.success': {
                                                value: 0
                                            },
                                            'common.sesstickUses.reuseFailed': {
                                                value: 0
                                            },
                                            'common.sesstickUses.reused': {
                                                value: 0
                                            },
                                            'common.sniRejects': {
                                                value: 0
                                            },
                                            'common.totCompatConns': {
                                                value: 0
                                            },
                                            'common.totNativeConns': {
                                                value: 0
                                            },
                                            'dynamicRecord.x1': {
                                                value: 0
                                            },
                                            'dynamicRecord.x10': {
                                                value: 0
                                            },
                                            'dynamicRecord.x11': {
                                                value: 0
                                            },
                                            'dynamicRecord.x12': {
                                                value: 0
                                            },
                                            'dynamicRecord.x13': {
                                                value: 0
                                            },
                                            'dynamicRecord.x14': {
                                                value: 0
                                            },
                                            'dynamicRecord.x15': {
                                                value: 0
                                            },
                                            'dynamicRecord.x16': {
                                                value: 0
                                            },
                                            'dynamicRecord.x2': {
                                                value: 0
                                            },
                                            'dynamicRecord.x3': {
                                                value: 0
                                            },
                                            'dynamicRecord.x4': {
                                                value: 0
                                            },
                                            'dynamicRecord.x5': {
                                                value: 0
                                            },
                                            'dynamicRecord.x6': {
                                                value: 0
                                            },
                                            'dynamicRecord.x7': {
                                                value: 0
                                            },
                                            'dynamicRecord.x8': {
                                                value: 0
                                            },
                                            'dynamicRecord.x9': {
                                                value: 0
                                            },
                                            tmName: {
                                                description: '/Common/clientssl'
                                            },
                                            total: {
                                                value: 0
                                            },
                                            typeId: {
                                                description: 'ltm profile client-ssl'
                                            },
                                            vsName: {
                                                description: 'N/A'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectServerSslProfiles: {
        name: 'server ssl profiles stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set server ssl profiles to empty object if not configured',
                statsToCollect: ['serverSslProfiles'],
                contextToCollect: [],
                expectedData: {
                    serverSslProfiles: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/profile\/server-ssl\/stats/,
                        response: {
                            kind: 'tm:ltm:profile:server-ssl:server-sslcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/server-ssl/stats?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect server ssl profiles stats',
                statsToCollect: ['serverSslProfiles'],
                contextToCollect: [],
                expectedData: {
                    serverSslProfiles: {
                        '/Common/apm-default-serverssl': {
                            activeHandshakeRejected: 0,
                            'cipherUses.chacha20Poly1305Bulk': 0,
                            currentCompatibleConnections: 0,
                            currentConnections: 0,
                            currentNativeConnections: 0,
                            currentActiveHandshakes: 0,
                            decryptedBytesIn: 0,
                            decryptedBytesOut: 0,
                            encryptedBytesIn: 0,
                            encryptedBytesOut: 0,
                            fatalAlerts: 0,
                            handshakeFailures: 0,
                            peercertInvalid: 0,
                            peercertNone: 0,
                            peercertValid: 0,
                            'protocolUses.dtlsv1': 0,
                            'protocolUses.sslv2': 0,
                            'protocolUses.sslv3': 0,
                            'protocolUses.tlsv1': 0,
                            'protocolUses.tlsv1_1': 0,
                            'protocolUses.tlsv1_2': 0,
                            'protocolUses.tlsv1_3': 0,
                            recordsIn: 0,
                            recordsOut: 0,
                            name: '/Common/apm-default-serverssl'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/profile\/server-ssl\/stats/,
                        response: {
                            kind: 'tm:ltm:profile:server-ssl:server-sslcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/profile/server-ssl/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/profile/server-ssl/~Common~apm-default-serverssl/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:profile:server-ssl:server-sslstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/profile/server-ssl/~Common~apm-default-serverssl/stats?ver=14.1.0',
                                        entries: {
                                            'common.activeHandshakeRejected': {
                                                value: 0
                                            },
                                            'common.badRecords': {
                                                value: 0
                                            },
                                            'common.c3dUses.conns': {
                                                value: 0
                                            },
                                            'common.cipherUses.adhKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.aesBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.aesGcmBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.camelliaBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.chacha20Poly1305Bulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.desBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.dhRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.dheDssKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdhEcdsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdhRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdheEcdsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ecdheRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.edhRsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.ideaBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.md5Digest': {
                                                value: 0
                                            },
                                            'common.cipherUses.nullBulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.nullDigest': {
                                                value: 0
                                            },
                                            'common.cipherUses.rc2Bulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.rc4Bulk': {
                                                value: 0
                                            },
                                            'common.cipherUses.rsaKeyxchg': {
                                                value: 0
                                            },
                                            'common.cipherUses.shaDigest': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haCtxRecv': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haCtxSent': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haFailure': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haHsSuccess': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haPeerReady': {
                                                value: 0
                                            },
                                            'common.connectionMirroring.haTimeout': {
                                                value: 0
                                            },
                                            'common.curCompatConns': {
                                                value: 0
                                            },
                                            'common.curConns': {
                                                value: 0
                                            },
                                            'common.curNativeConns': {
                                                value: 0
                                            },
                                            'common.currentActiveHandshakes': {
                                                value: 0
                                            },
                                            'common.decryptedBytesIn': {
                                                value: 0
                                            },
                                            'common.decryptedBytesOut': {
                                                value: 0
                                            },
                                            'common.dtlsTxPushbacks': {
                                                value: 0
                                            },
                                            'common.encryptedBytesIn': {
                                                value: 0
                                            },
                                            'common.encryptedBytesOut': {
                                                value: 0
                                            },
                                            'common.extendedMasterSecrets': {
                                                value: 0
                                            },
                                            'common.fatalAlerts': {
                                                value: 0
                                            },
                                            'common.fullyHwAcceleratedConns': {
                                                value: 0
                                            },
                                            'common.fwdpUses.conns': {
                                                value: 0
                                            },
                                            'common.fwdpUses.enforceResumeFailures': {
                                                value: 0
                                            },
                                            'common.fwdpUses.transparentResumeCnt': {
                                                value: 0
                                            },
                                            'common.handshakeFailures': {
                                                value: 0
                                            },
                                            'common.insecureHandshakeAccepts': {
                                                value: 0
                                            },
                                            'common.insecureHandshakeRejects': {
                                                value: 0
                                            },
                                            'common.insecureRenegotiationRejects': {
                                                value: 0
                                            },
                                            'common.maxCompatConns': {
                                                value: 0
                                            },
                                            'common.maxConns': {
                                                value: 0
                                            },
                                            'common.maxNativeConns': {
                                                value: 0
                                            },
                                            'common.midstreamRenegotiations': {
                                                value: 0
                                            },
                                            'common.nonHwAcceleratedConns': {
                                                value: 0
                                            },
                                            'common.ocspServerssl.cachedResp': {
                                                value: 0
                                            },
                                            'common.ocspServerssl.certStatusRevoked': {
                                                value: 0
                                            },
                                            'common.ocspServerssl.certStatusUnknown': {
                                                value: 0
                                            },
                                            'common.ocspServerssl.responderQueries': {
                                                value: 0
                                            },
                                            'common.ocspServerssl.responseErrors': {
                                                value: 0
                                            },
                                            'common.ocspServerssl.stapledResp': {
                                                value: 0
                                            },
                                            'common.partiallyHwAcceleratedConns': {
                                                value: 0
                                            },
                                            'common.peercertInvalid': {
                                                value: 0
                                            },
                                            'common.peercertNone': {
                                                value: 0
                                            },
                                            'common.peercertValid': {
                                                value: 0
                                            },
                                            'common.prematureDisconnects': {
                                                value: 0
                                            },
                                            'common.protocolUses.dtlsv1': {
                                                value: 0
                                            },
                                            'common.protocolUses.sslv2': {
                                                value: 0
                                            },
                                            'common.protocolUses.sslv3': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1_1': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1_2': {
                                                value: 0
                                            },
                                            'common.protocolUses.tlsv1_3': {
                                                value: 0
                                            },
                                            'common.recordsIn': {
                                                value: 0
                                            },
                                            'common.recordsOut': {
                                                value: 0
                                            },
                                            'common.secureHandshakes': {
                                                value: 0
                                            },
                                            'common.sessCacheCurEntries': {
                                                value: 0
                                            },
                                            'common.sessCacheHits': {
                                                value: 0
                                            },
                                            'common.sessCacheInvalidations': {
                                                value: 0
                                            },
                                            'common.sessCacheLookups': {
                                                value: 0
                                            },
                                            'common.sessCacheOverflows': {
                                                value: 0
                                            },
                                            'common.sessionMirroring.failure': {
                                                value: 0
                                            },
                                            'common.sessionMirroring.success': {
                                                value: 0
                                            },
                                            'common.sesstickUses.reuseFailed': {
                                                value: 0
                                            },
                                            'common.sesstickUses.reused': {
                                                value: 0
                                            },
                                            'common.totCompatConns': {
                                                value: 0
                                            },
                                            'common.totNativeConns': {
                                                value: 0
                                            },
                                            tmName: {
                                                description: '/Common/apm-default-serverssl'
                                            },
                                            typeId: {
                                                description: 'ltm profile server-ssl'
                                            },
                                            vsName: {
                                                description: 'N/A'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectSslCerts: {
        name: 'ssl certs stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set ssl certs to empty object if not configured (with items property)',
                statsToCollect: ['sslCerts'],
                contextToCollect: [],
                expectedData: {
                    sslCerts: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/sys\/file\/ssl-cert/,
                        response: {
                            kind: 'tm:sys:file:ssl-cert:ssl-certcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert?ver=14.1.0',
                            items: []
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set ssl certs to empty object if not configured (without items property)',
                statsToCollect: ['sslCerts'],
                contextToCollect: [],
                expectedData: {
                    sslCerts: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/sys\/file\/ssl-cert/,
                        response: {
                            kind: 'tm:sys:file:ssl-cert:ssl-certcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect ssl certs stats',
                statsToCollect: ['sslCerts'],
                contextToCollect: [],
                expectedData: {
                    sslCerts: {
                        'ca-bundle.crt': {
                            expirationDate: 1893455999,
                            expirationString: '2029-12-31T23:59:59.000Z',
                            issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                            subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                            name: 'ca-bundle.crt'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/sys\/file\/ssl-cert/,
                        response: {
                            kind: 'tm:sys:file:ssl-cert:ssl-certcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert?ver=14.1.0',
                            items: [
                                {
                                    kind: 'tm:sys:file:ssl-cert:ssl-certstate',
                                    name: 'ca-bundle.crt',
                                    partition: 'Common',
                                    fullPath: '/Common/ca-bundle.crt',
                                    generation: 1,
                                    selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~ca-bundle.crt?ver=14.1.0',
                                    certificateKeyCurveName: 'none',
                                    certificateKeySize: 2048,
                                    checksum: 'SHA1:5368116:a98ae01563290479a33b307ae763ff32d157ac9f',
                                    createTime: '2020-01-23T01:10:20Z',
                                    createdBy: 'root',
                                    expirationDate: 1893455999,
                                    expirationString: 'Dec 31 23:59:59 2029 GMT',
                                    fingerprint: 'SHA256/B5:BD:2C:B7:9C:BD:19:07:29:8D:6B:DF:48:42:E5:16:D8:C7:8F:A6:FC:96:D2:5F:71:AF:81:4E:16:CC:24:5E',
                                    isBundle: 'true',
                                    issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                                    keyType: 'rsa-public',
                                    lastUpdateTime: '2020-01-23T01:10:20Z',
                                    mode: 33261,
                                    revision: 1,
                                    size: 5368116,
                                    subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                                    systemPath: '/config/ssl/ssl.crt/ca-bundle.crt',
                                    updatedBy: 'root',
                                    version: 3,
                                    bundleCertificatesReference: {
                                        link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~ca-bundle.crt/bundle-certificates?ver=14.1.0',
                                        isSubcollection: true
                                    },
                                    certValidatorsReference: {
                                        link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~ca-bundle.crt/cert-validators?ver=14.1.0',
                                        isSubcollection: true
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectNetworkTunnels: {
        name: 'network tunnels stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set network tunnels to empty object if not configured',
                statsToCollect: ['networkTunnels'],
                contextToCollect: [],
                expectedData: {
                    networkTunnels: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/net\/tunnels\/tunnel\/stats/,
                        response: {
                            kind: 'tm:net:tunnels:tunnel:tunnelcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/net/tunnels/tunnel/stats?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect network tunnels stats',
                statsToCollect: ['networkTunnels'],
                contextToCollect: [],
                expectedData: {
                    networkTunnels: {
                        '/Common/http-tunnel': {
                            hcInBroadcastPkts: 0,
                            hcInMulticastPkts: 0,
                            hcInOctets: 0,
                            hcInUcastPkts: 0,
                            hcOutBroadcastPkts: 0,
                            hcOutMulticastPkts: 0,
                            hcOutOctets: 0,
                            hcOutUcastPkts: 0,
                            inDiscards: 0,
                            inErrors: 0,
                            inUnknownProtos: 0,
                            outDiscards: 0,
                            outErrors: 0,
                            name: '/Common/http-tunnel'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/net\/tunnels\/tunnel\/stats/,
                        response: {
                            kind: 'tm:net:tunnels:tunnel:tunnelcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/net/tunnels/tunnel/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/net/tunnels/tunnel/~Common~http-tunnel/stats': {
                                    nestedStats: {
                                        kind: 'tm:net:tunnels:tunnel:tunnelstats',
                                        selfLink: 'https://localhost/mgmt/tm/net/tunnels/tunnel/~Common~http-tunnel/stats?ver=14.1.0',
                                        entries: {
                                            hcInBroadcastPkts: {
                                                value: 0
                                            },
                                            hcInMulticastPkts: {
                                                value: 0
                                            },
                                            hcInOctets: {
                                                value: 0
                                            },
                                            hcInUcastPkts: {
                                                value: 0
                                            },
                                            hcOutBroadcastPkts: {
                                                value: 0
                                            },
                                            hcOutMulticastPkts: {
                                                value: 0
                                            },
                                            hcOutOctets: {
                                                value: 0
                                            },
                                            hcOutUcastPkts: {
                                                value: 0
                                            },
                                            inDiscards: {
                                                value: 0
                                            },
                                            inErrors: {
                                                value: 0
                                            },
                                            inUnknownProtos: {
                                                value: 0
                                            },
                                            tmName: {
                                                description: '/Common/http-tunnel'
                                            },
                                            outDiscards: {
                                                value: 0
                                            },
                                            outErrors: {
                                                value: 0
                                            },
                                            typeId: {
                                                description: 'net tunnels tunnel'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectDeviceGroups: {
        name: 'device groups stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set device groups to empty object if not configured (with items property)',
                statsToCollect: ['deviceGroups'],
                contextToCollect: [],
                expectedData: {
                    deviceGroups: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/cm\/device-group/,
                        response: {
                            kind: 'tm:cm:device-group:device-groupcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/cm/device-group?ver=14.1.0',
                            items: []
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set device groups to empty object if not configured (without items property)',
                statsToCollect: ['deviceGroups'],
                contextToCollect: [],
                expectedData: {
                    deviceGroups: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/cm\/device-group/,
                        response: {
                            kind: 'tm:cm:device-group:device-groupcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/cm/device-group?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect device groups stats',
                statsToCollect: ['deviceGroups'],
                contextToCollect: [],
                expectedData: {
                    deviceGroups: {
                        '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg': {
                            commitIdTime: '2020-01-30T07:48:42.000Z',
                            lssTime: '2020-01-30T07:48:42.000Z',
                            timeSinceLastSync: '-',
                            name: '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg',
                            type: 'sync-only'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/cm\/device-group/,
                        response: {
                            kind: 'tm:cm:device-group:device-groupcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/cm/device-group?ver=14.1.0',
                            items: [
                                {
                                    kind: 'tm:cm:device-group:device-groupstate',
                                    name: 'datasync-device-ts-big-inst.localhost.localdomain-dg',
                                    partition: 'Common',
                                    fullPath: '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg',
                                    generation: 1,
                                    selfLink: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg?ver=14.1.0',
                                    asmSync: 'disabled',
                                    autoSync: 'enabled',
                                    fullLoadOnSync: 'true',
                                    incrementalConfigSyncSizeMax: 1024,
                                    networkFailover: 'disabled',
                                    saveOnAutoSync: 'false',
                                    type: 'sync-only',
                                    devicesReference: {
                                        link: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/devices?ver=14.1.0',
                                        isSubcollection: true
                                    }
                                }
                            ]
                        }
                    },
                    {
                        endpoint: '/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/stats',
                        response: {
                            kind: 'tm:cm:device-group:device-groupstats',
                            selfLink: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg:~Common~ts-big-inst.localhost.localdomain/stats': {
                                    nestedStats: {
                                        kind: 'tm:cm:device-group:device-groupstats',
                                        selfLink: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg:~Common~ts-big-inst.localhost.localdomain/stats?ver=14.1.0',
                                        entries: {
                                            commitIdOriginator: {
                                                description: '/Common/ts-big-inst.localhost.localdomain'
                                            },
                                            commitIdTime: {
                                                description: '2020-01-30T07:48:42.000Z'
                                            },
                                            device: {
                                                description: '/Common/ts-big-inst.localhost.localdomain'
                                            },
                                            devicegroup: {
                                                description: '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg'
                                            },
                                            lastSyncType: {
                                                description: 'none'
                                            },
                                            lssOriginator: {
                                                description: '/Common/ts-big-inst.localhost.localdomain'
                                            },
                                            lssTime: {
                                                description: '2020-01-30T07:48:42.000Z'
                                            },
                                            timeSinceLastSync: {
                                                description: '-'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectIRules: {
        name: 'irules stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set irules stats to empty object if not configured',
                statsToCollect: ['iRules'],
                contextToCollect: [],
                expectedData: {
                    iRules: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/rule\/stats/,
                        response: {
                            kind: 'tm:ltm:rule:rulecollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/rule/stats?ver=14.1.0'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect irules stats',
                statsToCollect: ['iRules'],
                contextToCollect: [],
                expectedData: {
                    iRules: {
                        '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                            events: {
                                ACCESS_ACL_ALLOWED: {
                                    aborts: 0,
                                    avgCycles: 0,
                                    failures: 0,
                                    maxCycles: 0,
                                    minCycles: 0,
                                    priority: 500,
                                    totalExecutions: 0
                                }
                            },
                            name: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth'
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/ltm\/rule\/stats/,
                        response: {
                            kind: 'tm:ltm:rule:rulecollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/rule/stats?ver=14.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_APM_ExchangeSupport_OA_BasicAuth:ACCESS_ACL_ALLOWED/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:rule:rulestats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_APM_ExchangeSupport_OA_BasicAuth:ACCESS_ACL_ALLOWED/stats?ver=14.1.0',
                                        entries: {
                                            aborts: {
                                                value: 0
                                            },
                                            avgCycles: {
                                                value: 0
                                            },
                                            eventType: {
                                                description: 'ACCESS_ACL_ALLOWED'
                                            },
                                            failures: {
                                                value: 0
                                            },
                                            maxCycles: {
                                                value: 0
                                            },
                                            minCycles: {
                                                value: 0
                                            },
                                            tmName: {
                                                description: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth'
                                            },
                                            priority: {
                                                value: 500
                                            },
                                            totalExecutions: {
                                                value: 0
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    collectTmstats: {
        name: 'tmstats stats',
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
                contextToCollect: [],
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
                                name: '/Tenant/app/test',
                                tenant: 'Tenant',
                                application: 'app'
                            },
                            {
                                a: '3',
                                b: '4',
                                c: 'eggs',
                                pool_name: '/Tenant/test',
                                name: '/Tenant/test',
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
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/util/bash',
                        method: 'post',
                        options: {
                            times: 47
                        },
                        request: body => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
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
                                if (stat.structure && stat.structure.parentKey === 'tmstats'
                                    && stat.keyArgs.replaceStrings['\\$tmctlArgs'].indexOf(tmctlTable) !== -1) {
                                    tmctlStat = stat;
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
                                    ['a', 'b', 'c', mapKey || 'someKey'],
                                    [1, 2, 'spam', '/Tenant/app/test'],
                                    [3, 4, 'eggs', '/Tenant/test']
                                ].join('\n')
                            };
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should not fail when command retruns headers only',
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
                contextToCollect: [],
                expectedData: {
                    tmstats: {
                        asmCpuUtilStats: undefined,
                        cpuInfoStat: undefined,
                        diskInfoStat: undefined,
                        dnsCacheResolverStat: undefined,
                        dnsexpressZoneStat: undefined,
                        dosStat: undefined,
                        dosl7PluginStats: undefined,
                        dosl7dStat: undefined,
                        flowEvictionPolicyStat: undefined,
                        gtmDcStat: undefined,
                        gtmWideipStat: undefined,
                        hostInfoStat: undefined,
                        ifcStats: undefined,
                        interfaceStat: undefined,
                        ipIntelligenceStat: undefined,
                        ipStat: undefined,
                        iprepdStat: undefined,
                        kvmVcpuStat: undefined,
                        kvmVmStat: undefined,
                        mcpRequestStat: undefined,
                        mcpTransactionStat: undefined,
                        memoryUsageStat: undefined,
                        monitorInstanceStat: undefined,
                        monitorStat: undefined,
                        poolMemberStat: undefined,
                        poolStat: undefined,
                        procPidStat: undefined,
                        profileBigprotoStat: undefined,
                        profileClientsslStat: undefined,
                        profileConnpoolStat: undefined,
                        profileDnsStat: undefined,
                        profileFtpStat: undefined,
                        profileHttpStat: undefined,
                        profileHttpcompressionStat: undefined,
                        profileServersslStat: undefined,
                        profileTcpStat: undefined,
                        profileUdpStat: undefined,
                        profileWebaccelerationStat: undefined,
                        ruleStat: undefined,
                        tmmStat: undefined,
                        tmmdnsServerStat: undefined,
                        tmmdnsZoneStat: undefined,
                        vcmpGlobalStat: undefined,
                        vcmpStat: undefined,
                        virtualServerConnStat: undefined,
                        virtualServerCpuStat: undefined,
                        virtualServerStat: undefined
                    }
                },
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/util/bash',
                        method: 'post',
                        options: {
                            times: 47
                        },
                        request: body => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
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
                                if (stat.structure && stat.structure.parentKey === 'tmstats'
                                    && stat.keyArgs.replaceStrings['\\$tmctlArgs'].indexOf(tmctlTable) !== -1) {
                                    tmctlStat = stat;
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
                ]
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
                contextToCollect: [],
                expectedData: {
                    tmstats: {
                        asmCpuUtilStats: undefined,
                        cpuInfoStat: undefined,
                        diskInfoStat: undefined,
                        dnsCacheResolverStat: undefined,
                        dnsexpressZoneStat: undefined,
                        dosStat: undefined,
                        dosl7PluginStats: undefined,
                        dosl7dStat: undefined,
                        flowEvictionPolicyStat: undefined,
                        gtmDcStat: undefined,
                        gtmWideipStat: undefined,
                        hostInfoStat: undefined,
                        ifcStats: undefined,
                        interfaceStat: undefined,
                        ipIntelligenceStat: undefined,
                        ipStat: undefined,
                        iprepdStat: undefined,
                        kvmVcpuStat: undefined,
                        kvmVmStat: undefined,
                        mcpRequestStat: undefined,
                        mcpTransactionStat: undefined,
                        memoryUsageStat: undefined,
                        monitorInstanceStat: undefined,
                        monitorStat: undefined,
                        poolMemberStat: undefined,
                        poolStat: undefined,
                        procPidStat: undefined,
                        profileBigprotoStat: undefined,
                        profileClientsslStat: undefined,
                        profileConnpoolStat: undefined,
                        profileDnsStat: undefined,
                        profileFtpStat: undefined,
                        profileHttpStat: undefined,
                        profileHttpcompressionStat: undefined,
                        profileServersslStat: undefined,
                        profileTcpStat: undefined,
                        profileUdpStat: undefined,
                        profileWebaccelerationStat: undefined,
                        ruleStat: undefined,
                        tmmStat: undefined,
                        tmmdnsServerStat: undefined,
                        tmmdnsZoneStat: undefined,
                        vcmpGlobalStat: undefined,
                        vcmpStat: undefined,
                        virtualServerConnStat: undefined,
                        virtualServerCpuStat: undefined,
                        virtualServerStat: undefined
                    }
                },
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/util/bash',
                        method: 'post',
                        options: {
                            times: 47
                        },
                        request: body => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'tmctl: qwerty: No such table'
                        }
                    }
                ]
            }
        ]
    }
};
