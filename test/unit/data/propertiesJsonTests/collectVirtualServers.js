/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
    name: 'Virtual Servers stats',
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
                    '/Common/app/test_vs_0': {
                        availabilityState: 'unknown',
                        'clientside.bitsIn': 0,
                        'clientside.bitsOut': 0,
                        'clientside.curConns': 0,
                        'clientside.maxConns': 0,
                        'clientside.pktsIn': 0,
                        'clientside.pktsOut': 0,
                        'clientside.totConns': 0,
                        destination: '10.11.0.2:80',
                        enabledState: 'enabled',
                        ipProtocol: 'tcp',
                        mask: '255.255.255.255',
                        name: '/Common/app/test_vs_0',
                        pool: '/Common/test_pool_0',
                        'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                        tenant: 'Common',
                        application: 'app',
                        totRequests: 0
                    },
                    '/Common/app/192.168.1.10%10': {
                        availabilityState: 'unknown',
                        'clientside.bitsIn': 0,
                        'clientside.bitsOut': 0,
                        'clientside.curConns': 0,
                        'clientside.maxConns': 0,
                        'clientside.pktsIn': 0,
                        'clientside.pktsOut': 0,
                        'clientside.totConns': 0,
                        destination: '192.168.1.10%10',
                        enabledState: 'enabled',
                        ipProtocol: 'tcp',
                        mask: '255.255.255.255',
                        name: '/Common/app/192.168.1.10%10',
                        pool: '/Common/test_pool_0',
                        'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                        tenant: 'Common',
                        application: 'app',
                        totRequests: 0
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
                                fullPath: '/Common/app/test_vs_0',
                                selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~app~test_vs_0?ver=14.1.0',
                                ipProtocol: 'tcp',
                                mask: '255.255.255.255',
                                pool: '/Common/test_pool_0',
                                poolReference: {
                                    link: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0'
                                }
                            },
                            {
                                name: 'test_vs_0',
                                fullPath: '/Common/app/192.168.1.10%10',
                                selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~app~192.168.1.10%2510?ver=14.1.0',
                                ipProtocol: 'tcp',
                                mask: '255.255.255.255',
                                pool: '/Common/test_pool_0',
                                poolReference: {
                                    link: 'https://localhost/mgmt/tm/ltm/pool/~Common~192.168.1.10%2510?ver=14.1.0'
                                }
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/ltm/virtual/~Common~app~test_vs_0/stats',
                    response: {
                        kind: 'tm:ltm:virtual:virtualstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~app~test_vs_0/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/virtual/~Common~app~test_vs_0/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:virtual:virtualstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~app~test_vs_0/stats?ver=14.1.0',
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
                },
                {
                    endpoint: '/mgmt/tm/ltm/virtual/~Common~app~192.168.1.10%2510/stats',
                    response: {
                        kind: 'tm:ltm:virtual:virtualstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~app~192.168.1.10%2510/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/virtual/~Common~app~192.168.1.10%2510/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:virtual:virtualstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~app~192.168.1.10%2510/stats?ver=14.1.0',
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
                                            description: '192.168.1.10%10'
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
                                            description: '/Common/192.168.1.10%10'
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
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect virtual servers stats and expand profilesReference',
            statsToCollect: ['virtualServers'],
            contextToCollect: [],
            expectedData: {
                virtualServers: {
                    '/Common/test_vs_0': {
                        tenant: 'Common',
                        'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                        availabilityState: 'unknown',
                        'clientside.bitsIn': 0,
                        'clientside.bitsOut': 0,
                        'clientside.curConns': 0,
                        'clientside.maxConns': 0,
                        'clientside.pktsIn': 0,
                        'clientside.pktsOut': 0,
                        'clientside.totConns': 0,
                        destination: '10.11.0.2:80',
                        enabledState: 'enabled',
                        ipProtocol: 'tcp',
                        mask: '255.255.255.255',
                        name: '/Common/test_vs_0',
                        pool: '/Common/test_pool_0',
                        profiles: {
                            '/Common/f5-tcp-lan': {
                                name: '/Common/f5-tcp-lan',
                                tenant: 'Common'
                            },
                            '/Common/http': {
                                name: '/Common/http',
                                tenant: 'Common'
                            },
                            '/Common/http-proxy-connect': {
                                name: '/Common/http-proxy-connect',
                                tenant: 'Common'
                            },
                            '/Common/tcp': {
                                name: '/Common/tcp',
                                tenant: 'Common'
                            }
                        },
                        totRequests: 0
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
                                },
                                profilesReference: {
                                    link: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0/profiles?ver=14.1.0',
                                    isSubcollection: true
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
                },
                {
                    endpoint: '/mgmt/tm/ltm/virtual/~Common~test_vs_0/profiles?$select=name,fullPath',
                    response: {
                        kind: 'tm:ltm:virtual:profiles:profilescollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs/profiles?$select=name%2CfullPath&ver=14.1.0',
                        items: [
                            {
                                name: 'f5-tcp-lan',
                                fullPath: '/Common/f5-tcp-lan'
                            },
                            {
                                name: 'http',
                                fullPath: '/Common/http'
                            },
                            {
                                name: 'http-proxy-connect',
                                fullPath: '/Common/http-proxy-connect'
                            },
                            {
                                name: 'tcp',
                                fullPath: '/Common/tcp'
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
            name: 'should expand profilesReference even if no profiles attached (with items property)',
            statsToCollect: ['virtualServers'],
            contextToCollect: [],
            expectedData: {
                virtualServers: {
                    '/Common/test_vs_0': {
                        tenant: 'Common',
                        availabilityState: 'unknown',
                        'clientside.bitsIn': 0,
                        'clientside.bitsOut': 0,
                        'clientside.curConns': 0,
                        'clientside.maxConns': 0,
                        'clientside.pktsIn': 0,
                        'clientside.pktsOut': 0,
                        'clientside.totConns': 0,
                        destination: '10.11.0.2:80',
                        enabledState: 'enabled',
                        ipProtocol: 'tcp',
                        mask: '255.255.255.255',
                        name: '/Common/test_vs_0',
                        pool: '/Common/test_pool_0',
                        profiles: {},
                        'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                        totRequests: 0
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
                                },
                                profilesReference: {
                                    link: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0/profiles?ver=14.1.0',
                                    isSubcollection: true
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
                },
                {
                    endpoint: '/mgmt/tm/ltm/virtual/~Common~test_vs_0/profiles?$select=name,fullPath',
                    response: {
                        kind: 'tm:ltm:virtual:profiles:profilescollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs/profiles?$select=name%2CfullPath&ver=14.1.0',
                        items: []
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should expand profilesReference even if no profiles attached (without items property)',
            statsToCollect: ['virtualServers'],
            contextToCollect: [],
            expectedData: {
                virtualServers: {
                    '/Common/test_vs_0': {
                        tenant: 'Common',
                        availabilityState: 'unknown',
                        'clientside.bitsIn': 0,
                        'clientside.bitsOut': 0,
                        'clientside.curConns': 0,
                        'clientside.maxConns': 0,
                        'clientside.pktsIn': 0,
                        'clientside.pktsOut': 0,
                        'clientside.totConns': 0,
                        destination: '10.11.0.2:80',
                        enabledState: 'enabled',
                        ipProtocol: 'tcp',
                        mask: '255.255.255.255',
                        name: '/Common/test_vs_0',
                        pool: '/Common/test_pool_0',
                        profiles: {},
                        'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                        totRequests: 0
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
                                },
                                profilesReference: {
                                    link: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs_0/profiles?ver=14.1.0',
                                    isSubcollection: true
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
                },
                {
                    endpoint: '/mgmt/tm/ltm/virtual/~Common~test_vs_0/profiles?$select=name,fullPath',
                    response: {
                        kind: 'tm:ltm:virtual:profiles:profilescollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~test_vs/profiles?$select=name%2CfullPath&ver=14.1.0'
                    }
                }
            ]
        }
    ]
};
