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
const SSHClient = require('ssh2').Client;

const promiseUtil = require('../utils/promise');

/**
 * @module test/functional/shared/remoteHost/sshConnector
 *
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost").RemoteHost} RemoteHost
 */

const DEFAULTS = Object.freeze({
    encoding: 'utf8',
    port: 22,
    retry: Object.freeze({
        delay: 100,
        maxTries: 10
    }),
    tryKeyboard: true
});

const PRIVATES = new WeakMap();

let SSH_REQ_ID = 0;

/**
 * Check SSH connection
 *
 * @this SSHConnector
 *
 * @returns {Promise} resolved once connection is ready
 */
function checkConnection(reqId) {
    return new Promise((resolve, reject) => {
        const privates = PRIVATES.get(this);
        if (this.terminated) {
            this.logger.error('Attempt to execute command using terminated SSH Connector!', { reqId });
            // eslint-disable-next-line no-promise-executor-return
            reject(new Error('SSHConnector was terminated'));
        } else {
            if (privates.client === null) {
                initConnection.call(this, privates, reqId);
            }
            privates.readyPromise.then(resolve, reject);
        }
    });
}

/**
 * Check SFTP connection
 *
 * @this SSHConnector
 *
 * @returns {Promise} resolved once connection is ready
 */
function checkSftp(reqId) {
    return checkConnection.call(this, reqId)
        .then(() => {
            const privates = PRIVATES.get(this);
            if (privates.sftp === null) {
                initSftp.call(this, privates, reqId);
            }
            return privates.sftpReadyPromise;
        });
}

/**
 * Cleanup
 *
 * @this SSHConnector
 * @param {SSHClient} currentClient
 */
function cleanup(currentClient) {
    const privates = PRIVATES.get(this);
    if (privates.client === currentClient) {
        privates.client = null;
        privates.closePromise = null;
        privates.readyPromise = null;
        privates.sftp = null;
        privates.sftpReadyPromise = null;
    }
}

/**
 * Exec SFTP command
 *
 * @param {string} cmd - command
 * @param {Array} cmdArgs - command arguments
 * @param {PromiseRetryOptions} [retryOpts] - retry options
 *
 * @returns {Promise<any>} resolved once command executed
 */
function execSftpCommand(cmd, cmdArgs, retryOpts) {
    retryOpts = assignDefaults(Object.assign({}, retryOpts || {}), this.retryOptions);

    const reqId = nextReqId();
    const self = this;
    this.logger.info('Going to exec SFTP command', {
        cmd,
        cmdArgs,
        reqId
    });

    const originCb = retryOpts.callback;
    retryOpts.callback = (error) => {
        if (this.terminated) {
            return false;
        }
        this.logger.error('Error on attempt to execute command... Going to retry if re-try attempts left', error, {
            reqId,
            tries: retryOpts.tries
        });
        return originCb ? originCb(error) : true;
    };

    return checkSftp.call(this, reqId)
        .then(() => new Promise((sftpResolve, sftpReject) => {
            const privates = PRIVATES.get(this);
            if (!privates.sftp) {
                sftpReject(new Error('No SFTP client to use to execute command!'));
            } else {
                const isOk = privates.sftp[cmd].apply(privates.sftp, cmdArgs.slice(0).concat([function cb() {
                    if (arguments[0] instanceof Error) {
                        sftpReject(arguments[0]);
                    } else {
                        self.logger.info('SFTP command response', {
                            reqId,
                            cbArgs: arguments
                        });

                        let ret = Array.from(arguments);
                        if (ret[0] === null) {
                            // probably 'err' arg
                            ret = ret.slice(1);
                        }
                        if (ret.length === 1) {
                            ret = ret[0];
                        } else if (ret.length === 0) {
                            ret = undefined;
                        }

                        sftpResolve(ret);
                    }
                }]));
                if (isOk === false) {
                    sftpReject(new Error('SSHClientError: should wait for "continue" event before proceeding with next command. Try later'));
                }
            }
        }));
}

/**
 * Initialize SSH connection
 *
 * @this SSHConnector
 */
