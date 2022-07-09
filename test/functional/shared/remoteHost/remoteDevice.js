/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const HTTPConnectorManager = require('./httpConnector').HTTPConnectorManager;
const RemoteHost = require('./remoteHost');
const SSHConnectorManager = require('./sshConnector').SSHConnectorManager;
const TCPConnectorManager = require('./tcpConnector').TCPConnectorManager;
const UDPConnectorManager = require('./udpConnector').UDPConnectorManager;

/**
 * @module test/functional/shared/remoteHost/remoteDevice
 *
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost").RemoteHost} RemoteHost
 * @typedef {import("../utils/request").RequestOptions} RequestOptions
 * @typedef {import("./sshConnector").SSHClientOptions} SSHClientOptions
 * @typedef {import("./tcpConnector").TCPConnectorOptions} TCPConnectorOptions
 */

/**
 * Remote Device
 *
 * @property {RemoteHost} host - remote host
 * @property {HTTPConnectorManager} http - HTTP Connector(s) manager
 * @property {Logger} logger - logger
 * @property {SSHConnectorManager} ssh - SSH connection(s) manager
 * @property {TCPConnectorManager} tcp - TCP connection(s) manager
 * @property {UDPConnectorManager} udp - UDP connection(s) manager
 */
class RemoteDevice {
    /**
     * Constructor
     *
     * @param {string} host - remote host
     */
    constructor(host) {
        Object.defineProperty(this, 'host', {
            value: new RemoteHost(host)
        });
        this.logger = this.host.logger.getChild('remoteDevice');
    }

    /**
     * Initialize HTTP Connector(s) manager
     *
     * @param {RequestOptions} [options] - request options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {HTTPConnectorManager} instance
     */
    initHTTPStack(options) {
        Object.defineProperty(
            this, 'http', {
                value: new HTTPConnectorManager(
                    this.host,
                    Object.assign(
                        {},
                        Object.assign({}, options || {}),
                        {
                            logger: this.logger
                        }
                    )
                )
            }
        );
        return this.http;
    }

    /**
     * Initialize SSH Connector(s) manager
     *
     * @param {SSHClientOptions} [options] - SSH options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {TCPConnectorManager} instance
     */
    initSSHStack(options) {
        Object.defineProperty(
            this, 'ssh', {
                value: new SSHConnectorManager(
                    this.host,
                    Object.assign(
                        {},
                        Object.assign({}, options || {}),
                        {
                            logger: this.logger
                        }
                    )
                )
            }
        );
        return this.ssh;
    }

    /**
     * Initialize TCP Connector(s) manager
     *
     * @param {TCPConnectorOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - retry options
     *
     * @returns {TCPConnectorManager} instance
     */
    initTCPStack(options) {
        Object.defineProperty(
            this, 'tcp', {
                value: new TCPConnectorManager(
                    this.host,
                    Object.assign(
                        {},
                        Object.assign({}, options || {}),
                        {
                            logger: this.logger
                        }
                    )
                )
            }
        );
        return this.tcp;
    }

    /**
     * Initialize UDP Connector(s) manager
     *
     * @param {PromiseRetryOptions} [options] - retry options
     *
     * @returns {UDPConnectorManager} instance
     */
    initUDPStack(options) {
        Object.defineProperty(
            this, 'udp', {
                value: new UDPConnectorManager(
                    this.host,
                    {
                        logger: this.logger,
                        retry: Object.assign({}, options || {})
                    }
                )
            }
        );
        return this.udp;
    }
}

module.exports = RemoteDevice;
