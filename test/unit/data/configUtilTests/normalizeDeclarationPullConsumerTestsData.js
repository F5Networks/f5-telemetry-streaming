/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Object's ID might be one of the following:
 * - obj.traceName
 * - obj.namespace::obj.name
 * - UUID
 */

module.exports = {
    name: 'Telemetry_Pull_Consumer normalization',
    tests: [
        {
            name: 'should normalize declaration with Pull Consumers',
            declaration: {
                class: 'Telemetry',
                Pull_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_2: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_3: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_4: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Regular_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                My_System: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: 'Pull_Poller_1'
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: 'Pull_Poller_2'
                },
                My_System_3: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: [
                        'Pull_Poller_1',
                        'Pull_Poller_2',
                        {
                            interval: 90
                        },
                        'Regular_Poller_1'
                    ]
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: [
                        // My_System and My_System_3
                        'Pull_Poller_1',
                        // My_System_2 and My_System_3
                        'Pull_Poller_2',
                        // Pull_Poller_3 itself
                        'Pull_Poller_3'
                    ]
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Pull_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    Pull_Poller_2: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    Pull_Poller_3: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    Pull_Poller_4: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    Regular_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        host: 'host1',
                        systemPoller: 'Pull_Poller_1'
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        host: 'host1',
                        systemPoller: 'Pull_Poller_2'
                    },
                    My_System_3: {
                        class: 'Telemetry_System',
                        host: 'host1',
                        systemPoller: [
                            'Pull_Poller_1',
                            'Pull_Poller_2',
                            {
                                interval: 90
                            },
                            'Regular_Poller_1'
                        ]
                    },
                    My_Pull_Consumer: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'Prometheus',
                        systemPoller: [
                            // My_System and My_System_3
                            'Pull_Poller_1',
                            // My_System_2 and My_System_3
                            'Pull_Poller_2',
                            // Pull_Poller_3 itself
                            'Pull_Poller_3'
                        ]
                    }
                }
            },
            expected: {
                mappings: {
                    My_Pull_Consumer: [
                        'My_System::Pull_Poller_1',
                        'My_System_2::Pull_Poller_2',
                        'My_System_3::Pull_Poller_1',
                        'My_System_3::Pull_Poller_2',
                        'Pull_Poller_3::Pull_Poller_3'
                    ],
                    'My_Namespace::My_Pull_Consumer': [
                        'My_Namespace::My_System::Pull_Poller_1',
                        'My_Namespace::My_System_2::Pull_Poller_2',
                        'My_Namespace::My_System_3::Pull_Poller_1',
                        'My_Namespace::My_System_3::Pull_Poller_2',
                        'My_Namespace::Pull_Poller_3::Pull_Poller_3'
                    ]
                },
                components: [
                    {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Pull_Consumer.My_Pull_Consumer',
                            type: 'output'
                        },
                        name: 'My_Pull_Consumer',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Pull_Consumer',
                        systemPollers: [
                            'Pull_Poller_1',
                            'Pull_Poller_2',
                            'Pull_Poller_3'
                        ],
                        id: 'My_Pull_Consumer'
                    },
                    {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'Prometheus',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Pull_Consumer.My_Namespace::My_Pull_Consumer',
                            type: 'output'
                        },
                        name: 'My_Pull_Consumer',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Pull_Consumer',
                        systemPollers: [
                            'Pull_Poller_1',
                            'Pull_Poller_2',
                            'Pull_Poller_3'
                        ],
                        id: 'My_Namespace::My_Pull_Consumer'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System::Pull_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_System::Pull_Poller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_System::Pull_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_2',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_2',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_2::Pull_Poller_2',
                            type: 'output'
                        },
                        traceName: 'My_System_2::Pull_Poller_2',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_System_2::Pull_Poller_2'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_3::Pull_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_System_3::Pull_Poller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_System_3::Pull_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_2',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_3::Pull_Poller_2',
                            type: 'output'
                        },
                        traceName: 'My_System_3::Pull_Poller_2',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_System_3::Pull_Poller_2'
                    },
                    {
                        interval: 90,
                        enable: true,
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_3::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_System_3::SystemPoller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_System_3::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Regular_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_3::Regular_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_System_3::Regular_Poller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_System_3::Regular_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::Pull_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System::Pull_Poller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System::Pull_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_2',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_2',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_2::Pull_Poller_2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System_2::Pull_Poller_2',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System_2::Pull_Poller_2'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_3::Pull_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System_3::Pull_Poller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System_3::Pull_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_2',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_3::Pull_Poller_2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System_3::Pull_Poller_2',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System_3::Pull_Poller_2'
                    },
                    {
                        interval: 90,
                        enable: true,
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_3::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System_3::SystemPoller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System_3::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Regular_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_3::Regular_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System_3::Regular_Poller_1',
                        connection: {
                            host: 'host1',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System_3::Regular_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_3',
                        namespace: 'f5telemetry_default',
                        systemName: 'Pull_Poller_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.Pull_Poller_3::Pull_Poller_3',
                            type: 'output'
                        },
                        traceName: 'Pull_Poller_3::Pull_Poller_3',
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'Pull_Poller_3::Pull_Poller_3'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_4',
                        namespace: 'f5telemetry_default',
                        systemName: 'Pull_Poller_4',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.Pull_Poller_4::Pull_Poller_4',
                            type: 'output'
                        },
                        traceName: 'Pull_Poller_4::Pull_Poller_4',
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'Pull_Poller_4::Pull_Poller_4'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_3',
                        namespace: 'My_Namespace',
                        systemName: 'Pull_Poller_3',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::Pull_Poller_3::Pull_Poller_3',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::Pull_Poller_3::Pull_Poller_3',
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::Pull_Poller_3::Pull_Poller_3'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_4',
                        namespace: 'My_Namespace',
                        systemName: 'Pull_Poller_4',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::Pull_Poller_4::Pull_Poller_4',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::Pull_Poller_4::Pull_Poller_4',
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::Pull_Poller_4::Pull_Poller_4'
                    }
                ]
            }
        },
        {
            name: 'should normalize declaration with Pull Consumer and single System Poller',
            declaration: {
                class: 'Telemetry',
                Pull_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: 'Pull_Poller_1'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Pull_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    My_Pull_Consumer: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'Prometheus',
                        systemPoller: 'Pull_Poller_1'
                    }
                }
            },
            expected: {
                mappings: {
                    My_Pull_Consumer: [
                        'Pull_Poller_1::Pull_Poller_1'
                    ],
                    'My_Namespace::My_Pull_Consumer': [
                        'My_Namespace::Pull_Poller_1::Pull_Poller_1'
                    ]
                },
                components: [
                    {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Pull_Consumer.My_Pull_Consumer',
                            type: 'output'
                        },
                        name: 'My_Pull_Consumer',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Pull_Consumer',
                        systemPollers: [
                            'Pull_Poller_1'
                        ],
                        id: 'My_Pull_Consumer'
                    },
                    {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'Prometheus',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Pull_Consumer.My_Namespace::My_Pull_Consumer',
                            type: 'output'
                        },
                        name: 'My_Pull_Consumer',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Pull_Consumer',
                        systemPollers: [
                            'Pull_Poller_1'
                        ],
                        id: 'My_Namespace::My_Pull_Consumer'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'Pull_Poller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.Pull_Poller_1::Pull_Poller_1',
                            type: 'output'
                        },
                        traceName: 'Pull_Poller_1::Pull_Poller_1',
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'Pull_Poller_1::Pull_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        enable: true,
                        name: 'Pull_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'Pull_Poller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::Pull_Poller_1::Pull_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::Pull_Poller_1::Pull_Poller_1',
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tenant: '`T`',
                                        application: '`A`'
                                    },
                                    enable: true
                                }
                            ],
                            noTMStats: true,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::Pull_Poller_1::Pull_Poller_1'
                    }
                ]
            }
        }
    ]
};
