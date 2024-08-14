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

/* jshint ignore: start */
/* eslint-disable no-unused-expressions */

'use strict';

const http = require('http');
const https = require('https');

const appInfo = require('../lib/appInfo');
const logger = require('../lib/logger');
const util = require('../lib/utils/misc');

const ApplicationEvents = require('../lib/appEvents');
const configWorker = require('../lib/config');
const Consumers = require('../lib/consumers');
const DataPipeline = require('../lib/dataPipeline');
const DeclarationHistory = require('../lib/declarationHistory');
const deviceUtil = require('../lib/utils/device');
const EventEmitter = require('../lib/utils/eventEmitter');
const EventListener = require('../lib/eventListener');
const IHealthService = require('../lib/ihealth');
const promiseUtil = require('../lib/utils/promise');
const PullConsumers = require('../lib/pullConsumers');
const ResourceMonitor = require('../lib/resourceMonitor');
const RESTAPIService = require('../lib/restAPI');
const RuntimeConfig = require('../lib/runtimeConfig');
const StorageService = require('../lib/storage');
const SystemPollerService = require('../lib/systemPoller');
const TeemReporter = require('../lib/teemReporter');

/**
 * @module restWorker
 */

const configListenerModulesToLoad = [
    '../lib/tracerManager.js'
];

configListenerModulesToLoad.forEach((module) => {
    try {
        // eslint-disable-next-line
        require(module);
    } catch (err) {
        logger.exception('Unable to load required module', err);
        throw err;
    }
});

/**
 * Rest Worker class processes user's requests and responsible for
 * application state/stop. See more details on F5 DevCentral.
 *
 * @class
 *
 * @listens *.requestHandler.created
 */
function RestWorker() {
    this.WORKER_URI_PATH = 'shared/telemetry';
    this.isPassThrough = true;
    this.isPublic = true;

    // TS properties
    this.appEvents = new ApplicationEvents();
    this.logger = logger.getChild('restWorker');
    this.ee = new EventEmitter();
    this.ee.logger = this.logger;
    this._requestHandlers = [];
    this.services = [];
}

/**
 * Called by LX framework when plugin is initialized.
 *
 * @public
 * @param {Function} success - callback to indicate successful startup
 * @param {Function} failure - callback to indicate startup failure
 *
 * @returns {void}
 */
// eslint-disable-next-line no-unused-vars
RestWorker.prototype.onStart = function (success, failure) {
    success();
};

/**
 * Recognize readiness to handle requests.
 * The iControl LX framework calls this method when
 * onStart() work is complete.
 *
 * @public
 * @param {Function} success - callback to indicate successful startup
 * @param {Function} failure - callback to indicate startup failure
 * @param {Object} state     - DOES NOT WORK: previously-persisted state
 * @param {String} errMsg    - framework's error message if onStart() failed
 *
 * @returns {void}
 */
// eslint-disable-next-line no-unused-vars
RestWorker.prototype.onStartCompleted = function (success, failure, state, errMsg) {
    // better to use try/catch to handle unexpected errors
    try {
        this._initializeApplication(success, failure);
    } catch (err) {
        const msg = `onStartCompleted error: ${err}`;
        this.logger.exception(msg, err);
        failure(msg);
    }
};

/**
 * Initialize application components.
 *
 * @private
 * @param {Function} success - callback to indicate successful startup
 * @param {Function} failure - callback to indicate startup failure
 */
