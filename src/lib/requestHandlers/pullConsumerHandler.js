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
const pullConsumers = require('../pullConsumers');
const router = require('./router');

/**
 * Request handler for /pullconsumer endpoint
 */
class PullConsumerEndpointHandler extends BaseRequestHandler {
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
     * Get HTTP Content-Type
     *
     * @returns {String} HTTP Content-Type header value
     */
    getContentType() {
        return this.contentType;
    }

    /**
     * Process request
     *
     * @returns {Promise<PullConsumerEndpointHandler>} resolved with instance of PullConsumerEndpointHandler
     *      once request processed
     */
    process() {
        return pullConsumers.getData(this.params.consumer, this.params.namespace)
            .then((response) => {
                this.code = 200;
                this.body = response.data;
                this.contentType = response.contentType || undefined; // If not set, default to iControlRest response
                return this;
            }).catch(error => new ErrorHandler(error).process());
    }
}

router.on('register', (routerInst) => {
    routerInst.register('GET', '/pullconsumer/:consumer', PullConsumerEndpointHandler);
    routerInst.register('GET', '/namespace/:namespace/pullconsumer/:consumer', PullConsumerEndpointHandler);
});

module.exports = PullConsumerEndpointHandler;
