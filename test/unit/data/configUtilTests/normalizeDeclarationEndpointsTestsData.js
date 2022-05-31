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
                                },
                                endpoint2: {
                                    path: 'sysStats',
                                    protocol: 'snmp'
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
                                    },
                                    endpoint2: {
                                        path: 'sysStats',
                                        protocol: 'snmp'
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
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
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
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
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
                                },
                                endpoint2: {
                                    path: 'sysStats',
                                    protocol: 'snmp'
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
                                    },
                                    endpoint2: {
                                        path: 'sysStats',
                                        protocol: 'snmp'
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
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
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
                                path: '/mgmt/endpoint1',
                                protocol: 'http'
                            },
                            endpoint2: {
                                enable: true,
                                name: 'endpoint2',
                                path: 'sysStats',
                                protocol: 'snmp'
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
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
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
                                path: '/mgmt/endpoint1',
                                protocol: 'http'
                            },
                            endpoint2: {
                                enable: true,
                                name: 'endpoint2',
                                path: 'sysStats',
                                protocol: 'snmp'
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
                        },
                        disabledSnmpEndpoint: {
                            path: 'disabledSnmpEndpoint',
                            protocol: 'snmp'
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
                        },
                        enabledSnmpEndpoint1: {
                            path: 'enabledSnmpEndpoint1',
                            protocol: 'snmp'
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
                        },
                        enabledSnmpEndpoint2: {
                            path: 'enabledSnmpEndpoint2',
                            protocol: 'snmp'
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
                            'Enabled_Endpoints_2/enabledSnmpEndpoint2',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            'Disabled_Endpoints_1/disabledSnmpEndpoint',
                            {
                                enable: false,
                                items: {
                                    disabledEndpoint_3: {
                                        path: 'disabledEndpoint_3'
                                    },
                                    disabledSnmpEndpoint_3: {
                                        path: 'disabledSnmpEndpoint.3',
                                        protocol: 'snmp'
                                    }
                                }
                            },
                            {
                                enable: true,
                                items: {
                                    disabledEndpoint_3: {
                                        enable: false,
                                        path: 'disabledEndpoint_3'
                                    },
                                    disabledSnmpEndpoint_3: {
                                        enable: false,
                                        path: 'disabledSnmpEndpoint.3',
                                        protocol: 'snmp'
                                    }
                                }
                            },
                            {
                                name: 'disabledEndpoint_4',
                                path: 'disabledEndpoint_4',
                                enable: false
                            },
                            {
                                name: 'disabledSnmpEndpoint_4',
                                path: 'disabledSnmpEndpoint.4',
                                protocol: 'snmp',
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
                                    enabledSnmpEndpoint_4: {
                                        enable: true,
                                        path: 'enabledSnmpEndpoint.4',
                                        protocol: 'snmp'
                                    },
                                    enabledEndpoint_4_2: {
                                        enable: false,
                                        path: 'enabledEndpoint_4_2'
                                    },
                                    disabledSnmpEndpoint_4_2: {
                                        enable: false,
                                        path: 'disabledSnmpEndpoint.4.2',
                                        protocol: 'snmp'
                                    }
                                }
                            },
                            {
                                name: 'enabledEndpoint_5',
                                path: 'enabledEndpoint_5',
                                enable: true
                            },
                            {
                                name: 'enabledSnmpEndpoint_5',
                                path: 'enabledSnmpEndpoint.5',
                                enable: true,
                                protocol: 'snmp'
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
                            'Enabled_Endpoints_2/enabledSnmpEndpoint2',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            'Disabled_Endpoints_1/disabledEndpoint',
                            'Disabled_Endpoints_1/disabledSnmpEndpoint'
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
                            },
                            disabledSnmpEndpoint: {
                                path: 'disabledSnmpEndpoint.2',
                                protocol: 'snmp'
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
                            },
                            enabledSnmpEndpoint: {
                                path: 'enabledSnmpEndpoint1.3',
                                protocol: 'snmp'
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
                            },
                            enabledSnmpEndpoint2: {
                                path: 'enabledSnmpEndpoint.4',
                                protocol: 'snmp'
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
                                'Enabled_Endpoints_2/enabledSnmpEndpoint2',
                                'Enabled_Endpoints_1',
                                'Enabled_Endpoints_2/enabledEndpoint2',
                                'Enabled_Endpoints_2/enabledSnmpEndpoint2',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                'Disabled_Endpoints_1/disabledSnmpEndpoint',
                                'Disabled_Endpoints_1/disabledSnmpEndpoint',
                                {
                                    enable: false,
                                    items: {
                                        disabledEndpoint_3: {
                                            path: 'disabledEndpoint_3'
                                        }
                                    }
                                },
                                {
                                    enable: false,
                                    items: {
                                        disabledSnmpEndpoint_3: {
                                            path: 'disabledSnmpEndpoint.3',
                                            protocol: 'snmp'
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
                                    enable: true,
                                    items: {
                                        disabledSnmpEndpoint_3: {
                                            enable: false,
                                            path: 'disabledSnmpEndpoint.3',
                                            protocol: 'snmp'
                                        }
                                    }
                                },
                                {
                                    name: 'disabledEndpoint_4',
                                    path: 'disabledEndpoint_4',
                                    enable: false
                                },
                                {
                                    name: 'disabledSnmpEndpoint_4',
                                    path: 'disabledSnmpEndpoint.4',
                                    protocol: 'snmp',
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
                                        enabledSnmpEndpoint_4: {
                                            enable: true,
                                            path: 'enabledSnmpEndpoint.4',
                                            protocol: 'snmp'
                                        },
                                        enabledEndpoint_4_2: {
                                            enable: false,
                                            path: 'enabledEndpoint_4_2'
                                        },
                                        enabledSnmpEndpoint_4_2: {
                                            enable: false,
                                            path: 'enabledSnmpEndpoint.4.2',
                                            protocol: 'snmp'
                                        }
                                    }
                                },
                                {
                                    name: 'enabledEndpoint_5',
                                    path: 'enabledEndpoint_5',
                                    enable: true
                                },
                                {
                                    name: 'enabledSnmpEndpoint_5',
                                    path: 'enabledSnmpEndpoint.5',
                                    protocol: 'snmp',
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
                                'Enabled_Endpoints_2/enabledSnmpEndpoint2',
                                'Enabled_Endpoints_1',
                                'Enabled_Endpoints_2/enabledEndpoint2',
                                'Enabled_Endpoints_2/enabledSnmpEndpoint2',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                'Disabled_Endpoints_1/disabledEndpoint',
                                'Disabled_Endpoints_1/disabledSnmpEndpoint',
                                'Disabled_Endpoints_1/disabledSnmpEndpoint'
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
                        id: 'f5telemetry_default::My_System_1::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_1',
                        traceName: 'f5telemetry_default::My_System_1::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_1::SystemPoller_1',
                            type: 'output'
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
                                name: 'enabledEndpoint1',
                                protocol: 'http'
                            },
                            enabledSnmpEndpoint1: {
                                enable: true,
                                name: 'enabledSnmpEndpoint1',
                                path: 'enabledSnmpEndpoint1',
                                protocol: 'snmp'
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::My_System_2::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_2',
                        traceName: 'f5telemetry_default::My_System_2::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_2::SystemPoller_1',
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
                                name: 'enabledEndpoint1',
                                protocol: 'http'
                            },
                            enabledEndpoint2: {
                                path: '/basePath2/enabledEndpoint2',
                                enable: true,
                                name: 'enabledEndpoint2',
                                protocol: 'http'
                            },
                            enabledEndpoint_4: {
                                enable: true,
                                path: '/basePath4/enabledEndpoint_4',
                                name: 'enabledEndpoint_4',
                                protocol: 'http'
                            },
                            enabledEndpoint_5: {
                                name: 'enabledEndpoint_5',
                                path: '/enabledEndpoint_5',
                                enable: true,
                                protocol: 'http'
                            },
                            enabledSnmpEndpoint1: {
                                enable: true,
                                name: 'enabledSnmpEndpoint1',
                                path: 'enabledSnmpEndpoint1',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint2: {
                                enable: true,
                                name: 'enabledSnmpEndpoint2',
                                path: 'enabledSnmpEndpoint2',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint_4: {
                                enable: true,
                                name: 'enabledSnmpEndpoint_4',
                                path: 'enabledSnmpEndpoint.4',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint_5: {
                                enable: true,
                                name: 'enabledSnmpEndpoint_5',
                                path: 'enabledSnmpEndpoint.5',
                                protocol: 'snmp'
                            }
                        }
                    },
                    {
                        enable: true,
                        interval: 300,
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::My_System_3::SystemPoller_1',
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_3',
                        traceName: 'f5telemetry_default::My_System_3::SystemPoller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_3::SystemPoller_1',
                            type: 'output'
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
                                name: 'enabledEndpoint1',
                                protocol: 'http'
                            },
                            enabledEndpoint2: {
                                path: '/basePath2/enabledEndpoint2',
                                enable: true,
                                name: 'enabledEndpoint2',
                                protocol: 'http'
                            },
                            enabledSnmpEndpoint1: {
                                enable: true,
                                name: 'enabledSnmpEndpoint1',
                                path: 'enabledSnmpEndpoint1',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint2: {
                                enable: true,
                                name: 'enabledSnmpEndpoint2',
                                path: 'enabledSnmpEndpoint2',
                                protocol: 'snmp'
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
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_1::SystemPoller_1',
                            type: 'output'
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
                                name: 'enabledEndpoint1',
                                protocol: 'http'
                            },
                            enabledSnmpEndpoint: {
                                enable: true,
                                name: 'enabledSnmpEndpoint',
                                path: 'enabledSnmpEndpoint1.3',
                                protocol: 'snmp'
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
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_2::SystemPoller_1',
                            type: 'output'
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
                                name: 'enabledEndpoint1',
                                protocol: 'http'
                            },
                            enabledEndpoint2: {
                                path: '/basePath_4/enabledEndpoint_4',
                                enable: true,
                                name: 'enabledEndpoint2',
                                protocol: 'http'
                            },
                            enabledEndpoint_4: {
                                enable: true,
                                path: '/basePath4/enabledEndpoint_4',
                                name: 'enabledEndpoint_4',
                                protocol: 'http'
                            },
                            enabledEndpoint_5: {
                                name: 'enabledEndpoint_5',
                                path: '/enabledEndpoint_5',
                                enable: true,
                                protocol: 'http'
                            },
                            enabledSnmpEndpoint: {
                                enable: true,
                                name: 'enabledSnmpEndpoint',
                                path: 'enabledSnmpEndpoint1.3',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint2: {
                                enable: true,
                                name: 'enabledSnmpEndpoint2',
                                path: 'enabledSnmpEndpoint.4',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint_4: {
                                enable: true,
                                name: 'enabledSnmpEndpoint_4',
                                path: 'enabledSnmpEndpoint.4',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint_5: {
                                enable: true,
                                name: 'enabledSnmpEndpoint_5',
                                path: 'enabledSnmpEndpoint.5',
                                protocol: 'snmp'
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
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_3::SystemPoller_1',
                            type: 'output'
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
                                name: 'enabledEndpoint1',
                                protocol: 'http'
                            },
                            enabledEndpoint2: {
                                path: '/basePath_4/enabledEndpoint_4',
                                enable: true,
                                name: 'enabledEndpoint2',
                                protocol: 'http'
                            },
                            enabledSnmpEndpoint: {
                                enable: true,
                                name: 'enabledSnmpEndpoint',
                                path: 'enabledSnmpEndpoint1.3',
                                protocol: 'snmp'
                            },
                            enabledSnmpEndpoint2: {
                                enable: true,
                                name: 'enabledSnmpEndpoint2',
                                path: 'enabledSnmpEndpoint.4',
                                protocol: 'snmp'
                            }
                        }
                    }
                ]
            }
        }
    ]
};
