/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('../../../src/lib/constants');

module.exports = {
    processDeclaration: {
        name: '.processDeclaration()',
        tests: [
            {
                name: 'process empty declaration without pre-loaded configuration',
                declaration: {
                    class: 'Telemetry'
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: []
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: []
                }
            },
            {
                name: 'process empty declaration with pre-loaded configuration, should remove all objects',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                declaration: {
                    class: 'Telemetry'
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: []
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: []
                }
            },
            {
                name: 'process complex declaration with pre-loaded configuration',
                additionalTests: true,
                preLoadDeclaration: {
                    class: 'Telemetry'
                },
                declaration: {
                    class: 'Telemetry',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '/foo',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '/bar',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'f5telemetry_default::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'f5telemetry_default'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'f5telemetry_default::My_Consumer',
                            id: 'f5telemetry_default::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'f5telemetry_default',
                            passphrase: 'passphrase' // decrypted secret
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'f5telemetry_default::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'f5telemetry_default'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'f5telemetry_default::My_Consumer',
                            id: 'f5telemetry_default::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'f5telemetry_default',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            }
        ]
    },
    processNamespaceDeclaration: {
        name: '.processNamespaceDeclaration()',
        tests: [
            {
                name: 'process empty Namespace declaration without pre-loaded configuration',
                namespaceName: 'My_Namespace',
                declaration: {
                    class: 'Telemetry_Namespace'
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace'
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    My_Namespace: {
                        class: 'Telemetry_Namespace'
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace'
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: []
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: []
                }
            },
            {
                name: 'process Namespace declaration without pre-loaded configuration',
                namespaceName: 'My_Namespace',
                declaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            },
            {
                name: 'process Namespace declaration with pre-loaded configuration',
                additionalTests: true,
                namespaceName: 'My_Namespace',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                declaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'f5telemetry_default::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'f5telemetry_default',
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'f5telemetry_default::My_Consumer',
                            id: 'f5telemetry_default::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'f5telemetry_default',
                            passphrase: 'passphrase', // decrypted secret
                            skipUpdate: true
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'f5telemetry_default::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'f5telemetry_default'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'f5telemetry_default::My_Consumer',
                            id: 'f5telemetry_default::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'f5telemetry_default',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            },
            {
                name: 'process Namespace declaration with pre-loaded configuration, merge with another Namespace, unchanged namespaces have skipUpdate = true',
                namespaceName: 'My_Namespace',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    }
                },
                declaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace',
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: 'passphrase', // decrypted secret
                            skipUpdate: true
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            },
            {
                name: 'process Namespace declaration with pre-loaded configuration, merge with same empty Namespace',
                namespaceName: 'My_Namespace',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace'
                    }
                },
                declaration: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.10',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.10',
                        path: '/',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.10',
                            allowSelfSignedCert: false,
                            enable: true,
                            path: '/',
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.10',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        path: '/',
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace',
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: 'passphrase', // decrypted secret
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            path: '/',
                            host: '192.0.2.10',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            path: '/',
                            host: '192.0.2.10',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            },
            {
                name: 'process Namespace declaration with pre-loaded configuration, merge changes with same Namespace',
                namespaceName: 'My_Namespace',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    }
                },
                declaration: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.10',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.10',
                        path: '/',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.10',
                            allowSelfSignedCert: false,
                            enable: true,
                            path: '/',
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.10',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        path: '/',
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace',
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: 'passphrase', // decrypted secret
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            path: '/',
                            host: '192.0.2.10',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            path: '/',
                            host: '192.0.2.10',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            },
            {
                name: 'process Namespace declaration with pre-loaded configuration, merge with same Namespace without changes, should re-generate IDs',
                namespaceName: 'My_Namespace',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    }
                },
                declaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/bar'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace',
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: 'passphrase', // decrypted secret
                            skipUpdate: true
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase' // decrypted secret
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        },
                        {
                            name: 'Shared',
                            id: 'My_Namespace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            },
                            namespace: 'My_Namespace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'My_Namespace::My_Consumer',
                            id: 'My_Namespace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            },
            {
                name: 'process Namespace declaration with pre-loaded configuration, merge with same Namespace without objects, should remove all objects',
                namespaceName: 'My_Namespace',
                preLoadDeclaration: {
                    class: 'Telemetry',
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/bar'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    }
                },
                declaration: {
                    class: 'Telemetry_Namespace'
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry_Namespace'
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: constants.VERSION,
                    ExistingNameSpace: {
                        class: 'Telemetry_Namespace',
                        Shared: {
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            }
                        },
                        My_Consumer: {
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    },
                    My_Namespace: {
                        class: 'Telemetry_Namespace'
                    }
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry_Namespace'
                },
                expectedEmittedConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace',
                            skipUpdate: true
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: 'passphrase', // decrypted secret
                            skipUpdate: true
                        }
                    ]
                },
                expectedCurrentConfiguration: {
                    mappings: {},
                    components: [
                        {
                            name: 'Shared',
                            id: 'ExistingNameSpace::Shared',
                            class: 'Shared',
                            constants: {
                                class: 'Constants',
                                path: '/foo'
                            },
                            namespace: 'ExistingNameSpace'
                        },
                        {
                            name: 'My_Consumer',
                            traceName: 'ExistingNameSpace::My_Consumer',
                            id: 'ExistingNameSpace::My_Consumer',
                            class: 'Telemetry_Consumer',
                            type: 'Generic_HTTP',
                            enable: true,
                            method: 'POST',
                            host: '192.0.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'ExistingNameSpace',
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            }
                        }
                    ]
                }
            }
        ]
    }
};
