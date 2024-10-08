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
    filterStats: [
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
            shouldKeep: ['pools', 'virtualServers'],
            shouldRemove: ['hostname', 'version', 'versionBuild']
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
            shouldKeep: ['hostname', 'version'],
            shouldRemove: ['pools', 'virtualServers']
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
            shouldKeepOnly: ['hostname']
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
            shouldKeep: ['versionBuild'],
            shouldRemove: ['hostname', 'virtualServers', 'iRules', 'pools', 'asmCpuUtilStats', 'serverSslProfiles']
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
            shouldKeep: ['versionBuild'],
            shouldRemove: ['hostname', 'virtualServers', 'iRules', 'pools', 'asmCpuUtilStats', 'serverSslProfiles']
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
            shouldKeep: ['hostname', 'virtualServers', 'iRules', 'pools', 'serverSslProfiles'],
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
            shouldKeep: ['virtualServers', 'iRules', 'pools', 'version', 'versionBuild', 'serverSslProfiles'],
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
            shouldKeepOnly: ['hostname']
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
            shouldKeepOnly: ['hostname', 'virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve ifAnyMatch locations (example 1)',
            actions: [
                {
                    setTags: {},
                    enable: true,
                    ifAnyMatch: [{
                        system: {
                            hostname: 'hostname'
                        }
                    }]
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
            shouldKeepOnly: ['hostname', 'virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve ifAnyMatch locations (example 2)',
            actions: [
                {
                    includeData: {},
                    ifAnyMatch: [{
                        system: {
                            hostname: 'hostname'
                        }
                    }],
                    enable: true,
                    locations: {
                        system: {
                            hostname: true
                        }
                    }
                },
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        '.*': true
                    }
                }
            ],
            shouldKeepOnly: ['hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve ifAnyMatch locations (example 3)',
            actions: [
                {
                    setTags: {},
                    enable: true,
                    ifAnyMatch: [
                        {
                            system: {
                                hostname: 'hostname'
                            },
                            virtualServers: {
                                '.*': {
                                    enabledState: 'enabled'
                                }
                            },
                            pools: {
                                '.*': {
                                    availabilityState: 'offline'
                                }
                            }
                        }
                    ]
                },
                {
                    excludeData: {},
                    enable: true,
                    ifAnyMatch: [{
                        system: {
                            diskStorage: {
                                '/usr': {
                                    name: '/usr'
                                }
                            }
                        }
                    }],
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
            shouldKeepOnly: ['hostname', 'virtualServers', 'pools', 'diskStorage']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve with ifAllMatch and ifAnyMatch locations (example 1)',
            actions: [
                {
                    setTags: {},
                    enable: true,
                    ifAnyMatch: [
                        {
                            system: {
                                hostname: 'hostname'
                            },
                            virtualServers: {
                                '.*': {
                                    enabledState: 'enabled'
                                }
                            }
                        }
                    ]
                },
                {
                    excludeData: {},
                    enable: true,
                    ifAllMatch: {
                        system: {
                            diskStorage: {
                                '/usr': {
                                    name: '/usr'
                                }
                            }
                        }
                    },
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
                        pools: true
                    }
                }
            ],
            shouldKeepOnly: ['hostname', 'virtualServers', 'diskStorage', 'pools']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should preserve with ifAllMatch and ifAnyMatch locations (example 2)',
            actions: [
                {
                    includeData: {},
                    enable: true,
                    ifAllMatch: {
                        system: {
                            version: '12'
                        }
                    },
                    locations: {
                        system: {
                            hostname: true
                        }
                    }
                },
                {
                    setTags: {},
                    enable: true,
                    ifAnyMatch: [
                        {
                            virtualServers: {
                                '.*': {
                                    enabledState: 'enabled'
                                }
                            },
                            pools: {
                                '.*': {
                                    availabilityState: 'offline'
                                }
                            }
                        }
                    ]
                },
                {
                    includeData: {},
                    enable: true,
                    locations: {
                        virtualServers: true
                    }
                }
            ],
            shouldKeepOnly: ['version', 'pools', 'virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep all properties (no actions)',
            actions: [],
            shouldRemoveOnly: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep all properties (setTag action only)',
            actions: [
                {
                    setTags: {
                        tag: 'value'
                    },
                    enable: true
                }
            ],
            shouldRemoveOnly: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep all properties (custom endpoints)',
            customEndpoints: {
                endpoint1: {
                    name: 'endpoint1'
                },
                endpoint2: {
                    name: 'endpoint2'
                },
                endpoint3: {
                    name: 'endpoint3'
                }
            },
            actions: [],
            shouldKeepOnly: ['endpoint1', 'endpoint2', 'endpoint3']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should skip properties (custom endpoints)',
            customEndpoints: {
                endpoint1: {
                    name: 'endpoint1'
                },
                endpoint2: {
                    name: 'endpoint2'
                },
                endpoint3: {
                    name: 'endpoint3'
                }
            },
            actions: [
                {
                    setTags: {
                        tag: 'value'
                    },
                    locations: {
                        endpoint1: true
                    },
                    enable: true
                },
                {
                    excludeData: {},
                    locations: {
                        endpoint1: true,
                        endpoint2: true
                    },
                    enable: true
                }
            ],
            shouldRemoveOnly: ['endpoint1', 'endpoint2'],
            shouldKeepOnly: ['endpoint3']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should skip TMStats properties',
            skipTMStats: true,
            actions: [],
            shouldRemoveOnly: [
                'asmCpuUtilStats',
                'cpuInfoStat',
                'diskInfoStat',
                'dnsCacheResolverStat',
                'dnsexpressZoneStat',
                'dosStat',
                'dosl7PluginStats',
                'dosl7dStat',
                'flowEvictionPolicyStat',
                'gtmDcStat',
                'gtmWideipStat',
                'hostInfoStat',
                'ifcStats',
                'interfaceStat',
                'ipIntelligenceStat',
                'ipStat',
                'iprepdStat',
                'kvmVcpuStat',
                'kvmVmStat',
                'mcpRequestStat',
                'mcpTransactionStat',
                'memoryUsageStat',
                'monitorInstanceStat',
                'monitorStat',
                'poolMemberStat',
                'poolStat',
                'procPidStat',
                'profileBigprotoStat',
                'profileClientsslStat',
                'profileConnpoolStat',
                'profileDnsStat',
                'profileFtpStat',
                'profileHttpStat',
                'profileHttpcompressionStat',
                'profileServersslStat',
                'profileTcpStat',
                'profileUdpStat',
                'profileWebaccelerationStat',
                'ruleStat',
                'tmmStat',
                'tmmdnsServerStat',
                'tmmdnsZoneStat',
                'vcmpGlobalStat',
                'vcmpStat',
                'virtualServerConnStat',
                'virtualServerCpuStat',
                'virtualServerStat'
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep TMStats properties',
            skipTMStats: false,
            actions: [],
            shouldKeep: [
                'asmCpuUtilStats',
                'cpuInfoStat',
                'diskInfoStat',
                'dnsCacheResolverStat',
                'dnsexpressZoneStat',
                'dosStat',
                'dosl7PluginStats',
                'dosl7dStat',
                'flowEvictionPolicyStat',
                'gtmDcStat',
                'gtmWideipStat',
                'hostInfoStat',
                'ifcStats',
                'interfaceStat',
                'ipIntelligenceStat',
                'ipStat',
                'iprepdStat',
                'kvmVcpuStat',
                'kvmVmStat',
                'mcpRequestStat',
                'mcpTransactionStat',
                'memoryUsageStat',
                'monitorInstanceStat',
                'monitorStat',
                'poolMemberStat',
                'poolStat',
                'procPidStat',
                'profileBigprotoStat',
                'profileClientsslStat',
                'profileConnpoolStat',
                'profileDnsStat',
                'profileFtpStat',
                'profileHttpStat',
                'profileHttpcompressionStat',
                'profileServersslStat',
                'profileTcpStat',
                'profileUdpStat',
                'profileWebaccelerationStat',
                'ruleStat',
                'tmmStat',
                'tmmdnsServerStat',
                'tmmdnsZoneStat',
                'vcmpGlobalStat',
                'vcmpStat',
                'virtualServerConnStat',
                'virtualServerCpuStat',
                'virtualServerStat'
            ]
        }
    ]
};
