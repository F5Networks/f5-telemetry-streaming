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
const httpErrors = require('./httpErrors');
const configWorker = require('../config');
const logger = require('../logger');
const router = require('./router');

/**
 * Request handler for /declare endpoint
 */
class DeclareEndpointHandler extends BaseRequestHandler {
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
     * @returns {Promise<DeclareEndpointHandler>} resolved with instance of DeclareEndpointHandler
     *      once request processed
     */
    process() {
        let promise;
        const namespace = this.params && this.params.namespace ? this.params.namespace : undefined;

        if (this.getMethod() === 'POST') {
            if (DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG) {
                logger.debug('Can\'t process new declaration while previous one is still in progress');
                return Promise.resolve(new ErrorHandler(new httpErrors.ServiceUnavailableError()));
            }
            DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = true;
            promise = namespace
                ? configWorker.processNamespaceDeclaration(this.restOperation.getBody(), this.params.namespace)
                : configWorker.processDeclaration(this.restOperation.getBody());

            promise = promise
                .then((config) => {
                    DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = false;
                    return config;
                })
                .catch((err) => {
                    DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = false;
                    return Promise.reject(err);
                });
        } else {
            promise = configWorker.getDeclaration(namespace);
        }

        return promise.then((config) => {
            this.code = 200;
            this.body = {
                message: 'success',
                declaration: config
            };
            return this;
        })
            .catch(error => new ErrorHandler(error).process());
    }
}

DeclareEndpointHandler.PROCESSING_DECLARATION_FLAG = false;

router.on('register', (routerInst) => {
    routerInst.register('GET', '/declare', DeclareEndpointHandler);
    routerInst.register('POST', '/declare', DeclareEndpointHandler);
    routerInst.register('GET', '/namespace/:namespace/declare', DeclareEndpointHandler);
    routerInst.register('POST', '/namespace/:namespace/declare', DeclareEndpointHandler);
});

module.exports = DeclareEndpointHandler;
