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
const moduleCache = require('./shared/restoreCache')();
const sinon = require('sinon');

const assert = require('./shared/assert');
const dummies = require('./shared/dummies');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');
const testUtil = require('./shared/util');

const configWorker = sourceCode('src/lib/config');
const tracer = sourceCode('src/lib/utils/tracer');
const tracerMgr = sourceCode('src/lib/tracerManager');

moduleCache.remember();

describe('Tracer Manager', () => {
    const tracerFile = 'tracerTest';
    const fakeDate = new Date();
    let coreStub;

    const addTimestamps = (data) => data.map((item) => ({ data: item, timestamp: new Date().toISOString() }));

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub();
        stubs.clock({ fakeTimersOpts: fakeDate });
        coreStub.logger.removeAllMessages();
        return configWorker.processDeclaration(dummies.declaration.base.decrypted())
            .then(() => {
                assert.isEmpty(tracerMgr.registered(), 'should have no registered tracers');
            });
    });

    afterEach(() => configWorker.processDeclaration(dummies.declaration.base.decrypted())
        .then(() => {
            assert.isEmpty(tracerMgr.registered(), 'should have no registered tracers');
            sinon.restore();
        }));

    describe('.fromConfig()', () => {
        let tracerInst;

        it('should create tracer using provided location and write data to it', () => {
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile
            });
            assert.match(tracerInst.name, /tracer_\d+/, 'should set name');
            assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
            assert.deepStrictEqual(tracerInst.encoding, 'utf8', 'should set default encoding');
            assert.deepStrictEqual(tracerInst.inactivityTimeout, 900, 'should set default inactivity timeout');
            assert.deepStrictEqual(tracerInst.maxRecords, 10, 'should set default maxRecords');
            assert.isFalse(tracerInst.disabled, 'should not be disabled');
            assert.isFalse(tracerInst.suspended, 'should not be suspended');
            assert.notExists(tracerInst.fd, 'should have no fd');

            return tracerInst.write('foobar')
                .then(() => coreStub.tracer.waitForData())
                .then(() => {
                    assert.deepStrictEqual(
                        coreStub.tracer.data[tracerFile],
                        addTimestamps(['foobar'])
                    );
                });
        });

        it('should create tracer using provided location and options and write data to it', () => {
            tracerInst = tracerMgr.fromConfig({
                inactivityTimeout: 10,
                enable: true,
                encoding: 'ascii',
                maxRecords: 1,
                path: tracerFile
            });
            assert.match(tracerInst.name, /tracer_\d+/, 'should set name');
            assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
            assert.deepStrictEqual(tracerInst.inactivityTimeout, 10, 'should set custom inactivity timeout');
            assert.deepStrictEqual(tracerInst.encoding, 'ascii', 'should set custom encoding');
            assert.deepStrictEqual(tracerInst.maxRecords, 1, 'should set custom maxRecords');
            assert.isFalse(tracerInst.disabled, 'should not be disabled');
            assert.isFalse(tracerInst.suspended, 'should not be suspended');
            assert.notExists(tracerInst.fd, 'should have no fd');

            return tracerInst.write('foobar')
                .then(() => {
                    assert.deepStrictEqual(
                        coreStub.tracer.data[tracerFile],
                        addTimestamps(['foobar'])
                    );
                });
        });

        it('should return existing tracer', () => {
            let sameTracerInst;
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile,
                options: {
                    encoding: 'ascii',
                    maxRecords: 1
                }
            });
            return tracerInst.write('foobar')
                .then(() => {
                    assert.deepStrictEqual(
                        coreStub.tracer.data[tracerFile],
                        addTimestamps(['foobar'])
                    );
                    coreStub.logger.removeAllMessages();
                    sameTracerInst = tracerMgr.fromConfig({
                        path: tracerFile,
                        options: {
                            encoding: 'ascii',
                            maxRecords: 1
                        }
                    });
                    return sameTracerInst.write('foobar');
                })
                .then(() => {
                    assert.isTrue(tracerInst === sameTracerInst, 'should return same instance');
                    assert.deepStrictEqual(tracerInst, sameTracerInst, 'should return same instance');
                    assert.exists(sameTracerInst.fd, 'should set fd');
                    assert.strictEqual(sameTracerInst.fd, tracerInst.fd, 'fd should be the same');
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Creating new tracer instance for file '${tracerFile}'`, 'g'),
                        'should not log debug message'
                    );
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Updating tracer instance for file '${tracerFile}'`, 'g'),
                        'should not log debug message'
                    );
                });
        });

        it('should return existing tracer (normalized FS path)', () => {
            let sameTracerInst;
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile,
                options: {
                    encoding: 'ascii',
                    maxRecords: 1
                }
            });
            return tracerInst.write('foobar')
                .then(() => {
                    assert.deepStrictEqual(
                        coreStub.tracer.data[tracerFile],
                        addTimestamps(['foobar'])
                    );
                    coreStub.logger.removeAllMessages();
                    sameTracerInst = tracerMgr.fromConfig({
                        path: `${tracerFile}/../tracerTest`,
                        options: {
                            encoding: 'ascii',
                            maxRecords: 1
                        }
                    });
                    return sameTracerInst.write('foobar');
                })
                .then(() => {
                    assert.isTrue(tracerInst === sameTracerInst, 'should return same instance');
                    assert.deepStrictEqual(tracerInst, sameTracerInst, 'should return same instance');
                    assert.exists(sameTracerInst.fd, 'should set fd');
                    assert.strictEqual(sameTracerInst.fd, tracerInst.fd, 'fd should be the same');
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Creating new tracer instance for file '${tracerFile}'`, 'g'),
                        'should not log debug message'
                    );
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Updating tracer instance for file '${tracerFile}'`, 'g'),
                        'should not log debug message'
                    );
                });
        });

        it('should not create tracer when disabled', () => {
            tracerMgr.unregister(tracerInst);
            assert.lengthOf(tracerMgr.registered(), 0, 'should have not tracers registered');

            tracerInst = tracerMgr.fromConfig({
                enable: false,
                encoding: 'ascii',
                maxRecords: 1,
                path: tracerFile
            });
            assert.notExists(tracerInst, 'should not create Tracer when disabled');
            assert.lengthOf(tracerMgr.registered(), 0, 'should have not tracers registered');
        });

        it('should stop and create new tracer when maxRecords changed', () => {
            let newTracer;
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile
            });
            return tracerInst.write('somethings')
                .then(() => {
                    newTracer = tracerMgr.fromConfig({
                        path: tracerFile,
                        maxRecords: 100
                    });
                    return newTracer.write('something3');
                })
                .then(() => {
                    assert.isFalse(tracerInst === newTracer, 'should return different instance');
                    assert.notDeepEqual(tracerInst.maxRecords, newTracer.maxRecords, 'should use different maxRecords');

                    const registered = tracerMgr.registered();
                    assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                    assert.include(registered, newTracer, 'should register new tracer');
                    assert.isTrue(tracerInst.disabled, 'should disabled old instance');
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Updating tracer instance for file '${tracerFile}'`, 'g'),
                        'should log debug message'
                    );
                });
        });

        it('should stop and create new tracer when encoding changed', () => {
            let newTracer;
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile
            });
            return tracerInst.write('somethings')
                .then(() => {
                    newTracer = tracerMgr.fromConfig({
                        path: tracerFile,
                        encoding: 'ascii'
                    });
                    return newTracer.write('something3');
                })
                .then(() => {
                    assert.isFalse(tracerInst === newTracer, 'should return different instance');
                    assert.notDeepEqual(tracerInst.encoding, newTracer.encoding, 'should use different paths');

                    const registered = tracerMgr.registered();
                    assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                    assert.include(registered, newTracer, 'should register new tracer');
                    assert.isTrue(tracerInst.disabled, 'should disabled old instance');
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Updating tracer instance for file '${tracerFile}'`, 'g'),
                        'should log debug message'
                    );
                });
        });

        it('should stop and create new tracer when inactivityTimeout changed', () => {
            let newTracer;
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile
            });
            return tracerInst.write('somethings')
                .then(() => {
                    newTracer = tracerMgr.fromConfig({
                        path: tracerFile,
                        encoding: 'ascii',
                        inactivityTimeout: 10
                    });
                    return newTracer.write('something3');
                })
                .then(() => {
                    assert.isFalse(tracerInst === newTracer, 'should return different instance');
                    assert.notDeepEqual(tracerInst.encoding, newTracer.encoding, 'should use different paths');

                    const registered = tracerMgr.registered();
                    assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                    assert.deepStrictEqual(tracerInst.inactivityTimeout, 900, 'should set default inactivity timeout');
                    assert.deepStrictEqual(newTracer.inactivityTimeout, 10, 'should set custom inactivity timeout');
                    assert.include(registered, newTracer, 'should register new tracer');
                    assert.isTrue(tracerInst.disabled, 'should disabled old instance');
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        new RegExp(`Updating tracer instance for file '${tracerFile}'`, 'g'),
                        'should log debug message'
                    );
                });
        });

        it('should not set inactivity timeout when 0 passed', () => {
            const fakeClock = stubs.clock();

            tracerInst = tracerMgr.fromConfig({
                inactivityTimeout: 0,
                path: tracerFile
            });
            assert.deepStrictEqual(tracerInst.inactivityTimeout, 0, 'should set custom inactivity timeout');
            return tracerInst.write('somethings')
                .then(() => {
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /Inactivity timeout set to/,
                        'should log debug message'
                    );
                    fakeClock.clockForward(60 * 1000, { repeat: 60, promisify: true });
                    return testUtil.sleep(60 * 60 * 1000);
                })
                .then(() => {
                    assert.isFalse(tracerInst.disabled, 'should not be disabled');
                    assert.isFalse(tracerInst.suspended, 'should not be suspended');
                });
        });

        it('should set inactivity timeout to default value (900s)', () => {
            const fakeClock = stubs.clock();
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile
            });
            assert.deepStrictEqual(tracerInst.inactivityTimeout, 900, 'should set default inactivity timeout');
            return tracerInst.write('somethings')
                .then(() => {
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Inactivity timeout set to 900 s/,
                        'should log debug message'
                    );
                    fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                    return testUtil.sleep(16 * 60 * 1000);
                })
                .then(() => {
                    assert.isFalse(tracerInst.disabled, 'should not be disabled');
                    assert.isTrue(tracerInst.suspended, 'should be suspended');
                });
        });

        it('should set inactivity timeout to correct value when invalid value provided (-15s)', () => {
            const fakeClock = stubs.clock();
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile,
                inactivityTimeout: -15
            });
            assert.deepStrictEqual(tracerInst.inactivityTimeout, 15, 'should set corrected inactivity timeout');
            return tracerInst.write('somethings')
                .then(() => {
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Inactivity timeout set to 15 s/,
                        'should log debug message'
                    );
                    fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                    return testUtil.sleep(16 * 60 * 1000);
                })
                .then(() => {
                    assert.isFalse(tracerInst.disabled, 'should not be disabled');
                    assert.isTrue(tracerInst.suspended, 'should be suspended');
                });
        });

        it('should set inactivity timeout to custom value (30s)', () => {
            const fakeClock = stubs.clock();
            tracerInst = tracerMgr.fromConfig({
                path: tracerFile,
                inactivityTimeout: 30
            });
            assert.deepStrictEqual(tracerInst.inactivityTimeout, 30, 'should set custom inactivity timeout');
            return tracerInst.write('somethings')
                .then(() => {
                    assert.deepStrictEqual(tracerInst.inactivityTimeout, 30, 'should set custom inactivity timeout');
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Inactivity timeout set to 30 s/,
                        'should log debug message'
                    );
                    fakeClock.clockForward(1000, { repeat: 31, promisify: true });
                    return testUtil.sleep(31 * 1000);
                })
                .then(() => {
                    assert.isFalse(tracerInst.disabled, 'should not be disabled');
                    assert.isTrue(tracerInst.suspended, 'should be suspended');
                });
        });
    });

    describe('.registered()', () => {
        it('should return registered tracers', () => {
            const tracerInst1 = tracerMgr.fromConfig({ path: 'tracer1' });
            const tracerInst2 = tracerMgr.fromConfig({ path: 'tracer2' });
            const registered = tracerMgr.registered();

            assert.lengthOf(registered, 2, 'should register 2 tracers');
            assert.include(registered, tracerInst1, 'should register tracer');
            assert.include(registered, tracerInst2, 'should register tracer');
        });
    });

    describe('.unregister()', () => {
        let tracerInst;

        beforeEach(() => {
            tracerInst = tracerMgr.fromConfig({ path: tracerFile });
        });

        it('should unregister tracer', () => tracerMgr.unregister(tracerInst)
            .then(() => {
                assert.notInclude(tracerMgr.registered(), tracerInst, 'should unregister tracer');
                assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
            }));

        it('should unregister all tracers', () => {
            const tracerInst1 = tracerMgr.fromConfig({ path: 'tracer1' });
            const tracerInst2 = tracerMgr.fromConfig({ path: 'tracer2' });
            assert.lengthOf(tracerMgr.registered(), 3, 'should register 3 tracers');
            return tracerMgr.unregisterAll()
                .then(() => {
                    assert.isEmpty(tracerMgr.registered(), 'should have no registered tracers');
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                    assert.isTrue(tracerInst1.disabled, 'should be disabled once unregistered');
                    assert.isTrue(tracerInst2.disabled, 'should be disabled once unregistered');
                });
        });

        it('should not fail when no tracer passed to .unregister', () => assert.isFulfilled(tracerMgr.unregister()));

        it('should catch rejection on attempt to unregister', () => {
            sinon.stub(tracer.Tracer.prototype, 'stop').rejects(new Error('stop error'));
            return tracerMgr.unregister(tracerInst, true)
                .then(() => {
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Uncaught error on attempt to unregister tracer[\s\S]*stop error/gm,
                        'should log debug message with error'
                    );
                });
        });
    });

    describe('config "on change" event', () => {
        it('should register enabled tracers and then unregister all when removed from config', () => configWorker.processDeclaration(
            dummies.declaration.base.decrypted({
                My_Consumer: dummies.declaration.consumer.default.decrypted({ trace: true }),
                My_Listener: dummies.declaration.listener.minimal.decrypted({ trace: 'listener' }),
                My_Disabled_Listener: dummies.declaration.listener.minimal.decrypted({
                    enable: false,
                    trace: 'listener2'
                }),
                My_Listener_With_Dual_Tracing: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'output' },
                        { type: 'input' }
                    ]
                }),
                My_Listener_With_Dual_Tracing_And_Path: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'output', path: 'listener3_output' },
                        { type: 'input', path: 'listener3_input' }
                    ]
                }),
                My_Enabled_Poller_With_Disabled_Trace: dummies.declaration.systemPoller.minimal.decrypted({
                    trace: false
                })
            })
        )
            .then(() => {
                const registered = tracerMgr.registered();
                assert.sameDeepMembers(
                    registered.map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        'listener',
                        'listener3_input',
                        'listener3_output'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processDeclaration(dummies.declaration.base.decrypted())
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                assert.isEmpty(tracerMgr.registered(), 'should have no registered tracers');
                registeredBefore.forEach((tracerInst) => {
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                });
            }));

        it('should register enabled tracers and then unregister disabled', () => configWorker.processDeclaration(
            dummies.declaration.base.decrypted({
                My_Consumer: dummies.declaration.consumer.default.decrypted({ trace: true }),
                My_Listener: dummies.declaration.listener.minimal.decrypted({ trace: 'listener' }),
                My_Disabled_Listener: dummies.declaration.listener.minimal.decrypted({
                    enable: false,
                    trace: 'listener2'
                }),
                My_Listener_With_Dual_Tracing: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'output' },
                        { type: 'input' }
                    ]
                }),
                My_Listener_With_Dual_Tracing_And_Path: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'output', path: 'listener3_output' },
                        { type: 'input', path: 'listener3_input' }
                    ]
                }),
                My_Enabled_Poller_With_Disabled_Trace: dummies.declaration.systemPoller.minimal.decrypted({
                    trace: false
                })
            })
        )
            .then(() => {
                const registered = tracerMgr.registered();
                assert.sameDeepMembers(
                    registered.map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        'listener',
                        'listener3_input',
                        'listener3_output'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processDeclaration(
                    dummies.declaration.base.decrypted({
                        My_Consumer: dummies.declaration.consumer.default.decrypted({ trace: false }),
                        My_Listener: dummies.declaration.listener.minimal.decrypted({
                            enable: false, trace: 'listener'
                        }),
                        My_Disabled_Listener: dummies.declaration.listener.minimal.decrypted({ trace: 'listener2' }),
                        My_Listener_With_Dual_Tracing: dummies.declaration.listener.minimal.decrypted({ trace: false }),
                        My_Listener_With_Dual_Tracing_And_Path: dummies.declaration.listener.minimal.decrypted({
                            trace: false
                        }),
                        My_Enabled_Poller_With_Disabled_Trace: dummies.declaration.systemPoller.minimal.decrypted({
                            trace: true
                        })
                    })
                )
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                });
                assert.sameDeepMembers(
                    tracerMgr.registered().map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_Enabled_Poller_With_Disabled_Trace::My_Enabled_Poller_With_Disabled_Trace',
                        'listener2'
                    ],
                    'should configure destination as expected'
                );
            }));

        /**
         * Idea of the test below is to be sure that pre-existing instances were not disabled/re-created and etc. -
         * in other words those instances should survive all config updates
         */
        it('should keep pre-existing tracers untouched when processing a new namespace declaration', () => configWorker.processDeclaration(
            dummies.declaration.base.decrypted({
                My_Consumer: dummies.declaration.consumer.default.decrypted({ trace: true }),
                My_Listener: dummies.declaration.listener.minimal.decrypted({ trace: 'listener' }),
                My_Disabled_Listener: dummies.declaration.listener.minimal.decrypted({
                    enable: false,
                    trace: 'listener2'
                }),
                My_Listener_With_Dual_Tracing: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'output' },
                        { type: 'input' }
                    ]
                }),
                My_Listener_With_Dual_Tracing_And_Path: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'output', path: 'listener3_output' },
                        { type: 'input', path: 'listener3_input' }
                    ]
                }),
                My_Enabled_Poller_With_Disabled_Trace: dummies.declaration.systemPoller.minimal.decrypted({
                    trace: false
                })
            })
        )
            .then(() => {
                const registered = tracerMgr.registered(); // remember those instances - should survive all updates
                assert.sameDeepMembers(
                    registered.map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        'listener',
                        'listener3_input',
                        'listener3_output'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processNamespaceDeclaration(
                    dummies.declaration.namespace.base.decrypted({
                        My_Consumer: dummies.declaration.consumer.default.decrypted({ trace: true }),
                        My_Listener: dummies.declaration.listener.minimal.decrypted({ trace: 'listener2' }),
                        My_Disabled_Listener: dummies.declaration.listener.minimal.decrypted({
                            enable: false,
                            trace: 'listener2'
                        }),
                        My_Listener_With_Dual_Tracing: dummies.declaration.listener.minimal.decrypted({
                            trace: [
                                { type: 'output' },
                                { type: 'input' }
                            ]
                        }),
                        My_Listener_With_Dual_Tracing_And_Path: dummies.declaration.listener.minimal.decrypted({
                            trace: [
                                { type: 'output', path: 'listener3_output' },
                                { type: 'input', path: 'listener3_input' }
                            ]
                        })
                    }),
                    'Namespace'
                )
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isFalse(tracerInst.disabled, 'should not disable pre-existing tracers');
                    assert.isFalse(tracerInst.suspended, 'should not suspend pre-existing tracers');
                });
                assert.sameDeepMembers(
                    tracerMgr.registered().map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/Telemetry_Consumer.Namespace::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.Namespace::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.Namespace::My_Listener_With_Dual_Tracing',
                        'listener',
                        'listener3_input',
                        'listener3_output',
                        'listener2'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processNamespaceDeclaration(
                    dummies.declaration.namespace.base.decrypted({
                        My_Consumer: dummies.declaration.consumer.default.decrypted({ enable: false }),
                        My_Listener: dummies.declaration.listener.minimal.decrypted({ trace: 'listener2' })
                    }),
                    'Namespace'
                )
                    .then(() => registeredBefore);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isFalse(tracerInst.disabled, 'should not disable pre-existing tracers');
                });
                assert.sameDeepMembers(
                    tracerMgr.registered().map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        'listener',
                        'listener3_input',
                        'listener3_output',
                        'listener2'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processNamespaceDeclaration(dummies.declaration.namespace.base.decrypted(), 'Namespace')
                    .then(() => registeredBefore);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isFalse(tracerInst.disabled, 'should not disable pre-existing tracers');
                    assert.isFalse(tracerInst.suspended, 'should not suspend pre-existing tracers');
                });
                assert.sameDeepMembers(
                    tracerMgr.registered().map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::My_Listener_With_Dual_Tracing',
                        'listener',
                        'listener3_input',
                        'listener3_output'
                    ],
                    'should configure destination as expected'
                );
            }));

        // verify that all classes are supported
        it('should register enabled tracers and then unregister all when removed from config (ALL classes)', () => configWorker.processDeclaration(
            dummies.declaration.base.decrypted({
                Default_Push_Consumer: dummies.declaration.consumer.default.decrypted({ trace: true }),
                Default_Pull_Consumer: dummies.declaration.pullConsumer.default.decrypted({
                    systemPoller: ['System_Poller'],
                    trace: true
                }),
                System_With_Inline_Pollers: dummies.declaration.system.full.decrypted({
                    iHealthPoller: dummies.declaration.ihealthPoller.inlineMinimal.decrypted({ trace: true }),
                    systemPoller: dummies.declaration.systemPoller.inlineMinimal.decrypted({ trace: true }),
                    trace: true
                }),
                System_With_Referenced_Pollers: dummies.declaration.system.full.decrypted({
                    iHealthPoller: 'iHealth_Poller',
                    systemPoller: 'System_Poller',
                    trace: true
                }),
                System_Poller: dummies.declaration.systemPoller.minimal.decrypted({ trace: true }),
                iHealth_Poller: dummies.declaration.ihealthPoller.minimal.decrypted({ trace: true }),
                Event_Listener: dummies.declaration.listener.minimal.decrypted({
                    trace: [
                        { type: 'input' },
                        { type: 'output' }
                    ]
                })
            })
        )
            .then(() => {
                const registered = tracerMgr.registered();
                assert.sameDeepMembers(
                    registered.map((t) => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::Default_Push_Consumer',
                        '/var/tmp/telemetry/Telemetry_Pull_Consumer.f5telemetry_default::Default_Pull_Consumer',
                        '/var/tmp/telemetry/Telemetry_Listener.f5telemetry_default::Event_Listener',
                        '/var/tmp/telemetry/INPUT.Telemetry_Listener.f5telemetry_default::Event_Listener',
                        '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_With_Inline_Pollers::SystemPoller_1',
                        '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::System_With_Inline_Pollers::iHealthPoller_1',
                        '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::System_With_Referenced_Pollers::System_Poller',
                        '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::System_With_Referenced_Pollers::iHealth_Poller'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processDeclaration(dummies.declaration.base.decrypted())
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                assert.isEmpty(tracerMgr.registered(), 'should have no registered tracers');
                registeredBefore.forEach((tracerInst) => {
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                });
            }));
    });
});
