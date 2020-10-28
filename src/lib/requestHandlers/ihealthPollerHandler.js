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
const errors = require('../errors');
const ihealth = require('../ihealth');
const isObjectEmpty = require('../util').isObjectEmpty;
const router = require('./router');

/**
 * /ihealthpoller endpoint handler
 *
 * @param {Object} restOperation
 */
function IHealthPollerEndpointHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(IHealthPollerEndpointHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
IHealthPollerEndpointHandler.prototype.getCode = function () {
    return this.code;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
IHealthPollerEndpointHandler.prototype.getBody = function () {
    return this.body;
};

/**
 * Process request
 *
 * @returns {Promise<IHealthPollerEndpointHandler>} resolved with instance of IHealthPollerEndpointHandler
 *      once request processed
 */
IHealthPollerEndpointHandler.prototype.process = function () {
    if (isObjectEmpty(this.params)) {
        return new Promise((resolve) => {
            this.code = 200;
            this.body = {
                code: this.code,
                message: ihealth.getCurrentState()
            };
            resolve(this);
        });
    }

    return ihealth.startPoller(this.params.system, this.params.poller)
        .then((state) => {
            this.code = state.runningAlready ? 202 : 201;
            this.body = {
                code: this.code,
                systemDeclName: state.systemDeclName,
                iHealthDeclName: state.iHealthDeclName,
                message: state.message
            };
            return this;
        })
        .catch((error) => {
            if (error instanceof errors.ConfigLookupError) {
                this.code = 404;
                this.body = {
                    code: this.code,
                    message: error.message
                };
                return this;
            }
            return Promise.reject(error);
        });
};

router.on('register', (routerInst, enableDebug) => {
    if (enableDebug) {
        routerInst.register('GET', '/ihealthpoller', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/ihealthpoller/:system/:poller?', IHealthPollerEndpointHandler);
    }
});

module.exports = IHealthPollerEndpointHandler;
