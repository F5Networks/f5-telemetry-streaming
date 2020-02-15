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
            shouldKeepOnly: ['system', 'hostname', 'virtualServers']
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
            shouldKeepOnly: ['system', 'hostname']
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
                    ifAnyMatch: {
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
                        virtualServers: true
                    }
                }
            ],
            shouldKeepOnly: ['system', 'hostname', 'virtualServers', 'pools', 'diskStorage']
        }
    ]
};
