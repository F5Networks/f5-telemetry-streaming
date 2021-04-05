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
    name: '.getComponents()',
    tests: [
        {
            name: 'should return all components',
            declaration: {
                class: 'Telemetry',
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: [
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'Consumer_1',
                    namespace: 'f5telemetry_default',
                    trace: false,
                    type: 'default'
                },
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'My_Namespace::Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'My_Namespace::Consumer_1',
                    namespace: 'My_Namespace',
                    trace: false,
                    type: 'default'
                }
            ]
        },
        {
            name: 'should filter components by class (string)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
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
            classFilter: 'Telemetry_Consumer',
            expected: [
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'Consumer_1',
                    namespace: 'f5telemetry_default',
                    trace: false,
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
                    trace: false,
                    type: 'default'
                },
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'My_Namespace::Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'My_Namespace::Consumer_1',
                    namespace: 'My_Namespace',
                    trace: false,
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
                    trace: false,
                    type: 'default'
                }
            ]
        },
        {
            name: 'should filter components by class (function)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
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
            classFilter: c => c.name === 'Consumer_1',
            expected: [
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'Consumer_1',
                    namespace: 'f5telemetry_default',
                    trace: false,
                    type: 'default'
                },
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'My_Namespace::Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'My_Namespace::Consumer_1',
                    namespace: 'My_Namespace',
                    trace: false,
                    type: 'default'
                }
            ]
        },
        {
            name: 'should filter components by namespace (string)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
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
            namespaceFilter: 'f5telemetry_default',
            expected: [
                {
                    class: 'Telemetry_Listener',
                    actions: [
                        {
                            enable: true,
                            setTag: {
                                application: '`A`',
                                tenant: '`T`'
                            }
                        }
                    ],
                    enable: true,
                    id: 'Listener1',
                    match: '',
                    name: 'Listener1',
                    namespace: 'f5telemetry_default',
                    port: 6514,
                    tag: {},
                    trace: false,
                    traceName: 'Listener1'
                },
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'Consumer_1',
                    namespace: 'f5telemetry_default',
                    trace: false,
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
                    trace: false,
                    type: 'default'
                }
            ]
        },
        {
            name: 'should filter components by namespace (function)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
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
            namespaceFilter: c => c.namespace === 'My_Namespace',
            expected: [
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'My_Namespace::Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'My_Namespace::Consumer_1',
                    namespace: 'My_Namespace',
                    trace: false,
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
                    trace: false,
                    type: 'default'
                }
            ]
        },
        {
            name: 'should filter components by namespace and class',
            declaration: {
                class: 'Telemetry',
                Listener1: {
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
            classFilter: 'Telemetry_Consumer',
            namespaceFilter: c => c.namespace === 'f5telemetry_default',
            expected: [
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'Consumer_1',
                    namespace: 'f5telemetry_default',
                    trace: false,
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
                    trace: false,
                    type: 'default'
                }
            ]
        },
        {
            name: 'should filter components using arbitrary function',
            declaration: {
                class: 'Telemetry',
                Listener1: {
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
            filter: c => c.name === 'Consumer_1',
            expected: [
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'Consumer_1',
                    namespace: 'f5telemetry_default',
                    trace: false,
                    type: 'default'
                },
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    id: 'My_Namespace::Consumer_1',
                    name: 'Consumer_1',
                    traceName: 'My_Namespace::Consumer_1',
                    namespace: 'My_Namespace',
                    trace: false,
                    type: 'default'
                }
            ]
        }
    ]
};
