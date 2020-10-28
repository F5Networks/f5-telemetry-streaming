/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EventEmitter = require('events');
const nodeUtil = require('util');
const TinyRequestRouter = require('tiny-request-router').Router;

const BadURLHandler = require('./badUrlHandler');
const configWorker = require('../config');
const constants = require('../constants');
const InternalServerErrorHandler = require('./internalServerErrorHandler');
const logger = require('../logger');
const MethodNotAllowedHandler = require('./methodNotAllowedHandler');
const UnsupportedMediaTypeHandler = require('./unsupportedMediaTypeHandler');
const util = require('../util');

/**
 * Simple router to route incoming requests to REST API.
 *
 * @class
 *
 * @property {Object} routes - mapping /path/to/resource to handler
 */
function RequestRouter() {
    EventEmitter.call(this);
    this.router = new TinyRequestRouter();
    this.pathToMethod = {};
}
nodeUtil.inherits(RequestRouter, EventEmitter);

/**
 * Register request handler.
 *
 * @public
 * @param {String | Array<String>} method - HTTP method (POST, GET, etc.), could be array
 * @param {String} endpointURI - URI path (see path-to-regexp npm module for more info)
 * @param {Object} handlerClass - request handler class (BaseRequestHandler as parent class)
 */
RequestRouter.prototype.register = function (methods, endpointURI, handlerClass) {
    this.pathToMethod[endpointURI] = this.pathToMethod[endpointURI] || {};
    methods = Array.isArray(methods) ? methods : [methods];
    methods.forEach((method) => {
        method = method.toUpperCase();
        logger.debug(`Registering handler for endpoint - ${method} ${endpointURI}`);
        this.pathToMethod[endpointURI][method] = handlerClass;
    });
    this.router.all(endpointURI);
};

/**
 * Remove all registered handlers
 */
RequestRouter.prototype.removeAllHandlers = function () {
    this.router.routes = [];
    this.pathToMethod = {};
};

/**
 * Process request.
 *
 * @public
 * @param {Object} restOperation - request object
 * @param {String} [uriPrefix] - prefix to remove from URI before processing
 *
 * @returns {Promise} resolved once request processed
 */
RequestRouter.prototype.processRestOperation = function (restOperation, uriPrefix) {
    let responsePromise;
    try {
        responsePromise = this._processRestOperation(restOperation, uriPrefix);
    } catch (err) {
        // in case if synchronous part of the code failed
        logger.exception('restOperation processing error', err);
        responsePromise = (new InternalServerErrorHandler(restOperation)).process();
    }
    return responsePromise.catch((err) => {
        logger.exception('restOperation processing error', err);
        return (new InternalServerErrorHandler(restOperation)).process();
    })
        .then((handler) => {
            logger.info(`${handler.getCode()} ${restOperation.getMethod().toUpperCase()} ${restOperation.getUri().pathname}`);
            util.restOperationResponder(restOperation, handler.getCode(), handler.getBody());
        })
        .catch((fatalError) => {
            // in case if .then above failed
            logger.exception('restOperation processing fatal error', fatalError);
            util.restOperationResponder(restOperation, 500, 'Internal Server Error');
        });
};

/**
 * Process request.
 *
 * @private
 * @param {Object} restOperation - request object
 * @param {String} [uriPrefix] - prefix to remove from URI before processing
 *
 * @returns {Promise} resolved once request processed
 */
RequestRouter.prototype._processRestOperation = function (restOperation, uriPrefix) {
    const requestURI = restOperation.getUri();
    const requestPathname = requestURI.pathname;
    const requestMethod = restOperation.getMethod().toUpperCase();
    logger.info(`Request received: ${requestMethod} ${requestPathname}`);

    const handler = this.findRequestHandler(restOperation, uriPrefix);
    logger.debug(`'${handler.constructor.name}' request handler assigned to request: ${requestMethod} ${requestPathname}`);
    return handler.process();
};

/**
 * Find handler for request
 *
 * @public
 * @param {Object} restOperation - request object
 * @param {String} [uriPrefix] - prefix to remove from URI before processing
 *
 * @returns {BaseRequestHandler} handler instance
 */
RequestRouter.prototype.findRequestHandler = function (restOperation, uriPrefix) {
    // Somehow we need to respond to such requests.
    // When Content-Type === application/json then getBody() tries to
    // evaluate data as JSON and returns code 500 on failure.
    // Don't know how to re-define this behavior.
    if (restOperation.getBody() && restOperation.getContentType().toLowerCase() !== 'application/json') {
        return new UnsupportedMediaTypeHandler();
    }

    const requestURI = restOperation.getUri();
    const requestPathname = requestURI.pathname;
    const requestMethod = restOperation.getMethod().toUpperCase();
    // strip prefix if needed
    let normalizedPathname = requestPathname;

    if (uriPrefix) {
        uriPrefix = uriPrefix.startsWith('/') ? uriPrefix : `/${uriPrefix}`;
        if (normalizedPathname.startsWith(uriPrefix)) {
            normalizedPathname = normalizedPathname.slice(uriPrefix.length);
        }
    }
    const match = this.router.match(requestMethod, normalizedPathname);
    if (!match) {
        return new BadURLHandler(restOperation);
    }
    const RequestHandler = this.pathToMethod[match.path][requestMethod];
    if (!RequestHandler) {
        const allowed = Object.keys(this.pathToMethod[match.path]);
        allowed.sort();
        return new MethodNotAllowedHandler(restOperation, allowed);
    }
    const handler = new RequestHandler(restOperation, match.params);
    return handler;
};

/**
 * Register Endpoints
 *
 * @public
 * @param {Boolean} enableDebug - enable debug endpoints
 */
RequestRouter.prototype.registerAllHandlers = function (enableDebug) {
    this.emit('register', this, enableDebug);
};

/**
 * Handle for config changes
 *
 * @public
 */
RequestRouter.prototype.onConfigChange = function (config) {
    logger.debug('configWorker change event in RequestRouter'); // helpful debug

    const settings = util.getDeclarationByName(
        config, constants.CONFIG_CLASSES.CONTROLS_CLASS_NAME, constants.CONTROLS_PROPERTY_NAME
    ) || {};

    this.removeAllHandlers();
    this.registerAllHandlers(settings.debug);
};

const defaultRouter = new RequestRouter();
configWorker.on('change', defaultRouter.onConfigChange.bind(defaultRouter));

module.exports = defaultRouter;
