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

/* eslint-disable no-multi-assign, no-var */

const dgram = require('dgram');
const net = require('net');

const constants = require('../constants').EVENT_LISTENER;
const logger = require('../logger');
const promiseUtil = require('../utils/promise');
const Service = require('../utils/service');

/**
 * @private
 *
 * @module eventListener/networkService
 */

class SocketServiceError extends Error {}

// TODO:
// - fix address binding
// - allow to specify via declaration

/**
 * Base Network Service for TCP and UDP protocols
 *
 * @see module:utils/service.Service
 *
 * @property {string} address - address to listen on
 * @property {ReceiverCallback} callback - `connection` callback
 * @property {logger.Logger} logger - logger instance
 * @property {integer} port - port to listen on
 *
 * NOTE: running instance should be restarted if `address` or `port` updated
 */
class BaseNetworkService extends Service {
    /**
     * @param {ReceiverCallback} callback - `connection` callback
     * @param {integer} port - port to listen on
     * @param {object} [options = {}] - additional options
     * @param {string} [options.address] - address to listen on
     * @param {logger.Logger} [options.logger] - logger to use instead of default one
     */
    constructor(callback, port, options) {
        options = options || {};
        const address = options.address;

        super(options.logger || logger.getChild(`[${address}::${port}]`));

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            address: {
                value: address
            },
            callback: {
                value: callback
            },
            port: {
                value: port
            }
        });
    }

    /**
     * Get service options to start listening for data
     *
     * @returns {object} options
     */
    getReceiverOptions() {
        const options = { port: this.port };
        if (this.address) {
            options.address = this.address;
        }
        return options;
    }

    /** @returns {Service.RestartOptions} restart options */
    getRestartOptions() {
        return {
            delay: constants.NETWORK_SERVICE_RESTART_DELAY
        };
    }
}

/**
 * Data Receiver over TCP
 *
 * @see BaseNetworkService
 */
class TCPService extends BaseNetworkService {
    /** @see BaseNetworkService */
    constructor(callback, port, options) {
        super(callback, port, options);

        this._connections = null;
        this._handleConnection = handleTcpConnection.bind(this);
        this._socket = null;
    }

    /**
     * Start TCP service
     *
     * @async
     * @param {function(Error)} onFatalError - callback to call on unexpected errors
     *
     * @returns {Promise} resolved once service started
     */
    _onStart(onFatalError) {
        return new Promise((resolve, reject) => {
            if (this._socket) {
                reject(new SocketServiceError('_socket exists already!'));
            } else {
                const srvOpts = this.getReceiverOptions();
                this.logger.debug(`starting listen using following options ${JSON.stringify(srvOpts)}`);

                // reset connections registry
                this._connections = [];

                this._socket = net.createServer({
                    allowHalfOpen: false,
                    pauseOnConnect: false
                });
                this._socket.on('error', (error) => {
                    if (resolve) {
                        reject(error);
                        resolve = null;
                    } else {
                        onFatalError(error);
                    }
                })
                    .on('listening', () => {
                        this.logger.debug('listening');
                        if (resolve) {
                            resolve();
                            resolve = null;
                        }
                    })
                    .on('close', () => {
                        this.logger.debug('closed');
                        if (resolve) {
                            resolve = null;
                            reject(new SocketServiceError('socket closed before being ready'));
                        }
                    });

                this._socket.on('connection', this._handleConnection);
                this._socket.listen(srvOpts);
            }
        });
    }

    /**
     * Stop TCP service
     *
     * @async
     * @returns {Promise} resolved once service stopped
     */
    _onStop() {
        return new Promise((resolve) => {
            if (!this._socket) {
                resolve();
            } else {
                closeAllTcpConnections.call(this);
                this._socket.close(() => {
                    this._socket.removeAllListeners();
                    this._socket = null;
                    resolve();
                });
            }
        });
    }
}

/**
 * Data Receiver over UDP
 *
 * @see BaseNetworkService
 *
 * @property {'udp4' | 'udp6'} family - listener type
 */
