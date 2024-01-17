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
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1',
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
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual/stats?ver=13.1.1',
                            entries: {
                                'https://localhost/mgmt/tm/ltm/virtual/~Common~default/stats': {
                                    nestedStats: {
                                        kind: 'tm:ltm:virtual:virtualstats',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~default/stats?ver=13.1.1',
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
                                        selfLink: 'https://localhost/mgmt/tm/ltm/virtual/~Common~vs_with_pool/stats?ver=13.1.1',
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
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should not error if individual custom endpoint path is invalid',
                totalAttempts: 2,
                endpointList: {
                    test: {
                        name: 'test',
                        path: '/does/not/exist'
                    }
                },
                expectedData: {
                    test: {}
                },
                endpoints: [
                    {
                        endpoint: '/does/not/exist',
                        reponse: 'Not found',
                        skipCheckResponse: true,
                        options: {
                            persistScope: true
                        },
                        code: 404
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should return data for custom endpoints that it is able to',
                totalAttempts: 2,
                endpointList: {
                    virtualServers: {
                        name: 'virtualServers',
                        path: '/mgmt/tm/ltm/virtual'
                    },
                    test: {
                        name: 'test',
                        path: '/does/not/exist'
                    }
                },
                expectedData: {
                    virtualServers: {
                        items: [
                            {
                                kind: 'tm:ltm:virtual:virtualstate',
                                name: 'default'
                            }
                        ]
                    },
                    test: {}
                },
                endpoints: [
                    {
                        endpoint: '/mgmt/tm/ltm/virtual',
                        response: {
                            kind: 'tm:ltm:virtual:virtualcollectionstate',
                            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?ver=13.1.1',
                            items: [
                                {
                                    kind: 'tm:ltm:virtual:virtualstate',
                                    name: 'default'
                                }
                            ]
                        }
                    },
                    {
                        endpoint: '/does/not/exist',
                        reponse: 'Not found',
                        skipCheckResponse: true,
                        options: {
                            persistScope: true
                        },
                        code: 404
                    }
                ]
            }
        ]
    },
    collectSNMPCustom: {
        name: 'snmp data via bash endpoint',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set tmmPages to empty object (if empty response)',
                endpointList: {
                    tmmPages: {
                        path: 'sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry',
                        protocol: 'snmp'
                    }
                },
                expectedData: {
                    tmmPages: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: ''
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should set tmmPages to empty object (if no commandResult property)',
                endpointList: {
                    tmmPages: {
                        path: 'sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry',
                        protocol: 'snmp'
                    }
                },
                expectedData: {
                    tmmPages: {}
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry"',
                        response: {
                            kind: 'tm:util:bash:runstate'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect single snmp mib (single stat)',
                endpointList: {
                    totalMemory: {
                        path: 'sysGlobalStat.sysStatMemoryTotal',
                        protocol: 'snmp'
                    }
                },
                expectedData: {
                    totalMemory: {
                        'sysStatMemoryTotal.0': 3179282432
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysGlobalStat.sysStatMemoryTotal"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'sysStatMemoryTotal.0 = 3179282432\n'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect single snmp mib (multiple stats)',
                endpointList: {
                    tmmPages: {
                        path: 'sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry',
                        protocol: 'snmp'
                    }
                },
                expectedData: {
                    tmmPages: {
                        'sysTmmPagesStatSlot.0.0': 0,
                        'sysTmmPagesStatSlot.0.1': 0,
                        'sysTmmPagesStatTmm.0.0': 0,
                        'sysTmmPagesStatTmm.0.1': 1,
                        'sysTmmPagesStatPagesUsed.0.0': 45869,
                        'sysTmmPagesStatPagesUsed.0.1': 50462,
                        'sysTmmPagesStatPagesAvail.0.0': 387584,
                        'sysTmmPagesStatPagesAvail.0.1': 388608
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'sysTmmPagesStatSlot.0.0 = 0\nsysTmmPagesStatSlot.0.1 = 0\nsysTmmPagesStatTmm.0.0 = 0\nsysTmmPagesStatTmm.0.1 = 1\nsysTmmPagesStatPagesUsed.0.0 = 45869\nsysTmmPagesStatPagesUsed.0.1 = 50462\nsysTmmPagesStatPagesAvail.0.0 = 387584\nsysTmmPagesStatPagesAvail.0.1 = 388608\n'
                        }
                    }
                ]
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should collect multiple snmp mibs',
                endpointList: {
                    totalMemory: {
                        path: 'sysGlobalStat.sysStatMemoryTotal',
                        protocol: 'snmp'
                    },
                    usedMemory: {
                        path: 'sysGlobalStat.sysStatMemoryUsed',
                        protocol: 'snmp'
                    },
                    tmmPages: {
                        path: 'sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry',
                        protocol: 'snmp'
                    },
                    enumToNumeric: {
                        path: 'ifAdmin.isUp',
                        protocol: 'snmp',
                        numericalEnums: true
                    },
                    enumAsIs: {
                        path: 'ifAdmin.isUp',
                        protocol: 'snmp'
                    }
                },
                expectedData: {
                    tmmPages: {
                        'sysTmmPagesStatSlot.0.0': 0,
                        'sysTmmPagesStatSlot.0.1': 0,
                        'sysTmmPagesStatTmm.0.0': 0,
                        'sysTmmPagesStatTmm.0.1': 1,
                        'sysTmmPagesStatPagesUsed.0.0': 45869,
                        'sysTmmPagesStatPagesUsed.0.1': 50462,
                        'sysTmmPagesStatPagesAvail.0.0': 387584,
                        'sysTmmPagesStatPagesAvail.0.1': 388608
                    },
                    totalMemory: {
                        'sysStatMemoryTotal.0': 3179282432
                    },
                    usedMemory: {
                        'sysStatMemoryUsed.0': 290295264
                    },
                    enumToNumeric: {
                        'ifAdmin.isUp': 1
                    },
                    enumAsIs: {
                        'ifAdmin.isUp': 'true'
                    }
                },
                endpoints: [
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysGlobalStat.sysStatMemoryUsed"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'sysStatMemoryUsed.0 = 290295264\n'
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysGlobalStat.sysStatMemoryTotal"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'sysStatMemoryTotal.0 = 3179282432\n'
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost sysTmmPagesStat.sysTmmPagesStatTable.sysTmmPagesStatEntry"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'sysTmmPagesStatSlot.0.0 = 0\nsysTmmPagesStatSlot.0.1 = 0\nsysTmmPagesStatTmm.0.0 = 0\nsysTmmPagesStatTmm.0.1 = 1\nsysTmmPagesStatPagesUsed.0.0 = 45869\nsysTmmPagesStatPagesUsed.0.1 = 50462\nsysTmmPagesStatPagesAvail.0.0 = 387584\nsysTmmPagesStatPagesAvail.0.1 = 388608\n'
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O eQUs -c public localhost ifAdmin.isUp"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'ifAdmin.isUp = 1\n'
                        }
                    },
                    {
                        endpoint: /\/mgmt\/tm\/util\/bash/,
                        method: 'POST',
                        request: (body) => body.utilCmdArgs && body.utilCmdArgs === '-c "snmpwalk -L n -O QUs -c public localhost ifAdmin.isUp"',
                        response: {
                            kind: 'tm:util:bash:runstate',
                            commandResult: 'ifAdmin.isUp = true\n'
                        }
                    }
                ]
            }
        ]
    }
};
