/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const errors = require('../errors');
const HttpError = require('./httpErrors.js').HttpError;

/**
 * Handler for errors encountered during requests
 *
 * @param {Object} error - Error object
 */
function ErrorHandler(error) {
    this.error = error;
}

ErrorHandler.prototype.getCode = function () {
    if (this.error instanceof HttpError) {
        return this.error.getCode();
    }
    if (this.error instanceof errors.BaseError) {
        const httpError = this.getHttpEquivalent(this.error);
        return httpError.code;
    }
    return undefined;
};

ErrorHandler.prototype.getBody = function () {
    if (this.error instanceof HttpError) {
        return this.error.getBody();
    }
    if (this.error instanceof errors.BaseError) {
        const httpError = this.getHttpEquivalent(this.error);
        return httpError.body;
    }
    return undefined;
};

ErrorHandler.prototype.process = function () {
    if (this.error instanceof HttpError) {
        this.code = this.getCode();
        this.body = this.getBody();
        return Promise.resolve(this);
    }

    if (this.error instanceof errors.BaseError) {
        const httpError = this.getHttpEquivalent(this.error);
        this.code = httpError.code;
        this.body = httpError.body;
        return Promise.resolve(this);
    }

    return Promise.reject(this.error);
};

ErrorHandler.prototype.getHttpEquivalent = function (error) {
    const httpError = {};
    if (error instanceof errors.ConfigLookupError) {
        httpError.code = 404;
        httpError.body = {
            code: 404,
            message: error.message
        };
    } else if (error instanceof errors.ValidationError) {
        httpError.code = 422;
        httpError.body = {
            code: 422,
            message: 'Unprocessable entity',
            error: error.message
        };
    }
    return httpError;
};

module.exports = ErrorHandler;
