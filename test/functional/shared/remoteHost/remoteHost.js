/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const mainLogger = require('../utils/logger').getChild('RH');

/**
 * @module test/functional/shared/remoteHost/remoteHost
 *
 * @typedef {import("../utils/logger").Logger} Logger
 */

/**
 * Remote Host
 *
 * @property {string} host - remote host
 * @property {Logger} logger - logger
 */
class RemoteHost {
    /**
     * Constructor
     *
     * @param {string} host - remote host/address
     */
    constructor(host) {
        Object.defineProperties(this, {
            host: {
                value: host
            }
        });
        this.logger = mainLogger.getChild(`[${this.host}]`);
    }
}

module.exports = RemoteHost;
