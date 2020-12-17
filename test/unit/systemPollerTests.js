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
const systemPoller = require('../../src/lib/systemPoller');
const SystemStats = require('../../src/lib/systemStats');
const util = require('../../src/lib/util');
const deviceUtil = require('../../src/lib/deviceUtil');

const systemPollerConfigTestsData = require('./data/systemPollerTestsData');
const testUtil = require('./shared/util');
const configUtil = require('../../src/lib/configUtil');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('System Poller', () => {
    let uuidCounter = 0;
    let decryptSecretStub;

    const validateAndNormalize = function (declaration) {
        return configWorker.validate(util.deepCopy(declaration))
            .then(validated => Promise.resolve(configUtil.normalizeConfig(validated)));
    };

    beforeEach(() => {
        sinon.stub(util, 'networkCheck').resolves();
        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });
        decryptSecretStub = sinon.stub(deviceUtil, 'decryptAllSecrets').callsFake(data => Promise.resolve(data));
    });

    afterEach(() => {
        uuidCounter = 0;
        sinon.restore();
    });

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
                    return Promise.resolve(util.deepCopy(returnCtx));
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
        let declaration;

        beforeEach(() => {
            sinon.stub(configWorker, 'getConfig').callsFake(() => validateAndNormalize(declaration)
                .then(normalized => Promise.resolve({ normalized })));
        });
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.getPollersConfig.forEach(testConf =>
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                declaration = testConf.declaration;
                return systemPoller.getPollersConfig(testConf.sysOrPollerName, testConf.funcOptions)
                    .then((pollersConfig) => {
                        pollersConfig = pollersConfig.map(p => ({ name: p.traceName }));
                        assert.deepStrictEqual(pollersConfig, testConf.expectedConfig);
                        assert.isTrue(decryptSecretStub.called);
                    })
                    .catch((error) => {
                        if (testConf.errorRegExp) {
                            return assert.match(error, testConf.errorRegExp, 'should match expected error message');
                        }
                        return Promise.reject(error);
                    });
            }));
    });

    describe('.findSystemOrPollerConfigs', () => {
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.findSystemOrPollerConfigs.forEach(testConf =>
            testUtil.getCallableIt(testConf)(testConf.name, () => validateAndNormalize(testConf.rawConfig)
                .then((normalizedConfig) => {
                    let actual;
                    try {
                        actual = systemPoller.findSystemOrPollerConfigs(
                            normalizedConfig, testConf.sysOrPollerName, testConf.pollerName, testConf.namespaceName
                        );
                    } catch (err) {
                        actual = err.message;
                    }

                    assert.deepStrictEqual(actual, testConf.expected);
                })));
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
                .then(() => assert.isFalse(decryptSecretStub.called));
        });
        it('should decrypt secrets when decryptSecrets=true', () => {
            const pollerConfigs = [
                {
                    name: 'my_poller'
                },
                {
                    name: 'my_other_poller'
                }
            ];
            return systemPoller.fetchPollersData(pollerConfigs, true)
                .then(() => assert.isTrue(decryptSecretStub.called));
        });

        it('should NOT decrypt secrets when decryptSecrets=false', () => {
            const pollerConfigs = [
                {
                    name: 'poller_alone'
                }
            ];
            return systemPoller.fetchPollersData(pollerConfigs, false)
                .then(() => assert.isFalse(decryptSecretStub.called));
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
        let activeTracersStub;
        let allTracersStub;
        let pollerTimers;
        let utilStub;

        beforeEach(() => {
            activeTracersStub = [];
            allTracersStub = [];
            pollerTimers = {};
            utilStub = { start: [], stop: [], update: [] };

            sinon.stub(util, 'start').callsFake((func, args, interval) => {
                utilStub.start.push({ args, interval });
                return interval;
            });
            sinon.stub(util, 'update').callsFake((id, func, args, interval) => {
                utilStub.update.push({ args, interval });
                return interval;
            });
            sinon.stub(util, 'stop').callsFake((arg) => {
                utilStub.stop.push({ arg });
            });
            sinon.stub(util.tracer, 'createFromConfig').callsFake((className, objName, config) => {
                allTracersStub.push(objName);
                if (config.trace) {
                    activeTracersStub.push(objName);
                }
                return null;
            });
            sinon.stub(systemPoller, 'getPollerTimers').returns(pollerTimers);

            return validateAndNormalize(defaultDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.strictEqual(pollerTimers['My_System::SystemPoller_1'], 180);
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 1);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 0);

                    utilStub = { start: [], stop: [], update: [] };
                    allTracersStub = [];
                    activeTracersStub = [];
                })
                .then(() => {
                    uuidCounter = 0;
                });
        });

        it('should stop existing poller(s) when removed from config', () => configWorker.emitAsync('change', { components: [], mappings: {} })
            .then(() => {
                assert.deepStrictEqual(pollerTimers, {});
                assert.strictEqual(allTracersStub.length, 0);
                assert.strictEqual(activeTracersStub.length, 0);
                assert.strictEqual(utilStub.start.length, 0);
                assert.strictEqual(utilStub.update.length, 0);
                assert.strictEqual(utilStub.stop.length, 1);
            }));

        it('should update existing poller(s)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System.systemPoller.interval = 500;
            newDeclaration.My_System.systemPoller.trace = true;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 500 });
                    assert.deepStrictEqual(utilStub.update[0].args, {
                        name: 'SystemPoller_1',
                        traceName: 'My_System::SystemPoller_1',
                        id: 'uuid2',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 500,
                        trace: true,
                        tracer: null,
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
                    });
                });
        });

        it('should ignore disabled pollers (existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System.enable = false;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, {});
                    assert.strictEqual(allTracersStub.length, 0);
                    assert.strictEqual(activeTracersStub.length, 0);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 1);
                });
        });

        it('should ignore disabled pollers (non-existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            newDeclaration.My_System_New.enable = false;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 180 });
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                });
        });

        it('should stop poller removed from System (existing poller with same system)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            delete newDeclaration.My_System.systemPoller;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, {});
                    assert.strictEqual(allTracersStub.length, 0);
                    assert.strictEqual(activeTracersStub.length, 0);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 1);
                });
        });

        it('should ignore System without poller (non-existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            delete newDeclaration.My_System_New.systemPoller;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 180 });
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                });
        });

        it('should start new poller (non-existing poller, inline declaration)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            newDeclaration.My_System_New.trace = false;
            newDeclaration.My_System_New.systemPoller.interval = 500;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, {
                        'My_System::SystemPoller_1': 180,
                        'My_System_New::SystemPoller_2': 500
                    });
                    assert.strictEqual(allTracersStub.length, 2);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 1);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
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
            // components:
            // declared ones go first
            // - My_System: uuid1
            // - My_System_New: uuid2
            // - My_Poller: uuid3
            // nested and auto-generated ones:
            // - My_System::System_Poller1: uuid4
            // - My_System::System_Poller2: uuid5
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.deepStrictEqual(pollerTimers, {
                        'My_System::SystemPoller_1': 180,
                        'My_System_New::SystemPoller_2': 10,
                        'My_System_New::My_Poller': 500
                    });
                    assert.strictEqual(allTracersStub.length, 3);
                    assert.strictEqual(activeTracersStub.length, 3);
                    assert.strictEqual(utilStub.start.length, 2);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepStrictEqual(utilStub.start[0].args, {
                        id: 'uuid3',
                        name: 'My_Poller',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        traceName: 'My_System_New::My_Poller',
                        enable: true,
                        interval: 500,
                        trace: true,
                        tracer: null,
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
                    });
                    assert.deepStrictEqual(utilStub.start[1].args, {
                        name: 'SystemPoller_2',
                        id: 'uuid5',
                        namespace: 'f5telemetry_default',
                        class: 'Telemetry_System_Poller',
                        enable: true,
                        interval: 10,
                        trace: true,
                        tracer: null,
                        traceName: 'My_System_New::SystemPoller_2',
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
                    });
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
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.strictEqual(utilStub.update[0].args.dataOpts.noTMStats, false, 'should enable TMStats');
                });
        });

        it('should clear existing interval when declaration has interval=0', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System.systemPoller.interval = 0;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 1);
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': undefined });
                });
        });

        it('should update non-scheduled, enabled, System Pollers, when setting interval', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System.systemPoller.interval = 200;
            return validateAndNormalize(newDeclaration)
                .then(normalizedConfig => configWorker.emitAsync('change', normalizedConfig))
                .then(() => {
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 200 });
                });
        });

        it('should start new poller without restarting existing one when skipUpdate = true)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.NewNamespace = {
                class: 'Telemetry_Namespace',
                My_System: {
                    class: 'Telemetry_System',
                    trace: false,
                    systemPoller: {
                        interval: 500
                    }
                }
            };
            return validateAndNormalize(newDeclaration)
                .then((normalizedConfig) => {
                    const existingPollerIndex = normalizedConfig.components.findIndex(c => c.traceName === 'My_System::SystemPoller_1');
                    // simulate a namespace only declaration request
                    // existing config unchanged, id the same
                    normalizedConfig.components[existingPollerIndex].skipUpdate = true;

                    return configWorker.emitAsync('change', normalizedConfig)
                        .then(() => {
                            assert.deepStrictEqual(pollerTimers, {
                                'My_System::SystemPoller_1': 180,
                                'NewNamespace::My_System::SystemPoller_1': 500
                            });

                            assert.strictEqual(utilStub.start.length, 1);
                            assert.strictEqual(utilStub.update.length, 0);
                            assert.strictEqual(utilStub.stop.length, 0);
                        });
                });
        });
    });
});
