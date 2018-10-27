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
const properties = require('./config/properties.json');
const paths = require('./config/paths.json');

const pStats = properties.stats;

/**
 * Get a specific stat from the REST API
 *
 * @param {Object} uri            - uri to get stat data from
 * @param {Object} options        - options to provide
 * @param {Object} [options.body] - body to send during get stat
 * @param {Object} [options.name] - name of key to store as, will override just using the uri
 *
 * @returns {Object} Promise which is resolved with the normalized stat
 */
function getStat(uri, options) {
    // for now assume if body is provided we want to POST
    const promise = options.body ? http.post(uri, options.body) : http.get(uri);

    return Promise.resolve(promise)
        .then((data) => {
            // use uri unless explicit name is provided
            const nameToUse = options.name ? options.name : uri;
            const ret = { name: nameToUse, data };
            return ret;
        })
        .catch((err) => {
            const msg = `getStat: ${err}`;
            throw new Error(msg);
        });
}

/**
 * Get a list of stats
 *
 * @param {Object} uris - list of uris formatted like so: { endpoint: 'uri' }
 *
 * @returns {Object} Promise which is resolved with a hash of stats
 */
function getStats(uris) {
    const promises = [];
    uris.forEach((i) => {
        promises.push(getStat(i.endpoint, { body: i.body, name: i.name }));
    });

    return Promise.all(promises)
        .then((data) => {
            const ret = {};
            data.forEach((i) => {
                ret[i.name] = i.data;
            });
            return ret;
        })
        .catch((err) => {
            const msg = `getStats: ${err}`;
            throw new Error(msg);
        });
}

/**
 * Collect stats based on list provided in properties
 *
 * @returns {Object} Promise which is resolved with a hash of stats
 */
function collectStats() {
    return getStats(paths.endpoints)
        .then((data) => {
            const ret = {};
            Object.keys(pStats).forEach((k) => {
                const stat = pStats[k];
                const sep = '::';
                const splitKeys = stat.key.split(sep);

                const endpoint = splitKeys[0];
                // throw friendly error if endpoint was not previously defined in paths.json
                if (endpoint in data === false) { throw new Error(`Endpoint not defined in file: ${endpoint}`); }

                // remove uri from splitKeys
                splitKeys.shift();
                const key = splitKeys.length > 0 ? splitKeys.join(sep) : undefined;

                ret[k] = normalize.stat(data[endpoint], { key });
            });

            logger.debug('collectStats() success');
            return ret;
        })
        .catch((err) => {
            const msg = `collectStats error: ${err}`;
            throw new Error(msg);
        });
}

module.exports = {
    collect: collectStats
};
