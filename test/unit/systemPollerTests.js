/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/utils/device');
const monitor = require('../../src/lib/utils/monitor');
const timers = require('../../src/lib/utils/timers');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const systemPoller = require('../../src/lib/systemPoller');
const systemPollerConfigTestsData = require('./data/systemPollerTestsData');
const SystemStats = require('../../src/lib/systemStats');
const teemReporter = require('../../src/lib/teemReporter');
const testUtil = require('./shared/util');
const tracers = require('../../src/lib/utils/tracer');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('System Poller', () => {
    let coreStub;

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            persistentStorage,
            teemReporter,
            utilMisc
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;
    });

    afterEach(() => configWorker.processDeclaration({ class: 'Telemetry' })
        .then(() => sinon.restore()));

    describe('.safeProcess()', () => {
        let config;
        let returnCtx;
        let sinonClock;

        beforeEach(() => {
            sinonClock = sinon.useFakeTimers();
            config = {
                dataOpts: {
                    actions: []
                },
                interval: 100,
                id: 'mockId',
                destinationIds: ['mockDestId']
            };
            returnCtx = null;

            sinon.stub(SystemStats.prototype, 'collect').callsFake(() => {
                if (typeof returnCtx === 'object') {
                    return Promise.resolve(testUtil.deepCopy(returnCtx));
                }
                return returnCtx();
            });
        });

        afterEach(() => {
            sinonClock.restore();
        });

        it('should fail when .process rejects promise (requestFromUser)', () => {
            returnCtx = () => Promise.reject(new Error('some error'));
            return assert.isRejected(
                systemPoller.safeProcess(config, { requestFromUser: true }),
                /some error/
            );
        });

        it('should not fail when .process rejects promise (background process)', () => {
            returnCtx = () => Promise.reject(new Error('some error'));
            return assert.isFulfilled(systemPoller.safeProcess(config));
        });

        it('should fail when .process throws error (requestFromUser)', () => {
            sinon.stub(systemPoller, 'process').throws(new Error('some error'));
            return assert.isRejected(
                systemPoller.safeProcess(config, { requestFromUser: true }),
                /systemPoller:safeProcess unhandled exception.*some error/
            );
        });

        it('should not fail when .process throws error (background process)', () => {
            sinon.stub(systemPoller, 'process').throws(new Error('some error'));
            return assert.isFulfilled(systemPoller.safeProcess(config));
        });

        it('should resolve with data', () => {
            // thanks to fakeTimers - Date returns the same data
            const dataString = (new Date()).toISOString();
            returnCtx = () => Promise.resolve({ data: 'data' });
            return assert.becomes(
                systemPoller.safeProcess(config, { requestFromUser: true }),
                {
                    data: {
                        data: 'data',
                        telemetryEventCategory: 'systemInfo',
                        telemetryServiceInfo: {
                            cycleStart: dataString,
                            cycleEnd: dataString,
                            pollingInterval: 100
                        }
                    },
                    isCustom: undefined,
                    type: 'systemInfo',
                    sourceId: 'mockId',
                    destinationIds: ['mockDestId']
                }
            );
        });
    });

    describe('.getPollersConfig', () => {
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.getPollersConfig.forEach(testConf =>
            testUtil.getCallableIt(testConf)(
                testConf.name, () => configWorker.processDeclaration(testUtil.deepCopy(testConf.declaration))
                    .then(() => systemPoller.getPollersConfig(testConf.sysOrPollerName, testConf.funcOptions))
                    .then((pollersConfig) => {
                        pollersConfig = pollersConfig.map(p => ({ name: p.traceName }));
                        assert.sameDeepMembers(pollersConfig, testConf.expectedConfig);
                        // assert.isTrue(coreStub.deviceUtil.decryptSecret.called);
                    }, (error) => {
                        if (testConf.errorRegExp) {
                            return assert.match(error, testConf.errorRegExp, 'should match expected error message');
                        }
                        return Promise.reject(error);
                    })
            ));
    });

    describe('.findSystemOrPollerConfigs', () => {
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.findSystemOrPollerConfigs.forEach(testConf =>
            testUtil.getCallableIt(testConf)(
                testConf.name, () => configWorker.processDeclaration(testUtil.deepCopy(testConf.rawConfig))
                    .then(() => {
                        let actual;
                        try {
                            actual = systemPoller.findSystemOrPollerConfigs(
                                configWorker.currentConfig,
                                testConf.sysOrPollerName,
                                testConf.pollerName,
                                testConf.namespaceName
                            );
                        } catch (err) {
                            actual = err.message;
                        }
                        assert.deepStrictEqual(actual, testConf.expected);
                    })
            ));
    });

    describe('.fetchPollersData', () => {
        let processStub;

        beforeEach(() => {
            processStub = sinon.stub(systemPoller, 'process');
            processStub.callsFake(config => Promise.resolve({ data: { poller: config.name } }));
        });

        it('should return empty array when no config passed', () => {
            const pollerConfigs = [];
            const expected = [];
            return assert.becomes(systemPoller.fetchPollersData(pollerConfigs), expected);
        });

        it('should fetch data using poller config', () => {
            const pollerConfigs = [
                {
                    name: 'my_poller'
                }
            ];
            const expected = [
                {
                    data: {
                        poller: 'my_poller'
                    }
                }
            ];
            return assert.becomes(systemPoller.fetchPollersData(pollerConfigs), expected);
        });


        it('should fetch data using multiple poller configs', () => {
            const pollerConfigs = [
                {
                    name: 'my_poller'
                },
                {
                    name: 'my_super_poller'
                }
            ];
            const expected = [
                {
                    data: {
                        poller: 'my_poller'
                    }
                },
                {
                    data: {
                        poller: 'my_super_poller'
                    }
                }
            ];
            return assert.becomes(systemPoller.fetchPollersData(pollerConfigs), expected);
        });

        it('should reject when unable to fetch data', () => {
            const pollerConfigs = [{ name: 'my_poller' }];
            processStub.rejects(new Error('testError'));
            return assert.isRejected(systemPoller.fetchPollersData(pollerConfigs), 'testError');
        });

        it('should NOT decrypt secrets when decryptSecrets is not specified', () => {
            const pollerConfigs = [
                {
                    name: 'i_dont_remember'
                }
            ];
            return systemPoller.fetchPollersData(pollerConfigs)
                .then(() => assert.isFalse(coreStub.deviceUtil.decryptSecret.called));
        });

        it('should decrypt secrets when decryptSecrets=true', () => {
            const pollerConfigs = [
                {
                    name: 'my_poller',
                    passphrase: {
                        class: 'Secret',
                        cipherText: '$M$test'
                    }
                },
                {
                    name: 'my_other_poller',
                    passphrase: {
                        class: 'Secret',
                        cipherText: '$M$test'
                    }
                }
            ];
            return systemPoller.fetchPollersData(pollerConfigs, true)
                .then(() => assert.isTrue(coreStub.deviceUtil.decryptSecret.called));
        });

        it('should NOT decrypt secrets when decryptSecrets=false', () => {
            const pollerConfigs = [
                {
                    name: 'poller_alone'
                }
            ];
            return systemPoller.fetchPollersData(pollerConfigs, false)
                .then(() => assert.isFalse(coreStub.deviceUtil.decryptSecret.called));
        });
    });

    describe('events', () => {
        let TimerStub;

        class MockSlidingTimer {
            constructor(func, args, interval) {
                this.interval = interval;
                this.lastAction = 'INITIALIZED';
            }

            start() {
                TimerStub.startCount += 1;
                this.lastAction = 'STARTED';
            }

            stop() {
                TimerStub.stopCount += 1;
                this.lastAction = 'STOPPED';
            }

            update(uFunc, uArgs, uInterval) {
                this.interval = uInterval;
                TimerStub.update.push({ func: uFunc, args: uArgs, interval: uInterval });
                this.lastAction = 'UPDATED';
            }
        }

        beforeEach(() => {
            TimerStub = {
                startCount: 0, stopCount: 0, update: [], constructor: []
            };

            sinon.stub(timers, 'SlidingTimer').callsFake((func, args, interval) => {
                TimerStub.constructor.push({ args, interval });
                return new MockSlidingTimer(func, args, interval);
            });
        });

        describe('config "on change" event', () => {
            const defaultDeclaration = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    trace: true,
                    systemPoller: {
                        interval: 180
                    }
                }
            };

            let pollerTimers;

            beforeEach(() => {
                pollerTimers = {};
                sinon.stub(systemPoller, 'getPollerTimers').returns(pollerTimers);

                return configWorker.processDeclaration(testUtil.deepCopy(defaultDeclaration))
                    .then(() => {
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 180);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].config.traceName, 'My_System::SystemPoller_1');
                        assert.strictEqual(tracers.registered().length, 1);
                        assert.strictEqual(tracers.registered()[0].name, 'Telemetry_System_Poller.My_System::SystemPoller_1');
                        assert.strictEqual(TimerStub.startCount, 1);
                        assert.strictEqual(TimerStub.update.length, 0);
                        assert.strictEqual(TimerStub.stopCount, 0);

                        TimerStub = {
                            startCount: 0, stopCount: 0, update: [], constructor: []
                        };
                    });
            });

            afterEach(() => configWorker.processDeclaration({ class: 'Telemetry' })
                .then(() => {
                    assert.deepStrictEqual(systemPoller.getPollerTimers(), {});
                }));

            it('should stop existing poller(s) when removed from config', () => configWorker.emitAsync('change', { components: [], mappings: {} })
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, {});
                    assert.strictEqual(tracers.registered().length, 0);
                    assert.strictEqual(TimerStub.startCount, 0);
                    assert.strictEqual(TimerStub.update.length, 0);
                    assert.strictEqual(TimerStub.stopCount, 1);
                }));

            it('should update existing poller(s)', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System.systemPoller.interval = 500;
                newDeclaration.My_System.systemPoller.trace = true;
                const expectedPollerConfig = {
                    name: 'SystemPoller_1',
                    traceName: 'My_System::SystemPoller_1',
                    systemName: 'My_System',
                    id: 'My_System::SystemPoller_1',
                    namespace: 'f5telemetry_default',
                    class: 'Telemetry_System_Poller',
                    enable: true,
                    interval: 500,
                    trace: true,
                    tracer: tracers.registered()[0],
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    },
                    connection: {
                        allowSelfSignedCert: false,
                        host: 'localhost',
                        port: 8100,
                        protocol: 'http'
                    },
                    dataOpts: {
                        noTMStats: true,
                        tags: undefined,
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    },
                    destinationIds: []
                };
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(tracers.registered().length, 1);
                        assert.strictEqual(tracers.registered()[0].name, 'Telemetry_System_Poller.My_System::SystemPoller_1');
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 1);
                        assert.strictEqual(TimerStub.stopCount, 0);
                        assert.deepStrictEqual(pollerTimers['My_System::SystemPoller_1'].config, expectedPollerConfig);
                        assert.strictEqual(TimerStub.update[0].interval, 500);
                        assert.deepStrictEqual(TimerStub.update[0].args, expectedPollerConfig);
                    });
            });

            it('should ignore disabled pollers (existing poller)', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System.enable = false;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.deepStrictEqual(pollerTimers, {});
                        assert.strictEqual(tracers.registered().length, 0);
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 0);
                        assert.strictEqual(TimerStub.stopCount, 1);
                    });
            });

            it('should ignore disabled pollers (non-existing poller)', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
                newDeclaration.My_System_New.enable = false;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(Object.keys(pollerTimers).length, 1);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 180);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].config.traceName, 'My_System::SystemPoller_1');
                        assert.strictEqual(tracers.registered().length, 1);
                        assert.strictEqual(tracers.registered()[0].name, 'Telemetry_System_Poller.My_System::SystemPoller_1');
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 1);
                        assert.strictEqual(TimerStub.stopCount, 0);
                    });
            });

            it('should stop poller removed from System (existing poller with same system)', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                delete newDeclaration.My_System.systemPoller;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.deepStrictEqual(pollerTimers, {});
                        assert.strictEqual(tracers.registered().length, 0);
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 0);
                        assert.strictEqual(TimerStub.stopCount, 1);
                    });
            });

            it('should ignore System without poller (non-existing poller)', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
                delete newDeclaration.My_System_New.systemPoller;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(Object.keys(pollerTimers).length, 1);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 180);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].config.traceName, 'My_System::SystemPoller_1');
                        assert.strictEqual(tracers.registered().length, 1);
                        assert.strictEqual(tracers.registered()[0].name, 'Telemetry_System_Poller.My_System::SystemPoller_1');
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 1);
                        assert.strictEqual(TimerStub.stopCount, 0);
                    });
            });

            it('should start new poller (non-existing poller, inline declaration)', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
                newDeclaration.My_System_New.trace = false;
                newDeclaration.My_System_New.systemPoller.interval = 500;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(Object.keys(pollerTimers).length, 2);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 180);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].config.traceName, 'My_System::SystemPoller_1');
                        assert.strictEqual(pollerTimers['My_System_New::SystemPoller_1'].timer.interval, 500);
                        assert.strictEqual(pollerTimers['My_System_New::SystemPoller_1'].config.traceName, 'My_System_New::SystemPoller_1');
                        assert.strictEqual(tracers.registered().length, 1);
                        assert.strictEqual(tracers.registered()[0].name, 'Telemetry_System_Poller.My_System::SystemPoller_1');
                        assert.strictEqual(TimerStub.startCount, 1);
                        assert.strictEqual(TimerStub.update.length, 1);
                        assert.strictEqual(TimerStub.stopCount, 0);
                    });
            });

            it('should handle multiple pollers per system', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
                newDeclaration.My_System_New.systemPoller = [
                    {
                        interval: 10,
                        endpointList: {
                            basePath: 'mgmt/',
                            items: {
                                endpoint1: {
                                    path: 'ltm/pool'
                                }
                            }
                        }
                    },
                    'My_Poller'
                ];
                newDeclaration.My_Poller = {
                    class: 'Telemetry_System_Poller',
                    trace: true,
                    interval: 500
                };
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(Object.keys(pollerTimers).length, 3);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 180);
                        assert.strictEqual(pollerTimers['My_System_New::SystemPoller_1'].timer.interval, 10);
                        assert.strictEqual(pollerTimers['My_System_New::My_Poller'].timer.interval, 500);
                        assert.sameMembers(
                            tracers.registered().map(t => t.name),
                            [
                                'Telemetry_System_Poller.My_System::SystemPoller_1',
                                'Telemetry_System_Poller.My_System_New::SystemPoller_1',
                                'Telemetry_System_Poller.My_System_New::My_Poller'
                            ]
                        );
                        assert.strictEqual(TimerStub.startCount, 2);
                        assert.strictEqual(TimerStub.update.length, 1);
                        assert.strictEqual(TimerStub.stopCount, 0);
                        assert.sameDeepMembers(TimerStub.constructor.map(args => args.args), [
                            {
                                id: 'My_System_New::My_Poller',
                                name: 'My_Poller',
                                namespace: 'f5telemetry_default',
                                class: 'Telemetry_System_Poller',
                                systemName: 'My_System_New',
                                traceName: 'My_System_New::My_Poller',
                                enable: true,
                                interval: 500,
                                trace: true,
                                tracer: tracers.registered().find(t => t.name === 'Telemetry_System_Poller.My_System_New::My_Poller'),
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                },
                                connection: {
                                    allowSelfSignedCert: false,
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                },
                                dataOpts: {
                                    noTMStats: true,
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ]
                                },
                                destinationIds: []
                            },
                            {
                                name: 'SystemPoller_1',
                                id: 'My_System_New::SystemPoller_1',
                                namespace: 'f5telemetry_default',
                                class: 'Telemetry_System_Poller',
                                enable: true,
                                interval: 10,
                                trace: true,
                                systemName: 'My_System_New',
                                tracer: tracers.registered().find(t => t.name === 'Telemetry_System_Poller.My_System_New::SystemPoller_1'),
                                traceName: 'My_System_New::SystemPoller_1',
                                credentials: {
                                    username: undefined,
                                    passphrase: undefined
                                },
                                connection: {
                                    allowSelfSignedCert: false,
                                    host: 'localhost',
                                    port: 8100,
                                    protocol: 'http'
                                },
                                dataOpts: {
                                    noTMStats: true,
                                    tags: undefined,
                                    actions: [
                                        {
                                            enable: true,
                                            setTag: {
                                                application: '`A`',
                                                tenant: '`T`'
                                            }
                                        }
                                    ]
                                },
                                endpoints: {
                                    endpoint1: {
                                        enable: true,
                                        name: 'endpoint1',
                                        path: '/mgmt/ltm/pool'
                                    }
                                },
                                destinationIds: []
                            }
                        ]);
                    });
            });

            it('should fetch TMStats', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_Consumer = {
                    class: 'Telemetry_Consumer',
                    type: 'Splunk',
                    host: '192.0.2.1',
                    protocol: 'https',
                    port: 8088,
                    format: 'legacy',
                    passphrase: {
                        cipherText: '$M$Q7$xYs5xGCgf6Hlxsjd5AScwQ==',
                        class: 'Secret',
                        protected: 'SecureVault'
                    }
                };
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(TimerStub.update[0].args.dataOpts.noTMStats, false, 'should enable TMStats');
                    });
            });

            it('should clear existing interval when declaration has interval=0', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System.systemPoller.interval = 0;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 0);
                        assert.strictEqual(TimerStub.stopCount, 1);
                        assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': undefined });
                    });
            });

            it('should update non-scheduled, enabled, System Pollers, when setting interval', () => {
                const newDeclaration = testUtil.deepCopy(defaultDeclaration);
                newDeclaration.My_System.systemPoller.interval = 200;
                return configWorker.processDeclaration(testUtil.deepCopy(newDeclaration))
                    .then(() => {
                        assert.strictEqual(TimerStub.startCount, 0);
                        assert.strictEqual(TimerStub.update.length, 1);
                        assert.strictEqual(TimerStub.stopCount, 0);
                        assert.strictEqual(Object.keys(pollerTimers).length, 1);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 200);
                    });
            });

            it('should start new poller without restarting existing one when processing a new namespace declaration', () => {
                const newNamespace = {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System',
                        trace: true,
                        systemPoller: {
                            interval: 500
                        }
                    }
                };
                return configWorker.processNamespaceDeclaration(testUtil.deepCopy(newNamespace), 'NewNamespace')
                    .then(() => {
                        assert.strictEqual(Object.keys(pollerTimers).length, 2);
                        assert.strictEqual(pollerTimers['My_System::SystemPoller_1'].timer.interval, 180);
                        assert.strictEqual(pollerTimers['NewNamespace::My_System::SystemPoller_1'].timer.interval, 500);
                        assert.sameMembers(
                            tracers.registered().map(t => t.name),
                            [
                                'Telemetry_System_Poller.My_System::SystemPoller_1',
                                'Telemetry_System_Poller.NewNamespace::My_System::SystemPoller_1'
                            ]
                        );
                        assert.strictEqual(TimerStub.startCount, 1);
                        assert.strictEqual(TimerStub.update.length, 0);
                        assert.strictEqual(TimerStub.stopCount, 0);
                    });
            });
        });

        describe('monitor "on check" event', () => {
            const enabledPollerTimers = {
                poller1: {
                    timer: new MockSlidingTimer({}, {}, 111),
                    config: {
                        interval: 111
                    }
                },
                poller2: {
                    timer: new MockSlidingTimer({}, {}, 222),
                    config: {
                        interval: 222
                    }
                },
                // this is for poller with interval = 0
                // should basically be ignored
                poller3: undefined
            };

            const disabledPollerTimers = {
                poller1: {
                    timer: new MockSlidingTimer({}, {}, 111),
                    config: {
                        interval: 111
                    }
                },
                poller2: {
                    timer: new MockSlidingTimer({}, {}, 222),
                    config: {
                        interval: 222
                    }
                },
                // this is for poller with interval = 0
                // should basically be ignored
                poller3: undefined
            };

            it('should disable running pollers when thresholds not ok', () => {
                sinon.stub(systemPoller, 'getPollerTimers').returns(testUtil.deepCopy(enabledPollerTimers));
                return monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK)
                    .then(() => {
                        const pollerTimers = systemPoller.getPollerTimers();
                        assert.strictEqual(pollerTimers.poller1.timer.lastAction, 'STOPPED');
                        assert.strictEqual(pollerTimers.poller2.timer.lastAction, 'STOPPED');
                        assert.isFalse(systemPoller.isEnabled());
                        assert.deepStrictEqual(TimerStub.startCount, 0);
                        assert.deepStrictEqual(TimerStub.update, []);
                        assert.deepStrictEqual(TimerStub.stopCount, 2);
                    });
            });

            it('should enable disabled pollers when thresholds become ok', () => {
                sinon.stub(systemPoller, 'getPollerTimers').returns(testUtil.deepCopy(disabledPollerTimers));
                return monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK)
                    .then(() => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.OK))
                    .then(() => {
                        const pollerTimers = systemPoller.getPollerTimers();
                        assert.strictEqual(pollerTimers.poller1.timer.lastAction, 'UPDATED');
                        assert.strictEqual(pollerTimers.poller2.timer.lastAction, 'UPDATED');
                        assert.isTrue(systemPoller.isEnabled());
                        assert.deepStrictEqual(TimerStub.startCount, 0);
                        assert.deepStrictEqual(TimerStub.update.map(u =>
                            ({ args: u.args, interval: u.interval })), [
                            { args: { interval: 111 }, interval: 111 },
                            { args: { interval: 222 }, interval: 222 }
                        ]);
                    });
            });
        });
    });
});
