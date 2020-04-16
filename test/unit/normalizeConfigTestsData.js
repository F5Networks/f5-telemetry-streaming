/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    /**
     * TEST SET DATA STARTS HERE
     * */
    emptyDeclaration: {
        name: 'Empty Declaration',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should normalize empty declaration',
                declaration: {
                    class: 'Telemetry'
                },
                expected: {}
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    keepDataUnmodified: {
        name: 'Ignore certain classes',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should ignore Telemetry_Listener, Telemetry_iHealth_Poller, Controls classes',
                declaration: {
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        logLevel: 'debug',
                        debug: true
                    },
                    My_Listener: {
                        class: 'Telemetry_Listener'
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'passphrase'
                        },
                        interval: {
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        }
                    }
                },
                expected: {
                    Controls: {
                        controls: {
                            class: 'Controls',
                            logLevel: 'debug',
                            debug: true
                        }
                    },
                    Telemetry_Listener: {
                        My_Listener: {
                            class: 'Telemetry_Listener',
                            enable: true,
                            trace: false,
                            match: '',
                            port: 6514,
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
                    },
                    Telemetry_iHealth_Poller: {
                        My_iHealth_Poller: {
                            class: 'Telemetry_iHealth_Poller',
                            enable: true,
                            trace: false,
                            passphrase: 'passphrase',
                            username: 'username',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    end: '03:00',
                                    start: '00:00'
                                }
                            }
                        }
                    }
                }
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    systemPollerNormalization: {
        name: 'Telemetry_System_Poller normalization',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should convert Telemetry_System_Poller to Telemetry_System',
                declaration: {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller'
                    }
                },
                expected: {
                    Telemetry_System: {
                        My_Poller: {
                            class: 'Telemetry_System',
                            name: 'My_Poller',
                            enable: true,
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'My_Poller',
                                    enable: true,
                                    interval: 300,
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
                    }
                }
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should convert Telemetry_System_Poller to Telemetry_System and copy properties',
                declaration: {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        allowSelfSignedCert: true,
                        trace: 'something',
                        username: 'username',
                        passphrase: {
                            cipherText: 'passphrase'
                        },
                        host: '1.1.1.1',
                        port: 443,
                        interval: 10,
                        protocol: 'https',
                        tag: {
                            tag: 'tag'
                        },
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
                    }
                },
                expected: {
                    Telemetry_System: {
                        My_Poller: {
                            class: 'Telemetry_System',
                            name: 'My_Poller',
                            enable: false,
                            allowSelfSignedCert: true,
                            trace: 'something',
                            username: 'username',
                            passphrase: 'passphrase',
                            host: '1.1.1.1',
                            port: 443,
                            protocol: 'https',
                            systemPollers: [
                                {
                                    name: 'My_Poller',
                                    enable: false,
                                    trace: 'something',
                                    interval: 10,
                                    tag: {
                                        tag: 'tag'
                                    },
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                tag: 'tag'
                                            }
                                        }
                                    ],
                                    endpoints: {
                                        endpoint1: {
                                            enable: true,
                                            name: 'endpoint1',
                                            path: '/endpoint1'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    systemNormalization: {
        name: 'Telemetry_System normalization',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should avoid name dups for anonymous pollers',
                declaration: {
                    class: 'Telemetry',
                    SystemPoller_1: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System_1: {
                        class: 'Telemetry_System',
                        systemPoller: [
                            'SystemPoller_1',
                            {
                                interval: 180
                            }
                        ]
                    }
                },
                expected: {
                    Telemetry_System: {
                        My_System_1: {
                            class: 'Telemetry_System',
                            name: 'My_System_1',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 300,
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
                                    name: 'SystemPoller_2',
                                    enable: true,
                                    interval: 180,
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
                    }
                }
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should normalize multiple Telemetry_System objects',
                declaration: {
                    class: 'Telemetry',
                    My_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        trace: false
                    },
                    My_Poller_2: {
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        allowSelfSignedCert: true,
                        trace: 'something',
                        host: '1.1.1.1',
                        port: 443,
                        interval: 10,
                        protocol: 'https',
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
                    My_Poller_3: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System_1: {
                        class: 'Telemetry_System'
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        allowSelfSignedCert: true,
                        enable: false,
                        trace: 'something',
                        host: '1.1.1.1',
                        port: 443,
                        protocol: 'https'
                    },
                    My_System_3: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 500
                        }
                    },
                    My_System_4: {
                        class: 'Telemetry_System',
                        systemPoller: [
                            {
                                interval: 500
                            }
                        ]
                    },
                    My_System_5: {
                        class: 'Telemetry_System',
                        systemPoller: [
                            {
                                interval: 500
                            },
                            'My_Poller_3'
                        ]
                    },
                    My_System_6: {
                        class: 'Telemetry_System',
                        systemPoller: [
                            'My_Poller_2',
                            'My_Poller_3'
                        ]
                    },
                    My_System_7: {
                        class: 'Telemetry_System',
                        systemPoller: [
                            'My_Poller_2',
                            'My_Poller_3'
                        ]
                    }
                },
                expected: {
                    Telemetry_System: {
                        My_Poller_1: {
                            class: 'Telemetry_System',
                            name: 'My_Poller_1',
                            enable: true,
                            allowSelfSignedCert: false,
                            trace: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'My_Poller_1',
                                    enable: true,
                                    interval: 300,
                                    trace: false,
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
                        },
                        My_System_1: {
                            class: 'Telemetry_System',
                            name: 'My_System_1',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: []
                        },
                        My_System_2: {
                            class: 'Telemetry_System',
                            name: 'My_System_2',
                            allowSelfSignedCert: true,
                            enable: false,
                            trace: 'something',
                            host: '1.1.1.1',
                            port: 443,
                            protocol: 'https',
                            systemPollers: []
                        },
                        My_System_3: {
                            class: 'Telemetry_System',
                            name: 'My_System_3',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 500,
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
                        },
                        My_System_4: {
                            class: 'Telemetry_System',
                            name: 'My_System_4',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 500,
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
                        },
                        My_System_5: {
                            class: 'Telemetry_System',
                            name: 'My_System_5',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 500,
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
                                    name: 'My_Poller_3',
                                    enable: true,
                                    interval: 300,
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
                        },
                        My_System_6: {
                            class: 'Telemetry_System',
                            name: 'My_System_6',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'My_Poller_2',
                                    enable: false,
                                    trace: 'something',
                                    interval: 10,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                tag: 'tag'
                                            }
                                        }
                                    ],
                                    endpoints: {
                                        endpoint1: {
                                            enable: true,
                                            name: 'endpoint1',
                                            path: '/endpoint1'
                                        }
                                    }
                                },
                                {
                                    name: 'My_Poller_3',
                                    enable: true,
                                    interval: 300,
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
                        },
                        My_System_7: {
                            class: 'Telemetry_System',
                            name: 'My_System_7',
                            allowSelfSignedCert: false,
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'My_Poller_2',
                                    enable: false,
                                    trace: 'something',
                                    interval: 10,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                tag: 'tag'
                                            }
                                        }
                                    ],
                                    endpoints: {
                                        endpoint1: {
                                            enable: true,
                                            name: 'endpoint1',
                                            path: '/endpoint1'
                                        }
                                    }
                                },
                                {
                                    name: 'My_Poller_3',
                                    enable: true,
                                    interval: 300,
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
                    }
                }
            }
        ]
    },
    /**
     * TEST SET DATA STARTS HERE
     * */
    endpointsNormalization: {
        name: 'Telemetry_Endpoints normalization',
        tests: [
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should normalize inline definitions (disabled endpoint)',
                declaration: {
                    class: 'Telemetry',
                    My_System: {
                        class: 'Telemetry_System',
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
                },
                expected: {
                    Telemetry_System: {
                        My_System: {
                            class: 'Telemetry_System',
                            name: 'My_System',
                            enable: true,
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 300,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ],
                                    endpoints: {}
                                }
                            ]
                        }
                    }
                }
            },
            /**
             * TEST DATA STARTS HERE
             * */
            {
                name: 'should normalize inline definitions (enabled endpoint)',
                declaration: {
                    class: 'Telemetry',
                    My_System: {
                        class: 'Telemetry_System',
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
                },
                expected: {
                    Telemetry_System: {
                        My_System: {
                            class: 'Telemetry_System',
                            name: 'My_System',
                            enable: true,
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 300,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ],
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
                    }
                }
            },
            /**
             * TEST DATA STARTS HERE
             * */
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
                        systemPoller: {
                            endpointList: 'Enabled_Endpoints_1'
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
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
                },
                expected: {
                    Telemetry_Endpoints: {
                        Disabled_Endpoints_1: {
                            class: 'Telemetry_Endpoints',
                            enable: false,
                            basePath: 'basePath/',
                            items: {
                                disabledEndpoint: {
                                    enable: true,
                                    path: 'disabledEndpoint'
                                }
                            }
                        },
                        Enabled_Endpoints_1: {
                            class: 'Telemetry_Endpoints',
                            enable: true,
                            basePath: '/basePath',
                            items: {
                                enabledEndpoint1: {
                                    enable: true,
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
                                    enable: true,
                                    path: '/enabledEndpoint2'
                                }
                            }
                        }
                    },
                    Telemetry_System: {
                        My_System_1: {
                            class: 'Telemetry_System',
                            name: 'My_System_1',
                            enable: true,
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 300,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ],
                                    endpoints: {
                                        enabledEndpoint1: {
                                            enable: true,
                                            name: 'enabledEndpoint1',
                                            path: '/basePath/enabledEndpoint1'
                                        }
                                    }
                                }
                            ]
                        },
                        My_System_2: {
                            class: 'Telemetry_System',
                            name: 'My_System_2',
                            enable: true,
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 300,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ],
                                    endpoints: {
                                        enabledEndpoint1: {
                                            enable: true,
                                            name: 'enabledEndpoint1',
                                            path: '/basePath/enabledEndpoint1'
                                        },
                                        enabledEndpoint2: {
                                            enable: true,
                                            name: 'enabledEndpoint2',
                                            path: '/basePath2/enabledEndpoint2'
                                        },
                                        enabledEndpoint_4: {
                                            enable: true,
                                            name: 'enabledEndpoint_4',
                                            path: '/basePath4/enabledEndpoint_4'
                                        },
                                        enabledEndpoint_5: {
                                            enable: true,
                                            name: 'enabledEndpoint_5',
                                            path: '/enabledEndpoint_5'
                                        }
                                    }
                                }
                            ]
                        },
                        My_System_3: {
                            class: 'Telemetry_System',
                            name: 'My_System_3',
                            enable: true,
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPollers: [
                                {
                                    name: 'SystemPoller_1',
                                    enable: true,
                                    interval: 300,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ],
                                    endpoints: {
                                        enabledEndpoint1: {
                                            enable: true,
                                            name: 'enabledEndpoint1',
                                            path: '/basePath/enabledEndpoint1'
                                        },
                                        enabledEndpoint2: {
                                            enable: true,
                                            name: 'enabledEndpoint2',
                                            path: '/basePath2/enabledEndpoint2'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        ]
    }
};
