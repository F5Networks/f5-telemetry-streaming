/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

// const constants = require('../../../src/lib/constants');

module.exports = {
    processNamespaceDeclaration: [
        {
            name: 'should process without existing config',
            existingConfig: {
                raw: {},
                normalized: { components: [], mappings: {} }
            },
            input: {
                namespace: 'newNoOther',
                declaration: {
                    class: 'Telemetry_Namespace',
                    Poller: {
                        class: 'Telemetry_System_Poller'
                    }
                }
            },
            expectedOutput: {
                mappings: {
                    uuid1: []
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'Poller',
                        id: 'uuid1',
                        namespace: 'newNoOther',
                        traceName: 'newNoOther::Poller_System::Poller',
                        trace: false,
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
                            tags: undefined,
                            noTMStats: true
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: false,
                        id: 'uuid2',
                        name: 'Poller_System',
                        systemPollers: [
                            'uuid1'
                        ]
                    }
                ]
            }
        },
        {
            name: 'should merge with existing config (default namespace)',
            existingConfig: {
                raw: {
                    class: 'Telemetry',
                    My_System_1: {
                        class: 'Telemetry_System',
                        trace: false
                    }
                },
                normalized: {
                    mappings: {},
                    components: [
                        {
                            name: 'My_System_1',
                            id: 'uuid-abc',
                            namespace: 'f5telemetry_default',
                            class: 'Telemetry_System',
                            enable: true,
                            systemPollers: [],
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            trace: false
                        }
                    ]
                }
            },
            input: {
                namespace: 'newWithDefault',
                declaration: {
                    class: 'Telemetry_Namespace',
                    My_Listener_1: {
                        class: 'Telemetry_Listener'
                    }
                }
            },
            expectedOutput: {
                mappings: { uuid1: [] },
                components: [
                    {
                        name: 'My_System_1',
                        id: 'uuid-abc',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System',
                        enable: true,
                        systemPollers: [],
                        allowSelfSignedCert: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http',
                        trace: false
                    },
                    {
                        class: 'Telemetry_Listener',
                        enable: true,
                        trace: false,
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
                        id: 'uuid1',
                        namespace: 'newWithDefault',
                        tag: {},
                        traceName: 'newWithDefault::My_Listener_1'
                    }
                ]
            }
        },
        {
            name: 'should merge with existing config (different namespace)',
            existingConfig: {
                raw: {
                    class: 'Telemetry',
                    FirstNamespace: {
                        class: 'Telemetry_Namespace',
                        My_System_1: {
                            class: 'Telemetry_System'
                        }
                    }
                },
                normalized: {
                    mappings: {},
                    components: [
                        {
                            name: 'My_System_1',
                            id: 'uuid-first',
                            namespace: 'FirstNamespace',
                            class: 'Telemetry_System',
                            enable: true,
                            systemPollers: [],
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        }
                    ]
                }
            },
            input: {
                namespace: 'SecondNamespace',
                declaration: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System'
                    }
                }
            },
            expectedOutput: {
                mappings: {},
                components: [
                    {
                        name: 'My_System_1',
                        id: 'uuid-first',
                        namespace: 'FirstNamespace',
                        class: 'Telemetry_System',
                        enable: true,
                        systemPollers: [],
                        allowSelfSignedCert: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http'
                    },
                    {
                        name: 'My_System_1',
                        id: 'uuid1',
                        namespace: 'SecondNamespace',
                        class: 'Telemetry_System',
                        enable: true,
                        systemPollers: [],
                        allowSelfSignedCert: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http'
                    }
                ]
            }
        },
        {
            name: 'should update existing namespace config (with config diff)',
            existingConfig: {
                raw: {
                    class: 'Telemetry',
                    SameNamespace: {
                        class: 'Telemetry_Namespace',
                        My_System_1: {
                            class: 'Telemetry_System'
                        }
                    }
                },
                normalized: {
                    mappings: {},
                    components: [
                        {
                            name: 'My_System_1',
                            id: 'uuid-same',
                            namespace: 'SameNamespace',
                            class: 'Telemetry_System',
                            enable: true,
                            systemPollers: [],
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        }
                    ]
                }
            },
            input: {
                namespace: 'SameNamespace',
                declaration: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System',
                        host: 'some.other.host',
                        trace: true
                    }
                }
            },
            expectedOutput: {
                mappings: {},
                components: [
                    {
                        name: 'My_System_1',
                        id: 'uuid1',
                        namespace: 'SameNamespace',
                        class: 'Telemetry_System',
                        enable: true,
                        systemPollers: [],
                        allowSelfSignedCert: false,
                        host: 'some.other.host',
                        port: 8100,
                        protocol: 'http',
                        trace: true
                    }
                ]
            }
        },
        {
            name: 'should update existing namespace config (without config diff)',
            existingConfig: {
                raw: {
                    class: 'Telemetry',
                    SameNamespace: {
                        class: 'Telemetry_Namespace',
                        My_System_1: {
                            class: 'Telemetry_System'
                        }
                    }
                },
                normalized: {
                    mappings: {},
                    components: [
                        {
                            name: 'My_System_1',
                            id: 'uuid-same',
                            namespace: 'SameNamespace',
                            class: 'Telemetry_System',
                            enable: true,
                            systemPollers: [],
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        }
                    ]
                }
            },
            input: {
                namespace: 'SameNamespace',
                declaration: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System'
                    }
                }
            },
            expectedOutput: {
                mappings: {},
                components: [
                    {
                        name: 'My_System_1',
                        id: 'uuid1',
                        namespace: 'SameNamespace',
                        class: 'Telemetry_System',
                        enable: true,
                        systemPollers: [],
                        allowSelfSignedCert: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http'
                    }
                ]
            }
        }
    ]
};
