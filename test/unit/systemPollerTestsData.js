/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
    buildPollerConfigs: [
        // **** BEGIN OVERRIDES CHECKS
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set noTMStats to false when Splunk Legacy presented',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                },
                My_Splunk: {
                    class: 'Telemetry_Consumer',
                    type: 'Splunk',
                    format: 'legacy',
                    host: 'x.x.x.x',
                    passphrase: {
                        cipherText: 'passphrase'
                    }
                }
            },
            expected: {
                My_System: [{
                    enable: false, // no system poller defined
                    trace: false, // System's trace is still false
                    interval: undefined, // no system poller specified
                    connection: { // defaults here
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: undefined
                    },
                    // no credentials specified
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    dataOpts: {
                        actions: undefined,
                        noTMStats: false, // Splunk legacy presented
                        tags: undefined
                    },
                    endpointList: undefined
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set correct trace for System with System Poller (keep System\'s trace property)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    enable: false,
                    trace: true,
                    interval: 90
                },
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    trace: 'somefile',
                    systemPoller: 'My_System_Poller'
                }
            },
            expected: {
                My_System: [{
                    enable: false,
                    trace: 'somefile',
                    interval: 90,
                    connection: {
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: undefined
                    },
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    dataOpts: {
                        // default actions is `T` and `A`
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: undefined
                }]
            }
        },
        // **** END OVERRIDES CHECKS
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System with minimal declaration (without System Poller)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            expected: {
                My_System: [{
                    enable: false, // no system poller defined
                    trace: false, // tracer not specified
                    interval: undefined, // no system poller specified
                    connection: { // defaults here
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: undefined
                    },
                    // no credentials specified
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    // no system poller specified
                    dataOpts: {
                        actions: undefined,
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: undefined
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System with full declaration (without Sytem_Poller)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    trace: true,
                    host: 'somehost',
                    port: 5000,
                    protocol: 'https',
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: true,
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    }
                }
            },
            expected: {
                My_System: [{
                    enable: false, // System Poller not defined
                    trace: false, // System Poller not defined
                    interval: undefined, // System Poller not defined
                    connection: {
                        host: 'somehost',
                        port: 5000,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    },
                    dataOpts: {
                        // System Poller not defined
                        actions: undefined,
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: undefined
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System with nested System Poller configuration (single)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 90,
                        trace: true
                    }
                }
            },
            expected: {
                My_System: [{
                    enable: true, // System Poller defined and enabled
                    trace: false, // System's trace is still false
                    interval: 90, // System Poller defined
                    connection: { // defaults here
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: undefined
                    },
                    // no credentials specified
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    dataOpts: {
                        // default actions is `T` and `A`
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: undefined
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System with nested System Poller (array of objects)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        {
                            interval: 90,
                            trace: false
                        },
                        {
                            interval: 220,
                            trace: true,
                            enable: false
                        }
                    ]
                }
            },
            expected: {
                My_System: [
                    {
                        enable: true, // System Poller defined and enabled
                        trace: false, // System's trace is still false
                        interval: 90, // System Poller defined
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: undefined
                    },
                    {
                        enable: false, // System Poller defined and disabled
                        trace: false, // System's trace is still false
                        interval: 220, // System Poller defined
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: undefined
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System with System Poller (array of references)',
            declaration: {
                class: 'Telemetry',
                Poller1: {
                    class: 'Telemetry_System_Poller',
                    interval: 90,
                    trace: false
                },
                Poller2: {
                    class: 'Telemetry_System_Poller',
                    interval: 220,
                    trace: true,
                    enable: false
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        'Poller1',
                        'Poller2'
                    ]
                }
            },
            expected: {
                My_System: [
                    {
                        enable: true, // System Poller defined and enabled
                        trace: false, // System's trace is still false
                        interval: 90, // System Poller defined
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: undefined
                    },
                    {
                        enable: false, // System Poller defined and disabled
                        trace: false, // System's trace is still false
                        interval: 220, // System Poller defined
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: undefined
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System Poller with full declaration (without System)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    enable: true,
                    trace: true,
                    host: 'somehost',
                    port: 5000,
                    protocol: 'https',
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: true,
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    interval: 90
                }
            },
            expected: {
                My_System_Poller: [{
                    enable: true,
                    trace: true,
                    interval: 90,
                    connection: {
                        host: 'somehost',
                        port: 5000,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    },
                    dataOpts: {
                        // default actions is `T` and `A`
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: undefined
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config for System with System Poller ref and Endpoints ref',
            declaration: {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    basePath: '/mybase',
                    items: {
                        a: {
                            name: 'sub1',
                            path: '/sub1/obj1'
                        },
                        b: {
                            path: 'sub2/obj1'
                        }
                    }
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    enable: false,
                    trace: 'somefile',
                    host: 'somehost',
                    port: 5000,
                    protocol: 'https',
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: true,
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    interval: 90,
                    endpointList: 'My_Endpoints'
                },
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    trace: true,
                    host: 'somehost2',
                    port: 5001,
                    protocol: 'http',
                    allowSelfSignedCert: false,
                    enableHostConnectivityCheck: true,
                    username: 'username1',
                    passphrase: {
                        cipherText: 'passphrase2'
                    },
                    systemPoller: 'My_System_Poller'
                }
            },
            expected: {
                My_System: [{
                    enable: false,
                    trace: 'somefile',
                    interval: 90,
                    connection: {
                        host: 'somehost2',
                        port: 5001,
                        protocol: 'http',
                        allowSelfSignedCert: false
                    },
                    credentials: {
                        username: 'username1',
                        passphrase: 'passphrase2'
                    },
                    dataOpts: {
                        // default actions is `T` and `A`
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: {
                        sub1: {
                            enable: true,
                            name: 'sub1',
                            path: '/mybase/sub1/obj1'
                        },
                        b: {
                            enable: true,
                            path: '/mybase/sub2/obj1',
                            name: 'b'
                        }
                    }
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config with Endpoints (single ref)',
            declaration: {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        endpoint1: {
                            name: 'endpoint1',
                            path: 'endpointPath1'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 90,
                        endpointList: 'My_Endpoints'
                    }
                }
            },
            expected: {
                My_System: [{
                    enable: true,
                    trace: false,
                    interval: 90,
                    connection: {
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: undefined
                    },
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    dataOpts: {
                        // default actions is `T` and `A`
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: {
                        endpoint1: {
                            enable: true,
                            name: 'endpoint1',
                            path: '/endpointPath1'
                        }
                    }
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build poller config with Endpoints (array with objects and refs)',
            declaration: {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    basePath: '/base1',
                    items: {
                        endpoint1: {
                            name: 'endpoint1',
                            path: 'endpointPath1'
                        },
                        endpoint10: {
                            name: 'endpoint10',
                            path: 'endpointPath10'
                        },
                        endpointDisabled: {
                            enable: false,
                            name: 'endpointDisabled',
                            path: 'endpointPath1'
                        }
                    }
                },
                Another_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    basePath: '/another/',
                    items: {
                        another1: {
                            name: 'anotherOne',
                            path: '/anotherPathOne'
                        },
                        another2: {
                            name: 'anotherTwo',
                            path: '/anotherPathTwo/subpath'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 90,
                        endpointList: [
                            'My_Endpoints',
                            'Another_Endpoints/another2',
                            {
                                enable: false,
                                name: 'endpointDisabled2',
                                path: 'endpointPath2'
                            },
                            {
                                name: 'endpoint2',
                                path: 'endpointPath2'
                            },
                            {
                                basePath: 'base/',
                                items: {
                                    endpoint20: {
                                        name: 'endpoint20',
                                        path: 'endpointPath20'
                                    },
                                    endpoint21: {
                                        name: 'endpoint21',
                                        path: 'endpointPath21'
                                    },
                                    endpointDisabled23: {
                                        enable: false,
                                        name: 'endpointDisabled23',
                                        path: 'endpointPath1'
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            expected: {
                My_System: [{
                    enable: true,
                    trace: false,
                    interval: 90,
                    connection: {
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: undefined
                    },
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    dataOpts: {
                        // default actions is `T` and `A`
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    endpointList: {
                        endpoint1: {
                            name: 'endpoint1',
                            path: '/base1/endpointPath1',
                            enable: true
                        },
                        endpoint10: {
                            name: 'endpoint10',
                            path: '/base1/endpointPath10',
                            enable: true
                        },
                        anotherTwo: {
                            name: 'anotherTwo',
                            path: '/another/anotherPathTwo/subpath',
                            enable: true
                        },
                        endpoint2: {
                            name: 'endpoint2',
                            path: '/endpointPath2',
                            enable: true
                        },
                        endpoint20: {
                            name: 'endpoint20',
                            path: '/base/endpointPath20',
                            enable: true
                        },
                        endpoint21: {
                            name: 'endpoint21',
                            path: '/base/endpointPath21',
                            enable: true
                        }
                    }
                }]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build COMPLEX poller configs for System, System Poller and Endpoint combinations',
            declaration: {
                class: 'Telemetry',
                Endpoints_Items: {
                    class: 'Telemetry_Endpoints',
                    basePath: 'items/',
                    items: {
                        one: {
                            name: 'one',
                            path: '/one'
                        }
                    }
                },
                Endpoints_Whole: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        ichi: {
                            name: 'ichi',
                            path: '/ichi'
                        },
                        ni: {
                            name: 'ni',
                            path: '/ni'
                        },
                        san: {
                            enable: false,
                            name: 'san',
                            path: '/san'
                        }
                    }

                },
                Poller_Endpoint_Nested: {
                    class: 'Telemetry_System_Poller',
                    interval: 90,
                    trace: false,
                    endpointList: {
                        basePath: '/nested/',
                        items: {
                            a: {
                                name: 'a',
                                path: '/a'
                            }
                        }
                    }
                },
                Poller_Endpoint_Ref: {
                    class: 'Telemetry_System_Poller',
                    interval: 220,
                    trace: true,
                    enable: true,
                    endpointList: [
                        'Endpoints_Whole',
                        'Endpoints_Items/one'
                    ]
                },
                Custom_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        'Poller_Endpoint_Nested',
                        'Poller_Endpoint_Ref'
                    ]
                },
                Default_System: {
                    class: 'Telemetry_System',
                    trace: true,
                    systemPoller: {
                        interval: 888,
                        trace: true
                    }
                }
            },
            expected: {
                Custom_System: [
                    {
                        enable: true, // System Poller defined and enabled
                        trace: false, // System's trace is still false
                        interval: 90, // System Poller defined
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: {
                            a: {
                                enable: true,
                                name: 'a',
                                path: '/nested/a'
                            }
                        }
                    },
                    {
                        enable: true, // System Poller defined and disabled
                        trace: false, // System's trace is still false
                        interval: 220, // System Poller defined
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: {
                            ichi: {
                                enable: true,
                                name: 'ichi',
                                path: '/ichi'
                            },
                            ni: {
                                enable: true,
                                name: 'ni',
                                path: '/ni'
                            },
                            one: {
                                enable: true,
                                name: 'one',
                                path: '/items/one'
                            }
                        }
                    }
                ],
                Default_System: [
                    {
                        enable: true,
                        interval: 888,
                        trace: true,
                        connection: { // defaults here
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: undefined
                        },
                        // no credentials specified
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        dataOpts: {
                            // default actions is `T` and `A`
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        endpointList: undefined
                    }
                ]
            }
        }
    ],
    getExpandedConfWithNameRefs: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System and System Poller with such name don\'t exists',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'systemName',
            systemPollerName: 'systemPollerName',
            errorMessage: 'System with name \'systemName\' and System Poller with name \'systemPollerName\' don\'t exist'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System or System Poller with such name doesn\'t exists',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'systemName',
            errorMessage: 'System with name \'systemName\' or System Poller with name \'systemName\' don\'t exist'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System has no configuration for System Poller',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'My_System',
            errorMessage: 'System with name \'My_System\' has no System Poller configured'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build config for System',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 90
                    }
                },
                My_System2: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'My_System',
            expected: {
                Telemetry_System: {
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        systemPoller: {
                            enable: true,
                            interval: 90,
                            trace: false,
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build config for System Poller',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    interval: 90
                },
                My_System_Poller2: {
                    class: 'Telemetry_System_Poller'
                }
            },
            sysOrPollerName: 'My_System_Poller',
            expected: {
                Telemetry_System_Poller: {
                    My_System_Poller: {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        interval: 90,
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build config for System and System Poller (referenced by name)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    interval: 90
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                },
                My_System_Poller2: {
                    class: 'Telemetry_System_Poller'
                },
                My_System2: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'My_System',
            expected: {
                Telemetry_System: {
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        systemPoller: 'My_System_Poller'
                    }
                },
                Telemetry_System_Poller: {
                    My_System_Poller: {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 90,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build config for System and System Poller (both referenced by name)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    interval: 90
                },
                My_System: {
                    class: 'Telemetry_System'
                },
                My_System_Poller2: {
                    class: 'Telemetry_System_Poller'
                },
                My_System2: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'My_System',
            systemPollerName: 'My_System_Poller',
            expected: {
                Telemetry_System: {
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        systemPoller: 'My_System_Poller'
                    }
                },
                Telemetry_System_Poller: {
                    My_System_Poller: {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 90,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should build config for System and System Poller array (referenced by name)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    interval: 90
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                },
                My_System_Poller2: {
                    class: 'Telemetry_System_Poller'
                },
                My_System_Poller3: {
                    class: 'Telemetry_System_Poller',
                    interval: 100
                },
                My_System2: {
                    class: 'Telemetry_System',
                    trace: true,
                    systemPoller: [
                        'My_System_Poller2',
                        'My_System_Poller3'
                    ]
                }
            },
            sysOrPollerName: 'My_System2',
            expected: {
                Telemetry_System: {
                    My_System2: {
                        class: 'Telemetry_System',
                        enable: true,
                        trace: true,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        systemPoller: [
                            'My_System_Poller2',
                            'My_System_Poller3'
                        ]
                    }
                },
                Telemetry_System_Poller: {
                    My_System_Poller2: {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    },
                    My_System_Poller3: {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 100,
                        trace: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    }
                }
            }
        }
    ],
    processClientRequest: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when no System or System Poller name specified',
            requestOpts: {
                uri: '/shared/telemetry/systempoller'
            },
            expectedResponse: {
                code: 400,
                body: {
                    code: 400,
                    message: 'Error: Bad Request. Name for System or System Poller was not specified.'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System when such name doesn\'t exist',
            declaration: {
                class: 'Telemetry'
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/systemName'
            },
            expectedResponse: {
                code: 400,
                body: {
                    code: 400,
                    message: 'Error: System with name \'systemName\' or System Poller with name \'systemName\' don\'t exist'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (single poller)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 200,
                body: {
                    foo: 'bar'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (poller array)',
            declaration: {
                class: 'Telemetry',
                SystemPoller1: {
                    class: 'Telemetry_System_Poller'
                },
                SystemPoller2: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        'SystemPoller1',
                        'SystemPoller2'
                    ]
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        foo: 'bar'
                    },
                    {
                        foo: 'bar'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when \'process\' failed (just basic Error thrown)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            returnCtx: () => { throw new Error('expected error'); },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 500,
                body: {
                    code: 500,
                    message: 'systemPoller.process error: Error: systemPoller:safeProcess unhandled exception: Error: expected error'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when \'process\' failed (Promise rejection)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            returnCtx: () => Promise.reject(new Error('expected error')),
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 500,
                body: {
                    code: 500,
                    message: 'systemPoller.process error: Error: expected error'
                }
            }
        }
    ]
};
