/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
    name: 'GTM stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not have gtm properties when gtm module is not provisioned',
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
            expectedData: { },
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
                aWideIps: {},
                aaaaWideIps: {},
                cnameWideIps: {},
                mxWideIps: {},
                naptrWideIps: {},
                srvWideIps: {},
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
                aWideIps: {},
                aaaaWideIps: {},
                cnameWideIps: {},
                mxWideIps: {},
                naptrWideIps: {},
                srvWideIps: {},
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        fallbackIp: '192.168.0.1',
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
                        tenant: 'Common',
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
                        fallbackIp: '192.168.0.1',
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
                        tenant: 'Common',
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
                        name: '/Common/ts_cname_pool',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                                fallbackIp: '192.168.0.1',
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
                        tenant: 'Common',
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
                        fallbackIp: '192.168.0.1',
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
                        tenant: 'Common',
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
                        fallbackIp: '192.168.0.1',
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
                        tenant: 'Common',
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
                        name: '/Common/ts_cname_pool',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                        tenant: 'Common',
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
                                fallbackIp: '192.168.0.1',
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
};
