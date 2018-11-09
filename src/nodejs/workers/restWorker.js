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
const scheduler = require('../scheduler.js');
const stats = require('../stats.js');
const eventListener = require('../eventListenerHandler.js');
const validator = require('../validator.js');
const constants = require('../constants.js');
const State = require('../state.js');

class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/telemetry';
        this.isPassThrough = true;
        this.isPublic = true;

        // default state assignment
        this.state = {};
        // default poller assignment
        this.poller = undefined;
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
        State.load(this)
            .then((loadedState) => {
                this.state = loadedState;
                logger.debug(`loaded this.state: ${util.stringify(this.state)}`);

                // start poller, if config exists
                if (this.state.config.interval) {
                    this.poller = scheduler.start(
                        stats.process,
                        { config: this.state.config },
                        this.state.config.interval
                    );
                }
                // start event listener
                // TODO: re-evaluate this
                eventListener.start(constants.DEFAULT_EVENT_LISTENER_PORT);

                logger.info('onStartCompleted success');
                success();
            })
            .catch((err) => {
                const msg = `onStartCompleted error: ${err}`;
                logger.error(msg);
                failure(msg);
            });
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
            if (!this.state.config.targetHosts) {
                util.restOperationResponder(restOperation, 400, 'Error: No targetHosts specified, configuration required');
            } else {
                stats.process({ config: this.state.config, noForward: true })
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
            validator.validateConfig(body)
                .then((config) => {
                    logger.debug(`Validated Config: ${util.stringify(config)}`);

                    // place config in state object and save to rest storage
                    this.state.config = config;
                    // TODO: handle sensitive values prior to save
                    return State.save(this);
                })
                .then(() => {
                    // start/update poller
                    if (this.poller) {
                        this.poller = scheduler.update(
                            this.poller,
                            stats.process,
                            { config: this.state.config },
                            this.state.config.interval
                        );
                    } else {
                        this.poller = scheduler.start(
                            stats.process,
                            { config: this.state.config },
                            this.state.config.interval
                        );
                    }
                    util.restOperationResponder(restOperation, 200, { message: 'success' });
                })
                .catch((e) => {
                    const res = `validator.validateConfig error: ${e}`;
                    util.restOperationResponder(restOperation, 500, res);
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
