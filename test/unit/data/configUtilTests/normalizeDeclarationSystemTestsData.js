/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
    name: 'Telemetry_System normalization',
    tests: [
        {
            name: 'should assign unique names within Namespace and avoid dups for Systems with anonymous System Pollers',
            declaration: {
                class: 'Telemetry',
                SystemPoller_1: {
                    class: 'Telemetry_System_Poller',
                    host: 'host1'
                },
                My_System_1: {
                    class: 'Telemetry_System',
                    host: 'host2',
                    systemPoller: [
                        'SystemPoller_1',
                        {
                            // should assign name SystemPoller_2
                            interval: 180
                        }
                    ]
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    host: 'host3',
                    systemPoller: [
                        'SystemPoller_2',
                        {
                            // should assign name SystemPoller_1
                            interval: 555
                        }
                    ]
                },
                SystemPoller_2: {
                    class: 'Telemetry_System_Poller',
                    host: 'host4',
                    interval: 432
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System_1::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_System_1::SystemPoller_2': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_System_2::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_System_2::SystemPoller_2': ['f5telemetry_default::My_Consumer_1']
                },
                components: [
                    {
                        id: 'f5telemetry_default::My_System_1::SystemPoller_1',
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_1::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_System_1::SystemPoller_1',
                        systemName: 'My_System_1',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        interval: 300,
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            passphrase: undefined,
                            username: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host2',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        id: 'f5telemetry_default::My_System_1::SystemPoller_2',
                        name: 'SystemPoller_2',
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_1::SystemPoller_2',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_System_1::SystemPoller_2',
                        systemName: 'My_System_1',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        interval: 180,
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            passphrase: undefined,
                            username: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host2',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        name: 'SystemPoller_2',
                        id: 'f5telemetry_default::My_System_2::SystemPoller_2',
                        traceName: 'f5telemetry_default::My_System_2::SystemPoller_2',
                        systemName: 'My_System_2',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        interval: 432,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_2::SystemPoller_2',
                            type: 'output'
                        },
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host3',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        id: 'f5telemetry_default::My_System_2::SystemPoller_1',
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_2::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_System_2::SystemPoller_1',
                        systemName: 'My_System_2',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        interval: 555,
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            passphrase: undefined,
                            username: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host3',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should normalize System without System Poller',
            declaration: {
                class: 'Telemetry',
                My_System_1: {
                    class: 'Telemetry_System',
                    trace: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System',
                        trace: false
                    }
                }
            },
            expected: {
                mappings: {},
                components: []
            }
        },
        {
            name: 'should normalize System with TMStats to fetch (legacy Splunk consumer)',
            declaration: {
                class: 'Telemetry',
                My_System_1: {
                    class: 'Telemetry_System',
                    trace: false,
                    host: 'host1',
                    systemPoller: {
                        interval: 300
                    }
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'Splunk',
                    format: 'legacy',
                    host: 'host2',
                    protocol: 'https',
                    passphrase: {
                        cipherText: 'jellybeans'
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System',
                        trace: false,
                        host: 'host3',
                        systemPoller: {
                            interval: 300
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        format: 'legacy',
                        host: 'host4',
                        protocol: 'https',
                        passphrase: {
                            cipherText: 'jellybeans'
                        }
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System',
                        trace: false,
                        host: 'host5',
                        systemPoller: {
                            interval: 300
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System_1::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_System_1::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace_2::My_System_1::SystemPoller_1': ['My_Namespace_2::My_Consumer_1']
                },
                components: [
                    {
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::My_System_1::SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_1::SystemPoller_1',
                            type: 'output'
                        },
                        systemName: 'My_System_1',
                        traceName: 'f5telemetry_default::My_System_1::SystemPoller_1',
                        interval: 300,
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: false
                        },
                        credentials: {
                            passphrase: undefined,
                            username: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host1',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        name: 'My_Consumer_1',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        id: 'f5telemetry_default::My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        format: 'legacy',
                        host: 'host2',
                        protocol: 'https',
                        passphrase: {
                            cipherText: '$M$jellybeans',
                            class: 'Secret',
                            protected: 'SecureVault'
                        },
                        enable: true,
                        port: 8088,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        compressionType: 'gzip'
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System_1::SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_1::SystemPoller_1',
                            type: 'output'
                        },
                        systemName: 'My_System_1',
                        traceName: 'My_Namespace::My_System_1::SystemPoller_1',
                        interval: 300,
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: false
                        },
                        credentials: {
                            passphrase: undefined,
                            username: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host3',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        name: 'My_Consumer_1',
                        traceName: 'My_Namespace::My_Consumer_1',
                        id: 'My_Namespace::My_Consumer_1',
                        namespace: 'My_Namespace',
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        format: 'legacy',
                        host: 'host4',
                        protocol: 'https',
                        passphrase: {
                            cipherText: '$M$jellybeans',
                            class: 'Secret',
                            protected: 'SecureVault'
                        },
                        enable: true,
                        port: 8088,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        compressionType: 'gzip'
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace_2::My_System_1::SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace_2',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace_2::My_System_1::SystemPoller_1',
                            type: 'output'
                        },
                        systemName: 'My_System_1',
                        traceName: 'My_Namespace_2::My_System_1::SystemPoller_1',
                        interval: 300,
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            passphrase: undefined,
                            username: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host5',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace_2::My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'My_Namespace_2::My_Consumer_1',
                        namespace: 'My_Namespace_2',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::My_Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should normalize multiple systems and various poller formats',
            declaration: {
                class: 'Telemetry',
                Poller1: {
                    class: 'Telemetry_System_Poller',
                    host: 'host1'
                },
                Poller2: {
                    class: 'Telemetry_System_Poller',
                    interval: 111,
                    host: 'host2'
                },
                System_Nested_Poller_Single: {
                    class: 'Telemetry_System',
                    host: 'host3',
                    systemPoller: {
                        // should assign SystemPoller_1 name
                        interval: 222
                    }
                },
                System_Ref_Poller: {
                    class: 'Telemetry_System',
                    host: 'host4',
                    systemPoller: 'Poller1'
                },
                System_Nested_Poller_Array: {
                    class: 'Telemetry_System',
                    host: 'host5',
                    systemPoller: [
                        {
                            // should assign SystemPoller_1 name
                            interval: 333
                        },
                        'Poller1',
                        'Poller2'
                    ]
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Poller1: {
                        class: 'Telemetry_System_Poller',
                        host: 'host6'
                    },
                    Poller2: {
                        class: 'Telemetry_System_Poller',
                        host: 'host7',
                        interval: 111
                    },
                    System_Nested_Poller_Single: {
                        class: 'Telemetry_System',
                        host: 'host8',
                        systemPoller: {
                            // should assign SystemPoller_1 name
                            interval: 222
                        }
                    },
                    System_Ref_Poller: {
                        class: 'Telemetry_System',
                        host: 'host9',
                        systemPoller: 'Poller1'
                    },
                    System_Nested_Poller_Array: {
                        class: 'Telemetry_System',
                        host: 'host10',
                        systemPoller: [
                            {
                                // should assign SystemPoller_1 name
                                interval: 333
                            },
                            'Poller1',
                            'Poller2'
                        ]
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::System_Nested_Poller_Single::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::System_Ref_Poller::Poller1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::System_Nested_Poller_Array::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::System_Nested_Poller_Array::Poller1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::System_Nested_Poller_Array::Poller2': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Single::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Ref_Poller::Poller1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Array::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Array::Poller1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Array::Poller2': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::System_Nested_Poller_Single::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 222,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Nested_Poller_Single::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::System_Nested_Poller_Single::SystemPoller_1',
                        systemName: 'System_Nested_Poller_Single',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            host: 'host3',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        name: 'Poller1',
                        id: 'f5telemetry_default::System_Ref_Poller::Poller1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Ref_Poller::Poller1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::System_Ref_Poller::Poller1',
                        systemName: 'System_Ref_Poller',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host4',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        name: 'Poller2',
                        id: 'f5telemetry_default::System_Nested_Poller_Array::Poller2',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 111,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Nested_Poller_Array::Poller2',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::System_Nested_Poller_Array::Poller2',
                        systemName: 'System_Nested_Poller_Array',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        connection: {
                            host: 'host5',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::System_Nested_Poller_Array::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 333,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Nested_Poller_Array::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::System_Nested_Poller_Array::SystemPoller_1',
                        systemName: 'System_Nested_Poller_Array',
                        dataOpts: {
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
                        connection: {
                            host: 'host5',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        id: 'f5telemetry_default::System_Nested_Poller_Array::Poller1',
                        name: 'Poller1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Nested_Poller_Array::Poller1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::System_Nested_Poller_Array::Poller1',
                        systemName: 'System_Nested_Poller_Array',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        connection: {
                            host: 'host5',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::System_Nested_Poller_Single::SystemPoller_1',
                        namespace: 'My_Namespace',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 222,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Nested_Poller_Single::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::System_Nested_Poller_Single::SystemPoller_1',
                        systemName: 'System_Nested_Poller_Single',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            host: 'host8',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        name: 'Poller1',
                        id: 'My_Namespace::System_Ref_Poller::Poller1',
                        namespace: 'My_Namespace',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Ref_Poller::Poller1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::System_Ref_Poller::Poller1',
                        systemName: 'System_Ref_Poller',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host9',
                            port: 8100,
                            protocol: 'http'
                        }
                    },
                    {
                        name: 'Poller2',
                        id: 'My_Namespace::System_Nested_Poller_Array::Poller2',
                        namespace: 'My_Namespace',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 111,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Nested_Poller_Array::Poller2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::System_Nested_Poller_Array::Poller2',
                        systemName: 'System_Nested_Poller_Array',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        connection: {
                            host: 'host10',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::System_Nested_Poller_Array::SystemPoller_1',
                        namespace: 'My_Namespace',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 333,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Nested_Poller_Array::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::System_Nested_Poller_Array::SystemPoller_1',
                        systemName: 'System_Nested_Poller_Array',
                        dataOpts: {
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
                        connection: {
                            host: 'host10',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        id: 'My_Namespace::System_Nested_Poller_Array::Poller1',
                        name: 'Poller1',
                        namespace: 'My_Namespace',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Nested_Poller_Array::Poller1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::System_Nested_Poller_Array::Poller1',
                        systemName: 'System_Nested_Poller_Array',
                        dataOpts: {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            tags: undefined,
                            noTMStats: true
                        },
                        connection: {
                            host: 'host10',
                            allowSelfSignedCert: false,
                            port: 8100,
                            protocol: 'http'
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace::My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'My_Namespace::My_Consumer_1',
                        namespace: 'My_Namespace',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should normalize systems and pollers with overriding properties',
            declaration: {
                class: 'Telemetry',
                System_Trace_Undef_Poller_String: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: {
                        trace: '/path/to/the/undiscovered/land'
                    }
                },
                System_Remote_Ref_Poller: {
                    class: 'Telemetry_System',
                    trace: false,
                    host: 'host2',
                    systemPoller: 'Poller_Trace_True'
                },
                System_Localhost_Ref_Poller: {
                    class: 'Telemetry_System',
                    trace: true,
                    systemPoller: 'Poller_Trace_False',
                    allowSelfSignedCert: true
                },
                Poller_Trace_True: {
                    class: 'Telemetry_System_Poller',
                    host: 'host4',
                    interval: 333,
                    trace: true,
                    actions: [
                        {
                            setTag: {
                                tag: 'tag'
                            }
                        }
                    ],
                    endpointList: {
                        items: {
                            endpoint1: {
                                path: 'endpoint1'
                            }
                        }
                    }
                },
                Poller_Trace_False: {
                    class: 'Telemetry_System_Poller',
                    host: 'host5',
                    interval: 333,
                    trace: false,
                    actions: [
                        {
                            setTag: {
                                tag: 'tag'
                            }
                        }
                    ],
                    endpointList: {
                        items: {
                            endpoint1: {
                                path: 'endpoint1'
                            }
                        }
                    }
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    System_Trace_Undef_Poller_String: {
                        class: 'Telemetry_System',
                        host: 'host6',
                        systemPoller: {
                            trace: '/path/to/the/undiscovered/land'
                        }
                    },
                    System_Remote_Ref_Poller: {
                        class: 'Telemetry_System',
                        trace: false,
                        host: 'host7',
                        systemPoller: 'Poller_Trace_True'
                    },
                    System_Localhost_Ref_Poller: {
                        class: 'Telemetry_System',
                        trace: true,
                        systemPoller: 'Poller_Trace_False',
                        allowSelfSignedCert: true
                    },
                    Poller_Trace_True: {
                        class: 'Telemetry_System_Poller',
                        host: 'host9',
                        interval: 333,
                        trace: true,
                        actions: [
                            {
                                setTag: {
                                    tag: 'tag'
                                }
                            }
                        ],
                        endpointList: {
                            items: {
                                endpoint1: {
                                    path: 'endpoint1'
                                }
                            }
                        }
                    },
                    Poller_Trace_False: {
                        class: 'Telemetry_System_Poller',
                        host: 'host10',
                        interval: 333,
                        trace: false,
                        actions: [
                            {
                                setTag: {
                                    tag: 'tag'
                                }
                            }
                        ],
                        endpointList: {
                            items: {
                                endpoint1: {
                                    path: 'endpoint1'
                                },
                                snmpEndpoint: {
                                    path: '1.2.3',
                                    protocol: 'snmp'
                                }
                            }
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::System_Trace_Undef_Poller_String::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::System_Remote_Ref_Poller::Poller_Trace_True': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::System_Localhost_Ref_Poller::Poller_Trace_False': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::System_Trace_Undef_Poller_String::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        trace: {
                            enable: true,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/path/to/the/undiscovered/land',
                            type: 'output'
                        },
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::System_Trace_Undef_Poller_String::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'System_Trace_Undef_Poller_String',
                        traceName: 'f5telemetry_default::System_Trace_Undef_Poller_String::SystemPoller_1',
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
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 333,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_True',
                        id: 'f5telemetry_default::System_Remote_Ref_Poller::Poller_Trace_True',
                        namespace: 'f5telemetry_default',
                        systemName: 'System_Remote_Ref_Poller',
                        traceName: 'f5telemetry_default::System_Remote_Ref_Poller::Poller_Trace_True',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Remote_Ref_Poller::Poller_Trace_True',
                            type: 'output'
                        },
                        connection: {
                            host: 'host2',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tag: 'tag'
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
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 333,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_False',
                        id: 'f5telemetry_default::System_Localhost_Ref_Poller::Poller_Trace_False',
                        namespace: 'f5telemetry_default',
                        systemName: 'System_Localhost_Ref_Poller',
                        traceName: 'f5telemetry_default::System_Localhost_Ref_Poller::Poller_Trace_False',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_Localhost_Ref_Poller::Poller_Trace_False',
                            type: 'output'
                        },
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: true
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tag: 'tag'
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
                        }
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    },
                    {
                        trace: {
                            enable: true,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/path/to/the/undiscovered/land',
                            type: 'output'
                        },
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_Namespace::System_Trace_Undef_Poller_String::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'System_Trace_Undef_Poller_String',
                        traceName: 'My_Namespace::System_Trace_Undef_Poller_String::SystemPoller_1',
                        connection: {
                            host: 'host6',
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
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 333,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_True',
                        id: 'My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True',
                        namespace: 'My_Namespace',
                        systemName: 'System_Remote_Ref_Poller',
                        traceName: 'My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True',
                            type: 'output'
                        },
                        connection: {
                            host: 'host7',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tag: 'tag'
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
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        interval: 333,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            },
                            snmpEndpoint: {
                                path: '1.2.3',
                                enable: true,
                                name: 'snmpEndpoint',
                                protocol: 'snmp',
                                numericalEnums: false
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_False',
                        id: 'My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False',
                        namespace: 'My_Namespace',
                        systemName: 'System_Localhost_Ref_Poller',
                        traceName: 'My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False',
                            type: 'output'
                        },
                        connection: {
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: true
                        },
                        dataOpts: {
                            actions: [
                                {
                                    setTag: {
                                        tag: 'tag'
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
                        }
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace::My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'My_Namespace::My_Consumer_1',
                        namespace: 'My_Namespace',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    }
                ]
            }
        }
    ]
};
