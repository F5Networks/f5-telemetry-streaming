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
const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const net = require('net');
const udp = require('dgram');

const messageStreamTestData = require('../data/messageStreamTestsData');
const messageStream = require('../../../src/lib/eventListener/messageStream');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Message Stream Receiver', () => {
    let dataCallbackSpy;
    let onMockCreatedCallback;
    let receiverInst;
    let serverMocks;

    const testPort = 6514;
    const testAddr = 'localhost10';
    const testAddr6 = '::localhost10';
    const testBufferTimeout = 10 * 1000;

    class MockUdpServer extends EventEmitter {
        setInitArgs(opts) {
            this.opts = opts;
        }

        bind() {
            this.emit('listenMock', this, Array.from(arguments));
        }

        close() {
            this.emit('closeMock', this, Array.from(arguments));
        }
    }

    class MockTcpServer extends EventEmitter {
        setInitArgs(opts) {
            this.opts = opts;
        }

        listen() {
            this.emit('listenMock', this, Array.from(arguments));
        }

        close() {
            this.emit('closeMock', this, Array.from(arguments));
        }
    }

    class MockTcpSocket extends EventEmitter {
        destroy() {}
    }

    const getServerMock = (cls, ipv6) => serverMocks.find(mock => mock instanceof cls && (ipv6 === undefined || (ipv6 && mock.opts.type === 'udp6') || (!ipv6 && mock.opts.type === 'udp4')));
    const createServerMock = (Cls, opts) => {
        const mock = new Cls();
        mock.setInitArgs(opts);
        serverMocks.push(mock);
        if (onMockCreatedCallback) {
            onMockCreatedCallback(mock);
        }
        return mock;
    };

    beforeEach(() => {
        dataCallbackSpy = sinon.spy();
        serverMocks = [];
        receiverInst = new messageStream.MessageStream(testPort, { address: testAddr });
        receiverInst.on('messages', dataCallbackSpy);

        sinon.stub(messageStream.MessageStream, 'MAX_BUFFER_TIMEOUT').value(testBufferTimeout);

        sinon.stub(udp, 'createSocket').callsFake(opts => createServerMock(MockUdpServer, opts));
        sinon.stub(net, 'createServer').callsFake(opts => createServerMock(MockTcpServer, opts));
        onMockCreatedCallback = (serverMock) => {
            serverMock.on('listenMock', () => serverMock.emit('listening'));
            serverMock.on('closeMock', (inst, args) => {
                serverMock.emit('close');
                args[0](); // call callback
            });
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.dataHandler()', () => {
        let socketId = 0;
        const createSocketInfo = (cls, ipv6) => {
            socketId += 1;
            if (cls === MockUdpServer) {
                return {
                    address: ipv6 ? testAddr6 : testAddr,
                    port: testPort + socketId
                };
            }
            const socketMock = new MockTcpSocket();
            socketMock.remoteAddress = ipv6 ? testAddr6 : testAddr;
            socketMock.remotePort = testPort + socketId;
            return socketMock;
        };

        describe('data handling for each protocol', () => {
            const testMessage = '<1>testData\n';

            it('should retrieve data via udp4 socket', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockUdpServer, false);
                    getServerMock(MockUdpServer, false).emit('message', testMessage, socketInfo);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.deepStrictEqual(dataCallbackSpy.args[0], [[testMessage.slice(0, -1)]]);
                }));

            it('should retrieve data via udp6 socket', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockUdpServer, true);
                    getServerMock(MockUdpServer, true).emit('message', testMessage, socketInfo);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.deepStrictEqual(dataCallbackSpy.args[0], [[testMessage.slice(0, -1)]]);
                }));

            it('should retrieve data via tcp socket', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockTcpServer);
                    getServerMock(MockTcpServer).emit('connection', socketInfo);
                    socketInfo.emit('data', testMessage);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.deepStrictEqual(dataCallbackSpy.args[0], [[testMessage.slice(0, -1)]]);
                }));

            it('should retrieve data via all protocol at same time', () => receiverInst.start()
                .then(() => {
                    const socketInfoTcp = createSocketInfo(MockTcpServer);
                    getServerMock(MockTcpServer).emit('connection', socketInfoTcp);
                    const socketInfoUdp4 = createSocketInfo(MockUdpServer, false);
                    const socketInfoUdp6 = createSocketInfo(MockUdpServer, true);

                    socketInfoTcp.emit('data', '<tcp1>start');
                    getServerMock(MockUdpServer, false).emit('message', '<udp4>start', socketInfoUdp4);
                    getServerMock(MockUdpServer, true).emit('message', '<udp6>start', socketInfoUdp6);
                    socketInfoTcp.emit('data', '<tcp1>end\n');
                    getServerMock(MockUdpServer, false).emit('message', '<udp4>end\n', socketInfoUdp4);
                    getServerMock(MockUdpServer, true).emit('message', '<udp6>end\n', socketInfoUdp6);

                    return receiverInst.stop();
                })
                .then(() => {
                    assert.includeDeepMembers(dataCallbackSpy.args, [
                        [['<tcp1>start<tcp1>end']],
                        [['<udp4>start<udp4>end']],
                        [['<udp6>start<udp6>end']]
                    ]);
                }));
        });

        describe('chunked data', () => {
            const fetchEvents = () => {
                const events = [];
                dataCallbackSpy.args.forEach((args) => {
                    args[0].forEach(arg => events.push(arg));
                });
                return events;
            };
            let fakeClock;

            beforeEach(() => {
                fakeClock = sinon.useFakeTimers();
            });

            afterEach(() => {
                fakeClock.restore();
            });

            messageStreamTestData.dataHandler.forEach((testConf) => {
                const separators = JSON.stringify(testConf.chunks).indexOf('{sep}') !== -1 ? ['\n', '\r\n'] : [''];
                separators.forEach((sep) => {
                    let sepMsg = 'built-in the test new line separator';
                    if (sep) {
                        sepMsg = sep.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                    }
                    testUtil.getCallableIt(testConf)(`should process data - ${testConf.name} (${sepMsg})`, () => receiverInst.start()
                        .then(() => {
                            const socketInfo = createSocketInfo(MockUdpServer, false);
                            const server = getServerMock(MockUdpServer, false);
                            testConf.chunks.forEach(chunk => server.emit('message', chunk.replace(/\{sep\}/g, sep), socketInfo));
                            fakeClock.tick(testBufferTimeout * 2);
                            return receiverInst.stop();
                        })
                        .then(() => {
                            assert.deepStrictEqual(fetchEvents(), testConf.expectedData);
                        }));
                });
            });
        });
    });

    describe('.restart()', () => {
        it('should recreate all receivers on restart', () => receiverInst.start()
            .then(() => {
                assert.strictEqual(serverMocks.length, 3, 'should create 3 sockets');
                assert.strictEqual(getServerMock(MockUdpServer, false).opts.type, 'udp4', 'should create udp4 listener');
                assert.strictEqual(getServerMock(MockUdpServer, true).opts.type, 'udp6', 'should create udp6 listener');
                assert.strictEqual(getServerMock(MockTcpServer).opts.allowHalfOpen, false, 'should create tcp listener');
                return receiverInst.restart();
            })
            .then(() => {
                assert.strictEqual(serverMocks.length, 6, 'should create 3 more sockets');
                assert.strictEqual(serverMocks.filter(mock => mock.opts.type === 'udp4').length, 2, 'should have 2 udp4 sockets');
                assert.strictEqual(serverMocks.filter(mock => mock.opts.type === 'udp6').length, 2, 'should have 2 udp6 sockets');
                assert.strictEqual(serverMocks.filter(mock => mock.opts.allowHalfOpen === false).length, 2, 'should have 2 tcp sockets');
            }));
    });

    describe('.start()', () => {
        it('should start receivers', () => receiverInst.start()
            .then(() => {
                assert.strictEqual(serverMocks.length, 3, 'should create 3 sockets');
                assert.strictEqual(getServerMock(MockUdpServer, false).opts.type, 'udp4', 'should create udp4 listener');
                assert.strictEqual(getServerMock(MockUdpServer, true).opts.type, 'udp6', 'should create udp6 listener');
                assert.strictEqual(getServerMock(MockTcpServer).opts.allowHalfOpen, false, 'should create tcp listener');
                assert.isTrue(receiverInst.isRunning(), 'should be in running state');
            }));

        it('should fail to start', () => {
            let firstOnly = false;
            onMockCreatedCallback = (serverMock) => {
                if (!firstOnly) {
                    firstOnly = true;
                    serverMock.on('listenMock', () => {
                        serverMock.emit('close');
                    });
                } else {
                    serverMock.on('listenMock', () => serverMock.emit('listening'));
                }
            };
            return assert.isRejected(receiverInst.start(), /socket closed before/)
                .then(() => {
                    assert.isFalse(receiverInst.isRunning(), 'should not be in running state');
                });
        });

        it('should throw error on unknown protocol', () => {
            receiverInst.protocols = ['test'];
            return assert.isRejected(receiverInst.start(), /Unknown protocol/);
        });
    });

    describe('.stop()', () => {
        it('should be able to stop receiver without active receivers', () => receiverInst.stop()
            .then(() => {
                assert.isFalse(receiverInst.isRunning(), 'should not be in running state');
                assert.isTrue(receiverInst.hasState(messageStream.MessageStream.STATE.STOPPED), 'should have STOPPED state');
            }));

        it('should be able to stop receiver', () => {
            const closeSpy = sinon.spy();
            return receiverInst.start()
                .then(() => {
                    assert.isTrue(receiverInst.hasReceivers(), 'should have receivers started');
                    getServerMock(MockTcpServer).on('close', closeSpy);
                    getServerMock(MockUdpServer, false).on('close', closeSpy);
                    getServerMock(MockUdpServer, true).on('close', closeSpy);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.strictEqual(closeSpy.callCount, 3, 'should close 3 sockets');
                    assert.isFalse(receiverInst.isRunning(), 'should not be in running state');
                    assert.isTrue(receiverInst.hasState(messageStream.MessageStream.STATE.STOPPED), 'should have STOPPED state');
                });
        });
    });
});
