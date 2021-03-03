/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('../../../src/lib/constants');

module.exports = {
    componentizeConfig: [
        {
            name: 'it should normalize simple config with only the default namespace (unnamed, top level)',
            inputDecl: {
                Consumer1: {
                    class: 'Telemetry_Consumer'
                },
                Poller1: {
                    class: 'Telemetry_System_Poller',
                    enabled: false
                },
                Listener1: {
                    class: 'Telemetry_Listener'
                }
            },
            expected: {
                mappings: {
                    uuid2: ['uuid1'],
                    uuid3: ['uuid1']
                },
                components: [
                    {
                        id: 'uuid1',
                        name: 'Consumer1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Telemetry_Consumer'
                    },
                    {
                        id: 'uuid2',
                        name: 'Poller1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Telemetry_System_Poller',
                        enabled: false
                    },
                    {
                        id: 'uuid3',
                        name: 'Listener1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Telemetry_Listener'
                    }
                ]
            }
        },
        {
            name: 'should normalize config with namespaces (no default)',
            inputDecl: {
                Namespace1: {
                    class: 'Telemetry_Namespace',
                    Consumer1: {
                        class: 'Telemetry_Consumer'
                    },
                    Poller1: {
                        class: 'Telemetry_System_Poller'
                    }
                },
                Namespace2: {
                    class: 'Telemetry_Namespace',
                    Poller1: {
                        class: 'Telemetry_System_Poller'
                    }
                }
            },
            expected: {
                mappings: {
                    uuid2: ['uuid1'],
                    uuid3: []
                },
                components: [
                    {
                        id: 'uuid1',
                        name: 'Consumer1',
                        namespace: 'Namespace1',
                        class: 'Telemetry_Consumer'
                    },
                    {
                        id: 'uuid2',
                        name: 'Poller1',
                        namespace: 'Namespace1',
                        class: 'Telemetry_System_Poller'
                    },
                    {
                        id: 'uuid3',
                        name: 'Poller1',
                        namespace: 'Namespace2',
                        class: 'Telemetry_System_Poller'
                    }
                ]
            }
        },
        {
            name: 'should normalize config with mixed namespaces (default and named)',
            inputDecl: {
                Controls: {
                    class: 'Controls'
                },
                Consumer1: {
                    class: 'Telemetry_Consumer'
                },
                Consumer2: {
                    class: 'Telemetry_Consumer'
                },
                Poller1: {
                    class: 'Telemetry_System_Poller'
                },
                TisAMixer: {
                    class: 'Telemetry_Namespace',
                    Consumer1: {
                        class: 'Telemetry_Consumer'
                    },
                    Poller1: {
                        class: 'Telemetry_System_Poller'
                    }
                }
            },
            expected: {
                mappings: {
                    uuid4: ['uuid2', 'uuid3'],
                    uuid6: ['uuid5']

                },
                components: [
                    {
                        id: 'uuid1',
                        name: 'Controls',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Controls'
                    },
                    {
                        id: 'uuid2',
                        name: 'Consumer1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Telemetry_Consumer'
                    },
                    {
                        id: 'uuid3',
                        name: 'Consumer2',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Telemetry_Consumer'
                    },
                    {
                        id: 'uuid4',
                        name: 'Poller1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        class: 'Telemetry_System_Poller'
                    },
                    {
                        id: 'uuid5',
                        name: 'Consumer1',
                        namespace: 'TisAMixer',
                        class: 'Telemetry_Consumer'
                    },
                    {
                        id: 'uuid6',
                        name: 'Poller1',
                        namespace: 'TisAMixer',
                        class: 'Telemetry_System_Poller'
                    }
                ]
            }
        },
        {
            name: 'should normalize config with pull consumer',
            inputDecl: {
                Namespace1: {
                    class: 'Telemetry_Namespace',
                    PullConsumer1: {
                        class: 'Telemetry_Pull_Consumer',
                        systemPoller: 'Poller1'
                    },
                    Poller1: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    }
                }
            },
            expected: {
                mappings: {
                    uuid1: ['uuid2'],
                    uuid2: []
                },
                components: [
                    {
                        id: 'uuid1',
                        name: 'PullConsumer1',
                        namespace: 'Namespace1',
                        class: 'Telemetry_Pull_Consumer',
                        systemPoller: 'Poller1'
                    },
                    {
                        id: 'uuid2',
                        name: 'Poller1',
                        namespace: 'Namespace1',
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    }
                ]
            }
        },
        {
            name: 'it should normalize config with both system poller and system',
            inputDecl: {
                class: 'Telemetry',
                Consumer1: {
                    class: 'Telemetry_Consumer'
                },
                Poller1: {
                    class: 'Telemetry_System_Poller'
                },
                System1: {
                    class: 'Telemetry_System',
                    systemPoller: 'Poller1'
                }
            },
            expected: {
                mappings: {
                    // note that only poller is mapped
                    uuid2: ['uuid1']
                },
                components: [
                    {
                        class: 'Telemetry_Consumer',
                        id: 'uuid1',
                        name: 'Consumer1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'uuid2',
                        name: 'Poller1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                    },
                    {
                        class: 'Telemetry_System',
                        id: 'uuid3',
                        name: 'System1',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        systemPoller: 'Poller1'
                    }
                ]
            }
        }
    ],
    normalizeComponents: {
    // **NOTE** While normalizeComponents accepts a config that has been pre-parsed
    // the input here is a declaration to help illustrate userInput -> normalized
    // we perform the expansion and parsing in the test setup
        emptyDeclaration: {
            name: 'Empty Declaration',
            tests: [
                {
                    name: 'should normalize empty declaration',
                    declaration: {
                        class: 'Telemetry'
                    },
                    expected: {
                        components: [],
                        mappings: {}
                    }
                }
            ]
        },
        keepDataUnmodified: {
            name: 'Ignore certain classes',
            tests: [
                {
                    name: 'should ignore Controls classes',
                    declaration: {
                        class: 'Telemetry',
                        controls: {
                            class: 'Controls',
                            logLevel: 'debug',
                            debug: true
                        }
                    },
                    expected: {
                        mappings: {},
                        components: [
                            {
                                class: 'Controls',
                                logLevel: 'debug',
                                debug: true,
                                name: 'controls',
                                id: 'uuid1',
                                memoryThresholdPercent: constants.APP_THRESHOLDS.MEMORY.DEFAULT_LIMIT_PERCENT,
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                            }
                        ]
                    }
                }
            ]
        },
        iHealthPollerNormalization: {
            name: 'Telemetry_iHealth_Poller normalization',
            tests: [
                {
                    name: 'should normalize nested iHealth Poller and nested System Poller',
                    declaration: {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            enable: true,
                            iHealthPoller: {
                                username: 'IHEALTH_ACCOUNT_USERNAME',
                                passphrase: {
                                    cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                                },
                                interval: {
                                    timeWindow: {
                                        start: '23:15',
                                        end: '02:15'
                                    }
                                }
                            },
                            systemPoller: {
                                interval: 60
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: [],
                            uuid3: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: ['uuid2'],
                                iHealthPoller: 'uuid3'
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                connection: {
                                    allowSelfSignedCert: false,
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                },
                                credentials: {
                                    passphrase: undefined,
                                    username: undefined
                                },
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
                                enable: true,
                                id: 'uuid2',
                                interval: 60,
                                name: 'SystemPoller_1',
                                namespace: 'f5telemetry_default',
                                trace: false,
                                traceName: 'My_System::SystemPoller_1'
                            },
                            {
                                class: 'Telemetry_iHealth_Poller',
                                name: 'iHealthPoller_1',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'iHealthPoller_1',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid3',
                                namespace: 'f5telemetry_default'
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize referenced ihealth poller',
                    declaration: {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            iHealthPoller: 'My_iHealth_Poller'
                        },
                        My_iHealth_Poller: {
                            class: 'Telemetry_iHealth_Poller',
                            username: 'IHEALTH_ACCOUNT_USERNAME',
                            passphrase: {
                                cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid2'
                            },
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid2',
                                name: 'My_iHealth_Poller',
                                namespace: 'f5telemetry_default'
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize ihealth poller referenced by multiple systems',
                    declaration: {
                        class: 'Telemetry',
                        My_System_1: {
                            class: 'Telemetry_System',
                            host: '192.168.1.14',
                            enable: true,
                            trace: false,
                            iHealthPoller: 'My_iHealth_Poller'
                        },
                        My_System_2: {
                            class: 'Telemetry_System',
                            host: '192.168.1.15',
                            enable: false,
                            trace: true,
                            iHealthPoller: 'My_iHealth_Poller'
                        },
                        My_iHealth_Poller: {
                            class: 'Telemetry_iHealth_Poller',
                            enable: true,
                            trace: true,
                            username: 'IHEALTH_ACCOUNT_USERNAME',
                            passphrase: {
                                cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid3: [],
                            uuid4: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: '192.168.1.14',
                                port: 8100,
                                protocol: 'http',
                                trace: false,
                                allowSelfSignedCert: false,
                                name: 'My_System_1',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid3'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: false,
                                host: '192.168.1.15',
                                port: 8100,
                                protocol: 'http',
                                trace: true,
                                allowSelfSignedCert: false,
                                name: 'My_System_2',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid4'
                            },
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: '192.168.1.14',
                                    name: 'My_System_1',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid3',
                                name: 'My_iHealth_Poller',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: false,
                                trace: true,
                                iHealth: {
                                    name: 'My_iHealth_Poller',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: '192.168.1.15',
                                    name: 'My_System_2',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid4',
                                name: 'My_iHealth_Poller',
                                namespace: 'f5telemetry_default'
                            }
                        ]
                    }
                },
                {
                    name: 'should create new Telemetry_System for each unbound iHealthPoller',
                    declaration: {
                        class: 'Telemetry',
                        My_iHealth_Poller_1: {
                            class: 'Telemetry_iHealth_Poller',
                            username: 'IHEALTH_ACCOUNT_USERNAME',
                            passphrase: {
                                cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        My_iHealth_Poller_2: {
                            class: 'Telemetry_iHealth_Poller',
                            username: 'IHEALTH_ACCOUNT_USERNAME',
                            passphrase: {
                                cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: [],
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller_1',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_iHealth_Poller_1_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid1',
                                name: 'My_iHealth_Poller_1',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller_2',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_iHealth_Poller_2_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid2',
                                name: 'My_iHealth_Poller_2',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                trace: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_iHealth_Poller_1_System',
                                id: 'uuid3',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid1'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                trace: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_iHealth_Poller_2_System',
                                id: 'uuid4',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid2'
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize ihealth poller without an explicit System',
                    declaration: {
                        class: 'Telemetry',
                        My_iHealth_Poller: {
                            class: 'Telemetry_iHealth_Poller',
                            username: 'IHEALTH_ACCOUNT_USERNAME',
                            passphrase: {
                                cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: []
                        },
                        components: [
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_iHealth_Poller_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid1',
                                name: 'My_iHealth_Poller',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                trace: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_iHealth_Poller_System',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid1'
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize ihealth poller in a Namespace',
                    declaration: {
                        class: 'Telemetry',
                        My_Namespace: {
                            class: 'Telemetry_Namespace',
                            My_iHealth_Poller: {
                                class: 'Telemetry_iHealth_Poller',
                                username: 'IHEALTH_ACCOUNT_USERNAME',
                                passphrase: {
                                    cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                                },
                                interval: {
                                    timeWindow: {
                                        start: '23:15',
                                        end: '02:15'
                                    }
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: []
                        },
                        components: [
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_iHealth_Poller_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid1',
                                name: 'My_iHealth_Poller',
                                namespace: 'My_Namespace'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                trace: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_iHealth_Poller_System',
                                id: 'uuid2',
                                namespace: 'My_Namespace',
                                systemPollers: [],
                                iHealthPoller: 'uuid1'
                            }
                        ]
                    }
                },
                {
                    name: 'should assign correct mappings',
                    declaration: {
                        class: 'Telemetry',
                        My_iHealth_Poller: {
                            class: 'Telemetry_iHealth_Poller',
                            username: 'IHEALTH_ACCOUNT_USERNAME',
                            passphrase: {
                                cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        My_Consumer_1: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            protocol: 'https'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: ['uuid2']
                        },
                        components: [
                            {
                                class: 'Telemetry_iHealth_Poller',
                                enable: true,
                                trace: false,
                                iHealth: {
                                    name: 'My_iHealth_Poller',
                                    credentials: {
                                        username: 'IHEALTH_ACCOUNT_USERNAME',
                                        passphrase: {
                                            cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE',
                                            class: 'Secret',
                                            protected: 'SecureVault'
                                        }
                                    },
                                    downloadFolder: undefined,
                                    interval: {
                                        day: undefined,
                                        frequency: 'daily',
                                        timeWindow: {
                                            start: '23:15',
                                            end: '02:15'
                                        }
                                    },
                                    proxy: {
                                        connection: {
                                            host: undefined,
                                            port: undefined,
                                            protocol: undefined,
                                            allowSelfSignedCert: undefined
                                        },
                                        credentials: {
                                            username: undefined,
                                            passphrase: undefined
                                        }
                                    }
                                },
                                system: {
                                    host: 'localhost',
                                    name: 'My_iHealth_Poller_System',
                                    connection: {
                                        port: 8100,
                                        protocol: 'http',
                                        allowSelfSignedCert: false
                                    },
                                    credentials: {
                                        username: undefined,
                                        passphrase: undefined
                                    }
                                },
                                id: 'uuid1',
                                name: 'My_iHealth_Poller',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_Consumer',
                                type: 'Generic_HTTP',
                                host: '192.0.2.1',
                                protocol: 'https',
                                enable: true,
                                trace: false,
                                allowSelfSignedCert: false,
                                port: 443,
                                path: '/',
                                method: 'POST',
                                name: 'My_Consumer_1',
                                traceName: 'My_Consumer_1',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                trace: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_iHealth_Poller_System',
                                id: 'uuid3',
                                namespace: 'f5telemetry_default',
                                systemPollers: [],
                                iHealthPoller: 'uuid1'
                            }
                        ]
                    }
                }
            ]
        },
        eventListenerNormalization: {
            name: 'Telemetry_Listener normalization',
            tests: [
                {
                    name: 'should assign new properties and defaults with minimal listener config',
                    declaration: {
                        class: 'Telemetry',
                        My_Listener_1: {
                            class: 'Telemetry_Listener'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: []
                        },
                        components: [
                            {
                                id: 'uuid1',
                                name: 'My_Listener_1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_Listener_1',
                                class: 'Telemetry_Listener',
                                port: 6514,
                                enable: true,
                                trace: false,
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
                    name: 'should process multiple listeners and assign mappings',
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
                        Consumer_1: {
                            class: 'Telemetry_Consumer',
                            type: 'default'
                        },
                        Consumer_2: {
                            class: 'Telemetry_Consumer',
                            type: 'default'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: ['uuid3', 'uuid4'],
                            uuid2: ['uuid3', 'uuid4']
                        },
                        components: [
                            {
                                id: 'uuid1',
                                name: 'My_Listener_1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_Listener_1',
                                class: 'Telemetry_Listener',
                                port: 6514,
                                enable: true,
                                trace: false,
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
                                id: 'uuid2',
                                name: 'My_Listener_2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_Listener_2',
                                class: 'Telemetry_Listener',
                                port: 4567,
                                enable: false,
                                trace: true,
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
                                allowSelfSignedCert: false,
                                class: 'Telemetry_Consumer',
                                enable: true,
                                id: 'uuid3',
                                name: 'Consumer_1',
                                traceName: 'Consumer_1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                trace: false,
                                type: 'default'
                            },
                            {
                                allowSelfSignedCert: false,
                                class: 'Telemetry_Consumer',
                                enable: true,
                                id: 'uuid4',
                                name: 'Consumer_2',
                                traceName: 'Consumer_2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                trace: false,
                                type: 'default'
                            }
                        ]
                    }
                },
                {
                    name: 'should process listener in a Namespace',
                    declaration: {
                        class: 'Telemetry',
                        My_Namespace: {
                            class: 'Telemetry_Namespace',
                            My_Listener_1: {
                                class: 'Telemetry_Listener'
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: []
                        },
                        components: [
                            {
                                id: 'uuid1',
                                name: 'My_Listener_1',
                                namespace: 'My_Namespace',
                                traceName: 'My_Namespace::My_Listener_1',
                                class: 'Telemetry_Listener',
                                port: 6514,
                                enable: true,
                                trace: false,
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
                    name: 'should process listeners multiple Namespaces',
                    declaration: {
                        class: 'Telemetry',
                        Listener_With_Same_Name: {
                            class: 'Telemetry_Listener'
                        },
                        My_Namespace_1: {
                            class: 'Telemetry_Namespace',
                            Listener_With_Same_Name: {
                                class: 'Telemetry_Listener'
                            }
                        },
                        My_Namespace_2: {
                            class: 'Telemetry_Namespace',
                            My_Listener: {
                                class: 'Telemetry_Listener'
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: [],
                            uuid2: [],
                            uuid3: []
                        },
                        components: [
                            {
                                id: 'uuid1',
                                name: 'Listener_With_Same_Name',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'Listener_With_Same_Name',
                                class: 'Telemetry_Listener',
                                port: 6514,
                                enable: true,
                                trace: false,
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
                                id: 'uuid2',
                                name: 'Listener_With_Same_Name',
                                namespace: 'My_Namespace_1',
                                traceName: 'My_Namespace_1::Listener_With_Same_Name',
                                class: 'Telemetry_Listener',
                                port: 6514,
                                enable: true,
                                trace: false,
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
                                id: 'uuid3',
                                name: 'My_Listener',
                                namespace: 'My_Namespace_2',
                                traceName: 'My_Namespace_2::My_Listener',
                                class: 'Telemetry_Listener',
                                port: 6514,
                                enable: true,
                                trace: false,
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
                }
            ]
        },
        systemPollerNormalization: {
            name: 'Telemetry_System_Poller normalization',
            tests: [
                {
                    name: 'should create new Telemetry_System for each unbound Telemetry_System_Poller',
                    declaration: {
                        class: 'Telemetry',
                        My_Poller_1: {
                        // uuid1
                            class: 'Telemetry_System_Poller',
                            trace: true,
                            interval: 500,
                            port: 8101,
                            enable: true,
                            username: 'username1',
                            passphrase: {
                                cipherText: 'passphrase1'
                            },
                            tag: {
                                tag: 'tag1'
                            }
                        },
                        My_Poller_2: {
                        // uuid2
                            class: 'Telemetry_System_Poller',
                            trace: true,
                            interval: 600,
                            port: 8102,
                            enable: true,
                            username: 'username2',
                            passphrase: {
                                cipherText: 'passphrase2'
                            },
                            tag: {
                                tag: 'tag2'
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: [],
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System_Poller',
                                trace: true,
                                interval: 500,
                                enable: true,
                                name: 'My_Poller_1',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_Poller_1_System::My_Poller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8101,
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
                                    tags: {
                                        tag: 'tag1'
                                    },
                                    noTMStats: true
                                },
                                credentials: {
                                    username: 'username1',
                                    passphrase: {
                                        cipherText: 'passphrase1',
                                        class: 'Secret',
                                        protected: 'SecureVault'
                                    }
                                },
                                tag: {
                                    tag: 'tag1'
                                }
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                trace: true,
                                interval: 600,
                                enable: true,
                                name: 'My_Poller_2',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_Poller_2_System::My_Poller_2',
                                connection: {
                                    host: 'localhost',
                                    port: 8102,
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
                                    tags: {
                                        tag: 'tag2'
                                    },
                                    noTMStats: true
                                },
                                credentials: {
                                    username: 'username2',
                                    passphrase: {
                                        cipherText: 'passphrase2',
                                        class: 'Secret',
                                        protected: 'SecureVault'
                                    }
                                },
                                tag: {
                                    tag: 'tag2'
                                }
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8101,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                trace: true,
                                id: 'uuid3',
                                name: 'My_Poller_1_System',
                                systemPollers: [
                                    'uuid1'
                                ],
                                username: 'username1',
                                passphrase: {
                                    cipherText: 'passphrase1',
                                    class: 'Secret',
                                    protected: 'SecureVault'
                                }
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8102,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                trace: true,
                                id: 'uuid4',
                                name: 'My_Poller_2_System',
                                systemPollers: [
                                    'uuid2'
                                ],
                                username: 'username2',
                                passphrase: {
                                    cipherText: 'passphrase2',
                                    class: 'Secret',
                                    protected: 'SecureVault'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should create new poller when same poller referenced by multiple systems',
                    declaration: {
                        class: 'Telemetry',
                        My_System_1: {
                        // uuid1
                            class: 'Telemetry_System',
                            systemPoller: 'My_Poller_1', // uuid3
                            host: '192.168.1.14',
                            enable: false,
                            trace: 'fromSystem'
                        },
                        My_System_2: {
                        // uuid2
                            class: 'Telemetry_System',
                            systemPoller: 'My_Poller_1', // uuid5
                            host: '192.168.1.15',
                            allowSelfSignedCert: true,
                            enable: true
                        },
                        My_Poller_1: {
                        // uuid3
                            class: 'Telemetry_System_Poller',
                            trace: true,
                            interval: 500,
                            enable: true
                        },
                        My_Consumer_1: {
                        // uuid4
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            protocol: 'https'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid3: [
                                'uuid4'
                            ],
                            uuid5: [
                                'uuid4'
                            ]
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                host: '192.168.1.14',
                                enable: false,
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System_1',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid3'
                                ],
                                trace: 'fromSystem'
                            },
                            {
                                class: 'Telemetry_System',
                                host: '192.168.1.15',
                                allowSelfSignedCert: true,
                                enable: true,
                                port: 8100,
                                protocol: 'http',
                                name: 'My_System_2',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid5'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                trace: 'fromSystem', // system value kept
                                interval: 500,
                                enable: false, // system value kept
                                name: 'My_Poller_1',
                                id: 'uuid3',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_System_1::My_Poller_1',
                                connection: {
                                    host: '192.168.1.14',
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
                                class: 'Telemetry_Consumer',
                                type: 'Generic_HTTP',
                                host: '192.0.2.1',
                                protocol: 'https',
                                enable: true,
                                trace: false,
                                allowSelfSignedCert: false,
                                port: 443,
                                path: '/',
                                method: 'POST',
                                name: 'My_Consumer_1',
                                traceName: 'My_Consumer_1',
                                id: 'uuid4',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                trace: true, // poller value kept
                                interval: 500,
                                enable: true,
                                name: 'My_Poller_1',
                                id: 'uuid5',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_System_2::My_Poller_1',
                                connection: {
                                    host: '192.168.1.15',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: true
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
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize poller with deprecated properties and without system (create new system)',
                    declaration: {
                        class: 'Telemetry',
                        My_Poller_1: {
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
                                        tag: 'tagFromActions'
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
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            protocol: 'https'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: [
                                'uuid2'
                            ]
                        },
                        components: [
                            {
                                class: 'Telemetry_System_Poller',
                                enable: false,
                                trace: 'something',
                                interval: 10,
                                tag: {
                                    tag: 'tag'
                                },
                                endpoints: {
                                    endpoint1: {
                                        path: '/endpoint1',
                                        enable: true,
                                        name: 'endpoint1'
                                    }
                                },
                                name: 'My_Poller_1',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_Poller_1_System::My_Poller_1',
                                connection: {
                                    host: '1.1.1.1',
                                    port: 443,
                                    protocol: 'https',
                                    allowSelfSignedCert: true
                                },
                                dataOpts: {
                                    tags: {
                                        tag: 'tag'
                                    },
                                    actions: [
                                        {
                                            setTag: {
                                                tag: 'tagFromActions'
                                            },
                                            enable: true
                                        }
                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: 'username',
                                    passphrase: {
                                        cipherText: 'passphrase',
                                        class: 'Secret',
                                        protected: 'SecureVault'
                                    }
                                }
                            },
                            {
                                class: 'Telemetry_Consumer',
                                type: 'Generic_HTTP',
                                host: '192.0.2.1',
                                protocol: 'https',
                                enable: true,
                                trace: false,
                                allowSelfSignedCert: false,
                                port: 443,
                                path: '/',
                                method: 'POST',
                                name: 'My_Consumer_1',
                                traceName: 'My_Consumer_1',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                            },
                            {
                                class: 'Telemetry_System',
                                enable: false,
                                host: '1.1.1.1',
                                port: 443,
                                protocol: 'https',
                                allowSelfSignedCert: true,
                                passphrase: {
                                    cipherText: 'passphrase',
                                    class: 'Secret',
                                    protected: 'SecureVault'
                                },
                                trace: 'something',
                                username: 'username',
                                id: 'uuid3',
                                name: 'My_Poller_1_System',
                                systemPollers: [
                                    'uuid1'
                                ]
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize system poller with deprecated properties (system exists)',
                    declaration: {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            enable: true,
                            systemPoller: 'My_Poller_1'
                        },
                        My_Poller_1: {
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
                                        tag: 'tagFromActions'
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
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: false,
                                trace: 'something',
                                interval: 10,
                                tag: {
                                    tag: 'tag'
                                },
                                endpoints: {
                                    endpoint1: {
                                        path: '/endpoint1',
                                        enable: true,
                                        name: 'endpoint1'
                                    }
                                },
                                name: 'My_Poller_1',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System::My_Poller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: {
                                        tag: 'tag'
                                    },
                                    actions: [
                                        {
                                            setTag: {
                                                tag: 'tagFromActions'
                                            },
                                            enable: true
                                        }
                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize poller with actions',
                    declaration: {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            enable: true,
                            systemPoller: 'Poller_With_Actions'
                        },
                        Poller_With_Actions: {
                            class: 'Telemetry_System_Poller',
                            actions: [
                                {
                                    excludeData: {},
                                    locations: {
                                        system: {
                                            provisioning: true,
                                            diskLatency: true,
                                            diskStorage: {
                                                '/usr': true
                                            }
                                        }
                                    }
                                },
                                {
                                    includeData: {},
                                    locations: {
                                        system: true
                                    }
                                }
                            ]
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 300,
                                name: 'Poller_With_Actions',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System::Poller_With_Actions',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            excludeData: {},
                                            locations: {
                                                system: {
                                                    provisioning: true,
                                                    diskLatency: true,
                                                    diskStorage: {
                                                        '/usr': true
                                                    }
                                                }
                                            },
                                            enable: true
                                        },
                                        {
                                            includeData: {},
                                            locations: {
                                                system: true
                                            },
                                            enable: true
                                        }
                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize nested system poller with actions (ignore defaults)',
                    declaration: {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            enable: true,
                            systemPoller: {
                                actions: [
                                    {
                                        excludeData: {},
                                        locations: {
                                            system: {
                                                provisioning: true,
                                                diskLatency: true,
                                                diskStorage: {
                                                    '/usr': true
                                                }
                                            }
                                        }
                                    },
                                    {
                                        includeData: {},
                                        locations: {
                                            system: true
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 300,
                                name: 'SystemPoller_1',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System::SystemPoller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            excludeData: {},
                                            locations: {
                                                system: {
                                                    provisioning: true,
                                                    diskLatency: true,
                                                    diskStorage: {
                                                        '/usr': true
                                                    }
                                                }
                                            },
                                            enable: true
                                        },
                                        {
                                            includeData: {},
                                            locations: {
                                                system: true
                                            },
                                            enable: true
                                        }
                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize nested poller without actions (assign defaults)',
                    declaration: {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            enable: true,
                            systemPoller: {
                                interval: 234
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 234,
                                name: 'SystemPoller_1',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System::SystemPoller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }

                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize poller in a Namespace',
                    declaration: {
                        class: 'Telemetry',
                        My_Namespace: {
                            class: 'Telemetry_Namespace',
                            My_System: {
                                class: 'Telemetry_System',
                                enable: true,
                                systemPoller: {
                                    interval: 456
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'My_Namespace',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 456,
                                name: 'SystemPoller_1',
                                id: 'uuid2',
                                namespace: 'My_Namespace',
                                traceName: 'My_Namespace::My_System::SystemPoller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }

                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize pollers in different Namespaces',
                    declaration: {
                        class: 'Telemetry',
                        My_Same_Name_System: {
                            class: 'Telemetry_System',
                            enable: true,
                            systemPoller: {
                                interval: 123
                            }
                        },
                        My_Namespace_1: {
                            class: 'Telemetry_Namespace',
                            My_Same_Name_System: {
                                class: 'Telemetry_System',
                                enable: true,
                                systemPoller: {
                                    interval: 456
                                }
                            }
                        },
                        My_Namespace_2: {
                            class: 'Telemetry_Namespace',
                            My_System: {
                                class: 'Telemetry_System',
                                enable: true,
                                systemPoller: {
                                    interval: 789
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid4: [],
                            uuid5: [],
                            uuid6: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_Same_Name_System',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid4'
                                ]
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_Same_Name_System',
                                id: 'uuid2',
                                namespace: 'My_Namespace_1',
                                systemPollers: [
                                    'uuid5'
                                ]
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid3',
                                namespace: 'My_Namespace_2',
                                systemPollers: [
                                    'uuid6'
                                ]
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 123,
                                name: 'SystemPoller_1',
                                id: 'uuid4',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_Same_Name_System::SystemPoller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }

                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 456,
                                name: 'SystemPoller_1',
                                id: 'uuid5',
                                namespace: 'My_Namespace_1',
                                traceName: 'My_Namespace_1::My_Same_Name_System::SystemPoller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }

                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                trace: false,
                                interval: 789,
                                name: 'SystemPoller_1',
                                id: 'uuid6',
                                namespace: 'My_Namespace_2',
                                traceName: 'My_Namespace_2::My_System::SystemPoller_1',
                                connection: {
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                dataOpts: {
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }

                                    ],
                                    noTMStats: true
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                }
            ]
        },
        systemNormalization: {
            name: 'Telemetry_System normalization',
            tests: [
                {
                    name: 'should assign unique names within namespace and avoid dups for systems with anonymous pollers',
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
                        },
                        My_System_2: {
                            class: 'Telemetry_System',
                            systemPoller: [
                                'SystemPoller_2',
                                {
                                    interval: 555
                                }
                            ]
                        },
                        SystemPoller_2: {
                            class: 'Telemetry_System_Poller',
                            interval: 432
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: [],
                            uuid4: [],
                            uuid5: [],
                            uuid6: []
                        },
                        components: [
                            {
                                id: 'uuid1',
                                name: 'SystemPoller_1',
                                class: 'Telemetry_System_Poller',
                                trace: false,
                                traceName: 'My_System_1::SystemPoller_1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
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
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                }
                            },
                            {
                                class: 'Telemetry_System',
                                name: 'My_System_1',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                allowSelfSignedCert: false,
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                systemPollers: ['uuid1', 'uuid5']
                            },
                            {
                                class: 'Telemetry_System',
                                name: 'My_System_2',
                                id: 'uuid3',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                allowSelfSignedCert: false,
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                systemPollers: ['uuid4', 'uuid6']
                            },
                            {
                                class: 'Telemetry_System_Poller',
                                name: 'SystemPoller_2',
                                id: 'uuid4',
                                traceName: 'My_System_2::SystemPoller_2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
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
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                }
                            },
                            {
                                id: 'uuid5',
                                name: 'SystemPoller_3',
                                class: 'Telemetry_System_Poller',
                                trace: false,
                                traceName: 'My_System_1::SystemPoller_3',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
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
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                }
                            },
                            {
                                id: 'uuid6',
                                name: 'SystemPoller_4',
                                class: 'Telemetry_System_Poller',
                                trace: false,
                                traceName: 'My_System_2::SystemPoller_4',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
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
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize system without poller',
                    declaration: {
                        class: 'Telemetry',
                        My_System_1: {
                            class: 'Telemetry_System',
                            trace: false
                        }
                    },
                    expected: {
                        mappings: {
                        },
                        components: [
                            {
                                name: 'My_System_1',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
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
                {
                    name: 'should normalize system with TMStats to fetch (legacy splunk consumer)',
                    declaration: {
                        class: 'Telemetry',
                        My_System_1: {
                            class: 'Telemetry_System',
                            trace: false,
                            systemPoller: {
                                interval: 300
                            }
                        },
                        My_Consumer_1: {
                            class: 'Telemetry_Consumer',
                            type: 'Splunk',
                            format: 'legacy',
                            host: '192.0.2.1',
                            protocol: 'https',
                            passphrase: {
                                cipherText: '$M$jellybeans'
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid3: ['uuid2']
                        },
                        components: [
                            {
                                name: 'My_System_1',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System',
                                enable: true,
                                systemPollers: ['uuid3'],
                                allowSelfSignedCert: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                trace: false
                            },
                            {
                                name: 'My_Consumer_1',
                                traceName: 'My_Consumer_1',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                allowSelfSignedCert: false,
                                class: 'Telemetry_Consumer',
                                type: 'Splunk',
                                format: 'legacy',
                                host: '192.0.2.1',
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
                                id: 'uuid3',
                                class: 'Telemetry_System_Poller',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                enable: true,
                                trace: false,
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
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize multiple systems and various poller formats',
                    declaration: {
                        class: 'Telemetry',
                        Poller1: {
                        // uuid1
                            class: 'Telemetry_System_Poller'
                        },
                        Poller2: {
                        // uuid2
                            class: 'Telemetry_System_Poller',
                            interval: 111
                        },
                        Sys_Nested_Poller_Single: {
                        // uuid3
                            class: 'Telemetry_System',
                            systemPoller: {
                            // uuid7
                                interval: 222
                            }
                        },
                        Sys_Ref_Poller: {
                        // uuid4
                            class: 'Telemetry_System',
                            // uuid1
                            systemPoller: 'Poller1'
                        },
                        Sys_Nested_Poller_Array: {
                        // uuid5
                            class: 'Telemetry_System',
                            host: 'second.bigip.test',
                            systemPoller: [
                                {
                                // uuid8
                                    interval: 333
                                },
                                // uuid9
                                'Poller1',
                                // uuid2
                                'Poller2'
                            ]
                        },
                        Consumer1: {
                        // uuid6
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            protocol: 'https'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid1: ['uuid6'],
                            uuid2: ['uuid6'],
                            uuid7: ['uuid6'],
                            uuid8: ['uuid6'],
                            uuid9: ['uuid6']
                        },
                        components: [
                            {
                                name: 'Poller1',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                interval: 300,
                                trace: false,
                                traceName: 'Sys_Ref_Poller::Poller1',
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
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                }
                            },
                            {
                                name: 'Poller2',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                interval: 111,
                                trace: false,
                                traceName: 'Sys_Nested_Poller_Array::Poller2',
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
                                    host: 'second.bigip.test',
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
                                name: 'Sys_Nested_Poller_Single',
                                id: 'uuid3',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System',
                                enable: true,
                                systemPollers: ['uuid7'],
                                allowSelfSignedCert: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http'
                            },
                            {
                                name: 'Sys_Ref_Poller',
                                id: 'uuid4',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System',
                                enable: true,
                                systemPollers: ['uuid1'],
                                allowSelfSignedCert: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http'
                            },
                            {
                                name: 'Sys_Nested_Poller_Array',
                                id: 'uuid5',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System',
                                enable: true,
                                systemPollers: ['uuid8', 'uuid9', 'uuid2'],
                                allowSelfSignedCert: false,
                                host: 'second.bigip.test',
                                port: 8100,
                                protocol: 'http'
                            },
                            {
                                name: 'Consumer1',
                                traceName: 'Consumer1',
                                id: 'uuid6',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                allowSelfSignedCert: false,
                                class: 'Telemetry_Consumer',
                                type: 'Generic_HTTP',
                                host: '192.0.2.1',
                                protocol: 'https',
                                enable: true,
                                path: '/',
                                port: 443,
                                method: 'POST',
                                trace: false
                            },
                            {
                                name: 'SystemPoller_1',
                                id: 'uuid7',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                interval: 222,
                                trace: false,
                                traceName: 'Sys_Nested_Poller_Single::SystemPoller_1',
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
                                    host: 'localhost',
                                    allowSelfSignedCert: false,
                                    port: 8100,
                                    protocol: 'http'
                                }
                            },
                            {
                                name: 'SystemPoller_2',
                                id: 'uuid8',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                interval: 333,
                                trace: false,
                                traceName: 'Sys_Nested_Poller_Array::SystemPoller_2',
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
                                    host: 'second.bigip.test',
                                    allowSelfSignedCert: false,
                                    port: 8100,
                                    protocol: 'http'
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            },
                            // this was a copy of orig Poller1 uuid1
                            // separate poller config so that the system overrides can be applied
                            {
                                id: 'uuid9',
                                name: 'Poller1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                interval: 300,
                                trace: false,
                                traceName: 'Sys_Nested_Poller_Array::Poller1',
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
                                    host: 'second.bigip.test',
                                    allowSelfSignedCert: false,
                                    port: 8100,
                                    protocol: 'http'
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize systems and pollers with overriding properties',
                    declaration: {
                        class: 'Telemetry',
                        Sys_Trace_Undef_Poller_String: {
                        // uuid1
                            class: 'Telemetry_System',
                            systemPoller: {
                            // uuid7
                                trace: '/path/to/the/undiscovered/land'
                            }
                        },
                        Sys_Remote_Ref_Poller: {
                        // uuid2
                            class: 'Telemetry_System',
                            trace: false,
                            host: '10.1.2.10',
                            systemPoller: 'Poller_Trace_True' // uuid4
                        },
                        Sys_Localhost_Ref_Poller: {
                        // uuid3
                            class: 'Telemetry_System',
                            trace: true,
                            systemPoller: 'Poller_Trace_False', // uuid5
                            allowSelfSignedCert: true
                        },
                        Poller_Trace_True: {
                        // uuid4
                            class: 'Telemetry_System_Poller',
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
                        // uuid5
                            class: 'Telemetry_System_Poller',
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
                        // uuid6
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            protocol: 'https'
                        }
                    },
                    expected: {
                        mappings: {
                            uuid4: ['uuid6'],
                            uuid5: ['uuid6'],
                            uuid7: ['uuid6']
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'Sys_Trace_Undef_Poller_String',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid7'
                                ]
                            },
                            {
                                class: 'Telemetry_System',
                                host: '10.1.2.10',
                                enable: true,
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'Sys_Remote_Ref_Poller',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid4'
                                ],
                                trace: false
                            },
                            {
                                class: 'Telemetry_System',
                                allowSelfSignedCert: true,
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                name: 'Sys_Localhost_Ref_Poller',
                                id: 'uuid3',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid5'
                                ],
                                trace: true
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
                                id: 'uuid4',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'Sys_Remote_Ref_Poller::Poller_Trace_True',
                                trace: false,
                                connection: {
                                    host: '10.1.2.10',
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
                                id: 'uuid5',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'Sys_Localhost_Ref_Poller::Poller_Trace_False',
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
                                class: 'Telemetry_Consumer',
                                type: 'Generic_HTTP',
                                host: '192.0.2.1',
                                protocol: 'https',
                                enable: true,
                                trace: false,
                                allowSelfSignedCert: false,
                                port: 443,
                                path: '/',
                                method: 'POST',
                                name: 'My_Consumer_1',
                                traceName: 'My_Consumer_1',
                                id: 'uuid6',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                            },
                            {
                                trace: '/path/to/the/undiscovered/land',
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid7',
                                name: 'SystemPoller_1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'Sys_Trace_Undef_Poller_String::SystemPoller_1',
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
                                    noTMStats: true,
                                    tags: undefined
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize system in a Namespace',
                    declaration: {
                        class: 'Telemetry',
                        My_Namespace: {
                            class: 'Telemetry_Namespace',
                            My_System_1: {
                                class: 'Telemetry_System',
                                trace: false
                            }
                        }
                    },
                    expected: {
                        mappings: {
                        },
                        components: [
                            {
                                name: 'My_System_1',
                                id: 'uuid1',
                                namespace: 'My_Namespace',
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
                {
                    name: 'should normalize systems in multiple Namespaces',
                    declaration: {
                        class: 'Telemetry',
                        My_Same_Name_System: {
                            class: 'Telemetry_System',
                            trace: false
                        },
                        My_Namespace_1: {
                            class: 'Telemetry_Namespace',
                            My_Same_Name_System: {
                                class: 'Telemetry_System',
                                trace: true
                            },
                            My_System_2: {
                                class: 'Telemetry_System',
                                trace: false
                            }
                        },
                        My_Namespace_2: {
                            class: 'Telemetry_Namespace',
                            My_System: {
                                class: 'Telemetry_System',
                                trace: true
                            }
                        }
                    },
                    expected: {
                        mappings: {
                        },
                        components: [
                            {
                                name: 'My_Same_Name_System',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
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
                                name: 'My_Same_Name_System',
                                id: 'uuid2',
                                namespace: 'My_Namespace_1',
                                class: 'Telemetry_System',
                                enable: true,
                                systemPollers: [],
                                allowSelfSignedCert: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                trace: true
                            },
                            {
                                name: 'My_System_2',
                                id: 'uuid3',
                                namespace: 'My_Namespace_1',
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
                                name: 'My_System',
                                id: 'uuid4',
                                namespace: 'My_Namespace_2',
                                class: 'Telemetry_System',
                                enable: true,
                                systemPollers: [],
                                allowSelfSignedCert: false,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                trace: true
                            }
                        ]
                    }
                }
            ]
        },
        endpointsNormalization: {
            name: 'Telemetry_Endpoints normalization',
            tests: [
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
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid2',
                                name: 'SystemPoller_1',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System::SystemPoller_1',
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
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid2',
                                name: 'SystemPoller_1',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System::SystemPoller_1',
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
                        mappings: {
                            uuid7: [],
                            uuid8: [],
                            uuid9: []
                        },
                        components: [
                            {
                                class: 'Telemetry_Endpoints',
                                enable: false,
                                basePath: 'basePath/',
                                items: {
                                    disabledEndpoint: {
                                        path: 'disabledEndpoint',
                                        enable: true
                                    }
                                },
                                name: 'Disabled_Endpoints_1',
                                id: 'uuid1',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_Endpoints',
                                enable: true,
                                basePath: '/basePath',
                                items: {
                                    enabledEndpoint1: {
                                        path: 'enabledEndpoint1',
                                        enable: true
                                    }
                                },
                                name: 'Enabled_Endpoints_1',
                                id: 'uuid2',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_Endpoints',
                                enable: true,
                                basePath: 'basePath2/',
                                items: {
                                    enabledEndpoint2: {
                                        path: '/enabledEndpoint2',
                                        enable: true
                                    }
                                },
                                name: 'Enabled_Endpoints_2',
                                id: 'uuid3',
                                namespace: 'f5telemetry_default'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System_1',
                                id: 'uuid4',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid7'
                                ]
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System_2',
                                id: 'uuid5',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid8'
                                ]
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System_3',
                                id: 'uuid6',
                                namespace: 'f5telemetry_default',
                                systemPollers: [
                                    'uuid9'
                                ]
                            },
                            {
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid7',
                                name: 'SystemPoller_1',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System_1::SystemPoller_1',
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
                                id: 'uuid8',
                                name: 'SystemPoller_2',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System_2::SystemPoller_2',
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
                                id: 'uuid9',
                                name: 'SystemPoller_3',
                                namespace: 'f5telemetry_default',
                                traceName: 'My_System_3::SystemPoller_3',
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
                            }
                        ]
                    }
                },
                {
                    name: 'should normalize inline definitions within Namespace',
                    declaration: {
                        class: 'Telemetry',
                        My_Namespace: {
                            class: 'Telemetry_Namespace',
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
                        }
                    },
                    expected: {
                        mappings: {
                            uuid2: []
                        },
                        components: [
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System',
                                id: 'uuid1',
                                namespace: 'My_Namespace',
                                systemPollers: [
                                    'uuid2'
                                ]
                            },
                            {
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid2',
                                name: 'SystemPoller_1',
                                namespace: 'My_Namespace',
                                traceName: 'My_Namespace::My_System::SystemPoller_1',
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
                    name: 'should expand references within Namespaces',
                    declaration: {
                        class: 'Telemetry',
                        Endpoints: {
                            class: 'Telemetry_Endpoints',
                            enable: true,
                            basePath: 'basePath/',
                            items: {
                                endpoint: {
                                    path: 'defaultEndpoint'
                                }
                            }
                        },
                        My_System_1: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                endpointList: 'Endpoints'
                            }
                        },
                        My_Namespace: {
                            class: 'Telemetry_Namespace',
                            Endpoints: {
                                class: 'Telemetry_Endpoints',
                                enable: true,
                                basePath: 'basePath/',
                                items: {
                                    endpoint: {
                                        path: 'namespacedEndpoint'
                                    }
                                }
                            },
                            My_System_2: {
                                class: 'Telemetry_System',
                                systemPoller: {
                                    endpointList: 'Endpoints'
                                }
                            }
                        }
                    },
                    expected: {
                        mappings: {
                            uuid5: [],
                            uuid6: []
                        },
                        components: [
                            {
                                class: 'Telemetry_Endpoints',
                                enable: true,
                                basePath: '/basePath',
                                items: {
                                    endpoint: {
                                        path: 'defaultEndpoint',
                                        enable: true
                                    }
                                },
                                name: 'Endpoints',
                                id: 'uuid1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System_1',
                                id: 'uuid2',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                systemPollers: [
                                    'uuid5'
                                ]
                            },
                            {
                                class: 'Telemetry_Endpoints',
                                enable: true,
                                basePath: '/basePath',
                                items: {
                                    endpoint: {
                                        path: 'namespacedEndpoint',
                                        enable: true
                                    }
                                },
                                name: 'Endpoints',
                                id: 'uuid3',
                                namespace: 'My_Namespace'
                            },
                            {
                                class: 'Telemetry_System',
                                enable: true,
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false,
                                name: 'My_System_2',
                                id: 'uuid4',
                                namespace: 'My_Namespace',
                                systemPollers: [
                                    'uuid6'
                                ]
                            },
                            {
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid5',
                                name: 'SystemPoller_1',
                                namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                traceName: 'My_System_1::SystemPoller_1',
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
                                    noTMStats: true,
                                    tags: undefined
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                },
                                endpoints: {
                                    endpoint: {
                                        path: '/basePath/defaultEndpoint',
                                        enable: true,
                                        name: 'endpoint'
                                    }
                                }
                            },
                            {
                                enable: true,
                                interval: 300,
                                class: 'Telemetry_System_Poller',
                                id: 'uuid6',
                                name: 'SystemPoller_1',
                                namespace: 'My_Namespace',
                                traceName: 'My_Namespace::My_System_2::SystemPoller_1',
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
                                    noTMStats: true,
                                    tags: undefined
                                },
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                },
                                endpoints: {
                                    endpoint: {
                                        path: '/basePath/namespacedEndpoint',
                                        enable: true,
                                        name: 'endpoint'
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    getPollerTraceValue: [
        // matrix (like boolean logic),
        // first array is system's trace value (ignore element at index 0)
        // first element of each next line (starting from line 1) is poller's trace value
        ['',        undefined,  'system',   true,       false], // eslint-disable-line no-multi-spaces
        [undefined, false,      'system',   true,       false], // eslint-disable-line no-multi-spaces
        ['poller',  'poller',   'poller',   'poller',   false], // eslint-disable-line no-multi-spaces
        [true,      true,       'system',   true,       false], // eslint-disable-line no-multi-spaces
        [false,     false,      false,      false,      false]  // eslint-disable-line no-multi-spaces
    ]
};
