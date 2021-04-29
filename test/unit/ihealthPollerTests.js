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
const getByKey = require('lodash/get');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const deviceUtil = require('../../src/lib/utils/device');
const dummies = require('./shared/dummies');
const IHealthPoller = require('../../src/lib/ihealthPoller');
const ihealthUtil = require('../../src/lib/utils/ihealth');
const logger = require('../../src/lib/logger');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const testUtil = require('./shared/util');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('IHealthPoller', () => {
    let coreStub;
    let ihealthStub;

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            logger,
            persistentStorage,
            teemReporter,
            utilMisc
        });
        ihealthStub = stubs.iHealthPoller({
            ihealthUtil
        });

        return Promise.all(IHealthPoller.getAll({ includeDemo: true })
            .map(poller => IHealthPoller.disable(poller, true)))
            .then(retObjs => Promise.all(retObjs.map(obj => obj.stopPromise)))
            .then(() => {
                assert.deepStrictEqual(IHealthPoller.getAll({ includeDemo: true }), []);
                return persistentStorage.persistentStorage.load();
            });
    });

    afterEach(() => Promise.all(IHealthPoller.getAll({ includeDemo: true })
        .map(poller => IHealthPoller.disable(poller, true)))
        .then(retObjs => Promise.all(retObjs.map(obj => obj.stopPromise)))
        .then(() => {
            assert.deepStrictEqual(IHealthPoller.getAll({ includeDemo: true }), [], 'should have no running iHealth Pollers');
            sinon.restore();
        }));

    describe('class methods', () => {
        describe('.cleanupOrphanedStorageData()', () => {
            it('should remove orphaned data', () => {
                const poller1 = IHealthPoller.create('id1');
                const poller2 = IHealthPoller.create('id2');
                return persistentStorage.persistentStorage.set('ihealth', { id1: true, id2: true })
                    .then(() => persistentStorage.persistentStorage.get('ihealth'))
                    .then((ihealthStorageData) => {
                        assert.includeMembers(
                            Object.keys(ihealthStorageData),
                            ['id1', 'id2'],
                            'should save data for both pollers'
                        );
                        IHealthPoller.unregister(poller2);
                        return IHealthPoller.cleanupOrphanedStorageData();
                    })
                    .then(() => persistentStorage.persistentStorage.get('ihealth'))
                    .then((ihealthStorageData) => {
                        assert.deepStrictEqual(
                            Object.keys(ihealthStorageData),
                            ['id1'],
                            'should remove data for poller with id2'
                        );
                        IHealthPoller.unregister(poller1);
                    });
            });
        });

        describe('.create()', () => {
            it('should create and register instance', () => {
                const poller = IHealthPoller.create('poller1');
                assert.instanceOf(poller, IHealthPoller, 'should be instance of IHealthPoller');
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ includeDemo: true }).map(p => p.id),
                    ['poller1'],
                    'should register iHealth Poller'
                );
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ demoOnly: true }).map(p => p.id),
                    [],
                    'should have no demo instances'
                );
            });

            it('should create and register instance (demo instance)', () => {
                const poller = IHealthPoller.create('demoPoller1', { demo: true });
                assert.instanceOf(poller, IHealthPoller, 'should be instance of IHealthPoller');
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ includeDemo: true }).map(p => p.id),
                    ['demoPoller1'],
                    'should register demo iHealth Poller'
                );
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ includeDemo: false }).map(p => p.id),
                    [],
                    'should have no non-demo instances'
                );
            });

            it('should throw error when instance exists already', () => {
                IHealthPoller.create('poller1');
                assert.throws(
                    () => IHealthPoller.create('poller1'),
                    /created already/,
                    'should throw error on attempt to create instance with same ID'
                );
            });

            it('should throw error when instance exists already (demo instance)', () => {
                IHealthPoller.create('poller1', { demo: true });
                assert.throws(
                    () => IHealthPoller.create('poller1', { demo: true }),
                    /created already/,
                    'should throw error on attempt to create demo instance with same ID'
                );
            });

            it('should not throw error when creating demo instance with same ID', () => {
                IHealthPoller.create('poller1');
                assert.doesNotThrow(
                    () => IHealthPoller.create('poller1', { demo: true }),
                    'should not throw error on attempt to create demo instance with existing ID'
                );
            });
        });

        describe('.createDemo()', () => {
            it('should create and register instance', () => {
                const poller = IHealthPoller.createDemo('poller1');
                assert.instanceOf(poller, IHealthPoller, 'should be instance of IHealthPoller');
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ includeDemo: true }).map(p => p.id),
                    ['poller1'],
                    'should register iHealth Poller'
                );
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ demoOnly: true }).map(p => p.id),
                    ['poller1'],
                    'should register as demo instance'
                );
            });

            it('should throw error when instance exists already', () => {
                IHealthPoller.createDemo('poller1');
                assert.throws(
                    () => IHealthPoller.createDemo('poller1'),
                    /created already/,
                    'should throw error on attempt to create instance with same ID'
                );
            });

            it('should not throw error when creating demo instance with same ID', () => {
                IHealthPoller.createDemo('poller1');
                assert.doesNotThrow(
                    () => IHealthPoller.create('poller1'),
                    'should not throw error on attempt to create demo instance with existing ID'
                );
            });
        });

        describe('.disable()', () => {
            it('should disable not started instance', () => {
                const poller = IHealthPoller.create('id');
                return IHealthPoller.disable(poller)
                    .then((retObj) => {
                        assert.instanceOf(retObj.stopPromise, Promise, 'should be instance of Promise');
                        return retObj.stopPromise;
                    });
            });

            it('should disable started instance', () => {
                const poller = IHealthPoller.create('id');
                return poller.start()
                    .then(() => IHealthPoller.disable(poller))
                    .then((retObj) => {
                        assert.isEmpty(IHealthPoller.get('id'), 'should unregister instance once disabled it');
                        assert.instanceOf(retObj.stopPromise, Promise, 'should be instance of Promise');
                        return retObj.stopPromise;
                    });
            });

            it('should not fail on attempt to disable instance when disabling process started already', () => {
                const poller = IHealthPoller.create('id');
                return poller.start()
                    .then(() => Promise.all([IHealthPoller.disable(poller), IHealthPoller.disable(poller)]))
                    .then((retObj) => {
                        assert.isEmpty(IHealthPoller.get('id'), 'should unregister instance once disabled it');
                        assert.instanceOf(retObj[0].stopPromise, Promise, 'should be instance of Promise');
                        assert.instanceOf(retObj[1].stopPromise, Promise, 'should be instance of Promise');
                        return Promise.all([retObj[0].stopPromise, retObj[1].stopPromise]);
                    });
            });
        });

        describe('.get()', () => {
            it('should return null when instance with such ID doesn\'t exist', () => {
                assert.isEmpty(IHealthPoller.get('id'), 'should return no instances with such ID');
            });

            it('should return instance by ID', () => {
                const poller = IHealthPoller.create('id');
                assert.instanceOf(poller, IHealthPoller, 'should be instance of IHealthPoller');
                assert.lengthOf(IHealthPoller.get('id'), 1, 'should have only one instance');
                assert.isTrue(poller === IHealthPoller.get('id')[0], 'should be the same instance');
            });

            it('should return null when demo instance with such ID registered too', () => {
                IHealthPoller.createDemo('id');
                assert.deepStrictEqual(
                    IHealthPoller.get('id').find(p => !p.isDemoModeEnabled()),
                    undefined,
                    'should have no instance with such ID'
                );
            });

            it('should return instance by ID', () => {
                const poller = IHealthPoller.createDemo('id');
                assert.instanceOf(poller, IHealthPoller, 'should be instance of IHealthPoller');
                assert.isTrue(poller === IHealthPoller.get('id')[0], 'should be the same instance');
            });

            it('should return null when non-demo instance with such ID registered too', () => {
                IHealthPoller.create('id');
                assert.deepStrictEqual(
                    IHealthPoller.get('id').find(p => p.isDemoModeEnabled()),
                    undefined,
                    'should have no instance with such ID'
                );
            });
        });

        describe('.getAll()', () => {
            it('should return empty array when no instances registered', () => {
                assert.deepStrictEqual(IHealthPoller.getAll(), [], 'should have no instances by default');
                assert.deepStrictEqual(IHealthPoller.getAll({ includeDemo: true }), [], 'should have no instances at all by default');
                assert.deepStrictEqual(IHealthPoller.getAll({ demoOnly: true }), [], 'should have no demo instances by default');
                assert.deepStrictEqual(IHealthPoller.getAll({ demoOnly: true, includeDemo: true }), [], 'should have no demo instances by default');
            });

            it('should return non-demo instances only', () => {
                const poller1 = IHealthPoller.create('id1');
                const poller2 = IHealthPoller.create('id2');
                IHealthPoller.create('id2', { demo: true });
                assert.sameDeepMembers(IHealthPoller.getAll(), [poller1, poller2], 'should return registered instances');
            });

            it('should return demo instances only', () => {
                const poller1 = IHealthPoller.create('id1', { demo: true });
                const poller2 = IHealthPoller.create('id2', { demo: true });
                IHealthPoller.create('id2');
                assert.sameDeepMembers(
                    IHealthPoller.getAll({ demoOnly: true }),
                    [poller1, poller2],
                    'should return registered demo instances'
                );
                assert.sameDeepMembers(
                    IHealthPoller.getAll({ demoOnly: true, includeDemo: true }),
                    [poller1, poller2],
                    'should return registered demo instances'
                );
            });

            it('should include demo instances too', () => {
                const demoPoller1 = IHealthPoller.create('id1', { demo: true });
                const demoPoller2 = IHealthPoller.create('id2', { demo: true });
                const poller1 = IHealthPoller.create('id1');
                const poller2 = IHealthPoller.create('id2');
                assert.sameDeepMembers(
                    IHealthPoller.getAll({ includeDemo: true }),
                    [poller1, poller2, demoPoller1, demoPoller2],
                    'should return all registered instances'
                );
            });
        });

        describe('.unregister()', () => {
            const getOrCreate = (id, opts) => IHealthPoller.get(id).find(p => !p.isDemoModeEnabled())
                || IHealthPoller.create(id, opts);
            const getOrCreateDemo = (id, opts) => IHealthPoller.get(id).find(p => p.isDemoModeEnabled())
                || IHealthPoller.createDemo(id, opts);

            it('should unregister instance', () => {
                getOrCreate('id1');
                getOrCreateDemo('id1');
                assert.sameDeepMembers(
                    IHealthPoller.getAll({ includeDemo: true }),
                    [getOrCreate('id1'), getOrCreateDemo('id1')],
                    'should have registered instance'
                );
                IHealthPoller.unregister(getOrCreate('id1'));
                assert.sameDeepMembers(
                    IHealthPoller.getAll({ includeDemo: true }),
                    [getOrCreateDemo('id1')],
                    'should have registered instance'
                );
            });

            it('should unregister demo instance', () => {
                getOrCreate('id1');
                getOrCreateDemo('id1');
                assert.sameDeepMembers(
                    IHealthPoller.getAll({ includeDemo: true }),
                    [getOrCreate('id1'), getOrCreateDemo('id1')],
                    'should have registered instance'
                );
                IHealthPoller.unregister(getOrCreateDemo('id1'));
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ includeDemo: true }),
                    [getOrCreate('id1')],
                    'should have no registered instances'
                );
            });

            it('should not fail on attempt to unregister not registered instance', () => {
                const poller = getOrCreate('id1');
                const demoPoller = getOrCreateDemo('id1');

                IHealthPoller.unregister(poller);
                IHealthPoller.unregister(demoPoller);
                assert.deepStrictEqual(
                    IHealthPoller.getAll({ includeDemo: true }),
                    [],
                    'should have no registered instances'
                );
                assert.doesNotThrow(
                    () => IHealthPoller.unregister(poller),
                    'should not throw error when instance not registered'
                );
                assert.doesNotThrow(
                    () => IHealthPoller.unregister(demoPoller),
                    'should not throw error when demo instance not registered'
                );
            });
        });
    });

    describe('instance', () => {
        const qkviewFile = 'qkviewFile';
        const qkviewURI = 'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/0000000';
        let declaration;
        let instance;
        let instanceID;
        let instanceName;

        beforeEach(() => {
            declaration = dummies.declaration.base.decrypted();
            declaration.System = dummies.declaration.system.full.decrypted({
                username: 'test_user_1',
                passphrase: { cipherText: 'test_pass_1' }
            });
            declaration.System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
                username: 'test_user_2',
                passphrase: { cipherText: 'test_pass_2' },
                proxy: {
                    username: 'test_user_3',
                    passphrase: { cipherText: 'test_pass_3' }
                }
            });
            instanceID = 'System::iHealthPoller_1'; // traceName
            instanceName = 'iHealthPoller_1'; // auto-generated name
            instance = IHealthPoller.create(instanceID, { name: instanceName });
            coreStub.utilMisc.generateUuid.numbersOnly = false;
            return configWorker.processDeclaration(testUtil.deepCopy(declaration));
        });

        describe('constructor', () => {
            it('should configure instance without options', () => {
                instance = IHealthPoller.create('instanceID_2');
                assert.deepStrictEqual(instance.disablingPromise, undefined, 'should have no disablingPromise right after instantiation');
                assert.deepStrictEqual(instance.id, 'instanceID_2', 'should match expected ID');
                assert.deepStrictEqual(instance.name, 'IHealthPoller_instanceID_2', 'should match expected name');
                assert.deepStrictEqual(instance.storageKey, 'instanceID_2', 'should match expected storageKey');
                assert.deepStrictEqual(instance.isActive(), false, 'should not be active right after instantiation');
                assert.deepStrictEqual(instance.isDisabled(), false, 'should not be disabled right after instantiation');
                assert.deepStrictEqual(instance.isDemoModeEnabled(), false, 'should not be in "demo" mode');
            });

            it('should configure instance with options', () => {
                instance = IHealthPoller.create('instanceID_2', { demo: false, name: 'instanceName' });
                assert.deepStrictEqual(instance.disablingPromise, undefined, 'should have no disablingPromise right after instantiation');
                assert.deepStrictEqual(instance.id, 'instanceID_2', 'should match expected ID');
                assert.deepStrictEqual(instance.name, 'instanceName', 'should match expected name');
                assert.deepStrictEqual(instance.storageKey, 'instanceID_2', 'should match expected storageKey');
                assert.deepStrictEqual(instance.isActive(), false, 'should not be active right after instantiation');
                assert.deepStrictEqual(instance.isDisabled(), false, 'should not be disabled right after instantiation');
                assert.deepStrictEqual(instance.isDemoModeEnabled(), false, 'should not be in "demo" mode');
            });

            it('should configure instance with options (demo mode)', () => {
                instance = IHealthPoller.create('instanceID_2', { demo: true, name: 'instanceName' });
                assert.deepStrictEqual(instance.disablingPromise, undefined, 'should have no disablingPromise right after instantiation');
                assert.deepStrictEqual(instance.id, 'instanceID_2', 'should match expected ID');
                assert.deepStrictEqual(instance.name, 'instanceName (DEMO)', 'should match expected name');
                assert.deepStrictEqual(instance.storageKey, 'instanceID_2', 'should match expected storageKey');
                assert.deepStrictEqual(instance.isActive(), false, 'should not be active right after instantiation');
                assert.deepStrictEqual(instance.isDisabled(), false, 'should not be disabled right after instantiation');
                assert.deepStrictEqual(instance.isDemoModeEnabled(), true, 'should be in "demo" mode');
            });
        });

        describe('.cleanup()', () => {
            it('should perform instance cleanup', () => {
                instance.on('died', () => {});
                assert.deepStrictEqual(instance.hasListeners(), true, 'should have registered listeners');

                instance.cleanup();
                assert.deepStrictEqual(instance.hasListeners(), false, 'should have not registered listeners');
                assert.doesNotThrow(
                    () => instance.cleanup(),
                    'should not fail when tried to cleanup more than once'
                );
                IHealthPoller.unregister(instance);
            });
        });

        describe('.getConfig()', () => {
            it('should reject when no configuration found', () => {
                instance = IHealthPoller.create('instanceID_2');
                return assert.isRejected(
                    instance.getConfig(),
                    /Configuration for iHealth Poller "IHealthPoller_instanceID_2" \(instanceID_2\) not found/
                );
            });

            it('should be able to find configuration by ID', () => assert.becomes(
                instance.getConfig(),
                dummies.configuration.ihealthPoller.full.encrypted({
                    name: 'iHealthPoller_1',
                    id: 'System::iHealthPoller_1',
                    trace: true,
                    traceName: 'System::iHealthPoller_1',
                    iHealth: {
                        name: 'iHealthPoller_1',
                        credentials: {
                            username: 'test_user_2',
                            passphrase: {
                                cipherText: '$M$test_pass_2'
                            }
                        },
                        proxy: {
                            credentials: {
                                username: 'test_user_3',
                                passphrase: {
                                    cipherText: '$M$test_pass_3'
                                }
                            }
                        }
                    },
                    system: {
                        credentials: {
                            username: 'test_user_1',
                            passphrase: {
                                cipherText: '$M$test_pass_1'
                            }
                        }
                    }
                }),
                'should match expected config'
            ));
        });

        describe('.info()', () => {
            it('should return info about current status (inactive instance)', () => {
                assert.deepStrictEqual(instance.info(), {
                    currentCycle: {
                        cycleNo: 0,
                        endTimestamp: null,
                        qkview: {},
                        retries: {
                            qkviewCollect: 0,
                            qkviewUpload: 0,
                            reportCollect: 0
                        },
                        startTimestamp: null
                    },
                    demoMode: false,
                    disabled: false,
                    id: 'System::iHealthPoller_1',
                    name: 'iHealthPoller_1',
                    nextFireDate: 'not set',
                    state: 'uninitialized',
                    stats: {
                        cycles: 0,
                        cyclesCompleted: 0,
                        qkviewCollectRetries: 0,
                        qkviewUploadRetries: 0,
                        qkviewsCollected: 0,
                        qkviewsUploaded: 0,
                        reportCollectRetries: 0,
                        reportsCollected: 0
                    },
                    timeUntilNextExecution: 'not available'
                }, 'should match expected data');
            });

            it('should return info about current status (after one polling cycle)', () => {
                instance = IHealthPoller.create(instanceID, { name: instanceName, demo: true });
                return new Promise((resolve, reject) => {
                    instance.once('died', () => reject(new Error('Unexpectedly died')));
                    instance.once('report', () => resolve(instance.info()));
                    instance.start().catch(reject);
                })
                    .then((info) => {
                        assert.deepNestedInclude(info, {
                            currentCycle: {
                                cycleNo: 1,
                                endTimestamp: info.currentCycle.endTimestamp, // not care
                                qkview: {
                                    qkviewFile,
                                    qkviewURI
                                },
                                retries: {
                                    qkviewCollect: 0,
                                    qkviewUpload: 0,
                                    reportCollect: 0
                                },
                                startTimestamp: info.currentCycle.startTimestamp // not care
                            },
                            demoMode: true,
                            disabled: false,
                            state: 'processReport',
                            stats: {
                                cycles: 1,
                                cyclesCompleted: 0, // actually 1, but stopped earlier than reached 'completed'
                                qkviewsCollected: 1,
                                qkviewCollectRetries: 0,
                                qkviewsUploaded: 1,
                                qkviewUploadRetries: 0,
                                reportsCollected: 1,
                                reportCollectRetries: 0
                            },
                            timeUntilNextExecution: info.timeUntilNextExecution, // not care
                            id: 'System::iHealthPoller_1',
                            name: 'iHealthPoller_1 (DEMO)'
                        }, 'should match expected data');
                    });
            });
        });

        describe('.start() & .stop() and polling cycle', () => {
            const startPoller = (poller, options) => new Promise((resolve, reject) => {
                options = options || {};
                poller.on('died', error => (error ? reject(error) : resolve()));
                if (!options.waitTillDied) {
                    poller.on('completed', () => {
                        if (!options.waitTillCycleCompleted
                            || options.waitTillCycleCompleted <= poller.info().stats.cyclesCompleted) {
                            resolve();
                        }
                    });
                }
                poller.start().catch(reject);
            });

            it('should start just once', () => {
                const startedSpy = sinon.spy();
                instance.on('started', startedSpy);
                return Promise.all([instance.start(), instance.start()])
                    .then(() => {
                        assert.strictEqual(startedSpy.callCount, 1, 'should emit "started" event just once');
                    });
            });

            it('should reject when started already', () => assert.isRejected(
                instance.start()
                    .then(() => instance.start()),
                /IHealthPollerFSM instance is active already/
            ));

            it('should not fail on attempt to stop inactive instance', () => {
                assert.isFalse(instance.isActive(), 'should be inactive');
                assert.isFalse(instance.isDisabled(), 'should not be disabled yet');
                return instance.stop()
                    .then(() => {
                        assert.isFalse(instance.isActive(), 'should be inactive');
                        assert.isFalse(instance.isDisabled(), 'should not be disabled');
                    });
            });

            it('should not fail on attempt to stop twice', () => {
                const disablingSpy = sinon.spy();
                instance.on('disabling', disablingSpy);
                return instance.start()
                    .then(() => Promise.all([instance.stop(), instance.stop()]))
                    .then(() => {
                        assert.strictEqual(disablingSpy.callCount, 1, 'should emit "disabling" event just once');
                    });
            });

            it('should stop on attempt so start and stop and the same time (start and stop)', () => Promise.all([
                instance.start().catch(error => error),
                instance.stop().catch(error => error)
            ])
                .then((results) => {
                    assert.isFalse(instance.isActive(), 'should be inactive');
                    assert.isFalse(instance.isDisabled(), 'should not be disabled');
                    assert.deepStrictEqual(results[1], undefined, 'should have no error on attempt to stop');
                    assert.match(results[0], /Unable to start IHealthPollerFSM instance due unknown reason/, 'should reject with error on attempt to start once stopped');
                }));
            // try different order of execution
            it('should stop on attempt so start and stop and the same time (stop and start)', () => Promise.all([
                instance.stop().catch(error => error),
                instance.start().catch(error => error)
            ])
                .then((results) => {
                    assert.isFalse(instance.isActive(), 'should be inactive');
                    assert.isFalse(instance.isDisabled(), 'should not be disabled');
                    assert.deepStrictEqual(results[0], undefined, 'should have no error on attempt to stop');
                    assert.match(results[1], /Unable to start IHealthPollerFSM instance due unknown reason/, 'should reject with error on attempt to start once stopped');
                }));

            it('should complete polling cycle in demo mode', () => {
                instance = IHealthPoller.create(instanceID, { name: instanceName, demo: true });
                const psGetSpy = sinon.spy(persistentStorage.persistentStorage, 'get');
                const psRemoveSpy = sinon.spy(persistentStorage.persistentStorage, 'remove');
                const psSetSpy = sinon.spy(persistentStorage.persistentStorage, 'set');
                const startPromise = startPoller(instance, { waitTillDied: true });
                const diedPromise = instance.waitFor('died');
                return Promise.all([startPromise, diedPromise])
                    .then(() => {
                        assert.deepStrictEqual(coreStub.persistentStorage.savedData.ihealth, undefined, 'should have no iHealth data written to PersistentStorage');
                        assert.strictEqual(psGetSpy.callCount, 0, 'should not call persistentStorage.get() in demo mode');
                        assert.strictEqual(psRemoveSpy.callCount, 0, 'should not call persistentStorage.remove() in demo mode');
                        assert.strictEqual(psSetSpy.callCount, 0, 'should not call persistentStorage.set() in demo mode');

                        assert.isFalse(instance.isActive(), 'should be inactive');
                        assert.isFalse(instance.isDisabled(), 'should not be disabled once stopped');
                        assert.deepStrictEqual(instance.info().stats, {
                            cycles: 1,
                            cyclesCompleted: 1,
                            qkviewsCollected: 1,
                            qkviewCollectRetries: 0,
                            qkviewsUploaded: 1,
                            qkviewUploadRetries: 0,
                            reportsCollected: 1,
                            reportCollectRetries: 0
                        });
                        assert.deepStrictEqual(instance.info().currentCycle.retries, {
                            qkviewCollect: 0,
                            qkviewUpload: 0,
                            reportCollect: 0
                        });
                        const removeFileStub = ihealthStub.ihealthUtil.DeviceAPI.removeFile;
                        assert.deepStrictEqual(removeFileStub.getCall(removeFileStub.callCount - 1).args[0], qkviewFile, 'should remove downloaded Qkview file');
                    });
            });

            [
                {
                    state: 'collectQkview',
                    stub: 'ihealthUtil.QkviewManager.process'
                },
                {
                    state: 'uploadQkview',
                    stub: 'ihealthUtil.IHealthManager.uploadQkview'
                },
                {
                    state: 'collectReport',
                    stub: 'ihealthUtil.IHealthManager.fetchQkviewDiagnostics'
                }
            ].forEach((testConf) => {
                testUtil.getCallableIt(testConf)(`should die with error in demo mode when unable to complete "${testConf.state}"`, () => {
                    instance = IHealthPoller.create(instanceID, { name: instanceName, demo: true });
                    getByKey(ihealthStub, testConf.stub).rejects(new Error('expected error'));

                    const clockStub = stubs.clock();
                    clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                    return assert.isRejected(
                        startPoller(instance, { waitTillDied: true }),
                        `Max. number of retries for state "${testConf.state}" reached!`
                    );
                });
            });

            it('should complete polling cycle in regular mode', () => {
                const psGetSpy = sinon.spy(persistentStorage.persistentStorage, 'get');
                const psRemoveSpy = sinon.spy(persistentStorage.persistentStorage, 'remove');
                const psSetSpy = sinon.spy(persistentStorage.persistentStorage, 'set');

                const qkviewHistory = [];
                let qkviewCounter = 0;
                ihealthStub.ihealthUtil.QkviewManager.process.callsFake(() => {
                    qkviewCounter += 1;
                    return Promise.resolve(`qkviewFile_${qkviewCounter}`);
                });
                ihealthStub.ihealthUtil.IHealthManager.uploadQkview.callsFake((fname) => {
                    qkviewHistory.push(fname);
                    return Promise.resolve(`https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/${fname}/0000000`);
                });
                ihealthStub.ihealthUtil.IHealthManager.isQkviewReportReady.callsFake((uri) => {
                    qkviewHistory.push(uri);
                    return Promise.resolve(true);
                });

                const reports = [];
                let storageCopy;

                instance.on('report', report => reports.push(report));
                const clockStub = stubs.clock();
                clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                return startPoller(instance, { waitTillCycleCompleted: 2 }) // wait till 2 cycles will be completed
                    .then(() => {
                        assert.strictEqual(psGetSpy.callCount, 1, 'should call persistentStorage.get() only once');
                        assert.strictEqual(psRemoveSpy.callCount, 0, 'should not call persistentStorage.remove() until stopped');
                        assert.isAtLeast(psSetSpy.callCount, 1, 'should call persistentStorage.set() at least once');
                        assert.isTrue(instance.isActive(), 'should be active');
                        storageCopy = testUtil.deepCopy(coreStub.persistentStorage.savedData.ihealth);

                        assert.isTrue(instance.isActive(), 'should be active');
                        assert.isFalse(instance.isDisabled(), 'should not be disabled');
                        const stopPromise = instance.stop();
                        assert.isTrue(instance.isDisabled(), 'should be disabled');
                        return stopPromise;
                    })
                    .then(() => {
                        assert.isFalse(instance.isActive(), 'should be inactive');
                        assert.isFalse(instance.isDisabled(), 'should not be disabled once stopped');
                        assert.strictEqual(psRemoveSpy.callCount, 1, 'should call persistentStorage.remove() once stopped');
                        assert.deepStrictEqual(coreStub.persistentStorage.savedData.ihealth[instance.storageKey], undefined, 'should remove data from persistentStorage');

                        const instanceData = storageCopy[instance.storageKey];
                        assert.strictEqual(typeof instanceData.schedule.nextExecTime, 'number');
                        assert.deepStrictEqual(instanceData.stats, {
                            cycles: 2,
                            cyclesCompleted: 1, // stopped earlier than data was saved to storage
                            qkviewsCollected: 2,
                            qkviewCollectRetries: 0,
                            qkviewsUploaded: 2,
                            qkviewUploadRetries: 0,
                            reportsCollected: 2,
                            reportCollectRetries: 0
                        });
                        assert.deepStrictEqual(instanceData.version, '2.0');
                        assert.deepStrictEqual(instanceData.currentCycle.qkview, {
                            qkviewFile: 'qkviewFile_2',
                            qkviewURI: 'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/qkviewFile_2/0000000',
                            reportProcessed: true
                        });
                        assert.deepStrictEqual(instanceData.currentCycle.retries, {
                            qkviewCollect: 0,
                            qkviewUpload: 0,
                            reportCollect: 0
                        });
                        assert.deepStrictEqual(instance.info().stats, {
                            cycles: 2,
                            cyclesCompleted: 2,
                            qkviewsCollected: 2,
                            qkviewCollectRetries: 0,
                            qkviewsUploaded: 2,
                            qkviewUploadRetries: 0,
                            reportsCollected: 2,
                            reportCollectRetries: 0
                        });
                        assert.deepStrictEqual(instance.info().currentCycle.retries, {
                            qkviewCollect: 0,
                            qkviewUpload: 0,
                            reportCollect: 0
                        });

                        const removedFiles = ihealthStub.ihealthUtil.DeviceAPI.removeFile.args.map(args => args[0]);
                        assert.includeMembers(
                            removedFiles,
                            [
                                'qkviewFile_1',
                                'qkviewFile_2'
                            ]
                        );

                        for (let i = 1; i < reports.length; i += 1) {
                            // interval window size is 3h (see declaration)
                            // min. delay between prev. start and cur. start >= 21h
                            assert.isAbove(
                                reports[i].additionalInfo.cycleStart - reports[i - 1].additionalInfo.cycleStart,
                                21 * 60 * 60 * 1000 - 1,
                                'should be above 21h'
                            );
                        }

                        assert.deepStrictEqual(qkviewHistory, [
                            'qkviewFile_1',
                            'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/qkviewFile_1/0000000',
                            'qkviewFile_2',
                            'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/qkviewFile_2/0000000'
                        ]);
                    });
            });

            it('should retry Qkview actions when failed', () => {
                const getConfigStub = sinon.stub(IHealthPoller.prototype, 'getConfig');
                getConfigStub.onFirstCall().callsFake(() => {
                    getConfigStub.restore();
                    return Promise.reject(new Error('expected getConfig error'));
                });
                ihealthStub.ihealthUtil.QkviewManager.process.onFirstCall().rejects(new Error('expected Qkview collect error'));
                ihealthStub.ihealthUtil.IHealthManager.uploadQkview.onFirstCall().rejects(new Error('expected Qkview upload error'));
                ihealthStub.ihealthUtil.IHealthManager.isQkviewReportReady.onFirstCall().rejects(new Error('expected Report check error'));
                ihealthStub.ihealthUtil.IHealthManager.fetchQkviewDiagnostics.onFirstCall().rejects(new Error('expected Report collect error'));

                const clockStub = stubs.clock();
                clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                return startPoller(instance)
                    .then(() => instance.stop())
                    .then(() => {
                        assert.deepStrictEqual(instance.info().stats, {
                            cycles: 2, // getConfig makes scheduling to fail and start next cycle
                            cyclesCompleted: 1,
                            qkviewsCollected: 1,
                            qkviewCollectRetries: 1, // should retry just once
                            qkviewsUploaded: 1,
                            qkviewUploadRetries: 1,
                            reportsCollected: 1,
                            reportCollectRetries: 2 // 2 retries - report check and report fetch
                        });
                    });
            });

            it('should start new cycle when reached max number of retries for each Qkview action', () => {
                // max num of retries for Qkview collect and upload is 5, total attempts 6
                for (let i = 0; i < 6; i += 1) {
                    ihealthStub.ihealthUtil.QkviewManager.process.onCall(i).rejects(new Error('expected Qkview collect error')); // cycle #1
                    ihealthStub.ihealthUtil.IHealthManager.uploadQkview.onCall(i).rejects(new Error('expected Qkview upload error')); // cycle #2
                }
                // max num of retries for Qkview collect and upload is 30, total attempts 31
                for (let i = 0; i < 31; i += 1) {
                    ihealthStub.ihealthUtil.IHealthManager.isQkviewReportReady.onCall(i).rejects(new Error('expected Report check error')); // cycle #3
                    ihealthStub.ihealthUtil.IHealthManager.fetchQkviewDiagnostics.onCall(i).rejects(new Error('expected Report collect error')); // cycle #4
                }

                const clockStub = stubs.clock();
                clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                return startPoller(instance)
                    .then(() => instance.stop())
                    .then(() => {
                        assert.deepStrictEqual(instance.info().stats, {
                            cycles: 5,
                            cyclesCompleted: 1, // only 1 successfully completed cycle
                            qkviewsCollected: 4,
                            qkviewCollectRetries: 5,
                            qkviewsUploaded: 3,
                            qkviewUploadRetries: 5,
                            reportsCollected: 1,
                            reportCollectRetries: 60
                        });
                    });
            });

            it('should retry when Qkview report is not ready', () => {
                ihealthStub.ihealthUtil.IHealthManager.isQkviewReportReady.onFirstCall().resolves(false);
                const clockStub = stubs.clock();
                clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                return startPoller(instance)
                    .then(() => instance.stop())
                    .then(() => {
                        assert.deepStrictEqual(instance.info().stats, {
                            cycles: 1,
                            cyclesCompleted: 1, // only 1 successfully completed cycle
                            qkviewsCollected: 1,
                            qkviewCollectRetries: 0,
                            qkviewsUploaded: 1,
                            qkviewUploadRetries: 0,
                            reportsCollected: 1,
                            reportCollectRetries: 1
                        });
                    });
            });

            it('should restore state', () => {
                const instanceStorageKey = instance.storageKey;
                const reportEventSpy = sinon.spy();

                let clockStub;
                let fetchQkviewDiagnosticsCallCount;
                let isQkviewReportReadyCallCount;
                let lastSavedData;
                let nextExecTime;
                let processQkviewCallCount;
                let reportEventSpyCallCount;
                let timeToRestore;
                let uploadQkviewCallCount;

                const stopOnceDataSaved = state => new Promise((resolve) => {
                    coreStub.persistentStorage.saveCbAfter = (ctx) => {
                        if (ctx.savedData.ihealth[instance.storageKey].lastKnownState === state) {
                            lastSavedData = testUtil.deepCopy(ctx.savedData);
                            resolve();
                        }
                    };
                })
                    .then(() => IHealthPoller.disable(instance))
                    .then(ret => ret.stopPromise)
                    .then(() => {
                        instance = null;
                    });

                const restoreDataAndStart = (inst, fakeTime) => {
                    // need to re-set time to avoid scheduling next execution
                    if (clockStub) {
                        clockStub.stub.restore();
                    }
                    clockStub = stubs.clock({ fakeTimersOpts: timeToRestore || new Date('Mon, 15 Mar 2021 19:00:50 GMT').getTime() });
                    if (fakeTime !== false) {
                        clockStub.clockForward(30 * 60 * 1000, { promisify: true }); // 30 min. in advance
                    }
                    coreStub.persistentStorage.loadData = lastSavedData;
                    return persistentStorage.persistentStorage.load()
                        .then(() => {
                            instance = inst || IHealthPoller.create(instanceID, { name: instanceName });
                            instance.on('report', reportEventSpy);
                            return instance.start();
                        });
                };

                return Promise.all([restoreDataAndStart(instance, false), stopOnceDataSaved('schedule')])
                    .then(() => {
                        nextExecTime = lastSavedData.ihealth[instanceStorageKey].schedule.nextExecTime;
                        assert.strictEqual(typeof nextExecTime, 'number', 'should be number');
                        assert.isAbove(nextExecTime, 0, 'should be greater than 0');
                        timeToRestore = nextExecTime + 3 * 60 * 60 * 1000; // exec time + 3h to trigger re-schedule
                        return Promise.all([
                            restoreDataAndStart(instance, false), // should restore to 'schedule' state
                            stopOnceDataSaved('schedule')
                        ]);
                    })
                    .then(() => {
                        assert.strictEqual(ihealthStub.ihealthUtil.QkviewManager.process.callCount, 0, 'should not call QkviewManager.process');
                        assert.isAbove(lastSavedData.ihealth[instanceStorageKey].schedule.nextExecTime, nextExecTime, 'should re-schedule');

                        nextExecTime = lastSavedData.ihealth[instanceStorageKey].schedule.nextExecTime;
                        assert.strictEqual(typeof nextExecTime, 'number', 'should be number');
                        assert.isAbove(nextExecTime, 0, 'should be greater than 0');
                        return Promise.all([
                            restoreDataAndStart(instance), // should restore to 'schedule' state
                            stopOnceDataSaved('collectQkview')
                        ]);
                    })
                    .then(() => {
                        processQkviewCallCount = ihealthStub.ihealthUtil.QkviewManager.process.callCount;
                        assert.isAbove(processQkviewCallCount, 0, 'should call QkviewManager.process at least once');
                        assert.deepStrictEqual(lastSavedData.ihealth[instanceStorageKey].schedule.nextExecTime, nextExecTime, 'should not re-schedule');
                        return Promise.all([
                            restoreDataAndStart(instance), // should restore to 'collectQkview' state
                            stopOnceDataSaved('uploadQkview')
                        ]);
                    })
                    .then(() => {
                        uploadQkviewCallCount = ihealthStub.ihealthUtil.IHealthManager.uploadQkview.callCount;
                        assert.strictEqual(ihealthStub.ihealthUtil.QkviewManager.process.callCount, processQkviewCallCount, 'should not call QkviewManager.process once restored');
                        assert.isAbove(uploadQkviewCallCount, 0, 'should call IHealthManager.uploadQkview at least once');
                        return Promise.all([
                            restoreDataAndStart(instance),
                            stopOnceDataSaved('collectReport') // should restore to 'uploadQkview' state
                        ]);
                    })
                    .then(() => {
                        // force to re-fetch diag. data
                        lastSavedData.ihealth[instanceStorageKey].currentCycle.qkview.reportProcessed = false;

                        fetchQkviewDiagnosticsCallCount = ihealthStub.ihealthUtil
                            .IHealthManager.fetchQkviewDiagnostics.callCount;
                        isQkviewReportReadyCallCount = ihealthStub.ihealthUtil
                            .IHealthManager.isQkviewReportReady.callCount;
                        assert.isAbove(isQkviewReportReadyCallCount, 0, 'should call IHealthManager.isQkviewReportReady at least once');
                        assert.isAbove(fetchQkviewDiagnosticsCallCount, 0, 'should call IHealthManager.fetchQkviewDiagnostics at least once');
                        assert.strictEqual(ihealthStub.ihealthUtil.IHealthManager.uploadQkview.callCount, uploadQkviewCallCount, 'should not call IHealthManager.uploadQkview once restored');
                        return Promise.all([
                            restoreDataAndStart(instance), // should restore to 'collectReport' state
                            stopOnceDataSaved('processReport')
                        ]);
                    })
                    .then(() => {
                        // should call .fetchQkviewDiagnosticsCall and .isQkviewReportReady to obtain data
                        // from iHealth again and send an event
                        assert.isAbove(ihealthStub.ihealthUtil
                            .IHealthManager.fetchQkviewDiagnostics.callCount, fetchQkviewDiagnosticsCallCount, 'should call IHealthManager.fetchQkviewDiagnosticsCall once restored');
                        assert.isAbove(ihealthStub.ihealthUtil
                            .IHealthManager.isQkviewReportReady.callCount, isQkviewReportReadyCallCount, 'should call IHealthManager.isQkviewReportReady once restored');
                        assert.isAbove(reportEventSpy.callCount, 1, 'should emit "report" at least once');

                        reportEventSpyCallCount = reportEventSpy.callCount;
                        // sub-test: should not try to obtain dia. report if it was processed already
                        fetchQkviewDiagnosticsCallCount = ihealthStub.ihealthUtil
                            .IHealthManager.fetchQkviewDiagnostics.callCount;
                        isQkviewReportReadyCallCount = ihealthStub.ihealthUtil
                            .IHealthManager.isQkviewReportReady.callCount;

                        return Promise.all([
                            restoreDataAndStart(instance), // should restore to 'collectReport' state
                            stopOnceDataSaved('schedule')
                        ]);
                    })
                    .then(() => {
                        assert.strictEqual(reportEventSpy.callCount, reportEventSpyCallCount, 'should not emit "report" once restored');
                        assert.strictEqual(ihealthStub.ihealthUtil
                            .IHealthManager.fetchQkviewDiagnostics.callCount, fetchQkviewDiagnosticsCallCount, 'should not call IHealthManager.fetchQkviewDiagnosticsCall once restored');
                        assert.strictEqual(ihealthStub.ihealthUtil
                            .IHealthManager.isQkviewReportReady.callCount, isQkviewReportReadyCallCount, 'should not call IHealthManager.isQkviewReportReady once restored');
                    });
            });

            it('should pass configuration to QkviewManager and IHealthManager (full config)', () => {
                const clockStub = stubs.clock();
                clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                return startPoller(instance)
                    .then(() => instance.stop())
                    .then(() => {
                        const ihmArgs = ihealthStub.ihealthUtil.IHealthManager.constructor.args[0];
                        const qkmArgs = ihealthStub.ihealthUtil.QkviewManager.constructor.args[0];

                        assert.deepStrictEqual(ihmArgs[0], {
                            username: 'test_user_2',
                            passphrase: 'test_pass_2'
                        }, 'should pass decrypted iHealth credentials');
                        assert.deepStrictEqual(ihmArgs[1].proxy, {
                            connection: {
                                allowSelfSignedCert: true,
                                host: '192.168.100.1',
                                port: 443,
                                protocol: 'https'
                            },
                            credentials: {
                                username: 'test_user_3',
                                passphrase: 'test_pass_3'
                            }
                        }, 'should pass decrypted iHealth proxy options');
                        assert.strictEqual(qkmArgs[0], '192.168.0.1', 'should match system host');
                        assert.deepStrictEqual(qkmArgs[1].connection, {
                            port: 443,
                            protocol: 'https',
                            allowSelfSignedCert: true
                        }, 'should match system\'s connection options');
                        assert.deepStrictEqual(qkmArgs[1].credentials, {
                            username: 'test_user_1',
                            passphrase: 'test_pass_1'
                        }, 'should match system\'s credentials');
                        assert.deepStrictEqual(qkmArgs[1].downloadFolder, './', 'should match configured download folder');
                    });
            });

            it('should pass configuration to QkviewManager and IHealthManager (minimal config)', () => {
                declaration = dummies.declaration.base.decrypted();
                declaration.System = dummies.declaration.system.minimal.decrypted({});
                declaration.System.iHealthPoller = dummies.declaration.ihealthPoller.inlineMinimal.decrypted({
                    username: 'test_user_2',
                    passphrase: { cipherText: 'test_pass_2' }
                });
                return configWorker.processDeclaration(declaration)
                    .then(() => {
                        const clockStub = stubs.clock();
                        clockStub.clockForward(30 * 60 * 1000, { promisify: true });
                        return startPoller(instance);
                    })
                    .then(() => instance.stop())
                    .then(() => {
                        const ihmArgs = ihealthStub.ihealthUtil.IHealthManager.constructor.args[0];
                        const qkmArgs = ihealthStub.ihealthUtil.QkviewManager.constructor.args[0];

                        assert.deepStrictEqual(ihmArgs[0], {
                            username: 'test_user_2',
                            passphrase: 'test_pass_2'
                        }, 'should pass decrypted iHealth credentials');
                        assert.deepStrictEqual(ihmArgs[1].proxy, {
                            connection: {
                                allowSelfSignedCert: undefined,
                                host: undefined,
                                port: undefined,
                                protocol: undefined
                            },
                            credentials: {
                                username: undefined,
                                passphrase: undefined
                            }
                        }, 'should pass decrypted proxy options');
                        assert.strictEqual(qkmArgs[0], 'localhost', 'should match system host');
                        assert.deepStrictEqual(qkmArgs[1].connection, {
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        }, 'should match system\'s connection options');
                        assert.deepStrictEqual(qkmArgs[1].credentials, {
                            username: undefined,
                            passphrase: undefined
                        }, 'should match system\'s credentials');
                        assert.deepStrictEqual(qkmArgs[1].downloadFolder, '/shared/tmp', 'should match default download folder');
                    });
            });
        });
    });
});
