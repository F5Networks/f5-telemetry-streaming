/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

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
    checkConditions: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should determine data doesn\'t pass conditions (example 1)',
            dataCtx: {
                virtualServers: {
                    virtual1: {
                        'serverside.bitsIn': true
                    },
                    virtual2: {
                        'serverside.bitsIn': true
                    }
                },
                httpProfiles: {
                    httpProfile1: {
                        cookiePersistInserts: 1
                    }
                },
                system: {
                    hostname: 'bigip.example.com'
                }
            },
            conditionsCtx: {
                httpProfiles: {
                    '.*': {
                        cookiePersistInserts: 0
                    }
                },
                system: {
                    hostname: 'something'
                }
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should determine data doesn\'t pass conditions (example 2)',
            dataCtx: {
                virtualServers: {
                    virtual1: {
                        'serverside.bitsIn': true
                    },
                    virtual2: {
                        'serverside.bitsIn': true
                    }
                },
                httpProfiles: {
                    httpProfile1: {
                        cookiePersistInserts: 1
                    }
                },
                system: {
                    hostname: 'bigip.example.com'
                }
            },
            conditionsCtx: {
                clientSSL: {
                    '.*': {
                        cookiePersistInserts: 0
                    }
                }
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should determine that data passes conditions',
            dataCtx: {
                httpProfiles: {
                    http1: {
                        getReqs: 10
                    },
                    http2: {
                        getReqs: 10
                    }
                },
                system: {
                    hostname: 'bigip.example.com',
                    version: '14.0.0.4'
                }
            },
            conditionsCtx: {
                'ht*': {
                    '.*': {
                        getReqs: 10
                    }
                },
                system: {
                    version: '14*'
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should process arrays correctly (example 1)',
            dataCtx: {
                httpProfiles: [
                    {
                        http1: {
                            getReqs: 10
                        }
                    },
                    {
                        http2: {
                            getReqs: 10
                        }
                    }
                ],
                system: {
                    hostname: 'bigip.example.com',
                    version: '14.0.0.4'
                }
            },
            conditionsCtx: {
                'ht*': {
                    '.*': {
                        '.*': {
                            getReqs: 10
                        }
                    }
                },
                system: {
                    version: '14*'
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should process arrays correctly (example 2)',
            dataCtx: {
                httpProfiles: [
                    {
                        http1: {
                            getReqs: 20
                        }
                    },
                    {
                        http2: {
                            getReqs: 10
                        }
                    }
                ],
                system: {
                    hostname: 'bigip.example.com',
                    version: '14.0.0.4'
                }
            },
            conditionsCtx: {
                'ht*': {
                    0: {
                        '.*': {
                            getReqs: 20
                        }
                    },
                    1: {
                        http2: {
                            getReqs: 10
                        }
                    }
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with events (example 1)',
            dataCtx: {
                event_source: 'request_logging',
                event_timestamp: '2019-01-01:01:01.000Z',
                hostname: 'hostname',
                virtual_name: 'app_vs',
                telemetryEventCategory: 'defaultEvent'
            },
            conditionsCtx: {
                telemetryEventCategory: 'defaultEvent',
                tenant: 'app'
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with events (example 2)',
            dataCtx: {
                event_source: 'request_logging',
                event_timestamp: '2019-01-01:01:01.000Z',
                hostname: 'hostname',
                virtual_name: 'app_vs',
                telemetryEventCategory: 'defaultEvent'
            },
            conditionsCtx: {
                telemetryEventCategory: 'defaultEvent',
                virtual_name: 'app_vs'
            },
            expectedCtx: true
        }
    ],
    getMatches: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return what matches the property when it is a literal string',
            dataCtx: {
                system: {},
                httpProfiles: {},
                virtualServers: {}
            },
            propertyCtx: 'virtualServers',
            expectedCtx: ['virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return what matches the property when a regex is used (example 1)',
            dataCtx: {
                httpProfiles: {},
                virtualServers: {},
                httpProfiles2: {}
            },
            propertyCtx: 'http.*',
            expectedCtx: ['httpProfiles', 'httpProfiles2']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return what matches the property when a regex is used (example 2)',
            dataCtx: {
                '/dev': {},
                '/dev/shm': {},
                '/var': {},
                '/var/tmstat': {},
                '/var/prompt': {},
                '/var/log': {},
                '/var/iopic': {}
            },
            propertyCtx: '^/var',
            expectedCtx: [
                '/var',
                '/var/tmstat',
                '/var/prompt',
                '/var/log',
                '/var/iopic'
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return no matches',
            dataCtx: {
                virtualServers: {},
                httpProfiles: {}
            },
            propertyCtx: 'noReults',
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (integer) exists',
            dataCtx: ['vs1'],
            propertyCtx: 0,
            expectedCtx: [0]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (string) exists',
            dataCtx: ['vs1'],
            propertyCtx: '0',
            expectedCtx: ['0']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (integer) not exists',
            dataCtx: [],
            propertyCtx: 0,
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (string) not exists (example 1)',
            dataCtx: [],
            propertyCtx: '0',
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (string) not exists (example 2)',
            dataCtx: ['vs1'],
            propertyCtx: 'noResult',
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should check property param against regex patterers from the data keys (example 1)',
            dataCtx: {
                irtualServer: true,
                ttpProfile: true
            },
            propertyCtx: 'virtualServers',
            propertyRegexCtx: true,
            expectedCtx: ['irtualServer']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should check property param against regex patterns from the data keys (example 2)',
            dataCtx: {
                irtualServer: true,
                Server: true
            },
            propertyCtx: 'virtualServers',
            propertyRegexCtx: true,
            expectedCtx: ['irtualServer', 'Server']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should check property param against regex patterns from the data keys (example 3)',
            dataCtx: {
                irtualServer: true,
                server: true
            },
            propertyCtx: 'virtualServers',
            propertyRegexCtx: true,
            expectedCtx: ['irtualServer']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should check property param against regex patterns from the data keys (example 4)',
            dataCtx: {
                ttpProfile: true
            },
            propertyCtx: 'virtualServers',
            propertyRegexCtx: true,
            expectedCtx: []
        }
    ],
    getDeepMatches: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should match specified properties',
            dataCtx: {
                virtualServers: {
                    virtual1: {},
                    virtual2: {}
                },
                httpProfiles: {
                    httpProfile1: {},
                    httpProfile2: {}
                },
                tmstats: {
                    cpuInfoStat: [
                        {},
                        {}
                    ],
                    diskInfoStat: [
                        {},
                        {}
                    ]
                },
                system: {}
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': true
                },
                httpProfiles: {
                    Profile2: true
                },
                tmstats: {
                    cpuInfoStat: {
                        '.*': true
                    },
                    diskInfoStat: {
                        1: true
                    }
                }
            },
            expectedCtx: [
                {
                    data: {
                        virtual1: {},
                        virtual2: {}
                    },
                    key: 'virtual1'
                },
                {
                    data: {
                        virtual1: {},
                        virtual2: {}
                    },
                    key: 'virtual2'
                },
                {
                    data: {
                        httpProfile1: {},
                        httpProfile2: {}
                    },
                    key: 'httpProfile2'
                },
                {
                    data: [
                        {},
                        {}
                    ],
                    key: '0'
                },
                {
                    data: [
                        {},
                        {}
                    ],
                    key: '1'
                },
                {
                    data: [
                        {},
                        {}
                    ],
                    key: '1'
                }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not match bad properties',
            dataCtx: {
                system: {},
                virtualServers: {
                    virtual1: {}
                }
            },
            propertiesCtx: {
                virtualServers: {
                    virtual2: true
                }
            },
            expectedCtx: []
        }
    ],
    searchAnyMatches: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to access nested data by key',
            dataCtx: {
                system: {
                    nestedKey: 'nestedData',
                    nestedData: {
                        hostname: 'hostname'
                    }
                }
            },
            nestedKey: 'nestedKey',
            propertiesCtx: {
                system: {
                    hostname: {
                        nonexistingKey: 'value'
                    }
                }
            },
            expectedCtx: ['system', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should match specified properties (example 1)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: {
                    hostname: {
                        nonexistingKey: 'value'
                    }
                }
            },
            expectedCtx: ['system', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should match specified properties (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: 'something'
            },
            expectedCtx: ['system']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should match specified properties (example 3)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            expectedCtx: ['system', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should match specified properties (example 4)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: {
                    hostname: 'newHostname'
                }
            },
            expectedCtx: ['system', 'hostname']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should match specified properties (example 5)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: {
                    version: 'version'
                }
            },
            expectedCtx: ['system']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not match specified properties',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system1: {
                    hostname: 'newHostname'
                }
            },
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able work with arrays (example 1)',
            dataCtx: {
                virtualServers: [
                    {
                        vs1: {
                            ip: 'x.x.x.x'
                        }
                    },
                    {
                        vs2: {
                            ip: 'y.y.y.y'
                        }
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    0: {
                        '.*': {
                            ip: true
                        }
                    }
                }
            },
            expectedCtx: ['virtualServers', 0, 'vs1', 'ip']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able work with arrays (example 2)',
            dataCtx: {
                virtualServers: [
                    {
                        vs1: {
                            ip: 'x.x.x.x'
                        }
                    },
                    {
                        vs2: {
                            ip: 'y.y.y.y'
                        }
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    3: {
                        '.*': {
                            ip: true
                        }
                    }
                }
            },
            expectedCtx: ['virtualServers']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able work with arrays (example 3)',
            dataCtx: {
                virtualServers: [
                    {
                        vs1: {
                            ip: 'x.x.x.x'
                        }
                    },
                    {
                        vs2: {
                            ip: 'y.y.y.y'
                        }
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': {
                        '.*': {
                            ip: true
                        }
                    }
                }
            },
            expectedCtx: ['virtualServers', '0', 'vs1', 'ip', '1', 'vs2', 'ip']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able work with regex',
            dataCtx: {
                virtualServers: [
                    {
                        vs1: {
                            ip: 'x.x.x.x'
                        }
                    },
                    {
                        vs2: {
                            ip: 'y.y.y.y'
                        }
                    }
                ],
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                '.*': {
                    hostname: true
                }
            },
            expectedCtx: ['virtualServers', 'system', 'hostname']
        }
    ],
    removeStrictMatches: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to access nested data by key (example 1)',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname'
                    }
                }
            },
            nestedKey: 'nestedKey',
            propertiesCtx: {
                system: {
                    hostname: true
                }
            },
            expectedCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                    }
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to access nested data by key (example 2)',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname'
                    }
                }
            },
            nestedKey: 'nestedKey',
            propertiesCtx: {
                system: true
            },
            expectedCtx: {},
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 1)',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname',
                        version: 'version'
                    }
                }
            },
            nestedKey: 'nestedKey',
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                system: true
            },
            expectedCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        version: 'version'
                    }
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname',
                    version: 'version'
                }
            },
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                system: true
            },
            expectedCtx: {
                system: {
                    version: 'version'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove nested key only',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: {
                    hostname: true
                }
            },
            expectedCtx: {
                system: {}
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove parent object despite on nested data',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                system: {}
            },
            expectedCtx: {},
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with regex (example 1)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            propertiesCtx: {
                '.*': {}
            },
            expectedCtx: {},
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with regex (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                '.*': {
                    hostname: 'hostname'
                }
            },
            expectedCtx: {
                system: {},
                otherData: {},
                virtualServers: {
                    vs1: {}
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove nothing if no matches',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                pools: {}
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            expectedRetVal: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array',
            dataCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x',
                        mask: 'g.g.g.g'
                    },
                    {
                        ip: 'z.z.z.z',
                        mask: 'h.h.h.h'
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': {
                        ip: true
                    }
                }
            },
            expectedCtx: {
                virtualServers: [
                    {
                        mask: 'g.g.g.g'
                    },
                    {
                        mask: 'h.h.h.h'
                    }
                ]
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array - preserve access by index to elements',
            dataCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x'
                    },
                    {
                        ip: 'z.z.z.z'
                    },
                    {
                        ip: 'y.y.y.y'
                    },
                    {
                        ip: 'c.c.c.c'
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    0: true,
                    2: true
                }
            },
            expectedCtx: () => {
                const data = {
                    virtualServers: [
                        undefined,
                        {
                            ip: 'z.z.z.z'
                        },
                        undefined,
                        {
                            ip: 'c.c.c.c'
                        }
                    ]
                };
                delete data.virtualServers[0];
                delete data.virtualServers[2];
                return data;
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work without callback',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            useCallback: false,
            propertiesCtx: {
                '.*': {
                    hostname: 'hostname'
                }
            },
            expectedCtx: {
                system: {},
                otherData: {},
                virtualServers: {
                    vs1: {}
                }
            },
            expectedRetVal: true
        }
    ],
    preserveStrictMatches_strict_false: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to access nested data by key',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname'
                    }
                }
            },
            nestedKey: 'nestedKey',
            propertiesCtx: {
                system: {
                    hostname: true
                }
            },
            expectedCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname'
                    }
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                system: true
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with regex (example 1)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {
                        ip: 'ip1',
                        mask: 'mask'
                    },
                    vs2: {
                        ip: 'ip2',
                        mask: 'mask'
                    }
                }
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': {
                        ip: true
                    }
                }
            },
            expectedCtx: {
                virtualServers: {
                    vs1: {
                        ip: 'ip1'
                    },
                    vs2: {
                        ip: 'ip2'
                    }
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with regex (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {},
                    vs2: {}
                }
            },
            propertiesCtx: {
                '.*': {}
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {},
                    vs2: {}
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 1)',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname',
                        version: 'version'
                    }
                },
                virtualServers: {}
            },
            nestedKey: 'nestedKey',
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                virtualServers: true
            },
            expectedCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        version: 'version'
                    }
                },
                virtualServers: {}
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname',
                    version: 'version'
                }
            },
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                system: {
                    hostname: true
                }
            },
            expectedCtx: {
                system: {
                    version: 'version',
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 3)',
            dataCtx: {
                system: {
                    hostname: 'hostname',
                    version: 'version'
                }
            },
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                system: {
                    hostname: {
                        something: 'hostname'
                    }
                }
            },
            expectedCtx: {
                system: {
                    version: 'version',
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove parent object despite on nested data',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {},
                    vs2: {}
                }
            },
            propertiesCtx: {
                system: {}
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove everything if no matches',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                pools: {}
            },
            expectedCtx: {},
            expectedRetVal: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep only matched keys',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                system: {
                    version: true
                }
            },
            expectedCtx: {
                system: {}
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array',
            dataCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x',
                        mask: 'g.g.g.g'
                    },
                    {
                        ip: 'z.z.z.z',
                        mask: 'h.h.h.h'
                    },
                    {
                        mask: 'mask'
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': {
                        ip: true
                    }
                }
            },
            expectedCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x'
                    },
                    {
                        ip: 'z.z.z.z'
                    },
                    {}
                ]
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array - preserve access by index to elements',
            dataCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x'
                    },
                    {
                        ip: 'z.z.z.z'
                    },
                    {
                        ip: 'y.y.y.y'
                    },
                    {
                        ip: 'c.c.c.c'
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    0: true,
                    2: true
                }
            },
            expectedCtx: () => {
                const data = {
                    virtualServers: [
                        {
                            ip: 'x.x.x.x'
                        },
                        undefined,
                        {
                            ip: 'y.y.y.y'
                        },
                        undefined
                    ]
                };
                delete data.virtualServers[1];
                delete data.virtualServers[3];
                return data;
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work without callback',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            useCallback: false,
            propertiesCtx: {
                '.*': {
                    hostname: 'hostname'
                }
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {}
            },
            expectedRetVal: true
        }
    ],
    preserveStrictMatches_strict_true: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to access nested data by key',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname'
                    }
                }
            },
            nestedKey: 'nestedKey',
            propertiesCtx: {
                system: {
                    hostname: true
                }
            },
            expectedCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname'
                    }
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                system: true
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with regex (example 1)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {
                        ip: 'ip1',
                        mask: 'mask'
                    },
                    vs2: {
                        ip: 'ip2',
                        mask: 'mask'
                    }
                }
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': {
                        ip: true
                    }
                }
            },
            expectedCtx: {
                virtualServers: {
                    vs1: {
                        ip: 'ip1'
                    },
                    vs2: {
                        ip: 'ip2'
                    }
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with regex (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {},
                    vs2: {}
                }
            },
            propertiesCtx: {
                '.*': {}
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {},
                    vs2: {}
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 1)',
            dataCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        hostname: 'hostname',
                        version: 'version'
                    }
                },
                virtualServers: {}
            },
            nestedKey: 'nestedKey',
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                virtualServers: true
            },
            expectedCtx: {
                system: {
                    nestedKey: 'nested',
                    nested: {
                        version: 'version'
                    }
                },
                virtualServers: {}
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep nested data if not empty (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname',
                    version: 'version'
                }
            },
            propertiesToKeep: {
                version: true
            },
            propertiesCtx: {
                system: {
                    hostname: true
                }
            },
            expectedCtx: {
                system: {
                    version: 'version',
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove parent object despite on nested data',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                virtualServers: {
                    vs1: {},
                    vs2: {}
                }
            },
            propertiesCtx: {
                system: {}
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                }
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove everything if no matches (example 1)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                pools: {}
            },
            expectedCtx: {},
            expectedRetVal: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should remove everything if no matches (example 2)',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                system: {
                    hostname: {
                        something: 'hostname'
                    }
                }
            },
            expectedCtx: {},
            expectedRetVal: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should keep only matched keys',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            propertiesCtx: {
                system: {
                    version: true
                }
            },
            expectedCtx: {},
            expectedRetVal: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array',
            dataCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x',
                        mask: 'g.g.g.g'
                    },
                    {
                        ip: 'z.z.z.z',
                        mask: 'h.h.h.h'
                    },
                    {
                        mask: 'mask'
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    '.*': {
                        ip: true
                    }
                }
            },
            expectedCtx: () => {
                const data = {
                    virtualServers: [
                        {
                            ip: 'x.x.x.x'
                        },
                        {
                            ip: 'z.z.z.z'
                        },
                        undefined
                    ]
                };
                delete data.virtualServers[2];
                return data;
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array - preserve access by index to elements',
            dataCtx: {
                virtualServers: [
                    {
                        ip: 'x.x.x.x'
                    },
                    {
                        ip: 'z.z.z.z'
                    },
                    {
                        ip: 'y.y.y.y'
                    },
                    {
                        ip: 'c.c.c.c'
                    }
                ]
            },
            propertiesCtx: {
                virtualServers: {
                    0: true,
                    2: true
                }
            },
            expectedCtx: () => {
                const data = {
                    virtualServers: [
                        {
                            ip: 'x.x.x.x'
                        },
                        undefined,
                        {
                            ip: 'y.y.y.y'
                        },
                        undefined
                    ]
                };
                delete data.virtualServers[1];
                delete data.virtualServers[3];
                return data;
            },
            expectedRetVal: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work without callback',
            dataCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                },
                virtualServers: {
                    vs1: {}
                }
            },
            useCallback: false,
            propertiesCtx: {
                '.*': {
                    hostname: 'hostname'
                }
            },
            expectedCtx: {
                system: {
                    hostname: 'hostname'
                },
                otherData: {
                    hostname: 'hostname2'
                }
            },
            expectedRetVal: true
        }
    ]
};
