/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/utils/device');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Declarations', () => {
    let coreStub;

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            persistentStorage,
            teemReporter,
            utilMisc
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Validate Example Declaration from examples/declarations', () => {
        beforeEach(() => {
            // fs access modification to skip folder check
            const originFsAccess = fs.access;
            sinon.stub(fs, 'access').callsFake(function () {
                const path = arguments[0];
                const callback = arguments[arguments.length - 1];
                if (path === 'example_download_folder') {
                    callback();
                } else {
                    originFsAccess.apply(null, arguments);
                }
            });
            // added for F5_Cloud tests
            sinon.stub(utilMisc, 'getRuntimeInfo').value(() => ({ nodeVersion: '8.12.0' }));
        });
        // first let's validate all example declarations
        const baseDir = `${__dirname}/../../examples/declarations`;
        const files = fs.readdirSync(baseDir);
        files.forEach((file) => {
            it(`should validate example: ${file}`, () => {
                const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
                return assert.isFulfilled(configWorker.processDeclaration(data));
            });
        });
    });

    describe('validator', () => {
        it('should validate multiple declarations in parallel', () => {
            const decl1 = {
                class: 'Telemetry',
                My_iHealth_1: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    },
                    proxy: {
                        host: 'localhost'
                    }
                }
            };
            const decl2 = {
                class: 'Telemetry',
                My_iHealth_2: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    },
                    proxy: {
                        host: 'localhost'
                    }
                }
            };
            return assert.isFulfilled(Promise.all([
                configWorker.processDeclaration(decl1),
                configWorker.processDeclaration(decl2)
            ]));
        });

        it('should validate multiple invalid declarations in parallel', () => {
            const pathErrMsg = /downloadFolder.*Unable to access path/;
            const declClassErrMsg = /\\"My_Endpoints\\" must be of object type and class \\"Telemetry_Endpoints\\"/;
            const deviceCheckErrMsg = /requires running on BIG-IP/;
            const networkErrMsg = /failed network check/;

            const errMap = {
                invalidPath: pathErrMsg,
                invalidHost: networkErrMsg,
                invalidClass: declClassErrMsg,
                invalidDevice: deviceCheckErrMsg
            };

            coreStub.utilMisc.networkCheck.rejects(new Error('failed network check'));
            coreStub.deviceUtil.getDeviceType.resolves(constants.DEVICE_TYPE.CONTAINER);

            const decl1 = {
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
            const decl2 = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Graphite',
                    host: '192.0.2.1',
                    enableHostConnectivityCheck: true
                }
            };
            const decl3 = {
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
            const decl4 = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    passphrase: {
                        cipherText: 'mycipher'
                    }
                }
            };
            const errors = {};
            const validate = (name, decl) => configWorker.processDeclaration(decl).catch((e) => {
                errors[name] = e.message || e;
            });
            return Promise.all([
                validate('invalidPath', decl1),
                validate('invalidHost', decl2),
                validate('invalidClass', decl3),
                validate('invalidDevice', decl4)
            ])
                .then(() => {
                    Object.keys(errMap).forEach((errKey) => {
                        const errMsg = errors[errKey];
                        assert.notStrictEqual(errMsg, undefined, `should have error for key "${errKey}"`);
                        assert.ok(errMap[errKey].test(errMsg), `should have error for key "${errKey}`);
                        // check that there are no errors from other declarations
                        Object.keys(errMap).forEach((anotherErrKey) => {
                            if (anotherErrKey === errKey) {
                                return;
                            }
                            assert.notOk(errMap[anotherErrKey].test(errMsg), `should have not error for key "${anotherErrKey}`);
                        });
                    });
                });
        });
    });

    describe('Base Schema objects', () => {
        describe('proxy', () => {
            it('should pass minimal declaration', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        },
                        proxy: {
                            host: 'localhost'
                        }
                    }
                };
                return configWorker.processDeclaration(data)
                    .then((validConfig) => {
                        const proxy = validConfig.My_iHealth.proxy;
                        assert.strictEqual(proxy.protocol, 'http');
                        assert.strictEqual(proxy.host, 'localhost');
                        assert.strictEqual(proxy.port, 80);
                    });
            });

            it('should pass full declaration', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        },
                        proxy: {
                            host: 'localhost',
                            protocol: 'https',
                            port: 80,
                            allowSelfSignedCert: true,
                            enableHostConnectivityCheck: false,
                            username: 'username',
                            passphrase: {
                                cipherText: 'passphrase'
                            }
                        }
                    }
                };
                return configWorker.processDeclaration(data)
                    .then((validConfig) => {
                        const proxy = validConfig.My_iHealth.proxy;
                        assert.strictEqual(proxy.protocol, 'https');
                        assert.strictEqual(proxy.host, 'localhost');
                        assert.strictEqual(proxy.port, 80);
                        assert.strictEqual(proxy.allowSelfSignedCert, true);
                        assert.strictEqual(proxy.enableHostConnectivityCheck, false);
                        assert.strictEqual(proxy.username, 'username');
                        assert.strictEqual(proxy.passphrase.cipherText, '$M$passphrase');
                    });
            });

            it('should fail when no host specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {}
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /host.*should have required property 'host'/);
            });

            it('should fail when invalid port specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {
                            host: 'localhost',
                            port: 999999
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /proxy\/port.*should be <=/);
            });

            it('should fail when invalid protocol specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {
                            host: 'localhost',
                            protocol: 'http2'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /proxy\/protocol.*should be equal to one of the allowed values/);
            });

            it('should fail when invalid allowSelfSignedCert specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {
                            host: 'localhost',
                            allowSelfSignedCert: 'something'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /proxy\/allowSelfSignedCert.*should be boolean/);
            });

            it('should fail when invalid enableHostConnectivityCheck specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {
                            host: 'localhost',
                            enableHostConnectivityCheck: 'something'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /proxy\/enableHostConnectivityCheck.*should be boolean/);
            });

            it('should not allow additional properties', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {
                            host: 'localhost',
                            someProp: 'someValue'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /someProp.*should NOT have additional properties/);
            });

            it('should fail when passphrase specified alone', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        proxy: {
                            host: 'localhost',
                            passphrase: {
                                cipherText: 'passphrase'
                            }
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /should have property username when property passphrase is present/);
            });
        });

        describe('actions', () => {
            it('should fail when multiple actions are in the same action object', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 90,
                        actions: [
                            {
                                enable: true,
                                includeData: {},
                                excludeData: {},
                                locations: {
                                    system: true
                                }
                            }
                        ]
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /My_Poller\/actions\/0.*should NOT be valid/);
            });

            describe('locations', () => {
                it('should pass with empty locations', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {}
                                    }
                                ]
                            }
                        }
                    };
                    return configWorker.processDeclaration(data)
                        .then((validConfig) => {
                            const actions = validConfig.My_System.systemPoller.actions;
                            assert.deepStrictEqual(actions[0].locations, {});
                        });
                });

                it('should pass with location type of boolean', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {
                                            a: true
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return configWorker.processDeclaration(data)
                        .then((validConfig) => {
                            const actions = validConfig.My_System.systemPoller.actions;
                            assert.deepStrictEqual(actions[0].locations, { a: true });
                        });
                });

                it('should fail with location type boolean with value of false', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {
                                            a: false
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return assert.isRejected(configWorker.processDeclaration(data), /should match exactly one schema in oneOf/);
                });

                it('should pass with object type location with single property', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {
                                            a: {
                                                b: true
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return configWorker.processDeclaration(data)
                        .then((validConfig) => {
                            const actions = validConfig.My_System.systemPoller.actions;
                            assert.deepStrictEqual(actions[0].locations, { a: { b: true } });
                        });
                });

                it('should pass with object type location with multiple properties', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {
                                            a: {
                                                b: true,
                                                c: {
                                                    d: true
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return configWorker.processDeclaration(data)
                        .then((validConfig) => {
                            const actions = validConfig.My_System.systemPoller.actions;
                            assert.deepStrictEqual(actions[0].locations, { a: { b: true, c: { d: true } } });
                        });
                });

                it('should fail with object type location with multiple properties and one is false', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {
                                            a: {
                                                b: true,
                                                c: {
                                                    d: false
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return assert.isRejected(configWorker.processDeclaration(data), /should match exactly one schema in oneOf.*locations/);
                });

                it('should fail with object type location with multiple properties and one is invalid type', () => {
                    const data = {
                        class: 'Telemetry',
                        My_System: {
                            class: 'Telemetry_System',
                            systemPoller: {
                                actions: [
                                    {
                                        setTag: {
                                            newTag: 'tag value'
                                        },
                                        locations: {
                                            a: {
                                                b: true,
                                                c: {
                                                    d: []
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return assert.isRejected(configWorker.processDeclaration(data), /should match exactly one schema in oneOf.*locations/);
                });

                it('should fail when a location is not provided with includeData action', () => {
                    const data = {
                        class: 'Telemetry',
                        My_Poller: {
                            class: 'Telemetry_System_Poller',
                            interval: 90,
                            actions: [
                                {
                                    enable: true,
                                    excludeData: {}
                                }
                            ]
                        }
                    };
                    return assert.isRejected(configWorker.processDeclaration(data), /dependencies\/excludeData\/allOf\/0\/required.*should have required property 'locations'/);
                });

                it('should pass when regexes are used in action locations', () => {
                    const data = {
                        class: 'Telemetry',
                        My_Poller: {
                            class: 'Telemetry_System_Poller',
                            interval: 90,
                            actions: [
                                {
                                    enable: true,
                                    includeData: {},
                                    locations: {
                                        virtualServers: {
                                            vs$: true
                                        },
                                        pools: {
                                            '^/Common/Shared/': true
                                        }
                                    }
                                }
                            ]
                        }
                    };
                    return configWorker.processDeclaration(data)
                        .then((validConfig) => {
                            const poller = validConfig.My_Poller;
                            assert.deepStrictEqual(poller.actions[0].locations.virtualServers, { vs$: true });
                            assert.deepStrictEqual(poller.actions[0].locations.pools, { '^/Common/Shared/': true });
                        });
                });
            });
        });
    });

    describe('AJV Custom Keywords', () => {
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
                return assert.isRejected(configWorker.processDeclaration(data), 'requested node version');
            });

            it('should succeed because node version is higher then required', () => {
                coreStub.utilMisc.getRuntimeInfo.value(() => ({ nodeVersion: '8.12.0' }));
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isRejected(configWorker.processDeclaration(data), /downloadFolder.*Unable to access path/);
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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

                return assert.isRejected(configWorker.processDeclaration(data), /requires running on BIG-IP/);
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
                return configWorker.processDeclaration(data)
                    .then(() => {
                        assert.strictEqual(data.My_Poller.passphrase.cipherText, cipher);
                    });
            });

            it('should base64 decode cipherText', () => {
                coreStub.deviceUtil.encryptSecret.callsFake(data => Promise.resolve(`$M$${data}`));
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
                return configWorker.processDeclaration(data)
                    .then(() => {
                        assert.strictEqual(data.My_Poller.passphrase.cipherText, '$M$f5secret');
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
                return assert.isRejected(configWorker.processDeclaration(data), /should be encrypted by BIG-IP when.*protected.*SecureVault/);
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
                return assert.isRejected(configWorker.processDeclaration(data), /missing cipherText or environmentVar/);
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
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`'
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
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
                        host: '192.0.2.1',
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
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`'
                        }
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
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
                        host: '192.0.2.1',
                        path: '`=host`'
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Consumer.path, '192.0.2.1');
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
                            host: '192.0.2.1',
                            path: '`=host`'
                        }
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Namespace.My_NS_Consumer.path, '192.0.2.1');
                    });
            });

            it('should expand pointer (relative to class)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '/',
                        headers: [
                            {
                                name: 'foo',
                                value: '`=@/host`'
                            }
                        ]
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Consumer.headers[0].value, '192.0.2.1');
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
                            host: '192.0.2.1',
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

                return configWorker.processDeclaration(data, { expanded: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Namespace.My_NS_Consumer.headers[0].value, '192.0.2.1');
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
                        host: '192.0.2.1',
                        path: '/`=/Shared/constants/path`/bar/`=/Shared/constants/path2`'
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
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
                        host: '192.0.2.1',
                        path: '`+/Shared/constants/path`'
                    }
                };

                return configWorker.processDeclaration(data, { expanded: true })
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
                        host: '192.0.2.1',
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

                return configWorker.processDeclaration(data, { expanded: true })
                    .then((validated) => {
                        assert.deepStrictEqual(validated.My_Consumer.path, expectedValue);
                        assert.deepStrictEqual(validated.My_Consumer.headers[0].value, expectedValue);
                        return assert.isFulfilled(configWorker.processDeclaration(validated));
                    });
            });

            it('should fail pointer (object) with additional chars', () => {
                const data = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`>passphrase`foo',
                        passphrase: {
                            cipherText: 'foo'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data, { expanded: true }), /syntax requires single pointer/);
            });

            it('should fail pointer (absolute) outside \'Shared\'', () => {
                const data = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/class`'
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data, { expanded: true }), /requires pointers root to be 'Shared'/);
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
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data, { expanded: true }), /Cannot read property 'constants' of undefined/);
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
                            host: '192.0.2.1',
                            path: '`=/Shared/constants/path`'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data, { expanded: true }), /dataPath":"\/My_Namespace\/My_NS_Consumer\/path/);
            });
        });

        describe('hostConnectivityCheck', () => {
            it('should pass host network check', () => {
                const data = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Graphite',
                        host: '192.0.2.1',
                        enableHostConnectivityCheck: true
                    }
                };
                return configWorker.processDeclaration(data)
                    .then(() => {
                        assert.strictEqual(coreStub.utilMisc.networkCheck.called, true);
                    });
            });

            it('should pass host network check when multiple hosts specified', () => {
                // duplicates because it validates twice
                const hosts = [
                    '192.0.2.1',
                    '192.0.2.2',
                    '192.0.2.3',
                    '192.0.2.4'
                ];
                const expected = [
                    '192.0.2.1',
                    '192.0.2.1',
                    '192.0.2.2',
                    '192.0.2.2',
                    '192.0.2.3',
                    '192.0.2.3',
                    '192.0.2.4',
                    '192.0.2.4'
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
                return configWorker.processDeclaration(data)
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
                    '192.0.2.1',
                    '192.0.2.2',
                    '192.0.2.3',
                    '192.0.2.4'
                ];

                // duplicates because it validates twice
                const expected = [
                    { host: '192.0.2.1', port: 443 }, // My_Consumer host
                    { host: '192.0.2.3', port: 443 }, // My_Consumer fallback[0]
                    { host: '192.0.2.4', port: 443 }, // My_Consumer fallback[0]
                    { host: '192.0.2.2', port: 443 }, // My_NS_Consumer host
                    { host: '192.0.2.4', port: 443 }, // My_NS_Consumer fallback[0],
                    { host: '192.0.2.1', port: 443 }, // My_Consumer host
                    { host: '192.0.2.3', port: 443 }, // My_Consumer fallback[0]
                    { host: '192.0.2.4', port: 443 }, // My_Consumer fallback[0]
                    { host: '192.0.2.2', port: 443 }, // My_NS_Consumer host
                    { host: '192.0.2.4', port: 443 } // My_NS_Consumer fallback[0]
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
                return configWorker.processDeclaration(data)
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
                        host: '192.0.2.1',
                        enableHostConnectivityCheck: true
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), new RegExp(errMsg));
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isFulfilled(configWorker.processDeclaration(declaration)
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isFulfilled(configWorker.processDeclaration(data));
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
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
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
            });
        });
    });

    describe('Controls', () => {
        describe('logLevel', () => {
            [
                {
                    logLevel: 'debug',
                    expectedToPass: true
                },
                {
                    logLevel: 'info',
                    expectedToPass: true
                },
                {
                    logLevel: 'error',
                    expectedToPass: true
                },
                {
                    logLevel: 'invalidValue',
                    expectedToPass: false
                }
            ].forEach((testCase) => {
                it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "logLevel" to "${testCase.logLevel}"`, () => {
                    const data = {
                        class: 'Telemetry',
                        Controls: {
                            class: 'Controls',
                            logLevel: testCase.logLevel
                        }
                    };
                    if (testCase.expectedToPass) {
                        return configWorker.processDeclaration(data)
                            .then((validConfig) => {
                                assert.strictEqual(validConfig.Controls.logLevel, testCase.logLevel, `'should match "${testCase.logLevel}"`);
                            });
                    }
                    return assert.isRejected(configWorker.processDeclaration(data), /logLevel.*should be equal to one of the allowed value/);
                });
            });
        });

        describe('debug', () => {
            [
                {
                    debug: true,
                    expectedToPass: true
                },
                {
                    debug: false,
                    expectedToPass: true
                },
                {
                    debug: 'invalidValue',
                    expectedToPass: false
                }
            ].forEach((testCase) => {
                it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "debug" to "${testCase.debug}"`, () => {
                    const data = {
                        class: 'Telemetry',
                        Controls: {
                            class: 'Controls',
                            debug: testCase.debug
                        }
                    };
                    if (testCase.expectedToPass) {
                        return configWorker.processDeclaration(data)
                            .then((validConfig) => {
                                assert.strictEqual(validConfig.Controls.debug, testCase.debug, `'should match "${testCase.debug}"`);
                            });
                    }
                    return assert.isRejected(configWorker.processDeclaration(data), /debug.*should be boolean/);
                });
            });
        });

        describe('memoryThresholdPercent', () => {
            [
                {
                    memoryThresholdPercent: 1,
                    expectedToPass: true
                },
                {
                    memoryThresholdPercent: 100,
                    expectedToPass: true
                },
                {
                    memoryThresholdPercent: 50,
                    expectedToPass: true
                },
                {
                    memoryThresholdPercent: 101,
                    expectedToPass: false,
                    errorMsg: /memoryThresholdPercent.*should be <= 100/
                },
                {
                    memoryThresholdPercent: 0,
                    expectedToPass: false,
                    errorMsg: /memoryThresholdPercent.*should be >= 1/
                },
                {
                    memoryThresholdPercent: 'invalidValue',
                    expectedToPass: false,
                    errorMsg: /memoryThresholdPercent.*should be integer/
                }
            ].forEach((testCase) => {
                it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "memoryThresholdPercent" to "${testCase.memoryThresholdPercent}"`, () => {
                    const data = {
                        class: 'Telemetry',
                        Controls: {
                            class: 'Controls',
                            memoryThresholdPercent: testCase.memoryThresholdPercent
                        }
                    };
                    if (testCase.expectedToPass) {
                        return configWorker.processDeclaration(data)
                            .then((validConfig) => {
                                assert.strictEqual(validConfig.Controls.memoryThresholdPercent, testCase.memoryThresholdPercent, `'should match "${testCase.memoryThresholdPercent}"`);
                            });
                    }
                    return assert.isRejected(configWorker.processDeclaration(data), testCase.errorMsg);
                });
            });
        });
    });

    describe('Telemetry_System_Poller', () => {
        it('should pass minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller'
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_Poller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.class, 'Telemetry_System_Poller');
                    assert.strictEqual(poller.enable, true);
                    assert.strictEqual(poller.trace, undefined);
                    assert.strictEqual(poller.interval, 300);
                    assert.deepStrictEqual(poller.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                    assert.strictEqual(poller.actions[0].ifAllMatch, undefined);
                    assert.strictEqual(poller.actions[0].locations, undefined);
                    assert.strictEqual(poller.host, 'localhost');
                    assert.strictEqual(poller.port, 8100);
                    assert.strictEqual(poller.protocol, 'http');
                    assert.strictEqual(poller.allowSelfSignedCert, false);
                    assert.strictEqual(poller.enableHostConnectivityCheck, undefined);
                    assert.strictEqual(poller.username, undefined);
                    assert.strictEqual(poller.passphrase, undefined);
                    assert.strictEqual(poller.endpointList, undefined);
                });
        });

        it('should pass full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    enable: true,
                    trace: true,
                    interval: 150,
                    tag: {
                        tenant: '`B`',
                        application: '`C`'
                    },
                    host: 'somehost',
                    port: 5000,
                    protocol: 'http',
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: false,
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    actions: [
                        {
                            enable: true,
                            setTag: {
                                tag1: 'tag1 value',
                                tag2: {}
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            },
                            locations: {
                                virtualServers: {
                                    '.*': true
                                }
                            }
                        },
                        {
                            enable: true,
                            includeData: {},
                            locations: {
                                system: true
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            }
                        },
                        {
                            enable: true,
                            excludeData: {},
                            locations: {
                                pools: true
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            }
                        },
                        {
                            enable: true,
                            includeData: {},
                            locations: {
                                virtualServers: true
                            },
                            ifAnyMatch: [
                                {
                                    system: {
                                        hostname: 'bigip1.example.com'
                                    }
                                },
                                {
                                    system: {
                                        hostname: 'bigip2.example.com'
                                    }
                                }
                            ]
                        }
                    ],
                    endpointList: [
                        {
                            name: 'myEndpoint',
                            path: 'myPath'
                        }
                    ]
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_Poller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.class, 'Telemetry_System_Poller');
                    assert.strictEqual(poller.enable, true);
                    assert.strictEqual(poller.trace, true);
                    assert.strictEqual(poller.interval, 150);
                    assert.deepStrictEqual(poller.tag, { tenant: '`B`', application: '`C`' });
                    assert.strictEqual(poller.host, 'somehost');
                    assert.strictEqual(poller.port, 5000);
                    assert.strictEqual(poller.protocol, 'http');
                    assert.strictEqual(poller.allowSelfSignedCert, true);
                    assert.strictEqual(poller.enableHostConnectivityCheck, false);
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                    assert.strictEqual(poller.actions[0].enable, true);
                    // setTag action
                    assert.deepStrictEqual(poller.actions[0].setTag, { tag1: 'tag1 value', tag2: {} });
                    assert.deepStrictEqual(poller.actions[0].ifAllMatch, { system: { location: 'system_location' } });
                    assert.deepStrictEqual(poller.actions[0].locations, { virtualServers: { '.*': true } });
                    // includeData action
                    assert.deepStrictEqual(poller.actions[1].includeData, {});
                    assert.deepStrictEqual(poller.actions[1].locations, { system: true });
                    assert.deepStrictEqual(poller.actions[1].ifAllMatch, { system: { location: 'system_location' } });
                    // excludeData action
                    assert.deepStrictEqual(poller.actions[2].excludeData, {});
                    assert.deepStrictEqual(poller.actions[2].locations, { pools: true });
                    assert.deepStrictEqual(poller.actions[2].ifAllMatch, { system: { location: 'system_location' } });
                    // ifAnyMatch with includeData
                    assert.deepStrictEqual(poller.actions[3].includeData, {});
                    assert.deepStrictEqual(poller.actions[3].locations, { virtualServers: true });
                    assert.deepStrictEqual(
                        poller.actions[3].ifAnyMatch,
                        [{ system: { hostname: 'bigip1.example.com' } }, { system: { hostname: 'bigip2.example.com' } }]
                    );
                    // endpointList
                    assert.deepStrictEqual(
                        poller.endpointList,
                        [
                            {
                                enable: true,
                                name: 'myEndpoint',
                                path: 'myPath'
                            }
                        ]
                    );
                });
        });

        it('should not allow JMESPath in the action object', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    interval: 90,
                    actions: [
                        {
                            JMESPath: {},
                            expression: '{ message: @, service: telemetryEventCategory, hostname: hostname }'
                        }
                    ]
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /My_Poller\/actions\/0.*should NOT have additional properties/);
        });

        it('should not allow ifAnyMatch and ifAllMatch in same action', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [
                        {
                            setTag: {
                                tag1: 'tag1 value'
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            },
                            ifAnyMatch: [{
                                system: {
                                    hostname: 'system_hostname'
                                }
                            }],
                            locations: {
                                virtualServers: {
                                    '.*': true
                                }
                            }
                        }
                    ]
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /should NOT be valid/);
        });

        it('should not allow an ifAnyMatch block that is not an array', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [
                        {
                            setTag: {
                                tag1: 'tag1 value'
                            },
                            ifAnyMatch: {
                                top: 'level value'
                            },
                            locations: {
                                virtualServers: {
                                    '.*': true
                                }
                            }
                        }
                    ]
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /should be array/);
        });

        it('should not allow additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    someProp: 'someValue'
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /someProp.*should NOT have additional properties/);
        });

        describe('interval', () => {
            it('should allow interval=0 when endpointList is specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 0,
                        endpointList: {
                            items: {
                                testA: { name: 'a', path: 'some/a' }
                            }
                        }
                    }
                };
                return configWorker.processDeclaration(data)
                    .then(validated => assert.strictEqual(validated.My_Poller.interval, 0));
            });

            it('should allow interval=0 when endpointList is not specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    }
                };
                return configWorker.processDeclaration(data)
                    .then(validated => assert.strictEqual(validated.My_Poller.interval, 0));
            });

            it('should restrict minimum to 60 when endpointList is NOT specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 10
                    }
                };
                const errMsg = /interval\/minimum.*should be >= 60/;
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
            });

            it('should restrict maximum to 6000 when endpointList is NOT specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 60001
                    }
                };
                const errMsg = /interval\/maximum.*should be <= 6000/;
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
            });

            it('should not restrict maximum to 6000 when endpointList is specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 100000,
                        endpointList: {
                            items: {
                                testA: { name: 'a', path: 'some/a' }
                            }
                        }
                    }
                };
                return configWorker.processDeclaration(data)
                    .then(validated => assert.strictEqual(validated.My_Poller.interval, 100000));
            });
        });

        describe('endpointList', () => {
            it('should allow endpointList as array (with different item types)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Endpoints1: {
                        class: 'Telemetry_Endpoints',
                        enable: true,
                        items: {
                            testA: {
                                name: 'a',
                                path: '/test/a',
                                enable: false
                            },
                            testB: {
                                name: 'b',
                                path: '/test/b'
                            }
                        }
                    },
                    My_Endpoints2: {
                        class: 'Telemetry_Endpoints',
                        enable: true,
                        basePath: '/testing',
                        items: {
                            testC: {
                                name: 'c',
                                path: '/item/c',
                                enable: false
                            },
                            testD: {
                                name: 'd',
                                path: '/item/d'
                            }
                        }
                    },
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        endpointList: [
                            'My_Endpoints1',
                            'My_Endpoints2/testD',
                            {
                                name: 'anEndpoint',
                                path: 'aPath'
                            },
                            {
                                basePath: '/myBase/',
                                items: {
                                    myEndpoint: {
                                        name: 'myEndpoint',
                                        path: 'myPath'
                                    }
                                }
                            }
                        ]
                    }
                };
                return configWorker.processDeclaration(data)
                    .then((validConfig) => {
                        const poller = validConfig.My_Poller;
                        assert.deepStrictEqual(
                            poller.endpointList,
                            [
                                'My_Endpoints1',
                                'My_Endpoints2/testD',
                                {
                                    name: 'anEndpoint',
                                    path: 'aPath',
                                    enable: true
                                },
                                {
                                    enable: true,
                                    basePath: '/myBase/',
                                    items: {
                                        myEndpoint: {
                                            name: 'myEndpoint',
                                            path: 'myPath',
                                            enable: true
                                        }
                                    }
                                }
                            ]
                        );
                    });
            });

            it('should require endpointList to have at least one item if array', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        endpointList: []
                    }
                };
                const errMsg = 'should NOT have fewer than 1 items';
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
            });

            it('should not allow endpointList to be empty object', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        endpointList: {}
                    }
                };
                const errMsg = 'should have required property \'items\'';
                return assert.isRejected(configWorker.processDeclaration(data), errMsg);
            });

            it('should allow endpointList as Telemetry_Endpoints (as single reference)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Endpoints: {
                        class: 'Telemetry_Endpoints',
                        enable: true,
                        items: {
                            testA: { name: 'a', path: 'some/a' }
                        }
                    },
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        endpointList: 'My_Endpoints'
                    }
                };
                return configWorker.processDeclaration(data)
                    .then((validConfig) => {
                        const poller = validConfig.My_Poller;
                        assert.deepStrictEqual(poller.endpointList, 'My_Endpoints');
                    });
            });

            it('should allow endpointList as Telemetry_Endpoints (as inline object)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        endpointList: {
                            enable: true,
                            items: {
                                testA: { name: 'a', path: 'some/a' }
                            }
                        }
                    }
                };
                return configWorker.processDeclaration(data)
                    .then((validConfig) => {
                        const poller = validConfig.My_Poller;
                        assert.deepStrictEqual(poller.endpointList,
                            {
                                enable: true,
                                items: {
                                    testA: {
                                        enable: true,
                                        name: 'a',
                                        path: 'some/a'
                                    }
                                },
                                basePath: ''
                            });
                    });
            });
        });
    });

    describe('Telemetry_Listener', () => {
        it('should pass minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener'
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const listener = validConfig.My_Listener;
                    assert.notStrictEqual(listener, undefined);
                    assert.strictEqual(listener.class, 'Telemetry_Listener');
                    assert.strictEqual(listener.enable, true);
                    assert.strictEqual(listener.trace, false);
                    assert.strictEqual(listener.port, 6514);
                    assert.deepStrictEqual(listener.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                    assert.deepStrictEqual(listener.match, '');
                });
        });

        it('should pass full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener',
                    enable: true,
                    trace: true,
                    port: 5000,
                    tag: {
                        tenant: '`B`',
                        application: '`C`'
                    },
                    match: 'matchSomething',
                    actions: [
                        {
                            enable: true,
                            setTag: {
                                tag1: 'tag1 value',
                                tag2: {}
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            },
                            locations: {
                                virtualServers: {
                                    '.*': true
                                }
                            }
                        },
                        {
                            enable: true,
                            includeData: {},
                            locations: {
                                system: true
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            }
                        },
                        {
                            enable: true,
                            excludeData: {},
                            locations: {
                                pools: true
                            },
                            ifAllMatch: {
                                system: {
                                    location: 'system_location'
                                }
                            }
                        }
                    ]
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const listener = validConfig.My_Listener;
                    assert.notStrictEqual(listener, undefined);
                    assert.strictEqual(listener.class, 'Telemetry_Listener');
                    assert.strictEqual(listener.enable, true);
                    assert.strictEqual(listener.trace, true);
                    assert.strictEqual(listener.port, 5000);
                    assert.deepStrictEqual(listener.tag, { tenant: '`B`', application: '`C`' });
                    assert.deepStrictEqual(listener.match, 'matchSomething');
                    assert.strictEqual(listener.actions[0].enable, true);
                    // setTag action
                    assert.deepStrictEqual(listener.actions[0].setTag, { tag1: 'tag1 value', tag2: {} });
                    assert.deepStrictEqual(listener.actions[0].ifAllMatch, { system: { location: 'system_location' } });
                    assert.deepStrictEqual(listener.actions[0].locations, { virtualServers: { '.*': true } });
                    // includeData action
                    assert.deepStrictEqual(listener.actions[1].includeData, {});
                    assert.deepStrictEqual(listener.actions[1].locations, { system: true });
                    assert.deepStrictEqual(listener.actions[1].ifAllMatch, { system: { location: 'system_location' } });
                    // excludeData action
                    assert.deepStrictEqual(listener.actions[2].excludeData, {});
                    assert.deepStrictEqual(listener.actions[2].locations, { pools: true });
                    assert.deepStrictEqual(listener.actions[2].ifAllMatch, { system: { location: 'system_location' } });
                });
        });

        it('should not allow additional properties in declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_Listener',
                    someProp: 'someValue'
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /someProp.*should NOT have additional properties/);
        });

        it('should not allow JMESPath in the action object', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener',
                    port: 6514,
                    actions: [
                        {
                            JMESPath: {},
                            expression: '{ message: @, service: telemetryEventCategory, hostname: hostname }'
                        }
                    ]
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /My_Listener\/actions\/0.*should NOT have additional properties/);
        });
    });

    describe('Telemetry_iHealth_Poller', () => {
        it('should pass minimal declaration', () => {
            const data = {
                class: 'Telemetry',
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
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_iHealth_Poller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.class, 'Telemetry_iHealth_Poller');
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                    assert.deepStrictEqual(poller.interval, {
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        },
                        frequency: 'daily'
                    });
                });
        });

        it('should pass full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    interval: {
                        frequency: 'weekly',
                        day: 1,
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    },
                    proxy: {
                        host: 'localhost',
                        protocol: 'https',
                        port: 80,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'username',
                        passphrase: {
                            cipherText: 'proxyPassphrase'
                        }
                    }
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_iHealth_Poller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.class, 'Telemetry_iHealth_Poller');
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                    assert.deepStrictEqual(poller.interval, {
                        frequency: 'weekly',
                        day: 1,
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    });
                    const proxy = poller.proxy;
                    assert.strictEqual(proxy.protocol, 'https');
                    assert.strictEqual(proxy.host, 'localhost');
                    assert.strictEqual(proxy.port, 80);
                    assert.strictEqual(proxy.allowSelfSignedCert, true);
                    assert.strictEqual(proxy.enableHostConnectivityCheck, false);
                    assert.strictEqual(proxy.username, 'username');
                    assert.strictEqual(proxy.passphrase.cipherText, '$M$proxyPassphrase');
                });
        });

        it('should not allow additional properties in declaration', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    someProp: 'someValue'
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /someProp.*should NOT have additional properties/);
        });

        it('should not allow empty string as downloadFolder\' value', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth_Poller: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    downloadFolder: ''
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /downloadFolder.*minLength/);
        });

        describe('interval', () => {
            it('should pass minimal declaration', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'daily',
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        }
                    }
                };
                return assert.isFulfilled(configWorker.processDeclaration(data));
            });

            it('should pass full declaration', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'weekly',
                            day: 'Sunday',
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        }
                    }
                };
                return assert.isFulfilled(configWorker.processDeclaration(data));
            });

            it('should not allow additional properties', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'weekly',
                            day: 'Sunday',
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            },
                            someProp: 'someValue'
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /someProp.*should NOT have additional properties/);
            });

            it('should fail parse invalid time string', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'daily',
                            timeWindow: {
                                start: '3456',
                                end: '6789'
                            }
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /interval.timeWindow.start.*should match pattern/);
            });

            it('should preserve difference between start and end time (2hr min)', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'daily',
                            timeWindow: {
                                start: '23:00',
                                end: '00:59'
                            }
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /interval.timeWindow.*specify window with size of a/);
            });

            it('should fail when invalid weekly day name specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'weekly',
                            day: 'satursunday',
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /interval.day.*should match pattern/);
            });

            it('should fail when invalid weekly day specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'weekly',
                            day: 8,
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /interval.day.*should be <= 7/);
            });

            it('should fail when invalid monthly day specified', () => {
                const data = {
                    class: 'Telemetry',
                    My_iHealth: {
                        class: 'Telemetry_iHealth_Poller',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        interval: {
                            frequency: 'monthly',
                            day: 35,
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        }
                    }
                };
                return assert.isRejected(configWorker.processDeclaration(data), /interval.day.*should be <= 31/);
            });
        });
    });

    describe('Telemetry_System', () => {
        it('should pass minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const system = validConfig.My_System;
                    assert.notStrictEqual(system, undefined);
                    assert.strictEqual(system.class, 'Telemetry_System');
                    assert.strictEqual(system.enable, true);
                    assert.strictEqual(system.trace, undefined);
                    assert.strictEqual(system.host, 'localhost');
                    assert.strictEqual(system.port, 8100);
                    assert.strictEqual(system.protocol, 'http');
                    assert.strictEqual(system.allowSelfSignedCert, false);
                    assert.strictEqual(system.enableHostConnectivityCheck, undefined);
                    assert.strictEqual(system.username, undefined);
                    assert.strictEqual(system.passphrase, undefined);
                });
        });

        it('should pass full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller'
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
                },
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    trace: true,
                    host: 'somehost',
                    port: 5000,
                    protocol: 'http',
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: false,
                    username: 'username',
                    passphrase: {
                        cipherText: 'passphrase'
                    },
                    systemPoller: [
                        'My_Poller',
                        {
                            interval: 100
                        }
                    ],
                    iHealthPoller: 'My_iHealth_Poller'
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const system = validConfig.My_System;
                    assert.notStrictEqual(system, undefined);
                    assert.strictEqual(system.class, 'Telemetry_System');
                    assert.strictEqual(system.enable, true);
                    assert.strictEqual(system.trace, true);
                    assert.strictEqual(system.host, 'somehost');
                    assert.strictEqual(system.port, 5000);
                    assert.strictEqual(system.protocol, 'http');
                    assert.strictEqual(system.allowSelfSignedCert, true);
                    assert.strictEqual(system.enableHostConnectivityCheck, false);
                    assert.strictEqual(system.username, 'username');
                    assert.strictEqual(system.passphrase.cipherText, '$M$passphrase');
                    assert.strictEqual(system.iHealthPoller, 'My_iHealth_Poller');
                    assert.deepStrictEqual(system.systemPoller, [
                        'My_Poller',
                        {
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            enable: true,
                            interval: 100
                        }
                    ]);
                });
        });

        it('should not allow additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    someProp: 'someValue'
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /someProp.*should NOT have additional properties/);
        });

        it('should allow to attach poller declaration by name', () => {
            const data = {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                }
            };
            return assert.isFulfilled(configWorker.processDeclaration(data));
        });

        it('should fail when non-existing poller declaration attached', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller_Non_existing'
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /declaration with name.*(Telemetry_System_Poller|My_System_Poller_Non_existing)/);
        });

        it('should fail when poller declaration specified by name with invalid type', () => {
            const data = {
                class: 'Telemetry',
                My_System_2: {
                    class: 'Telemetry_System'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_2'
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /declaration with name.*(Telemetry_System_Poller|My_System_2)/);
        });

        it('should allow to attach inline System Poller minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                    }
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.systemPoller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.enable, true);
                    assert.strictEqual(poller.trace, undefined);
                    assert.strictEqual(poller.interval, 300);
                    assert.deepStrictEqual(poller.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                    assert.strictEqual(poller.actions[0].ifAllMatch, undefined);
                    assert.strictEqual(poller.actions[0].locations, undefined);
                    assert.strictEqual(poller.host, undefined);
                    assert.strictEqual(poller.port, undefined);
                    assert.strictEqual(poller.protocol, undefined);
                    assert.strictEqual(poller.allowSelfSignedCert, undefined);
                    assert.strictEqual(poller.enableHostConnectivityCheck, undefined);
                    assert.strictEqual(poller.username, undefined);
                    assert.strictEqual(poller.passphrase, undefined);
                });
        });

        it('should allow to attach inline System Poller full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: true,
                        trace: true,
                        interval: 150,
                        tag: {
                            tenant: '`B`',
                            application: '`C`'
                        },
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    tag1: 'tag1 value',
                                    tag2: {}
                                },
                                ifAllMatch: {
                                    system: {
                                        location: 'system_location'
                                    }
                                },
                                locations: {
                                    virtualServers: {
                                        '.*': true
                                    }
                                }
                            }
                        ]
                    }
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.systemPoller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.enable, true);
                    assert.strictEqual(poller.trace, true);
                    assert.strictEqual(poller.interval, 150);
                    assert.deepStrictEqual(poller.tag, { tenant: '`B`', application: '`C`' });
                    assert.strictEqual(poller.actions[0].enable, true);
                    assert.deepStrictEqual(poller.actions[0].setTag, { tag1: 'tag1 value', tag2: {} });
                    assert.deepStrictEqual(poller.actions[0].ifAllMatch, { system: { location: 'system_location' } });
                    assert.deepStrictEqual(poller.actions[0].locations, { virtualServers: { '.*': true } });
                    assert.strictEqual(poller.host, undefined);
                    assert.strictEqual(poller.port, undefined);
                    assert.strictEqual(poller.protocol, undefined);
                    assert.strictEqual(poller.allowSelfSignedCert, undefined);
                    assert.strictEqual(poller.enableHostConnectivityCheck, undefined);
                    assert.strictEqual(poller.username, undefined);
                    assert.strictEqual(poller.passphrase, undefined);
                });
        });

        it('should not allow to attach inline System Poller declaration with additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        host: 'localhost'
                    }
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /systemPoller.*should NOT have additional properties/);
        });

        it('should allow to attach inline iHealth Poller minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    iHealthPoller: {
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
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.iHealthPoller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                    assert.deepStrictEqual(poller.interval, {
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        },
                        frequency: 'daily'
                    });
                });
        });

        it('should allow to attach inline iHealth Poller full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    iHealthPoller: {
                        username: 'username',
                        passphrase: {
                            cipherText: 'passphrase'
                        },
                        interval: {
                            frequency: 'weekly',
                            day: 1,
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        },
                        proxy: {
                            host: 'localhost',
                            protocol: 'https',
                            port: 80,
                            allowSelfSignedCert: true,
                            enableHostConnectivityCheck: false,
                            username: 'username',
                            passphrase: {
                                cipherText: 'proxyPassphrase'
                            }
                        }
                    }
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.iHealthPoller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                    assert.deepStrictEqual(poller.interval, {
                        frequency: 'weekly',
                        day: 1,
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    });
                    const proxy = poller.proxy;
                    assert.strictEqual(proxy.protocol, 'https');
                    assert.strictEqual(proxy.host, 'localhost');
                    assert.strictEqual(proxy.port, 80);
                    assert.strictEqual(proxy.allowSelfSignedCert, true);
                    assert.strictEqual(proxy.enableHostConnectivityCheck, false);
                    assert.strictEqual(proxy.username, 'username');
                    assert.strictEqual(proxy.passphrase.cipherText, '$M$proxyPassphrase');
                });
        });

        it('should not allow to attach inline iHealth Poller declaration with additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    iHealthPoller: {
                        something: true,
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
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /iHealthPoller.*should NOT have additional properties/);
        });

        it('should allow to attach inline declaration for System Poller and iHealth Poller', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    iHealthPoller: {
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
                    },
                    systemPoller: {
                        interval: 150
                    }
                }
            };
            return assert.isFulfilled(configWorker.processDeclaration(data));
        });

        it('should allow systemPoller as an array (inline object)', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        {
                            interval: 1440,
                            trace: true
                        },
                        {
                            interval: 90
                        }
                    ]
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.systemPoller;
                    assert.deepStrictEqual(poller,
                        [
                            {
                                actions: [{
                                    enable: true,
                                    setTag: { application: '`A`', tenant: '`T`' }
                                }],
                                trace: true,
                                interval: 1440,
                                enable: true
                            },
                            {
                                actions: [{
                                    enable: true,
                                    setTag: { application: '`A`', tenant: '`T`' }
                                }],
                                interval: 90,
                                enable: true
                            }
                        ]);
                });
        });

        it('should allow systemPoller as an array of references', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        'Poller_1',
                        'Poller_2'
                    ]
                },
                Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 80
                },
                Poller_2: {
                    class: 'Telemetry_System_Poller',
                    interval: 100,
                    trace: true
                }
            };
            return assert.isFulfilled(configWorker.processDeclaration(data));
        });

        it('should allow systemPoller as an array (mixed ref and object)', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        'Poller_1',
                        {
                            interval: 299
                        }
                    ]
                },
                Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 80
                }
            };
            return assert.isFulfilled(configWorker.processDeclaration(data));
        });

        it('should not allow a systemPoller as empty array', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: []
                }
            };
            const errMsg = 'should NOT have fewer than 1 items';
            return assert.isRejected(configWorker.processDeclaration(data), errMsg);
        });

        it('should not allow a systemPoller with empty endpointList object', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 120,
                        endpointList: {}
                    }
                }
            };
            const errMsg = 'should have required property \'items\'';
            return assert.isRejected(configWorker.processDeclaration(data), errMsg);
        });

        it('should not allow a systemPoller with empty items in endpointList object', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 120,
                        endpointList: {
                            items: {}
                        }
                    }
                }
            };
            const errMsg = 'should NOT have fewer than 1 properties';
            return assert.isRejected(configWorker.processDeclaration(data), errMsg);
        });

        it('should not allow a systemPoller with empty endpointList array', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 120,
                        endpointList: []
                    }
                }
            };
            const errMsg = 'should NOT have fewer than 1 items';
            return assert.isRejected(configWorker.processDeclaration(data), errMsg);
        });

        it('should not allow a systemPoller with empty items in endpointList array', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 120,
                        endpointList: [
                            {
                                items: {}
                            }
                        ]
                    }
                }
            };
            const errMsg = 'should NOT have fewer than 1 properties';
            return assert.isRejected(configWorker.processDeclaration(data), errMsg);
        });
    });

    describe('Telemetry_Endpoints', () => {
        it('should pass minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        test: {
                            path: '/test/path'
                        }
                    }
                }
            };
            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const endpoints = validConfig.My_Endpoints;
                    assert.deepStrictEqual(endpoints.items, {
                        test: {
                            enable: true,
                            path: '/test/path'
                        }
                    });
                    // check defaults
                    assert.strictEqual(endpoints.enable, true);
                });
        });

        it('should not allow additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {
                        test: {
                            name: 'test',
                            path: '/test/path'
                        }
                    },
                    something: true
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /something.*should NOT have additional properties/);
        });

        it('should allow full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    basePath: '/some/base',
                    items: {
                        a: {
                            name: 'testA',
                            path: '/test/A'
                        },
                        b: {
                            name: 'testB',
                            path: '/test/B',
                            enable: false
                        }
                    }
                }
            };

            return configWorker.processDeclaration(data)
                .then((validConfig) => {
                    const endpoints = validConfig.My_Endpoints;
                    assert.deepStrictEqual(endpoints.items, {
                        a: {
                            enable: true,
                            name: 'testA',
                            path: '/test/A'
                        },
                        b: {
                            name: 'testB',
                            path: '/test/B',
                            enable: false
                        }
                    });
                });
        });

        it('should not allow empty items', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    items: {}
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /\/My_Endpoints\/items.*items\/minProperties.*limit":1/);
        });

        it('should not allow items that are not of type object', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    items: [
                        'endpoint'
                    ]
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /\/My_Endpoints\/items.*should be object/);
        });

        it('should not allow additional properties in items', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    items: {
                        first: {
                            name: 'myEndpoint',
                            path: 'myPath',
                            something: 'else'
                        }
                    }
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /\/My_Endpoints\/items.*should NOT have additional properties/);
        });

        it('should not allow empty name', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    items: {
                        first: {
                            name: '',
                            path: 'path'
                        }
                    }
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /\/My_Endpoints\/items\/first\/name.*should NOT be shorter than/);
        });

        it('should not allow empty path', () => {
            const data = {
                class: 'Telemetry',
                My_Endpoints: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    items: {
                        first: {
                            path: ''
                        }
                    }
                }
            };
            return assert.isRejected(configWorker.processDeclaration(data), /\/My_Endpoints\/items\/first\/path.*should NOT be shorter than/);
        });
    });

    describe('Telemetry_Consumer', () => {
        let minimalDeclaration;
        let minimalExpected;
        let fullDeclaration;
        let fullExpected;

        const validate = (targetDeclaration, consumerProps, expectedTarget, expectedProps, addtlContext) => {
            let options;
            Object.assign(targetDeclaration.My_Consumer, consumerProps);
            Object.assign(expectedTarget || {}, expectedProps || {});
            if (addtlContext) {
                options = { expanded: true };
                targetDeclaration.Shared = {
                    class: 'Shared',
                    constants: {
                        class: 'Constants'
                    }
                };
                Object.assign(targetDeclaration.Shared.constants, addtlContext.constants);
            }
            return configWorker.processDeclaration(targetDeclaration, options)
                .then((validConfig) => {
                    assert.deepStrictEqual(validConfig.My_Consumer, expectedTarget);
                });
        };

        const validateMinimal = (consumerProps, expectedProps, addtlContext) => validate(
            minimalDeclaration,
            consumerProps,
            minimalExpected,
            expectedProps,
            addtlContext
        );

        const validateFull = (consumerProps, expectedProps, addtlContext) => validate(
            fullDeclaration,
            consumerProps,
            fullExpected,
            expectedProps,
            addtlContext
        );

        beforeEach(() => {
            minimalDeclaration = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };
            minimalExpected = {
                class: 'Telemetry_Consumer',
                type: 'default',
                enable: true,
                trace: false,
                allowSelfSignedCert: false
            };
            fullDeclaration = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false,
                    trace: true,
                    enableHostConnectivityCheck: true,
                    allowSelfSignedCert: true
                }
            };
            fullExpected = {
                class: 'Telemetry_Consumer',
                type: 'default',
                enable: false,
                trace: true,
                enableHostConnectivityCheck: true,
                allowSelfSignedCert: true
            };
        });

        // use 'default' consumer because it has no additional properties
        it('should pass minimal declaration', () => validateMinimal({}, {}));
        it('should allow full declaration', () => validateFull({}, {}));
        it('should not allow additional properties', () => assert.isRejected(
            validateMinimal({ someKey: 'someValue' }),
            /My_Consumer.*someKey.*should NOT have additional properties/
        ));

        it('should not allow actions object on non-Generic HTTP Consumers (ex: default)', () => assert.isRejected(
            validateMinimal({
                type: 'default',
                actions: [
                    {
                        JMESPath: {},
                        expression: '{ message: @ }'
                    }
                ]
            }),
            /My_Consumer\/type.*"allowedValue":"Generic_HTTP".*should be equal to constant/
        ));

        describe('AWS_CloudWatch', () => {
            describe('dataType', () => {
                it('should not allow invalid value', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: 'newlyInvented',
                        region: 'region'
                    }),
                    /enum.*dataType.*("allowedValues":\["logs",null\]|"allowedValues":\["metrics"])/
                ));

                it('should not allow empty string for dataType', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: '',
                        region: 'region'
                    }),
                    /enum.*dataType.*("allowedValues":\["logs",null\]|"allowedValues":\["metrics"])/
                ));
            });

            describe('username and passphrase', () => {
                it('should require passphrase when username is specified', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: 'metrics',
                        region: 'region',
                        username: 'nopassphrase'
                    }),
                    /should NOT be valid/
                ));

                it('should require username when passphrase is specified', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: 'metrics',
                        region: 'region',
                        passphrase: {
                            cipherText: 'nousername'
                        }
                    }),
                    /should NOT be valid/
                ));
            });
            describe('Logs (default)', () => {
                it('should pass minimal declaration', () => validateMinimal(
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        logGroup: 'logGroup',
                        logStream: 'logStream'
                    },
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        logGroup: 'logGroup',
                        logStream: 'logStream',
                        dataType: 'logs'
                    }
                ));

                it('should allow full declaration', () => validateFull(
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        logGroup: 'logGroup',
                        logStream: 'logStream',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        },
                        dataType: 'logs'
                    },
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        logGroup: 'logGroup',
                        logStream: 'logStream',
                        username: 'username',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$cipherText'
                        },
                        dataType: 'logs'
                    }
                ));

                it('should require logGroup', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        region: 'regionThingee',
                        logStream: 'streamThingee'
                    }),
                    /should have required property 'logGroup'/
                ));

                it('should require logStream', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        region: 'regionThingee',
                        logGroup: 'logGroupThingee'
                    }),
                    /should have required property 'logStream'/
                ));

                it('should not allow non-log related properties', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        region: 'regionThingee',
                        logStream: 'logStreamThingee',
                        logGroup: 'logGroupThingee',
                        metricNamespace: 'oddOneOut'
                    }),
                    /should match exactly one schema in oneOf/
                ));
            });
            describe('Metrics', () => {
                it('should pass minimal declaration', () => validateMinimal(
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        dataType: 'metrics',
                        metricNamespace: 'metricsThingee'
                    },
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        dataType: 'metrics',
                        metricNamespace: 'metricsThingee'
                    }
                ));

                it('should allow full declaration', () => validateFull(
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        dataType: 'metrics',
                        metricNamespace: 'metricsThingee',
                        username: 'username',
                        passphrase: {
                            cipherText: 'cipherText'
                        }
                    },
                    {
                        type: 'AWS_CloudWatch',
                        region: 'region',
                        dataType: 'metrics',
                        metricNamespace: 'metricsThingee',
                        username: 'username',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$cipherText'
                        }
                    }
                ));

                it('should require metricNamespace', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: 'metrics',
                        region: 'region'
                    }),
                    /should have required property 'metricNamespace'/
                ));

                it('should not allow empty string for metricNamespace', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: 'metrics',
                        region: 'region',
                        metricNamespace: ''
                    }),
                    /metricNamespace\/minLength.*should NOT be shorter than 1 characters/
                ));

                it('should not allow non-metrics properties', () => assert.isRejected(
                    validateMinimal({
                        type: 'AWS_CloudWatch',
                        dataType: 'metrics',
                        region: 'region',
                        metricNamespace: 'metricsThingee',
                        logStream: 'extraOne',
                        logGroup: 'extraTwo'
                    }),
                    /should match exactly one schema in oneOf/
                ));
            });
        });

        describe('AWS_S3', () => {
            it('should pass minimal declaration (IAM enabled, no creds required)', () => validateMinimal(
                {
                    type: 'AWS_S3',
                    region: 'region',
                    bucket: 'bucket'
                },
                {
                    type: 'AWS_S3',
                    region: 'region',
                    bucket: 'bucket'
                }
            ));

            it('should require passphrase when username is specified', () => assert.isRejected(
                validateMinimal({
                    type: 'AWS_S3',
                    region: 'region',
                    bucket: 'bucket',
                    username: 'chilibeans'
                }),
                /should have property passphrase when property username is present/
            ));

            it('should require username when passphrase is specified', () => assert.isRejected(
                validateMinimal({
                    type: 'AWS_S3',
                    region: 'region',
                    bucket: 'bucket',
                    passphrase: { cipherText: 'locomoco' }
                }),
                /should have property username when property passphrase is present/
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'AWS_S3',
                    region: 'region',
                    bucket: 'bucket',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    type: 'AWS_S3',
                    region: 'region',
                    bucket: 'bucket',
                    username: 'username',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    }
                }
            ));
        });

        describe('Azure_Log_Analytics', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'workspaceId',
                    passphrase: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'workspaceId',
                    useManagedIdentity: false,
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    }
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'workspaceId',
                    useManagedIdentity: false,
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    region: 'australiacentral'
                },
                {
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'workspaceId',
                    useManagedIdentity: false,
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    },
                    region: 'australiacentral'
                }
            ));

            it('should require passphrase when useManagedIdentity is omitted', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'someId'
                }),
                /should have required property 'passphrase'/
            ));

            it('should require passphrase when useManagedIdentity is false', () => assert.isRejected(
                validateFull({
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'someId',
                    useManagedIdentity: false
                }),
                /should have required property 'passphrase'/
            ));

            it('should not allow passphrase when useManagedIdentity is true', () => assert.isRejected(
                validateFull({
                    type: 'Azure_Log_Analytics',
                    workspaceId: 'someId',
                    useManagedIdentity: true,
                    passphrase: {
                        cipherText: 'mumblemumblemumble'
                    }
                }),
                /useManagedIdentity\/const.*"allowedValue":false/
            ));
        });

        describe('Azure_Application_Insights', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'some-key-here'
                },
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'some-key-here',
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250,
                    useManagedIdentity: false
                }
            ));

            it('should pass minimal declaration - multiple instr Keys', () => validateMinimal(
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: [
                        'key-1-guid',
                        'key-2-guid'
                    ]
                },
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: [
                        'key-1-guid',
                        'key-2-guid'
                    ],
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250,
                    useManagedIdentity: false
                }
            ));

            it('should pass with constants pointers', () => validateFull(
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: '`=/Shared/constants/instrKey`',
                    customOpts: [
                        {
                            name: '`=/Shared/constants/customOptsName`',
                            value: '`=/Shared/constants/customOptsVal`'
                        }
                    ]
                },
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'key-from-pointer',
                    useManagedIdentity: false,
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250,
                    customOpts: [
                        {
                            name: 'nameFromPointer',
                            value: 'valFromPointer'
                        }
                    ]
                },
                {
                    constants: {
                        instrKey: 'key-from-pointer',
                        customOptsName: 'nameFromPointer',
                        customOptsVal: 'valFromPointer'
                    }
                }
            ));

            it('should allow full declaration - managedIdentity disabled', () => validateFull(
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: '-jumbledChars++==',
                    useManagedIdentity: false,
                    maxBatchSize: 20,
                    maxBatchIntervalMs: 3000,
                    region: 'norwaywest',
                    customOpts: [
                        {
                            name: 'clientLibNum',
                            value: 10.29
                        },
                        {
                            name: 'clientLibInt',
                            value: 222
                        },
                        {
                            name: 'clientLibSecret',
                            value: {
                                cipherText: 'cipherText'
                            }
                        },
                        {
                            name: 'clientLibString',
                            value: 'going to be passed through the client lib as is'
                        },
                        {
                            name: 'clientLibBool',
                            value: true
                        }
                    ]
                },
                {
                    type: 'Azure_Application_Insights',
                    instrumentationKey: '-jumbledChars++==',
                    useManagedIdentity: false,
                    maxBatchSize: 20,
                    maxBatchIntervalMs: 3000,
                    region: 'norwaywest',
                    customOpts: [
                        {
                            name: 'clientLibNum',
                            value: 10.29
                        },
                        {
                            name: 'clientLibInt',
                            value: 222
                        },
                        {
                            name: 'clientLibSecret',
                            value: {
                                class: 'Secret',
                                protected: 'SecureVault',
                                cipherText: '$M$cipherText'
                            }
                        },
                        {
                            name: 'clientLibString',
                            value: 'going to be passed through the client lib as is'
                        },
                        {
                            name: 'clientLibBool',
                            value: true
                        }
                    ]
                }
            ));

            it('should allow full declaration - managedIdentity enabled', () => validateFull(
                {
                    type: 'Azure_Application_Insights',
                    appInsightsResourceName: 'test.*',
                    useManagedIdentity: true,
                    maxBatchSize: 20,
                    maxBatchIntervalMs: 3000,
                    customOpts: [
                        {
                            name: 'clientLibNum',
                            value: 221100
                        }
                    ]
                },
                {
                    type: 'Azure_Application_Insights',
                    appInsightsResourceName: 'test.*',
                    useManagedIdentity: true,
                    maxBatchSize: 20,
                    maxBatchIntervalMs: 3000,
                    customOpts: [
                        {
                            name: 'clientLibNum',
                            value: 221100
                        }
                    ]
                }
            ));

            it('should require instrumentationKey if useManagedIdentity is omitted', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights'
                }),
                /should have required property 'instrumentationKey'/
            ));

            it('should require at least one item if customOpts property is specified', () => assert.isRejected(
                validateFull({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'cheddar-swiss-gouda',
                    customOpts: []
                }),
                /customOpts.*should NOT have fewer than 1 items/
            ));

            it('should not allow less than 1000 for maxBatchIntervalMs', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'cosmic-palace',
                    maxBatchIntervalMs: 10
                }),
                /maxBatchIntervalMs\/minimum.*should be >= 1000/
            ));

            it('should not allow less than 1 for maxBatchSize', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'somewhere-void',
                    maxBatchSize: 0
                }),
                /maxBatchSize\/minimum.*should be >= 1/
            ));

            it('should require at least 1 character for instrumentationKey (string)', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: ''
                }),
                /instrumentationKey.*should NOT be shorter than 1 characters/
            ));

            it('should require at least 1 character for instrumentationKey (array item)', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: ['']
                }),
                /instrumentationKey.*items\/minLength.*should NOT be shorter than 1 characters/
            ));

            it('should require at least 1 item for instrumentationKey (array)', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: []
                }),
                /instrumentationKey.*minItems.*should NOT have fewer than 1 items/
            ));

            it('should require at least 1 character for customOpts name', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'somewhere-void',
                    customOpts: [
                        {
                            name: '',
                            value: false
                        }
                    ]
                }),
                /customOpts\/0\/name.*should NOT be shorter than 1 characters/
            ));

            it('should require at least 1 character for customOpts value', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'somewhere-void',
                    customOpts: [
                        {
                            name: 'test',
                            value: ''
                        }
                    ]
                }),
                /customOpts\/0\/value.*should NOT be shorter than 1 characters/
            ));

            it('should not allow instrumentationKey when useManagedIdentity is true', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'somewhere-void',
                    useManagedIdentity: true
                }),
                /dependencies\/instrumentationKey.*useManagedIdentity\/const.*allowedValue":false/
            ));

            it('should not require instrumentationKey when useManagedIdentity is false', () => validateMinimal(
                {
                    type: 'Azure_Application_Insights',
                    useManagedIdentity: true
                },
                {
                    type: 'Azure_Application_Insights',
                    useManagedIdentity: true,
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 250
                }
            ));

            it('should allow appInsightsResourceName when useManagedIdentity is true', () => validateMinimal(
                {
                    type: 'Azure_Application_Insights',
                    useManagedIdentity: true,
                    appInsightsResourceName: 'app.*pattern',
                    maxBatchSize: 10
                },
                {
                    type: 'Azure_Application_Insights',
                    useManagedIdentity: true,
                    maxBatchIntervalMs: 5000,
                    maxBatchSize: 10,
                    appInsightsResourceName: 'app.*pattern'
                }
            ));

            it('should not allow appInsightsResourceName when instrumentationKey is present', () => assert.isRejected(
                validateMinimal({
                    type: 'Azure_Application_Insights',
                    instrumentationKey: 'test-app1-instr-key',
                    appInsightsResourceName: 'test-app-1'
                }),
                /dependencies\/instrumentationKey\/allOf\/1\/not/
            ));
        });

        describe('ElasticSearch', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'ElasticSearch',
                    host: 'host',
                    index: 'index'
                },
                {
                    type: 'ElasticSearch',
                    host: 'host',
                    index: 'index',
                    dataType: 'f5.telemetry',
                    port: 9200,
                    protocol: 'https'
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'ElasticSearch',
                    host: 'host',
                    protocol: 'http',
                    port: 8080,
                    path: 'path',
                    index: 'index',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    apiVersion: '1.0',
                    dataType: 'dataType'
                },
                {
                    type: 'ElasticSearch',
                    host: 'host',
                    protocol: 'http',
                    port: 8080,
                    path: 'path',
                    index: 'index',
                    username: 'username',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    },
                    apiVersion: '1.0',
                    dataType: 'dataType'
                }
            ));
        });

        describe('Generic_HTTP', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Generic_HTTP',
                    host: 'host'
                },
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    protocol: 'https',
                    port: 443,
                    path: '/',
                    method: 'POST'
                }
            ));

            it('should pass minimal declaration when using tls options', () => validateMinimal(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    privateKey: {
                        cipherText: 'myKey'
                    },
                    clientCertificate: {
                        cipherText: 'myCert'
                    }
                },
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    protocol: 'https',
                    port: 443,
                    path: '/',
                    method: 'POST',
                    clientCertificate: {
                        cipherText: '$M$myCert',
                        class: 'Secret',
                        protected: 'SecureVault'
                    },
                    privateKey: {
                        cipherText: '$M$myKey',
                        class: 'Secret',
                        protected: 'SecureVault'
                    }
                }
            ));

            it('should require privateKey when client certificate is provided', () => assert.isRejected(validateFull(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    clientCertificate: {
                        cipherText: 'myCert'
                    }
                }
            ), /should have required property 'privateKey'/));

            it('should require client certificate when privateKey is provided', () => assert.isRejected(validateFull(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    privateKey: {
                        cipherText: 'myKey'
                    }
                }
            ), /should have required property 'clientCertificate'/));

            it('should not allow the includeData \'action\' in the declaration', () => assert.isRejected(validateFull(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    actions: [
                        {
                            includeData: {},
                            locations: {
                                system: true
                            }
                        }
                    ]
                }
            ), /\/My_Consumer\/actions\/0.*("additionalProperty":"includeData").*should NOT have additional properties/));

            it('should not allow the excludeData \'action\' in the declaration', () => assert.isRejected(validateFull(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    actions: [
                        {
                            excludeData: {},
                            locations: {
                                system: true
                            }
                        }
                    ]
                }
            ), /\/My_Consumer\/actions\/0.*("additionalProperty":"excludeData").*should NOT have additional properties/));

            it('should allow JMESPath in \'actions\' block', () => validateMinimal(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    actions: [
                        {
                            JMESPath: {},
                            expression: '{ message: @ }'
                        }
                    ]
                },
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    protocol: 'https',
                    port: 443,
                    path: '/',
                    method: 'POST',
                    actions: [
                        {
                            enable: true,
                            JMESPath: {},
                            expression: '{ message: @ }'
                        }
                    ]
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    fallbackHosts: [
                        'host1',
                        'host2',
                        'host3'
                    ],
                    protocol: 'http',
                    port: 80,
                    path: '/path',
                    method: 'PUT',
                    headers: [
                        {
                            name: 'headerName',
                            value: 'headerValue'
                        }
                    ],
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: true,
                    proxy: {
                        host: 'localhost',
                        protocol: 'http',
                        port: 80,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'username',
                        passphrase: {
                            cipherText: 'proxyPassphrase'
                        }
                    },
                    privateKey: {
                        cipherText: 'myKey'
                    },
                    clientCertificate: {
                        cipherText: 'myCert'
                    },
                    rootCertificate: {
                        cipherText: 'myCA'
                    }
                },
                {
                    type: 'Generic_HTTP',
                    host: 'host',
                    fallbackHosts: [
                        'host1',
                        'host2',
                        'host3'
                    ],
                    allowSelfSignedCert: true,
                    protocol: 'http',
                    port: 80,
                    path: '/path',
                    method: 'PUT',
                    headers: [
                        {
                            name: 'headerName',
                            value: 'headerValue'
                        }
                    ],
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    },
                    proxy: {
                        host: 'localhost',
                        protocol: 'http',
                        port: 80,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'username',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$proxyPassphrase'
                        }
                    },
                    clientCertificate: {
                        cipherText: '$M$myCert',
                        class: 'Secret',
                        protected: 'SecureVault'
                    },
                    privateKey: {
                        cipherText: '$M$myKey',
                        class: 'Secret',
                        protected: 'SecureVault'
                    },
                    rootCertificate: {
                        cipherText: '$M$myCA',
                        class: 'Secret',
                        protected: 'SecureVault'
                    }
                }
            ));
        });

        describe('Google_Cloud_Monitoring', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Google_Cloud_Monitoring',
                    projectId: 'projectId',
                    privateKeyId: 'privateKeyId',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    serviceEmail: 'serviceEmail'
                },
                {
                    type: 'Google_Cloud_Monitoring',
                    projectId: 'projectId',
                    privateKeyId: 'privateKeyId',
                    privateKey: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$privateKey'
                    },
                    serviceEmail: 'serviceEmail'
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Google_Cloud_Monitoring',
                    projectId: 'projectId',
                    privateKeyId: 'privateKeyId',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    serviceEmail: 'serviceEmail'
                },
                {
                    type: 'Google_Cloud_Monitoring',
                    projectId: 'projectId',
                    privateKeyId: 'privateKeyId',
                    privateKey: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$privateKey'
                    },
                    serviceEmail: 'serviceEmail'
                }
            ));

            it('should allow backward compatibility with StackDriver reference', () => validateMinimal(
                {
                    type: 'Google_StackDriver',
                    projectId: 'projectId',
                    privateKeyId: 'privateKeyId',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    serviceEmail: 'serviceEmail'
                },
                {
                    type: 'Google_StackDriver',
                    projectId: 'projectId',
                    privateKeyId: 'privateKeyId',
                    privateKey: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$privateKey'
                    },
                    serviceEmail: 'serviceEmail'
                }
            ));
        });

        describe('Graphite', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Graphite',
                    host: 'host'
                },
                {
                    type: 'Graphite',
                    host: 'host',
                    protocol: 'https',
                    port: 443,
                    path: '/events/'
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Graphite',
                    host: 'host',
                    protocol: 'http',
                    port: 80,
                    path: 'path'
                },
                {
                    type: 'Graphite',
                    host: 'host',
                    protocol: 'http',
                    port: 80,
                    path: 'path'
                }
            ));
        });

        describe('Kafka', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic'
                },
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'None',
                    protocol: 'binaryTcpTls',
                    port: 9092
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    port: 80,
                    protocol: 'binaryTcp',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    port: 80,
                    protocol: 'binaryTcp',
                    authenticationProtocol: 'SASL-PLAIN',
                    username: 'username',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    }
                }
            ));

            it('should pass minimal declaration with TLS client auth', () => validateMinimal(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'TLS',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'clientCertificate'
                    }
                },
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'TLS',
                    protocol: 'binaryTcpTls',
                    port: 9092,
                    privateKey: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$privateKey'
                    },
                    clientCertificate: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$clientCertificate'
                    }
                }
            ));

            it('should pass full declaration with TLS client auth', () => validateFull(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    protocol: 'binaryTcpTls',
                    port: 90,
                    authenticationProtocol: 'TLS',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'clientCertificate'
                    },
                    rootCertificate: {
                        cipherText: 'rootCertificate'
                    }
                },
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'TLS',
                    protocol: 'binaryTcpTls',
                    port: 90,
                    privateKey: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$privateKey'
                    },
                    clientCertificate: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$clientCertificate'
                    },
                    rootCertificate: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$rootCertificate'
                    }
                }
            ));

            it('should require privateKey when using TLS client auth', () => assert.isRejected(validateFull(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'TLS'
                }
            ), /should have required property 'privateKey'/));

            it('should require protocol=binaryTcpTls when using TLS client auth', () => assert.isRejected(validateFull(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'TLS',
                    protocol: 'binaryTcp',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'clientCertificate'
                    }
                }
            ), /should be equal to constant/));

            it('should not allow username and password when using TLS client auth', () => assert.isRejected(validateFull(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    authenticationProtocol: 'TLS',
                    protocol: 'binaryTcpTls',
                    username: 'myUser',
                    passphrase: 'myPass',
                    privateKey: {
                        cipherText: 'privateKey'
                    },
                    clientCertificate: {
                        cipherText: 'clientCertificate'
                    }
                }
            ), /should NOT be valid/));
        });

        describe('Splunk', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Splunk',
                    host: 'host',
                    passphrase: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    type: 'Splunk',
                    host: 'host',
                    protocol: 'https',
                    port: 8088,
                    format: 'default',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    },
                    compressionType: 'gzip'
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Splunk',
                    host: 'host',
                    protocol: 'http',
                    port: 80,
                    format: 'legacy',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    proxy: {
                        host: 'localhost',
                        protocol: 'http',
                        port: 80,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'username',
                        passphrase: {
                            cipherText: 'passphrase'
                        }
                    },
                    compressionType: 'gzip'
                },
                {
                    type: 'Splunk',
                    host: 'host',
                    protocol: 'http',
                    port: 80,
                    format: 'legacy',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    },
                    proxy: {
                        host: 'localhost',
                        protocol: 'http',
                        port: 80,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'username',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    },
                    compressionType: 'gzip'
                }
            ));

            it('should accept none as valid value for compressionType', () => validateMinimal(
                {
                    type: 'Splunk',
                    host: 'host',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    compressionType: 'none'
                },
                {
                    type: 'Splunk',
                    host: 'host',
                    protocol: 'https',
                    port: 8088,
                    format: 'default',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    },
                    compressionType: 'none'
                }
            ));

            it('should not accept invalid values for compressionType', () => assert.isRejected(validateFull(
                {
                    type: 'Splunk',
                    host: 'host',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    compressionType: 'compression'
                }
            ), /should be equal to one of the allowed values/));
        });

        describe('Statsd', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Statsd',
                    host: 'host'
                },
                {
                    type: 'Statsd',
                    host: 'host',
                    protocol: 'udp',
                    port: 8125
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Statsd',
                    host: 'host',
                    protocol: 'tcp',
                    port: 80
                },
                {
                    type: 'Statsd',
                    host: 'host',
                    protocol: 'tcp',
                    port: 80
                }
            ));

            it('should only accept valid protocols', () => assert.isRejected(validateFull(
                {
                    type: 'Statsd',
                    host: 'host',
                    protocol: 'https',
                    port: 80
                }
            ), /should be equal to one of the allowed values/));
        });

        describe('Sumo_Logic', () => {
            it('should pass minimal declaration', () => validateMinimal(
                {
                    type: 'Sumo_Logic',
                    host: 'host',
                    passphrase: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    type: 'Sumo_Logic',
                    host: 'host',
                    protocol: 'https',
                    port: 443,
                    path: '/receiver/v1/http/',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    }
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Sumo_Logic',
                    host: 'host',
                    protocol: 'http',
                    port: 80,
                    path: 'path',
                    passphrase: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    type: 'Sumo_Logic',
                    host: 'host',
                    protocol: 'http',
                    port: 80,
                    path: 'path',
                    passphrase: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    }
                }
            ));
        });

        describe('F5_Cloud', () => {
            beforeEach(() => {
                coreStub.utilMisc.getRuntimeInfo.value(() => ({ nodeVersion: '8.12.0' }));
            });

            it('should fail because authType is not valid', () => assert.isRejected(
                validateMinimal({
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    serviceAccount: {
                        authType: 'goog',
                        type: 'not_used',
                        projectId: 'deos-dev',
                        privateKeyId: '11111111111111111111111',
                        privateKey: {
                            cipherText: 'privateKeyVal'
                        },
                        clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                        clientId: '1212121212121212121212',
                        authUri: 'https://accounts.google.com/o/oauth2/auth',
                        tokenUri: 'https://oauth2.googleapis.com/token',
                        authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                        clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
                    },
                    targetAudience: 'deos-ingest'
                }),
                'should be equal to one of the allowed values'
            ));

            it('should require f5csTenantId property', () => assert.isRejected(
                validateMinimal({
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    serviceAccount: {
                        authType: 'google-auth',
                        type: 'not_used',
                        projectId: 'deos-dev',
                        privateKeyId: '11111111111111111111111',
                        privateKey: {
                            cipherText: 'privateKeyVal'
                        },
                        clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                        clientId: '1212121212121212121212',
                        authUri: 'https://accounts.google.com/o/oauth2/auth',
                        tokenUri: 'https://oauth2.googleapis.com/token',
                        authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                        clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
                    },
                    targetAudience: 'deos-ingest'
                }),
                /should have required property 'f5csTenantId'/
            ));

            it('should require f5csSensorId property', () => assert.isRejected(
                validateMinimal({
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csTenantId: 'a-blabla-a',
                    payloadSchemaNid: 'f5',
                    serviceAccount: {
                        authType: 'google-auth',
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
                }),
                /should have required property 'f5csSensorId'/
            ));

            it('should require payloadSchemaNid property', () => assert.isRejected(
                validateMinimal({
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    serviceAccount: {
                        authType: 'google-auth',
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
                }),
                /should have required property 'payloadSchemaNid'/
            ));

            it('should require privateKeyId property', () => assert.isRejected(
                validateMinimal({
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    serviceAccount: {
                        authType: 'google-auth',
                        type: 'not_used',
                        projectId: 'deos-dev',
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
                }),
                /should have required property 'privateKeyId'/
            ));

            it('should pass minimal declaration', () => validateMinimal(
                {
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    serviceAccount: {
                        authType: 'google-auth',
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
                },
                {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    port: 443,
                    useSSL: true,
                    serviceAccount: {
                        authType: 'google-auth',
                        authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                        authUri: 'https://accounts.google.com/o/oauth2/auth',
                        clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                        clientId: '1212121212121212121212',
                        clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com',
                        privateKey: {
                            cipherText: '$M$privateKeyValue',
                            class: 'Secret',
                            protected: 'SecureVault'
                        },
                        privateKeyId: '11111111111111111111111',
                        projectId: 'deos-dev',
                        tokenUri: 'https://oauth2.googleapis.com/token',
                        type: 'not_used'
                    },
                    targetAudience: 'deos-ingest',
                    trace: false,
                    type: 'F5_Cloud'
                }
            ));

            it('should allow full declaration', () => validateFull(
                {
                    class: 'Telemetry_Consumer',
                    type: 'F5_Cloud',
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    port: 500,
                    useSSL: false,
                    enable: true,
                    allowSelfSignedCert: true,
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
                    targetAudience: 'deos-ingest',
                    trace: true
                },
                {
                    allowSelfSignedCert: true,
                    class: 'Telemetry_Consumer',
                    enable: true,
                    f5csTenantId: 'a-blabla-a',
                    f5csSensorId: '12345',
                    payloadSchemaNid: 'f5',
                    port: 500,
                    useSSL: false,
                    serviceAccount: {
                        authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                        authUri: 'https://accounts.google.com/o/oauth2/auth',
                        clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                        clientId: '1212121212121212121212',
                        clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com',
                        privateKey: {
                            cipherText: '$M$privateKeyValue',
                            class: 'Secret',
                            protected: 'SecureVault'
                        },
                        privateKeyId: '11111111111111111111111',
                        projectId: 'deos-dev',
                        tokenUri: 'https://oauth2.googleapis.com/token',
                        type: 'not_used'
                    },
                    targetAudience: 'deos-ingest',
                    trace: true,
                    type: 'F5_Cloud'
                }
            ));
        });
    });

    describe('Telemetry_Pull_Consumer', () => {
        let minimalDeclaration;
        let minimalExpected;
        let fullDeclaration;
        let fullExpected;

        const validate = (targetDeclaration, consumerProps, expectedTarget, expectedProps, addtlContext) => {
            let options;
            Object.assign(targetDeclaration.My_Pull_Consumer, consumerProps);
            Object.assign(expectedTarget || {}, expectedProps || {});
            if (addtlContext) {
                options = { expanded: true };
                targetDeclaration.Shared = {
                    class: 'Shared',
                    constants: {
                        class: 'Constants'
                    }
                };
                Object.assign(targetDeclaration.Shared.constants, addtlContext.constants);
            }
            return configWorker.processDeclaration(targetDeclaration, options)
                .then((validConfig) => {
                    assert.deepStrictEqual(validConfig.My_Pull_Consumer, expectedTarget);
                });
        };

        const validateMinimal = (consumerProps, expectedProps, addtlContext) => validate(
            minimalDeclaration,
            consumerProps,
            minimalExpected,
            expectedProps,
            addtlContext
        );

        const validateFull = (consumerProps, expectedProps, addtlContext) => validate(
            fullDeclaration,
            consumerProps,
            fullExpected,
            expectedProps,
            addtlContext
        );

        beforeEach(() => {
            minimalDeclaration = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_Poller']
                },
                My_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: 'My_Poller'
                }
            };

            minimalExpected = {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                systemPoller: 'My_Poller',
                enable: true,
                trace: false
            };

            fullDeclaration = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_Poller']
                },
                My_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_Other_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    enable: false,
                    trace: true,
                    systemPoller: ['My_Poller', 'My_Other_Poller']
                }
            };

            fullExpected = {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                enable: false,
                trace: true,
                systemPoller: ['My_Poller', 'My_Other_Poller']
            };
        });

        // use 'default' consumer because it has no additional properties
        it('should pass minimal declaration', () => validateMinimal({}, {}));
        it('should allow full declaration', () => validateFull({}, {}));
        it('should not allow additional properties', () => assert.isRejected(
            validateMinimal({ someKey: 'someValue' }),
            /My_Pull_Consumer.*someKey.*should NOT have additional properties/
        ));

        describe('Prometheus', () => {
            it('should pass minimal declaration', () => validateMinimal(
                { type: 'Prometheus' },
                { type: 'Prometheus' }
            ));

            it('should allow full declaration', () => validateFull(
                { type: 'Prometheus' },
                { type: 'Prometheus' }
            ));
        });
    });

    describe('Telemetry_Namespace', () => {
        let minimalDeclaration;
        let minimalExpected;
        let fullDeclaration;
        let fullExpected;

        const validate = (targetDeclaration, namespaceProps, expectedTarget, expectedProps, addtlContext) => {
            let options;
            Object.assign(targetDeclaration.My_Namespace, namespaceProps);
            Object.assign(expectedTarget || {}, expectedProps || {});
            if (addtlContext) {
                options = { expanded: true };
                targetDeclaration.Shared = {
                    class: 'Shared',
                    constants: {
                        class: 'Constants'
                    }
                };
                Object.assign(targetDeclaration.Shared.constants, addtlContext.constants);
            }
            return configWorker.processDeclaration(targetDeclaration, options)
                .then((validConfig) => {
                    assert.deepStrictEqual(validConfig.My_Namespace, expectedTarget);
                });
        };

        const validateMinimal = (namespaceProps, expectedProps, addtlContext) => validate(
            minimalDeclaration,
            namespaceProps,
            minimalExpected,
            expectedProps,
            addtlContext
        );

        const validateFull = (namespaceProps, expectedProps, addtlContext) => validate(
            fullDeclaration,
            namespaceProps,
            fullExpected,
            expectedProps,
            addtlContext
        );

        beforeEach(() => {
            minimalDeclaration = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System'
                    }
                }
            };

            minimalExpected = {
                class: 'Telemetry_Namespace',
                My_System: {
                    class: 'Telemetry_System',
                    allowSelfSignedCert: false,
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http'
                }
            };

            fullDeclaration = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
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
                    My_NS_System: {
                        class: 'Telemetry_System',
                        systemPoller: ['My_NS_Poller']
                    },
                    My_NS_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 60
                    },
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '1.2.3.4',
                        protocol: 'http',
                        port: 8080
                    }
                }
            };

            fullExpected = {
                class: 'Telemetry_Namespace',
                My_NS_System: {
                    class: 'Telemetry_System',
                    allowSelfSignedCert: false,
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: ['My_NS_Poller']
                },
                My_NS_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [{
                        enable: true,
                        setTag: {
                            application: '`A`',
                            tenant: '`T`'
                        }
                    }],
                    allowSelfSignedCert: false,
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    interval: 60
                },
                My_NS_Consumer: {
                    class: 'Telemetry_Consumer',
                    allowSelfSignedCert: false,
                    enable: true,
                    method: 'POST',
                    path: '/',
                    trace: false,
                    type: 'Generic_HTTP',
                    host: '1.2.3.4',
                    protocol: 'http',
                    port: 8080
                }
            };
        });

        it('should pass minimal declaration', () => validateMinimal({}, {}));
        it('should allow full declaration', () => validateFull({}, {}));
        it('should not allow nested Namespace', () => assert.isRejected(
            validateMinimal({
                nestedNamespace: {
                    class: 'Telemetry_Namespace'
                }
            }),
            /should be equal to one of the allowed values/
        ));
    });
});
