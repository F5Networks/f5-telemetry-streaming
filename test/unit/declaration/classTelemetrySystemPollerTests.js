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

describe('Declarations -> Telemetry_System_Poller', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('"actions" tests for system poller', () => generateInputActionsTests({
        class: 'Telemetry',
        My_Poller: {
            class: 'Telemetry_System_Poller'
        }
    }, ['My_Poller']));

    it('should pass minimal declaration', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller'
            }
        };
        return declValidator(data)
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
                    },
                    {
                        name: 'myHttpEndpoint',
                        path: 'httpPath',
                        protocol: 'http'
                    },
                    {
                        name: 'snmpEndpoint',
                        path: '1.2.3',
                        protocol: 'snmp'
                    },
                    {
                        name: 'snmpEndpointWithOptions',
                        path: '1.2.3',
                        protocol: 'snmp',
                        numericalEnums: true
                    }
                ]
            }
        };
        return declValidator(data)
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
                            path: 'myPath',
                            protocol: 'http'
                        },
                        {
                            enable: true,
                            name: 'myHttpEndpoint',
                            path: 'httpPath',
                            protocol: 'http'
                        },
                        {
                            enable: true,
                            name: 'snmpEndpoint',
                            path: '1.2.3',
                            protocol: 'snmp',
                            numericalEnums: false
                        },
                        {
                            enable: true,
                            name: 'snmpEndpointWithOptions',
                            path: '1.2.3',
                            protocol: 'snmp',
                            numericalEnums: true
                        }
                    ]
                );
            });
    });

    it('should not allow empty username', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                username: ''
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*username.*should NOT be shorter than 1 characters/);
    });

    it('should not allow empty host', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                host: ''
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*host.*should NOT be shorter than 1 characters/);
    });

    it('should not allow empty application tag', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                tag: {
                    tenant: '`B`',
                    application: ''
                }
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*application.*should NOT be shorter than 1 characters/);
    });

    it('should not allow empty tenant tag', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                tag: {
                    tenant: '',
                    application: '`C`'
                }
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*tenant.*should NOT be shorter than 1 characters/);
    });

    it('should not allow additional properties', () => {
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                someProp: 'someValue'
            }
        };
        return assert.isRejected(declValidator(data), /someProp.*should NOT have additional properties/);
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
            return declValidator(data)
                .then((validated) => assert.strictEqual(validated.My_Poller.interval, 0));
        });

        it('should allow interval=0 when endpointList is not specified', () => {
            const data = {
                class: 'Telemetry',
                My_Poller: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                }
            };
            return declValidator(data)
                .then((validated) => assert.strictEqual(validated.My_Poller.interval, 0));
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
            return assert.isRejected(declValidator(data), errMsg);
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
            return assert.isRejected(declValidator(data), errMsg);
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
            return declValidator(data)
                .then((validated) => assert.strictEqual(validated.My_Poller.interval, 100000));
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
                        },
                        testC: {
                            name: 'c',
                            path: '1.2.3',
                            protocol: 'snmp',
                            numericalEnums: true
                        }
                    }
                },
                My_Endpoints2: {
                    class: 'Telemetry_Endpoints',
                    enable: true,
                    basePath: '/testing',
                    items: {
                        testD: {
                            name: 'd',
                            path: '/item/d',
                            enable: false
                        },
                        testE: {
                            name: 'e',
                            path: '/item/e'
                        },
                        testF: {
                            name: 'f',
                            path: 'sysStats',
                            protocol: 'snmp'
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
                        },
                        {
                            name: 'hostCpu',
                            path: '1.2.3',
                            protocol: 'snmp'
                        },
                        {
                            name: 'hostCpu_2',
                            path: '1.2.3',
                            protocol: 'snmp',
                            numericalEnums: true
                        }
                    ]
                }
            };
            return declValidator(data)
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
                                enable: true,
                                protocol: 'http'
                            },
                            {
                                enable: true,
                                basePath: '/myBase/',
                                items: {
                                    myEndpoint: {
                                        name: 'myEndpoint',
                                        path: 'myPath',
                                        enable: true,
                                        protocol: 'http'
                                    }
                                }
                            },
                            {
                                name: 'hostCpu',
                                path: '1.2.3',
                                protocol: 'snmp',
                                enable: true,
                                numericalEnums: false
                            },
                            {
                                name: 'hostCpu_2',
                                path: '1.2.3',
                                protocol: 'snmp',
                                enable: true,
                                numericalEnums: true
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
            return assert.isRejected(declValidator(data), errMsg);
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
            return assert.isRejected(declValidator(data), errMsg);
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
            return declValidator(data)
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
            return declValidator(data)
                .then((validConfig) => {
                    const poller = validConfig.My_Poller;
                    assert.deepStrictEqual(
                        poller.endpointList,
                        {
                            enable: true,
                            items: {
                                testA: {
                                    enable: true,
                                    name: 'a',
                                    path: 'some/a',
                                    protocol: 'http'
                                }
                            },
                            basePath: ''
                        }
                    );
                });
        });
    });
});
