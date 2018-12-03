/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('../logger.js');
const util = require('../util.js');
const constants = require('../constants.js');

const configWorker = require('../config.js');
const eventListener = require('../eventListener.js'); // eslint-disable-line no-unused-vars
const consumers = require('../consumers.js'); // eslint-disable-line no-unused-vars
const systemPoller = require('../systemPoller.js');

class RestWorker {
    constructor() {
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
    onStart(success, failure) {
        success();
    }

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
    onStartCompleted(success, failure, state, errMsg) {
        // first load state from rest storage
        logger.info(`Node version ${process.version}`);

        // better to use try/catch to handle unexpected errors
        try {
            configWorker.restWorker = this;
            configWorker.loadState().then((loadedState) => {
                logger.debug(`loaded state ${util.stringify(loadedState)}`);
                success();
            });
        } catch (err) {
            const msg = `onStartCompleted error: ${err}`;
            logger.exception(msg, err);
            failure(msg);
        }
    }

    /**
     * Handles Get requests
     * @param {Object} restOperation
     *
     * @returns {void}
     */
    onGet(restOperation) {
        const urlPath = restOperation.getUri().href;
        const path = restOperation.getUri().pathname.split('/');
        logger.debug(`GET operation ${urlPath}`);

        let systemPollers;
        let firstPoller;
        switch (path[3]) {
        case 'statsInfo':
            if (configWorker.config.parsed && configWorker.config.parsed[constants.SYSTEM_POLLER_CLASS_NAME]) {
                systemPollers = configWorker.config.parsed[constants.SYSTEM_POLLER_CLASS_NAME];
            }

            if (!systemPollers) {
                util.restOperationResponder(restOperation, 400, 'Error: No system poller specified, configuration required');
            } else {
                firstPoller = systemPollers[Object.keys(systemPollers)[0]]; // for now just process first one
                systemPoller.process({ config: firstPoller, process: false })
                    .then((data) => {
                        util.restOperationResponder(restOperation, 200, data);
                    })
                    .catch((err) => {
                        logger.error(`statsInfo request ended up with error: ${err}`);
                        util.restOperationResponder(restOperation, 500, `systemPoller.process error: ${err}`);
                    });
            }
            break;
        default:
            util.restOperationResponder(restOperation, 400, `Bad URL: ${urlPath}`);
            break;
        }
    }

    /**
     * Handles Post requests.
     * @param {Object} restOperation
     *
     * @returns {void}
     */
    onPost(restOperation) {
        const urlPath = restOperation.getUri().href;
        const path = restOperation.getUri().pathname.split('/');
        const body = restOperation.getBody();
        logger.debug(`POST operation ${urlPath}`);

        switch (path[3]) {
        case 'declare':
            // try to validate new config
            // TODO:
            configWorker.validateAndApply(body)
                .then(() => {
                    util.restOperationResponder(restOperation, 200, { message: 'success' });
                })
                .catch((err) => {
                    logger.error(err);
                    util.restOperationResponder(restOperation, 500, `${err}`);
                });
            break;
        default:
            util.restOperationResponder(restOperation, 400, `Bad URL: ${urlPath}`);
            break;
        }
    }

    /**
     * Handles Delete requests.
     * @param {Object} restOperation
     *
     * @returns {void}
     */
    onDelete(restOperation) {
        const urlpath = restOperation.getUri().href;
        logger.info(`DELETE operation ${urlpath}`);

        util.restOperationResponder(restOperation, 200, {});
    }
}

module.exports = RestWorker;
