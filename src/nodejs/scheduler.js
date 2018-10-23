/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

/**
 * Scheduler
 *
 * @returns {Object}
 */
function scheduler(func, intervalInS) {
    // note: instead of setInterval should this use REST API task scheduler?
    // '/mgmt/shared/task-scheduler/scheduler'
    setInterval(func, intervalInS * 1000);
}

module.exports = {
    schedule: scheduler
};
