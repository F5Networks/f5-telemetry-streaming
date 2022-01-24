/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const BaseRequestHandler = require('./baseHandler');
const constants = require('../constants');
const router = require('./router');

/**
 * Request handler for /info endpoint
 */
class InfoEndpointHandler extends BaseRequestHandler {
    /**
     * Get response code
     *
     * @returns {Integer} response code
     */
    getCode() {
        return this.code;
    }

    /**
     * Get response body
     *
     * @returns {Any} response body
     */
    getBody() {
        return this.body;
    }

    /**
     * Process request
     *
     * @returns {Promise<InfoEndpointHandler>} resolved with instance of InfoEndpointHandler once request processed
     */
    process() {
        this.code = 200;
        this.body = {
            nodeVersion: process.version,
            version: constants.VERSION,
            release: constants.RELEASE,
            schemaCurrent: constants.SCHEMA_INFO.CURRENT,
            schemaMinimum: constants.SCHEMA_INFO.MINIMUM
        };
        return Promise.resolve(this);
    }
}

router.on('register', (routerInst) => routerInst.register('GET', '/info', InfoEndpointHandler));

module.exports = InfoEndpointHandler;
