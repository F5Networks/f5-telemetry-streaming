/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

const baseStateObj = {
    config: {}
};

/**
 * Save state to rest storage
 *
 * @param {Object} that - this object from worker
 *
 * @returns {Object} Promise which is resolved once state is saved
 */
function save(that) {
    return new Promise((resolve, reject) => {
        that.saveState(null, that.state, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}

/**
 * Load state from rest storage
 *
 * @param {Object} that - this object from worker
 *
 * @returns {Object} Promise which is resolved with the loaded state
 */
function load(that) {
    return new Promise((resolve, reject) => {
        that.loadState(null, (err, state) => {
            if (err) {
                const message = `error loading state: ${err.message}`;
                logger.error(message);
                reject(err);
            }
            const loadedState = state || baseStateObj;
            resolve(loadedState);
        });
    });
}

module.exports = {
    save,
    load
};
