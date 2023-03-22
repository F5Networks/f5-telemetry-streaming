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

moduleCache.remember();

describe('Declarations -> Base Schema objects', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

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
            return declValidator(data)
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
            return declValidator(data)
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
            return assert.isRejected(declValidator(data), /host.*should have required property 'host'/);
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
            return assert.isRejected(declValidator(data), /proxy\/port.*should be <=/);
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
            return assert.isRejected(declValidator(data), /proxy\/protocol.*should be equal to one of the allowed values/);
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
            return assert.isRejected(declValidator(data), /proxy\/allowSelfSignedCert.*should be boolean/);
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
            return assert.isRejected(declValidator(data), /proxy\/enableHostConnectivityCheck.*should be boolean/);
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
            return assert.isRejected(declValidator(data), /someProp.*should NOT have additional properties/);
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
            return assert.isRejected(declValidator(data), /should have property username when property passphrase is present/);
        });

        it('should not allow empty username', () => {
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
                        username: '',
                        passphrase: {
                            cipherText: 'passphrase'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /minLength.*username.*should NOT be shorter than 1 character/);
        });

        it('should not allow empty host', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    proxy: {
                        host: '',
                        username: 'username',
                        passphrase: {
                            cipherText: 'passphrase'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /minLength.*host.*should NOT be shorter than 1 character/);
        });
    });
});
