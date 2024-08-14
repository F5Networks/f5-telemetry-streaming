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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const common = require('./common');
const declValidator = require('./common').validate;

moduleCache.remember();

describe('Declarations -> Base Schema objects', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
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
