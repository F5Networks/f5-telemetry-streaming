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

'use strict';

const http = require('http');
const https = require('https');

const appInfo = require('../lib/appInfo');
const logger = require('../lib/logger');
const util = require('../lib/utils/misc');

const ActivityRecorder = require('../lib/activityRecorder');
const deviceUtil = require('../lib/utils/device');
const retryPromise = require('../lib/utils/promise').retry;
const persistentStorage = require('../lib/persistentStorage');
const configWorker = require('../lib/config');
const requestRouter = require('../lib/requestHandlers/router');

const configListenerModulesToLoad = [
    '../lib/eventListener',
    '../lib/consumers',
    '../lib/pullConsumers',
    '../lib/systemPoller',
    '../lib/ihealth',
    '../lib/requestHandlers/connections',
    '../lib/tracerManager.js',
    '../lib/utils/monitor.js'
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
    logger.info(`Application version: ${appInfo.fullVersion}`);
    logger.info(`Node version: ${process.version}`);

    // register REST endpoints
    this.router = requestRouter;
    this.router.registerAllHandlers(false);

    this.activityRecorder = new ActivityRecorder();
    this.activityRecorder.recordDeclarationActivity(configWorker);

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
        .then(() => configWorker.load())
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
            logger.info('Host Device Info gathered');
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
