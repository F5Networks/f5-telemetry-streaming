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

const assignDefaults = require('lodash/defaults');
const hasIn = require('lodash/hasIn');
const net = require('net');

const getArgByType = require('../utils/misc').getArgByType;
const promiseUtil = require('../utils/promise');

/**
 * @module test/functional/shared/remoteHost/tcpConnector
 *
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost").RemoteHost} RemoteHost
 */

const DEFAULTS = Object.freeze({
    allowHalfOpen: false,
    family: '4',
    retry: Object.freeze({
        delay: 100,
        maxTries: 10
    }),
    unref: false
});

const PRIVATES = new WeakMap();

let TCP_REQ_ID = 0;

/**
 * Get next request ID
 *
 * @returns {number} request ID
 */
function nextReqId() {
    const reqId = TCP_REQ_ID;
    TCP_REQ_ID += 1;
    return reqId;
}

/**
 * TCP Connector
 *
 * @property {Array<Buffer | string>} data - received data
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {integer} port - remote port
 * @property {PromiseRetryOptions} retryOptions - retry options
 * @property {TCPConnectorOptions} socketOptions - socket options
 * @property {boolean} terminated - 'true' if connector permanently terminated
 */
class TCPConnector {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {integer} port - port
     * @param {TCPConnectorOptions} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {PromiseRetryOptions} [options.retry] - retry options
     */
    constructor(host, port, options) {
        options = assignDefaults(
            Object.assign({}, options || {}),
            DEFAULTS
        );
        const retryOptions = Object.assign({}, options.retry || {});

        Object.defineProperties(this, {
            data: {
                get() { return PRIVATES.get(this).data.slice(0); }
            },
            host: {
                value: host
            },
            port: {
                value: port
            },
            retryOptions: {
                get() { return Object.assign({}, retryOptions); }
            },
            socketOptions: {
                get() { return Object.assign({}, options); }
            },
            terminated: {
                get() { return PRIVATES.get(this).terminated; }
            }
        });
        PRIVATES.set(this, {
            closeConnectorPromise: null,
            closePromise: null,
            data: [],
            parentLogger: options.logger || this.host.logger,
            readyPromise: null,
            socket: null,
            terminated: false,
            terminatePromise: null
        });
        this.logger = PRIVATES.get(this).parentLogger.getChild(`tcp:${port}`);

        delete options.logger;
        delete options.retry;
    }

