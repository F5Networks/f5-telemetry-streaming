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
    name: 'Telemetry_Endpoints normalization',
    tests: [
        {
            name: 'should normalize inline definitions (disabled endpoint)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: {
                        endpointList: {
                            enable: false,
                            basePath: 'mgmt',
                            items: {
                                endpoint1: {
                                    path: 'endpoint1'
                                }
                            }
                        }
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        host: 'host2',
                        systemPoller: {
                            endpointList: {
                                enable: false,
                                basePath: 'mgmt',
                                items: {
                                    endpoint1: {
                                        path: 'endpoint1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_System::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'My_System::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System::SystemPoller_1'
                        },
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
                        endpoints: {}
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1'
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
                        endpoints: {}
                    }
                ]
            }
        },
        {
            name: 'should normalize inline definitions (enabled endpoint)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: {
                        endpointList: {
                            basePath: 'mgmt/',
                            items: {
                                endpoint1: {
                                    path: 'endpoint1'
                                }
                            }
                        }
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        host: 'host2',
                        systemPoller: {
                            endpointList: {
                                basePath: 'mgmt/',
                                items: {
                                    endpoint1: {
                                        path: 'endpoint1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_System::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'My_System::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System::SystemPoller_1'
                        },
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
                        endpoints: {
                            endpoint1: {
                                enable: true,
                                name: 'endpoint1',
                                path: '/mgmt/endpoint1'
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1'
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
                        endpoints: {
                            endpoint1: {
                                enable: true,
                                name: 'endpoint1',
                                path: '/mgmt/endpoint1'
                            }
                        }
                    }
                ]
            }
        },
        {
            name: 'should expand references',
            declaration: {
                class: 'Telemetry',
                Disabled_Endpoints_1: {
                    class: 'Telemetry_Endpoints',
                    enable: false,
                    basePath: 'basePath/',
                    items: {
                        disabledEndpoint: {
                            path: 'disabledEndpoint'
                        }
                    }
                },
                Enabled_Endpoints_1: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    basePath: 'basePath/',
                    items: {
                        enabledEndpoint1: {
                            path: 'enabledEndpoint1'
                        }
                    }
                },
                Enabled_Endpoints_2: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    basePath: 'basePath2/',
                    items: {
                        enabledEndpoint2: {
                            path: '/enabledEndpoint2'
                        }
                    }
                },
                My_System_1: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: {
                        endpointList: 'Enabled_Endpoints_1'
                    }
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    host: 'host2',
                    systemPoller: {
                        endpointList: [
                            'Enabled_Endpoints_1',
                            'Enabled_Endpoints_2/enabledEndpoint2',
                            'Enabled_Endpoints_1',
                            'Enabled_Endpoints_2/enabledEndpoint2',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            {
                                enable: false,
                                items: {
                                    disabledEndpoint_3: {
                                        path: 'disabledEndpoint_3'
                                    }
                                }
                            },
                            {
                                enable: true,
                                items: {
                                    disabledEndpoint_3: {
                                        enable: false,
                                        path: 'disabledEndpoint_3'
                                    }
                                }
                            },
                            {
                                name: 'disabledEndpoint_4',
                                path: 'disabledEndpoint_4',
                                enable: false
                            },
                            {
                                enable: true,
                                basePath: '/basePath4',
                                items: {
                                    enabledEndpoint_4: {
                                        enable: true,
                                        path: 'enabledEndpoint_4'
                                    },
                                    enabledEndpoint_4_2: {
                                        enable: false,
                                        path: 'enabledEndpoint_4_2'
                                    }
                                }
                            },
                            {
                                name: 'enabledEndpoint_5',
                                path: 'enabledEndpoint_5',
                                enable: true
                            }
                        ]
                    }
                },
                My_System_3: {
                    class: 'Telemetry_System',
                    host: 'host3',
                    systemPoller: {
                        endpointList: [
                            'Enabled_Endpoints_1',
                            'Enabled_Endpoints_2/enabledEndpoint2',
                            'Enabled_Endpoints_1',
                            'Enabled_Endpoints_2/enabledEndpoint2',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            'Disabled_Endpoints_1/disabledEndpoint'
                        ]
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Disabled_Endpoints_1: {
                        class: 'Telemetry_Endpoints',
                        enable: false,
                        basePath: 'basePath_2/',
                        items: {
                            disabledEndpoint: {
                                path: 'disabledEndpoint_2'
                            }
                        }
                    },
                    Enabled_Endpoints_1: {
                        class: 'Telemetry_Endpoints',
                        enable: true,
                        basePath: 'basePath_3/',
                        items: {
                            enabledEndpoint1: {
                                path: 'enabledEndpoint1_3'
                            }
                        }
                    },
                    Enabled_Endpoints_2: {
                        class: 'Telemetry_Endpoints',
                        enable: true,
                        basePath: 'basePath_4/',
                        items: {
                            enabledEndpoint2: {
                                path: '/enabledEndpoint_4'
                            }
                        }
                    },
                    My_System_1: {
                        class: 'Telemetry_System',
                        host: 'host4',
                        systemPoller: {
                            endpointList: 'Enabled_Endpoints_1'
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        host: 'host5',
                        systemPoller: {
                            endpointList: [
                                'Enabled_Endpoints_1',
                                'Enabled_Endpoints_2/enabledEndpoint2',
                                'Enabled_Endpoints_1',
                                'Enabled_Endpoints_2/enabledEndpoint2',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                {
                                    enable: false,
                                    items: {
                                        disabledEndpoint_3: {
                                            path: 'disabledEndpoint_3'
                                        }
                                    }
                                },
                                {
                                    enable: true,
                                    items: {
                                        disabledEndpoint_3: {
                                            enable: false,
                                            path: 'disabledEndpoint_3'
                                        }
                                    }
                                },
                                {
                                    name: 'disabledEndpoint_4',
                                    path: 'disabledEndpoint_4',
                                    enable: false
                                },
                                {
                                    enable: true,
                                    basePath: '/basePath4',
                                    items: {
                                        enabledEndpoint_4: {
                                            enable: true,
                                            path: 'enabledEndpoint_4'
                                        },
                                        enabledEndpoint_4_2: {
                                            enable: false,
                                            path: 'enabledEndpoint_4_2'
                                        }
                                    }
                                },
                                {
                                    name: 'enabledEndpoint_5',
                                    path: 'enabledEndpoint_5',
                                    enable: true
                                }
                            ]
                        }
                    },
                    My_System_3: {
                        class: 'Telemetry_System',
                        host: 'host6',
                        systemPoller: {
                            endpointList: [
                                'Enabled_Endpoints_1',
                                'Enabled_Endpoints_2/enabledEndpoint2',
                                'Enabled_Endpoints_1',
                                'Enabled_Endpoints_2/enabledEndpoint2',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                'Disabled_Endpoints_1/disabledEndpoint'
                            ]
                        }
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_System_1::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_1',
                        traceName: 'My_System_1::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_1::SystemPoller_1'
                        },
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
                        endpoints: {
                            enabledEndpoint1: {
                                path: '/basePath/enabledEndpoint1',
                                enable: true,
                                name: 'enabledEndpoint1'
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_System_2::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_2',
                        traceName: 'My_System_2::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_2::SystemPoller_1'
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
                        endpoints: {
                            enabledEndpoint1: {
                                path: '/basePath/enabledEndpoint1',
                                enable: true,
                                name: 'enabledEndpoint1'
                            },
                            enabledEndpoint2: {
                                path: '/basePath2/enabledEndpoint2',
                                enable: true,
                                name: 'enabledEndpoint2'
                            },
                            enabledEndpoint_4: {
                                enable: true,
                                path: '/basePath4/enabledEndpoint_4',
                                name: 'enabledEndpoint_4'
                            },
                            enabledEndpoint_5: {
                                name: 'enabledEndpoint_5',
                                path: '/enabledEndpoint_5',
                                enable: true
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_System_3::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_3',
                        traceName: 'My_System_3::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_System_3::SystemPoller_1'
                        },
                        connection: {
                            host: 'host3',
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
                        endpoints: {
                            enabledEndpoint1: {
                                path: '/basePath/enabledEndpoint1',
                                enable: true,
                                name: 'enabledEndpoint1'
                            },
                            enabledEndpoint2: {
                                path: '/basePath2/enabledEndpoint2',
                                enable: true,
                                name: 'enabledEndpoint2'
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_Namespace::My_System_1::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_1',
                        traceName: 'My_Namespace::My_System_1::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_1::SystemPoller_1'
                        },
                        connection: {
                            host: 'host4',
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
                        endpoints: {
                            enabledEndpoint1: {
                                path: '/basePath_3/enabledEndpoint1_3',
                                enable: true,
                                name: 'enabledEndpoint1'
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_Namespace::My_System_2::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_2',
                        traceName: 'My_Namespace::My_System_2::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_2::SystemPoller_1'
                        },
                        connection: {
                            host: 'host5',
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
                        endpoints: {
                            enabledEndpoint1: {
                                path: '/basePath_3/enabledEndpoint1_3',
                                enable: true,
                                name: 'enabledEndpoint1'
                            },
                            enabledEndpoint2: {
                                path: '/basePath_4/enabledEndpoint_4',
                                enable: true,
                                name: 'enabledEndpoint2'
                            },
                            enabledEndpoint_4: {
                                enable: true,
                                path: '/basePath4/enabledEndpoint_4',
                                name: 'enabledEndpoint_4'
                            },
                            enabledEndpoint_5: {
                                name: 'enabledEndpoint_5',
                                path: '/enabledEndpoint_5',
                                enable: true
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'My_Namespace::My_System_3::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_3',
                        traceName: 'My_Namespace::My_System_3::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_3::SystemPoller_1'
                        },
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
                        },
                        endpoints: {
                            enabledEndpoint1: {
                                path: '/basePath_3/enabledEndpoint1_3',
                                enable: true,
                                name: 'enabledEndpoint1'
                            },
                            enabledEndpoint2: {
                                path: '/basePath_4/enabledEndpoint_4',
                                enable: true,
                                name: 'enabledEndpoint2'
                            }
                        }
                    }
                ]
            }
        }
    ]
};
