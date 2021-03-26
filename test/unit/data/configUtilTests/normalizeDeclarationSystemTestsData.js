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
                    'My_System_1::SystemPoller_1': ['My_Consumer_1'],
                    'My_System_1::SystemPoller_2': ['My_Consumer_1'],
                    'My_System_2::SystemPoller_1': ['My_Consumer_1'],
                    'My_System_2::SystemPoller_2': ['My_Consumer_1']
                },
                components: [
                    {
                        id: 'My_System_1::SystemPoller_1',
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        trace: false,
                        traceName: 'My_System_1::SystemPoller_1',
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
                        id: 'My_System_1::SystemPoller_2',
                        name: 'SystemPoller_2',
                        class: 'Telemetry_System_Poller',
                        trace: false,
                        traceName: 'My_System_1::SystemPoller_2',
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
                        id: 'My_System_2::SystemPoller_2',
                        traceName: 'My_System_2::SystemPoller_2',
                        systemName: 'My_System_2',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        interval: 432,
                        trace: false,
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
                        id: 'My_System_2::SystemPoller_1',
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        trace: false,
                        traceName: 'My_System_2::SystemPoller_1',
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
                        id: 'My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: false,
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
                    'My_System_1::SystemPoller_1': ['My_Consumer_1'],
                    'My_Namespace::My_System_1::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace_2::My_System_1::SystemPoller_1': ['My_Namespace_2::My_Consumer_1']
                },
                components: [
                    {
                        name: 'SystemPoller_1',
                        id: 'My_System_1::SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'f5telemetry_default',
                        enable: true,
                        trace: false,
                        systemName: 'My_System_1',
                        traceName: 'My_System_1::SystemPoller_1',
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
                        traceName: 'My_Consumer_1',
                        id: 'My_Consumer_1',
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
                        trace: false,
                        compressionType: 'gzip'
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System_1::SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace',
                        enable: true,
                        trace: false,
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
                        trace: false,
                        compressionType: 'gzip'
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace_2::My_System_1::SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace_2',
                        enable: true,
                        trace: false,
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
                        trace: false,
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
                    'System_Nested_Poller_Single::SystemPoller_1': ['My_Consumer_1'],
                    'System_Ref_Poller::Poller1': ['My_Consumer_1'],
                    'System_Nested_Poller_Array::SystemPoller_1': ['My_Consumer_1'],
                    'System_Nested_Poller_Array::Poller1': ['My_Consumer_1'],
                    'System_Nested_Poller_Array::Poller2': ['My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Single::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Ref_Poller::Poller1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Array::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Array::Poller1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Nested_Poller_Array::Poller2': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        name: 'SystemPoller_1',
                        id: 'System_Nested_Poller_Single::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 222,
                        trace: false,
                        traceName: 'System_Nested_Poller_Single::SystemPoller_1',
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
                        id: 'System_Ref_Poller::Poller1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: false,
                        traceName: 'System_Ref_Poller::Poller1',
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
                        id: 'System_Nested_Poller_Array::Poller2',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 111,
                        trace: false,
                        traceName: 'System_Nested_Poller_Array::Poller2',
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
                        id: 'System_Nested_Poller_Array::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 333,
                        trace: false,
                        traceName: 'System_Nested_Poller_Array::SystemPoller_1',
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
                        id: 'System_Nested_Poller_Array::Poller1',
                        name: 'Poller1',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        trace: false,
                        traceName: 'System_Nested_Poller_Array::Poller1',
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
                        id: 'My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        type: 'default'
                    },
                    {
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::System_Nested_Poller_Single::SystemPoller_1',
                        namespace: 'My_Namespace',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 222,
                        trace: false,
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
                        trace: false,
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
                        trace: false,
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
                        trace: false,
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
                        trace: false,
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
                        trace: false,
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
                    'System_Trace_Undef_Poller_String::SystemPoller_1': ['My_Consumer_1'],
                    'System_Remote_Ref_Poller::Poller_Trace_True': ['My_Consumer_1'],
                    'System_Localhost_Ref_Poller::Poller_Trace_False': ['My_Consumer_1'],
                    'My_Namespace::System_Trace_Undef_Poller_String::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        trace: '/path/to/the/undiscovered/land',
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'System_Trace_Undef_Poller_String::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'System_Trace_Undef_Poller_String',
                        traceName: 'System_Trace_Undef_Poller_String::SystemPoller_1',
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
                                name: 'endpoint1'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_True',
                        id: 'System_Remote_Ref_Poller::Poller_Trace_True',
                        namespace: 'f5telemetry_default',
                        systemName: 'System_Remote_Ref_Poller',
                        traceName: 'System_Remote_Ref_Poller::Poller_Trace_True',
                        trace: false,
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
                                name: 'endpoint1'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_False',
                        id: 'System_Localhost_Ref_Poller::Poller_Trace_False',
                        namespace: 'f5telemetry_default',
                        systemName: 'System_Localhost_Ref_Poller',
                        traceName: 'System_Localhost_Ref_Poller::Poller_Trace_False',
                        trace: false,
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
                        id: 'My_Consumer_1',
                        name: 'My_Consumer_1',
                        traceName: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        type: 'default'
                    },
                    {
                        trace: '/path/to/the/undiscovered/land',
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
                                name: 'endpoint1'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_True',
                        id: 'My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True',
                        namespace: 'My_Namespace',
                        systemName: 'System_Remote_Ref_Poller',
                        traceName: 'My_Namespace::System_Remote_Ref_Poller::Poller_Trace_True',
                        trace: false,
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
                                name: 'endpoint1'
                            }
                        },
                        enable: true,
                        name: 'Poller_Trace_False',
                        id: 'My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False',
                        namespace: 'My_Namespace',
                        systemName: 'System_Localhost_Ref_Poller',
                        traceName: 'My_Namespace::System_Localhost_Ref_Poller::Poller_Trace_False',
                        trace: false,
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
                        trace: false,
                        type: 'default'
                    }
                ]
            }
        }
    ]
};
