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
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const constants = sourceCode('src/lib/constants');
const hrtimestamp = sourceCode('src/lib/utils/datetime').hrtimestamp;
const networkService = sourceCode('src/lib/eventListener/networkService');

moduleCache.remember();

describe('Event Listener / TCP and UDP Services', () => {
    before(() => {
        moduleCache.restore();
    });

    let coreStub;
    let dataReceivers;
    let receiverInst;

    const testPort = 6514;
    const testAddr = 'localhost10';
    const testAddr6 = '::localhost10';

    class DataReceiver {
        constructor(remoteInfo) {
            this.closed = false;
            this.data = [];
            this.remoteInfo = remoteInfo;
            this.lastPush = hrtimestamp();
        }

        close() {
            this.closed = true;
        }

        lastPushTimeDelta() {
            return hrtimestamp() - this.lastPush;
        }

        push(data) {
            this.lastPush = hrtimestamp();
            this.data.push(data);
        }
    }

    function createDataReceiver(remoteInfo) {
        const inst = new DataReceiver(remoteInfo);
        dataReceivers.push(inst);
        return inst;
    }

    function checkState(service, state) {
        const statuses = {
            destroyed: false,
            restarting: false,
            running: false,
            stopped: false
        };
        statuses[state] = true;
        assert.deepStrictEqual(service.isDestroyed(), statuses.destroyed, 'should match expected destroyed state');
        assert.deepStrictEqual(service.isRestarting(), statuses.restarting, 'should match expected restarting state');
        assert.deepStrictEqual(service.isRunning(), statuses.running, 'should match expected running state');
        assert.deepStrictEqual(service.isStopped(), statuses.stopped, 'should match expected stopped state');
    }

    function shouldLogMsg(lvl, msg) {
        msg = arguments.length === 1 ? lvl : msg;
        lvl = arguments.length === 1 ? 'debug' : lvl;
        assert.includeMatch(coreStub.logger.messages[lvl], msg);
    }

    function shouldNotLogMsg(lvl, msg) {
        msg = arguments.length === 1 ? lvl : msg;
        lvl = arguments.length === 1 ? 'debug' : lvl;
        assert.notIncludeMatch(coreStub.logger.messages[lvl], msg);
    }

    beforeEach(() => {
        sinon.stub(constants.EVENT_LISTENER, 'NETWORK_SERVICE_RESTART_DELAY').value(1);
        coreStub = stubs.default.coreStub({
            logger: true
        });
        dataReceivers = [];
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('BaseNetworkService', () => {
        beforeEach(() => {
            receiverInst = new networkService.BaseNetworkService(
                createDataReceiver,
                testPort,
                { address: testAddr }
            );
        });

        it('should return receiver options', () => {
            assert.deepStrictEqual(receiverInst.getReceiverOptions(), {
                port: testPort,
                address: testAddr
            });
        });

        it('should return restart options', () => {
            assert.deepStrictEqual(receiverInst.getRestartOptions(), {
                delay: 1
            });
            assert.isTrue(receiverInst.restartsEnabled);
        });
    });

    describe('TCPService', () => {
        class MockSocket extends EventEmitter {
            constructor() {
                super();
                sinon.spy(this, 'destroy');
            }

            destroy() {
                setImmediate(() => this.emit('destroyMock', this));
            }
        }
        class MockServer extends EventEmitter {
            constructor() {
                super();
                sinon.spy(this, 'close');
                sinon.spy(this, 'listen');
            }

            setInitArgs(opts) {
                this.opts = opts;
            }

            listen() {
                setImmediate(() => this.emit('listenMock', this, Array.from(arguments)));
            }

            close() {
                setImmediate(() => this.emit('closeMock', this, Array.from(arguments)));
            }
        }

        let createServerMockCb;

        beforeEach(() => {
            receiverInst = new networkService.TCPService(createDataReceiver, testPort, { address: testAddr });

            sinon.stub(net, 'createServer').callsFake(function () {
                const serverMock = new MockServer();
                serverMock.setInitArgs.apply(serverMock, arguments);
                if (createServerMockCb) {
                    createServerMockCb(serverMock);
                }
                return serverMock;
            });
        });

        afterEach(() => {
            createServerMockCb = null;
        });

        describe('data handling', () => {
            let socketId;
            let serverMock;

            const createMockSocket = () => {
                socketId += 1;
                const socketMock = new MockSocket();
                socketMock.remoteAddress = testAddr;
                socketMock.remotePort = testPort + socketId;
                socketMock.remoteFamily = 'IPV4';
                return socketMock;
            };

            beforeEach(() => {
                socketId = 0;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('listenMock', () => setImmediate(() => serverMock.emit('listening')));
                    serverMock.on('closeMock', (inst, args) => setImmediate(() => Promise.resolve(serverMock.emit('close')).then(args[0])));
                };
            });

            afterEach(() => {
                serverMock = null;
            });

            it('should handle incoming data', () => receiverInst.start()
                .then(() => {
                    checkState(receiverInst, 'running');

                    const socket1 = createMockSocket();
                    serverMock.emit('connection', socket1);

                    const socket2 = createMockSocket();
                    serverMock.emit('connection', socket2);

                    return testUtil.waitTill(() => {
                        try {
                            assert.lengthOf(dataReceivers, 2);
                            shouldLogMsg('verbose', /new connection/);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    })
                        .then(() => {
                            socket1.emit('data', '1');
                            socket2.emit('data', '2');
                            socket1.emit('data', '3');
                            socket2.emit('data', '4');
                        });
                })
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    shouldLogMsg(/closing all client connections/);
                    assert.lengthOf(dataReceivers, 2);

                    dataReceivers.forEach((rec) => {
                        assert.isTrue(rec.closed, 'should be closed');
                    });

                    assert.deepStrictEqual(dataReceivers[0].remoteInfo, {
                        address: testAddr,
                        port: testPort + 1,
                        family: 'IPV4'
                    });
                    assert.deepStrictEqual(dataReceivers[0].data, ['1', '3']);

                    assert.deepStrictEqual(dataReceivers[1].remoteInfo, {
                        address: testAddr,
                        port: testPort + 2,
                        family: 'IPV4'
                    });
                    assert.deepStrictEqual(dataReceivers[1].data, ['2', '4']);
                    assert.deepStrictEqual(receiverInst._connections, []);

                    shouldLogMsg('verbose', new RegExp(`removing connection.*${testPort + 1}`));
                    shouldLogMsg('verbose', new RegExp(`removing connection.*${testPort + 2}`));
                }));
        });

        describe('restart', () => {
            beforeEach(() => {
                createServerMockCb = (newServerMock) => {
                    const serverMock = newServerMock;
                    serverMock.on('listenMock', () => setImmediate(() => serverMock.emit('listening')));
                    serverMock.on('closeMock', (inst, args) => setImmediate(() => Promise.resolve(serverMock.emit('close')).then(args[0])));
                };
            });

            it('should restart receiver when caught error', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('listenMock', () => setImmediate(() => serverMock.emit('listening')));
                    serverMock.on('closeMock', (inst, args) => setImmediate(() => args[0]()));
                };

                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg('listening');

                        serverMock.emit('error', new Error('onUncaughtError'));
                        return testUtil.waitTill(() => {
                            try {
                                shouldLogMsg(/restarting/);
                                return true;
                            } catch (err) {
                                return false;
                            }
                        });
                    })
                    .then(() => testUtil.waitTill(() => receiverInst.isRunning()))
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg(/attempt #1 of Infinity/);
                        assert.deepStrictEqual(net.createServer.callCount, 2, 'should call net.createServer() twice');
                    });
            });

            it('should recreate server on restart', () => receiverInst.restart()
                .then(() => {
                    checkState(receiverInst, 'running');
                    assert.deepStrictEqual(net.createServer.callCount, 1, 'should create server once');
                    coreStub.logger.removeAllMessages();
                    return receiverInst.restart();
                })
                .then(() => {
                    checkState(receiverInst, 'running');
                    assert.deepStrictEqual(net.createServer.callCount, 2, 'should create server twice');
                    shouldLogMsg('listening');
                    shouldLogMsg('closed');
                    shouldLogMsg('closing all client connections');
                }));
        });

        describe('.start()', () => {
            it('should start receiver', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('listenMock', (inst, args) => {
                        assert.deepStrictEqual(args[0], { port: testPort, address: testAddr }, 'should match listen options');
                        setImmediate(() => serverMock.emit('listening'));
                    });
                };
                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg('listening');
                        assert.deepStrictEqual(serverMock.listen.callCount, 1, 'should call .listen() only once');
                        assert.deepStrictEqual(serverMock.close.callCount, 0, 'should not call .close()');
                        assert.deepStrictEqual(serverMock.opts, { allowHalfOpen: false, pauseOnConnect: false }, 'should match server options');
                    });
            });

            it('should fail to start when socket was closed before become active', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('listenMock', () => setImmediate(() => serverMock.emit('close')));
                    serverMock.on('closeMock', (inst, args) => setImmediate(() => args[0]()));
                };
                return assert.isRejected(receiverInst.start(), /socket closed before/)
                    .then(() => {
                        shouldLogMsg('closed');
                        checkState(receiverInst, 'stopped');
                        assert.deepStrictEqual(serverMock.listen.callCount, 1, 'should call .listen() only once');
                        assert.deepStrictEqual(serverMock.close.callCount, 1, 'should call .close() only once');
                    });
            });

            it('should fail to start when error raised before socket become active', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('listenMock', () => setImmediate(() => serverMock.emit('error', new Error('test error'))));
                    serverMock.on('closeMock', (inst, args) => setImmediate(() => args[0]()));
                };
                return assert.isRejected(receiverInst.start(), /test error/)
                    .then(() => {
                        checkState(receiverInst, 'stopped');
                        shouldLogMsg(/failed to start due error.*starting/);
                        assert.deepStrictEqual(serverMock.listen.callCount, 1, 'should call .listen() only once');
                        assert.deepStrictEqual(serverMock.close.callCount, 1, 'should call .close() only once');
                    });
            });
        });

        describe('.stop()', () => {
            let serverMock;

            beforeEach(() => {
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('listenMock', () => serverMock.emit('listening'));
                    serverMock.on('closeMock', (inst, args) => {
                        serverMock.emit('close');
                        args[0](); // call callback
                    });
                };
            });

            afterEach(() => {
                serverMock = null;
            });

            it('should be able to stop receiver', () => receiverInst.start()
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    shouldLogMsg('listening');
                    shouldLogMsg('closed');
                    shouldNotLogMsg(/socket closed before being ready/);
                }));

            it('should close all opened connections', () => {
                const sockets = [];
                const createMockSocket = () => {
                    const socketMock = new MockSocket();
                    socketMock.remoteAddress = testAddr;
                    socketMock.remotePort = testPort + sockets.length;
                    socketMock.destroy = sinon.spy(() => {
                        socketMock.emit('close');
                    });
                    sockets.push(socketMock);
                    return socketMock;
                };
                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg('listening');

                        for (let i = 0; i < 10; i += 1) {
                            serverMock.emit('connection', createMockSocket());
                        }
                        // close first socket to check that socket was removed from list
                        sockets[0].emit('close');
                        // should call socket.destroy and remove socket from list too
                        sockets[5].emit('error');

                        return testUtil.waitTill(() => {
                            try {
                                shouldLogMsg('verbose', /removing connection/);
                                coreStub.logger.removeAllMessages();
                                return true;
                            } catch (err) {
                                return false;
                            }
                        });
                    })
                    .then(() => receiverInst.stop())
                    .then(() => {
                        checkState(receiverInst, 'stopped');
                        shouldLogMsg('closed');
                        assert.strictEqual(sockets[0].destroy.callCount, 0, 'should not call socket.destroy for closed socket');
                        sockets.slice(1).forEach((socketMock) => {
                            assert.strictEqual(socketMock.destroy.callCount, 1, 'should call socket.destroy just once for each socket');
                        });

                        shouldNotLogMsg('verbose', new RegExp(`removing connection.*${testPort}`));
                        shouldNotLogMsg('verbose', new RegExp(`removing connection.*${testPort + 5}`));

                        for (let i = 0; i < 10; i += 1) {
                            if (i !== 0 && i !== 5) {
                                shouldLogMsg('verbose', new RegExp(`removing connection.*${testPort + i}`));
                            }
                        }

                        assert.lengthOf(dataReceivers, 10);
                        dataReceivers.forEach((rec) => {
                            assert.isTrue(rec.closed, 'should be closed');
                        });
                        assert.deepStrictEqual(receiverInst._connections, []);
                    });
            });
        });
    });

    describe('UDPService', () => {
        class MockServer extends EventEmitter {
            constructor() {
                super();
                sinon.spy(this, 'close');
                sinon.spy(this, 'bind');
            }

            setInitArgs(opts) {
                this.opts = opts;
            }

            bind() {
                setImmediate(() => this.emit('bindMock', this, Array.from(arguments)));
            }

            close() {
                setImmediate(() => this.emit('closeMock', this, Array.from(arguments)));
            }
        }

        let createServerMockCb;

        beforeEach(() => {
            receiverInst = new networkService.UDPService(createDataReceiver, testPort, { address: testAddr });

            sinon.stub(udp, 'createSocket').callsFake(function () {
                const serverMock = new MockServer();
                serverMock.setInitArgs.apply(serverMock, arguments);
                if (createServerMockCb) {
                    serverMock.on('closeMock', (inst, args) => setImmediate(() => Promise.resolve(serverMock.emit('close')).then(args[0])));
                    createServerMockCb(serverMock);
                }
                return serverMock;
            });
        });

        afterEach(() => {
            createServerMockCb = null;
            return receiverInst && receiverInst.destroy();
        });

        describe('data handling', () => {
            let socketId;
            let serverMock;

            const createSocketInfo = () => ({
                address: testAddr,
                // eslint-disable-next-line no-plusplus
                port: testPort + socketId++,
                family: 'IPV4'
            });

            beforeEach(() => {
                socketId = 0;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('listening')));
                };
            });

            afterEach(() => {
                serverMock = null;
            });

            it('should handle incoming data', () => receiverInst.start()
                .then(() => {
                    checkState(receiverInst, 'running');

                    const socketInfo1 = createSocketInfo();
                    serverMock.emit('message', '1', socketInfo1);

                    const socketInfo2 = createSocketInfo();
                    serverMock.emit('message', '2', socketInfo2);

                    serverMock.emit('message', '3', socketInfo1);
                    serverMock.emit('message', '4', socketInfo2);

                    return testUtil.waitTill(() => {
                        try {
                            assert.lengthOf(dataReceivers, 2);
                            assert.deepStrictEqual(
                                dataReceivers.reduce((a, r) => a + r.data.length, 0),
                                4
                            );
                            return true;
                        } catch (err) {
                            return false;
                        }
                    });
                })
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    shouldLogMsg(/closing all client connections/);
                    assert.lengthOf(dataReceivers, 2);

                    dataReceivers.forEach((rec) => {
                        assert.isTrue(rec.closed, 'should be closed');
                    });

                    assert.deepStrictEqual(dataReceivers[0].remoteInfo, {
                        address: testAddr,
                        port: testPort,
                        family: 'IPV4'
                    });
                    assert.deepStrictEqual(dataReceivers[0].data, ['1', '3']);

                    assert.deepStrictEqual(dataReceivers[1].remoteInfo, {
                        address: testAddr,
                        port: testPort + 1,
                        family: 'IPV4'
                    });
                    assert.deepStrictEqual(dataReceivers[1].data, ['2', '4']);

                    assert.deepStrictEqual(receiverInst._connections, {});
                    shouldLogMsg('verbose', new RegExp(`removing connection.*${testPort}`));
                    shouldLogMsg('verbose', new RegExp(`removing connection.*${testPort + 1}`));
                }));

            it('should remove stale connections', () => {
                sinon.stub(constants.EVENT_LISTENER, 'UDP_STALE_CONN_INTERVAL').value(1); // check every 1 ms.
                sinon.stub(constants.EVENT_LISTENER, 'UDP_STALE_CONN_TIMEOUT').value(10e6); // timeout 10ms.

                const socketInfo1 = createSocketInfo();
                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        serverMock.emit('message', '1', socketInfo1);
                        return testUtil.waitTill(() => dataReceivers[0] && dataReceivers[0].data.length > 0);
                    })
                    .then(() => {
                        serverMock.emit('message', '2', socketInfo1);
                        return testUtil.waitTill(() => dataReceivers[0].data.length > 1);
                    })
                    .then(() => testUtil.waitTill(() => {
                        try {
                            shouldLogMsg('verbose', /removing connection/);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    }))
                    .then(() => {
                        assert.isAbove(hrtimestamp() - dataReceivers[0].lastPush, 10e6, 'should remove stale connection after timeout');
                        assert.isTrue(dataReceivers[0].closed, 'should close data handler');
                        serverMock.emit('message', '3', socketInfo1);
                        return testUtil.waitTill(() => dataReceivers[1] && dataReceivers[1].data.length > 0);
                    })
                    .then(() => {
                        assert.isTrue(dataReceivers[0].closed);
                        assert.deepStrictEqual(dataReceivers[0].data, ['1', '2']);
                        assert.deepStrictEqual(dataReceivers[1].data, ['3']);
                    });
            });
        });

        describe('restart', () => {
            beforeEach(() => {
                createServerMockCb = (newServerMock) => {
                    const serverMock = newServerMock;
                    serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('listening')));
                };
            });

            it('should restart receiver when caught error', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('listening')));
                };

                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg('listening');

                        serverMock.emit('error', new Error('onUncaughtError'));
                        return testUtil.waitTill(() => {
                            try {
                                shouldLogMsg(/restarting/);
                                return true;
                            } catch (err) {
                                return false;
                            }
                        });
                    })
                    .then(() => testUtil.waitTill(() => receiverInst.isRunning()))
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg(/attempt #1 of Infinity/);
                        assert.deepStrictEqual(udp.createSocket.callCount, 2, 'should call net.createServer() twice');
                    });
            });

            it('should recreate server on restart', () => receiverInst.restart()
                .then(() => {
                    checkState(receiverInst, 'running');
                    assert.deepStrictEqual(udp.createSocket.callCount, 1, 'should create server once');
                    coreStub.logger.removeAllMessages();
                    return receiverInst.restart();
                })
                .then(() => {
                    checkState(receiverInst, 'running');
                    assert.deepStrictEqual(udp.createSocket.callCount, 2, 'should create server twice');
                    shouldLogMsg('listening');
                    shouldLogMsg('closed');
                    shouldLogMsg('closing all client connections');
                }));
        });

        describe('.start()', () => {
            it('should start receiver (udp4 by default)', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', (inst, args) => {
                        assert.deepStrictEqual(args[0], { port: testPort, address: testAddr }, 'should match listen options');
                        setImmediate(() => serverMock.emit('listening'));
                    });
                };
                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg('listening');
                        assert.deepStrictEqual(serverMock.opts, { type: 'udp4', ipv6Only: false, reuseAddr: true }, 'should match socket options');
                    });
            });

            it('should start receiver (udp6)', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', (inst, args) => {
                        assert.deepStrictEqual(args[0], { port: testPort, address: testAddr }, 'should match listen options');
                        setImmediate(() => serverMock.emit('listening'));
                    });
                };
                receiverInst = new networkService.UDPService(createDataReceiver, testPort, { address: testAddr }, 'udp6');
                return receiverInst.start()
                    .then(() => {
                        checkState(receiverInst, 'running');
                        shouldLogMsg('listening');
                        assert.deepStrictEqual(serverMock.opts, { type: 'udp6', ipv6Only: true, reuseAddr: true }, 'should match socket options');
                    });
            });

            it('should fail to start when socket was closed before become active', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('close')));
                };
                return assert.isRejected(receiverInst.start(), /socket closed before being ready/)
                    .then(() => {
                        checkState(receiverInst, 'stopped');
                        shouldLogMsg(/failed to start due error.*starting/);
                        assert.deepStrictEqual(serverMock.bind.callCount, 1, 'should call .bind() only once');
                        assert.deepStrictEqual(serverMock.close.callCount, 1, 'should call .close() only once');
                    });
            });

            it('should fail to start when error raised before socket become active', () => {
                let serverMock;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('error', new Error('test error'))));
                };
                return assert.isRejected(receiverInst.start(), /test error/)
                    .then(() => {
                        checkState(receiverInst, 'stopped');
                        shouldLogMsg(/failed to start due error.*starting/);
                        assert.deepStrictEqual(serverMock.bind.callCount, 1, 'should call .bind() only once');
                        assert.deepStrictEqual(serverMock.close.callCount, 1, 'should call .close() only once');
                    });
            });
        });

        describe('.stop()', () => {
            let serverMock;
            let socketId;

            const createSocketInfo = () => ({
                address: testAddr,
                // eslint-disable-next-line no-plusplus
                port: testPort + socketId++,
                family: 'IPV4'
            });

            beforeEach(() => {
                socketId = 0;
                createServerMockCb = (newServerMock) => {
                    serverMock = newServerMock;
                    serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('listening')));
                };
            });

            afterEach(() => {
                serverMock = null;
            });

            it('should be able to stop receiver', () => receiverInst.start()
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    shouldLogMsg('listening');
                    shouldLogMsg('closed');
                    shouldNotLogMsg(/socket closed before being ready/);
                }));

            it('should close all opened connections', () => receiverInst.start()
                .then(() => {
                    checkState(receiverInst, 'running');
                    shouldLogMsg('listening');

                    for (let i = 0; i < 10; i += 1) {
                        serverMock.emit('message', '1', createSocketInfo());
                    }

                    return testUtil.waitTill(() => {
                        try {
                            shouldLogMsg('verbose', new RegExp(`new connection.*${testPort + 9}`));
                            coreStub.logger.removeAllMessages();
                            return true;
                        } catch (err) {
                            return false;
                        }
                    });
                })
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    shouldLogMsg('closed');

                    for (let i = 0; i < 10; i += 1) {
                        shouldLogMsg('verbose', new RegExp(`removing connection.*${testPort + i}`));
                    }

                    assert.lengthOf(dataReceivers, 10);
                    dataReceivers.forEach((rec) => {
                        assert.isTrue(rec.closed, 'should be closed');
                    });

                    assert.deepStrictEqual(receiverInst._connections, {});
                }));
        });
    });

    describe('DualUDPService', () => {
        class MockServer extends EventEmitter {
            setInitArgs(opts) {
                this.opts = opts;
            }

            bind() {
                this.emit('bindMock', this, Array.from(arguments));
            }

            close() {
                this.emit('closeMock', this, Array.from(arguments));
            }
        }

        let serverMocks;
        let onMockCreatedCallback;
        const getServerMock = (ipv6) => serverMocks.find((mock) => (ipv6 && mock.opts.type === 'udp6') || (!ipv6 && mock.opts.type === 'udp4'));

        beforeEach(() => {
            serverMocks = [];
            receiverInst = new networkService.DualUDPService(
                createDataReceiver, testPort, { address: testAddr }
            );

            sinon.stub(udp, 'createSocket').callsFake(function () {
                const mock = new MockServer();
                mock.setInitArgs.apply(mock, arguments);
                serverMocks.push(mock);
                if (onMockCreatedCallback) {
                    mock.on('closeMock', (inst, args) => setImmediate(() => Promise.resolve(mock.emit('close')).then(args[0])));
                    onMockCreatedCallback(mock);
                }
                return mock;
            });
            onMockCreatedCallback = (serverMock) => {
                serverMock.on('bindMock', () => setImmediate(() => serverMock.emit('listening')));
            };
        });

        afterEach(() => (receiverInst && receiverInst.destroy()));

        describe('data handling', () => {
            let socketId = 0;
            const createSocketInfo = (ipv6) => {
                socketId += 1;
                return {
                    address: ipv6 ? testAddr6 : testAddr,
                    port: testPort + socketId,
                    family: ipv6 ? 'IPV6' : 'IPV4'
                };
            };

            it('should handle incoming data', () => receiverInst.start()
                .then(() => {
                    checkState(receiverInst, 'running');

                    const socketInfo1 = createSocketInfo();
                    getServerMock().emit('message', '1', socketInfo1);

                    const socketInfo2 = createSocketInfo(true);
                    getServerMock(true).emit('message', '2', socketInfo2);

                    const socketInfo3 = createSocketInfo();
                    getServerMock().emit('message', '3', socketInfo3);

                    const socketInfo4 = createSocketInfo(true);
                    getServerMock(true).emit('message', '4', socketInfo4);

                    getServerMock().emit('message', '5', socketInfo1);
                    getServerMock(true).emit('message', '6', socketInfo2);
                    getServerMock().emit('message', '7', socketInfo3);
                    getServerMock(true).emit('message', '8', socketInfo4);

                    return testUtil.waitTill(() => {
                        try {
                            assert.lengthOf(dataReceivers, 4);
                            assert.deepStrictEqual(
                                dataReceivers.reduce((a, r) => a + r.data.length, 0),
                                8
                            );
                            return true;
                        } catch (err) {
                            return false;
                        }
                    });
                })
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    assert.lengthOf(dataReceivers, 4);

                    for (let i = 0; i < dataReceivers.length; i += 1) {
                        const port = testPort + i + 1;
                        const family = i % 2 === 0 ? 'udp4' : 'udp6';

                        shouldLogMsg('verbose', new RegExp(`${family}.*new connection.*${port}`));
                        shouldLogMsg('verbose', new RegExp(`${family}.*removing connection.*${port}`));

                        assert.deepStrictEqual(dataReceivers[i].remoteInfo, {
                            address: i % 2 === 0 ? testAddr : testAddr6,
                            port,
                            family: i % 2 === 0 ? 'IPV4' : 'IPV6'
                        });
                        assert.isTrue(dataReceivers[i].closed, 'should be closed');
                        assert.deepStrictEqual(dataReceivers[i].data, [
                            `${i + 1}`, `${i + 5}`
                        ]);
                    }

                    shouldLogMsg(/udp6.*closing all client connections/);
                    shouldLogMsg(/udp4.*closing all client connections/);

                    assert.deepStrictEqual(receiverInst._services, null);
                }));
        });

        describe('restart', () => {
            it('should restart receiver when caught error', () => receiverInst.start()
                .then(() => {
                    checkState(receiverInst, 'running');
                    shouldLogMsg(/udp4.*listening/);
                    shouldLogMsg(/udp6.*listening/);
                    coreStub.logger.removeAllMessages();

                    getServerMock().emit('error', new Error('onUncaughtError'));
                    return testUtil.waitTill(() => {
                        try {
                            shouldLogMsg(/udp4.*listening/);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    });
                })
                .then(() => {
                    checkState(receiverInst, 'running');
                    shouldNotLogMsg(/udp6.*listening/);
                    shouldLogMsg(/udp4.*attempt #1 of Infinity/);
                    assert.deepStrictEqual(udp.createSocket.callCount, 3, 'should call net.createServer()');
                }));

            it('should recreate servers on restart', () => receiverInst.restart()
                .then(() => {
                    checkState(receiverInst, 'running');
                    assert.deepStrictEqual(udp.createSocket.callCount, 2, 'should create server once');
                    shouldLogMsg(/udp4.*listening/);
                    shouldLogMsg(/udp6.*listening/);
                    coreStub.logger.removeAllMessages();
                    return receiverInst.restart();
                })
                .then(() => {
                    checkState(receiverInst, 'running');
                    assert.deepStrictEqual(udp.createSocket.callCount, 4, 'should create server twice');
                    shouldLogMsg(/udp4.*listening/);
                    shouldLogMsg(/udp6.*listening/);
                    shouldLogMsg(/udp4.*closed/);
                    shouldLogMsg(/udp6.*closed/);
                    shouldLogMsg(/udp4.*closing all client connections/);
                    shouldLogMsg(/udp6.*closing all client connections/);
                }));
        });

        describe('.start()', () => {
            it('should start receivers', () => receiverInst.start()
                .then(() => {
                    checkState(receiverInst, 'running');
                    shouldLogMsg(/udp4.*listening/);
                    shouldLogMsg(/udp6.*listening/);
                    assert.deepStrictEqual(udp.createSocket.callCount, 2, 'should create server once');
                    assert.strictEqual(getServerMock().opts.type, 'udp4', 'should create udp4 listener');
                    assert.strictEqual(getServerMock(true).opts.type, 'udp6', 'should create udp6 listener');
                }));

            it('should fail to start', () => {
                let firstOnly = false;
                let failedFamily;
                let successFamily;
                onMockCreatedCallback = (serverMock) => {
                    if (!firstOnly) {
                        firstOnly = true;
                        failedFamily = serverMock.opts.type;
                        serverMock.on('bindMock', () => {
                            serverMock.emit('close');
                        });
                    } else {
                        successFamily = serverMock.opts.type;
                        serverMock.on('bindMock', () => serverMock.emit('listening'));
                    }
                };
                return assert.isRejected(receiverInst.start(), /socket closed before/)
                    .then(() => {
                        checkState(receiverInst, 'stopped');
                        shouldLogMsg(new RegExp(`${failedFamily}.*failed to start due error`));
                        shouldLogMsg(new RegExp(`${successFamily}.*listening`));
                    });
            });
        });

        describe('.stop()', () => {
            it('should be able to stop receiver', () => receiverInst.start()
                .then(() => receiverInst.stop())
                .then(() => {
                    checkState(receiverInst, 'stopped');
                    shouldLogMsg(/udp4.*listening/);
                    shouldLogMsg(/udp6.*listening/);
                    shouldLogMsg(/udp4.*destroyed/);
                    shouldLogMsg(/udp6.*destroyed/);
                    shouldNotLogMsg(/socket closed before being ready/);
                }));
        });
    });
});
