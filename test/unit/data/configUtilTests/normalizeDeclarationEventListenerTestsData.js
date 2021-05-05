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
    name: 'Telemetry_Listener normalization',
    tests: [
        {
            name: 'should process full definition and assign new properties and defaults with minimal Event Listener config',
            declaration: {
                class: 'Telemetry',
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Listener_2: {
                    class: 'Telemetry_Listener',
                    match: '/somepattern/',
                    port: 4567,
                    enable: false,
                    trace: true,
                    tag: { // NOTE: deprecated
                        tenant: 'ten',
                        application: 'app'
                    },
                    actions: [
                        {
                            includeData: {},
                            locations: {
                                '*': true
                            },
                            ifAllMatch: {
                                telemetryEventCategory: 'LTM'
                            }
                        }
                    ]
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    My_Listener_2: {
                        class: 'Telemetry_Listener',
                        match: '/somepattern/',
                        port: 4567,
                        enable: false,
                        trace: true,
                        tag: { // NOTE: deprecated
                            tenant: 'ten',
                            application: 'app'
                        },
                        actions: [
                            {
                                includeData: {},
                                locations: {
                                    '*': true
                                },
                                ifAllMatch: {
                                    telemetryEventCategory: 'LTM'
                                }
                            }
                        ]
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        id: 'My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 4567,
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_2'
                        },
                        match: '/somepattern/',
                        tag: { // NOTE: deprecated
                            tenant: 'ten',
                            application: 'app'
                        },
                        actions: [
                            {
                                enable: true,
                                includeData: {},
                                locations: {
                                    '*': true
                                },
                                ifAllMatch: {
                                    telemetryEventCategory: 'LTM'
                                }
                            }
                        ]
                    },
                    {
                        id: 'My_Namespace::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 4567,
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2'
                        },
                        match: '/somepattern/',
                        tag: { // NOTE: deprecated
                            tenant: 'ten',
                            application: 'app'
                        },
                        actions: [
                            {
                                enable: true,
                                includeData: {},
                                locations: {
                                    '*': true
                                },
                                ifAllMatch: {
                                    telemetryEventCategory: 'LTM'
                                }
                            }
                        ]
                    }
                ]
            }
        },
        {
            name: 'should not create data routes when no Consumers defined',
            declaration: {
                class: 'Telemetry',
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Listener_2: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    My_Listener_2: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        id: 'My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                ]
            }
        },
        {
            name: 'should create data routes when single Consumers defined in each Namespace',
            declaration: {
                class: 'Telemetry',
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Listener_2: {
                    class: 'Telemetry_Listener'
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    My_Listener_2: {
                        class: 'Telemetry_Listener'
                    },
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    My_Listener_2: {
                        class: 'Telemetry_Listener'
                    },
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    My_Listener_1: ['Consumer_1'],
                    My_Listener_2: ['Consumer_1'],
                    'My_Namespace::My_Listener_1': ['My_Namespace::Consumer_1'],
                    'My_Namespace::My_Listener_2': ['My_Namespace::Consumer_1'],
                    'My_Namespace_2::My_Listener_1': ['My_Namespace_2::Consumer_1'],
                    'My_Namespace_2::My_Listener_2': ['My_Namespace_2::Consumer_1']
                },
                components: [
                    {
                        id: 'My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.Consumer_1'
                        },
                        type: 'default'
                    },
                    {
                        id: 'My_Namespace::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace::Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'My_Namespace::Consumer_1',
                        namespace: 'My_Namespace',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::Consumer_1'
                        },
                        type: 'default'
                    },
                    {
                        id: 'My_Namespace_2::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace_2::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace_2::Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'My_Namespace_2::Consumer_1',
                        namespace: 'My_Namespace_2',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::Consumer_1'
                        },
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should create data routes when multiple Consumers and Namespaces defined',
            declaration: {
                class: 'Telemetry',
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Listener_2: {
                    class: 'Telemetry_Listener'
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    My_Listener_2: {
                        class: 'Telemetry_Listener'
                    },
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    My_Listener_2: {
                        class: 'Telemetry_Listener'
                    },
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    My_Listener_1: ['Consumer_1', 'Consumer_2'],
                    My_Listener_2: ['Consumer_1', 'Consumer_2'],
                    'My_Namespace::My_Listener_1': ['My_Namespace::Consumer_1', 'My_Namespace::Consumer_2'],
                    'My_Namespace::My_Listener_2': ['My_Namespace::Consumer_1', 'My_Namespace::Consumer_2'],
                    'My_Namespace_2::My_Listener_1': ['My_Namespace_2::Consumer_1', 'My_Namespace_2::Consumer_2'],
                    'My_Namespace_2::My_Listener_2': ['My_Namespace_2::Consumer_1', 'My_Namespace_2::Consumer_2']
                },
                components: [
                    {
                        id: 'My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.Consumer_1'
                        },
                        type: 'default'
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'Consumer_2',
                        name: 'Consumer_2',
                        traceName: 'Consumer_2',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.Consumer_2'
                        },
                        type: 'default'
                    },
                    {
                        id: 'My_Namespace::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace::Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'My_Namespace::Consumer_1',
                        namespace: 'My_Namespace',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::Consumer_1'
                        },
                        type: 'default'
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace::Consumer_2',
                        name: 'Consumer_2',
                        traceName: 'My_Namespace::Consumer_2',
                        namespace: 'My_Namespace',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::Consumer_2'
                        },
                        type: 'default'
                    },
                    {
                        id: 'My_Namespace_2::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_1'
                        },
                        match: '',
                        tag: {},
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
                    {
                        id: 'My_Namespace_2::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_2'
                        },
                        match: '',
                        tag: {},
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
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace_2::Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'My_Namespace_2::Consumer_1',
                        namespace: 'My_Namespace_2',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::Consumer_1'
                        },
                        type: 'default'
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'My_Namespace_2::Consumer_2',
                        name: 'Consumer_2',
                        traceName: 'My_Namespace_2::Consumer_2',
                        namespace: 'My_Namespace_2',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::Consumer_2'
                        },
                        type: 'default'
                    }
                ]
            }
        }
    ]
};
