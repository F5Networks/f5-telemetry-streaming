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
                    trace: [
                        { type: 'input', path: 'traceInput' },
                        { type: 'output', path: 'trace' }
                    ],
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
                        trace: [
                            { type: 'input', path: 'traceInput' },
                            { type: 'output', path: 'trace' }
                        ],
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
                        id: 'f5telemetry_default::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'output'
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
                        id: 'f5telemetry_default::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 4567,
                        enable: false,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: 'traceInput',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'trace',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: 'traceInput',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'trace',
                            type: 'output'
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
                        id: 'f5telemetry_default::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'output'
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
                        id: 'f5telemetry_default::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_2',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2',
                            type: 'output'
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
                    'f5telemetry_default::My_Listener_1': ['f5telemetry_default::Consumer_1'],
                    'f5telemetry_default::My_Listener_2': ['f5telemetry_default::Consumer_1'],
                    'My_Namespace::My_Listener_1': ['My_Namespace::Consumer_1'],
                    'My_Namespace::My_Listener_2': ['My_Namespace::Consumer_1'],
                    'My_Namespace_2::My_Listener_1': ['My_Namespace_2::Consumer_1'],
                    'My_Namespace_2::My_Listener_2': ['My_Namespace_2::Consumer_1']
                },
                components: [
                    {
                        id: 'f5telemetry_default::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'output'
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
                        id: 'f5telemetry_default::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_2',
                            type: 'output'
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
                        id: 'f5telemetry_default::Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'f5telemetry_default::Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::Consumer_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::Consumer_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace_2::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace_2::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_2',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::Consumer_1',
                            type: 'output'
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
                    'f5telemetry_default::My_Listener_1': ['f5telemetry_default::Consumer_1', 'f5telemetry_default::Consumer_2'],
                    'f5telemetry_default::My_Listener_2': ['f5telemetry_default::Consumer_1', 'f5telemetry_default::Consumer_2'],
                    'My_Namespace::My_Listener_1': ['My_Namespace::Consumer_1', 'My_Namespace::Consumer_2'],
                    'My_Namespace::My_Listener_2': ['My_Namespace::Consumer_1', 'My_Namespace::Consumer_2'],
                    'My_Namespace_2::My_Listener_1': ['My_Namespace_2::Consumer_1', 'My_Namespace_2::Consumer_2'],
                    'My_Namespace_2::My_Listener_2': ['My_Namespace_2::Consumer_1', 'My_Namespace_2::Consumer_2']
                },
                components: [
                    {
                        id: 'f5telemetry_default::My_Listener_1',
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_1',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_1',
                            type: 'output'
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
                        id: 'f5telemetry_default::My_Listener_2',
                        name: 'My_Listener_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Listener_2',
                        class: 'Telemetry_Listener',
                        port: 6514,
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_2',
                            type: 'output'
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
                        id: 'f5telemetry_default::Consumer_1',
                        name: 'Consumer_1',
                        traceName: 'f5telemetry_default::Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::Consumer_1',
                            type: 'output'
                        },
                        type: 'default'
                    },
                    {
                        allowSelfSignedCert: false,
                        class: 'Telemetry_Consumer',
                        enable: true,
                        id: 'f5telemetry_default::Consumer_2',
                        name: 'Consumer_2',
                        traceName: 'f5telemetry_default::Consumer_2',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::Consumer_2',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_2',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::Consumer_1',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::Consumer_2',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace_2::My_Listener_1',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_1',
                            type: 'output'
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
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace_2::My_Listener_2',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace_2::My_Listener_2',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::Consumer_1',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::Consumer_2',
                            type: 'output'
                        },
                        type: 'default'
                    }
                ]
            }
        }
    ]
};
