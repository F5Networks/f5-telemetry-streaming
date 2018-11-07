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
const eventListener = require('../eventListenerHandler.js');
const validator = require('../validator.js');
const consumers = require('../consumers.js');
const pipeline = require('../pipeline.js');


const baseStateObj = {
    config: {}
};

class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/telemetry/declare';
        this.isPassThrough = true;
        this.isPublic = true;

        // default state object
        this.state = baseStateObj;
        // default listener port
        this.eventListenerPort = 40000;
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
        // TODO: pipeline initialization should be moved to function
        load.call(this)
            .then(() => {
                logger.debug(`loaded this.state: ${util.stringify(this.state)}`);

                consumers.load(this.state.config)
                    .then((consumersObjs) => {
                        this.consumers = consumersObjs;
                        return Promise.resolve();
                    }).then(() => {
                        // start poller if config (interval) exists
                        if (this.state.config.interval) {
                            const dataPipeline = pipeline.create(this.consumers);
                            this.poller = scheduler.start(dataPipeline, this.state.config.interval);
                        }
                        // TODO: re-evaluate this
                        eventListener.start(this.eventListenerPort);

                        logger.info('onStartCompleted success');
                        success();
                    });
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
        const urlpath = restOperation.getUri().href;
        logger.info(`GET operation ${urlpath}`);

        util.restOperationResponder(restOperation, 200, {});
    }

    /**
     * Handles Post requests.
     * @param {Object} restOperation
     *
     * @returns {void}
     */
    onPost(restOperation) {
        const urlpath = restOperation.getUri().href;
        const body = restOperation.getBody();
        logger.info(`POST operation ${urlpath}`);

        // TODO: pipeline initialization should be moved to function
        validator.validateConfig(body)
            .then((config) => {
                // place config in state object and save to rest storage
                this.state.config = config;
                // TODO: handle sensitive values prior to save
                return save.call(this);
            })
            .then(() => consumers.load(this.state.config))
            .then((consumersObjs) => {
                this.consumers = consumersObjs;
            })
            .then(() => {
                // start poller if config (interval) exists
                const dataPipeline = pipeline.create(this.consumers);
                this.poller = scheduler.start(dataPipeline, this.state.config.interval);

                util.restOperationResponder(restOperation, 200, { message: 'success' });
            })
            .catch((e) => {
                const res = `validator.validateConfig error: ${e}`;
                util.restOperationResponder(restOperation, 500, res);
            });
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

// rest worker helper functions
function save() {
    return new Promise((resolve, reject) => {
        this.saveState(null, this.state, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}

function load() {
    return new Promise((resolve, reject) => {
        this.loadState(null, (err, state) => {
            if (err) {
                const message = `error loading state: ${err.message}`;
                logger.error(message);
                reject(err);
            }
            this.state = state || baseStateObj;
            resolve();
        });
    });
}

module.exports = RestWorker;
