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

describe('Declarations -> Telemetry_Endpoints', () => {
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
        return declValidator(data)
            .then((validConfig) => {
                const endpoints = validConfig.My_Endpoints;
                assert.deepStrictEqual(endpoints.items, {
                    test: {
                        enable: true,
                        path: '/test/path',
                        protocol: 'http'
                    }
                });
                // check defaults
                assert.strictEqual(endpoints.enable, true);
            });
    });

    it('should allow setting protocol (http)', () => {
        const data = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_Endpoints',
                items: {
                    test: {
                        path: '/test/path',
                        protocol: 'http'
                    }
                }
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const endpoints = validConfig.My_Endpoints;
                assert.strictEqual(endpoints.items.test.protocol, 'http');
                assert.isUndefined(endpoints.items.test.numericalEnums);
            });
    });

    it('should allow setting protocol (snmp)', () => {
        const data = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_Endpoints',
                items: {
                    test: {
                        path: '1.2.3',
                        protocol: 'snmp'
                    }
                }
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const endpoints = validConfig.My_Endpoints;
                assert.strictEqual(endpoints.items.test.protocol, 'snmp');
                assert.isFalse(endpoints.items.test.numericalEnums);
            });
    });

    it('should allow setting SNMP options', () => {
        const data = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_Endpoints',
                items: {
                    test: {
                        path: '1.2.3',
                        protocol: 'snmp',
                        numericalEnums: true
                    }
                }
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const endpoints = validConfig.My_Endpoints;
                assert.strictEqual(endpoints.items.test.protocol, 'snmp');
                assert.isTrue(endpoints.items.test.numericalEnums);
            });
    });

    it('should restrict \'path\' input when protocol is snmp', () => {
        const data = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_Endpoints',
                items: {
                    test: {
                        path: '1.2.3 && echo hi',
                        protocol: 'snmp'
                    }
                }
            }
        };
        return assert.isRejected(declValidator(data), /path.*should match pattern/);
    });

    it('should allow oid as numbers or strings when protocol = snmp', () => {
        const data = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_Endpoints',
                items: {
                    asNumbers: {
                        path: '1.2.3',
                        protocol: 'snmp'
                    },
                    asString: {
                        path: 'sysStats',
                        protocol: 'snmp'
                    }
                }
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const endpoints = validConfig.My_Endpoints;
                assert.strictEqual(endpoints.items.asNumbers.path, '1.2.3');
                assert.strictEqual(endpoints.items.asString.path, 'sysStats');
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
        return assert.isRejected(declValidator(data), /something.*should NOT have additional properties/);
    });

    it('should not allow SNMP options when protocol is not "snmp"', () => {
        const data = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_Endpoints',
                items: {
                    test: {
                        name: 'test',
                        path: '/test/path',
                        numericalEnums: true
                    }
                }
            }
        };
        return assert.isRejected(declValidator(data), /should NOT be valid/);
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
                    },
                    c: {
                        name: 'testC',
                        path: '/test/C',
                        protocol: 'http'
                    },
                    d: {
                        name: 'testD',
                        path: '1.2.3',
                        protocol: 'snmp'
                    },
                    e: {
                        name: 'testE',
                        path: '1.2.3',
                        protocol: 'snmp',
                        enable: false
                    },
                    f: {
                        name: 'testF',
                        path: '1.2.3',
                        protocol: 'snmp',
                        numericalEnums: true,
                        enable: false
                    }
                }
            }
        };

        return declValidator(data)
            .then((validConfig) => {
                const endpoints = validConfig.My_Endpoints;
                assert.deepStrictEqual(endpoints.items, {
                    a: {
                        enable: true,
                        name: 'testA',
                        path: '/test/A',
                        protocol: 'http'
                    },
                    b: {
                        name: 'testB',
                        path: '/test/B',
                        enable: false,
                        protocol: 'http'
                    },
                    c: {
                        name: 'testC',
                        path: '/test/C',
                        enable: true,
                        protocol: 'http'
                    },
                    d: {
                        name: 'testD',
                        path: '1.2.3',
                        enable: true,
                        numericalEnums: false,
                        protocol: 'snmp'
                    },
                    e: {
                        name: 'testE',
                        path: '1.2.3',
                        protocol: 'snmp',
                        numericalEnums: false,
                        enable: false
                    },
                    f: {
                        name: 'testF',
                        path: '1.2.3',
                        protocol: 'snmp',
                        numericalEnums: true,
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
        return assert.isRejected(declValidator(data), /\/My_Endpoints\/items.*items\/minProperties.*limit":1/);
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
        return assert.isRejected(declValidator(data), /\/My_Endpoints\/items.*should be object/);
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
        return assert.isRejected(declValidator(data), /\/My_Endpoints\/items.*should NOT have additional properties/);
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
        return assert.isRejected(declValidator(data), /\/My_Endpoints\/items\/first\/name.*should NOT be shorter than/);
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
        return assert.isRejected(declValidator(data), /\/My_Endpoints\/items\/first\/path.*should NOT be shorter than/);
    });
});
