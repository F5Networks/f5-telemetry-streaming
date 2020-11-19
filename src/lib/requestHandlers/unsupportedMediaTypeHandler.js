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
 * Unsupported Media Type Handler
 *
 * @param {Object} restOperation
 */
function UnsupportedMediaTypeHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(UnsupportedMediaTypeHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
UnsupportedMediaTypeHandler.prototype.getCode = function () {
    return 415;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
UnsupportedMediaTypeHandler.prototype.getBody = function () {
    return {
        code: this.getCode(),
        message: 'Unsupported Media Type',
        accept: ['application/json']
    };
};

module.exports = UnsupportedMediaTypeHandler;
