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
    name: 'Telemetry_System_Poller normalization',
    tests: [
        {
            name: 'should process unbound System Pollers',
            declaration: {
                class: 'Telemetry',
                My_Poller_1: {
                    class: 'Telemetry_System_Poller'
                },
                My_Poller_2: {
                    class: 'Telemetry_System_Poller',
                    trace: true,
                    interval: 600,
                    port: 8102,
                    host: 'host2',
                    enable: true,
                    username: 'username2',
                    passphrase: {
                        cipherText: 'passphrase2'
                    },
                    tag: {
                        tag: 'tag2'
                    }
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Poller_1: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_Poller_2: {
                        class: 'Telemetry_System_Poller',
                        trace: true,
                        interval: 600,
                        host: 'host4',
                        port: 8102,
                        enable: true,
                        username: 'username2',
                        passphrase: {
                            cipherText: 'passphrase2'
                        },
                        tag: {
                            tag: 'tag2'
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_Poller_1::My_Poller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_Poller_2::My_Poller_2': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_Poller_1::My_Poller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::My_Poller_2::My_Poller_2': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_Poller_1::My_Poller_1',
                            type: 'output'
                        },
                        interval: 300,
                        enable: true,
                        name: 'My_Poller_1',
                        id: 'f5telemetry_default::My_Poller_1::My_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_Poller_1',
                        traceName: 'f5telemetry_default::My_Poller_1::My_Poller_1',
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
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: true,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_Poller_2::My_Poller_2',
                            type: 'output'
                        },
                        interval: 600,
                        enable: true,
                        name: 'My_Poller_2',
                        id: 'f5telemetry_default::My_Poller_2::My_Poller_2',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_Poller_2',
                        traceName: 'f5telemetry_default::My_Poller_2::My_Poller_2',
                        connection: {
                            host: 'host2',
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
                                cipherText: '$M$passphrase2',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        }
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
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_Poller_1::My_Poller_1',
                            type: 'output'
                        },
                        interval: 300,
                        enable: true,
                        name: 'My_Poller_1',
                        id: 'My_Namespace::My_Poller_1::My_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_Poller_1',
                        traceName: 'My_Namespace::My_Poller_1::My_Poller_1',
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
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: true,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_Poller_2::My_Poller_2',
                            type: 'output'
                        },
                        interval: 600,
                        enable: true,
                        name: 'My_Poller_2',
                        id: 'My_Namespace::My_Poller_2::My_Poller_2',
                        namespace: 'My_Namespace',
                        systemName: 'My_Poller_2',
                        traceName: 'My_Namespace::My_Poller_2::My_Poller_2',
                        connection: {
                            host: 'host4',
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
                                cipherText: '$M$passphrase2',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        }
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
                    }
                ]
            }
        },
        {
            name: 'should normalize when same System Poller referenced by multiple Systems',
            declaration: {
                class: 'Telemetry',
                My_System_1: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_Poller_1',
                    host: 'host1',
                    enable: false,
                    trace: 'fromSystem'
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_Poller_1',
                    host: 'host2',
                    allowSelfSignedCert: true,
                    enable: true
                },
                My_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    trace: true,
                    interval: 500,
                    enable: true
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_1',
                        host: 'host3',
                        enable: false,
                        trace: 'fromSystem'
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_1',
                        host: 'host4',
                        allowSelfSignedCert: true,
                        enable: true
                    },
                    My_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        trace: true,
                        interval: 500,
                        enable: true
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System_2::My_Poller_1': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_System_2::My_Poller_1': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'fromSystem',
                            type: 'output'
                        },
                        interval: 500,
                        enable: false, // system value kept
                        name: 'My_Poller_1',
                        id: 'f5telemetry_default::My_System_1::My_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_1',
                        traceName: 'f5telemetry_default::My_System_1::My_Poller_1',
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
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: true,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_2::My_Poller_1',
                            type: 'output'
                        },
                        interval: 500,
                        enable: true,
                        name: 'My_Poller_1',
                        id: 'f5telemetry_default::My_System_2::My_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_2',
                        traceName: 'f5telemetry_default::My_System_2::My_Poller_1',
                        connection: {
                            host: 'host2',
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
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'fromSystem',
                            type: 'output'
                        },
                        interval: 500,
                        enable: false, // system value kept
                        name: 'My_Poller_1',
                        id: 'My_Namespace::My_System_1::My_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_1',
                        traceName: 'My_Namespace::My_System_1::My_Poller_1',
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
                        }
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        trace: {
                            enable: true,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_2::My_Poller_1',
                            type: 'output'
                        },
                        interval: 500,
                        enable: true,
                        name: 'My_Poller_1',
                        id: 'My_Namespace::My_System_2::My_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_2',
                        traceName: 'My_Namespace::My_System_2::My_Poller_1',
                        connection: {
                            host: 'host4',
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
                    }
                ]
            }
        },
        {
            name: 'should normalize System Poller with deprecated properties and without System',
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
                    host: 'host1',
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
                            },
                            snmpEndpoint: {
                                path: '1.2.3',
                                protocol: 'snmp'
                            },
                            snmpEndpointWithOptions: {
                                numericalEnums: true,
                                path: '1.2.3',
                                protocol: 'snmp'
                            }
                        }
                    }
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        allowSelfSignedCert: true,
                        trace: 'something',
                        username: 'username',
                        passphrase: {
                            cipherText: 'passphrase'
                        },
                        host: 'host2',
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
                                },
                                snmpEndpoint: {
                                    path: '1.2.3',
                                    protocol: 'snmp'
                                }
                            }
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'something',
                            type: 'output'
                        },
                        interval: 10,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            },
                            snmpEndpoint: {
                                numericalEnums: false,
                                path: '1.2.3',
                                enable: true,
                                name: 'snmpEndpoint',
                                protocol: 'snmp'
                            },
                            snmpEndpointWithOptions: {
                                numericalEnums: true,
                                path: '1.2.3',
                                protocol: 'snmp',
                                enable: true,
                                name: 'snmpEndpointWithOptions'
                            }
                        },
                        name: 'My_Poller_1',
                        id: 'f5telemetry_default::My_Poller_1::My_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_Poller_1',
                        traceName: 'f5telemetry_default::My_Poller_1::My_Poller_1',
                        connection: {
                            host: 'host1',
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
                                cipherText: '$M$passphrase',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        }
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
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'something',
                            type: 'output'
                        },
                        interval: 10,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            },
                            snmpEndpoint: {
                                numericalEnums: false,
                                path: '1.2.3',
                                enable: true,
                                name: 'snmpEndpoint',
                                protocol: 'snmp'
                            }
                        },
                        name: 'My_Poller_1',
                        id: 'My_Namespace::My_Poller_1::My_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_Poller_1',
                        traceName: 'My_Namespace::My_Poller_1::My_Poller_1',
                        connection: {
                            host: 'host2',
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
                                cipherText: '$M$passphrase',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        }
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
                    }
                ]
            }
        },
        {
            name: 'should normalize System Poller with deprecated properties (System exists)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
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
                    host: 'host2',
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
                            },
                            snmpEndpoint: {
                                path: '1.2.3',
                                protocol: 'snmp'
                            }
                        }
                    }
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
                        host: 'host4',
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
                                },
                                snmpEndpoint: {
                                    path: '1.2.3',
                                    protocol: 'snmp'
                                }
                            }
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'something',
                            type: 'output'
                        },
                        interval: 10,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            },
                            snmpEndpoint: {
                                path: '1.2.3',
                                enable: true,
                                name: 'snmpEndpoint',
                                protocol: 'snmp',
                                numericalEnums: false
                            }
                        },
                        name: 'My_Poller_1',
                        id: 'f5telemetry_default::My_System::My_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::My_Poller_1',
                        connection: {
                            host: 'host1',
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
                        class: 'Telemetry_System_Poller',
                        enable: false,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: 'something',
                            type: 'output'
                        },
                        interval: 10,
                        endpoints: {
                            endpoint1: {
                                path: '/endpoint1',
                                enable: true,
                                name: 'endpoint1',
                                protocol: 'http'
                            },
                            snmpEndpoint: {
                                path: '1.2.3',
                                enable: true,
                                name: 'snmpEndpoint',
                                protocol: 'snmp',
                                numericalEnums: false
                            }
                        },
                        name: 'My_Poller_1',
                        id: 'My_Namespace::My_System::My_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::My_Poller_1',
                        connection: {
                            host: 'host3',
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
                    }
                ]
            }
        },
        {
            name: 'should normalize System Poller with actions',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
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
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System::Poller_With_Actions': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_System::Poller_With_Actions': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::Poller_With_Actions',
                            type: 'output'
                        },
                        interval: 300,
                        name: 'Poller_With_Actions',
                        id: 'f5telemetry_default::My_System::Poller_With_Actions',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::Poller_With_Actions',
                        connection: {
                            host: 'host1',
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
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::Poller_With_Actions',
                            type: 'output'
                        },
                        interval: 300,
                        name: 'Poller_With_Actions',
                        id: 'My_Namespace::My_System::Poller_With_Actions',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::Poller_With_Actions',
                        connection: {
                            host: 'host3',
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
                    }
                ]
            }
        },
        {
            name: 'should normalize nested System Poller with actions (ignore defaults)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
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
                        host: 'host2',
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
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_System::SystemPoller_1': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 300,
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
                        connection: {
                            host: 'host1',
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
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 300,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::SystemPoller_1',
                        connection: {
                            host: 'host2',
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
                    }
                ]
            }
        },
        {
            name: 'should normalize nested System Poller without actions (assign defaults)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
                    systemPoller: {
                        interval: 234
                    }
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
                        host: 'host2',
                        systemPoller: {
                            interval: 234
                        }
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_System::SystemPoller_1': ['My_Namespace::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
                        connection: {
                            host: 'host1',
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
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::SystemPoller_1',
                        connection: {
                            host: 'host2',
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
                    }
                ]
            }
        },
        {
            name: 'should fetch TMStats when Splunk legacy configured',
            declaration: {
                class: 'Telemetry',
                My_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    host: 'host1'
                },
                My_Poller_2: {
                    class: 'Telemetry_System_Poller',
                    host: 'host2'
                },
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host3',
                    systemPoller: [
                        {
                            // should set name to SystemPoller_1
                            interval: 234
                        },
                        'My_Poller_2'
                    ]
                },
                My_Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'Splunk',
                    format: 'legacy',
                    host: 'hos4',
                    passphrase: {
                        cipherText: 'passhprase'
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        host: 'host5'
                    },
                    My_Poller_2: {
                        class: 'Telemetry_System_Poller',
                        host: 'host6'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host7',
                        systemPoller: [
                            {
                                // should set name to SystemPoller_1
                                interval: 234
                            },
                            'My_Poller_2'
                        ]
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        format: 'legacy',
                        host: 'host8',
                        passphrase: {
                            cipherText: 'passhprase'
                        }
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    My_Poller_1: {
                        class: 'Telemetry_System_Poller',
                        host: 'host5'
                    },
                    My_Poller_2: {
                        class: 'Telemetry_System_Poller',
                        host: 'host6'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host7',
                        systemPoller: [
                            {
                                // should set name to SystemPoller_1
                                interval: 234
                            },
                            'My_Poller_2'
                        ]
                    },
                    My_Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: {
                mappings: {
                    'f5telemetry_default::My_System::SystemPoller_1': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_System::My_Poller_2': ['f5telemetry_default::My_Consumer_1'],
                    'f5telemetry_default::My_Poller_1::My_Poller_1': ['f5telemetry_default::My_Consumer_1'],
                    'My_Namespace::My_System::SystemPoller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::My_System::My_Poller_2': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace::My_Poller_1::My_Poller_1': ['My_Namespace::My_Consumer_1'],
                    'My_Namespace_2::My_System::SystemPoller_1': ['My_Namespace_2::My_Consumer_1'],
                    'My_Namespace_2::My_System::My_Poller_2': ['My_Namespace_2::My_Consumer_1'],
                    'My_Namespace_2::My_Poller_1::My_Poller_1': ['My_Namespace_2::My_Consumer_1']
                },
                components: [
                    {
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        format: 'legacy',
                        host: 'hos4',
                        passphrase: {
                            cipherText: '$M$passhprase',
                            class: 'Secret',
                            protected: 'SecureVault'
                        },
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        protocol: 'https',
                        port: 8088,
                        compressionType: 'gzip',
                        name: 'My_Consumer_1',
                        namespace: 'f5telemetry_default',
                        traceName: 'f5telemetry_default::My_Consumer_1',
                        id: 'f5telemetry_default::My_Consumer_1'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        format: 'legacy',
                        host: 'host8',
                        passphrase: {
                            cipherText: '$M$passhprase',
                            class: 'Secret',
                            protected: 'SecureVault'
                        },
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer_1',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        protocol: 'https',
                        port: 8088,
                        compressionType: 'gzip',
                        name: 'My_Consumer_1',
                        namespace: 'My_Namespace',
                        traceName: 'My_Namespace::My_Consumer_1',
                        id: 'My_Namespace::My_Consumer_1'
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
                        interval: 234,
                        enable: true,
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
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
                            noTMStats: false,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'f5telemetry_default::My_System::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'My_Poller_2',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::My_Poller_2',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_System::My_Poller_2',
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
                            noTMStats: false,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'f5telemetry_default::My_System::My_Poller_2'
                    },
                    {
                        interval: 234,
                        enable: true,
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System::SystemPoller_1',
                        connection: {
                            host: 'host7',
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
                            noTMStats: false,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'My_Poller_2',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::My_Poller_2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_System::My_Poller_2',
                        connection: {
                            host: 'host7',
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
                            noTMStats: false,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_System::My_Poller_2'
                    },
                    {
                        interval: 234,
                        enable: true,
                        name: 'SystemPoller_1',
                        class: 'Telemetry_System_Poller',
                        namespace: 'My_Namespace_2',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace_2::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace_2::My_System::SystemPoller_1',
                        connection: {
                            host: 'host7',
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
                        id: 'My_Namespace_2::My_System::SystemPoller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'My_Poller_2',
                        namespace: 'My_Namespace_2',
                        systemName: 'My_System',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace_2::My_System::My_Poller_2',
                            type: 'output'
                        },
                        traceName: 'My_Namespace_2::My_System::My_Poller_2',
                        connection: {
                            host: 'host7',
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
                        id: 'My_Namespace_2::My_System::My_Poller_2'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'My_Poller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_Poller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_Poller_1::My_Poller_1',
                            type: 'output'
                        },
                        traceName: 'f5telemetry_default::My_Poller_1::My_Poller_1',
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
                            noTMStats: false,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'f5telemetry_default::My_Poller_1::My_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'My_Poller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_Poller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_Poller_1::My_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace::My_Poller_1::My_Poller_1',
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
                            noTMStats: false,
                            tags: undefined
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        id: 'My_Namespace::My_Poller_1::My_Poller_1'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 300,
                        name: 'My_Poller_1',
                        namespace: 'My_Namespace_2',
                        systemName: 'My_Poller_1',
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace_2::My_Poller_1::My_Poller_1',
                            type: 'output'
                        },
                        traceName: 'My_Namespace_2::My_Poller_1::My_Poller_1',
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
                        id: 'My_Namespace_2::My_Poller_1::My_Poller_1'
                    }
                ]
            }
        },
        {
            name: 'should not create data routes when no Consumers defined',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    systemPoller: {
                        interval: 234
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        enable: true,
                        systemPoller: {
                            interval: 234
                        }
                    }
                }
            },
            expected: {
                mappings: {},
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
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
            name: 'should create data routes when multiple Consumers and Namespaces defined',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
                    systemPoller: {
                        interval: 234
                    }
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host2',
                    systemPoller: {
                        interval: 234
                    }
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
                        host: 'host3',
                        systemPoller: {
                            interval: 234
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host4',
                        systemPoller: {
                            interval: 234
                        }
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
                        host: 'host5',
                        systemPoller: {
                            interval: 234
                        }
                    },
                    My_System_2: {
                        class: 'Telemetry_System',
                        enable: true,
                        host: 'host6',
                        systemPoller: {
                            interval: 234
                        }
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
                    'f5telemetry_default::My_System::SystemPoller_1': ['f5telemetry_default::My_Consumer_1', 'f5telemetry_default::My_Consumer_2'],
                    'f5telemetry_default::My_System_2::SystemPoller_1': ['f5telemetry_default::My_Consumer_1', 'f5telemetry_default::My_Consumer_2'],
                    'My_Namespace::My_System::SystemPoller_1': ['My_Namespace::My_Consumer_1', 'My_Namespace::My_Consumer_2'],
                    'My_Namespace::My_System_2::SystemPoller_1': ['My_Namespace::My_Consumer_1', 'My_Namespace::My_Consumer_2'],
                    'My_Namespace_2::My_System::SystemPoller_1': ['My_Namespace_2::My_Consumer_1', 'My_Namespace_2::My_Consumer_2'],
                    'My_Namespace_2::My_System_2::SystemPoller_1': ['My_Namespace_2::My_Consumer_1', 'My_Namespace_2::My_Consumer_2']
                },
                components: [
                    {
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::My_System::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System',
                        traceName: 'f5telemetry_default::My_System::SystemPoller_1',
                        connection: {
                            host: 'host1',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System_2::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'f5telemetry_default::My_System_2::SystemPoller_1',
                        namespace: 'f5telemetry_default',
                        systemName: 'My_System_2',
                        traceName: 'f5telemetry_default::My_System_2::SystemPoller_1',
                        connection: {
                            host: 'host2',
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
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System::SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System',
                        traceName: 'My_Namespace::My_System::SystemPoller_1',
                        connection: {
                            host: 'host3',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace::My_System_2::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace::My_System_2::SystemPoller_1',
                        namespace: 'My_Namespace',
                        systemName: 'My_System_2',
                        traceName: 'My_Namespace::My_System_2::SystemPoller_1',
                        connection: {
                            host: 'host4',
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
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace_2::My_System::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace_2::My_System::SystemPoller_1',
                        namespace: 'My_Namespace_2',
                        systemName: 'My_System',
                        traceName: 'My_Namespace_2::My_System::SystemPoller_1',
                        connection: {
                            host: 'host5',
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
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_System_Poller.My_Namespace_2::My_System_2::SystemPoller_1',
                            type: 'output'
                        },
                        interval: 234,
                        name: 'SystemPoller_1',
                        id: 'My_Namespace_2::My_System_2::SystemPoller_1',
                        namespace: 'My_Namespace_2',
                        systemName: 'My_System_2',
                        traceName: 'My_Namespace_2::My_System_2::SystemPoller_1',
                        connection: {
                            host: 'host6',
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
