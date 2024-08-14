/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const TinyRouter = require('tiny-request-router').Router;

const assert = require('../utils/assert');
const CT_APP_JSON = require('./contentTypes').APP_JSON;
const httpErrors = require('./errors');

/**
 * @module restapi/router
 *
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('./errors').MethodNotAllowedError} MethodNotAllowedError
 * @typedef {import('./errors').NotFoundError} NotFoundError
 * @typedef {import('./request').Request} Request
 * @typedef {import('./index').RequestHandler} RequestHandler
 * @typedef {import('./errors').UnsupportedMediaTypeError} UnsupportedMediaTypeError
 */

/**
 * Simple router to route incoming requests to REST API Service.
 *
 * @property {Logger} logger
 * @property {string} uriPrefix
 */
class Router {
    /**
     * @param {object} options - options
     * @param {Logger} options.logger - logger
     * @param {string} [options.uriPrefix = '/'] - URI prefix
     */
    constructor({ logger, uriPrefix }) {
        uriPrefix = uriPrefix || '/';

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            logger: {
                value: logger.getChild(this.constructor.name)
            },
            uriPrefix: {
                value: uriPrefix.startsWith('/')
                    ? uriPrefix
                    : `/${uriPrefix}`
            }
        });

        // router to match requests
        this._router = new TinyRouter();
        // routers to match HTTP methods
        this._routes = {};
        // callbacks to destroy handlers
        this._destroyHandlers = [];
    }

    /**
     * NOTE:
     * Sets req's `params` property when handler found only!
     *
     * @param {Request} req - request
     *
     * @returns {RequestHandler} matched request handler
     *
     * @throws {NotFoundError} when unable to find a handler for URI
     * @throws {MethodNotAllowedError} when handler does not handle HTTP method
     * @throws {UnsupportedMediaTypeError} when invalid content-type received
     */
    match(req) {
        // Somehow we need to respond to such requests.
        // When Content-Type === application/json then getBody() tries to
        // evaluate data as JSON and returns code 500 on failure.
        // Don't know how to re-define this behavior.
        if (req.getBody() && req.getContentType() !== CT_APP_JSON) {
            throw new httpErrors.UnsupportedMediaTypeError([CT_APP_JSON]);
        }

        const method = req.getMethod();
        const uri = req.getURI();

        const match = this._router.match(method, uri);
        if (!(match && this._routes[match.path])) {
            throw new httpErrors.NotFoundError(uri);
        }

        const handler = this._routes[match.path][method];
        if (!handler) {
            throw new httpErrors.MethodNotAllowedError(
                Object.keys(this._routes[match.path]).sort()
            );
        }

        req.params = match.params;
        return handler[0];
    }

    /**
     * Register request handler
     *
     * NOTE: may sliently override existing handlers
     *
     * @param {string | string[]} method - HTTP method (POST, GET, etc.), could be array
     * @param {string} endpointURI - URI path (see path-to-regexp npm module for more info)
     * @param {RequestHandler} handler - request handler
     *
     * @returns {function} callback to call to deregister handler
     */
    register(methods, endpointURI, handler) {
        methods = Array.isArray(methods) ? methods : [methods];

        methods.forEach((method) => assert.string(method, 'HTTP method'));
        assert.string(endpointURI, 'endpointURI');
        assert.instanceOf(handler.handle, Function, 'handler.handle');

        // unique symbol ref every time
        const uniqueKey = Symbol('unique');

        if (endpointURI.startsWith('/') && this.uriPrefix.endsWith('/')) {
            endpointURI = endpointURI.slice(1);
        }

        endpointURI = `${this.uriPrefix}${endpointURI}`;
        this._routes[endpointURI] = this._routes[endpointURI] || {};

        methods.forEach((method) => {
            method = method.toUpperCase();
            this.logger.debug(`Registering handler '${handler.name}' for endpoint - ${method} ${endpointURI}`);
            this._routes[endpointURI][method] = [handler, uniqueKey];
        });

        // register endpoint for all HTTP methods
        this._router.all(endpointURI);

        return wrapDestroy.call(this, handler, methods.slice(), endpointURI, uniqueKey);
    }

    /**
     * Remove all registered routes and handlers
     *
     * @public
     */
    async removeAll() {
        this.logger.debug('Removing all registered request handlers');

        // make a copy to preserve order
        await Promise.all(this._destroyHandlers.slice().map((destroy) => destroy()));

        assert.empty(this._destroyHandlers, 'destroyHandlers');
        assert.empty(this._routes, 'routes');

        this._destroyHandlers = [];
        this._router = new TinyRouter();
        this._routes = {};
    }
}

/**
 * @this {Router}
 *
 * @param {RequestHandler} handler
 * @param {string[]} methods
 * @param {string} endpointURI
 * @param {Symbol} uniqueKey
 *
 * @returns {function(): Promise} callback to deregister the handler
 */
function wrapDestroy(handler, methods, endpointURI, uniqueKey) {
    // hacky way to identify the handler's route and use it to deregister it
    // NOTE: heavely relies on tiny-request-router implementation
    const myRoute = this._router.routes[this._router.routes.length - 1];

    const destroy = async () => {
        if (handler === null) {
            // destroyed already
            return;
        }

        const tmpHandler = handler;
        handler = null;

        this.logger.debug(`Deregistering handler '${tmpHandler.name}' for '${endpointURI}' (${methods.join(', ')})`);

        // remove from handlers list
        let idx = this._destroyHandlers.indexOf(destroy);
        assert.safeNumberGrEq(idx, 0, 'idx');
        this._destroyHandlers.splice(idx, 1);

        // remove TRR route
        idx = this._router.routes.indexOf(myRoute);
        assert.safeNumberGrEq(idx, 0, 'idx');
        this._router.routes.splice(idx, 1);

        const registeredURI = this._routes[endpointURI];
        if (registeredURI) {
            methods.forEach((method) => {
                const methodHandler = registeredURI[method];
                if (methodHandler && methodHandler[0] === tmpHandler && methodHandler[1] === uniqueKey) {
                    delete registeredURI[method];
                }
            });

            if (Object.keys(registeredURI).length === 0) {
                delete this._routes[endpointURI];
            }
        }

        if (typeof tmpHandler.destroy !== 'function') {
            return;
        }

        await Promise.all(methods.map(async (method) => {
            this.logger.debug(`Deregistering handler '${tmpHandler.name}' for '${method} ${endpointURI}'`);
            try {
                await tmpHandler.destroy(method, endpointURI);
            } catch (error) {
                this.logger.exception(`Uncaught error on attempt to deregistering handler  '${tmpHandler.name}' for '${method} ${endpointURI}'`, error);
            }
        }));
    };

    this._destroyHandlers.push(destroy);
    return destroy;
}

module.exports = Router;
