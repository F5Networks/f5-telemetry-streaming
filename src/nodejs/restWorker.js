/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const log = require('./log');

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
     * @param {function} success - callback to indicate successful startup
     * @param {function} failure - callback to indicate startup failure
     * @returns {undefined}
     */
    onStart(success, failure) {
    }


    /**
     * Recognize readiness to handle AS3 requests.
     * The iControl LX framework calls this method when
     * onStart() work is complete.
     *
     * @public
     * @param {function} success - callback to indicate successful startup
     * @param {function} failure - callback to indicate startup failure
     * @param {object} [state=undefined] - NOT USED: previously-persisted state
     * @param {string} [errMsg=null] - framework's error message if onStart() failed
     * @returns {undefined}
     */
    onStartCompleted(success, failure, loadedState, errMsg) {
        log.debug('onStartCompleted');
        success();
    } // onStartCompleted()

    /**
     * Handles Get requests
     * @param {object} restOperation
     * @returns {void}
     */
    onGet(restOperation) {
        const urlpath = restOperation.getUri().href;
        log.debug('GET operation ' + urlpath);
    }

    /**
     * Handles Post requests.
     * @param {object} restOperation
     * @returns {void}
     */
    onPost(restOperation) {
        const urlpath = restOperation.getUri().href;
        const body = restOperation.getBody();
        log.debug('POST operation ' + urlpath);
    }


    /**
     * Handles Delete requests.
     * @param {object} restOperation
     * @returns {void}
     */
    onDelete(restOperation) {
        const urlpath = restOperation.getUri().href;
        log.debug('DELETE operation ' + urlpath);
    }
}

module.exports = RestWorker;
