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

describe('Declarations -> Telemetry_Listener', () => {
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

    describe('"actions" tests for event listener', () => generateInputActionsTests({
        class: 'Telemetry',
        My_Listener: {
            class: 'Telemetry_Listener'
        }
    }, ['My_Listener']));

    it('should pass minimal declaration', () => {
        const data = {
            class: 'Telemetry',
            My_Listener: {
                class: 'Telemetry_Listener'
            }
        };
        return declValidator(data)
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
        return declValidator(data)
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
        return assert.isRejected(declValidator(data), /someProp.*should NOT have additional properties/);
    });

    it('should not allow empty application tag', () => {
        const data = {
            class: 'Telemetry',
            My_Listener: {
                class: 'Telemetry_Listener',
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
            My_Listener: {
                class: 'Telemetry_Listener',
                tag: {
                    tenant: '',
                    application: '`C`'
                }
            }
        };
        return assert.isRejected(declValidator(data), /minLength.*tenant.*should NOT be shorter than 1 characters/);
    });

    describe('trace', () => {
        it('should allow enabling tracing (value = true)', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener',
                    trace: true
                }
            };
            return declValidator(data)
                .then((validConfig) => {
                    const listener = validConfig.My_Listener;
                    assert.notStrictEqual(listener, undefined);
                    assert.strictEqual(listener.trace, true);
                });
        });

        it('should allow disabling tracing (value = false)', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener',
                    trace: false
                }
            };
            return declValidator(data)
                .then((validConfig) => {
                    const listener = validConfig.My_Listener;
                    assert.notStrictEqual(listener, undefined);
                    assert.strictEqual(listener.trace, false);
                });
        });

        it('should allow enabling tracing via custom path (value = path)', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener',
                    trace: '/my/path'
                }
            };
            return declValidator(data)
                .then((validConfig) => {
                    const listener = validConfig.My_Listener;
                    assert.notStrictEqual(listener, undefined);
                    assert.strictEqual(listener.trace, '/my/path');
                });
        });

        it('should fail when setting trace to empty string', () => {
            const data = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener',
                    trace: ''
                }
            };
            return assert.isRejected(declValidator(data), /minLength.*trace.*should NOT be shorter than 1 character/);
        });
    });

    describe('tracer v2', () => {
        describe('config object', () => {
            it('should allow set tracer to object (type = "output")', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: { type: 'output' }
                    }
                };
                return declValidator(data)
                    .then((validConfig) => {
                        const listener = validConfig.My_Listener;
                        assert.notStrictEqual(listener, undefined);
                        assert.strictEqual(listener.class, 'Telemetry_Listener');
                        assert.strictEqual(listener.enable, true);
                        assert.deepStrictEqual(listener.trace, {
                            type: 'output'
                        });
                        assert.strictEqual(listener.port, 6514);
                        assert.deepStrictEqual(listener.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                        assert.deepStrictEqual(listener.match, '');
                    });
            });

            it('should allow set tracer to object (type = "input")', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: { type: 'input' }
                    }
                };
                return declValidator(data)
                    .then((validConfig) => {
                        const listener = validConfig.My_Listener;
                        assert.notStrictEqual(listener, undefined);
                        assert.strictEqual(listener.class, 'Telemetry_Listener');
                        assert.strictEqual(listener.enable, true);
                        assert.deepStrictEqual(listener.trace, {
                            type: 'input'
                        });
                        assert.strictEqual(listener.port, 6514);
                        assert.deepStrictEqual(listener.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                        assert.deepStrictEqual(listener.match, '');
                    });
            });

            it('should allow set tracer to object (all properties)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: { type: 'output', path: 'path' }
                    }
                };
                return declValidator(data)
                    .then((validConfig) => {
                        const listener = validConfig.My_Listener;
                        assert.notStrictEqual(listener, undefined);
                        assert.strictEqual(listener.class, 'Telemetry_Listener');
                        assert.strictEqual(listener.enable, true);
                        assert.deepStrictEqual(listener.trace, {
                            type: 'output', path: 'path'
                        });
                        assert.strictEqual(listener.port, 6514);
                        assert.deepStrictEqual(listener.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                        assert.deepStrictEqual(listener.match, '');
                    });
            });

            it('should not allow set tracer path to empty string', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: { type: 'input', path: '' }
                    }
                };
                return assert.isRejected(declValidator(data), /minLength.*path.*should NOT be shorter than 1 character/);
            });

            it('should not allow set tracer without "type"', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: {}
                    }
                };
                return assert.isRejected(declValidator(data), /should have required property 'type'/);
            });

            it('should not allow set invalid value to tracer "type"', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: { type: 'invalidType' }
                    }
                };
                return assert.isRejected(declValidator(data), /trace.*type.*enum.*should be equal to one of the allowed values/);
            });
        });

        describe('array of config objects', () => {
            it('should allow set tracer to array of objects ("type" only)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [{ type: 'output' }, { type: 'input' }]
                    }
                };
                return declValidator(data)
                    .then((validConfig) => {
                        const listener = validConfig.My_Listener;
                        assert.notStrictEqual(listener, undefined);
                        assert.strictEqual(listener.class, 'Telemetry_Listener');
                        assert.strictEqual(listener.enable, true);
                        assert.deepStrictEqual(listener.trace, [
                            { type: 'output' },
                            { type: 'input' }
                        ]);
                        assert.strictEqual(listener.port, 6514);
                        assert.deepStrictEqual(listener.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                        assert.deepStrictEqual(listener.match, '');
                    });
            });

            it('should allow set tracer to array of objects (all properties)', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [{ type: 'output', path: 'outputPath' }, { type: 'input', path: 'inputPath' }]
                    }
                };
                return declValidator(data)
                    .then((validConfig) => {
                        const listener = validConfig.My_Listener;
                        assert.notStrictEqual(listener, undefined);
                        assert.strictEqual(listener.class, 'Telemetry_Listener');
                        assert.strictEqual(listener.enable, true);
                        assert.deepStrictEqual(listener.trace, [
                            { type: 'output', path: 'outputPath' },
                            { type: 'input', path: 'inputPath' }
                        ]);
                        assert.strictEqual(listener.port, 6514);
                        assert.deepStrictEqual(listener.actions, [{ enable: true, setTag: { tenant: '`T`', application: '`A`' } }]);
                        assert.deepStrictEqual(listener.match, '');
                    });
            });

            it('should not allow set tracer to array of objects with same "type"', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [{ type: 'output', path: 'outputPath' }, { type: 'output', path: 'inputPath' }]
                    }
                };
                return assert.isRejected(declValidator(data), /should pass .*uniqueItemProperties.* keyword validation/);
            });

            it('should not allow set tracer to an empty array', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: []
                    }
                };
                return assert.isRejected(declValidator(data), /should NOT have fewer than 1 items/);
            });

            it('should not allow set tracer to an array with 3+ elements', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [
                            { type: 'input' },
                            { type: 'output' },
                            { type: 'input' }
                        ]
                    }
                };
                return assert.isRejected(declValidator(data), /should NOT have more than 2 items/);
            });

            it('should not allow set tracer path to empty string', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [{ type: 'input', path: '' }, { type: 'output', path: 'path' }]
                    }
                };
                return assert.isRejected(declValidator(data), /minLength.*path.*should NOT be shorter than 1 character/);
            });

            it('should not allow set tracer without "type"', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [{}]
                    }
                };
                return assert.isRejected(declValidator(data), /should have required property 'type'/);
            });

            it('should not allow set invalid value to tracer "type"', () => {
                const data = {
                    class: 'Telemetry',
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: [{ type: 'invalidType' }]
                    }
                };
                return assert.isRejected(declValidator(data), /trace.*type.*enum.*should be equal to one of the allowed values/);
            });
        });
    });
});
