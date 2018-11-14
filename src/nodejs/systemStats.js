/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const mustache = require('mustache');

const constants = require('./constants.js');
const util = require('./util.js');
const normalize = require('./normalize.js');
const properties = require('./config/properties.json');
const paths = require('./config/paths.json');

const pStats = properties.stats;
const context = properties.context;

class SystemStats {
    /**
     * SystemStats class
     */
    constructor() {
        this.host = null;
        this.username = null;
        this.password = null;
        this.port = constants.DEFAULT_PORT;
    }

    /**
     * Split key
     *
     * @param {String} key - key to split
     *
     * @returns {Object} Return data formatted like { rootKey: 'key, childKey: 'key' }
     */
    _splitKey(key) {
        const splitKeys = key.split(constants.STATS_KEY_SEP);
        const rootKey = splitKeys[0];
        // remove root key from splitKeys
        splitKeys.shift();
        const childKey = splitKeys.length > 0 ? splitKeys.join(constants.STATS_KEY_SEP) : undefined;
        return { rootKey, childKey };
    }

    /**
     * Load endpoint
     *
     * @param {String} key  - key to split
     * @param {Object} data - data containing key
     *
     * @returns {Object} Return data for key
     */
    _loadEndpoint(key, data) {
        const endpoint = this._splitKey(key).rootKey;
        // throw friendly error if endpoint was not previously defined in paths.json
        if (endpoint in data === false) { throw new Error(`Endpoint not defined in file: ${endpoint}`); }
        return data[endpoint];
    }

    /**
     * Get specific data from the REST API
     *
     * @param {String} uri             - uri to get stat data from
     * @param {Object} options         - function options
     * @param {String} [options.token] - shared auth token to use for http requests
     * @param {String} [options.body]  - body to send, sent via POST request
     * @param {String} [options.name]  - name of key to store as, will override default of uri
     *
     * @returns {Object} Promise which is resolved with data
     */
    _getData(uri, options) {
        const httpOptions = {
            port: this.port
        };
        if (options.token) {
            httpOptions.headers = {
                'x-f5-auth-token': options.token,
                'User-Agent': constants.USER_AGENT
            };
        }
        if (options.body) {
            httpOptions.method = 'POST';
            httpOptions.body = options.body;
        }

        return Promise.resolve(util.makeRequest(this.host, uri, httpOptions))
            .then((data) => {
                // use uri unless explicit name is provided
                const nameToUse = options.name ? options.name : uri;
                const ret = { name: nameToUse, data };
                return ret;
            })
            .catch((err) => {
                throw err;
            });
    }

    /**
     * Get all data
     *
     * @param {Object} uris     - list of uris formatted like so: { endpoint: 'uri' }
     *
     * @returns {Object} Promise which is resolved with an array containing data
     */
    _getAllData(uris) {
        let promise;
        // if host is localhost we do not need an auth token
        if (this.host === constants.LOCAL_HOST) {
            promise = Promise.resolve({ token: undefined });
        } else {
            if (!this.username || !this.password) { throw new Error('Username and password required'); }
            promise = util.getAuthToken(this.host, this.username, this.password, { port: this.port });
        }

        return Promise.resolve(promise)
            .then((token) => {
                const promises = [];
                uris.forEach((i) => {
                    const getDataOptions = { body: i.body, name: i.name, token: token.token };
                    promises.push(this._getData(i.endpoint, getDataOptions));
                });
                return Promise.all(promises);
            })
            .then((data) => {
                const ret = {};
                data.forEach((i) => {
                    ret[i.name] = i.data;
                });
                return ret;
            })
            .catch((err) => {
                throw err;
            });
    }

    /**
     * Collect info based on array provided in properties
     *
     * @param {String} host     - host
     * @param {Integer} port    - port
     * @param {String} username - username for host
     * @param {String} password - password for host
     *
     * @returns {Object} Promise which is resolved with a map of stats
     */
    collect(host, port, username, password) {
        this.host = host;
        if (!this.host) { throw new Error('Host required'); }
        if (port) { this.port = port; }
        if (username) { this.username = username; }
        if (password) { this.password = password; }

        return this._getAllData(paths.endpoints)
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
                    const endpointData = this._loadEndpoint(ctx.key, data);
                    const ctxData = normalize.data(endpointData, { key: this._splitKey(ctx.key).childKey });
                    loadedContext[k] = ctxData;
                });

                // now load each stat
                Object.keys(pStats).forEach((k) => {
                    const stat = pStats[k];

                    // stat could be disabled
                    if (stat.disabled !== true) {
                        // render mustache template only for stat.key, for now
                        const key = mustache.render(stat.key, loadedContext);
                        const endpointData = this._loadEndpoint(key, data);
                        // now return normalized stat, unless flag set to false
                        const options = {
                            key: this._splitKey(key).childKey,
                            filterByKeys: stat.filterKeys,
                            renameKeysByPattern: stat.renameKeys,
                            convertArrayToMap: stat.convertArrayToMap,
                            runCustomFunction: stat.runFunction
                        };
                        const statData = stat.normalize === false
                            ? endpointData : normalize.data(endpointData, options);
                        ret[k] = statData;
                    }
                });
                return ret;
            })
            .catch((err) => {
                const msg = `collect error: ${err}`;
                throw new Error(msg);
            });
    }
}

module.exports = new SystemStats();
