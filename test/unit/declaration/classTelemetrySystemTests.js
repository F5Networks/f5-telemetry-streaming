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
const generateInputActionsTests = require('./generators/inputDataActions');

moduleCache.remember();

describe('Declarations -> Telemetry_System', () => {
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

    describe('"actions" tests for single system poller', () => generateInputActionsTests({
        class: 'Telemetry',
        My_System: {
            class: 'Telemetry_System',
            systemPoller: {
                interval: 90,
                workers: 9,
                chunkSize: 9
            }
        }
    }, ['My_System', 'systemPoller']));

    describe('"actions" tests for array of system pollers', () => generateInputActionsTests({
        class: 'Telemetry',
        My_System: {
            class: 'Telemetry_System',
            systemPoller: [
                { interval: 90, workers: 9, chunkSize: 90 },
                { interval: 100, workers: 1, chunkSize: 10 }
            ]
        }
    }, ['My_System', 'systemPoller', '0']));

    it('should pass minimal declaration', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System'
            }
        };
        return declValidator(data)
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
        return declValidator(data)
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
                        interval: 100,
                        workers: 5,
                        chunkSize: 30
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
        return assert.isRejected(declValidator(data), /someProp.*should NOT have additional properties/);
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
        return assert.isFulfilled(declValidator(data));
    });

    it('should fail when non-existing poller declaration attached', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                systemPoller: 'My_System_Poller_Non_existing'
            }
        };
        return assert.isRejected(declValidator(data), /declaration with name.*(Telemetry_System_Poller|My_System_Poller_Non_existing)/);
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
        return assert.isRejected(declValidator(data), /declaration with name.*(Telemetry_System_Poller|My_System_2)/);
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
        return declValidator(data)
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
        return declValidator(data)
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

    it('should not allow set passphrase without username', async () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                passphrase: {
                    cipherText: 'test_passphrase_1'
                },
                systemPoller: {
                    interval: 60
                }
            }
        };
        return assert.isRejected(declValidator(data), /passphrase.*should have property username when property passphrase is present/);
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
        return assert.isRejected(declValidator(data), /systemPoller.*should NOT have additional properties/);
    });

    it('should not allow empty username', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                username: '',
                systemPoller: {
                    host: 'localhost'
                }
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*username.*should NOT be shorter than 1 characters/);
    });

    it('should not allow empty host', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                host: '',
                systemPoller: {
                    host: 'localhost'
                }
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*host.*should NOT be shorter than 1 characters/);
    });

    it('should not allow empty iHealthPollerPointerRef', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                iHealthPoller: ''
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*iHealthPoller.*should NOT be shorter than 1 characters/);
    });

    it('should not allow empty systemPollerPointerRef', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                systemPoller: ''
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*systemPoller.*should NOT be shorter than 1 characters/);
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
        return declValidator(data)
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
        return declValidator(data)
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
        return assert.isRejected(declValidator(data), /iHealthPoller.*should NOT have additional properties/);
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
        return assert.isFulfilled(declValidator(data));
    });

    it('should allow systemPoller as an array (inline object)', () => {
        const data = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                systemPoller: [
                    {
                        interval: 1440,
                        trace: true,
                        workers: 10
                    },
                    {
                        interval: 90,
                        chunkSize: 50
                    }
                ]
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const poller = validConfig.My_System.systemPoller;
                assert.deepStrictEqual(
                    poller,
                    [
                        {
                            actions: [{
                                enable: true,
                                setTag: { application: '`A`', tenant: '`T`' }
                            }],
                            trace: true,
                            interval: 1440,
                            workers: 10,
                            chunkSize: 30,
                            enable: true
                        },
                        {
                            actions: [{
                                enable: true,
                                setTag: { application: '`A`', tenant: '`T`' }
                            }],
                            interval: 90,
                            workers: 5,
                            chunkSize: 50,
                            enable: true
                        }
                    ]
                );
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
                interval: 80,
                workers: 5,
                chunkSize: 20
            },
            Poller_2: {
                class: 'Telemetry_System_Poller',
                interval: 100,
                trace: true
            }
        };
        return assert.isFulfilled(declValidator(data));
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
        return assert.isFulfilled(declValidator(data));
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
        return assert.isRejected(declValidator(data), errMsg);
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
        return assert.isRejected(declValidator(data), errMsg);
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
        return assert.isRejected(declValidator(data), errMsg);
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
        return assert.isRejected(declValidator(data), errMsg);
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
        return assert.isRejected(declValidator(data), errMsg);
    });
});
