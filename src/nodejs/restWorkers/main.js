/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const constants = require('../constants.js');
const logger = require('../logger.js');
const util = require('../util.js');

const baseSchema = require('../schema/base_schema.json');
const configWorker = require('../config.js');
const eventListener = require('../eventListener.js'); // eslint-disable-line no-unused-vars
const consumers = require('../consumers.js'); // eslint-disable-line no-unused-vars
const systemPoller = require('../systemPoller.js');


/**
 * Simple router to route incomming requests to REST API.
 */
function SimpleRouter() {
    this.routes = {};
}

/**
 * Register request habdler.
 *
 * @public
 * @param {String | String[]} method  - HTTP method (POST, GET, etc.), could be array
 * @param {String} endpointURI        - URI path, string should be alphanumeric only
 * @param {Function(Object)} callback - request handler
 */
SimpleRouter.prototype.register = function (method, endpointURI, callback) {
    if (this.routes[endpointURI] === undefined) {
        this.routes[endpointURI] = {};
    }
    if (Array.isArray(method)) {
        method.forEach((methodItem) => {
            this.routes[endpointURI][methodItem] = callback;
        });
    } else {
        this.routes[endpointURI][method] = callback;
    }
};

/**
 * Process request.
 *
 * @public
 * @param {Object} restOperation - request object
 */
SimpleRouter.prototype.processRestOperation = function (restOperation) {
    try {
        this._processRestOperation(restOperation);
    } catch (err) {
        logger.exception(`restOperation processing error: ${err}`, err);
        util.restOperationResponder(restOperation, 500,
            { code: 500, message: 'Internal Server Error' });
    }
};

/**
 * Process request, private method.
 *
 * @private
 * @param {Object} restOperation - request object
 */
SimpleRouter.prototype._processRestOperation = function (restOperation) {
    const urlPath = restOperation.getUri().href;
    const method = restOperation.getMethod().toUpperCase();
    logger.info(`'${method}' operation ${urlPath}`);

    // Somehow we need to respond to such requests.
    // When Content-Type === application/json then getBody() tries to
    // evaluate data as JSON and returns code 500 on failure.
    // Don't know how to re-define this behavior.
    if (restOperation.getBody() && restOperation.getContentType().toLowerCase() !== 'application/json') {
        util.restOperationResponder(restOperation, 405,
            { code: 415, message: 'Unsupported Media Type', accept: ['application/json'] });
        return;
    }

    const endpointURI = restOperation.getUri().pathname.split('/')[3];
    if (!this.routes[endpointURI]) {
        util.restOperationResponder(restOperation, 400, `Bad URL: ${urlPath}`);
    } else if (!this.routes[endpointURI][method]) {
        const allowedMethods = Object.keys(this.routes[endpointURI]).map(item => item.toUpperCase());
        util.restOperationResponder(restOperation, 405,
            { code: 405, message: 'Method Not Allowed', allow: allowedMethods });
    } else {
        this.routes[endpointURI][method](restOperation);
    }
};


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
 * @returns {undefined}
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
    this.router = new SimpleRouter();

    this.router.register('GET', 'info',
        restOperation => this.processInfoRequest(restOperation));

    this.router.register(['GET', 'POST'], 'declare',
        restOperation => configWorker.processClientRequest(restOperation));

    this.router.register('GET', 'systempoller',
        restOperation => systemPoller.processClientRequest(restOperation));

    // try to load pre-existing configuration
    configWorker.restWorker = this;
    configWorker.loadState().then((loadedState) => {
        logger.debug(`loaded state ${util.stringify(loadedState)}`);
        success();
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
    this.router.processRestOperation(restOperation);
};

/**
 * Handler for /info endpoint
 *
 * @param {Object} restOperation
 *
 * @returns {void}
 */
RestWorker.prototype.processInfoRequest = function (restOperation) {
    // usually version located at this path - /var/config/rest/iapps/f5-telemetry/version,
    // we are in /var/config/rest/iapps/f5-telemetry/nodejs/restWorkers/ dir.
    const vinfo = fs.readFileSync(path.join(__dirname, '../..', 'version'), 'ascii').split('-');

    util.restOperationResponder(restOperation, 200, {
        nodeVersion: process.version,
        version: vinfo[0],
        release: vinfo[1],
        schemaCurrent: baseSchema.properties.schemaVersion.enum[0],
        schemaMinimum: baseSchema.properties.schemaVersion.enum.reverse()[0]
    });
};

module.exports = RestWorker;
