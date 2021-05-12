/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const dgram = require('dgram');
const net = require('net');

const baseDataReceiver = require('./baseDataReceiver');
const logger = require('../logger');
const promiseUtil = require('../utils/promise');

/** @module TcpUdpDataReceiver */

class TcpUdpDataReceiverError extends baseDataReceiver.BaseDataReceiverError {}

/**
 * Base Data Receiver for TCP and UDP protocols
 *
 * @see module:BaseDataReceiverError.BaseDataReceiver
 *
 * @property {String} address - address to listen on
 * @property {Logger} logger - logger instance
 * @property {Number} port - port to listen on}
 *
 * @fires TcpUdpBaseDataReceiver#data
 */
class TcpUdpBaseDataReceiver extends baseDataReceiver.BaseDataReceiver {
    /**
     * Constructor
     *
     * @param {Number} port - port to listen on
     * @param {Object} [options = {}] - additional options
     * @param {String} [options.address] - address to listen on
     * @param {Logger} [options.logger] - logger to use instead of default one
     */
    constructor(port, options) {
        super();
        options = options || {};
        this.address = options.address;
        this.logger = options.logger || logger.getChild(this.constructor.name);
        this.port = port;
    }

    /**
     * Connection unique key
     *
     * @private
     * @param {Socket} conn - connection
     *
     * @returns {String} unique key
     */
    getConnKey() {
        throw new Error('Not implemented');
    }

    /**
     * Get receiver options to start listening for data
     *
     * @returns {Object} options
     */
    getReceiverOptions() {
        const options = { port: this.port };
        if (this.address) {
            options.address = this.address;
        }
        return options;
    }

    /**
     * Restart receiver
     *
     * @returns {Promise} resolved despite on result
     */
    safeRestart() {
        this.logger.debug('safely restarting');
        try {
            return this.restart({ delay: this.constructor.RESTART_DELAY }).catch(() => {});
        } catch (restartErr) {
            this.logger.exception(`${this.constructor.name}.safeRestart uncaught error`, restartErr);
            // silently ignore error
        }
        return Promise.resolve();
    }
}

/**
 * Delay before restart
 *
 * @property {Number}
 */
TcpUdpBaseDataReceiver.RESTART_DELAY = 10 * 1000; // 10 sec. delay before restart

/**
 * Data Receiver over TCP
 *
 * @see TcpUdpBaseDataReceiver
 */
class TCPDataReceiver extends TcpUdpBaseDataReceiver {
    /**
     * Constructor
     *
     * @see TcpUdpBaseDataReceiver
     */
    constructor(port, options) {
        super(port, options);
        this._connections = [];
    }

    /**
     * Connection handler
     *
     * @param {Socket} conn - connection
     */
    connectionHandler(conn) {
        addTcpConnection.call(this, conn);
        conn.on('data', data => callDataCallback.call(this, data, conn))
            .on('error', () => conn.destroy()) // destroy emits 'close' event
            .on('close', () => removeTcpConnection.call(this, conn))
            .on('end', () => {}); // allowHalfOpen is false by default, no need to call 'end' explicitly
    }

    /**
     * Connection unique key
     *
     * @private
     * @param {Socket} conn - connection
     *
     * @returns {String} unique key
     */
    getConnKey(conn) {
        return `tcp-${conn.remoteAddress}-${conn.remotePort}`;
    }

    /**
     * Start TCP data receiver
     *
     * @async
     * @returns {Promise} resolved once receiver started
     */
    startHandler() {
        let isStarted = false;
        return new Promise((resolve, reject) => {
            if (!this.hasState(this.constructor.STATE.STARTING)) {
                reject(this.getStateTransitionError(this.constructor.STATE.STARTING));
            } else {
                this._socket = net.createServer({
                    allowHalfOpen: false,
                    pauseOnConnect: false
                });
                this._socket.on('error', (err) => {
                    this.logger.exception('unexpected error', err);
                    if (isStarted) {
                        this.safeRestart();
                    } else {
                        reject(err);
                    }
                })
                    .on('listening', () => {
                        this.logger.debug('listening');
                        if (!isStarted) {
                            isStarted = true;
                            resolve();
                        }
                    })
                    .on('close', () => {
                        this.logger.debug('closed');
                        if (!isStarted) {
                            reject(new TcpUdpDataReceiverError('socket closed before being ready'));
                        }
                    })
                    .on('connection', this.connectionHandler.bind(this));

                const options = this.getReceiverOptions();
                this.logger.debug(`starting listen using following options ${JSON.stringify(options)}`);
                this._socket.listen(options);
            }
        });
    }

