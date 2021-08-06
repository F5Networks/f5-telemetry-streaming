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
    name: '.mergeDeclaration()',
    tests: [
        {
            name: 'should merge empty declarations',
            baseDeclaration: {
                class: 'Telemetry'
            },
            newDeclaration: {
                class: 'Telemetry'
            },
            expected: {
                mappings: {},
                components: []
            }
        },
        {
            name: 'should merge empty declaration to existing one',
            baseDeclaration: {
                class: 'Telemetry',
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            newDeclaration: {
                class: 'Telemetry'
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_Listener_1': [
                        'f5telemetry_default::My_Consumer_1'
                    ],
                    'My_Namespace::My_Listener_1': [
                        'My_Namespace::My_Consumer_1'
                    ]
                },
                components: [
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        id: 'f5telemetry_default::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        tag: {},
                        traceName: 'f5telemetry_default::My_Listener_1',
                        id: 'f5telemetry_default::My_Listener_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Consumer_1',
                        id: 'My_Namespace::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        tag: {},
                        traceName: 'My_Namespace::My_Listener_1',
                        id: 'My_Namespace::My_Listener_1'
                    }
                ]
            }
        },
        {
            name: 'should merge declaration to empty config',
            baseDeclaration: {
                class: 'Telemetry'
            },
            newDeclaration: {
                class: 'Telemetry',
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_Listener_1': [
                        'f5telemetry_default::My_Consumer_1'
                    ],
                    'My_Namespace::My_Listener_1': [
                        'My_Namespace::My_Consumer_1'
                    ]
                },
                components: [
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        id: 'f5telemetry_default::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        tag: {},
                        traceName: 'f5telemetry_default::My_Listener_1',
                        id: 'f5telemetry_default::My_Listener_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Consumer_1',
                        id: 'My_Namespace::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        tag: {},
                        traceName: 'My_Namespace::My_Listener_1',
                        id: 'My_Namespace::My_Listener_1'
                    }
                ]
            }
        },
        {
            name: 'should merge Namespace to config',
            baseDeclaration: {
                class: 'Telemetry',
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            newDeclaration: {
                class: 'Telemetry',
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_Listener_1': [
                        'f5telemetry_default::My_Consumer_1'
                    ],
                    'My_Namespace::My_Listener_1': [
                        'My_Namespace::My_Consumer_1'
                    ],
                    'My_Namespace_2::My_Listener_1': [
                        'My_Namespace_2::My_Consumer_1'
                    ]
                },
                components: [
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        id: 'f5telemetry_default::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'f5telemetry_default',
                        tag: {},
                        traceName: 'f5telemetry_default::My_Listener_1',
                        id: 'f5telemetry_default::My_Listener_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Consumer_1',
                        id: 'My_Namespace::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace',
                        tag: {},
                        traceName: 'My_Namespace::My_Listener_1',
                        id: 'My_Namespace::My_Listener_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_Consumer_1',
                        id: 'My_Namespace_2::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace_2',
                        tag: {},
                        traceName: 'My_Namespace_2::My_Listener_1',
                        id: 'My_Namespace_2::My_Listener_1'
                    }
                ]
            }
        },
        {
            name: 'should override existing Namespaces to config',
            baseDeclaration: {
                class: 'Telemetry',
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Listener_1: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            newDeclaration: {
                class: 'Telemetry',
                My_Consumer_1_Overwritten: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Listener_1_Overwritten: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer_1_Overwritten: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Listener_1_Overwritten: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_Listener_1_Overwritten': [
                        'f5telemetry_default::My_Consumer_1_Overwritten'
                    ],
                    'My_Namespace::My_Listener_1_Overwritten': [
                        'My_Namespace::My_Consumer_1_Overwritten'
                    ],
                    'My_Namespace_2::My_Listener_1': [
                        'My_Namespace_2::My_Consumer_1'
                    ]
                },
                components: [
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1_Overwritten',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1_Overwritten',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Consumer_1_Overwritten',
                        id: 'f5telemetry_default::My_Consumer_1_Overwritten'
                    },
                    {
                        class: 'Telemetry_Listener',
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_1_Overwritten',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_1_Overwritten',
                            type: 'output'
                        },
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1_Overwritten',
                        namespace: 'f5telemetry_default',
                        tag: {},
                        traceName: 'f5telemetry_default::My_Listener_1_Overwritten',
                        id: 'f5telemetry_default::My_Listener_1_Overwritten'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1_Overwritten',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1_Overwritten',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Consumer_1_Overwritten',
                        id: 'My_Namespace::My_Consumer_1_Overwritten'
                    },
                    {
                        class: 'Telemetry_Listener',
                        enable: true,
                        traceInput: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 9999,
                            path: '/var/tmp/telemetry/INPUT.Telemetry_Listener.My_Namespace::My_Listener_1_Overwritten',
                            type: 'input'
                        },
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Listener.My_Namespace::My_Listener_1_Overwritten',
                            type: 'output'
                        },
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1_Overwritten',
                        namespace: 'My_Namespace',
                        tag: {},
                        traceName: 'My_Namespace::My_Listener_1_Overwritten',
                        id: 'My_Namespace::My_Listener_1_Overwritten'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_Consumer_1',
                        id: 'My_Namespace_2::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Listener',
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
                        port: 6514,
                        match: '',
                        actions: [
                            {
                                setTag: {
                                    tenant: '`T`',
                                    application: '`A`'
                                },
                                enable: true
                            }
                        ],
                        name: 'My_Listener_1',
                        namespace: 'My_Namespace_2',
                        tag: {},
                        traceName: 'My_Namespace_2::My_Listener_1',
                        id: 'My_Namespace_2::My_Listener_1'
                    }
                ]
            }
        }
    ]
};
