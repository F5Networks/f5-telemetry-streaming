/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const nodeUtil = require('util');
const BaseRequestHandler = require('../baseHandler');

/**
 * Method Not Allowed Handler
 *
 * @param {Object} restOperation
 * @param {Array} allowed - list of allowed methods
 */
function MethodNotAllowedHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(MethodNotAllowedHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
MethodNotAllowedHandler.prototype.getCode = function () {
    return 405;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
MethodNotAllowedHandler.prototype.getBody = function () {
    return {
        code: this.getCode(),
        message: 'Method Not Allowed',
        allow: this.params
    };
};

module.exports = MethodNotAllowedHandler;
