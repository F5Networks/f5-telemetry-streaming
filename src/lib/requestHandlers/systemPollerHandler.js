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
const ErrorHandler = require('./errorHandler');
const router = require('./router');
const systemPoller = require('../systemPoller');

/**
 * /systempoller endpoint handler
 *
 * @param {Object} restOperation
 */
function SystemPollerEndpointHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(SystemPollerEndpointHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
SystemPollerEndpointHandler.prototype.getCode = function () {
    return this.code;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
SystemPollerEndpointHandler.prototype.getBody = function () {
    return this.body;
};

/**
 * Process request
 *
 * @returns {Promise<SystemPollerEndpointHandler>} resolved with instance of SystemPollerEndpointHandler
 *      once request processed
 */
SystemPollerEndpointHandler.prototype.process = function () {
    return systemPoller.getPollersConfig(this.params.system, {
        pollerName: this.params.poller,
        namespace: this.params.namespace,
        includeDisabled: true
    })
        .then(systemPoller.fetchPollersData.bind(systemPoller))
        .then((fetchedData) => {
            this.code = 200;
            this.body = fetchedData.map(d => d.data);
            return this;
        })
        .catch(error => new ErrorHandler(error).process());
};

router.on('register', (routerInst, enableDebug) => {
    if (enableDebug) {
        routerInst.register('GET', '/systempoller/:system/:poller?', SystemPollerEndpointHandler);
        routerInst.register('GET', '/namespace/:namespace/systempoller/:system/:poller?', SystemPollerEndpointHandler);
    }
});

module.exports = SystemPollerEndpointHandler;
