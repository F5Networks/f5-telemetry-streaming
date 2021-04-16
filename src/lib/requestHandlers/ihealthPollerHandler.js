/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const BaseRequestHandler = require('./baseHandler');
const ErrorHandler = require('./errorHandler');
const ihealth = require('../ihealth');
const router = require('./router');

/**
 * Request handler for /ihealthpoller endpoint
 */
class IHealthPollerEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<IHealthPollerEndpointHandler>} resolved with instance of IHealthPollerEndpointHandler
     *      once request processed
     */
    process() {
        let responsePromise = Promise.resolve();
        if (!this.params.system) {
            responsePromise = responsePromise.then(() => new Promise(
                resolve => resolve(ihealth.getCurrentState(this.params.namespace))
            )
                .then((statuses) => {
                    this.code = 200;
                    this.body = {
                        code: this.code,
                        message: statuses
                    };
                    return this;
                }));
        } else {
            responsePromise = responsePromise.then(() => ihealth.startPoller(this.params.system, this.params.namespace)
                .then((state) => {
                    this.code = state.isRunning ? 202 : 201;
                    this.body = {
                        code: this.code,
                        state
                    };
                    return this;
                }));
        }
        return responsePromise.catch(error => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst, enableDebug) => {
    if (enableDebug) {
        routerInst.register('GET', '/ihealthpoller', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/ihealthpoller/:system', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/namespace/:namespace/ihealthpoller', IHealthPollerEndpointHandler);
        routerInst.register('GET', '/namespace/:namespace/ihealthpoller/:system', IHealthPollerEndpointHandler);
    }
});

module.exports = IHealthPollerEndpointHandler;
