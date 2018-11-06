/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const mustache = require('mustache');

const logger = require('./logger.js');
const constants = require('./constants.js');
const http = require('./httpRequestHandler.js');
const normalize = require('./normalize.js');
const properties = require('./config/properties.json');
const paths = require('./config/paths.json');

const pStats = properties.stats;
const context = properties.context;

/**
 * Get specific data from the REST API
 *
 * @param {Object} uri            - uri to get stat data from
 * @param {Object} options        - options to provide
 * @param {Object} [options.body] - body to send during get stat
 * @param {Object} [options.name] - name of key to store as, will override just using the uri
 *
 * @returns {Object} Promise which is resolved with data
 */
function getData(uri, options) {
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
            const msg = `getData: ${err}`;
            throw new Error(msg);
        });
}

/**
 * Get all data
 *
 * @param {Object} uris - list of uris formatted like so: { endpoint: 'uri' }
 *
 * @returns {Object} Promise which is resolved with an array containing data
 */
function getAllData(uris) {
    const promises = [];
    uris.forEach((i) => {
        promises.push(getData(i.endpoint, { body: i.body, name: i.name }));
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
            const msg = `getAllData: ${err}`;
            throw new Error(msg);
        });
}

/**
 * Collect stats based on array provided in properties
 *
 * @returns {Object} Promise which is resolved with a map of stats
 */
function collectStats() {
    // simple helper functions
    const splitKey = function (key) {
        const splitKeys = key.split(constants.STATS_KEY_SEP);
        const rootKey = splitKeys[0];
        // remove root key from splitKeys
        splitKeys.shift();
        const childKey = splitKeys.length > 0 ? splitKeys.join(constants.STATS_KEY_SEP) : undefined;
        return { rootKey, childKey };
    };
    const loadEndpoint = function (key, data) {
        const endpoint = splitKey(key).rootKey;
        // throw friendly error if endpoint was not previously defined in paths.json
        if (endpoint in data === false) { throw new Error(`Endpoint not defined in file: ${endpoint}`); }
        return data[endpoint];
    };
    // end simple helper functions

    return getAllData(paths.endpoints)
        .then((data) => {
            const ret = data;
            return Promise.resolve(ret);
        })
        .then((data) => {
            const ret = {};
            const loadedContext = {};

            // first load context - basic normalize
            Object.keys(context).forEach((k) => {
                const ctx = context[k];
                const endpointData = loadEndpoint(ctx.key, data);
                const ctxData = normalize.data(endpointData, { key: splitKey(ctx.key).childKey });
                loadedContext[k] = ctxData;
            });

            // now load each stat
            Object.keys(pStats).forEach((k) => {
                const stat = pStats[k];
                // render mustache template only for stat.key, for now
                const key = mustache.render(stat.key, loadedContext);
                const endpointData = loadEndpoint(key, data);

                // now return normalized stat, unless stat.disabled is true
                if (stat.disabled !== true) {
                    const options = {
                        key: splitKey(key).childKey,
                        filterByKeys: stat.filterKeys,
                        renameKeysByPattern: stat.renameKeys,
                        convertArrayToMap: stat.convertArrayToMap,
                        runCustomFunction: stat.runFunction
                    };
                    // normalize unless flag is specifically set to false
                    const statData = stat.normalize === false ? endpointData : normalize.data(endpointData, options);
                    ret[k] = statData;
                }
            });

            logger.debug('collectStats success');
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
