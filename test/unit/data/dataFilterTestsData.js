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
    handleAction: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute action when no ifAllMatch',
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    foo: 'bar'
                }
            },
            dataCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute action when ifAllMatch is valid',
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    tag: 'tag'
                },
                ifAllMatch: {
                    foo: 'bar'
                }
            },
            dataCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            },
            expectedCtx: {
                data: {
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute action when ifAnyMatch is valid',
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    tag: 'tag'
                },
                ifAnyMatch: [
                    {
                        foo: 'bar'
                    },
                    {
                        foo: 'baz'
                    }
                ]
            },
            dataCtx: {
                data: {
                    foo: 'baz',
                    tag: 'tag'
                }
            },
            expectedCtx: {
                data: {
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not execute action when ifAllMatch is invalid',
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    tag: 'tag'
                },
                ifAllMatch: {
                    foo: 'foo'
                }
            },
            dataCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not execute action when ifAnyMatch is invalid',
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    tag: 'tag'
                },
                ifAnyMatch: [
                    {
                        foo: 'foo',
                        tag: 'untagged'
                    },
                    {
                        foo: 'foo',
                        tag: 'notag'
                    }
                ]
            },
            dataCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return only included keys (example 1)',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'hostname'
                    },
                    virtualServers: {
                        vs1: {
                            ip: 'x.x.x.x'
                        },
                        vs2: {
                            ip: 'z.z.z.z'
                        }
                    },
                    pool: {
                        pool1: {}
                    }
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    virtualServers: true
                }
            },
            expectedCtx: {
                data: {
                    virtualServers: {
                        vs1: {
                            ip: 'x.x.x.x'
                        },
                        vs2: {
                            ip: 'z.z.z.z'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return only included keys (example 2)',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'hostname',
                        version: 'version'
                    },
                    virtualServers: {
                        vs1: {
                            ip: 'x.x.x.x',
                            mask: 'g.g.g.g'
                        },
                        vs2: {
                            ip: 'z.z.z.z',
                            mask: 'h.h.h.h'
                        }
                    },
                    pool: {
                        pool1: {}
                    }
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    '.*': {
                        hostname: true,
                        '.*': {
                            ip: true
                        }
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'hostname'
                    },
                    virtualServers: {
                        vs1: {
                            ip: 'x.x.x.x'
                        },
                        vs2: {
                            ip: 'z.z.z.z'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should also be able to filter telemetry metadata',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'hostname'
                    },
                    pool: {
                        pool1: {}
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    telemetryServiceInfo: true,
                    telemetryEventCategory: true
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'hostname'
                    },
                    pool: {
                        pool1: {}
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not include metadata keys if not in includeData',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'hostname'
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    system: true
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'hostname'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should only include properties matching a regex',
            dataCtx: {
                data: {
                    system: {
                        diskStorage: {
                            '/usr': {
                                '1024-blocks': 5186648,
                                Capacity: '84%',
                                Capacity_Float: 0.84,
                                name: '/usr'
                            },
                            '/var': {
                                '1024-blocks': 5186648,
                                Capacity: '24%',
                                Capacity_Float: 0.24,
                                name: '/var'
                            },
                            '/log': {
                                '1024-blocks': 5186648,
                                Capacity: '32%',
                                Capacity_Float: 0.32,
                                name: '/log'
                            }
                        }
                    },
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        },
                        '/Common/Shared/remote_vs': {
                            name: '/Common/Shared/remote_vs'
                        },
                        '/Common/Shared/local_vs': {
                            name: '/Common/Shared/local_vs'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    system: {
                        diskStorage: {
                            '/usr': true
                        }
                    },
                    virtualServers: {
                        remote: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        diskStorage: {
                            '/usr': {
                                '1024-blocks': 5186648,
                                Capacity: '84%',
                                Capacity_Float: 0.84,
                                name: '/usr'
                            }
                        }
                    },
                    virtualServers: {
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        },
                        '/Common/Shared/remote_vs': {
                            name: '/Common/Shared/remote_vs'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to use regexes as keys',
            dataCtx: {
                data: {
                    system: {},
                    virtualServers: {},
                    pools: {
                        '/Common/Shared/telemetry_pool1': {
                            name: '/Common/Shared/telemetry_pool1',
                            enabledState: 'enabled'
                        },
                        '/Common/Shared/telemetry_pool2': {
                            name: '/Common/Shared/telemetry_pool2',
                            enabledState: 'enabled'
                        },
                        '/Common/Shared/node_pool': {
                            name: '/Common/Shared/node_pool',
                            enabledState: 'enabled'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    pools: {
                        '^/Common/Shared/telemetry_pool': {
                            enabledState: true
                        }
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {},
                    virtualServers: {},
                    pools: {
                        '/Common/Shared/telemetry_pool1': {
                            name: '/Common/Shared/telemetry_pool1'
                        },
                        '/Common/Shared/telemetry_pool2': {
                            name: '/Common/Shared/telemetry_pool2'
                        },
                        '/Common/Shared/node_pool': {
                            name: '/Common/Shared/node_pool',
                            enabledState: 'enabled'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude multiple properties matching a regex (example 1)',
            dataCtx: {
                data: {
                    system: {},
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        },
                        '/Common/Shared/remote_vs': {
                            name: '/Common/Shared/remote_vs'
                        },
                        '/Common/Shared/local_vs': {
                            name: '/Common/Shared/local_vs'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    virtualServers: {
                        vs$: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {},
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include multiple properties matching a regex (example 2)',
            dataCtx: {
                data: {
                    system: {},
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        },
                        '/Common/Shared/remote_vs': {
                            name: '/Common/Shared/remote_vs'
                        },
                        '/Common/Shared/local_vs': {
                            name: '/Common/Shared/local_vs'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    virtualServers: {
                        vs$: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    virtualServers: {
                        '/Common/Shared/remote_vs': {
                            name: '/Common/Shared/remote_vs'
                        },
                        '/Common/Shared/local_vs': {
                            name: '/Common/Shared/local_vs'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude whole properties',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: '14.1.0.6',
                        ltmConfigTime: '2019-11-01T18:07:14.000Z'
                    },
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: true
                }
            },
            expectedCtx: {
                data: {
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude properties matching a regex',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: '14.1.0.6',
                        ltmConfigTime: '2019-11-01T18:07:14.000Z',
                        diskStorage: {
                            '/usr': {
                                '1024-blocks': 5186648,
                                Capacity: '84%',
                                Capacity_Float: 0.84,
                                name: '/usr'
                            },
                            '/var': {
                                '1024-blocks': 5186648,
                                Capacity: '24%',
                                Capacity_Float: 0.24,
                                name: '/var'
                            },
                            '/log': {
                                '1024-blocks': 5186648,
                                Capacity: '32%',
                                Capacity_Float: 0.32,
                                name: '/log'
                            }
                        }
                    },
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        },
                        '/Common/Shared/telemetry_remote': {
                            name: '/Common/Shared/telemetry_remote'
                        },
                        '/Common/Shared/remote_vs': {
                            name: '/Common/Shared/remote_vs'
                        },
                        '/Common/Shared/local_vs': {
                            name: '/Common/Shared/local_vs'
                        }
                    },
                    pools: {
                        '/Common/Shared/telemetry_pool1': {
                            name: '/Common/Shared/telemetry_pool1',
                            enabledState: 'enabled'
                        },
                        '/Common/Shared/telemetry_pool2': {
                            name: '/Common/Shared/telemetry_pool2',
                            enabledState: 'enabled'
                        },
                        '/Common/Shared/node_pool': {
                            name: '/Common/Shared/node_pool',
                            enabledState: 'enabled'
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: {
                        diskStorage: {
                            '/usr': true,
                            '/var': {
                                '1024-blocks': true
                            }
                        }
                    },
                    virtualServers: true,
                    pools: true
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: '14.1.0.6',
                        ltmConfigTime: '2019-11-01T18:07:14.000Z',
                        diskStorage: {
                            '/var': {
                                Capacity: '24%',
                                Capacity_Float: 0.24,
                                name: '/var'
                            },
                            '/log': {
                                '1024-blocks': 5186648,
                                Capacity: '32%',
                                Capacity_Float: 0.32,
                                name: '/log'
                            }
                        }
                    },
                    telemetryServiceInfo: {
                        pollingInterval: 10,
                        cycleStart: '2019-11-01T22:35:30.080Z',
                        cycleEnd: '2019-11-01T22:35:30.541Z'
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude existing properties only (example 1)',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1'
                    }
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: {
                        version: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'bigip1'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude existing properties only (example 2)',
            dataCtx: {
                data: {
                    system: {}
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: {
                        version: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {}
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include nothing in attempt to include non-existing data (example 1)',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        }
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    system: true
                }
            },
            expectedCtx: {
                data: {}
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include nothing in attempt to include non-existing data (example 2)',
            dataCtx: {
                data: {
                    system: {
                        version: 'x.x.x'
                    },
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        }
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    '.*': {
                        hostname: true
                    }
                }
            },
            expectedCtx: {
                data: {}
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include nothing in attempt to include non-existing data (example 3)',
            dataCtx: {
                data: {
                    system: {
                        version: 'x.x.x',
                        build: 'z.z.z'
                    },
                    virtualServers: {
                        '/Common/Shared/telemetry_local': {
                            name: '/Common/Shared/telemetry_local'
                        }
                    },
                    telemetryEventCategory: 'systemInfo'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    system: {
                        hostname: true
                    }
                }
            },
            expectedCtx: {
                data: {}
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude properties from event',
            dataCtx: {
                data: {
                    hostname: 'telemetry.bigip.com',
                    errdefs_msgno: '01490102:5:',
                    partition_name: 'Common',
                    session_id: 'ec7fd55d',
                    Access_Profile: '/Common/access_app',
                    Partition: 'Common',
                    Session_Id: 'ec7fd55d',
                    Access_Policy_Result: 'Logon_Deny',
                    tenant: 'Common',
                    application: '',
                    telemetryEventCategory: 'APM'
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    session_id: true,
                    Access_Policy_Result: true
                }
            },
            expectedCtx: {
                data: {
                    hostname: 'telemetry.bigip.com',
                    errdefs_msgno: '01490102:5:',
                    partition_name: 'Common',
                    Access_Profile: '/Common/access_app',
                    Partition: 'Common',
                    Session_Id: 'ec7fd55d',
                    tenant: 'Common',
                    application: '',
                    telemetryEventCategory: 'APM'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include properties to event',
            dataCtx: {
                data: {
                    hostname: 'telemetry.bigip.com',
                    errdefs_msgno: '01490102:5:',
                    partition_name: 'Common',
                    session_id: 'ec7fd55d',
                    Access_Profile: '/Common/access_app',
                    Partition: 'Common',
                    Session_Id: 'ec7fd55d',
                    Access_Policy_Result: 'Logon_Deny',
                    tenant: 'Common',
                    application: '',
                    telemetryEventCategory: 'APM'
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    session_id: true,
                    Access_Policy_Result: true
                }
            },
            expectedCtx: {
                data: {
                    session_id: 'ec7fd55d',
                    Access_Policy_Result: 'Logon_Deny'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude \'version\' only',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: 'version',
                        versionBuild: 'versionBuild'
                    }
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: {
                        version: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        versionBuild: 'versionBuild'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude \'version\' and \'versionBuild\' only (example 1)',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: 'version',
                        versionBuild: 'versionBuild'
                    }
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: {
                        'version*': true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'bigip1'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should exclude \'version\' and \'versionBuild\' only (example 2)',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: 'version',
                        versionBuild: 'versionBuild'
                    }
                }
            },
            actionCtx: {
                enable: true,
                excludeData: {},
                locations: {
                    system: {
                        versio: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        hostname: 'bigip1'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include \'version\' and \'versionBuild\' only',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: 'version',
                        versionBuild: 'versionBuild'
                    }
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    system: {
                        version: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        version: 'version',
                        versionBuild: 'versionBuild'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should include \'version\' only when regex provided',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip1',
                        version: 'version',
                        versionBuild: 'versionBuild'
                    }
                }
            },
            actionCtx: {
                enable: true,
                includeData: {},
                locations: {
                    system: {
                        version$: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        version: 'version'
                    }
                }
            }
        }
    ]
};
