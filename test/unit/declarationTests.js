/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const config = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const util = require('../../src/lib/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Declarations', () => {
    let encryptSecretStub;
    let getDeviceTypeStub;
    let networkCheckStub;

    beforeEach(() => {
        encryptSecretStub = sinon.stub(deviceUtil, 'encryptSecret');
        encryptSecretStub.resolves('$M$foo');
        getDeviceTypeStub = sinon.stub(deviceUtil, 'getDeviceType');
        getDeviceTypeStub.resolves(constants.DEVICE_TYPE.BIG_IP);
        networkCheckStub = sinon.stub(util, 'networkCheck');
        networkCheckStub.resolves();
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
                    /* eslint-disable prefer-spread */
                    originFsAccess.apply(null, arguments);
                }
            });
        });
        // first let's validate all example declarations
        const baseDir = `${__dirname}/../../examples/declarations`;
        const files = fs.readdirSync(baseDir);
        files.forEach((file) => {
            it(`should validate example: ${file}`, () => {
                const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
                return assert.isFulfilled(config.validate(data));
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
                config.validate(decl1),
                config.validate(decl2)
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

            networkCheckStub.rejects(new Error('failed network check'));
            getDeviceTypeStub.resolves(constants.DEVICE_TYPE.CONTAINER);

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
            const validate = (name, decl) => config.validate(decl).catch((e) => {
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
                return config.validate(data)
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
                return config.validate(data)
                    .then((validConfig) => {
                        const proxy = validConfig.My_iHealth.proxy;
                        assert.strictEqual(proxy.protocol, 'https');
                        assert.strictEqual(proxy.host, 'localhost');
                        assert.strictEqual(proxy.port, 80);
                        assert.strictEqual(proxy.allowSelfSignedCert, true);
                        assert.strictEqual(proxy.enableHostConnectivityCheck, false);
                        assert.strictEqual(proxy.username, 'username');
                        assert.strictEqual(proxy.passphrase.cipherText, '$M$foo');
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
                return assert.isRejected(config.validate(data), /host.*should have required property 'host'/);
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
                return assert.isRejected(config.validate(data), /proxy\/port.*should be <=/);
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
                return assert.isRejected(config.validate(data), /proxy\/protocol.*should be equal to one of the allowed values/);
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
                return assert.isRejected(config.validate(data), /proxy\/allowSelfSignedCert.*should be boolean/);
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
                return assert.isRejected(config.validate(data), /proxy\/enableHostConnectivityCheck.*should be boolean/);
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
                return assert.isRejected(config.validate(data), /someProp.*should NOT have additional properties/);
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
                return assert.isRejected(config.validate(data), /should have property username when property passphrase is present/);
            });
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
                return config.validate(data)
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
                return config.validate(data)
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
                return assert.isRejected(config.validate(data), /should match exactly one schema in oneOf/);
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
                return config.validate(data)
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
                return config.validate(data)
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
                return assert.isRejected(config.validate(data), /should match exactly one schema in oneOf.*locations/);
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
                return assert.isRejected(config.validate(data), /should match exactly one schema in oneOf.*locations/);
            });

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
                return assert.isRejected(config.validate(data), /My_Poller\/actions\/0.*should NOT be valid/);
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
                return assert.isRejected(config.validate(data), /dependencies\/excludeData\/allOf\/0\/required.*should have required property 'locations'/);
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
                return config.validate(data)
                    .then((validConfig) => {
                        const poller = validConfig.My_Poller;
                        assert.deepStrictEqual(poller.actions[0].locations.virtualServers, { vs$: true });
                        assert.deepStrictEqual(poller.actions[0].locations.pools, { '^/Common/Shared/': true });
                    });
            });
        });
    });

    describe('AJV Custom Keywords', () => {
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
                return assert.isRejected(config.validate(data), /downloadFolder.*Unable to access path/);
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
                return assert.isFulfilled(config.validate(data));
            });
        });

        describe('f5secret', () => {
            it('should fail cipherText with wrong device type', () => {
                getDeviceTypeStub.resolves(constants.DEVICE_TYPE.CONTAINER);
                const data = {
                    class: 'Telemetry',
                    My_Poller: {
                        class: 'Telemetry_System_Poller',
                        passphrase: {
                            cipherText: 'mycipher'
                        }
                    }
                };

                return assert.isRejected(config.validate(data), /requires running on BIG-IP/);
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
                return config.validate(data)
                    .then(() => {
                        assert.strictEqual(data.My_Poller.passphrase.cipherText, cipher);
                    });
            });

            it('should base64 decode cipherText', () => {
                encryptSecretStub.resolvesArg(0);
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
                return config.validate(data)
                    .then(() => {
                        assert.strictEqual(data.My_Poller.passphrase.cipherText, 'f5secret');
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
                return assert.isRejected(config.validate(data), /should be encrypted by BIG-IP when.*protected.*SecureVault/);
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
                return assert.isRejected(config.validate(data), /missing cipherText or environmentVar/);
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

                return config.validate(data, { expand: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Consumer.path, '/foo');
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

                return config.validate(data, { expand: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Consumer.path, '192.0.2.1');
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

                return config.validate(data, { expand: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Consumer.headers[0].value, '192.0.2.1');
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

                return config.validate(data, { expand: true })
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

                return config.validate(data, { expand: true })
                    .then((validated) => {
                        assert.strictEqual(validated.My_Consumer.path, 'foo');
                    });
            });

            it('should expand pointer (object)', () => {
                const resolvedSecret = '$M$bar';
                encryptSecretStub.resolves(resolvedSecret);

                const expectedValue = {
                    class: 'Secret',
                    cipherText: resolvedSecret,
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

                return config.validate(data, { expand: true })
                    .then((validated) => {
                        assert.deepStrictEqual(validated.My_Consumer.path, expectedValue);
                        assert.deepStrictEqual(validated.My_Consumer.headers[0].value, expectedValue);
                        return assert.isFulfilled(config.validate(validated));
                    });
            });

            it('should fail pointer (object) with additional chars', () => {
                encryptSecretStub.resolvesArg(0);

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
                return assert.isRejected(config.validate(data, { expand: true }), /syntax requires single pointer/);
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
                return assert.isRejected(config.validate(data, { expand: true }), /requires pointers root to be 'Shared'/);
            });
        });

        describe('hostConnectivityCheck', () => {
            it('should pass host network check', () => {
                let called = false;
                networkCheckStub.callsFake(() => {
                    called = true;
                    return Promise.resolve();
                });

                const data = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Graphite',
                        host: '192.0.2.1',
                        enableHostConnectivityCheck: true
                    }
                };
                return config.validate(data)
                    .then(() => {
                        assert.strictEqual(called, true);
                    });
            });

            it('should fail host network check', () => {
                const errMsg = 'failed network check';
                networkCheckStub.rejects(new Error(errMsg));

                const data = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Graphite',
                        host: '192.0.2.1',
                        enableHostConnectivityCheck: true
                    }
                };
                return assert.isRejected(config.validate(data), new RegExp(errMsg));
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
                return assert.isFulfilled(config.validate(data));
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
                return assert.isFulfilled(config.validate(data));
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isFulfilled(config.validate(declaration)
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
                return assert.isFulfilled(config.validate(data));
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isRejected(config.validate(data), errMsg);
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
            return config.validate(data)
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
            return config.validate(data)
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
                    assert.strictEqual(poller.passphrase.cipherText, '$M$foo');
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
            return assert.isRejected(config.validate(data), /should NOT be valid/);
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
            return assert.isRejected(config.validate(data), /should be array/);
        });

        it('should not allow additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    someProp: 'someValue'
                }
            };
            return assert.isRejected(config.validate(data), /someProp.*should NOT have additional properties/);
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
                return config.validate(data)
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
                return config.validate(data)
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return config.validate(data)
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
                return config.validate(data)
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return assert.isRejected(config.validate(data), errMsg);
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
                return config.validate(data)
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
                return config.validate(data)
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
            return config.validate(data)
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
            return config.validate(data)
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
            return assert.isRejected(config.validate(data), /someProp.*should NOT have additional properties/);
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
            return config.validate(data)
                .then((validConfig) => {
                    const poller = validConfig.My_iHealth_Poller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.class, 'Telemetry_iHealth_Poller');
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$foo');
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
                            cipherText: 'passphrase'
                        }
                    }
                }
            };
            return config.validate(data)
                .then((validConfig) => {
                    const poller = validConfig.My_iHealth_Poller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.class, 'Telemetry_iHealth_Poller');
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$foo');
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
                    assert.strictEqual(proxy.passphrase.cipherText, '$M$foo');
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
            return assert.isRejected(config.validate(data), /someProp.*should NOT have additional properties/);
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
            return assert.isRejected(config.validate(data), /downloadFolder.*minLength/);
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
                return assert.isFulfilled(config.validate(data));
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
                return assert.isFulfilled(config.validate(data));
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
                return assert.isRejected(config.validate(data), /someProp.*should NOT have additional properties/);
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
                return assert.isRejected(config.validate(data), /interval.timeWindow.start.*should match pattern/);
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
                return assert.isRejected(config.validate(data), /interval.timeWindow.*specify window with size of a/);
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
                return assert.isRejected(config.validate(data), /interval.day.*should match pattern/);
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
                return assert.isRejected(config.validate(data), /interval.day.*should be <= 7/);
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
                return assert.isRejected(config.validate(data), /interval.day.*should be <= 31/);
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
            return config.validate(data)
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
            return config.validate(data)
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
                    assert.strictEqual(system.passphrase.cipherText, '$M$foo');
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
            return assert.isRejected(config.validate(data), /someProp.*should NOT have additional properties/);
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
            return assert.isFulfilled(config.validate(data));
        });

        it('should fail when non-existing poller declaration attached', () => {
            const data = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller_Non_existing'
                }
            };
            return assert.isRejected(config.validate(data), /declaration with name.*(Telemetry_System_Poller|My_System_Poller_Non_existing)/);
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
            return assert.isRejected(config.validate(data), /declaration with name.*(Telemetry_System_Poller|My_System_2)/);
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
            return config.validate(data)
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
            return config.validate(data)
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
            return assert.isRejected(config.validate(data), /systemPoller.*should NOT have additional properties/);
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
            return config.validate(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.iHealthPoller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$foo');
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
                                cipherText: 'passphrase'
                            }
                        }
                    }
                }
            };
            return config.validate(data)
                .then((validConfig) => {
                    const poller = validConfig.My_System.iHealthPoller;
                    assert.notStrictEqual(poller, undefined);
                    assert.strictEqual(poller.username, 'username');
                    assert.strictEqual(poller.passphrase.cipherText, '$M$foo');
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
                    assert.strictEqual(proxy.passphrase.cipherText, '$M$foo');
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
            return assert.isRejected(config.validate(data), /iHealthPoller.*should NOT have additional properties/);
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
            return assert.isFulfilled(config.validate(data));
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
            return config.validate(data)
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
            return assert.isFulfilled(config.validate(data));
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
            return assert.isFulfilled(config.validate(data));
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
            return assert.isRejected(config.validate(data), errMsg);
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
            return assert.isRejected(config.validate(data), errMsg);
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
            return assert.isRejected(config.validate(data), errMsg);
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
            return assert.isRejected(config.validate(data), errMsg);
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
            return assert.isRejected(config.validate(data), errMsg);
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
            return config.validate(data)
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
            return assert.isRejected(config.validate(data), /something.*should NOT have additional properties/);
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

            return config.validate(data)
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
            return assert.isRejected(config.validate(data), /\/My_Endpoints\/items.*items\/minProperties.*limit":1/);
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
            return assert.isRejected(config.validate(data), /\/My_Endpoints\/items.*should be object/);
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
            return assert.isRejected(config.validate(data), /\/My_Endpoints\/items.*should NOT have additional properties/);
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
            return assert.isRejected(config.validate(data), /\/My_Endpoints\/items\/first\/name.*should NOT be shorter than/);
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
            return assert.isRejected(config.validate(data), /\/My_Endpoints\/items\/first\/path.*should NOT be shorter than/);
        });
    });

    describe('Telemetry_Consumer', () => {
        let minimalDeclaration;
        let minimalExpected;
        let fullDeclaration;
        let fullExpected;

        const validate = (targetDeclaration, consumerProps, expectedTarget, expectedProps, addtlContext) => {
            let context;
            Object.assign(targetDeclaration.My_Consumer, consumerProps);
            Object.assign(expectedTarget || {}, expectedProps || {});
            if (addtlContext) {
                context = { expand: true };
                targetDeclaration.Shared = {
                    class: 'Shared',
                    constants: {
                        class: 'Constants'
                    }
                };
                Object.assign(targetDeclaration.Shared.constants, addtlContext.constants);
            }
            return config.validate(targetDeclaration, context)
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

        describe('AWS_CloudWatch', () => {
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
                    logStream: 'logStream'
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
                    }
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
                        cipherText: '$M$foo'
                    }
                }
            ));
        });

        describe('AWS_S3', () => {
            it('should pass declaration', () => validateMinimal(
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
                        cipherText: '$M$foo'
                    }
                }
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
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
                                cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
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

            it('should allow full declaration', () => validateFull(
                {
                    type: 'Generic_HTTP',
                    host: 'host',
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
                    }
                },
                {
                    type: 'Generic_HTTP',
                    host: 'host',
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
                    }
                }
            ));
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
                        cipherText: '$M$foo'
                    }
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
                    }
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
                        cipherText: '$M$foo'
                    }
                }
            ));
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
                        cipherText: '$M$foo'
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
                        cipherText: '$M$foo'
                    }
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
            let context;
            Object.assign(targetDeclaration.My_Pull_Consumer, consumerProps);
            Object.assign(expectedTarget || {}, expectedProps || {});
            if (addtlContext) {
                context = { expand: true };
                targetDeclaration.Shared = {
                    class: 'Shared',
                    constants: {
                        class: 'Constants'
                    }
                };
                Object.assign(targetDeclaration.Shared.constants, addtlContext.constants);
            }
            return config.validate(targetDeclaration, context)
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
});
