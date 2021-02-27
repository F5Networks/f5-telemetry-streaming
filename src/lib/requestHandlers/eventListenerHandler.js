/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const dataPublisher = require('../eventListener/dataPublisher');

/**
 * /eventListener endpoint handler
 *
 * @param {Object} restOperation
 */
function EventListenerEndpointHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(EventListenerEndpointHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
EventListenerEndpointHandler.prototype.getCode = function () {
    return this.code;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
EventListenerEndpointHandler.prototype.getBody = function () {
    return this.body;
};

/**
 * Process request
 *
 * @returns {Promise<EventListenerEndpointHandler>} resolved with instance of EventListenerEndpointHandler
 *                                                      once request processed
 */
EventListenerEndpointHandler.prototype.process = function () {
    const dataToSend = this.restOperation.getBody();
    return dataPublisher.sendDataToListener(dataToSend, this.params.eventListener,
        { namespace: this.params.namespace })
        .then(() => {
            this.body = {
                message: 'success',
                data: dataToSend
            };
            this.code = 200;
            return this;
        })
        .catch(error => new ErrorHandler(error).process());
};

router.on('register', (routerInst, enableDebug) => {
    // Only enable endpoints if controls.Debug=true
    if (enableDebug) {
        routerInst.register('POST', '/eventListener/:eventListener', EventListenerEndpointHandler);
        routerInst.register('POST', '/namespace/:namespace/eventListener/:eventListener', EventListenerEndpointHandler);
    }
});

module.exports = EventListenerEndpointHandler;
