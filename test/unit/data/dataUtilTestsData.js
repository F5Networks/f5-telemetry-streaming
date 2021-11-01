/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
    applyJMESPathExpression: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute JMESPath expression (nest incoming message)',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            expression: '{ message: @ }',
            expectedCtx: {
                data: {
                    message: {
                        virtualServers: {
                            '/test/gjd_ftp': {
                                'serverside.bitsIn': true,
                                enabledState: 'enabled'
                            },
                            virtual2: {
                                'serverside.bitsIn': true
                            }
                        },
                        system: {
                            hostname: 'bigip.example.com'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute JMESPath expression (add dynamic tag)',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            expression: 'merge(@, {"host": system.hostname})',
            expectedCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    },
                    host: 'bigip.example.com'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute JMESPath expression (add static tag)',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            expression: 'merge(@, {"datacenter": \'denver\'})',
            expectedCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    },
                    datacenter: 'denver'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return original data if bad expression',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            expression: true,
            expectedCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set data to empty object when non-existing identifier was used',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            expression: 'badIdentifier',
            expectedCtx: {
                data: {}
            }
        }
    ],
    checkConditions: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should only execute ifAllMatch, if ifAllMatch and ifAnyMatch happen to be in same action',
            dataCtx: {
                data: {
                    block1: {
                        b1_i1: {
                            value1: 'doesmatch'
                        }
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    block1: {
                        '.*': {
                            value1: 'doesmatch'
                        }
                    }
                }],
                ifAllMatch: {
                    block1: {
                        value1: 'notpresent'
                    }
                }
            },
            expectedCtx: false
        }
    ],
    checkConditions_ifAnyMatch: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when any ifAnyMatch item matches data',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [
                    {
                        virtualServers: {
                            '/test/gjd_ftp': {
                                enabledState: 'enabled'
                            }
                        }
                    },
                    {
                        virtualServers: {
                            '/test/gjd_ftp': {
                                enabledState: 'disabled'
                            }
                        }
                    }
                ]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when second ifAnyMatch item matches data',
            dataCtx: {
                data: {
                    virtualServers: {
                        virtual1: {
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            enabledState: 'enabled'
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [
                    {
                        virtualServers: {
                            '.*': {
                                enabledState: 'disabled'
                            }
                        }
                    },
                    {
                        virtualServers: {
                            '.*': {
                                enabledState: 'enabled'
                            }
                        }
                    }
                ]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when there are multiple matches',
            dataCtx: {
                data: {
                    virtualServers: {
                        one: {
                            enabledState: 'enabled',
                            otherKey: 'val1'
                        },
                        two: {
                            enabledState: 'disabled',
                            otherKey: 'val1'
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [
                    {
                        virtualServers: {
                            one: {
                                enabledState: 'enabled',
                                otherKey: 'val1'
                            }
                        }
                    },
                    {
                        virtualServers: {
                            two: {
                                enabledState: 'disabled',
                                otherKey: 'val1'
                            }
                        }
                    }
                ]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when ifAnyMatch is empty array',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: []
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when ifAnyMatch contains empty object',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{}]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when matching against array values',
            dataCtx: {
                data: {
                    aWideIps: {
                        '/Common/www.aone.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.aone.com', 'www.cone.com']
                        },
                        '/Common/www.atwo.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.atwo.com', 'www.ctwo.com']
                        }
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [
                    {
                        aWideIps: {
                            '/Common/www.aone.tstest.com': {
                                aliases: ['www.aone.com', 'www.cone.com']
                            }
                        }
                    }
                ]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when matching against unsorted array values',
            dataCtx: {
                data: {
                    aWideIps: {
                        '/Common/www.aone.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.aone.com', 'www.cone.com']
                        },
                        '/Common/www.atwo.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.atwo.com', 'www.ctwo.com']
                        }
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [
                    {
                        aWideIps: {
                            '/Common/www.aone.tstest.com': {
                                aliases: ['www.cone.com', 'www.aone.com']
                            }
                        }
                    }
                ]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when matching against array regexes',
            dataCtx: {
                data: {
                    aWideIps: {
                        '/Common/www.aone.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.aone.com', 'www.cone.com']
                        },
                        '/Common/www.atwo.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.atwo.com', 'www.ctwo.com']
                        }
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [
                    {
                        aWideIps: {
                            '/Common/www.atwo.tstest.com': {
                                aliases: ['atwo.com$', 'ctwo.com$']
                            }
                        }
                    }
                ]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when any constant value matches data value',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: {
                        '/test/gjd_ftp': {
                            enabledState: 'enabled'
                        }
                    }
                }]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass with multiple keys in ifAnyMatch',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: {
                        '/test/gjd_ftp': {
                            enabledState: 'enabled'
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not pass if any sub-item in ifAnyMatch does not match',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: {
                        '/test/gjd_ftp': {
                            enabledState: 'disabled'
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t pass when no match is made',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: {
                        '/test/gjd_ftp': {
                            enabledState: 'disabled'
                        }
                    },
                    system: {
                        hostname: 'bigip1.example.com'
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t pass when no data is present',
            dataCtx: {
                data: {}
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: {
                        '/test/gjd_ftp': {
                            enabledState: 'disabled'
                        }
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t pass when array values do not match',
            dataCtx: {
                data: {
                    aWideIps: {
                        '/Common/www.aone.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.aone.com', 'www.cone.com']
                        },
                        '/Common/www.atwo.tstest.com': {
                            wipType: 'A',
                            aliases: ['www.atwo.com', 'www.ctwo.com']
                        }
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    aWideIps: {
                        '.*': {
                            aliases: 'www.none.com'
                        }
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass when a single regex matches',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    system: {
                        hostname: '^bigip.exa'
                    }
                }]
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t pass when the regex does not match',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    system: {
                        hostname: '^example'
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t pass when value does not match',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip.example.com',
                        version: '14.1.0'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    system: {
                        version: 'shouldnotmatch'
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t reject on bad regex',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip.example.com',
                        version: '14.1.0'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    system: {
                        version: '*'
                    }
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t pass when literal \'object\' only matches Javascript object',
            dataCtx: {
                data: {
                    virtualServers: {
                        '/test/gjd_ftp': {
                            'serverside.bitsIn': true,
                            enabledState: 'enabled'
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: 'object'
                }]
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should pass if \'object\' is used as matching value',
            dataCtx: {
                data: {
                    virtualServers: {
                        objectName: {
                            'serverside.bitsIn': true
                        },
                        virtual2: {
                            'serverside.bitsIn': true
                        }
                    },
                    system: {
                        hostname: 'bigip.example.com'
                    }
                }
            },
            actionsCtx: {
                ifAnyMatch: [{
                    virtualServers: {
                        'object.*': {
                            'serverside.bitsIn': true
                        }
                    }
                }]
            },
            expectedCtx: true
        }
    ],
    checkConditions_ifAllMatch: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should determine data doesn\'t pass conditions (example 1)',
            dataCtx: {
                data: {
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
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    httpProfiles: {
                        '.*': {
                            cookiePersistInserts: 0
                        }
                    },
                    system: {
                        hostname: 'something'
                    }
                }
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should determine data doesn\'t pass conditions (example 2)',
            dataCtx: {
                data: {
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
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    clientSSL: {
                        '.*': {
                            cookiePersistInserts: 0
                        }
                    }
                }
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should determine that data passes conditions',
            dataCtx: {
                data: {
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
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    'ht*': {
                        '.*': {
                            getReqs: 10
                        }
                    },
                    system: {
                        version: '14*'
                    }
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should process arrays correctly (example 1)',
            dataCtx: {
                data: {
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
                }
            },
            actionsCtx: {
                ifAllMatch: {
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
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should process arrays correctly (example 2)',
            dataCtx: {
                data: {
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
                }
            },
            actionsCtx: {
                ifAllMatch: {
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
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with events (example 1)',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: 'app_vs',
                    telemetryEventCategory: 'defaultEvent'
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    telemetryEventCategory: 'defaultEvent',
                    tenant: 'app'
                }
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with events (example 2)',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: 'app_vs',
                    telemetryEventCategory: 'defaultEvent'
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    telemetryEventCategory: 'defaultEvent',
                    virtual_name: 'app_vs'
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'shouldn\'t reject on bad regex',
            dataCtx: {
                data: {
                    system: {
                        hostname: 'bigip.example.com',
                        version: '14.1.0'
                    }
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    system: {
                        version: '*'
                    }
                }
            },
            expectedCtx: false
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return successful when negation regexes are used',
            dataCtx: {
                data: {
                    Entity: 'TcpStat'
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    Entity: '^(?!OffBoxAll|^VS).*'
                }
            },
            expectedCtx: true
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not match when negation regexes are used',
            dataCtx: {
                data: {
                    Entity: 'OffBoxAll'
                }
            },
            actionsCtx: {
                ifAllMatch: {
                    Entity: '^(?!OffBoxAll|^VS).*'
                }
            },
            expectedCtx: false
        }
    ],
    getMatches: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return what matches the property when it is a literal string',
            data: {
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
            data: {
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
            data: {
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
            data: {
                virtualServers: {},
                httpProfiles: {}
            },
            propertyCtx: 'noResults',
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (integer) exists',
            data: ['vs1'],
            propertyCtx: 0,
            expectedCtx: [0]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (string) exists',
            data: ['vs1'],
            propertyCtx: '0',
            expectedCtx: ['0']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (integer) not exists',
            data: [],
            propertyCtx: 0,
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (string) not exists (example 1)',
            data: [],
            propertyCtx: '0',
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should work with array when index (string) not exists (example 2)',
            data: ['vs1'],
            propertyCtx: 'noResult',
            expectedCtx: []
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should check property param against regex patterers from the data keys (example 1)',
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            expectedCtx: ['virtualServers', '0', 'vs1', 'ip']
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able work with arrays (example 2)',
            data: {
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
            data: {
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
            data: {
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
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to accept array of property contexts',
            data: {
                system: {
                    hostname: 'hostname',
                    nestedKey1: 'value1'
                },
                otherSystem: {
                    keyOne: 'one',
                    keyTwo: 'two'
                }
            },
            propertiesCtx: [
                {
                    system: {
                        hostname: true
                    }
                },
                {
                    otherSystem: {
                        keyTwo: 'two'
                    }
                }
            ],
            expectedCtx: ['system', 'hostname', 'otherSystem', 'keyTwo']
        }
    ],
    removeStrictMatches: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should be able to access nested data by key (example 1)',
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
            data: {
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
