/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';


module.exports = {
    collectVirtualServersCustom: {
        name: 'virtual servers and stats',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set virtualServers to  { items: [] } if not configured (with items property as empty array)',
                endpointList: {
                    virtualServers: {
                        name: 'virtualServers',
                        path: '/mgmt/tm/ltm/virtual'
                    }
                },
                expectedData: {
                    virtualServers: {
                        items: []
                    }
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
                name: 'should set virtualServers to { items: [] } if not configured (without items property)',
                endpointList: {
                    virtualServers: {
                        name: 'virtualServers',
                        path: '/mgmt/tm/ltm/virtual'
                    }
                },
                expectedData: {
                    virtualServers: {
                        items: []
                    }
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
                name: 'should collect virtual servers and stats',
                endpointList: {
                    virtualServers: {
                        name: 'virtualServers',
                        path: '/mgmt/tm/ltm/virtual?$select=name,kind,partition,fullPath,destination'
                    },
                    virtualServersStats: {
                        name: 'virtualServersStats',
                        path: '/mgmt/tm/ltm/virtual/stats'
                    }
                },
                expectedData: {
                    virtualServers: {
                        items: [
                            {
                                kind: 'tm:ltm:virtual:virtualstate',
                                name: 'default',
                                partition: 'Common',
                                fullPath: '/Common/default',
                                destination: '/Common/172.16.100.17:53'
                            },
                            {
                                kind: 'tm:ltm:virtual:virtualstate',
                                name: 'vs_with_pool',
                                partition: 'Common',
                                fullPath: '/Common/vs_with_pool',
                                destination: '/Common/10.12.12.49:8443'
                            }
                        ]
                    },
                    virtualServersStats: {
                        '/Common/default/stats': {
                            'clientside.bitsIn': 0,
                            'clientside.bitsOut': 0,
                            'clientside.curConns': 0,
                            'clientside.evictedConns': 0,
                            'clientside.maxConns': 0,
                            'clientside.pktsIn': 0,
                            'clientside.pktsOut': 0,
                            'clientside.slowKilled': 0,
                            'clientside.totConns': 0,
                            cmpEnableMode: 'all-cpus',
                            cmpEnabled: 'enabled',
                            csMaxConnDur: 0,
                            csMeanConnDur: 0,
                            csMinConnDur: 0,
                            destination: '172.16.100.17:53',
                            'ephemeral.bitsIn': 0,
                            'ephemeral.bitsOut': 0,
                            'ephemeral.curConns': 0,
                            'ephemeral.evictedConns': 0,
                            'ephemeral.maxConns': 0,
                            'ephemeral.pktsIn': 0,
                            'ephemeral.pktsOut': 0,
                            'ephemeral.slowKilled': 0,
                            'ephemeral.totConns': 0,
                            fiveMinAvgUsageRatio: 0,
                            fiveSecAvgUsageRatio: 0,
                            tmName: '/Common/default',
                            oneMinAvgUsageRatio: 0,
                            'status.availabilityState': 'unknown',
                            'status.enabledState': 'enabled',
                            'status.statusReason': "The children pool member(s) either don't have service checking enabled, or service check results are not available yet",
                            syncookieStatus: 'not-activated',
                            'syncookie.accepts': 0,
                            'syncookie.hwAccepts': 0,
                            'syncookie.hwSyncookies': 0,
                            'syncookie.hwsyncookieInstance': 0,
                            'syncookie.rejects': 0,
                            'syncookie.swsyncookieInstance': 0,
                            'syncookie.syncacheCurr': 0,
                            'syncookie.syncacheOver': 0,
                            'syncookie.syncookies': 0,
                            totRequests: 0
                        },
                        '/Common/vs_with_pool/stats': {
                            'clientside.bitsIn': 0,
                            'clientside.bitsOut': 0,
                            'clientside.curConns': 0,
                            'clientside.evictedConns': 0,
                            'clientside.maxConns': 0,
                            'clientside.pktsIn': 0,
                            'clientside.pktsOut': 0,
                            'clientside.slowKilled': 0,
                            'clientside.totConns': 0,
                            cmpEnableMode: 'all-cpus',
                            cmpEnabled: 'enabled',
                            csMaxConnDur: 0,
                            csMeanConnDur: 0,
                            csMinConnDur: 0,
                            destination: '10.12.12.49:8443',
                            'ephemeral.bitsIn': 0,
                            'ephemeral.bitsOut': 0,
                            'ephemeral.curConns': 0,
                            'ephemeral.evictedConns': 0,
                            'ephemeral.maxConns': 0,
                            'ephemeral.pktsIn': 0,
                            'ephemeral.pktsOut': 0,
                            'ephemeral.slowKilled': 0,
                            'ephemeral.totConns': 0,
                            fiveMinAvgUsageRatio: 0,
                            fiveSecAvgUsageRatio: 0,
                            tmName: '/Common/vs_with_pool',
                            oneMinAvgUsageRatio: 0,
                            'status.availabilityState': 'offline',
                            'status.enabledState': 'enabled',
                            'status.statusReason': 'The children pool member(s) are down',
                            syncookieStatus: 'not-activated',
                            'syncookie.accepts': 0,
                            'syncookie.hwAccepts': 0,
                            'syncookie.hwSyncookies': 0,
                            'syncookie.hwsyncookieInstance': 0,
                            'syncookie.rejects': 0,
                            'syncookie.swsyncookieInstance': 0,
                            'syncookie.syncacheCurr': 0,
                            'syncookie.syncacheOver': 0,
                            'syncookie.syncookies': 0,
                            totRequests: 0
                        }
                    }
                },
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/ltm/virtual?$select=name,kind,partition,fullPath,destination',
                        response: {
                            kind: 'tm:ltm:virtual:virtualcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1.4',
                            items: [
                                {
                                    kind: 'tm:ltm:virtual:virtualstate',
                                    name: 'default',
                                    partition: 'Common',
                                    fullPath: '/Common/default',
                                    destination: '/Common/172.16.100.17:53'
                                },
                                {
                                    kind: 'tm:ltm:virtual:virtualstate',
                                    name: 'vs_with_pool',
                                    partition: 'Common',
                                    fullPath: '/Common/vs_with_pool',
                                    destination: '/Common/10.12.12.49:8443'
                                }
                            ]
                        }
                    },
                    {
                        endpoint: '/mgmt/tm/ltm/virtual/stats',
                        response: {
                            kind: 'tm:ltm:virtual:virtualcollectionstats',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual/stats?ver=13.1.1.4',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/virtual/~Common~default/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:virtual:virtualstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~default/stats?ver=13.1.1.4',
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
                                                description: '172.16.100.17:53'
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
                                                description: '/Common/default'
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
                                                description: "The children pool member(s) either don't have service checking enabled, or service check results are not available yet"
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
                                },
                                'https://localhost/mgmt/tm/ltm/virtual/~Common~vs_with_pool/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:virtual:virtualstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~vs_with_pool/stats?ver=13.1.1.4',
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
                                                description: '10.12.12.49:8443'
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
                                                description: '/Common/vs_with_pool'
                                            },
                                            oneMinAvgUsageRatio: {
                                                value: 0
                                            },
                                            'status.availabilityState': {
                                                description: 'offline'
                                            },
                                            'status.enabledState': {
                                                description: 'enabled'
                                            },
                                            'status.statusReason': {
                                                description: 'The children pool member(s) are down'
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
    }
};