// eslint-disable-next-line no-unused-vars
RestWorker.prototype._initializeApplication = function (success, failure) {
    // Log system info on service start
    this.logger.info(`Application version: ${appInfo.fullVersion}`);
    this.logger.info(`Node version: ${process.version}`);

    // order matter :-)
    this.services.push(
        EventListener,
        new Consumers(),
        new PullConsumers(),
        new SystemPollerService(),
        new StorageService(),
        new RuntimeConfig(),
        new ResourceMonitor(),
        new RESTAPIService(this.WORKER_URI_PATH),
        new TeemReporter(),
        new DeclarationHistory(),
        new IHealthService(),
        new DataPipeline(),
        configWorker
    );

    this.services.forEach((service) => {
        if (service instanceof StorageService) {
            service.initialize(this.appEvents, this);
        } else {
            service.initialize(this.appEvents);
        }
    });

    this.initialize(this.appEvents);

    // configure global socket maximum
    http.globalAgent.maxSockets = 5;
    https.globalAgent.maxSockets = 5;

    promiseUtil.loopForEach(this.services, (service) => service.start && service.start())
        .then(() => configWorker.load())
        .then(() => success())
        .catch((err) => {
            this.logger.exception('Startup Failed', err);
            failure();
        });

    // Gather info about host device. Running it as decoupled process
    // to do not slow down application startup due REST API or other
    // service may be not started yet.
    promiseUtil.retry(() => deviceUtil.gatherHostDeviceInfo(), { maxTries: 100, delay: 30 })
        .then(() => {
            this.logger.info('Host Device Info gathered');
        })
        .catch((err) => {
            this.logger.exception('Unable to gather Host Device Info', err);
        });

    this._onAppExitOff = util.onApplicationExit(() => this.tsDestroy());
};

/**
 * Handles Delete requests.
 *
 * @param {Object} restOperation
 *
 * @returns {Promise} resolved once request processed
 */
RestWorker.prototype.onDelete = function (restOperation) {
    return this.onPost(restOperation);
};

/**
 * Handles Get requests
 *
 * @param {Object} restOperation
 *
 * @returns {Promise} resolved once request processed
 */
RestWorker.prototype.onGet = function (restOperation) {
    return this.onPost(restOperation);
};

/**
 * Handles Post requests.
 *
 * @param {Object} restOperation
 *
 * @returns {Promise} resolved once request processed
 */
RestWorker.prototype.onPost = async function (restOperation) {
    if (this._requestHandlers.length > 0) {
        try {
            await (this._requestHandlers[0].handler(restOperation));
        } catch (reqError) {
            requestError.call(this, restOperation, 500, 'Internal Server Error', reqError);
        }
    } else {
        requestError.call(this, restOperation, 503, 'Service Unavailable', new Error('No request handlers to process request!'));
    }
};

/** @param {ApplicationEvents} appEvents - application events */
RestWorker.prototype.initialize = function (appEvents) {
    appEvents.on('*.requestHandler.created', (handler, cb) => {
        const item = { handler };
        this._requestHandlers.splice(0, 0, item);

        cb && cb(() => {
            const idx = this._requestHandlers.indexOf(item);
            (idx !== -1) && this._requestHandlers.splice(idx, 1);
        });
    });
};

/**
 * Destroy instance and its services
 *
 * @returns {Promise} resolved once all serivces destroyed
 */
RestWorker.prototype.tsDestroy = function () {
    this._onAppExitOff && this._onAppExitOff();
    this._requestHandlers = [];

    return promiseUtil.loopForEach(
        this.services, (service) => service.destroy && service.destroy()
            .catch((err) => this.logger.exception(`Unable to destroy service "${service.constructor.name}"`, err))
    )
        .then(() => {
            this.services = [];
            this.appEvents.stop();

            this.logger.warning('All services destroyed!');
        });
};

/**
 * @param {RestOperation} restOperation
 * @param {integer} code
 * @param {string} message
 * @param {Error} error
 */
function requestError(restOperation, code, message, error) {
    this.logger.exception('Uncaught exception on attempt to process REST API request', error);
    restOperation.setStatusCode(code);
    restOperation.setContentType('application/json');
    restOperation.setBody({ code, message });
    restOperation.complete();
}

module.exports = RestWorker;

/**
 * @event *.requestHandler.created
 * @param {function:Promise} handler - request handler that returns Promise resovled once request processed
 * @param {function(function)} unregCb - callback to pass back an deregister function for the request handler
 */
/**
 * @typedef RestOperation
 * @type {Object}
 */
