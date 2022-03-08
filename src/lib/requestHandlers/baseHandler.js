/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
     * Get HTTP headers
     *
     * @returns {Object<string, any>} HTTP headers
     */
    getHeaders() {
        return this.restOperation.getHeaders() || {};
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
     * Get HTTP Content-Type
     * Base Handler returns undefined, allowing iControlRest to set Content-Type
     *
     * @returns {undefined} HTTP Content-Type header value
     */
    getContentType() {
        return undefined;
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
