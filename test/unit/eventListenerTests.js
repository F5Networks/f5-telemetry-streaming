/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const net = require('net');
const dgram = require('dgram');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const nodeUtil = require('util');
const EventEmitter = require('events').EventEmitter;
const EventListener = require('../../src/lib/eventListener');
const dataPipeline = require('../../src/lib/dataPipeline');
const testUtil = require('./shared/util');
const eventListenerTestData = require('./data/eventListenerTestsData');
const configWorker = require('../../src/lib/config');
const configUtil = require('../../src/lib/utils/config');
const util = require('../../src/lib/utils/misc');
const tracers = require('../../src/lib/utils/tracer').Tracer;

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Event Listener', () => {
    let eventListener;
    let uuidCounter = 0;

    const validateAndNormalize = function (declaration) {
        return configWorker.validate(util.deepCopy(declaration))
            .then(validated => Promise.resolve(configUtil.normalizeConfig(validated)));
    };

    beforeEach(() => {
        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });
        eventListener = new EventListener('TestEventListener', 6514, {});
    });

    afterEach(() => {
        uuidCounter = 0;
        sinon.restore();
    });

    describe('constructor', () => {
        it('should set minimum and default props', () => {
            assert.strictEqual(eventListener.name, 'TestEventListener');
            assert.strictEqual(eventListener.port, 6514);
            assert.strictEqual(eventListener.protocol, 'tcp');
        });

        it('should set options when opts arg is provided', () => {
            const filterFunc = data => data;
            eventListener = new EventListener(
                'UdpEventListener',
                6514,
                {
                    protocol: 'udp',
                    tags: { any: 'thing', but: 'true' },
                    tracer: { mockTracer: true },
                    actions: [{ doThis: true }],
                    filterFunc
                }
            );
            assert.strictEqual(eventListener.name, 'UdpEventListener');
            assert.strictEqual(eventListener.port, 6514);
            assert.strictEqual(eventListener.protocol, 'udp');
            assert.deepStrictEqual(eventListener.tags, { any: 'thing', but: 'true' });
            assert.deepStrictEqual(eventListener.tracer, { mockTracer: true });
            assert.deepStrictEqual(eventListener.actions, [{ doThis: true }]);
            assert.deepStrictEqual(eventListener.filterFunc, filterFunc);
        });
    });

    describe('.processData', () => {
        let actualData;
        let loggerSpy;
        beforeEach(() => {
            actualData = [];
            sinon.stub(dataPipeline, 'process').callsFake((dataCtx) => {
                actualData.push(dataCtx.data);
                return Promise.resolve();
            });
            loggerSpy = sinon.spy(eventListener.logger, 'exception');
        });
        eventListenerTestData.processData.forEach((testSet) => {
            testUtil.getCallableIt(testSet)(testSet.name, () => eventListener.processData(testSet.rawData)
                .then(() => {
                    assert.isTrue(loggerSpy.notCalled);
                    assert.deepStrictEqual(actualData, testSet.expectedData);
                }));
        });
    });

    describe('.processRawData', () => {
        let actualData;
        let loggerSpy;
        const connInfo = { address: '127.0.0.1', port: '5555' };
        beforeEach(() => {
            actualData = [];
            sinon.stub(eventListener, 'processData').callsFake((data) => {
                actualData.push(data);
                return Promise.resolve();
            });
            loggerSpy = sinon.spy(eventListener.logger, 'exception');
        });
        eventListenerTestData.processRawData.forEach((testSet) => {
            testUtil.getCallableIt(testSet)(testSet.name, () => Promise.resolve()
                .then(() => {
                    testSet.rawData.forEach((rawData) => {
                        eventListener.processRawData(rawData, connInfo);
                    });
                    // should be enough time to process and log exception
                    return new Promise(resolve => setTimeout(resolve, 1000));
                })
                .then(() => {
                    assert.isTrue(loggerSpy.notCalled);
                    assert.deepStrictEqual(actualData, testSet.expectedData);
                }));
        });

        it('should flush all data immediately once number of timeouts reached maximum', () => {
            // max number of timeouts is 5, see source code for more details
            const maxTimeouts = 5;
            for (let i = 0; i < maxTimeouts + 1; i += 1) {
                eventListener.processRawData(i.toString(), connInfo);
            }
            assert.deepStrictEqual(eventListener._connDataBuffers, {}, 'should have no connection records once data flushed');
            assert.deepStrictEqual(actualData, ['012345']);
        });

        it('should flush all data immediately once number of timeouts reached maximum (twice more than number of max timeouts)', () => {
            // max number of timeouts is 5, see source code for more details
            const maxTimeouts = 5 * 2;
            for (let i = 0; i < maxTimeouts + 2; i += 1) {
                eventListener.processRawData(i.toString(), connInfo);
            }
            assert.deepStrictEqual(eventListener._connDataBuffers, {}, 'should have no connection records once data flushed');
            assert.deepStrictEqual(actualData, ['012345', '67891011']);
        });
    });

    describe('tcp listener', () => {
        function MockClientSocket() {
            EventEmitter.call(this);
        }
        nodeUtil.inherits(MockClientSocket, EventEmitter);

        function MockTcpServer(connCb) {
            EventEmitter.call(this);
            this.on('connection', () => connCb);
            this.listen = (opts) => {
                assert.deepStrictEqual(opts, { port: '6514' });
                this.emit('connection');
            };
        }
        nodeUtil.inherits(MockTcpServer, EventEmitter);

        let logExceptionSpy;
        let processRawDataSpy;
        let tcpListener;
        let mockSocket;

        beforeEach(() => {
            mockSocket = new MockClientSocket();
            sinon.stub(net, 'createServer').callsFake(connCb => new MockTcpServer(connCb(mockSocket)));

            tcpListener = new EventListener('tcpListener', '6514', { protocol: 'tcp' });
            processRawDataSpy = sinon.spy(tcpListener, 'processRawData');
            logExceptionSpy = sinon.spy(tcpListener.logger, 'exception');
        });

        it('should start, listen and process received data', () => Promise.resolve()
            .then(() => {
                tcpListener.start();
                assert.isNotNull(tcpListener._server);
                mockSocket.emit('data', 'pandas eat from 25-40 lbs of bamboo per day');
            })
            .then(() => {
                assert.isTrue(logExceptionSpy.notCalled);
                assert.isTrue(processRawDataSpy.calledOnce);
                assert.deepStrictEqual(processRawDataSpy.getCall(0).args[0], 'pandas eat from 25-40 lbs of bamboo per day');
            }));
    });

    describe('udp listener', () => {
        let mockUdpSocket;
        let udpListener;
        let logExceptionSpy;
        let processRawDataSpy;

        function MockUdpSocket() {
            EventEmitter.call(this);
            this.bind = (opts) => {
                assert.deepStrictEqual(opts, 6543);
            };
        }
        nodeUtil.inherits(MockUdpSocket, EventEmitter);

        beforeEach(() => {
            mockUdpSocket = new MockUdpSocket();
            sinon.stub(dgram, 'createSocket').callsFake((opts) => {
                assert.deepStrictEqual(opts, { type: 'udp6', ipv6Only: false });
                return mockUdpSocket;
            });
            udpListener = new EventListener('udpListener', 6543, { protocol: 'udp' });
            processRawDataSpy = sinon.spy(udpListener, 'processRawData');
            logExceptionSpy = sinon.spy(udpListener.logger, 'exception');
        });

        it('should start, listen and process received data', () => Promise.resolve()
            .then(() => {
                udpListener.start();
                assert.isNotNull(udpListener._server);
                mockUdpSocket.emit('message', Buffer.from('pandas eat for up to 14 hours a day'), { });
            })
            .then(() => {
                assert.isTrue(logExceptionSpy.notCalled);
                assert.isTrue(processRawDataSpy.calledOnce);
                assert.deepStrictEqual(processRawDataSpy.getCall(0).args[0], 'pandas eat for up to 14 hours a day');
            }));
    });

    describe('config change', () => {
        let listenerStub;
        let allTracersStub;
        let activeTracersStub;

        const origDecl = {
            class: 'Telemetry',
            Listener1: {
                class: 'Telemetry_Listener',
                port: 1234,
                tag: {
                    tenant: '`T`',
                    application: '`A`'
                }
            }
        };

        const assertListener = function (actualListener, expListener) {
            const protocols = ['tcp', 'udp'];
            protocols.forEach((p) => {
                assert.deepStrictEqual(actualListener[p].port, expListener.port);
                assert.deepStrictEqual(actualListener[p].id, expListener.id);
                assert.deepStrictEqual(actualListener[p].tags, expListener.tags);
                if (expListener.hasFilterFunc) {
                    assert.isNotNull(actualListener[p].filterFunc);
                } else {
                    assert.isNull(actualListener[p].filterFunc);
                }
            });
        };

        beforeEach(() => {
            activeTracersStub = [];
            allTracersStub = [];
            listenerStub = { start: 0, stop: 0 };

            sinon.stub(EventListener.prototype, 'start').callsFake(() => {
                listenerStub.start += 1;
            });
            sinon.stub(EventListener.prototype, 'stop').callsFake(() => {
                listenerStub.stop += 1;
            });

            sinon.stub(tracers, 'createFromConfig').callsFake((className, objName, config) => {
                allTracersStub.push(objName);
                if (config.trace) {
                    activeTracersStub.push(objName);
                }
                return null;
            });

            return validateAndNormalize(origDecl)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const listeners = eventListener.getListeners();
                    assert.strictEqual(Object.keys(listeners).length, 1);
                    assertListener(listeners.Listener1, {
                        port: 1234, id: 'uuid1', tags: { tenant: '`T`', application: '`A`' }
                    });
                    assert.deepStrictEqual(listenerStub, { start: 2, stop: 0 });
                    assert.strictEqual(allTracersStub.length, 2);
                    assert.strictEqual(activeTracersStub.length, 0);
                })
                .then(() => {
                    // reset counts
                    activeTracersStub = [];
                    allTracersStub = [];
                    listenerStub = { start: 0, stop: 0 };
                    uuidCounter = 0;
                });
        });

        afterEach(() => configWorker.emitAsync('change', { components: [], mappings: {} })
            .then(() => {
                const listeners = eventListener.getListeners();
                assert.strictEqual(Object.keys(listeners).length, 0);
            }));

        it('should create listeners with default and custom opts on config change event (no prior config)', () => {
            const newDecl = util.deepCopy(origDecl);
            newDecl.Listener2 = {
                class: 'Telemetry_Listener',
                match: 'somePattern',
                trace: true
            };

            return validateAndNormalize(newDecl)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    // only start Listener2, 2 has been started from the orig config
                    assert.deepStrictEqual(listenerStub, { start: 2, stop: 0 });
                    assert.strictEqual(activeTracersStub.length, 2);
                    assert.strictEqual(allTracersStub.length, 4);

                    const listeners = eventListener.getListeners();
                    assertListener(listeners.Listener1, {
                        port: 1234, id: 'uuid1', tags: { tenant: '`T`', application: '`A`' }
                    });
                    assertListener(listeners.Listener2, {
                        port: 6514, id: 'uuid2', tags: {}, hasFilterFunc: true
                    });
                });
        });

        it('should stop existing listener(s) when removed from config', () => configWorker.emitAsync('change', { components: [], mappings: {} })
            .then(() => {
                assert.deepStrictEqual(listenerStub, { start: 0, stop: 2 });
                assert.strictEqual(activeTracersStub.length, 0);
                assert.strictEqual(allTracersStub.length, 0);

                const listeners = eventListener.getListeners();
                assert.strictEqual(Object.keys(listeners).length, 0);
            }));

        it('should update existing listener(s) without restarting if port is the same', () => {
            const newDecl = util.deepCopy(origDecl);
            newDecl.Listener1.trace = true;
            const updateSpy = sinon.stub(EventListener.prototype, 'updateConfig');
            return validateAndNormalize(newDecl)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    assert.deepStrictEqual(listenerStub, { start: 0, stop: 0 });
                    assert.strictEqual(activeTracersStub.length, 2);
                    assert.strictEqual(allTracersStub.length, 2);

                    const listeners = eventListener.getListeners();
                    assertListener(listeners.Listener1, {
                        port: 1234, id: 'uuid1', tags: { tenant: '`T`', application: '`A`' }
                    });
                    // one for each protocol
                    assert.isTrue(updateSpy.calledTwice);
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
                    assert.deepStrictEqual(listenerStub, { start: 2, stop: 0 });
                    assert.strictEqual(activeTracersStub.length, 2);
                    assert.strictEqual(allTracersStub.length, 2);

                    const listeners = eventListener.getListeners();
                    assertListener(listeners.Listener1, {
                        port: 1234, id: 'uuid1', tags: { tenant: '`T`', application: '`A`' }
                    });
                    assertListener(listeners['New::Listener1'], {
                        port: 2345, id: 'uuid2', tags: {}
                    });
                    // one for each protocol, called through constructor
                    assert.isTrue(updateSpy.calledTwice);
                });
        });
    });
});