    /**
     * Close current connection.
     *
     * Note: even if closed it still can be active if there are a lot of concurrent
     *  attempts to write data (new socket will be created)
     *
     * @returns {Promise} resolved once closed
     * @rejects {Error} when no socket to close
     */
    close() {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);
            if (!this.terminated) {
                if (!this.closeConnectorPromise) {
                    this.logger.info('Closing connector...');
                    const closeConnectorPromise = Promise.resolve()
                        .then(() => {
                            if (privates.socket) {
                                privates.socket.destroy();
                                return privates.closePromise.then(() => {
                                    if (privates.closeConnectorPromise === closeConnectorPromise) {
                                        privates.closeConnectorPromise = null;
                                    }
                                });
                            }
                            this.logger.info('No socket to close!');
                            return Promise.resolve();
                        });
                    privates.closeConnectorPromise = closeConnectorPromise;
                }
                privates.closeConnectorPromise.then(resolve, reject);
            } else {
                privates.terminatePromise.then(resolve, reject);
            }
        });
    }

    /**
     * Erase data received from remote host
     */
    eraseData() {
        PRIVATES.get(this).data = [];
    }

    /**
     * Ping TCP port on remote host
     *
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved when remote host is listening on the port
     */
    ping(retry) {
        retry = assignDefaults(Object.assign({}, retry || {}), this.retryOptions);
        const reqId = nextReqId();
        this.logger.info('Ping remote port (+metadata info for debug):', {
            reqId,
            retry
        });

        return promiseUtil.retry(() => new Promise((resolve, reject) => {
            const socketOptions = this.socketOptions;
            const connOptions = {
                family: socketOptions.family,
                host: this.host.host,
                port: this.port
            };
            const socket = new net.Socket({
                allowHalfOpen: socketOptions.allowHalfOpen
            });
            socket.on('connect', () => {
                socket.end();
            });
            socket.on('end', () => {
                this.logger.info('Port is opened!', { reqId });
                resolve();
            });
            socket.on('error', (err) => {
                this.logger.info('Port is closed!', { reqId, err });
                reject(err);
            });
            socket.connect(connOptions);
        }), retry);
    }

    /**
     * Send data
     *
     * Note: non-guarantee delivery
     *
     * @param {any} data - data to send
     * @param {string} [encoding = 'utf8'] - data encoding
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once data was sent
     */
    send(data, encoding, retry) {
        encoding = 'utf8';
        retry = {};
        if (arguments.length > 1) {
            encoding = getArgByType(arguments, 'string', { fromIndex: 1, defaultValue: encoding }).value;
            retry = getArgByType(arguments, 'object', { fromIndex: 1, defaultValue: retry }).value;
        }

        retry = assignDefaults(Object.assign({}, retry || {}), this.retryOptions);

        const reqId = nextReqId();
        this.logger.info('Sending data (+metadata info for debug):', {
            data,
            encoding,
            reqId,
            retry
        });

        const originCb = retry.callback;
        retry.callback = (error) => {
            if (this.terminated) {
                return false;
            }
            this.logger.error('Error on attempt to send data... Going to retry if re-try attempts left', error, {
                reqId,
                tries: retry.tries
            });
            return originCb ? originCb(error) : true;
        };

        // eslint-disable-next-line consistent-return
        return promiseUtil.retry(() => new Promise((resolve, reject) => {
            if (this.terminated) {
                this.logger.error('Attempt to write data using terminated TCP Connector!', { reqId });
                // eslint-disable-next-line no-promise-executor-return
                return reject(new Error('TCPConnector was terminated'));
            }
            const privates = PRIVATES.get(this);
            if (privates.socket === null) {
                const socketOptions = this.socketOptions;
                const connOptions = {
                    family: socketOptions.family,
                    host: this.host.host,
                    port: this.port
                };

                this.logger.info('Creating new socket', { reqId, connOptions, socketOptions });

                const socket = new net.Socket({
                    allowHalfOpen: socketOptions.allowHalfOpen
                });
                privates.socket = socket;

                if (socketOptions.encoding) {
                    socket.setEncoding(socketOptions.encoding);
                }
                if (typeof socketOptions.timeout !== 'undefined') {
                    socket.setTimeout(socketOptions.timeout);
                }
                if (typeof socketOptions.noDelay === 'boolean') {
                    socket.noDelay(socketOptions.noDelay);
                }
                if (socketOptions.unref) {
                    socket.unref();
                }

                socket.on('data', (msg) => privates.data.push(msg));
                socket.on('end', () => {
                    this.logger.info('Socket received FIN packet');
                    socket.end();
                });
                // The 'close' event will be called directly following 'error'.
                socket.on('error', (error) => this.logger.error('Error caught', error));
                socket.on('timeout', () => {
                    this.logger.error('Timeout. Destroying socket');
                    socket.destroy();
                });

                const cleanup = () => {
                    if (privates.socket === socket) {
                        privates.closePromise = null;
                        privates.readyPromise = null;
                        privates.socket = null;
                    }
                };

                this.eraseData();
                privates.readyPromise = new Promise((readyResolve, readyReject) => {
                    const onClose = () => {
                        this.logger.error('Unable to establish connection...', { reqId });
                        // eslint-disable-next-line no-use-before-define
                        socket.removeListener('connect', onConnect);
                        cleanup();
                        readyReject(new Error('Unable to establish connection...'));
                    };
                    const onConnect = () => {
                        socket.removeListener('close', onClose);
                        this.logger = PRIVATES.get(this).parentLogger.getChild(`tcp:[${socket.localAddress}]:${socket.localPort}:${this.port}`);
                        this.logger.info('Connection established!', { reqId });

                        privates.closePromise = new Promise((closeResolve) => {
                            socket.once('close', () => {
                                this.logger.info('Connection closed!');
                                cleanup();
                                closeResolve();
                            });
                        });
                        readyResolve();
                    };
                    socket.once('close', onClose);
                    socket.once('connect', onConnect);
                    socket.connect(connOptions);
                });
            }
            // eslint-disable-next-line no-promise-executor-return
            privates.readyPromise
                // eslint-disable-next-line consistent-return
                .then(() => new Promise((sendResolve, sendReject) => {
                    if (!privates.socket) {
                        sendReject(new Error('No socket to write data to!'));
                    } else {
                        const socket = privates.socket;
                        // listen for error just in case
                        socket.once('error', (err) => {
                            socket.removeListener('sent', sendResolve);
                            sendReject(err);
                        });
                        socket.once('sent', () => {
                            this.logger.info('Data successfully written to socket!', { reqId });
                            socket.removeListener('error', sendReject);
                            sendResolve();
                        });
                        socket.write(data, encoding, () => socket.emit('sent'));
                    }
                }))
                .then(resolve, reject);
        }), retry);
    }

    /**
     * Terminate connector permanently
     *
     * @returns {Promise} resolved once terminated
     * @rejects {Error} when no socket to close
     */
    terminate() {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);
            if (!this.terminated) {
                this.logger.info('Terminating connector...');
                privates.terminated = true;
                privates.terminatePromise = Promise.resolve()
                    .then(() => {
                        if (privates.socket) {
                            privates.socket.destroy();
                            return privates.closePromise.then(() => {
                                this.logger.info('Terminated!');
                            });
                        }
                        this.logger.info('No socket to terminate!');
                        return Promise.resolve();
                    });
            }
            privates.terminatePromise.then(resolve, reject);
        });
    }
}