function initConnection(privates, reqId) {
    const sshOptions = Object.assign({
        host: this.host.host
    }, this.sshOptions);

    this.logger.info('Creating new client', { reqId, sshOptions });

    const client = new SSHClient();
    client.connect(sshOptions);

    privates.client = client;

    client.on('end', () => {
        this.logger.info('Client received FIN packet');
        client.end();
    });
    // The 'close' event will be called directly following 'error'.
    client.on('error', (error) => this.logger.error('Error caught', error));
    client.on('timeout', () => {
        this.logger.error('Timeout. Destroying client');
        client.destroy();
    });

    client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        this.logger.info('Keyboard interactive auth');
        finish([sshOptions.password]);
    });

    privates.readyPromise = new Promise((readyResolve, readyReject) => {
        const onClose = () => {
            this.logger.error('Unable to establish connection...', { reqId });
            // eslint-disable-next-line no-use-before-define
            client.removeListener('ready', onReady);
            cleanup.call(this, client);
            readyReject(new Error('Unable to establish connection...'));
        };
        const onReady = () => {
            client.removeListener('close', onClose);
            this.logger.info('Connection established!', { reqId });

            privates.closePromise = new Promise((closeResolve) => {
                client.once('close', () => {
                    this.logger.info('Connection closed!');
                    cleanup.call(this, client);
                    closeResolve();
                });
            });
            readyResolve();
        };
        client.once('close', onClose);
        client.once('ready', onReady);
    });
}

/**
 * Init SFTP connection
 *
 * @this SSHConnector
 */
function initSftp(privates, reqId) {
    this.logger.info('Creating new SFTP client', { reqId });
    privates.sftpReadyPromise = new Promise((readyResolve, readyReject) => {
        privates.client.sftp((err, sftp) => {
            if (err) {
                readyReject(err);
            } else {
                privates.sftp = sftp;
                readyResolve();
            }
        });
    });
}

/**
 * Get next request ID
 *
 * @returns {number} request ID
 */
function nextReqId() {
    const reqId = SSH_REQ_ID;
    SSH_REQ_ID += 1;
    return reqId;
}

/**
 * Terminate connection once operation completed
 *
 * @param {SSHConnector} conn
 * @param {Promise} promise
 *
 * @returns {Promise}
 */
function terminateOnceDone(conn, promise) {
    let err;
    let ret;
    return promise.then((_ret) => {
        ret = _ret;
    })
        .catch((execErr) => {
            err = execErr;
        })
        .then(() => conn.terminate())
        .then(() => (err ? Promise.reject(err) : Promise.resolve(ret)));
}

/**
 * SSH Connector
 *
 * @property {string} encoding - stderr and stdout encoding
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {PromiseRetryOptions} retryOptions - retry options
 * @property {SSHClientOptions} sshOptions - SSH options
 * @property {boolean} terminated - 'true' if connector permanently terminated
 */
class SSHConnector {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {SSHClientOptions} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {PromiseRetryOptions} [options.retry] - retry options
     */
    constructor(host, options) {
        options = assignDefaults(
            Object.assign({}, options || {}),
            DEFAULTS
        );
        const encoding = options.encoding;
        delete options.encoding;

        const retryOptions = Object.assign({}, options.retry || {});
        delete options.retry;

        Object.defineProperties(this, {
            encoding: {
                value: encoding
            },
            host: {
                value: host
            },
            retryOptions: {
                get() { return Object.assign({}, retryOptions); }
            },
            sshOptions: {
                get() { return Object.assign({}, options); }
            },
            terminated: {
                get() { return PRIVATES.get(this).terminated; }
            }
        });
        PRIVATES.set(this, {
            client: null,
            closeConnectorPromise: null,
            closePromise: null,
            readyPromise: null,
            sftp: null,
            terminated: false,
            terminatePromise: null
        });

        this.logger = (options.logger || this.host.logger).getChild(`ssh:${this.sshOptions.port}`);
        delete options.logger;
    }

