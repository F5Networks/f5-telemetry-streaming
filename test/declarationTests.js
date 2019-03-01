/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const fs = require('fs');

const constants = require('../src/nodejs/constants.js');

/* eslint-disable global-require */

describe('Declarations', () => {
    let util;
    let config;

    before(() => {
        util = require('../src/nodejs/util.js');
        config = require('../src/nodejs/config.js');
    });
    beforeEach(() => {
        // mocks required for ajv custom keywords, among others
        util.getDeviceType = () => Promise.resolve(constants.BIG_IP_DEVICE_TYPE);
        util.encryptSecret = () => Promise.resolve('foo');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // first let's validate all example declarations
    const baseDir = `${__dirname}/../examples/declarations`;
    const files = fs.readdirSync(baseDir);
    files.forEach((file) => {
        it(`should validate example: ${file}`, () => {
            const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
            return config.validate(data);
        });
    });

    it('should fail cipherText with wrong device type', () => {
        util.getDeviceType = () => Promise.resolve(constants.CONTAINER_DEVICE_TYPE);

        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                passphrase: {
                    cipherText: 'mycipher'
                }
            }
        };

        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                return Promise.resolve(); // resolve, expected an error
            });
    });

    it('should not reencrypt', () => {
        const cipher = '$M$foo';
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
            })
            .catch(err => Promise.reject(err));
    });

    it('should base64 decode cipherText', () => {
        util.encryptSecret = secret => Promise.resolve(secret);

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
            })
            .catch(err => Promise.reject(err));
    });

    it('should pass host network check', () => {
        let called = false;
        util.networkCheck = () => {
            called = true;
            return Promise.resolve();
        };

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
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail host network check', () => {
        util.networkCheck = () => Promise.reject(new Error('foo'));

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
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                return Promise.resolve(); // resolve, expected an error
            });
    });

    it('should expand pointer (absolute)', () => {
        const expectedValue = '/foo';
        const data = {
            class: 'Telemetry',
            Shared: {
                class: 'Shared',
                constants: {
                    class: 'Constants',
                    path: expectedValue
                }
            },
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'Generic_HTTP',
                host: '192.0.2.1',
                path: '`=/Shared/constants/path`'
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then((validated) => {
                assert.strictEqual(validated.My_Consumer.path, expectedValue);
            })
            .catch(err => Promise.reject(err));
    });

    it('should expand pointer (relative)', () => {
        const expectedValue = '192.0.2.1';
        const data = {
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'Generic_HTTP',
                host: expectedValue,
                path: '`=host`'
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then((validated) => {
                assert.strictEqual(validated.My_Consumer.path, expectedValue);
            })
            .catch(err => Promise.reject(err));
    });

    it('should expand pointer (relative to class)', () => {
        const expectedValue = '192.0.2.1';
        const data = {
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'Generic_HTTP',
                host: expectedValue,
                path: '/',
                headers: [
                    {
                        name: 'foo',
                        value: '`=@/host`'
                    }
                ]
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then((validated) => {
                assert.strictEqual(validated.My_Consumer.headers[0].value, expectedValue);
            })
            .catch(err => Promise.reject(err));
    });

    it('should expand pointer (multiple pointers in string)', () => {
        const expectedValue = '/foo/bar/baz';
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
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then((validated) => {
                assert.strictEqual(validated.My_Consumer.path, expectedValue);
            })
            .catch(err => Promise.reject(err));
    });

    it('should expand pointer (base64 decode)', () => {
        const expectedValue = 'foo';
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
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then((validated) => {
                assert.strictEqual(validated.My_Consumer.path, expectedValue);
            })
            .catch(err => Promise.reject(err));
    });

    it('should expand pointer (object)', () => {
        const resolvedSecret = 'bar';
        util.encryptSecret = () => Promise.resolve(resolvedSecret);

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
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then((validated) => {
                assert.deepEqual(validated.My_Consumer.path, expectedValue);
                assert.deepEqual(validated.My_Consumer.headers[0].value, expectedValue);
                return config.validate(validated);
            })
            .then(() => {
                // we want to ensure config is still valid once 'path|headers'
                // is an object containing a 'secret
                assert.ok('expanded object valid');
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail pointer (object) with additional chars', () => {
        util.encryptSecret = secret => Promise.resolve(secret);

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
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.message.indexOf('syntax requires single pointer') !== -1) {
                    return Promise.resolve(); // resolve, expected this error
                }
                return Promise.reject(err);
            });
    });

    it('should fail pointer (absolute) outside \'Shared\'', () => {
        const data = {
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'Generic_HTTP',
                host: '192.0.2.1',
                path: '`=/class`'
            },
            scratch: {
                expand: true
            }
        };

        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.message.indexOf('requires pointers root to be \'Shared\'') !== -1) {
                    return Promise.resolve(); // resolve, expected this error
                }
                return Promise.reject(err);
            });
    });
});