class UDPService extends BaseNetworkService {
    /**
     * @see BaseNetworkService
     * @param {'udp4' | 'udp6'} [family = 'udp4'] - socket type, 'udp4' or 'udp6', by default 'udp4'
     */
    constructor(callback, port, options, family) {
        super(callback, port, options);

        // read-only properties
        Object.defineProperties(this, {
            family: {
                value: (family || '').toLowerCase() === 'udp6' ? 'udp6' : 'udp4'
            }
        });

        this._cleanupID = null;
        this._connections = null;
        this._handleConnection = handleUdpConnection.bind(this);
        this._socket = null;
    }

    /**
     * Start UDP service
     *
     * @async
     * @param {function(Error)} onFatalError - callback to call on unexpected errors
     *
     * @returns {Promise} resolved once service started
     */
    _onStart(onFatalError) {
        return new Promise((resolve, reject) => {
            if (this._socket) {
                reject(new SocketServiceError('_socket exists already!'));
            } else {
                const srvOpts = this.getReceiverOptions();
                this.logger.debug(`starting listen using following options ${JSON.stringify(srvOpts)}`);

                // reset connections registry
                this._connections = {};

                this._socket = dgram.createSocket({
                    type: this.family,
                    ipv6Only: this.family === 'udp6', // available starting from node 11+ only
                    reuseAddr: true // allows to use UDPv6 'any' and UDPv4 'any' at the same time
                });
                this._socket.on('error', (error) => {
                    if (resolve) {
                        reject(error);
                        resolve = null;
                    } else {
                        onFatalError(error);
                    }
                })
                    .on('listening', () => {
                        this.logger.debug('listening');
                        if (resolve) {
                            resolve();
                            resolve = null;
                        }
                    })
                    .on('close', () => {
                        this.logger.debug('closed');
                        if (resolve) {
                            resolve = null;
                            reject(new SocketServiceError('socket closed before being ready'));
                        }
                    });

                this._socket.on('message', this._handleConnection);
                this._socket.bind(srvOpts);

                this._cleanupID = setInterval(() => {
                    Object.keys(this._connections).forEach((key) => {
                        // 5 min timeout for UDP connection
                        if (this._connections[key].lastPushTimeDelta() >= constants.UDP_STALE_CONN_TIMEOUT) {
                            removeUdpConnection.call(this, key);
                        }
                    });
                }, constants.UDP_STALE_CONN_INTERVAL);
            }
        });
    }

    /**
     * Stop UDP service
     *
     * @async
     * @returns {Promise} resolved once service stopped
     */
    _onStop() {
        return new Promise((resolve) => {
            if (!this._socket) {
                resolve();
            } else {
                if (this._cleanupID) {
                    clearInterval(this._cleanupID);
                }
                closeAllUdpConnections.call(this);
                this._socket.close(() => {
                    this._socket.removeAllListeners();
                    this._socket = null;
                    resolve();
                });
            }
        });
    }
}

/**
 * Data Receiver over UDPv4 and UDPv6
 *
 * Note: this class is needed to support DualStack on node.js versions older than 11.x
 *
 * @see BaseNetworkService
 */
class DualUDPService extends BaseNetworkService {
    /**
     * Start UDP services
     *
     * @async
     * @param {function(Error)} onFatalError - callback to call on unexpected errors
     *
     * @returns {Promise} resolved once service started
     */
    _onStart(onFatalError) {
        return new Promise((resolve, reject) => {
            if (this._services) {
                reject(new SocketServiceError('_services exists already!'));
            } else {
                this._listenerOnFailed = this.ee.on('failed', onFatalError, { objectify: true });

                this._services = ['udp4', 'udp6'].map((family) => {
                    const service = new UDPService(
                        this.callback,
                        this.port,
                        {
                            address: this.address,
                            logger: this.logger.getChild(family)
                        },
                        family
                    );
                    return service;
                });
                promiseUtil.allSettled(this._services.map((srv) => srv.start()))
                    .then((statues) => {
                        promiseUtil.getValues(statues);
                        this._services.forEach((srv) => this.ee.listenTo(
                            srv.ee, 'failed'
                        ));
                    })
                    .then(resolve, reject);
            }
        });
    }

