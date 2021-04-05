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
    name: 'Telemetry_iHealth_Poller normalization',
    tests: [
        {
            name: 'should normalize nested iHealth Pollers and nested System Pollers',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    enable: true,
                    iHealthPoller: {
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_1'
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
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host2',
                        iHealthPoller: {
                            username: 'test_user_2',
                            passphrase: {
                                cipherText: 'test_passphrase_2'
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
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'My_Namespace::My_System::SystemPoller_1': ['My_Namespace::My_Consumer'],
                    'My_Namespace::My_System::iHealthPoller_1': ['My_Namespace::My_Consumer'],
                    'My_System::SystemPoller_1': ['My_Consumer'],
                    'My_System::iHealthPoller_1': ['My_Consumer']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host1',
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
                        id: 'My_System::SystemPoller_1',
                        interval: 60,
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
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
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                            host: 'host1',
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
                        id: 'My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        traceName: 'My_Consumer',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'host2',
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
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        interval: 60,
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        trace: false,
                        traceName: 'My_Namespace::My_System::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                            host: 'host2',
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
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        systemName: 'My_System',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'My_Namespace',
                        trace: false,
                        traceName: 'My_Namespace::My_Consumer',
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should normalize referenced iHealth Pollers',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    iHealthPoller: 'My_iHealth_Poller'
                },
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        host: 'host2',
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_2',
                        passphrase: {
                            cipherText: 'test_passphrase_2'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'My_Namespace::My_System::My_iHealth_Poller': ['My_Namespace::My_Consumer'],
                    'My_System::My_iHealth_Poller': ['My_Consumer']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                            host: 'host1',
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
                        id: 'My_System::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_System::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        traceName: 'My_Consumer',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                            host: 'host2',
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
                        id: 'My_Namespace::My_System::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'My_Namespace',
                        trace: false,
                        traceName: 'My_Namespace::My_Consumer',
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should normalize iHealth Pollers referenced by multiple Systems',
            declaration: {
                class: 'Telemetry',
                My_System_1: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    enable: true,
                    trace: false,
                    iHealthPoller: 'My_iHealth_Poller'
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    host: 'host2',
                    enable: false,
                    trace: true,
                    iHealthPoller: 'My_iHealth_Poller'
                },
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    enable: true,
                    trace: true,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System',
                        host: 'host3',
                        enable: true,
                        trace: false,
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        host: 'host4',
                        enable: false,
                        trace: true,
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: true,
                        username: 'test_user_2',
                        passphrase: {
                            cipherText: 'test_passphrase_2'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'My_Namespace::My_System_1::My_iHealth_Poller': ['My_Namespace::My_Consumer'],
                    'My_Namespace::My_System_2::My_iHealth_Poller': ['My_Namespace::My_Consumer'],
                    'My_System_1::My_iHealth_Poller': ['My_Consumer'],
                    'My_System_2::My_iHealth_Poller': ['My_Consumer']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                            host: 'host1',
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
                        id: 'My_System_1::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_1',
                        traceName: 'My_System_1::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: false,
                        trace: true,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                            host: 'host2',
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
                        id: 'My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_2',
                        traceName: 'My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        traceName: 'My_Consumer',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                            host: 'host3',
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
                        id: 'My_Namespace::My_System_1::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_1',
                        traceName: 'My_Namespace::My_System_1::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: false,
                        trace: true,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                            host: 'host4',
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
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_2',
                        traceName: 'My_Namespace::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'My_Namespace',
                        trace: false,
                        traceName: 'My_Namespace::My_Consumer',
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should ignore unbound iHealth Pollers',
            declaration: {
                class: 'Telemetry',
                My_iHealth_Poller_1: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
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
                    username: 'test_user_2',
                    passphrase: {
                        cipherText: 'test_passphrase_2'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_iHealth_Poller_1: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_3',
                        passphrase: {
                            cipherText: 'test_passphrase_3'
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
                        username: 'test_user_4',
                        passphrase: {
                            cipherText: 'test_passphrase_4'
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
                mappings: {},
                components: []
            }
        },
        {
            name: 'should not create data routes when no Consumers defined',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    iHealthPoller: {
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_1'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    }
                },
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'test_user_2',
                    passphrase: {
                        cipherText: 'test_passphrase_2'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    iHealthPoller: 'My_iHealth_Poller'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        iHealthPoller: {
                            username: 'test_user_3',
                            passphrase: {
                                cipherText: 'test_passphrase_3'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_4',
                        passphrase: {
                            cipherText: 'test_passphrase_4'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        iHealthPoller: 'My_iHealth_Poller'
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                        id: 'My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                        id: 'My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_3',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_3',
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
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        systemName: 'My_System',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_4',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_4',
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
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System_2::My_iHealth_Poller'
                    }
                ]
            }
        },
        {
            name: 'should create data routes when single Consumer defined in each Namespace',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
                    iHealthPoller: {
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_1'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    }
                },
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'test_user_2',
                    passphrase: {
                        cipherText: 'test_passphrase_2'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    host: 'host2',
                    iHealthPoller: 'My_iHealth_Poller'
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host3',
                        iHealthPoller: {
                            username: 'test_user_3',
                            passphrase: {
                                cipherText: 'test_passphrase_3'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_4',
                        passphrase: {
                            cipherText: 'test_passphrase_4'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        host: 'host4',
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host5',
                        iHealthPoller: {
                            username: 'test_user_5',
                            passphrase: {
                                cipherText: 'test_passphrase_5'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_6',
                        passphrase: {
                            cipherText: 'test_passphrase_6'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        host: 'host6',
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'My_Namespace::My_System::iHealthPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::My_System_2::My_iHealth_Poller': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace_2::My_System::iHealthPoller_1': ['My_Namespace_2::My_Consumer_1'],
                    'My_Namespace_2::My_System_2::My_iHealth_Poller': ['My_Namespace_2::My_Consumer_1'],
                    'My_System::iHealthPoller_1': ['My_Consumer_1'],
                    'My_System_2::My_iHealth_Poller': ['My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                            host: 'host1',
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
                        id: 'My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                            host: 'host2',
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
                        id: 'My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        traceName: 'My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_3',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_3',
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
                            host: 'host3',
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
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        systemName: 'My_System',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_4',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_4',
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
                            host: 'host4',
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
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace',
                        trace: false,
                        traceName: 'My_Namespace::My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_5',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_5',
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
                            host: 'host5',
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
                        id: 'My_Namespace_2::My_System::iHealthPoller_1',
                        systemName: 'My_System',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_6',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_6',
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
                            host: 'host6',
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
                        id: 'My_Namespace_2::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace_2::My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace_2',
                        trace: false,
                        traceName: 'My_Namespace_2::My_Consumer_1',
                        type: 'default'
                    }
                ]
            }
        },
        {
            name: 'should create data routes when multiple Consumers and Namespaces defined',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    iHealthPoller: {
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_1'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    }
                },
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'test_user_2',
                    passphrase: {
                        cipherText: 'test_passphrase_2'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    iHealthPoller: 'My_iHealth_Poller'
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        iHealthPoller: {
                            username: 'test_user_3',
                            passphrase: {
                                cipherText: 'test_passphrase_3'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_4',
                        passphrase: {
                            cipherText: 'test_passphrase_4'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        iHealthPoller: {
                            username: 'test_user_5',
                            passphrase: {
                                cipherText: 'test_passphrase_5'
                            },
                            interval: {
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        }
                    },
                    My_iHealth_Poller: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'test_user_6',
                        passphrase: {
                            cipherText: 'test_passphrase_6'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        iHealthPoller: 'My_iHealth_Poller'
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    My_Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'My_Namespace::My_System::iHealthPoller_1': ['My_Namespace::My_Consumer_1', 'My_Namespace::My_Consumer_2'],
                    'My_Namespace::My_System_2::My_iHealth_Poller': ['My_Namespace::My_Consumer_1', 'My_Namespace::My_Consumer_2'],
                    'My_Namespace_2::My_System::iHealthPoller_1': ['My_Namespace_2::My_Consumer_1', 'My_Namespace_2::My_Consumer_2'],
                    'My_Namespace_2::My_System_2::My_iHealth_Poller': ['My_Namespace_2::My_Consumer_1', 'My_Namespace_2::My_Consumer_2'],
                    'My_System::iHealthPoller_1': ['My_Consumer_1', 'My_Consumer_2'],
                    'My_System_2::My_iHealth_Poller': ['My_Consumer_1', 'My_Consumer_2']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
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
                        id: 'My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
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
                        id: 'My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'f5telemetry_default',
                        traceName: 'My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        traceName: 'My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Consumer_2',
                        name: 'My_Consumer_2',
                        namespace: 'f5telemetry_default',
                        trace: false,
                        traceName: 'My_Consumer_2',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_3',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_3',
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
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        systemName: 'My_System',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_4',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_4',
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
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace',
                        trace: false,
                        traceName: 'My_Namespace::My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer_2',
                        name: 'My_Consumer_2',
                        namespace: 'My_Namespace',
                        trace: false,
                        traceName: 'My_Namespace::My_Consumer_2',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'iHealthPoller_1',
                            credentials: {
                                username: 'test_user_5',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_5',
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
                        id: 'My_Namespace_2::My_System::iHealthPoller_1',
                        systemName: 'My_System',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: false,
                        iHealth: {
                            name: 'My_iHealth_Poller',
                            credentials: {
                                username: 'test_user_6',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_6',
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
                        id: 'My_Namespace_2::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        systemName: 'My_System_2',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace_2::My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace_2',
                        trace: false,
                        traceName: 'My_Namespace_2::My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace_2::My_Consumer_2',
                        name: 'My_Consumer_2',
                        namespace: 'My_Namespace_2',
                        trace: false,
                        traceName: 'My_Namespace_2::My_Consumer_2',
                        type: 'default'
                    }
                ]
            }
        }
    ]
};
