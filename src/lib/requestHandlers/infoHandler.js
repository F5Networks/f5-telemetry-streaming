/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const nodeUtil = require('util');

const BaseRequestHandler = require('./baseHandler');
const constants = require('../constants');
const router = require('./router');

const BASE_SCHEMA_FILE = `${__dirname}/../../schema/latest/base_schema.json`;

/**
 * Bad URL Handler
 *
 * @param {Object} restOperation
 */
function InfoEndpointHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(InfoEndpointHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
InfoEndpointHandler.prototype.getCode = function () {
    return this.code;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
InfoEndpointHandler.prototype.getBody = function () {
    return this.body;
};

/**
 * Process request
 *
 * @returns {Promise<InfoEndpointHandler>} resolved with instance of InfoEndpointHandler once request processed
 */
InfoEndpointHandler.prototype.process = function () {
    return new Promise((resolve, reject) => {
        fs.readFile(BASE_SCHEMA_FILE, (readErr, data) => {
            if (readErr) {
                reject(readErr);
            } else {
                resolve(JSON.parse(data.toString()));
            }
        });
    })
        .then((baseSchema) => {
            const schemaVersionEnum = baseSchema.properties.schemaVersion.enum;
            this.code = 200;
            this.body = {
                nodeVersion: process.version,
                version: constants.VERSION,
                release: constants.RELEASE,
                schemaCurrent: schemaVersionEnum[0],
                schemaMinimum: schemaVersionEnum[schemaVersionEnum.length - 1]
            };
            return this;
        });
};

router.on('register', routerInst => routerInst.register('GET', '/info', InfoEndpointHandler));

module.exports = InfoEndpointHandler;
