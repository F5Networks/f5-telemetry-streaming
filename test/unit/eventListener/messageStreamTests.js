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

const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const net = require('net');
const udp = require('dgram');

const assert = require('../shared/assert');
const messageStreamTestData = require('../data/messageStreamTestsData');
// const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

// const messageStream = sourceCode('src/lib/eventListener/messageStream');

moduleCache.remember();

describe.skip('Message Stream Receiver', () => {
    let clock;
    let dataCallbackSpy;
    let messageStream;
    let onMockCreatedCallback;
    let rawDataCallbackSpy;
    let receiverInst;
    let serverMocks;
    let socketId;

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

    const getServerMock = (cls, ipv6) => serverMocks.find((mock) => mock instanceof cls && (ipv6 === undefined || (ipv6 && mock.opts.type === 'udp6') || (!ipv6 && mock.opts.type === 'udp4')));
    const createServerMock = (Cls, opts) => {
        const mock = new Cls();
        mock.setInitArgs(opts);
        serverMocks.push(mock);
        if (onMockCreatedCallback) {
            onMockCreatedCallback(mock);
        }
        return mock;
    };

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

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        clock = stubs.clock();
        dataCallbackSpy = sinon.spy();
        rawDataCallbackSpy = sinon.spy();
        serverMocks = [];
        socketId = 0;

        receiverInst = new messageStream.MessageStream(testPort, { address: testAddr });
        receiverInst.on('messages', dataCallbackSpy);
        receiverInst.on('rawData', rawDataCallbackSpy);

        sinon.stub(messageStream.MessageStream, 'MAX_BUFFER_TIMEOUT').value(testBufferTimeout);

        sinon.stub(udp, 'createSocket').callsFake((opts) => createServerMock(MockUdpServer, opts));
        sinon.stub(net, 'createServer').callsFake((opts) => createServerMock(MockTcpServer, opts));
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

    describe('"rawData" event', () => {
        describe('raw data handling for each protocol', () => {
            const testMessage = Buffer.from('<1>testData\n');

            beforeEach(() => {
                receiverInst.enableRawDataForwarding();
            });

            it('should retrieve raw data via udp4 socket', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockUdpServer, false);
                    getServerMock(MockUdpServer, false).emit('message', testMessage, socketInfo);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.deepStrictEqual(
                        rawDataCallbackSpy.args,
                        [[{
                            data: Buffer.from('<1>testData\n'),
                            protocol: 'udp',
                            senderKey: 'udp4-localhost10-6515',
                            timestamp: 0,
                            hrtime: [0, 0]
                        }]]
                    );
                }));

            it('should retrieve data via udp6 socket', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockUdpServer, true);
                    getServerMock(MockUdpServer, true).emit('message', testMessage, socketInfo);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.deepStrictEqual(
                        rawDataCallbackSpy.args,
                        [[{
                            data: Buffer.from('<1>testData\n'),
                            protocol: 'udp',
                            senderKey: 'udp6-::localhost10-6515',
                            timestamp: 0,
                            hrtime: [0, 0]
                        }]]
                    );
                }));

            it('should retrieve data via tcp socket', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockTcpServer);
                    getServerMock(MockTcpServer).emit('connection', socketInfo);
                    socketInfo.emit('data', testMessage);
                    return receiverInst.stop();
                })
                .then(() => {
                    assert.deepStrictEqual(
                        rawDataCallbackSpy.args,
                        [[{
                            data: Buffer.from('<1>testData\n'),
                            protocol: 'tcp',
                            senderKey: 'tcp-localhost10-6515',
                            timestamp: 0,
                            hrtime: [0, 0]
                        }]]
                    );
                }));

            it('should retrieve raw data via all protocol at same time', () => receiverInst.start()
                .then(() => {
                    const socketInfoTcp = createSocketInfo(MockTcpServer); // port 6515
                    getServerMock(MockTcpServer).emit('connection', socketInfoTcp);
                    const socketInfoUdp4 = createSocketInfo(MockUdpServer, false); // port 6516
                    const socketInfoUdp6 = createSocketInfo(MockUdpServer, true); // port 6517

                    socketInfoTcp.emit('data', Buffer.from('<tcp1>start'));
                    getServerMock(MockUdpServer, false).emit('message', Buffer.from('<udp4>start'), socketInfoUdp4);
                    getServerMock(MockUdpServer, true).emit('message', Buffer.from('<udp6>start'), socketInfoUdp6);
                    socketInfoTcp.emit('data', Buffer.from('<tcp1>end\n'));
                    getServerMock(MockUdpServer, false).emit('message', Buffer.from('<udp4>end\n'), socketInfoUdp4);
                    getServerMock(MockUdpServer, true).emit('message', Buffer.from('<udp6>end\n'), socketInfoUdp6);

                    return receiverInst.stop();
                })
                .then(() => {
                    assert.sameDeepMembers(
                        rawDataCallbackSpy.args,
                        [
                            [{
                                data: Buffer.from('<tcp1>start'),
                                protocol: 'tcp',
                                senderKey: 'tcp-localhost10-6515',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }],
                            [{
                                data: Buffer.from('<udp4>start'),
                                protocol: 'udp',
                                senderKey: 'udp4-localhost10-6516',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }],
                            [{
                                data: Buffer.from('<udp6>start'),
                                protocol: 'udp',
                                senderKey: 'udp6-::localhost10-6517',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }],
                            [{
                                data: Buffer.from('<tcp1>end\n'),
                                protocol: 'tcp',
                                senderKey: 'tcp-localhost10-6515',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }],
                            [{
                                data: Buffer.from('<udp4>end\n'),
                                protocol: 'udp',
                                senderKey: 'udp4-localhost10-6516',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }],
                            [{
                                data: Buffer.from('<udp6>end\n'),
                                protocol: 'udp',
                                senderKey: 'udp6-::localhost10-6517',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }]
                        ]
                    );
                }));

            it('should not enable raw data forwarding', () => {
                receiverInst.disableRawDataForwarding();
                return receiverInst.start()
                    .then(() => {
                        const socketInfo = createSocketInfo(MockUdpServer, false);
                        getServerMock(MockUdpServer, false).emit('message', testMessage, socketInfo);
                        clock.clockForward(100, { promisify: true });
                        return testUtil.sleep(1000); // process pending promises
                    })
                    .then(() => receiverInst.stop())
                    .then(() => {
                        assert.lengthOf(rawDataCallbackSpy.args, 0, 'should not forward raw data once disabled');
                    });
            });

            it('should enable/disable raw data forwarding', () => receiverInst.start()
                .then(() => {
                    const socketInfo = createSocketInfo(MockUdpServer, false); // port 6515
                    getServerMock(MockUdpServer, false).emit('message', testMessage, socketInfo);
                    clock.clockForward(100, { promisify: true });
                    return testUtil.sleep(1000); // process pending promises
                })
                .then(() => {
                    assert.deepStrictEqual(
                        rawDataCallbackSpy.args,
                        [[{
                            data: Buffer.from('<1>testData\n'),
                            protocol: 'udp',
                            senderKey: 'udp4-localhost10-6515',
                            timestamp: 0,
                            hrtime: [0, 0]
                        }]]
                    );

                    receiverInst.disableRawDataForwarding();
                    const socketInfo = createSocketInfo(MockUdpServer, false); // port 6516
                    getServerMock(MockUdpServer, false).emit('message', testMessage, socketInfo);
                    return testUtil.sleep(1000); // process pending promises
                })
                .then(() => {
                    assert.lengthOf(rawDataCallbackSpy.args, 1, 'should not forward raw data once disabled');
                })
                .then(() => {
                    receiverInst.enableRawDataForwarding();
                    const socketInfo = createSocketInfo(MockUdpServer, false); // port 6517
                    getServerMock(MockUdpServer, false).emit('message', testMessage, socketInfo);
                    clock.clockForward(100, { promisify: true });
                    return testUtil.sleep(1000); // process pending promises
                })
                .then(() => receiverInst.stop())
                .then(() => {
                    assert.deepStrictEqual(
                        rawDataCallbackSpy.args,
                        [
                            [{
                                data: Buffer.from('<1>testData\n'),
                                protocol: 'udp',
                                senderKey: 'udp4-localhost10-6515',
                                timestamp: 0,
                                hrtime: [0, 0]
                            }],
                            [{
                                data: Buffer.from('<1>testData\n'),
                                protocol: 'udp',
                                senderKey: 'udp4-localhost10-6517',
                                timestamp: 2000,
                                hrtime: [2, 0]
                            }]
                        ]
                    );
                }));
        });
    });

    describe('"messages" event', () => {
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
                    args[0].forEach((arg) => events.push(arg));
                });
                return events;
            };

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
                            testConf.chunks.forEach((chunk) => server.emit('message', chunk.replace(/\{sep\}/g, sep), socketInfo));
                            clock.clockForward(100, { promisify: true });
                            return testUtil.sleep(testBufferTimeout * 4); // sleep to process pending tasks
                        })
                        .then(() => receiverInst.stop())
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
                assert.lengthOf(serverMocks, 3, 'should create 3 sockets');
                assert.strictEqual(getServerMock(MockUdpServer, false).opts.type, 'udp4', 'should create udp4 listener');
                assert.strictEqual(getServerMock(MockUdpServer, true).opts.type, 'udp6', 'should create udp6 listener');
                assert.strictEqual(getServerMock(MockTcpServer).opts.allowHalfOpen, false, 'should create tcp listener');
                return receiverInst.restart();
            })
            .then(() => {
                assert.lengthOf(serverMocks, 6, 'should create 3 more sockets');
                assert.lengthOf(serverMocks.filter((mock) => mock.opts.type === 'udp4'), 2, 'should have 2 udp4 sockets');
                assert.lengthOf(serverMocks.filter((mock) => mock.opts.type === 'udp6'), 2, 'should have 2 udp6 sockets');
                assert.lengthOf(serverMocks.filter((mock) => mock.opts.allowHalfOpen === false), 2, 'should have 2 tcp sockets');
            }));
    });

    describe('.start()', () => {
        it('should start receivers', () => receiverInst.start()
            .then(() => {
                assert.lengthOf(serverMocks, 3, 'should create 3 sockets');
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

        it('should cleanup all pending tasks', () => {
            let socketInfo;
            let server;
            return receiverInst.start()
                .then(() => {
                    socketInfo = createSocketInfo(MockUdpServer, false);
                    server = getServerMock(MockUdpServer, false);
                    server.emit('message', 'test_message="', socketInfo);

                    clock.clockForward(100, { promisify: true });
                    return testUtil.sleep(testBufferTimeout * 4); // sleep to process pending tasks
                })
                .then(() => {
                    assert.deepStrictEqual(dataCallbackSpy.args, [[['test_message="']]], 'should process incomplete message');
                    server.emit('message', 'test_message_2="', socketInfo);
                    return testUtil.sleep(testBufferTimeout / 2); // sleep to process pending tasks
                })
                .then(() => receiverInst.stop())
                .then(() => {
                    assert.lengthOf(dataCallbackSpy.args, 1, 'should not process second message when stopped');
                });
        });
    });
});
