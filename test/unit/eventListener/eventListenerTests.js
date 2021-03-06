/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configUtil = require('../../../src/lib/utils/config');
const configWorker = require('../../../src/lib/config');
const dataPipeline = require('../../../src/lib/dataPipeline');
const EventListener = require('../../../src/lib/eventListener');
const eventListenerTestData = require('../data/eventListenerTestsData');
const messageStream = require('../../../src/lib/eventListener/messageStream');
const testUtil = require('../shared/util');
const tracers = require('../../../src/lib/utils/tracer').Tracer;
const util = require('../../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Event Listener', () => {
    /**
     * 'change' event is the only one 'true' way to test EventLister because
     * we are not using any other API to interact with it
     */
    let actualData;
    let allTracersStub;
    let activeTracersStub;
    let uuidCounter = 0;

    const defaultTestPort = 1234;
    const defaultDeclarationPort = 6514;

    let origDecl;

    const assertListener = function (actualListener, expListener) {
        assert.deepStrictEqual(actualListener.tags, expListener.tags || {});
        assert.deepStrictEqual(actualListener.actions, expListener.actions || [{
            enable: true,
            setTag: {
                application: '`A`',
                tenant: '`T`'
            }
        }]);
        if (expListener.hasFilterFunc) {
            assert.isNotNull(actualListener.filterFunc);
        } else {
            assert.isNull(actualListener.filterFunc);
        }
    };

    const validateAndNormalize = function (declaration) {
        return configWorker.validate(util.deepCopy(declaration))
            .then(validated => Promise.resolve(configUtil.normalizeConfig(validated)));
    };

    const validateAndNormalizeEmit = function (declaration) {
        return validateAndNormalize(declaration)
            .then(normalized => configWorker.emitAsync('change', normalized));
    };

    const addData = (dataPipelineArgs) => {
        const dataCtx = dataPipelineArgs[0];
        actualData[dataCtx.sourceId] = actualData[dataCtx.sourceId] || [];
        actualData[dataCtx.sourceId].push(dataCtx.data);
    };

    const gatherIds = () => {
        const ids = EventListener.getAll().map(inst => inst.id);
        ids.sort();
        return ids;
    };

    beforeEach(() => {
        actualData = {};
        activeTracersStub = [];
        allTracersStub = [];

        origDecl = {
            class: 'Telemetry',
            Listener1: {
                class: 'Telemetry_Listener',
                port: defaultTestPort,
                tag: {
                    tenant: '`T`',
                    application: '`A`'
                }
            }
        };

        sinon.stub(tracers, 'createFromConfig').callsFake((className, objName, config) => {
            allTracersStub.push(objName);
            if (config.trace) {
                activeTracersStub.push(objName);
            }
            return null;
        });

        sinon.stub(dataPipeline, 'process').callsFake(function () {
            addData(Array.from(arguments));
            return Promise.resolve();
        });

        ['startHandler', 'stopHandler'].forEach((method) => {
            sinon.stub(messageStream.MessageStream.prototype, method).resolves();
        });

        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });

        return validateAndNormalizeEmit(util.deepCopy(origDecl))
            .then(() => {
                const listeners = EventListener.instances;
                assert.strictEqual(Object.keys(listeners).length, 1);
                assert.deepStrictEqual(gatherIds(), ['uuid1']);
                assertListener(listeners.Listener1, {
                    tags: { tenant: '`T`', application: '`A`' }
                });
                assert.strictEqual(allTracersStub.length, 1);
                assert.strictEqual(activeTracersStub.length, 0);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 1);

                // reset counts
                activeTracersStub = [];
                allTracersStub = [];
                uuidCounter = 0;
            });
    });

    afterEach(() => configWorker.emitAsync('change', { components: [], mappings: {} })
        .then(() => {
            const listeners = EventListener.getAll();
            assert.strictEqual(Object.keys(listeners).length, 0);
            assert.strictEqual(EventListener.receiversManager.getAll().length, 0);
        })
        .then(() => {
            uuidCounter = 0;
            sinon.restore();
        }));

    describe('events handling', () => {
        let loggerSpy;

        beforeEach(() => {
            loggerSpy = sinon.spy(EventListener.instances.Listener1.logger, 'exception');
        });
        eventListenerTestData.onMessagesHandler.forEach((testSet) => {
            testUtil.getCallableIt(testSet)(testSet.name, () => EventListener.receiversManager
                .getMessageStream(defaultTestPort)
                .emitAsync('messages', testSet.rawEvents)
                .then(() => {
                    assert.isTrue(loggerSpy.notCalled);
                    assert.deepStrictEqual(actualData[EventListener.instances.Listener1.id], testSet.expectedData);
                }));
        });
    });

    it('should create listeners with default and custom opts on config change event (no prior config)', () => {
        const newDecl = util.deepCopy(origDecl);
        newDecl.Listener2 = {
            class: 'Telemetry_Listener',
            match: 'somePattern',
            trace: true
        };
        // should receive no data due filtering
        newDecl.Listener3 = {
            class: 'Telemetry_Listener',
            match: 'somePattern2',
            trace: true
        };

        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(activeTracersStub.length, 2);
                assert.strictEqual(allTracersStub.length, 3);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 2);
                assert.deepStrictEqual(gatherIds(), ['uuid1', 'uuid2', 'uuid3']);

                const listeners = EventListener.instances;
                assertListener(listeners.Listener1, {
                    tags: { tenant: '`T`', application: '`A`' }
                });
                assertListener(listeners.Listener2, { hasFilterFunc: true });
                assertListener(listeners.Listener3, { hasFilterFunc: true });

                return Promise.all([
                    EventListener.receiversManager.getMessageStream(defaultDeclarationPort).emitAsync('messages', ['virtual_name="somePattern"']),
                    EventListener.receiversManager.getMessageStream(defaultTestPort).emitAsync('messages', ['1234'])
                ])
                    .then(() => assert.deepStrictEqual(actualData, {
                        [listeners.Listener1.id]: [{ data: '1234', telemetryEventCategory: 'event' }],
                        [listeners.Listener2.id]: [{ virtual_name: 'somePattern', telemetryEventCategory: 'LTM' }]
                    }));
            });
    });

    it('should stop existing listener(s) when removed from config', () => {
        assert.notStrictEqual(EventListener.getAll().length, 0);
        assert.notStrictEqual(EventListener.receiversManager.getAll().length, 0);
        return configWorker.emitAsync('change', { components: [], mappings: {} })
            .then(() => {
                assert.strictEqual(activeTracersStub.length, 0);
                assert.strictEqual(allTracersStub.length, 0);

                assert.strictEqual(EventListener.getAll().length, 0);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 0);
            });
    });

    it('should update existing listener(s) without restarting if port is the same', () => {
        const newDecl = util.deepCopy(origDecl);
        newDecl.Listener1.trace = true;
        const updateSpy = sinon.stub(EventListener.prototype, 'updateConfig');
        const existingMessageStream = EventListener.receiversManager.registered[newDecl.Listener1.port];

        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(activeTracersStub.length, 1);
                assert.strictEqual(allTracersStub.length, 1);
                assert.deepStrictEqual(gatherIds(), ['uuid1']);

                const listeners = EventListener.instances;
                assertListener(listeners.Listener1, {
                    tags: { tenant: '`T`', application: '`A`' }
                });
                // one for each protocol
                assert.isTrue(updateSpy.calledOnce);

                assert.strictEqual(EventListener.getAll().length, 1);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 1);

                const currentMessageSteam = EventListener.receiversManager.getMessageStream(newDecl.Listener1.port);
                assert.isTrue(existingMessageStream === currentMessageSteam, 'should not re-create Message Stream');

                return existingMessageStream.emitAsync('messages', ['6514'])
                    .then(() => assert.deepStrictEqual(actualData, {
                        [listeners.Listener1.id]: [{ data: '6514', telemetryEventCategory: 'event' }]
                    }));
            });
    });

    it('should add a new listener without updating existing one when skipUpdate = true', () => {
        const updateSpy = sinon.spy(EventListener.prototype, 'updateConfig');
        const newDecl = util.deepCopy(origDecl);
        newDecl.New = {
            class: 'Telemetry_Namespace',
            Listener1: {
                class: 'Telemetry_Listener',
                port: 2345,
                trace: true
            }
        };
        return validateAndNormalize(newDecl)
            .then((normalized) => {
                normalized.components[0].skipUpdate = true;
                return configWorker.emitAsync('change', normalized);
            })
            .then(() => {
                assert.strictEqual(activeTracersStub.length, 1);
                assert.strictEqual(allTracersStub.length, 1);
                assert.deepStrictEqual(gatherIds(), ['uuid1', 'uuid2']);

                const listeners = EventListener.instances;
                assertListener(listeners.Listener1, {
                    tags: { tenant: '`T`', application: '`A`' }
                });
                assertListener(listeners['New::Listener1'], {});
                // one for each protocol, called through constructor
                assert.isTrue(updateSpy.calledTwice);
                assert.strictEqual(EventListener.getAll().length, 2);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 2);
            });
    });

    it('should remove disabled listener', () => {
        const newDecl = util.deepCopy(origDecl);
        newDecl.Listener1.enable = false;

        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(activeTracersStub.length, 0);
                assert.strictEqual(allTracersStub.length, 0);
                assert.strictEqual(EventListener.getAll().length, 0);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 0);
            });
    });

    it('should allow another instance to listen on the same port', () => {
        const newDecl = util.deepCopy(origDecl);
        newDecl.New = {
            class: 'Telemetry_Namespace',
            Listener1: {
                class: 'Telemetry_Listener',
                port: newDecl.Listener1.port,
                trace: true
            }
        };

        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(EventListener.getAll().length, 2);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 1);
                assert.deepStrictEqual(gatherIds(), ['uuid1', 'uuid2']);
                const listeners = EventListener.instances;

                return EventListener.receiversManager.getMessageStream(newDecl.Listener1.port).emitAsync('messages', ['6514'])
                    .then(() => assert.deepStrictEqual(actualData, {
                        [listeners.Listener1.id]: [{ data: '6514', telemetryEventCategory: 'event' }],
                        [listeners['New::Listener1'].id]: [{ data: '6514', telemetryEventCategory: 'event' }]
                    }));
            });
    });

    it('should update config of existing listener', () => {
        const newDecl = util.deepCopy(origDecl);
        newDecl.Listener1 = {
            class: 'Telemetry_Listener',
            port: 9999,
            tag: {
                tenant: 'Tenant',
                application: 'Application'
            },
            trace: true,
            match: 'test',
            actions: [{
                setTag: {
                    application: '`B`',
                    tenant: '`C`'
                }
            }]
        };
        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(activeTracersStub.length, 1);
                assert.strictEqual(allTracersStub.length, 1);
                assert.strictEqual(EventListener.getAll().length, 1);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 1);
                assert.deepStrictEqual(gatherIds(), ['uuid1']);
                const listeners = EventListener.instances;

                assertListener(listeners.Listener1, {
                    tags: { tenant: 'Tenant', application: 'Application' },
                    hasFilterFunc: true,
                    actions: [{
                        enable: true,
                        setTag: {
                            application: '`B`',
                            tenant: '`C`'
                        }
                    }]
                });

                return EventListener.receiversManager.getMessageStream(9999).emitAsync('messages', ['virtual_name="test"'])
                    .then(() => assert.deepStrictEqual(actualData, {
                        [listeners.Listener1.id]: [{
                            virtual_name: 'test',
                            telemetryEventCategory: 'LTM',
                            tenant: 'Tenant',
                            application: 'Application'
                        }]
                    }));
            });
    });

    it('should set minimum and default props', () => {
        const newDecl = util.deepCopy(origDecl);
        newDecl.Listener1 = {
            class: 'Telemetry_Listener'
        };
        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(EventListener.getAll().length, 1);
                assert.strictEqual(EventListener.receiversManager.getAll().length, 1);
                assert.strictEqual(activeTracersStub.length, 0);
                assert.strictEqual(allTracersStub.length, 1);
                assert.deepStrictEqual(gatherIds(), ['uuid1']);
                const listeners = EventListener.instances;

                assertListener(listeners.Listener1, {});

                return EventListener.receiversManager.getMessageStream(defaultDeclarationPort).emitAsync('messages', ['data'])
                    .then(() => assert.deepStrictEqual(actualData, {
                        [listeners.Listener1.id]: [{
                            data: 'data',
                            telemetryEventCategory: 'event'
                        }]
                    }));
            });
    });

    it('should try to restart data receiver 10 times', () => {
        const msStartSpy = sinon.spy(messageStream.MessageStream.prototype, 'restart');
        messageStream.MessageStream.prototype.startHandler.rejects(new Error('test error'));

        const newDecl = util.deepCopy(origDecl);
        newDecl.Listener1 = {
            class: 'Telemetry_Listener',
            port: 9999,
            tag: {
                tenant: 'Tenant',
                application: 'Application'
            },
            trace: true,
            match: 'test',
            actions: [{
                setTag: {
                    application: '`B`',
                    tenant: '`C`'
                }
            }]
        };
        return validateAndNormalizeEmit(util.deepCopy(newDecl))
            .then(() => {
                assert.strictEqual(msStartSpy.callCount, 10);
            });
    });

    it('should destroy all registered data receivers', () => {
        const receivers = [
            EventListener.receiversManager.getMessageStream(6514),
            EventListener.receiversManager.getMessageStream(6515)
        ];
        return Promise.all(receivers.map(r => r.start()))
            .then(() => {
                receivers.forEach(r => assert.isTrue(r.isRunning(), 'should be in running state'));
                return EventListener.receiversManager.destroyAll();
            })
            .then(() => {
                receivers.forEach(r => assert.isTrue(r.isDestroyed(), 'should be destroyed'));
                assert.deepStrictEqual(EventListener.receiversManager.registered, {}, 'should have no registered receivers');
            });
    });
});
