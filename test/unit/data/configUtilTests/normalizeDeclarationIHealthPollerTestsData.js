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
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
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
                        },
                        proxy: {
                            host: 'proxyhost',
                            port: 5555,
                            protocol: 'https'
                        }
                    },
                    systemPoller: {
                        interval: 60,
                        workers: 6,
                        chunkSize: 60
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
                            },
                            proxy: {
                                host: 'proxyhost',
                                port: 5555,
                                protocol: 'https',
                                allowSelfSignedCert: true,
                                username: 'test_user_1',
                                passphrase: {
                                    cipherText: 'test_passphrase_2'
                                }
                            }
                        },
                        systemPoller: {
                            interval: 60,
                            workers: 6,
                            chunkSize: 60
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
                    'f5telemetry_default::My_System::SystemPoller_1': ['f5telemetry_default::My_Consumer'],
                    'f5telemetry_default::My_System::iHealthPoller_1': ['f5telemetry_default::My_Consumer']
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
                            passphrase: {
                                cipherText: '$M$test_passphrase_1',
                                class: 'Secret',
                                protected: 'SecureVault'
                            },
                            username: 'test_user_1'
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
                            noTMStats: true
                        },
                        enable: true,
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        interval: 60,
                        workers: 6,
                        chunkSize: 60,
                        name: 'SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            },
                            proxy: {
                                connection: {
                                    host: 'proxyhost',
                                    port: 5555,
                                    protocol: 'https',
                                    allowSelfSignedCert: false
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host1',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            },
                            credentials: {
                                passphrase: {
                                    cipherText: '$M$test_passphrase_1',
                                    class: 'Secret',
                                    protected: 'SecureVault'
                                },
                                username: 'test_user_1'
                            }
                        },
                        id: 'f5telemetry_default::My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Consumer',
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
                            noTMStats: true
                        },
                        enable: true,
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        interval: 60,
                        workers: 6,
                        chunkSize: 60,
                        name: 'SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            },
                            proxy: {
                                connection: {
                                    host: 'proxyhost',
                                    port: 5555,
                                    protocol: 'https',
                                    allowSelfSignedCert: true
                                },
                                credentials: {
                                    username: 'test_user_1',
                                    passphrase: {
                                        cipherText: '$M$test_passphrase_2',
                                        class: 'Secret',
                                        protected: 'SecureVault'
                                    }
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host2',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System::iHealthPoller_1',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                            type: 'output'
                        },
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
                    },
                    proxy: {
                        host: 'proxyhost',
                        username: 'test_user_1'
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
                    'f5telemetry_default::My_System::My_iHealth_Poller': ['f5telemetry_default::My_Consumer']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            },
                            proxy: {
                                connection: {
                                    host: 'proxyhost',
                                    port: 80,
                                    protocol: 'http',
                                    allowSelfSignedCert: false
                                },
                                credentials: {
                                    username: 'test_user_1'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host1',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Consumer',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host2',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                            type: 'output'
                        },
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
                    'f5telemetry_default::My_System_1::My_iHealth_Poller': ['f5telemetry_default::My_Consumer']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System_1::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_1',
                            connection: {
                                host: 'host1',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System_1::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System_1::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'host2',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Consumer',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System_1::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_1',
                            connection: {
                                host: 'host3',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System_1::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System_1::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'host4',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'My_Namespace::My_Consumer',
                        name: 'My_Consumer',
                        namespace: 'My_Namespace',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                            type: 'output'
                        },
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
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
                    'f5telemetry_default::My_System::iHealthPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_System_2::My_iHealth_Poller': ['f5telemetry_default::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host1',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'host2',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host3',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'host4',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace_2::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'host5',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace_2::My_System::iHealthPoller_1',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace_2::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'host6',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace_2::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::My_Consumer_1',
                            type: 'output'
                        },
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
                            },
                            frequency: 'daily'
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
                        },
                        frequency: 'weekly',
                        day: 7
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
                                },
                                frequency: 'weekly',
                                day: 'wednesday'
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
                            },
                            frequency: 'monthly',
                            day: 30
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
                    'f5telemetry_default::My_System::iHealthPoller_1': ['f5telemetry_default::My_Consumer_1', 'f5telemetry_default::My_Consumer_2'],
                    'f5telemetry_default::My_System_2::My_iHealth_Poller': ['f5telemetry_default::My_Consumer_1', 'f5telemetry_default::My_Consumer_2']
                },
                components: [
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System::iHealthPoller_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                day: 7,
                                frequency: 'weekly',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'f5telemetry_default::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_System_2::My_iHealth_Poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer_1',
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        allowSelfSignedCert: false,
                        enable: true,
                        id: 'f5telemetry_default::My_Consumer_2',
                        name: 'My_Consumer_2',
                        namespace: 'f5telemetry_default',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_2',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Consumer_2',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                day: 'wednesday',
                                frequency: 'weekly',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System::iHealthPoller_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                day: 30,
                                frequency: 'monthly',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_Consumer_2',
                        type: 'default'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        name: 'iHealthPoller_1',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace_2::My_System::iHealthPoller_1',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace_2::My_System::iHealthPoller_1',
                        namespace: 'My_Namespace_2',
                        traceName: 'My_Namespace_2::My_System::iHealthPoller_1'
                    },
                    {
                        class: 'Telemetry_iHealth_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_iHealth_Poller.My_Namespace_2::My_System_2::My_iHealth_Poller',
                            type: 'output'
                        },
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
                            downloadFolder: '/shared/tmp',
                            interval: {
                                frequency: 'daily',
                                timeWindow: {
                                    start: '23:15',
                                    end: '02:15'
                                }
                            }
                        },
                        system: {
                            name: 'My_System_2',
                            connection: {
                                host: 'localhost',
                                port: 8100,
                                protocol: 'http',
                                allowSelfSignedCert: false
                            }
                        },
                        id: 'My_Namespace_2::My_System_2::My_iHealth_Poller',
                        name: 'My_iHealth_Poller',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::My_Consumer_1',
                            type: 'output'
                        },
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace_2::My_Consumer_2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace_2::My_Consumer_2',
                        type: 'default'
                    }
                ]
            }
        }
    ]
};
