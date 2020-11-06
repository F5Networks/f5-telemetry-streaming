/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

/* jshint ignore: start */

'use strict';

const http = require('http');
const https = require('https');

const constants = require('../lib/constants');
const logger = require('../lib/logger');
const util = require('../lib/util');

const deviceUtil = require('../lib/deviceUtil');
const retryPromise = require('../lib/util').retryPromise;
const persistentStorage = require('../lib/persistentStorage');
const configWorker = require('../lib/config');

const configListenerModulesToLoad = [
    '../lib/eventListener',
    '../lib/consumers',
    '../pullConsumers',
    '../lib/systemPoller',
    '../lib/ihealth'
];

configListenerModulesToLoad.forEach((module) => {
    try {
        // eslint-disable-next-line
        require(module);
    } catch (err) {
        logger.exception('Unable to load required module', err);
    }
});

const requestRouter = require('../lib/requestHandlers/router');
require('../lib/requestHandlers/connections');


/**
 * Rest Worker class processes user's requests and responsible for
 * application state/stop. See more details on F5 DevCentral.
 *
 * @class
 */
function RestWorker() {
    this.WORKER_URI_PATH = 'shared/telemetry';
    this.isPassThrough = true;
    this.isPublic = true;
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
        logger.exception(msg, err);
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
    logger.info(`Application version: ${constants.VERSION}`);
    logger.debug(`Node version: ${process.version}`);

    // register REST endpoints
    this.router = requestRouter;
    this.router.registerAllHandlers(false);

    // configure global socket maximum
    http.globalAgent.maxSockets = 5;
    https.globalAgent.maxSockets = 5;

    // try to load pre-existing configuration
    const ps = persistentStorage.persistentStorage;
    // only RestStorage is supported for now
    ps.storage = new persistentStorage.RestStorage(this);
    ps.load()
        .then((loadedState) => {
            logger.debug(`Loaded state ${util.stringify(loadedState)}`);
        })
        .then(() => configWorker.loadConfig())
        .then(() => success())
        .catch((err) => {
            logger.exception('Startup Failed', err);
            failure();
        });

    // Gather info about host device. Running it as decoupled process
    // to do not slow down application startup due REST API or other
    // service may be not started yet.
    retryPromise(() => deviceUtil.gatherHostDeviceInfo(), { maxTries: 100, delay: 30 })
        .then(() => {
            logger.debug('Host Device Info gathered');
        })
        .catch((err) => {
            logger.exception('Unable to gather Host Device Info', err);
        });
};

/**
 * Handles Delete requests.
 *
 * @param {Object} restOperation
 *
 * @returns {void}
 */
RestWorker.prototype.onDelete = function (restOperation) {
    this.onPost(restOperation);
};

/**
 * Handles Get requests
 *
 * @param {Object} restOperation
 *
 * @returns {void}
 */
RestWorker.prototype.onGet = function (restOperation) {
    this.onPost(restOperation);
};

/**
 * Handles Post requests.
 *
 * @param {Object} restOperation
 *
 * @returns {void}
 */
RestWorker.prototype.onPost = function (restOperation) {
    this.router.processRestOperation(restOperation, this.WORKER_URI_PATH);
};

module.exports = RestWorker;
