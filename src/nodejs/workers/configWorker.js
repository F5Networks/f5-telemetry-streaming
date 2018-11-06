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
const systemStats = require('../systemStatsHandler.js');
const validator = require('../validator.js');

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
        load.call(this)
            .then(() => {
                logger.debug(`loaded this.state: ${util.stringify(this.state)}`);

                // start poller if config (interval) exists
                if (this.state.config.interval) {
                    this.poller = scheduler.start(systemStats.collect, this.state.config.interval);
                }
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

        validator.validateConfig(body)
            .then((config) => {
                // place config in state object and save to rest storage
                this.state.config = config;
                // TODO: handle sensitive values prior to save
                return save.call(this);
            })
            .then(() => {
                // update poller (interval)
                this.poller = scheduler.update(this.poller, systemStats.collect, this.state.config.interval);

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
