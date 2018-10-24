/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const http = require('./httpRequestHandler.js');
const normalize = require('./normalize.js');
const pStats = require('./config/properties.json').stats;

/**
 * Get a specific stat from the REST API
 *
 * @returns {Object} Promise which is resolved with the normalized statistic
 */
function getStat(name, stat) {
    return http.get(stat.uri)
        .then((data) => {
            // defaults true
            const normalizedData = stat.normalize === false ? data : normalize.stats(data);
            return { name, data: normalizedData };
        })
        .catch((err) => {
            const msg = `getStat: ${err}`;
            throw new Error(msg);
        });
}

/**
 * Collect statistics based on list provided in properties object
 *
 * @returns {Object} Promise which is resolved with an array of statistics
 */
function collectStats() {
    const promises = [];
    Object.keys(pStats).forEach((k) => {
        promises.push(getStat(k, pStats[k]));
    });
    return Promise.all(promises)
        .then((data) => {
            logger.debug('collectStats() success');
            return data;
        })
        .catch((err) => {
            const msg = `collectStats error: ${err}`;
            throw new Error(msg);
        });
}

module.exports = {
    collect: collectStats
};
