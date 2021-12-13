/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const BaseRequestHandler = require('./baseHandler');
const ErrorHandler = require('./errorHandler');
const router = require('./router');
const dataPublisher = require('../eventListener/dataPublisher');

/**
 * Request handler for /eventListener endpoint
 */
class EventListenerEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<EventListenerEndpointHandler>} resolved with instance of EventListenerEndpointHandler
     *                                                      once request processed
     */
    process() {
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
            .catch((error) => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst, enableDebug) => {
    // Only enable endpoints if controls.Debug=true
    if (enableDebug) {
        routerInst.register('POST', '/eventListener/:eventListener', EventListenerEndpointHandler);
        routerInst.register('POST', '/namespace/:namespace/eventListener/:eventListener', EventListenerEndpointHandler);
    }
});

module.exports = EventListenerEndpointHandler;
