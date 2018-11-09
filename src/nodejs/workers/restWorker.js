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


const configHandler = require('../handlers/configHandler.js');
const eventListenerHandler = require('../handlers/eventListenerHandler'); // eslint-disable-line no-unused-vars
const consumersHandler = require('../handlers/consumersHandler.js'); // eslint-disable-line no-unused-vars
const stats = require('../stats.js');

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
            configHandler.restWorker = this;
            configHandler.loadState().then((loadedState) => {
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

        switch (path[3]) {
        case 'statsInfo':
            if (!configHandler.config.targetHosts) {
                util.restOperationResponder(restOperation, 400, 'Error: No targetHosts specified, configuration required');
            } else {
                stats.process({ config: configHandler.config, noForward: true })
                    .then((data) => {
                        util.restOperationResponder(restOperation, 200, data);
                    })
                    .catch((e) => {
                        util.restOperationResponder(restOperation, 500, `stats.process error: ${e}`);
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
            configHandler.validateAndApply(body)
                .then(() => {
                    util.restOperationResponder(restOperation, 200, { message: 'success' });
                })
                .catch((err) => {
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
