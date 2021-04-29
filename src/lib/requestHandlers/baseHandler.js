/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Base class for Request Handlers
 */
class BaseRequestHandler {
    /**
     * Constructor
     *
     * @param {Object} restOperation
     * @param {Object} params
     */
    constructor(restOperation, params) {
        this.restOperation = restOperation;
        this.params = params;
    }

    /**
     * Get response body
     *
     * @returns {Any} response body
     */
    getBody() {
        throw new Error('Method "getBody" not implemented');
    }

    /**
     * Get response code
     *
     * @returns {Integer} response code
     */
    getCode() {
        throw new Error('Method "getCode" not implemented');
    }

    /**
     * Get HTTP method name
     *
     * @returns {String} HTTP method name converted to upper case
     */
    getMethod() {
        return this.restOperation.getMethod().toUpperCase();
    }

    /**
     * Process request
     *
     * @returns {Promise<BaseRequestHandler>} resolved with instance of BaseRequestHandler
     *      once request processed
     */
    process() {
        return Promise.resolve(this);
    }
}

module.exports = BaseRequestHandler;
