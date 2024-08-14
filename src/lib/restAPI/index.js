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

/* eslint-disable no-unused-expressions */

const pathUtil = require('path');

const assert = require('../utils/assert');
const configUtil = require('../utils/config');
const deepFreeze = require('../utils/misc').deepFreeze;
const errorHandler = require('./handlers/error');
const httpErrors = require('./errors');
const ModuleLoader = require('../utils/moduleLoader').ModuleLoader;
const Request = require('./request');
const Response = require('./response');
const Router = require('./router');
const Service = require('../utils/service');
const uuid = require('../utils/misc').generateUuid;

/**
 * @module restapi
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../../nodejs/restWorker').RestOperation} RestOperation
 */

const EE_NAMESPACE = 'restapi';
const HANDLERS_DIR = pathUtil.join(__dirname, 'handlers');

/**
 * REST API Service Class
 *
 *
 * @fires restapi.register
 */
class RESTAPIService extends Service {
    /**
     * @param {string} [uriPrefix] - URI prefix
     * @param {string} [handlers] - directory with request handlers
     */
    constructor(uriPrefix = '', handlers = HANDLERS_DIR) {
        super();

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            uriPrefix: {
                value: uriPrefix
            }
        });
        this.restartsEnabled = true;

        // TODO: move to _onStart later once configWorker updated
        this._config = makeConfig({});

        // TODO: remove once endpoints updated and moved to separate modules
        this.logger.debug(`Loading request handlers from '${handlers}'`);
        this._handlers = ModuleLoader.load(handlers);

        assert.exist(this._handlers, `Unable to load handlers from '${handlers}'`);
    }

    /** @inheritdoc */
    async _onStart() {
        this._registerEvents();

        this._router = new Router({
            logger: this.logger,
            uriPrefix: this.uriPrefix
        });

        // helps to prevent situation when someone is trying to register
        // a new endpoint when router was destroyed in _onStop already.
        const endpointRegisterHandler = {
            router: this._router
        };
        this._endpointRegisterHandler = endpointRegisterHandler;

        // emit event and wait till all endpoints registered
        await this.ee.safeEmitAsync(
            'register',
            (...args) => endpointRegisterHandler.router.register.call(
                endpointRegisterHandler.router,
                ...args
            ),
            this._config
        );

        // register request handler
        await this.ee.safeEmitAsync(
            'requestHandler.created',
            onRequestEvent.bind(this),
            (unreg) => {
                this._unregRequestHandler = unreg;
            }
        );
    }

    /** @inheritdoc */
    async _onStop() {
        // does not allow to register endpoints anymore
        this._endpointRegisterHandler.router = null;
        this._endpointRegisterHandler = null;

        // stop receiving requests
        this._unregRequestHandler && this._unregRequestHandler();
        this._unregRequestHandler = null;

        // stop receiving config updates
        this._configListener.off();
        this._configListener = null;

        // stop public events
        this._offMyEvents.off();
        this._offMyEvents = null;

        // remove all registered routes and handlers
        await this._router.removeAll();
        this._router = null;
    }

    /** @inheritdoc */
    destroy() {
        // TODO: remove later once configWorker updated
        this._config = makeConfig({});
        return super.destroy();
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        // function to register subscribers
        this._registerEvents = () => {
            this._configListener = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
            this.logger.debug('Subscribed to Configuration updates.');

            this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
                { 'config.applied': 'config.applied' },
                'register',
                { 'requestHandler.created': 'requestHandler.created' },
                { 'service.started': 'service.started' },
                { 'service.stopped': 'service.stopped' }
            ]);
            this.logger.debug('Registered public events.');
        };

        // TODO: remove once endpoints updated and moved to separate modules
        this._handlers(appEvents);
    }
}

/** @returns {Config} service configuration */
function makeConfig(controlsConfig) {
    return deepFreeze({
        debug: !!controlsConfig.debug
    });
}

/**
 * @this RESTAPIService
 *
 * @returns {boolean} true if restart needed to apply a new configuration
 */
function needRestart(newConfig) {
    return Object.entries(newConfig)
        .some(([key, value]) => this._config[key] !== value);
}

/**
 * @this RESTAPIService
 *
 * @param {Configuration} config
 */
async function onConfigEvent(config) {
    this.logger.debug('Config "change" event');

    const applyConfig = async () => {
        const newConfig = makeConfig(configUtil.getTelemetryControls(config));
        if (needRestart.call(this, newConfig)) {
            this._config = newConfig;
            return this.restart();
        }
        return Promise.resolve();
    };

    try {
        await applyConfig();
    } catch (error) {
        this.logger.exception('Error caught on attempt to apply configuration to REST API Service:', error);
    } finally {
        // - emit in any case to show we are done with config processing
        // - do not wait for results
        this.ee.safeEmitAsync('config.applied');
    }
}

/**
 * @this RESTAPIService
 *
 * @param {RestOperation} restOp - get Rest Operation instance
 */
async function onRequestEvent(restOp) {
    assert.exist(this._router, 'should have router initialized!');

    const rid = uuid().slice(0, 5);
    const req = new Request(restOp);
    this.logger.info(`Request ${rid} received: ${req.getMethod()} ${req.getURI()}`);

    const res = new Response();
    let error;

    try {
        const handler = this._router.match(req);
        this.logger.verbose(`'${handler.name}' request handler assigned to request ${rid}: ${req.getMethod()} ${req.getURI()}`);
        await handler.handle(req, res);
    } catch (handlerError) {
        error = handlerError;
    }

    if (error) {
        if (!(error instanceof httpErrors.HttpError)) {
            this.logger.exception(`Request ${rid} processing error (${req.getMethod()} ${req.getURI()})`, error);
        }

        this.logger.verbose(`'${errorHandler.name}' request handler assigned to request ${rid}: ${req.getMethod()} ${req.getURI()}`);
        await errorHandler.handle(req, res, error);
    }

    this.logger.info(`Request ${rid} processed: ${res.getCode()} ${req.getMethod()} ${req.getURI()}`);

    restOp.setStatusCode(res.getCode());
    restOp.setBody(res.getBody());
    if (res.getContentType()) {
        restOp.setContentType(res.getContentType());
    }
    restOp.complete();
}

module.exports = RESTAPIService;

/**
 * @typedef Config
 * @type {object}
 * @property {boolean} debug
 */
/**
 * @event restapi.register
 * @param {Register} register
 * @param {Config} config
 */
/**
 * @callback Register
 * @param {string | string[]} methods - HTTP methods
 * @param {string} endpointURI - URI
 * @param {RequestHandler} handler - request handler
 * @returns {function} callback to deregister handler
 */
/**
 * @interface RequestHandler
 *
 * @property {function} [destroy]
 * @property {function} handle
 * @property {string} name
 */
/**
 * @function
 * @name RequestHandler#handle
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise | undefined} resolved once request processed
 */
/**
 * @function
 * @name RequestHandler#destroy
 * @param {string} method
 * @param {string} uri
 * @returns {Promise | undefined} resolved once handler destroyed
 *
 * NOTE: optional to implement
 */
