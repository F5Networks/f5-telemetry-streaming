/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const common = require('./common');
const declValidator = require('./common').validate;
const sourceCode = require('../shared/sourceCode');

const constants = sourceCode('src/lib/constants');

moduleCache.remember();

describe('Declarations -> AJV Custom Keywords', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('nodeSupportVersion', () => {
        const data = {
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'F5_Cloud',
                f5csTenantId: 'a-blabla-a',
                f5csSensorId: '12345',
                payloadSchemaNid: 'f5',
                serviceAccount: {
                    type: 'not_used',
                    projectId: 'deos-dev',
                    privateKeyId: '11111111111111111111111',
                    privateKey: {
                        cipherText: 'privateKeyValue'
                    },
                    clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                    clientId: '1212121212121212121212',
                    authUri: 'https://accounts.google.com/o/oauth2/auth',
                    tokenUri: 'https://oauth2.googleapis.com/token',
                    authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                    clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
                },
                targetAudience: 'deos-ingest'
            }
        };

        it('should fail because node version too low', () => {
            coreStub.utilMisc.getRuntimeInfo.value(() => ({ nodeVersion: '8.6.0' }));
            return assert.isRejected(declValidator(data), 'requested node version');
        });

        it('should succeed because node version is higher then required', () => {
            coreStub.utilMisc.getRuntimeInfo.value(() => ({ nodeVersion: '8.12.0' }));
            return assert.isFulfilled(declValidator(data));
        });
    });

    describe('pathExists', () => {
        it('should fail to access directory from iHealth declaration', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    downloadFolder: '/some/invalid/dir',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        timeWindow: {
                            start: '08:00',
                            end: '18:00'
                        },
                        frequency: 'daily'
                    }
                }
            };
            return assert.isRejected(declValidator(data), /downloadFolder.*Unable to access path/);
        });

        it('should be able to access directory from iHealth declaration', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    downloadFolder: '/',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        timeWindow: {
                            start: '08:00',
                            end: '18:00'
                        },
                        frequency: 'daily'
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });
    });

    describe('f5secret', () => {
        it('should fail cipherText with wrong device type', () => {
            coreStub.deviceUtil.getDeviceType.resolves(constants.DEVICE_TYPE.CONTAINER);
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        cipherText: 'mycipher'
                    }
                }
            };

            return assert.isRejected(declValidator(data), /requires running on BIG-IP/);
        });

        it('should not re-encrypt', () => {
            const cipher = '$M$fo02';
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        cipherText: cipher,
                        protected: 'SecureVault'
                    }
                }
            };
            return declValidator(data)
                .then(() => {
                    assert.strictEqual(data.My_Poller.passphrase.cipherText, cipher);
                });
        });

        it('should base64 decode cipherText', () => {
            coreStub.deviceUtil.encryptSecret.callsFake((data) => Promise.resolve(`$M$${data}`));
            const cipher = 'ZjVzZWNyZXQ='; // f5secret
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        cipherText: cipher,
                        protected: 'plainBase64'
                    }
                }
            };
            return declValidator(data)
                .then((validated) => {
                    assert.strictEqual(validated.My_Poller.passphrase.cipherText, '$M$f5secret');
                });
        });

        it('should fail when cipherText protected by SecureVault but is not encrypted', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        cipherText: 'mycipher',
                        protected: 'SecureVault'
                    }
                }
            };
            return assert.isRejected(declValidator(data), /should be encrypted by BIG-IP when.*protected.*SecureVault/);
        });

        it('should fail when cipherText or environmentVar missed', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        protected: 'SecureVault'
                    }
                }
            };
            return assert.isRejected(declValidator(data), /missing cipherText or environmentVar/);
        });

        it('should accept environment variable value as valid passphrase property', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        environmentVar: 'MY_ENV_SECRET'
                    }
                }
            };
            return declValidator(data)
                .then((validated) => {
                    assert.deepStrictEqual(validated.My_Poller.passphrase, {
                        class: 'Secret',
                        protected: 'plainText',
                        environmentVar: 'MY_ENV_SECRET'
                    });
                });
        });

        it('should fail when setting environmentVar to empty string', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        environmentVar: ''
                    }
                }
            };
            return assert.isRejected(declValidator(data), /minLength.*environmentVar.*should NOT be shorter than 1 character/);
        });
    });

    describe('f5expand', () => {
        it('should expand pointer (absolute)', () => {
            const data = {
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
                    path: '`=/Shared/constants/path`'
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Consumer.path, '/foo');
                });
        });

        it('should expand pointer (absolute) within Namespace', () => {
            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/upperfoo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '`=/Shared/constants/path`'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/nsfoo'
                        }
                    },
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`'
                    }
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Namespace.My_NS_Consumer.path, '/nsfoo');
                    assert.strictEqual(validated.My_Consumer.path, '/upperfoo');
                });
        });

        it('should expand pointer (relative)', () => {
            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '`=host`'
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Consumer.path, '192.168.2.1');
                });
        });

        it('should expand pointer (relative) for Namespaced object', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '`=host`'
                    }
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Namespace.My_NS_Consumer.path, '192.168.2.1');
                });
        });

        it('should expand pointer (relative to class)', () => {
            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '/',
                    headers: [
                        {
                            name: 'foo',
                            value: '`=@/host`'
                        }
                    ]
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Consumer.headers[0].value, '192.168.2.1');
                });
        });

        it('should expand pointer (relative to class) for Namespaced object', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '/',
                        headers: [
                            {
                                name: 'foo',
                                value: '`=@/host`'
                            }
                        ]
                    }
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Namespace.My_NS_Consumer.headers[0].value, '192.168.2.1');
                });
        });

        it('should expand pointer (multiple pointers in string)', () => {
            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: 'foo',
                        path2: 'baz'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '/`=/Shared/constants/path`/bar/`=/Shared/constants/path2`'
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Consumer.path, '/foo/bar/baz');
                });
        });

        it('should expand pointer (base64 decode)', () => {
            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: 'Zm9v' // base64 'foo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '`+/Shared/constants/path`'
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.strictEqual(validated.My_Consumer.path, 'foo');
                });
        });

        it('should expand pointer (object)', () => {
            const expectedValue = {
                class: 'Secret',
                cipherText: '$M$foo',
                protected: 'SecureVault'
            };
            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    secret: {
                        class: 'Secret',
                        cipherText: 'foo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '`>/Shared/secret`',
                    headers: [
                        {
                            name: 'foo',
                            value: '`>@/passphrase`'
                        }
                    ],
                    passphrase: {
                        class: 'Secret',
                        cipherText: 'foo'
                    }
                }
            };

            return declValidator(data, { options: { expanded: true } })
                .then((validated) => {
                    assert.deepStrictEqual(validated.My_Consumer.path, expectedValue);
                    assert.deepStrictEqual(validated.My_Consumer.headers[0].value, expectedValue);
                    return assert.isFulfilled(declValidator(validated));
                });
        });

        it('should fail pointer (object) with additional chars', () => {
            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '`>passphrase`foo',
                    passphrase: {
                        cipherText: 'foo'
                    }
                }
            };
            return assert.isRejected(declValidator(data, { options: { expanded: true } }), /syntax requires single pointer/);
        });

        it('should fail pointer (absolute) outside \'Shared\'', () => {
            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '`=/class`'
                }
            };
            return assert.isRejected(declValidator(data, { options: { expanded: true } }), /requires pointers root to be 'Shared'/);
        });

        it('should fail expanding pointer (absolute) outside of Namespace', () => {
            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/badfoo'
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`'
                    }
                }
            };
            return assert.isRejected(declValidator(data, { options: { expanded: true } }), /Unable to expand JSON-pointer '`=\/Shared\/constants\/path`'/);
        });

        it('should fail with correct dataPath when pointer is outside of Namespace', () => {
            const data = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/badfoo'
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '`=/Shared/constants/path`'
                    }
                }
            };
            return assert.isRejected(declValidator(data, { options: { expanded: true } }), /dataPath":"\/My_Namespace\/My_NS_Consumer\/path/);
        });
    });

    describe('hostConnectivityCheck', () => {
        it('should pass host network check', () => {
            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Graphite',
                    host: '192.168.2.1',
                    enableHostConnectivityCheck: true
                }
            };
            return declValidator(data)
                .then(() => {
                    assert.strictEqual(coreStub.utilMisc.networkCheck.called, true);
                });
        });

        it('should pass host network check when multiple hosts specified', () => {
            // duplicates because it validates twice
            const hosts = [
                '192.168.2.1',
                '192.168.2.2',
                '192.168.2.3',
                '192.168.2.4'
            ];
            const expected = [
                '192.168.2.1',
                '192.168.2.1',
                '192.168.2.2',
                '192.168.2.2',
                '192.168.2.3',
                '192.168.2.3',
                '192.168.2.4',
                '192.168.2.4'
            ];

            const called = [];
            coreStub.utilMisc.networkCheck.callsFake((host) => {
                called.push(host);
                return Promise.resolve();
            });

            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: hosts[0],
                    fallbackHosts: hosts.slice(1),
                    enableHostConnectivityCheck: true
                }
            };
            return declValidator(data)
                .then(() => {
                    // sort just in case
                    called.sort();
                    expected.sort();
                    assert.ok(called.length > 0, 'should be called at least once');
                    assert.deepStrictEqual(called, expected);
                });
        });

        it('should expand parent objects successfully when multiple hosts specified in a Namespace', () => {
            const hostList = [
                '192.168.2.1',
                '192.168.2.2',
                '192.168.2.3',
                '192.168.2.4'
            ];

            // duplicates because it validates twice
            const expected = [
                { host: '192.168.2.1', port: 443 }, // My_Consumer host
                { host: '192.168.2.3', port: 443 }, // My_Consumer fallback[0]
                { host: '192.168.2.4', port: 443 }, // My_Consumer fallback[0]
                { host: '192.168.2.2', port: 443 }, // My_NS_Consumer host
                { host: '192.168.2.4', port: 443 }, // My_NS_Consumer fallback[0],
                { host: '192.168.2.1', port: 443 }, // My_Consumer host
                { host: '192.168.2.3', port: 443 }, // My_Consumer fallback[0]
                { host: '192.168.2.4', port: 443 }, // My_Consumer fallback[0]
                { host: '192.168.2.2', port: 443 }, // My_NS_Consumer host
                { host: '192.168.2.4', port: 443 } // My_NS_Consumer fallback[0]
            ];

            const called = [];

            coreStub.utilMisc.networkCheck.callsFake((host, port) => {
                called.push({ host, port });
                return Promise.resolve();
            });

            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: hostList[0],
                    fallbackHosts: hostList.slice(2),
                    enableHostConnectivityCheck: true
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: hostList[1],
                        fallbackHosts: hostList.slice(3),
                        enableHostConnectivityCheck: true
                    }
                }
            };
            return declValidator(data)
                .then(() => {
                    assert.deepStrictEqual(called, expected);
                });
        });

        it('should fail host network check', () => {
            const errMsg = 'failed network check';
            coreStub.utilMisc.networkCheck.rejects(new Error(errMsg));

            const data = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Graphite',
                    host: '192.168.2.1',
                    enableHostConnectivityCheck: true
                }
            };
            return assert.isRejected(declValidator(data), new RegExp(errMsg));
        });
    });

    describe('declarationClassProp', () => {
        it('should resolve full item path based on class and prop name', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        testA: {
                            name: 'a',
                            path: '/1/a'
                        },
                        a: {
                            name: 'a',
                            path: 'something/a'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'My_Endpoints/a'
                        ]
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should resolve full item in Namespace', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Endpoints: {
                        class: 'Telemetry_Endpoints',
                        items: {
                            a: {
                                name: 'a',
                                path: 'something/a'
                            }
                        }
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 100,
                            endpointList: [
                                'My_Endpoints/a'
                            ]
                        }
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should trim leading and trailing backslashes', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        testA: {
                            name: 'a',
                            path: '/1/a'
                        },
                        a: {
                            name: 'a',
                            path: 'something/a'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            '/My_Endpoints/a/'
                        ]
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should return error when full item path cannot be resolved', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        testA: {
                            name: 'a',
                            path: '/1/a'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'My_Endpoints/testA',
                            'My_Endpoints/i_dont_exist'
                        ]
                    }
                }
            };
            const errMsg = 'Unable to find \\"My_Endpoints/items/i_dont_exist\\"';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when value is not valid declarationClassProp', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        testA: {
                            name: 'a',
                            path: '/1/a'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'Non_Existing'
                        ]
                    }
                }
            };
            const errMsg = '\\"Non_Existing\\" does not follow format \\"ObjectName/key1\\"';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object referenced is not correct class', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_System'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'My_Endpoints/something'
                        ]
                    }
                }
            };
            const errMsg = '\\"My_Endpoints\\" must be of object type and class \\"Telemetry_Endpoints\\"';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object referenced is not in the named Namespace', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        a: {
                            name: 'a',
                            path: 'something/a'
                        }
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: {
                            interval: 100,
                            endpointList: [
                                'My_Endpoints/a'
                            ]
                        }
                    }
                }
            };
            const errMsg = '\\"My_Endpoints\\" must be of object type and class \\"Telemetry_Endpoints\\"';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object referenced is not in the default Namespace', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'My_Endpoints/a'
                        ]
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Endpoints: {
                        class: 'Telemetry_Endpoints',
                        items: {
                            a: {
                                name: 'a',
                                path: 'something/a'
                            }
                        }
                    }
                }
            };
            const errMsg = '\\"My_Endpoints\\" must be of object type and class \\"Telemetry_Endpoints\\"';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object referenced is not in the default Namespace, even when using Namespace prefix', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'My_Namespace/My_Endpoints/a'
                        ]
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Endpoints: {
                        class: 'Telemetry_Endpoints',
                        items: {
                            a: {
                                name: 'a',
                                path: 'something/a'
                            }
                        }
                    }
                }
            };
            const errMsg = '\\"My_Namespace/My_Endpoints/a\\" does not follow format \\"ObjectName/key1\\"';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should fail to resolve when instance property matches class property', () => {
            // TODO: this behavior should be fixed in future releases
            const declaration = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        items: {
                            name: 'a',
                            path: '/1/a'
                        }
                    }
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100,
                        endpointList: [
                            'My_Endpoints/items'
                        ]
                    }
                }
            };
            return assert.isFulfilled(declValidator(declaration)
                .then((data) => {
                    assert.notStrictEqual(data.My_System.systemPoller.endpointList[0], 'My_Endpoints/items/items');
                }));
        });
    });

    describe('declarationClass', () => {
        it('should pass when object exists', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_Poller'
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should pass when object only exists in user-defined Namespace', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Poller: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller'
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should pass when object exists in multiple Namespaces', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace_One: {
                    class: 'Telemetry_Namespace',
                    My_Poller_One: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_One'
                    }
                },
                My_Namespace_Two: {
                    class: 'Telemetry_Namespace',
                    My_Poller_Two: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_Two'
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should return error when object referenced is in a different Namespace', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace_One: {
                    class: 'Telemetry_Namespace',
                    My_Poller_One: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_Two'
                    }
                },
                My_Namespace_Two: {
                    class: 'Telemetry_Namespace',
                    My_Poller_Two: {
                        class: 'Telemetry_System_Poller'
                    },
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_Two'
                    }
                }
            };
            const errMsg = 'declaration with name \\"My_Poller_Two\\" and class \\"Telemetry_System_Poller\\" doesn\'t exist';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return return correct dataPath in error when object referenced is in a different Namespace', () => {
            const data = {
                class: 'Telemetry',
                My_Namespace_One: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        systemPoller: 'My_Poller_Two'
                    }
                },
                My_Namespace_Two: {
                    class: 'Telemetry_Namespace',
                    My_Poller_Two: {
                        class: 'Telemetry_System_Poller'
                    }
                }
            };
            const errMsg = /dataPath":"\/My_Namespace_One\/My_System\/systemPoller/;
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object referenced is not correct class', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_Poller'
                }
            };
            const errMsg = 'declaration with name \\"My_Poller\\" and class \\"Telemetry_System_Poller\\" doesn\'t exist';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object referenced is not "object" type', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'class'
                }
            };
            const errMsg = 'declaration with name \\"class\\" and class \\"Telemetry_System_Poller\\" doesn\'t exist';
            return assert.isRejected(declValidator(data), errMsg);
        });

        it('should return error when object not exist', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'Non_Existing_Poller'
                }
            };
            const errMsg = 'declaration with name \\"Non_Existing_Poller\\" and class \\"Telemetry_System_Poller\\" doesn\'t exist';
            return assert.isRejected(declValidator(data), errMsg);
        });
    });
});
