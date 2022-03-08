/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const dataPipeline = require('../../src/lib/dataPipeline');
const deviceUtil = require('../../src/lib/utils/device');
const dummies = require('./shared/dummies');
const ihealth = require('../../src/lib/ihealth');
const IHealthPoller = require('../../src/lib/ihealthPoller');
const ihealthUtil = require('../../src/lib/utils/ihealth');
const logger = require('../../src/lib/logger');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const testAssert = require('./shared/assert');
const testUtil = require('./shared/util');
const tracer = require('../../src/lib/utils/tracer');
const tracerMgr = require('../../src/lib/tracerManager');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('iHealth', () => {
    let clockStub;
    let coreStub;
    let declaration;
    let ihealthStub;
    let preExistingConfigIDs;
    let processedReports;

    const disabledAllPollers = () => Promise.all(IHealthPoller.getAll({ includeDemo: true })
        .map((poller) => IHealthPoller.disable(poller, true)))
        .then((retObjs) => Promise.all(retObjs.map((obj) => obj.stopPromise)));

    const expectedConfiguration = (includeDisabled) => {
        const components = [
            dummies.configuration.ihealthPoller.full.encrypted({
                name: 'iHealthPoller_1',
                id: 'f5telemetry_default::System::iHealthPoller_1',
                namespace: 'f5telemetry_default',
                systemName: 'System',
                traceName: 'f5telemetry_default::System::iHealthPoller_1',
                iHealth: {
                    name: 'iHealthPoller_1',
                    credentials: { username: 'test_user_2', passphrase: { cipherText: '$M$test_passphrase_2' } },
                    proxy: { connection: { host: '192.168.100.1' }, credentials: { username: 'test_user_3', passphrase: { cipherText: '$M$test_passphrase_3' } } }
                },
                system: { host: '192.168.0.1', credentials: { username: 'test_user_1', passphrase: { cipherText: '$M$test_passphrase_1' } } }
            }),
            dummies.configuration.ihealthPoller.full.encrypted({
                name: 'iHealthPoller_1',
                id: 'Namespace::System::iHealthPoller_1',
                namespace: 'Namespace',
                systemName: 'System',
                traceName: 'Namespace::System::iHealthPoller_1',
                iHealth: {
                    name: 'iHealthPoller_1',
                    credentials: { username: 'test_user_8', passphrase: { cipherText: '$M$test_passphrase_8' } },
                    proxy: { connection: { host: '192.168.100.3' }, credentials: { username: 'test_user_9', passphrase: { cipherText: '$M$test_passphrase_9' } } }
                },
                system: { host: '192.168.0.3', credentials: { username: 'test_user_7', passphrase: { cipherText: '$M$test_passphrase_7' } } }
            })
        ];
        if (includeDisabled) {
            components.push(dummies.configuration.ihealthPoller.full.encrypted({
                name: 'iHealthPoller_1',
                id: 'Disabled_System::iHealthPoller_1',
                namespace: 'f5telemetry_default',
                systemName: 'Disabled_System',
                traceName: 'Disabled_System::iHealthPoller_1',
                iHealth: {
                    name: 'iHealthPoller_1',
                    credentials: { username: 'test_user_5', passphrase: { cipherText: '$M$test_passphrase_5' } },
                    proxy: { connection: { host: '192.168.100.2' }, credentials: { username: 'test_user_6', passphrase: { cipherText: '$M$test_passphrase_6' } } }
                },
                system: { host: '192.168.0.2', credentials: { username: 'test_user_4', passphrase: { cipherText: '$M$test_passphrase_4' } } }
            }));
            components.push(dummies.configuration.ihealthPoller.full.encrypted({
                name: 'iHealthPoller_1',
                id: 'Namespace::Disabled_System::iHealthPoller_1',
                namespace: 'Namespace',
                systemName: 'Disabled_System',
                traceName: 'Namespace::Disabled_System::iHealthPoller_1',
                iHealth: {
                    name: 'iHealthPoller_1',
                    credentials: { username: 'test_user_11', passphrase: { cipherText: '$M$test_passphrase_11' } },
                    proxy: { connection: { host: '192.168.100.4' }, credentials: { username: 'test_user_12', passphrase: { cipherText: '$M$test_passphrase_12' } } }
                },
                system: { host: '192.168.0.4', credentials: { username: 'test_user_10', passphrase: { cipherText: '$M$test_passphrase_10' } } }
            }));
        }
        return components;
    };

    const registeredTracerPaths = () => {
        const paths = tracerMgr.registered().map((t) => t.path);
        paths.sort();
        return paths;
    };
    const toTracerPaths = (ids) => {
        const tracerPaths = ids.map((id) => `Telemetry_iHealth_Poller.${id}`);
        tracerPaths.sort();
        return tracerPaths;
    };

    const verifyPollersConfig = (pollers, expectedConfigs) => Promise.all(pollers.map((p) => p.getConfig()))
        .then((configs) => assert.sameDeepMembers(configs, expectedConfigs, 'should match expected configuration'));

    const waitForReport = (cb) => {
        processedReports = [];
        sinon.stub(dataPipeline, 'process').callsFake((dataCtx, opts) => {
            processedReports.push({ dataCtx, opts });
            cb(dataCtx, opts);
            return Promise.resolve();
        });
        clockStub.clockForward(30 * 60 * 1000, { promisify: true }); // 30 mins.
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            logger,
            persistentStorage,
            teemReporter,
            tracer,
            utilMisc
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;
        ihealthStub = stubs.iHealthPoller({
            ihealthUtil
        });
        declaration = dummies.declaration.base.decrypted();
        declaration.System = dummies.declaration.system.full.decrypted({
            host: '192.168.0.1',
            username: 'test_user_1',
            passphrase: { cipherText: 'test_passphrase_1' }
        });
        declaration.System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
            username: 'test_user_2',
            passphrase: { cipherText: 'test_passphrase_2' },
            proxy: {
                host: '192.168.100.1',
                username: 'test_user_3',
                passphrase: { cipherText: 'test_passphrase_3' }
            }
        });
        declaration.Disabled_System = dummies.declaration.system.full.decrypted({
            enable: false,
            host: '192.168.0.2',
            username: 'test_user_4',
            passphrase: { cipherText: 'test_passphrase_4' }
        });
        declaration.Disabled_System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
            username: 'test_user_5',
            passphrase: { cipherText: 'test_passphrase_5' },
            proxy: {
                host: '192.168.100.2',
                username: 'test_user_6',
                passphrase: { cipherText: 'test_passphrase_6' }
            }
        });
        declaration.DefaultConsumer = dummies.declaration.consumer.default.decrypted();
        declaration.Namespace = dummies.declaration.namespace.base.decrypted();
        declaration.Namespace.System = dummies.declaration.system.full.decrypted({
            host: '192.168.0.3',
            username: 'test_user_7',
            passphrase: { cipherText: 'test_passphrase_7' }
        });
        declaration.Namespace.System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
            username: 'test_user_8',
            passphrase: { cipherText: 'test_passphrase_8' },
            proxy: {
                host: '192.168.100.3',
                username: 'test_user_9',
                passphrase: { cipherText: 'test_passphrase_9' }
            }
        });
        declaration.Namespace.Disabled_System = dummies.declaration.system.full.decrypted({
            enable: false,
            host: '192.168.0.4',
            username: 'test_user_10',
            passphrase: { cipherText: 'test_passphrase_10' }
        });
        declaration.Namespace.Disabled_System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
            username: 'test_user_11',
            passphrase: { cipherText: 'test_passphrase_11' },
            proxy: {
                host: '192.168.100.4',
                username: 'test_user_12',
                passphrase: { cipherText: 'test_passphrase_12' }
            }
        });
        declaration.Namespace.DefaultConsumer = dummies.declaration.consumer.default.decrypted();
        preExistingConfigIDs = [
            'Namespace::System::iHealthPoller_1',
            'f5telemetry_default::System::iHealthPoller_1'
        ];
        // slow down polling process
        ihealthStub.ihealthUtil.QkviewManager.process.rejects(new Error('expected error'));
        return configWorker.processDeclaration({ class: 'Telemetry' })
            .then(() => {
                assert.isEmpty(IHealthPoller.getAll({ includeDemo: true }), 'should have no running pollers');
            });
    });

    afterEach(() => disabledAllPollers()
        .then(() => configWorker.processDeclaration({ class: 'Telemetry' }))
        .then(() => {
            sinon.restore();
            // related to blocks like .catch(err => logError(err))
            assert.isEmpty(coreStub.logger.messages.error, 'should have no errors logged');
        }));

    describe('config "on change" event', () => {
        beforeEach(() => {
            // slow down polling process
            clockStub = stubs.clock();
            return configWorker.processDeclaration(testUtil.deepCopy(declaration))
                .then(() => {
                    assert.sameMembers(
                        IHealthPoller.getAll({ includeDemo: true }).map((p) => p.id),
                        preExistingConfigIDs,
                        'should create instances with expected IDs'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    return verifyPollersConfig(IHealthPoller.getAll({ includeDemo: true }), expectedConfiguration());
                });
        });

        it('should remove orphaned data', () => {
            let restStorageData = testUtil.deepCopy(coreStub.persistentStorage.savedData);
            restStorageData.ihealth.nonExistingInstance = { version: 2.0, test: true };
            coreStub.persistentStorage.loadData = restStorageData;
            return persistentStorage.persistentStorage.load()
                .then(() => persistentStorage.persistentStorage.get('ihealth.nonExistingInstance.test'))
                .then((value) => {
                    assert.strictEqual(value, true, 'should load data');
                    return configWorker.processDeclaration(testUtil.deepCopy(declaration));
                })
                .then(() => {
                    restStorageData = coreStub.persistentStorage.savedData;
                    assert.deepStrictEqual(restStorageData.ihealth.nonExistingInstance, undefined, 'should remove data for non-existing instance');
                    assert.notDeepEqual(restStorageData.ihealth['f5telemetry_default::System::iHealthPoller_1'], undefined, 'should keep data for existing instance');
                });
        });

        it('should update existing poller(s)', () => {
            const instancesBefore = IHealthPoller.getAll({ includeDemo: true });
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => verifyPollersConfig(
                    IHealthPoller.getAll({ includeDemo: true }),
                    expectedConfiguration().concat(expectedConfiguration()) // same configs for 'demo'
                ))
                .then(() => new Promise((resolve) => {
                    const expectedReportsNo = IHealthPoller.getAll({ includeDemo: true }).length;
                    const srcIDs = {};
                    ihealthStub.ihealthUtil.QkviewManager.process.resolves('qkviewFile');
                    waitForReport((dataCtx, opts) => {
                        srcIDs[`${dataCtx.sourceId}${opts.noConsumers ? ' (DEMO)' : ''}`] = '';
                        if (Object.keys(srcIDs).length >= expectedReportsNo) {
                            dataPipeline.process.restore();
                            resolve();
                        }
                    });
                }))
                // should remove all demo instances and update existing instances
                .then(() => configWorker.processDeclaration(testUtil.deepCopy(declaration)))
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.sameDeepMembers(
                        newInstances.map((p) => p.id),
                        preExistingConfigIDs,
                        'should create instances with expected IDs'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    instancesBefore.forEach((inst) => {
                        assert.notDeepInclude(newInstances, inst, `should create new instance for ${inst.id}`);
                    });
                    assert.sameDeepMembers(
                        processedReports.map((report) => {
                            assert.deepStrictEqual(report.dataCtx.data.system.qkviewNumber, '0000000', 'should have report data');
                            return {
                                id: report.dataCtx.sourceId,
                                demo: report.opts.noConsumers,
                                consumers: report.dataCtx.destinationIds
                            };
                        }),
                        [
                            { id: 'f5telemetry_default::System::iHealthPoller_1', demo: true, consumers: ['f5telemetry_default::DefaultConsumer'] },
                            { id: 'f5telemetry_default::System::iHealthPoller_1', demo: false, consumers: ['f5telemetry_default::DefaultConsumer'] },
                            { id: 'Namespace::System::iHealthPoller_1', demo: true, consumers: ['Namespace::DefaultConsumer'] },
                            { id: 'Namespace::System::iHealthPoller_1', demo: false, consumers: ['Namespace::DefaultConsumer'] }
                        ],
                        'should collect report from running pollers'
                    );
                    return verifyPollersConfig(newInstances, expectedConfiguration());
                });
        });

        it('should start new poller without restarting existing one when processing a new namespace declaration', () => {
            let instancesBefore;
            let configIDsBeforeUpdate;
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => verifyPollersConfig(
                    IHealthPoller.getAll({ includeDemo: true }),
                    expectedConfiguration().concat(expectedConfiguration())
                ))
                .then(() => {
                    instancesBefore = IHealthPoller.getAll({ includeDemo: true });
                    // demo ID for default namespace only
                    configIDsBeforeUpdate = preExistingConfigIDs.concat(['f5telemetry_default::System::iHealthPoller_1']);
                    const namespaceDeclaration = testUtil.deepCopy(declaration.Namespace);
                    // should remove demo instance from namespace
                    return configWorker.processNamespaceDeclaration(namespaceDeclaration, 'Namespace');
                })
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.sameDeepMembers(
                        newInstances.map((p) => p.id),
                        configIDsBeforeUpdate,
                        'should create instances with expected IDs'
                    );
                    // using pre-existing list of IDs because 'demo' using same Tracer instance
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    // ignoring Namespace' 'demo' instance
                    instancesBefore = instancesBefore.filter((inst) => configIDsBeforeUpdate.indexOf(inst.id) !== -1);
                    instancesBefore.forEach((inst) => {
                        if (inst.id.startsWith('Namespace')) {
                            assert.notDeepInclude(newInstances, inst, 'should create new instance on update');
                        } else {
                            assert.deepInclude(newInstances, inst, 'should not create new instance when only namespace was updated');
                        }
                    });
                })
                .then(() => new Promise((resolve) => {
                    const expectedReportsNo = IHealthPoller.getAll({ includeDemo: true }).length;
                    const srcIDs = {};
                    ihealthStub.ihealthUtil.QkviewManager.process.resolves('qkviewFile');
                    waitForReport((dataCtx, opts) => {
                        srcIDs[`${dataCtx.sourceId}${opts.noConsumers ? ' (DEMO)' : ''}`] = '';
                        if (Object.keys(srcIDs).length >= expectedReportsNo) {
                            dataPipeline.process.restore();
                            resolve();
                        }
                    });
                }))
                .then(() => {
                    assert.sameDeepMembers(
                        processedReports.map((report) => {
                            assert.deepStrictEqual(report.dataCtx.data.system.qkviewNumber, '0000000', 'should have report data');
                            return {
                                id: report.dataCtx.sourceId,
                                demo: report.opts.noConsumers,
                                consumers: report.dataCtx.destinationIds
                            };
                        }),
                        [
                            { id: 'f5telemetry_default::System::iHealthPoller_1', demo: true, consumers: ['f5telemetry_default::DefaultConsumer'] },
                            { id: 'f5telemetry_default::System::iHealthPoller_1', demo: false, consumers: ['f5telemetry_default::DefaultConsumer'] },
                            { id: 'Namespace::System::iHealthPoller_1', demo: false, consumers: ['Namespace::DefaultConsumer'] }
                        ],
                        'should collect report from running pollers'
                    );
                    return disabledAllPollers();
                });
        });

        it('should ignore disabled pollers (existing poller)', () => {
            const instancesBefore = IHealthPoller.getAll({ includeDemo: true });
            const newDeclaration = testUtil.deepCopy(declaration);
            newDeclaration.System.enable = false;
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => configWorker.processDeclaration(newDeclaration))
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.deepStrictEqual(
                        newInstances.map((p) => p.id),
                        ['Namespace::System::iHealthPoller_1'],
                        'should disable disabled only'
                    );
                    assert.notDeepInclude(
                        instancesBefore,
                        newInstances[0],
                        'should not create new instance when only namespace was updated'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(['Namespace::System::iHealthPoller_1']),
                        'should create tracers with expected IDs'
                    );
                });
        });

        it('should stop existing poller(s) when removed from config', () => {
            const instancesBefore = IHealthPoller.getAll({ includeDemo: true });
            const newDeclaration = testUtil.deepCopy(declaration);
            delete newDeclaration.System;
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => configWorker.processDeclaration(newDeclaration))
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.notDeepInclude(
                        instancesBefore,
                        newInstances[0],
                        'should not create new instance when only namespace was updated'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(['Namespace::System::iHealthPoller_1']),
                        'should create tracers with expected IDs'
                    );
                });
        });

        it('should ignore disabled pollers (non-existing poller)', () => {
            const instancesBefore = IHealthPoller.getAll({ includeDemo: true });
            const newDeclaration = testUtil.deepCopy(declaration);
            newDeclaration.New_System = testUtil.deepCopy(newDeclaration.System);
            newDeclaration.New_System.enable = false;
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => configWorker.processDeclaration(newDeclaration))
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.sameDeepMembers(
                        newInstances.map((p) => p.id),
                        preExistingConfigIDs,
                        'should create instances with expected IDs'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    instancesBefore.forEach((inst) => {
                        assert.notDeepInclude(newInstances, inst, `should create new instance for ${inst.id}`);
                    });
                });
        });

        it('should stop poller removed from System (existing poller with same system)', () => {
            const instancesBefore = IHealthPoller.getAll({ includeDemo: true });
            const newDeclaration = testUtil.deepCopy(declaration);
            delete newDeclaration.System.iHealthPoller;
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => configWorker.processDeclaration(newDeclaration))
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.notDeepInclude(
                        instancesBefore,
                        newInstances[0],
                        'should not create new instance when only namespace was updated'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(['Namespace::System::iHealthPoller_1']),
                        'should create tracers with expected IDs'
                    );
                });
        });

        it('should ignore System without poller (non-existing poller)', () => {
            const instancesBefore = IHealthPoller.getAll({ includeDemo: true });
            const newDeclaration = testUtil.deepCopy(declaration);
            newDeclaration.New_System = testUtil.deepCopy(newDeclaration.System);
            delete newDeclaration.New_System.iHealthPoller;
            // starting 'demo' pollers that should be removed on update
            return Promise.all([
                ihealth.startPoller('System'),
                ihealth.startPoller('System', 'Namespace')
            ])
                .then(() => configWorker.processDeclaration(testUtil.deepCopy(newDeclaration)))
                .then(() => {
                    const newInstances = IHealthPoller.getAll({ includeDemo: true });
                    assert.sameDeepMembers(
                        newInstances.map((p) => p.id),
                        preExistingConfigIDs,
                        'should create instances with expected IDs'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    instancesBefore.forEach((inst) => {
                        assert.notDeepInclude(newInstances, inst, `should create new instance for ${inst.id}`);
                    });
                });
        });

        it('should not fail when unable to start poller', () => {
            sinon.stub(IHealthPoller.prototype, 'start').rejects(new Error('expected error'));
            return configWorker.processDeclaration(testUtil.deepCopy(declaration))
                .then(() => {
                    assert.sameMembers(
                        IHealthPoller.getAll({ includeDemo: true }).map((p) => p.id),
                        preExistingConfigIDs,
                        'should create instances with expected IDs'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    testAssert.includeMatch(coreStub.logger.messages.error, /expected error/, 'should log error');
                    coreStub.logger.messages.error = [];
                });
        });
    });

    describe('.startPoller()', () => {
        beforeEach(() => {
            // slow down polling process
            stubs.clock();
            declaration.System.enable = false;
            declaration.Namespace.System.enable = false;
            return configWorker.processDeclaration(testUtil.deepCopy(declaration))
                .then(() => {
                    assert.isEmpty(IHealthPoller.getAll({ includeDemo: true }).map((p) => p.id), 'should not create instances');
                    assert.isEmpty(registeredTracerPaths(), 'should not create tracers');
                });
        });

        it('should start poller', () => ihealth.startPoller('System')
            .then((response) => {
                assert.ownInclude(response, {
                    demoMode: true,
                    disabled: false,
                    id: 'f5telemetry_default::System::iHealthPoller_1',
                    name: 'f5telemetry_default::System::iHealthPoller_1 (DEMO)',
                    isRunning: false,
                    message: 'iHealth Poller for System "System" started'
                });
                assert.sameMembers(
                    IHealthPoller.getAll({ demoOnly: true }).map((p) => p.id),
                    ['f5telemetry_default::System::iHealthPoller_1'],
                    'should create instance with expected ID'
                );
                return ihealth.startPoller('System');
            })
            .then((response) => {
                assert.ownInclude(response, {
                    demoMode: true,
                    disabled: false,
                    id: 'f5telemetry_default::System::iHealthPoller_1',
                    name: 'f5telemetry_default::System::iHealthPoller_1 (DEMO)',
                    isRunning: true,
                    message: 'iHealth Poller for System "System" started already'
                });
            }));

        it('should start poller declared in namespace', () => ihealth.startPoller('System', 'Namespace')
            .then((response) => {
                assert.ownInclude(response, {
                    demoMode: true,
                    disabled: false,
                    id: 'Namespace::System::iHealthPoller_1',
                    name: 'Namespace::System::iHealthPoller_1 (DEMO)',
                    isRunning: false,
                    message: 'iHealth Poller for System "System" (namespace "Namespace") started'
                });
                assert.sameMembers(
                    IHealthPoller.getAll({ demoOnly: true }).map((p) => p.id),
                    ['Namespace::System::iHealthPoller_1'],
                    'should create instance with expected ID'
                );
                return ihealth.startPoller('System', 'Namespace');
            })
            .then((response) => {
                assert.ownInclude(response, {
                    demoMode: true,
                    disabled: false,
                    id: 'Namespace::System::iHealthPoller_1',
                    name: 'Namespace::System::iHealthPoller_1 (DEMO)',
                    isRunning: true,
                    message: 'iHealth Poller for System "System" (namespace "Namespace") started already'
                });
            }));

        it('should start disabled pollers', () => Promise.all([
            ihealth.startPoller('Disabled_System'),
            ihealth.startPoller('Disabled_System', 'Namespace')
        ])
            .then((responses) => {
                assert.ownInclude(responses[0], {
                    demoMode: true,
                    disabled: false,
                    id: 'f5telemetry_default::Disabled_System::iHealthPoller_1',
                    name: 'f5telemetry_default::Disabled_System::iHealthPoller_1 (DEMO)',
                    isRunning: false,
                    message: 'iHealth Poller for System "Disabled_System" started'
                });
                assert.ownInclude(responses[1], {
                    demoMode: true,
                    disabled: false,
                    id: 'Namespace::Disabled_System::iHealthPoller_1',
                    name: 'Namespace::Disabled_System::iHealthPoller_1 (DEMO)',
                    isRunning: false,
                    message: 'iHealth Poller for System "Disabled_System" (namespace "Namespace") started'
                });
                assert.sameMembers(
                    IHealthPoller.getAll({ demoOnly: true }).map((p) => p.id),
                    [
                        'f5telemetry_default::Disabled_System::iHealthPoller_1',
                        'Namespace::Disabled_System::iHealthPoller_1'
                    ],
                    'should create instance with expected ID'
                );
                return Promise.all([
                    ihealth.startPoller('Disabled_System'),
                    ihealth.startPoller('Disabled_System', 'Namespace')
                ]);
            })
            .then((responses) => {
                assert.ownInclude(responses[0], {
                    demoMode: true,
                    disabled: false,
                    id: 'f5telemetry_default::Disabled_System::iHealthPoller_1',
                    name: 'f5telemetry_default::Disabled_System::iHealthPoller_1 (DEMO)',
                    isRunning: true,
                    message: 'iHealth Poller for System "Disabled_System" started already'
                });
                assert.ownInclude(responses[1], {
                    demoMode: true,
                    disabled: false,
                    id: 'Namespace::Disabled_System::iHealthPoller_1',
                    name: 'Namespace::Disabled_System::iHealthPoller_1 (DEMO)',
                    isRunning: true,
                    message: 'iHealth Poller for System "Disabled_System" (namespace "Namespace") started already'
                });
            }));

        it('should reject on attempt to start non-existing poller', () => assert.isRejected(
            ihealth.startPoller('NonExistingPoller'),
            /System or iHealth Poller declaration not found/
        ));

        it('should reject on attempt to start non-existing poller in non-existing namespace', () => assert.isRejected(
            ihealth.startPoller('NonExistingPoller', 'NonExistingNamespace'),
            /System or iHealth Poller declaration not found/
        ));

        it('should reject on attempt to start non-existing poller in existing namespace', () => assert.isRejected(
            ihealth.startPoller('NonExistingPoller', 'Namespace'),
            /System or iHealth Poller declaration not found/
        ));

        it('should not fail when unable to start poller', () => {
            sinon.stub(IHealthPoller.prototype, 'start').rejects(new Error('expected error'));
            return ihealth.startPoller('System')
                .then((response) => {
                    assert.ownInclude(response, {
                        isRunning: false
                    });
                    assert.match(response.message, /Unable to start iHealth Poller for System "System".*expected error/);
                });
        });
    });

    describe('.getCurrentState()', () => {
        beforeEach(() => {
            // slow down polling process
            stubs.clock();
            return configWorker.processDeclaration(testUtil.deepCopy(declaration))
                .then(() => {
                    assert.sameMembers(
                        IHealthPoller.getAll({ includeDemo: true }).map((p) => p.id),
                        preExistingConfigIDs,
                        'should create instances with expected IDs'
                    );
                    testAssert.sameOrderedMatches(
                        registeredTracerPaths(),
                        toTracerPaths(preExistingConfigIDs),
                        'should create tracers with expected IDs'
                    );
                    return verifyPollersConfig(IHealthPoller.getAll({ includeDemo: true }), expectedConfiguration());
                });
        });

        it('should return empty array when no pollers', () => configWorker.processDeclaration({ class: 'Telemetry' })
            .then(() => assert.isEmpty(ihealth.getCurrentState('NonExistingNamespace'), 'should return empty list')));

        it('should return empty array for non-existing namespace', () => {
            assert.isEmpty(ihealth.getCurrentState('NonExistingNamespace'), 'should return empty list');
        });

        it('should return empty array for empty namespace', () => configWorker.processNamespaceDeclaration({ class: 'Telemetry_Namespace' }, 'Namespace')
            .then(() => assert.isEmpty(ihealth.getCurrentState('Namespace'), 'should return empty list')));

        it('should return statuses for all pollers', () => {
            assert.sameDeepMembers(
                ihealth.getCurrentState().map((s) => s.name),
                [
                    'f5telemetry_default::System::iHealthPoller_1',
                    'Namespace::System::iHealthPoller_1'
                ],
                'should return all registered pollers'
            );
        });

        it('should return statuses for pollers in namespace', () => {
            assert.sameDeepMembers(
                ihealth.getCurrentState('Namespace').map((s) => s.name),
                [
                    'Namespace::System::iHealthPoller_1'
                ],
                'should return all registered pollers'
            );
        });

        it('should return statuses for demo pollers', () => Promise.all([
            ihealth.startPoller('System'),
            ihealth.startPoller('System', 'Namespace')
        ])
            .then(() => {
                assert.sameDeepMembers(
                    ihealth.getCurrentState().map((s) => s.name),
                    [
                        'f5telemetry_default::System::iHealthPoller_1 (DEMO)',
                        'Namespace::System::iHealthPoller_1 (DEMO)',
                        'f5telemetry_default::System::iHealthPoller_1',
                        'Namespace::System::iHealthPoller_1'
                    ],
                    'should return all registered pollers'
                );
            }));
    });
});
