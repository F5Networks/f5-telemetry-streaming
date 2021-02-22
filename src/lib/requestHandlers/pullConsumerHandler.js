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
const pullConsumers = require('../pullConsumers');
const router = require('./router');

/**
 * /pullconsumer endpoint handler
 *
 * @param {Object} restOperation
 */
function PullConsumerEndpointHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(PullConsumerEndpointHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
PullConsumerEndpointHandler.prototype.getCode = function () {
    return this.code;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
PullConsumerEndpointHandler.prototype.getBody = function () {
    return this.body;
};

/**
 * Process request
 *
 * @returns {Promise<PullConsumerEndpointHandler>} resolved with instance of PullConsumerEndpointHandler
 *      once request processed
 */
PullConsumerEndpointHandler.prototype.process = function () {
    return pullConsumers.getData(this.params.consumer, this.params.namespace)
        .then((data) => {
            this.code = 200;
            this.body = data;
            return this;
        }).catch(error => new ErrorHandler(error).process());
};

router.on('register', (routerInst) => {
    routerInst.register('GET', '/pullconsumer/:consumer', PullConsumerEndpointHandler);
    routerInst.register('GET', '/namespace/:namespace/pullconsumer/:consumer', PullConsumerEndpointHandler);
});

module.exports = PullConsumerEndpointHandler;
