/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const nodeUtil = require('util');

const BaseRequestHandler = require('./baseHandler');
const configWorker = require('../config');
const router = require('./router');

/**
 * /declare endpoint handler
 *
 * @param {Object} restOperation
 */
function DeclareEndpointHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(DeclareEndpointHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
DeclareEndpointHandler.prototype.getCode = function () {
    return this.code;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
DeclareEndpointHandler.prototype.getBody = function () {
    return this.body;
};

/**
 * Process request
 *
 * @returns {Promise<DeclareEndpointHandler>} resolved with instance of DeclareEndpointHandler
 *      once request processed
 */
DeclareEndpointHandler.prototype.process = function () {
    let promise;
    if (this.getMethod() === 'POST') {
        promise = configWorker.processDeclaration(this.restOperation.getBody());
    } else if (this.getMethod() === 'GET') {
        promise = configWorker.getRawConfig();
    }
    return promise.then((config) => {
        this.code = 200;
        this.body = {
            message: 'success',
            declaration: config
        };
        return this;
    })
        .catch((error) => {
            if (error.code === 'ValidationError') {
                this.code = 422;
                this.body = {
                    code: this.code,
                    message: 'Unprocessable entity',
                    error: error.message
                };
                return this;
            }
            return Promise.reject(error);
        });
};

router.on('register', (routerInst) => {
    routerInst.register('GET', '/declare', DeclareEndpointHandler);
    routerInst.register('POST', '/declare', DeclareEndpointHandler);
});

module.exports = DeclareEndpointHandler;