    /**
     * Stop UDP services
     *
     * @async
     * @returns {Promise} resolved once service stopped
     */
    _onStop() {
        return new Promise((resolve, reject) => {
            if (!this._services) {
                resolve();
            } else {
                this._listenerOnFailed.off();

                this.ee.stopListeningTo();
                promiseUtil.allSettled(this._services.map((srv) => srv.destroy()))
                    .then((statuses) => {
                        this._services = null;
                        return promiseUtil.getValues(statuses);
                    })
                    .then(resolve, reject);
            }
        });
    }
}

/**
 * PRIVATE METHODS
 */

/**
 * Close all opened client connections
 *
 * @this TCPService
 */
function closeAllTcpConnections() {
    this.logger.debug('closing all client connections');
    // do .slice in case if ._removeConnection will be called
    this._connections.slice(0).forEach((conn) => {
        this.logger.verbose(`removing connection - "${conn[0].remoteAddress}" port "${conn[0].remotePort}"`);
        conn[0].destroy();
        conn[1].close();
    });
    this._connections = [];
}

/**
 * Close all opened client connections
 *
 * @this UDPService
 */
function closeAllUdpConnections() {
    this.logger.debug('closing all client connections');
    Object.keys(this._connections)
        .forEach((connKey) => removeUdpConnection.call(this, connKey));
    this._connections = {};
}
/**
 * Add connection to the list of opened connections
 *
 * @this TCPService
 *
 * @param {net.Socket} conn - connection to add
 */
function handleTcpConnection(conn) {
    var receiver = this.callback({
        address: conn.remoteAddress,
        family: conn.remoteFamily,
        port: conn.remotePort
    });
    this.logger.verbose(`new connection - "${conn.remoteAddress}" port "${conn.remotePort}"`);
    this._connections.push([conn, receiver]);

    conn.on('data', receiver.push.bind(receiver))
        .on('error', () => conn.destroy()) // destroy emits 'close' event
        .on('close', () => removeTcpConnection.call(this, conn))
        .on('end', () => {}); // allowHalfOpen is false, no need to call 'end' explicitly
}

/**
 * Add connection to the list of opened connections
 *
 * @this UDPService
 *
 * @param {Buffer} data - data to process
 * @param {object} remoteInfo - connection info
 */
function handleUdpConnection(data, remoteInfo) {
    var key = `${remoteInfo.address}-${remoteInfo.port}`;
    var stream = this._connections[key];

    if (stream === undefined) {
        stream = this._connections[key] = this.callback(remoteInfo);
        this.logger.verbose(`new connection - "${remoteInfo.address}" port "${remoteInfo.port}"`);
    }

    stream.push(data);
}

/**
 * Remove connection from the list of opened connections
 *
 * @this TCPService
 *
 * @param {net.Socket} conn - connection to remove
 */
function removeTcpConnection(conn) {
    const len = this._connections.length;
    for (let i = 0; i < len; i += 1) {
        if (this._connections[i][0] === conn) {
            this.logger.verbose(`removing connection - "${conn.remoteAddress}" port "${conn.remotePort}"`);
            this._connections[i][1].close();

            this._connections[i] = this._connections[len - 1];
            this._connections.length -= 1;
            break;
        }
    }
}

/**
 * Remove connection from the list of opened connections
 *
 * @this UDPService
 *
 * @param {string} connKey - unique connection key
 */
function removeUdpConnection(connKey) {
    if (this._connections[connKey]) {
        const splitKey = connKey.split('-');
        this.logger.verbose(`removing connection - "${splitKey[0]}" port "${splitKey[1]}"`);

        this._connections[connKey].close();
        delete this._connections[connKey];
    }
}

module.exports = {
    DualUDPService,
    BaseNetworkService,
    SocketServiceError,
    TCPService,
    UDPService
};

/**
 * @interface MessageStream
 */
/**
 * @function
 * @name MessageStream.lastPushTimeDelta
 * @return {integer} interval of last push in nanosec
 */
/**
 * @function
 * @name MessageStream.push
 * @returns {void}
 */
/**
 * @function
 * @name MessageStream.close
 * @returns {void}
 */
/**
 * Data Callback
 *
 * @callback ReceiverCallback
 * @param {ConnInfo} connInfo
 *
 * @returns {MessageStream}
 */
/**
 * @typedef ConnInfo
 * @type {object}
 * @property {string} address
 * @property {string} family
 * @property {integer} port
 */
