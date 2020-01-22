/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-useless-escape */

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
    _filterStats: [
        /**
         * _filterStats options:
         * - shouldKeep       - not strict, just verifies that properties are presented
         * - shouldKeepOnly   - strict, verifies only that properties are presented.
         *                      [] (empty array) - means 'keep nothing'.
         * - shouldRemove     - not strict, just verifies that properties are removed
         * - shouldRemoveOnly - strict, verifies only that properties are removed.
         *                      [] (empty array) - means 'remove nothing'.
         */
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should filter all properties but included properties',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        pools: true,
                        virtualServers: true
                    }
                }
            ],
            shouldKeepOnly: ['pools', 'virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should filter all properties in system folder',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        system: true
                    }
                }
            ],
            shouldKeep: ['tmstats', 'pools', 'virtualServers'],
            shouldRemove: ['system', 'hostname', 'version', 'versionBuild']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should filter all properties but included nested properties',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        system: true
                    }
                }
            ],
            shouldKeep: ['system', 'hostname', 'version'],
            shouldRemove: ['tmstats', 'pools', 'virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should filter all nested properties but included nested properties',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        system: {
                            hostname: true
                        }
                    }
                }
            ],
            shouldKeepOnly: ['system', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude specified nested properties but keep all other',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        system: {
                            hostname: true
                        }
                    }
                }
            ],
            shouldRemoveOnly: ['hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should filter all excluded properties',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        iRules: true,
                        virtualServers: true
                    }
                }
            ],
            shouldRemoveOnly: ['iRules', 'virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should perform include and exclude actions sequentially',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        iRules: true,
                        virtualServers: true,
                        pools: true
                    }
                },
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        pools: true
                    }
                }
            ],
            shouldKeepOnly: ['virtualServers', 'iRules']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should ignore disabled actions',
            actions: [
                {
                    excludeData: {},
                    enable: false,
                    locations: {
                        iRules: true,
                        virtualServers: true,
                        pools: true
                    }
                },
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        pools: true
                    }
                }
            ],
            shouldRemoveOnly: ['pools']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude nested properties when parent folder include',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        system: {
                            hostname: true
                        }
                    }
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        system: true
                    }
                }
            ],
            shouldKeep: ['system', 'versionBuild'],
            shouldRemove: ['tmstats', 'hostname', 'virtualServers', 'iRules', 'pools', 'asmCpuUtilStats', 'serverSslProfiles']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work fine with regex (example 1)',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        '.*': {
                            hostname: true
                        }
                    }
                }
            ],
            shouldRemoveOnly: ['hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work fine with regex (example 2)',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        '.*': {
                            hostname: true
                        }
                    }
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        system: true
                    }
                }
            ],
            shouldKeep: ['system', 'versionBuild'],
            shouldRemove: ['tmstats', 'hostname', 'virtualServers', 'iRules', 'pools', 'asmCpuUtilStats', 'serverSslProfiles']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work fine with regex (example 3)',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        '.*': {
                            hostname: true
                        }
                    }
                }
            ],
            shouldKeep: ['system', 'tmstats', 'hostname', 'virtualServers', 'iRules', 'pools', 'serverSslProfiles'],
            shouldRemove: ['asmCpuUtilStats', 'version', 'versionBuild']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work fine with regex (example 4)',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        '.*': {
                            version: true
                        }
                    }
                }
            ],
            shouldKeep: ['system', 'tmstats', 'virtualServers', 'iRules', 'pools', 'version', 'versionBuild', 'serverSslProfiles'],
            shouldRemove: ['asmCpuUtilStats', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work fine with regex - include all vs. exclude all',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                }
            ],
            shouldKeepOnly: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not preserve ifAllMatch locations',
            actions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                },
                {
                    setTags: {},
                    enable: true,
                    ifAllMatch: {
                        system: {
                            hostname: 'hostname'
                        }
                    }
                }
            ],
            shouldKeepOnly: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve ifAllMatch locations (example 1)',
            actions: [
                {
                    setTags: {},
                    enable: true,
                    ifAllMatch: {
                        system: {
                            hostname: 'hostname'
                        }
                    }
                },
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                }
            ],
            shouldKeepOnly: ['system', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve ifAllMatch locations (example 2)',
            actions: [
                {
                    setTags: {},
                    enable: true,
                    ifAllMatch: {
                        system: {
                            hostname: 'hostname'
                        }
                    }
                },
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        system: {
                            hostname: true
                        }
                    }
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        virtualServers: true
                    }
                }
            ],
            shouldKeepOnly: ['system', 'hostname', 'virtualServers']
        }
    ],
    collectVirtualServers: [
        {
            endpoint: '/mgmt/tm/ltm/virtual?$select=name,fullPath,selfLink,appService,ipProtocol,mask,pool',
            response: {
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
            }
        },
        {
            endpoint: '/mgmt/tm/ltm/virtual/~Common~test/stats',
            response: {
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
            }
        }
    ],
    collectGtm: [
        {
            endpoint: '/mgmt/tm/gtm/wideip/a',
            response: {
                kind: 'tm:gtm:wideip:a:acollectionstate',
                selfLink: 'https://localhost/mgmt/tm/gtm/wideip/a?ver=13.1.1.4',
                items: [
                    {
                        kind: 'tm:gtm:wideip:a:astate',
                        name: 'www.aone.tstest.com',
                        partition: 'Common',
                        fullPath: '/Common/www.aone.tstest.com',
                        generation: 1498,
                        selfLink: 'https://localhost/mgmt/tm/gtm/wideip/a/~Common~www.aone.tstest.com?ver=13.1.1.4',
                        enabled: true,
                        failureRcode: 'noerror',
                        failureRcodeResponse: 'disabled',
                        failureRcodeTtl: 0,
                        lastResortPool: '',
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
                        ttlPersistence: 3600,
                        aliases: [
                            'www.aone.com'
                        ],
                        pools: [
                            {
                                name: 'ts_a_pool',
                                partition: 'Common',
                                order: 0,
                                ratio: 1,
                                nameReference: {
                                    link: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool?ver=13.1.1.4'
                                }
                            }
                        ]
                    }
                ]
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/wideip/a/~Common~www.aone.tstest.com/stats',
            response: {
                kind: 'tm:gtm:wideip:a:acollectionstats',
                selfLink: 'https://localhost/mgmt/tm/gtm/wideip/a/~Common~www.aone.tstest.com/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/wideip/a/~Common~www.aone.tstest.com:A/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:wideip:a:astats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/wideip/a/~Common~www.aone.tstest.com:A/stats?ver=13.1.1.4',
                            entries: {
                                alternate: { value: 0 },
                                cnameResolutions: { value: 0 },
                                dropped: { value: 0 },
                                fallback: { value: 0 },
                                persisted: { value: 0 },
                                preferred: { value: 2 },
                                rcode: { value: 0 },
                                requests: { value: 8 },
                                resolutions: { value: 2 },
                                returnFromDns: { value: 0 },
                                returnToDns: { value: 3 },
                                'status.availabilityState': { description: 'offline' },
                                'status.enabledState': { description: 'enabled' },
                                'status.statusReason': { description: 'No enabled pools available' },
                                wipName: { description: '/Common/www.aone.tstest.com' },
                                wipType: { description: 'A' }
                            }
                        }
                    }
                }
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/wideip/cname',
            response: {
                kind: 'tm:gtm:wideip:cname:cnamecollectionstate',
                selfLink: 'https://localhost/mgmt/tm/gtm/wideip/cname?ver=13.1.1.4',
                items: [
                    {
                        kind: 'tm:gtm:wideip:cname:cnamestate',
                        name: 'www.cnameone.tstest.com',
                        partition: 'Common',
                        fullPath: '/Common/www.cnameone.tstest.com',
                        generation: 1600,
                        selfLink: 'https://localhost/mgmt/tm/gtm/wideip/cname/~Common~www.cnameone.tstest.com?ver=13.1.1.4',
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
                ]
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/wideip/cname/~Common~www.cnameone.tstest.com/stats',
            response: {
                kind: 'tm:gtm:wideip:cname:cnamestats',
                generation: 1600,
                selfLink: 'https://localhost/mgmt/tm/gtm/wideip/cname/~Common~www.cnameone.tstest.com/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/wideip/cname/~Common~www.cnameone.tstest.com/~Common~www.cnameone.tstest.com:CNAME/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:wideip:cname:cnamestats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/wideip/cname/~Common~www.cnameone.tstest.com/~Common~www.cnameone.tstest.com:CNAME/stats?ver=13.1.1.4',
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
                                    description: '/Common/www.cnameone.tstest.com'
                                },
                                wipType: {
                                    description: 'CNAME'
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/a',
            response: {
                kind: 'tm:gtm:pool:a:acollectionstate',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/a?ver=13.1.1.4',
                items: [
                    {
                        kind: 'tm:gtm:pool:a:astate',
                        name: 'ts_a_pool',
                        partition: 'Common',
                        fullPath: '/Common/ts_a_pool',
                        generation: 1501,
                        selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool?ver=13.1.1.4',
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
                        membersReference: {
                            link: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members?ver=13.1.1.4',
                            isSubcollection: true
                        }
                    }
                ]
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/stats',
            response: {
                kind: 'tm:gtm:pool:a:astats',
                generation: 1495,
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/~Common~ts_a_pool:A/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:pool:a:astats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/~Common~ts_a_pool:A/stats?ver=13.1.1.4',
                            entries: {
                                alternate: {
                                    value: 10
                                },
                                dropped: {
                                    value: 10
                                },
                                fallback: {
                                    value: 10
                                },
                                tmName: {
                                    description: '/Common/ts_a_pool'
                                },
                                poolType: {
                                    description: 'A'
                                },
                                preferred: {
                                    value: 10
                                },
                                returnFromDns: {
                                    value: 10
                                },
                                returnToDns: {
                                    value: 10
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
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members',
            response: {
                kind: 'tm:gtm:pool:a:members:memberscollectionstate',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members?ver=13.1.1.4',
                items: [
                    {
                        kind: 'tm:gtm:pool:a:members:membersstate',
                        name: 'server1:vs1',
                        partition: 'Common',
                        fullPath: '/Common/server1:vs1',
                        generation: 2703,
                        selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/~Common~server1:vs1?ver=13.1.1.4',
                        enabled: true,
                        limitMaxBps: 100,
                        limitMaxBpsStatus: 'disabled',
                        limitMaxConnections: 100,
                        limitMaxConnectionsStatus: 'disabled',
                        limitMaxPps: 100,
                        limitMaxPpsStatus: 'disabled',
                        memberOrder: 100,
                        monitor: 'default',
                        ratio: 1
                    }
                ]
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/stats',
            response: {
                kind: 'tm:gtm:pool:a:members:memberscollectionstats',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/vs1:~Common~server1/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:pool:a:members:membersstats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/a/~Common~ts_a_pool/members/vs1:~Common~server1/stats?ver=13.1.1.4',
                            entries: {
                                alternate: {
                                    value: 20
                                },
                                fallback: {
                                    value: 20
                                },
                                poolName: {
                                    description: '/Common/ts_a_pool'
                                },
                                poolType: {
                                    description: 'A'
                                },
                                preferred: {
                                    value: 20
                                },
                                serverName: {
                                    description: '/Common/server1'
                                },
                                'status.availabilityState': {
                                    description: 'offline'
                                },
                                'status.enabledState': {
                                    description: 'enabled'
                                },
                                'status.statusReason': {
                                    description: ' Monitor /Common/gateway_icmp from 172.16.100.17 : no route'
                                },
                                vsName: {
                                    description: 'vs1'
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/mx',
            response: {
                kind: 'tm:gtm:pool:mx:mxcollectionstate',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx?ver=13.1.1.4',
                items: [
                    {
                        kind: 'tm:gtm:pool:mx:mxstate',
                        name: 'ts_mx_pool',
                        partition: 'Common',
                        fullPath: '/Common/ts_mx_pool',
                        generation: 237,
                        selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool?ver=13.1.1.4',
                        alternateMode: 'topology',
                        dynamicRatio: 'enabled',
                        enabled: true,
                        fallbackMode: 'return-to-dns',
                        loadBalancingMode: 'round-robin',
                        manualResume: 'enabled',
                        maxAnswersReturned: 12,
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
                            link: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members?ver=13.1.1.4',
                            isSubcollection: true
                        }
                    }
                ]
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/mx/stats',
            response: {
                kind: 'tm:gtm:pool:mx:mxcollectionstats',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool:MX/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:pool:mx:mxstats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool:MX/stats?ver=13.1.1.4',
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
                                    description: '/Common/ts_mx_pool'
                                },
                                poolType: {
                                    description: 'MX'
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
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/stats',
            response: {
                kind: 'tm:gtm:pool:mx:mxstats',
                generation: 237,
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/~Common~ts_mx_pool:MX/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:pool:mx:mxstats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/~Common~ts_mx_pool:MX/stats?ver=13.1.1.4',
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
                                    description: '/Common/ts_mx_pool'
                                },
                                poolType: {
                                    description: 'MX'
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
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members',
            response: {
                kind: 'tm:gtm:pool:mx:members:memberscollectionstate',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members?ver=13.1.1.4',
                items: [
                    {
                        kind: 'tm:gtm:pool:mx:members:membersstate',
                        name: 'www.aaaaone.tstest.com',
                        fullPath: 'www.aaaaone.tstest.com',
                        generation: 237,
                        selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/www.aaaaone.tstest.com?ver=13.1.1.4',
                        enabled: true,
                        memberOrder: 0,
                        priority: 100,
                        ratio: 1
                    },
                    {
                        kind: 'tm:gtm:pool:mx:members:membersstate',
                        name: 'www.aone.tstest.com',
                        fullPath: 'www.aone.tstest.com',
                        generation: 237,
                        selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/www.aone.tstest.com?ver=13.1.1.4',
                        enabled: true,
                        memberOrder: 1,
                        priority: 1,
                        ratio: 10
                    }
                ]
            }
        },
        {
            endpoint: '/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/stats',
            response: {
                kind: 'tm:gtm:pool:mx:members:memberscollectionstats',
                selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/stats?ver=13.1.1.4',
                entries: {
                    'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/%20:www.aaaaone.tstest.com/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:pool:mx:members:membersstats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/%20:www.aaaaone.tstest.com/stats?ver=13.1.1.4',
                            entries: {
                                alternate: {
                                    value: 0
                                },
                                fallback: {
                                    value: 0
                                },
                                poolName: {
                                    description: '/Common/ts_mx_pool'
                                },
                                poolType: {
                                    description: 'MX'
                                },
                                preferred: {
                                    value: 0
                                },
                                serverName: {
                                    description: 'www.aaaaone.tstest.com'
                                },
                                'status.availabilityState': {
                                    description: 'offline'
                                },
                                'status.enabledState': {
                                    description: 'enabled'
                                },
                                'status.statusReason': {
                                    description: 'No Wide IPs available: No enabled pools available'
                                },
                                vsName: {
                                    description: ' '
                                }
                            }
                        }
                    },
                    'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/%20:www.aone.tstest.com/stats': {
                        nestedStats: {
                            kind: 'tm:gtm:pool:mx:members:membersstats',
                            selfLink: 'https://localhost/mgmt/tm/gtm/pool/mx/~Common~ts_mx_pool/members/%20:www.aone.tstest.com/stats?ver=13.1.1.4',
                            entries: {
                                alternate: {
                                    value: 0
                                },
                                fallback: {
                                    value: 0
                                },
                                poolName: {
                                    description: '/Common/ts_mx_pool'
                                },
                                poolType: {
                                    description: 'MX'
                                },
                                preferred: {
                                    value: 0
                                },
                                serverName: {
                                    description: 'www.aone.tstest.com'
                                },
                                'status.availabilityState': {
                                    description: 'offline'
                                },
                                'status.enabledState': {
                                    description: 'enabled'
                                },
                                'status.statusReason': {
                                    description: 'No Wide IPs available: No enabled pools available'
                                },
                                vsName: {
                                    description: ' '
                                }
                            }
                        }
                    }
                }
            }
        }
    ]
};
