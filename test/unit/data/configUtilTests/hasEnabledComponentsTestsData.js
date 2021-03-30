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
    name: '.hasEnabledComponents()',
    tests: [
        {
            name: 'should ignore Controls',
            declaration: {
                class: 'Telemetry',
                controls: {
                    class: 'Controls'
                }
            },
            expected: false
        },
        {
            name: 'should return false when has no enabled components',
            declaration: {
                class: 'Telemetry',
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    }
                }
            },
            expected: false
        },
        {
            name: 'should return true when has enabled components',
            declaration: {
                class: 'Telemetry',
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should check components using class filter (string)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            classFilter: 'Telemetry_Consumer',
            expected: true
        },
        {
            name: 'should check components using class filter (function)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            classFilter: c => c.name === 'Consumer_1',
            expected: true
        },
        {
            name: 'should check components using namespace filter (string)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            namespaceFilter: 'f5telemetry_default',
            expected: true
        },
        {
            name: 'should check components using namespace filter (function)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            namespaceFilter: c => c.namespace === 'My_Namespace',
            expected: true
        },
        {
            name: 'should filter components by namespace and class',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            classFilter: 'Telemetry_Consumer',
            namespaceFilter: c => c.namespace === 'f5telemetry_default',
            expected: true
        },
        {
            name: 'should filter components by arbitrary function',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            filter: c => c.name === 'Consumer_1',
            expected: true
        }
    ]
};
