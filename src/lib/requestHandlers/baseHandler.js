/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Base class for Request Handlers
 *
 * @param {Object} restOperation
 * @param {Object} params
 */
function BaseRequestHandler(restOperation, params) {
    this.restOperation = restOperation;
    this.params = params;
}

/**
 * Get response body
 *
 * @returns {Any} response body
 */
BaseRequestHandler.prototype.getBody = function () {
    throw new Error('Method "getBody" not implemented');
};

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
BaseRequestHandler.prototype.getCode = function () {
    throw new Error('Method "getCode" not implemented');
};

/**
 * Get HTTP method name
 *
 * @returns {String} HTTP method name converted to upper case
 */
BaseRequestHandler.prototype.getMethod = function () {
    return this.restOperation.getMethod().toUpperCase();
};

/**
 * Process request
 *
 * @returns {Promise<BaseRequestHandler>} resolved with instance of BaseRequestHandler
 *      once request processed
 */
BaseRequestHandler.prototype.process = function () {
    return Promise.resolve(this);
};

module.exports = BaseRequestHandler;