    /**
     * Close current connection.
     *
     * Note: even if closed it still can be active if there are a lot of concurrent
     *  attempts to write data (new client will be created)
     *
     * @returns {Promise} resolved once closed
     * @rejects {Error} when no client to close
     */
    close() {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);
            if (!this.terminated) {
                if (!this.closeConnectorPromise) {
                    this.logger.info('Closing connector...');
                    const closeConnectorPromise = Promise.resolve()
                        .then(() => {
                            if (privates.client) {
                                privates.client._sock.unref();
                                privates.client.destroy();
                                return privates.closePromise.then(() => {
                                    if (privates.closeConnectorPromise === closeConnectorPromise) {
                                        privates.closeConnectorPromise = null;
                                    }
                                });
                            }
                            this.logger.info('No client to close!');
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
     * Copy local file to remote
     *
     * @param {string} localPath - local path to file
     * @param {string} remotePath - remote path to file
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise<boolean>} resolved once file copied
     */
    copyFileToRemote(localPath, remotePath, retryOpts) {
        return execSftpCommand.call(this, 'fastPut', [localPath, remotePath], retryOpts);
    }

    /**
     * Exec command
     *
     * @param {string} command - exec command on remote host
     * @param {Object} [commandOptions] - command options, see ssh2 docs
     * @param {string} [commandOptions.encoding] - encoding for stdout and stderr
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise<SSHExecResponse>} resolved with response once command executed
     */
    exec(command, commandOptions, retryOpts) {
        commandOptions = Object.assign({}, commandOptions || {});
        retryOpts = assignDefaults(Object.assign({}, retryOpts || {}), this.retryOptions);

        const encoding = commandOptions.encoding || this.encoding;
        delete commandOptions.encoding;

        const reqId = nextReqId();

        this.logger.info('Executing command (+metadata info for debug):', {
            command,
            reqId,
            retryOpts
        });

        const originCb = retryOpts.callback;
        retryOpts.callback = (error) => {
            if (this.terminated) {
                return false;
            }
            this.logger.error('Error on attempt to execute command... Going to retry if re-try attempts left', error, {
                reqId,
                tries: retryOpts.tries
            });
            return originCb ? originCb(error) : true;
        };

        // eslint-disable-next-line consistent-return
        return promiseUtil.retry(() => checkConnection.call(this, reqId)
            .then(() => new Promise((execResolve, execReject) => {
                const privates = PRIVATES.get(this);
                if (!privates.client) {
                    execReject(new Error('No client to use to execute command!'));
                } else {
                    const client = privates.client;
                    const isOk = client.exec(command, commandOptions || {}, (err, stream) => {
                        if (err) {
                            execReject(err);
                        } else {
                            const ret = {
                                code: null,
                                command,
                                signal: '',
                                stderr: '',
                                stdout: ''
                            };

                            stream.stderr.on('data', (data) => {
                                ret.stderr += data.toString(encoding);
                            });
                            stream.on('data', (data) => {
                                ret.stdout += data.toString(encoding);
                            });
                            stream.on('close', (code, signal) => {
                                this.logger.info('Command executed:', {
                                    reqId,
                                    ret
                                });
                                ret.code = code;
                                ret.signal = signal;
                                execResolve(ret);
                            });
                        }
                    });
                    if (isOk === false) {
                        execReject(new Error('SSHClientError: should wait for "continue" event before proceeding with next command. Try later'));
                    }
                }
            })),
        retryOpts);
    }

    /**
     * Check if remote path exists
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise<boolean>} resolved with 'true' if remote path exists
     */
    exists(path, retryOpts) {
        return execSftpCommand.call(this, 'exists', [path], retryOpts);
    }

    /**
     * Create remote directory
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once remote directory created
     */
    mkdir(path, retryOpts) {
        return execSftpCommand.call(this, 'mkdir', [path], retryOpts);
    }

    /**
     * Create remote directory if not exists
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once remote directory created
     */
    mkdirIfNotExists(path, retryOpts) {
        return execSftpCommand.call(this, 'exists', [path], retryOpts)
            .then((exists) => (exists
                ? Promise.resolve()
                : execSftpCommand.call(this, 'mkdir', [path], retryOpts)));
    }

    /**
     * Remote remote directory
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once remote directory removed
     */
    rmdir(path, retryOpts) {
        return execSftpCommand.call(this, 'rmdir', [path], retryOpts);
    }

    /**
     * Remote remote directory if exists
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once remote directory removed
     */
    rmdirIfExists(path, retryOpts) {
        return execSftpCommand.call(this, 'exists', [path], retryOpts)
            .then((exists) => (exists
                ? execSftpCommand.call(this, 'rmdir', [path], retryOpts)
                : Promise.resolve()));
    }

    /**
     * Terminate connector permanently
     *
     * @returns {Promise} resolved once terminated
     * @rejects {Error} when no client to close
     */
    terminate() {
        return new Promise((resolve, reject) => {
            const privates = PRIVATES.get(this);
            if (!this.terminated) {
                this.logger.info('Terminating connector...');
                privates.terminated = true;
                privates.terminatePromise = Promise.resolve()
                    .then(() => {
                        if (privates.client) {
                            privates.client._sock.unref();
                            privates.client.destroy();
                            return privates.closePromise.then(() => {
                                this.logger.info('Terminated!');
                            });
                        }
                        this.logger.info('No client to terminate');
                        return Promise.resolve();
                    });
            }
            privates.terminatePromise.then(resolve, reject);
        });
    }

    /**
     * Unlink remote path
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once remote path unlinked
     */
    unlink(path, retryOpts) {
        return execSftpCommand.call(this, 'unlink', [path], retryOpts);
    }

    /**
     * Unlink remote path if exists
     *
     * @param {string} path - remote path
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once remote path unlinked
     */
    unlinkIfExists(path, retryOpts) {
        return execSftpCommand.call(this, 'exists', [path], retryOpts)
            .then((exists) => (exists
                ? execSftpCommand.call(this, 'unlink', [path], retryOpts)
                : Promise.resolve()));
    }

    /**
     * Write data to remote file
     *
     * @param {string} path - remote path
     * @param {Buffer | string} data - data to write
     * @param {PromiseRetryOptions} [retry] - retry options
     *
     * @returns {Promise} resolved once data written to remove file
     */
    writeToFile(path, data, retryOpts) {
        return execSftpCommand.call(this, 'writeFile', [path, data], retryOpts);
    }
}

/**
 * SSH Connector Manager
 *
 * @property {RemoteHost} host - remote host
 * @property {Logger} logger - logger
 * @property {PromiseRetryOptions} retryOptions - retry options
 * @property {SSHClientOptions} sshOptions - SSH options
 */
class SSHConnectorManager {
    /**
     * Constructor
     *
     * @param {RemoteHost} host - remote host
     * @param {SSHClientOptions} [options] - options
     * @param {Logger} [options.logger] - logger
     * @param {PromiseRetryOptions} [options.retry] - retry options
     */
    constructor(host, options) {
        options = assignDefaults(
            Object.assign({}, options || {}),
            DEFAULTS
        );
        const retryOptions = Object.assign({}, options.retry || {});
        delete options.retry;

        this.logger = (options.logger || this.host.logger);
        delete options.logger;

        Object.defineProperties(this, {
            host: {
                value: host
            },
            retryOptions: {
                get() { return Object.assign({}, retryOptions); }
            },
            sshOptions: {
                get() { return Object.assign({}, options); }
            }
        });
    }

    /**
     * Copy local file to remote
     *
     * @param {string} localPath - local path to file
     * @param {string} remotePath - remote path to file
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise<boolean>} resolved once file copied
     */
    copyFileToRemote(localPath, remotePath, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.copyFileToRemote(localPath, remotePath));
    }

    /**
     * Create new SSH Connector instance
     *
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {SSHConnector} instance
     */
    create(options) {
        return new SSHConnector(this.host, assignDefaults(
            Object.assign({}, options || {}),
            Object.assign(this.sshOptions, {
                logger: this.logger,
                retry: this.retryOptions
            })
        ));
    }

    /**
     * Create new SSH Connector instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {SSHConnector} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign SSHConnector to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Exec command
     *
     * @param {string} command - exec command on remote host
     * @param {Object} [commandOptions] - command options, see ssh2 docs
     * @param {string} [commandOptions.encoding] - encoding for stdout and stderr
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise<SSHExecResponse>} resolved with response once command executed
     */
    exec(command, commandOptions, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.exec(command, commandOptions));
    }

    /**
     * Check if remote path exists
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise<boolean>} resolved with 'true' if remote path exists
     */
    exists(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.exists(path));
    }

