/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');

const constants = require('../../src/nodejs/constants.js');

/* eslint-disable global-require */

describe('Declarations', () => {
    let util;
    let deviceUtil;
    let config;

    before(() => {
        util = require('../../src/nodejs/util.js');
        deviceUtil = require('../../src/nodejs/deviceUtil.js');
        config = require('../../src/nodejs/config.js');
    });
    beforeEach(() => {
        // mocks required for ajv custom keywords, among others
        deviceUtil.getDeviceType = () => Promise.resolve(constants.BIG_IP_DEVICE_TYPE);
        deviceUtil.encryptSecret = () => Promise.resolve('foo');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // first let's validate all example declarations
    const baseDir = `${__dirname}/../../examples/declarations`;
    const files = fs.readdirSync(baseDir);

    // fs access modification to skip folder check
    const originFsAccess = fs.access;
    fs.access = function () {
        const path = arguments[0];
        const callback = arguments[arguments.length - 1];
        if (path === 'example_download_folder') {
            callback();
        } else {
            /* eslint-disable prefer-spread */
            originFsAccess.apply(null, arguments);
        }
    };

    files.forEach((file) => {
        it(`should validate example: ${file}`, () => {
            // skip network check
            util.networkCheck = () => Promise.resolve();
            const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
            return config.validate(data);
        });
    });

    /**
     * Basic Schema tests - start
     */
    it('should fail cipherText with wrong device type', () => {
        deviceUtil.getDeviceType = () => Promise.resolve(constants.CONTAINER_DEVICE_TYPE);

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
                if (/requires running on BIG-IP/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
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
        deviceUtil.encryptSecret = secret => Promise.resolve(secret);

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
        const errMsg = 'failed network check';
        util.networkCheck = () => Promise.reject(new Error(errMsg));

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
                if (RegExp(errMsg).test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
    /**
     * Basic Schema tests - end
     */

    /**
     * Schedule Schema tests - start
     */
    it('should pass minimal declaration [Schedule schema]', () => {
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
        return config.validate(data);
    });

    it('should pass full declaration [Schedule schema]', () => {
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
        return config.validate(data);
    });

    it('should not allow additional properties [Schedule schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/someProp/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail parse invalid time string [Schedule schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/interval.timeWindow.start/.test(err) && /should match pattern/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should preserve difference between start and end time (2hr min) [Schedule schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/interval.timeWindow/.test(err) && /specify window with size of a/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid weekly day name specified [Schedule schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/interval.day/.test(err) && /should match pattern/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid weekly day specified [Schedule schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/interval.day/.test(err) && /should be <= 7/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid monthly day specified [Schedule schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/interval.day/.test(err) && /should be <= 31/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
    /**
     * Schedule Schema tests - end
     */

    /**
     * Proxy Schema tests - start
     */
    it('should pass minimal declaration [Proxy schema]', () => {
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

    it('should pass full declaration [Proxy schema]', () => {
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
                assert.strictEqual(proxy.passphrase.cipherText, 'foo');
            });
    });

    it('should fail when no host specified [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/host/.test(err) && /should have required property 'host'/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid port specified [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/proxy.port/.test(err) && /should be <=/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid protocol specified [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/proxy.protocol/.test(err) && /should be equal to one of the allowed values/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid allowSelfSignedCert specified [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/proxy.allowSelfSignedCert/.test(err) && /should be boolean/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when invalid enableHostConnectivityCheck specified [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/proxy.enableHostConnectivityCheck/.test(err) && /should be boolean/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should not allow additional properties [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/someProp/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when passphrase specified alone [Proxy schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/should have property username when property passphrase is present/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
    /**
     * Proxy Schema tests - end
     */

    /**
     * System Poller Schema tests - start
     */
    it('should pass miminal declaration [System Poller schema]', () => {
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
                assert.strictEqual(poller.trace, false);
                assert.strictEqual(poller.interval, 300);
                assert.deepStrictEqual(poller.tag, { tenant: '`T`', application: '`A`' });
                assert.strictEqual(poller.host, 'localhost');
                assert.strictEqual(poller.port, 8100);
                assert.strictEqual(poller.protocol, 'http');
                assert.strictEqual(poller.allowSelfSignedCert, undefined);
                assert.strictEqual(poller.enableHostConnectivityCheck, undefined);
                assert.strictEqual(poller.username, undefined);
                assert.strictEqual(poller.passphrase, undefined);
            });
    });

    it('should pass full declaration [System Poller schema]', () => {
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
                }
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
                assert.strictEqual(poller.passphrase.cipherText, 'foo');
            });
    });

    it('should not allow additional properties [System Poller schema]', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                someProp: 'someValue'
            }
        };
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/someProp/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
    /**
     * System Poller Schema tests - end
     */

    /**
     * Event Listener Schema tests - start
     */
    it('should pass miminal declaration [Event Listener schema]', () => {
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
                assert.deepStrictEqual(listener.tag, { tenant: '`T`', application: '`A`' });
                assert.deepStrictEqual(listener.match, '');
            });
    });

    it('should pass full declaration [Event Listener schema]', () => {
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
                match: 'matchSomething'
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
            });
    });

    it('should not allow additional properties in declaration [Event Listener schema]', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_Listener',
                someProp: 'someValue'
            }
        };
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/someProp/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
    /**
     * Event Listener Schema tests - end
     */

    /**
     * iHealth Poller Schema tests - start
     */
    it('should pass miminal declaration [iHealth Poller Schema]', () => {
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
                assert.strictEqual(poller.passphrase.cipherText, 'foo');
                assert.deepStrictEqual(poller.interval, {
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    },
                    frequency: 'daily'
                });
            });
    });

    it('should pass full declaration [iHealth Poller Schema]', () => {
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
                assert.strictEqual(poller.passphrase.cipherText, 'foo');
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
                assert.strictEqual(proxy.passphrase.cipherText, 'foo');
            });
    });

    it('should not allow additional properties in declaration [iHealth Poller Schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/someProp/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should not allow empty string as downloadFolder\' value [iHealth Poller Schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/downloadFolder/.test(err) && /minLength/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
    /**
     * iHealth Poller Schema tests - end
     */

    /**
     * System Schema tests - start
     * Also verifies customKeywords.js/declarationClass
     */
    it('should pass miminal declaration [System schema]', () => {
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
                assert.strictEqual(system.trace, false);
                assert.strictEqual(system.host, 'localhost');
                assert.strictEqual(system.port, 8100);
                assert.strictEqual(system.protocol, 'http');
                assert.strictEqual(system.allowSelfSignedCert, undefined);
                assert.strictEqual(system.enableHostConnectivityCheck, undefined);
                assert.strictEqual(system.username, undefined);
                assert.strictEqual(system.passphrase, undefined);
            });
    });

    it('should pass full declaration [System schema]', () => {
        const data = {
            class: 'Telemetry',
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
                }
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
                assert.strictEqual(system.passphrase.cipherText, 'foo');
            });
    });

    it('should not allow additional properties [System schema]', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                someProp: 'someValue'
            }
        };
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/someProp/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should allow to attach poller declaration by name [System schema]', () => {
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
        return config.validate(data);
    });

    it('should fail when non-existing poller declaration attached [System schema]', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                systemPoller: 'My_System_Poller_Non_existing'
            }
        };
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/declaration with name/.test(err)
                        && /Telemetry_System_Poller/.test(err)
                        && /My_System_Poller_Non_existing/.test(err)) {
                    return Promise.resolve();
                }
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail when poller declaration specified by name with invalid type [System schema]', () => {
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/declaration with name/.test(err)
                        && /Telemetry_System_Poller/.test(err)
                        && /My_System_2/.test(err)) {
                    return Promise.resolve();
                }
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should allow to attach inline System Poller minimal declaration [System schema]', () => {
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
                assert.strictEqual(poller.trace, false);
                assert.strictEqual(poller.interval, 300);
                assert.deepStrictEqual(poller.tag, { tenant: '`T`', application: '`A`' });
                assert.strictEqual(poller.host, undefined);
                assert.strictEqual(poller.port, undefined);
                assert.strictEqual(poller.protocol, undefined);
                assert.strictEqual(poller.allowSelfSignedCert, undefined);
                assert.strictEqual(poller.enableHostConnectivityCheck, undefined);
                assert.strictEqual(poller.username, undefined);
                assert.strictEqual(poller.passphrase, undefined);
            });
    });

    it('should allow to attach inline System Poller full declaration [System schema]', () => {
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
                    }
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
                assert.strictEqual(poller.host, undefined);
                assert.strictEqual(poller.port, undefined);
                assert.strictEqual(poller.protocol, undefined);
                assert.strictEqual(poller.allowSelfSignedCert, undefined);
                assert.strictEqual(poller.enableHostConnectivityCheck, undefined);
                assert.strictEqual(poller.username, undefined);
                assert.strictEqual(poller.passphrase, undefined);
            });
    });

    it('should not-allow to attach inline System Poller declaration with specified host [System schema]', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                systemPoller: {
                    host: 'localhost'
                }
            }
        };

        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/systemPoller/.test(err) && /should NOT have additional properties/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should allow to attach inline iHealth Poller minimal declaration [System schema]', () => {
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
                assert.strictEqual(poller.passphrase.cipherText, 'foo');
                assert.deepStrictEqual(poller.interval, {
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    },
                    frequency: 'daily'
                });
            });
    });

    it('should allow to attach inline iHealth Poller full declaration [System schema]', () => {
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
                assert.strictEqual(poller.passphrase.cipherText, 'foo');
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
                assert.strictEqual(proxy.passphrase.cipherText, 'foo');
            });
    });

    it('should allow to attach inline declaration for System Poller and iHealth Poller [System schema]', () => {
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
        return config.validate(data);
    });
    /**
     * System Schema tests - end
     */

    /**
     * customKeywords.js/pathExists tests - start
     */
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
        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/downloadFolder/.test(err) && /Unable to access path/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should be abble to access directory from iHealth declaration', () => {
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
        return config.validate(data);
    });
    /**
     * customKeywords.js/pathExists tests - end
     */

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
        deviceUtil.encryptSecret = () => Promise.resolve(resolvedSecret);

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
        deviceUtil.encryptSecret = secret => Promise.resolve(secret);

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
