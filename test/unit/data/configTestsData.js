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

const sourceCode = require('../shared/sourceCode');

const appInfo = sourceCode('src/lib/appInfo');

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
                    schemaVersion: appInfo.version
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version
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
                        host: '192.168.2.1',
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
                    schemaVersion: appInfo.version
                },
                expectedValidatedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version
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
                        host: '192.168.2.1',
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            passphrase: {
                                cipherText: 'passphrase' // check that configUtil.decryptSecrets called
                            }
                        }
                    }
                },
                expectedExpandedDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                        host: '192.168.2.1',
                        path: '/foo',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        },
                        compressionType: 'none'
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
                            host: '192.168.2.1',
                            path: '/bar',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                    schemaVersion: appInfo.version,
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
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        },
                        compressionType: 'none'
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
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
                            compressionType: 'none'
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            passphrase: 'passphrase', // decrypted secret
                            compressionType: 'none'
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
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
                            },
                            compressionType: 'none'
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
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
                            },
                            compressionType: 'none'
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
                    schemaVersion: appInfo.version,
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        },
                        compressionType: 'none'
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            passphrase: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$passphrase'
                            },
                            compressionType: 'none'
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
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        },
                        compressionType: 'none'
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            namespace: 'My_Namespace',
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false,
                            compressionType: 'none',
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
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
                        host: '192.168.2.10',
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
                        host: '192.168.2.10',
                        path: '/',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                            host: '192.168.2.10',
                            allowSelfSignedCert: false,
                            enable: true,
                            path: '/',
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                        host: '192.168.2.10',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        path: '/',
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.10',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.10',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
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
                            host: '192.168.2.1',
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
                        host: '192.168.2.10',
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
                        host: '192.168.2.10',
                        path: '/',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                            host: '192.168.2.10',
                            allowSelfSignedCert: false,
                            enable: true,
                            path: '/',
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                        host: '192.168.2.10',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        path: '/',
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.10',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.10',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
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
                            host: '192.168.2.1',
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
                        path: '/bar',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                },
                expectedFullDeclaration: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        outputMode: 'processed',
                        trace: false,
                        compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/bar',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.My_Namespace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
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
                            host: '192.168.2.1',
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
                    schemaVersion: appInfo.version,
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
                            host: '192.168.2.1',
                            path: '`=/Shared/constants/path`',
                            allowSelfSignedCert: false,
                            enable: true,
                            method: 'POST',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: false,
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
                            host: '192.168.2.1',
                            path: '/foo',
                            port: 443,
                            protocol: 'https',
                            outputMode: 'processed',
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.ExistingNameSpace::My_Consumer',
                                type: 'output'
                            },
                            compressionType: 'none',
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