    /**
     * Stop receiver
     *
     * @async
     * @returns {Promise} resolved once receiver stopped
     */
    stopHandler() {
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
 * @see TcpUdpBaseDataReceiver
 *
 * @property {String} family - listener type - 'udp4' or 'udp6', by default 'udp4'
 */
class UDPDataReceiver extends TcpUdpBaseDataReceiver {
    /**
     * Constructor
     *
     * @param {Number} port - port to listen on
     * @param {Object} [options = {}] - additional options
     * @param {String} [options.address] - address to listen on
     * @param {Logger} [options.logger] - logger to use instead of default one
     * @param {String} [family = 'udp4'] - socket type, 'udp4' or 'udp6', by default 'udp4'
     */
    constructor(port, options, family) {
        super(port, options);
        this.family = (family || '').toLowerCase() === 'udp6' ? 'udp6' : 'udp4';
    }

    /**
     * Connection unique key
     *
     * @private
     * @param {Object} remoteInfo - connection info
     *
     * @returns {String} unique key
     */
    getConnKey(remoteInfo) {
        return `${this.family}-${remoteInfo.address}-${remoteInfo.port}`;
    }

    /**
     * Start TCP data receiver
     *
     * @async
     * @returns {Promise} resolved once receiver started
     */
    startHandler() {
        let isStarted = false;
        return new Promise((resolve, reject) => {
            if (!this.hasState(this.constructor.STATE.STARTING)) {
                reject(this.getStateTransitionError(this.constructor.STATE.STARTING));
            } else {
                this._socket = dgram.createSocket({
                    type: this.family,
                    ipv6Only: this.family === 'udp6', // available starting from node 11+ only
                    reuseAddr: true // allows UDPv6 and UDPv4 be bound to 0.0.0.0 and ::0 at the same time
                });
                this._socket.on('error', (err) => {
                    this.logger.exception('unexpected error', err);
                    if (isStarted) {
                        this.safeRestart();
                    } else {
                        reject(err);
                    }
                })
                    .on('listening', () => {
                        this.logger.debug('listening');
                        if (!isStarted) {
                            isStarted = true;
                            resolve();
                        }
                    })
                    .on('close', () => {
                        this.logger.debug('closed');
                        if (!isStarted) {
                            reject(new TcpUdpDataReceiverError('socket closed before being ready'));
                        }
                    })
                    .on('message', callDataCallback.bind(this));

                const options = this.getReceiverOptions();
                this.logger.debug(`starting listen using following options ${JSON.stringify(options)}`);
                this._socket.bind(options);
            }
        });
    }

    /**
     * Close UDP data receiver
     *
     * @async
     * @private
     * @returns {Promise} resolve on receiver closed
     */
    stopHandler() {
        return new Promise((resolve) => {
            if (!this._socket) {
                resolve();
            } else {
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
 * @see TcpUdpBaseDataReceiver
 */
class DualUDPDataReceiver extends TcpUdpBaseDataReceiver {
    /**
     * Create internal receivers
     */
    createReceivers() {
        this._receivers = ['udp4', 'udp6'].map((family) => {
            const receiver = new UDPDataReceiver(
                this.port,
                {
                    address: this.address,
                    logger: this.logger.getChild(family)
                },
                family
            );
            // passthrough 'data' event
            this.listenTo(receiver, { data: 'data' });
            return receiver;
        });
    }

    /**
     * Check if has any internal receivers
     *
     * @returns {Boolean}
     */
    hasReceivers() {
        return this._receivers && this._receivers.length > 0;
    }

    /**
     * Start receiver
     *
     * @async
     * @returns {Promise} resolved once receiver started
     */
    startHandler() {
        if (!this.hasState(this.constructor.STATE.STARTING)) {
            return Promise.reject(this.getStateTransitionError(this.constructor.STATE.STARTING));
        }
        this.createReceivers();
        return promiseUtil.allSettled(this._receivers.map(receiver => receiver.start()))
            .then(promiseUtil.getValues);
    }

    /**
     * Stop receiver
     *
     * @async
     * @returns {Promise} resolved once receiver stopped
     */
    stopHandler() {
        if (!this.hasReceivers()) {
            return Promise.resolve();
        }
        // stop to listen for 'data' event
        this.stopListeningTo();
        return promiseUtil.allSettled(this._receivers.map(receiver => receiver.destroy()))
            .then((statuses) => {
                this._receivers = null;
                return promiseUtil.getValues(statuses);
            });
    }
}

/**
 * PRIVATE METHODS
 */
/**
 * Add connection to the list of opened connections
 *
 * @this TCPDataReceiver
 * @param {Socket} conn - connection to add
 */
function addTcpConnection(conn) {
    this.logger.debug(`new connection - ${this.getConnKey(conn)}`);
    this._connections.push(conn);
}

/**
 * Call data callback
 *
 * @this TcpUdpBaseDataReceiver
 * @param {Buffer} data
 * @param {Object} connInfo
 *
 * @fires TcpUdpBaseDataReceiver#data
 *
 * @returns {Promise} resolved once data processed
 */
function callDataCallback(data, connInfo) {
    return this.safeEmitAsync('data', data, this.getConnKey(connInfo), Date.now(), process.hrtime());
}

/**
 * Close all opened client connections
 *
 * @this TCPDataReceiver
 */
function closeAllTcpConnections() {
    this.logger.debug('closing all client connections');
    // do .slice in case if ._removeConnection will be called
    this._connections.slice(0).forEach(conn => conn.destroy());
    this._connections = [];
}

/**
 * Remove connection from the list of opened connections
 *
 * @this TCPDataReceiver
 * @param {Socket} conn - connection to remove
 */
function removeTcpConnection(conn) {
    this.logger.debug(`removing connection - ${this.getConnKey(conn)}`);
    const idx = this._connections.indexOf(conn);
    if (idx > -1) {
        this._connections.splice(idx, 1);
    }
}

module.exports = {
    DualUDPDataReceiver,
    TcpUdpBaseDataReceiver,
    TcpUdpDataReceiverError,
    TCPDataReceiver,
    UDPDataReceiver
};

/**
 * Data event
 *
 * @event TcpUdpBaseDataReceiver#data
 * @param {Buffer} data - data
 * @param {String} connKey - connection unique key
 * @param {Number} timestamp - data timestamp in ms.
 * @param {Array<Number>} hrtime - result of calling process.hrtime()
 */