    /**
     * Create remote directory
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once remote directory created
     */
    mkdir(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.mkdir(path));
    }

    /**
     * Create remote directory if not exists
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once remote directory created
     */
    mkdirIfNotExists(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.mkdirIfNotExists(path));
    }

    /**
     * Remote remote directory
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once remote directory removed
     */
    rmdir(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.rmdir(path));
    }

    /**
     * Remote remote directory if exists
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once remote directory removed
     */
    rmdirIfExists(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.rmdirIfExists(path));
    }

    /**
     * Unlink remote path
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once remote path unlinked
     */
    unlink(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.unlink(path));
    }

    /**
     * Unlink remote path if exists
     *
     * @param {string} path - remote path
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once remote path unlinked
     */
    unlinkIfExists(path, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.unlinkIfExists(path));
    }

    /**
     * Write data to remote file
     *
     * @param {string} path - remote path
     * @param {Buffer | string} data - data to write
     * @param {SSHClientOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {Promise} resolved once data written to remove file
     */
    writeToFile(path, data, options) {
        const conn = this.create(options);
        return terminateOnceDone(conn, conn.writeToFile(path, data));
    }
}

module.exports = {
    SSHConnector,
    SSHConnectorManager
};

/**
 * @typedef SSHExecResponse
 * @type {Object}
 * @property {number | null} code - return code
 * @property {string} command - command
 * @property {string | null} signal - signal interrupted a process
 * @property {string} stderr - stderr
 * @property {string} stdout - stdout
 */
/**
 * @typedef SSHClientOptions
 * @type {Object}
 * @property {string} [encoding = 'utf8'] - stderr and stdout encoding
 * @property {string} [password] - password for password-based user authentication
 * @property {integer} [port = 22] - port
 * @property {Buffer | string} [privateKey] - private key for either key-based or hostbased user authentication
 * @property {string} [username] - username for authentication
 */