/**
 * TCP Connector Manager
 *
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {PromiseRetryOptions} retryOptions - retry options
 * @property {TCPConnectorOptions} socketOptions - socket options
 */
class TCPConnectorManager {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {TCPConnectorOptions} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {PromiseRetryOptions} [options.retry] - retry options
     */
    constructor(host, options) {
        options = assignDefaults(
            Object.assign({}, options || {}),
            DEFAULTS
        );
        const retryOptions = Object.assign({}, options.retry || {});

        Object.defineProperties(this, {
            host: {
                value: host
            },
            retryOptions: {
                get() { return Object.assign({}, retryOptions); }
            },
            socketOptions: {
                get() { return Object.assign({}, options); }
            }
        });
        this.logger = (options.logger || this.host.logger);

        delete options.logger;
        delete options.retry;
    }

    /**
     * Create new TCP Connector instance
     *
     * @param {integer} port - remote port
     * @param {TCPConnectorOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {TCPConnector} instance
     */
    create(port, options) {
        return new TCPConnector(this.host, port, assignDefaults(
            Object.assign({}, options || {}),
            Object.assign(this.socketOptions, {
                logger: this.logger,
                retry: this.retryOptions
            })
        ));
    }

    /**
     * Create new TCP Connector instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {integer} port - remote port
     * @param {TCPConnectorOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {TCPConnector} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign TCPConnector to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Ping TCP port on remote host
     *
     * @param {integer} port - remote port
     * @param {TCPConnectorOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved when remote host is listened on the port
     */
    ping(port, options) {
        options = {};
        if (arguments.length > 1) {
            options = getArgByType(arguments, 'object', { fromIndex: 1 }).value;
        }
        return this.create(port, options).ping();
    }

    /**
     * Send data to remote host
     *
     * @param {integer} port - remote port
     * @param {any} data - data to send
     * @param {string} [encoding = 'utf8'] - data encoding
     * @param {TCPConnectorOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once data sent
     */
    send(port, data, encoding, options) {
        encoding = 'utf8';
        options = {};

        if (arguments.length > 2) {
            encoding = getArgByType(arguments, 'string', { fromIndex: 2 }).value;
            options = getArgByType(arguments, 'object', { fromIndex: 2 }).value;
        }

        const conn = this.create(port, options);
        let err;
        return conn.send(data, encoding)
            .catch((sendErr) => {
                err = sendErr;
            })
            .then(() => conn.terminate())
            .then(() => (err ? Promise.reject(err) : Promise.resolve()));
    }
}

module.exports = {
    TCPConnector,
    TCPConnectorManager
};

/**
 * @typedef TCPConnectorOptions
 * @type {Object}
 * @property {boolean} [allowHalfOpen = false] - socket won't automatically send a FIN packet
 * @property {string} [encoding] - encoding for the socket
 * @property {string} [family = '4'] - version of IP stack
 * @property {boolean} [noDelay = true] - disables the Nagle algorithm
 * @property {integer} [timeout] - timeout after 'timeout' milliseconds of inactivity
 * @property {boolean} [unref = false] - allow the program to exit if
 *      this is the only active socket in the event system
 */
