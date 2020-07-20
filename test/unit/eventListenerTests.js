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

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const EventListener = require('../../src/lib/eventListener');
const dataPipeline = require('../../src/lib/dataPipeline');
const testUtil = require('./shared/util');
const eventListenerTestData = require('./eventListenerTestsData');
const configWorker = require('../../src/lib/config');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Event Listener', () => {
    let eventListener;

    beforeEach(() => {
        eventListener = new EventListener('TestEventListener', 6514, {});
    });

    afterEach(() => {
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

    describe('.processEvent', () => {
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
        eventListenerTestData.processEvent.forEach((testSet) => {
            testUtil.getCallableIt(testSet)(testSet.name, () => Promise.resolve()
                .then(() => {
                    eventListener.processEvent(testSet.rawData);
                    // should be enough time to process and log exception
                    return new Promise(resolve => setTimeout(resolve, 1000));
                })
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
            sinon.stub(eventListener, 'processEvent').callsFake((data) => {
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
    });
    describe('tcp listener', () => {
        function MockClientSocket() {
            EventEmitter.call(this);
        }
        util.inherits(MockClientSocket, EventEmitter);

        function MockTcpServer(connCb) {
            EventEmitter.call(this);
            this.on('connection', () => connCb);
            this.listen = (opts) => {
                assert.deepStrictEqual(opts, { port: '6514' });
                this.emit('connection');
            };
        }
        util.inherits(MockTcpServer, EventEmitter);

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
        util.inherits(MockUdpSocket, EventEmitter);

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
        beforeEach(() => {
            sinon.stub(EventListener.prototype, 'start').returns();
        });
        it('should create listeners with default and custom opts on config change event', () => {
            const config = {
                Telemetry_Listener: {
                    Listener1: {
                        port: 1234,
                        tag: {
                            tenant: '`T`',
                            application: '`A`'
                        }
                    },
                    Listener2: {
                        match:
                        'somePattern'
                    }
                }
            };

            return Promise.resolve()
                .then(() => {
                    configWorker.emit('change', config);
                    return new Promise(resolve => setTimeout(resolve, 500));
                })
                .then(() => {
                    const listeners = eventListener.getListeners();
                    assert.strictEqual(listeners.Listener1.tcp.port, 1234);
                    assert.strictEqual(listeners.Listener1.udp.port, 1234);
                    assert.deepStrictEqual(listeners.Listener1.tcp.tags, { tenant: '`T`', application: '`A`' });
                    assert.deepStrictEqual(listeners.Listener1.udp.tags, { tenant: '`T`', application: '`A`' });

                    assert.strictEqual(listeners.Listener2.tcp.port, 6514);
                    assert.strictEqual(listeners.Listener2.udp.port, 6514);
                    assert.isNotNull(listeners.Listener2.tcp.filterFunc);
                    assert.isNotNull(listeners.Listener2.udp.filterFunc);
                });
        });
    });
});
