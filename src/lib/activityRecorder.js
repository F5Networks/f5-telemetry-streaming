/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('./constants');
const logger = require('./logger').getChild('activityHistory');
const tracer = require('./utils/tracer');

const PRIVATES = new WeakMap();

/**
 * Activity Recorder class
 */
class ActivityRecorder {
    constructor() {
        logger.debug('New instance created');
        PRIVATES.set(this, {});
    }

    /**
     * Record declaration activity
     *
     * @param {ConfigWorker} configWorker
     *
     * @returns {void} once recording configured
     */
    recordDeclarationActivity(configWorker) {
        logger.debug('Subscribing on configWorker events');
        configWorker.on('received', recordDeclarationActivity.bind(this, 'received'));
        configWorker.on('validationFailed', recordDeclarationActivity.bind(this, 'validationFailed'));
        configWorker.on('validationSucceed', recordDeclarationActivity.bind(this, 'validationSucceed'));

        const privates = PRIVATES.get(this);
        privates.declarationTracer = privates.declarationTracer || tracer.create(
            constants.ACTIVITY_RECORDER.DECLARATION_TRACER.PATH,
            {
                maxRecords: constants.ACTIVITY_RECORDER.DECLARATION_TRACER.MAX_RECORDS
            }
        );
    }

    /**
     * Stop all recording activities
     *
     * @returns {void} once recording activities stopped
     */
    stop() {
        logger.debug('Terminating...');

        const privates = PRIVATES.get(this);
        const promises = [];

        if (privates.declarationTracer) {
            logger.debug('Terminating declaration tracer');
            promises.push(privates.declarationTracer.stop());
        }

        return Promise.all(promises)
            .then(() => logger.debug('Stopped!'));
    }
}

/**
 * Record ConfigWorker activity
 *
 * @private
 * @param {string} eventName - event name
 * @param {object} eventData - event data
 */
function recordDeclarationActivity(eventName, eventData) {
    PRIVATES.get(this).declarationTracer.write({
        event: eventName,
        data: eventData
    });
}

module.exports = ActivityRecorder;
