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

/**
 * Internal Server Error Handler
 *
 * @param {Object} restOperation
 */
function InternalServerErrorHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(InternalServerErrorHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
InternalServerErrorHandler.prototype.getCode = function () {
    return 500;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
InternalServerErrorHandler.prototype.getBody = function () {
    return {
        code: this.getCode(),
        message: 'Internal Server Error'
    };
};

module.exports = InternalServerErrorHandler;
