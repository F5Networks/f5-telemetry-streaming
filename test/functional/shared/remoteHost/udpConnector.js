/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assignDefaults = require('lodash/defaults');
const dgram = require('dgram');
const hasIn = require('lodash/hasIn');

const promiseUtil = require('../utils/promise');

/**
 * @module test/functional/shared/remoteHost/udpConnector
 *
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost").RemoteHost} RemoteHost
 */

const DEFAULTS = Object.freeze({
    retry: Object.freeze({
        delay: 100,
        maxTries: 10
    })
});

const PRIVATES = new WeakMap();

let UDP_REQ_ID = 0;

/**
 * UDP Connector
 *
 * @property {Array<Buffer>} data - received data
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {integer} port - remote port
 * @property {PromiseRetryOptions} retryOptions - retry options
 * @property {boolean} terminated - 'true' if connector permanently terminated
 */
class UDPConnector {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {integer} port - port
     * @param {Object} [options] - options
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
            terminated: {
                get() { return PRIVATES.get(this).terminated; }
            }
        });
        PRIVATES.set(this, {
            closeConnectorPromise: null,
            closePromise: null,
            data: [],
            socket: null,
            terminated: false,
            terminatePromise: null
        });
        this.logger = (options.logger || this.host.logger).getChild(`udp:${port}`);
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
                                privates.socket.close();
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
     * Send data
     *
     * @param {any} data - data to send
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once data was sent
     */
    send(data, retryOpts) {
        retryOpts = assignDefaults(Object.assign({}, retryOpts || {}), this.retryOptions);

        const reqId = UDP_REQ_ID;
        UDP_REQ_ID += 1;

        this.logger.info('Sending data (+metadata info for debug):', {
            data,
            reqId,
            retryOpts
        });

        const originCb = retryOpts.callback;
        retryOpts.callback = (error) => {
            if (this.terminated) {
                return false;
            }
            this.logger.error('Error on attempt to send data... Going to retry if re-try attempts left', error, {
                reqId,
                tries: retryOpts.tries
            });
            return originCb ? originCb(error) : true;
        };

        // eslint-disable-next-line consistent-return
        return promiseUtil.retry(() => new Promise((resolve, reject) => {
            if (this.terminated) {
                this.logger.error('Attempt to write data using terminated UDP Connector!', { reqId });
                // eslint-disable-next-line no-promise-executor-return
                return reject(new Error('UDPConnector was terminated'));
            }
            const privates = PRIVATES.get(this);
            if (privates.socket === null) {
                this.logger.info('Creating new socket', { reqId });

                const socket = dgram.createSocket({
                    reuseAddr: false,
                    type: 'udp4'
                });
                socket.on('message', (msg) => privates.data.push(msg));
                socket.on('error', (error) => this.logger.error('Error caught', error));

                this.eraseData();
                privates.socket = socket;
                privates.closePromise = new Promise((closeResolve) => {
                    socket.once('close', () => {
                        this.logger.info('Connection closed!');
                        if (privates.socket === socket) {
                            privates.closePromise = null;
                            privates.socket = null;
                        }
                        closeResolve();
                    });
                });
            }

            privates.socket.send(data, 0, data.length, this.port, this.host.host, (err) => {
                if (err) {
                    this.logger.error('Error caught on attempt to send data', { err, reqId });
                    reject(err);
                } else {
                    this.logger.info('Data successfully sent!', { reqId });
                    resolve();
                }
            });
        }), retryOpts);
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
                            privates.socket.close();
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
 * UDP Connector Manager
 *
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {PromiseRetryOptions} retryOptions - retry options
 */
class UDPConnectorManager {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {object} [options] - options
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
            }
        });
        this.logger = (options.logger || this.host.logger);
    }

    /**
     * Create new UDP Connector instance
     *
     * @param {integer} port - remote port
     * @param {PromiseRetryOptions} [options] - retry options
     *
     * @returns {UDPConnector} instance
     */
    create(port, options) {
        return new UDPConnector(this.host, port, {
            logger: this.logger,
            retry: assignDefaults(
                Object.assign({}, options || {}),
                this.retryOptions
            )
        });
    }

    /**
     * Create new UDP Connector instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {integer} port - remote port
     * @param {PromiseRetryOptions} [options] - retry options
     *
     * @returns {UDPConnector} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign UDPConnector to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Send data to remote host
     *
     * @param {integer} port - remote port
     * @param {any} data - data to send
     * @param {PromiseRetryOptions} [options] - retry options
     *
     * @returns {Promise} resolved once data sent
     */
    send(port, data, options) {
        const conn = this.create(port, options);
        let err;
        return conn.send(data)
            .catch((sendErr) => {
                err = sendErr;
            })
            .then(() => conn.terminate())
            .then(() => (err ? Promise.reject(err) : Promise.resolve()));
    }
}

module.exports = {
    UDPConnector,
    UDPConnectorManager
};
