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
 * Bad URL Handler
 *
 * @param {Object} restOperation
 */
function BadURLHandler() {
    BaseRequestHandler.apply(this, arguments);
}
nodeUtil.inherits(BadURLHandler, BaseRequestHandler);

/**
 * Get response code
 *
 * @returns {Integer} response code
 */
BadURLHandler.prototype.getCode = function () {
    return 400;
};

/**
 * Get response body
 *
 * @returns {Any} response body
 */
BadURLHandler.prototype.getBody = function () {
    return `Bad URL: ${this.restOperation.getUri().pathname}`;
};

module.exports = BadURLHandler;
