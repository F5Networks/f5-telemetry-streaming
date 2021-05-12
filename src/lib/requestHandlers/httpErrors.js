/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

class HttpError extends Error {
    getCode() {
        throw new Error('Method "getCode" not implemented');
    }

    getBody() {
        throw new Error('Method "getBody" not implemented');
    }
}

class BadURLError extends HttpError {
    constructor(pathName) {
        super();
        this.pathName = pathName;
    }

    getCode() {
        return 400;
    }

    getBody() {
        return `Bad URL: ${this.pathName}`;
    }
}

class InternalServerError extends HttpError {
    getCode() {
        return 500;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Internal Server Error'
        };
    }
}

class MethodNotAllowedError extends HttpError {
    constructor(allowedMethods) {
        super();
        this.allowedMethods = allowedMethods;
    }

    getCode() {
        return 405;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Method Not Allowed',
            allow: this.allowedMethods
        };
    }
}

class ServiceUnavailableError extends HttpError {
    getCode() {
        return 503;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Service Unavailable'
        };
    }
}

class UnsupportedMediaTypeError extends HttpError {
    getCode() {
        return 415;
    }

    getBody() {
        return {
            code: this.getCode(),
            message: 'Unsupported Media Type',
            accept: ['application/json']
        };
    }
}

module.exports = {
    HttpError,
    BadURLError,
    InternalServerError,
    MethodNotAllowedError,
    ServiceUnavailableError,
    UnsupportedMediaTypeError
};
