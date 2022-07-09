/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const hasIn = require('lodash/hasIn');

/**
 * @module test/functional/shared/remoteHost/icontrolAPI
 *
 * @typedef {import("./icontrolConnector").IControlConnector} IControlConnector
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 */

/**
 * iControl API
 *
 * @property {Logger} logger - logger
 * @property {IControlConnector} icontrol - iControl Connector
 */
class IControlAPI {
    /**
     * Constructor
     *
     * @param {IControlConnector} icontrol - iControl Connector
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - logger
     */
    constructor(icontrol, options) {
        Object.defineProperties(this, {
            icontrol: {
                value: icontrol
            }
        });

        options = options || {};
        this.logger = (options.logger || this.icontrol.logger).getChild('icAPI');
    }

    /**
     * Fetch BIG-IP software version
     *
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<string>} resolved with software version
     */
    getSoftwareVersion(retry) {
        return this.icontrol.makeRequestWithAuth({
            method: 'GET',
            retry,
            uri: '/mgmt/tm/sys/clock'
        })
            .then((data) => data.selfLink.split('ver=')[1]);
    }

    /**
     * Run shell command using BASH endpoint
     *
     * @param {string} cmd - command
     * @param {PromiseRetryOptions} [retry] - re-try options
     *
     * @returns {Promise<any>} resolved with response
     */
    runBashCmd(cmd, retry) {
        return this.icontrol.makeRequestWithAuth({
            body: {
                command: 'run',
                utilCmdArgs: `-c "${cmd}"`
            },
            json: true,
            method: 'POST',
            retry,
            uri: '/mgmt/tm/util/bash'
        });
    }
}

/**
 * iControl API Manager
 *
 * @property {Logger} logger - logger
 * @property {IControlConnector} icontrol - iControl Connector
 */
class IControlAPIManager {
    /**
     * Constructor
     *
     * @param {IControlAPIManagerOptions} options - options
     * @property {IControlConnector} options.icontrol - iControl Connector
     * @param {Logger} [options.logger] - logger
     */
    constructor(options) {
        options = options || {};
        this.logger = (options.logger || options.icontrol.transport.host.logger);

        Object.defineProperties(this, {
            icontrol: {
                value: options.icontrol
            }
        });
    }

    /**
     * Create new iControl API instance
     *
     * @param {IControlAPIManagerOptions} [options] - options
     *
     * @returns {IControlAPI} instance
     */
    create(options) {
        options = options || {};
        return new IControlAPI(
            options.icontrol || this.icontrol,
            {
                logger: this.logger
            }
        );
    }

    /**
     * Create new iControl API instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {IControlAPIManagerOptions} [options] - options
     *
     * @returns {IControlAPI} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign IControlAPI to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Fetch BIG-IP software version
     *
     * @param {IControlAPIManagerOptions} [options] - options
     * @param {PromiseRetryOptions} [options.retry] - re-try options
     *
     * @returns {Promise<string>} resolved with software version
     */
    getSoftwareVersion(options) {
        options = options || {};
        return this.create({ icontrol: options.icontrol }).getSoftwareVersion(options.retry);
    }
}

module.exports = {
    IControlAPI,
    IControlAPIManager
};

/**
 * @typedef IControlAPIManagerOptions
 * @type {Object}
 * @property {IControlConnector} [icontrol] - iControl Connector
 */
