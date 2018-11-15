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
        this.passphrase = null;
        this.port = constants.DEFAULT_PORT;
        this.token = null;
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
     * Get data for specific endpoint
     *
     * @param {String} uri             - uri where data resides
     * @param {Object} options         - function options
     * @param {String} [options.name]  - name of key to store as, will override default of uri
     * @param {String} [options.body]  - body to send, sent via POST request
     *
     * @returns {Object} Promise which is resolved with data
     */
    _getData(uri, options) {
        const httpOptions = {
            port: this.port
        };
        if (this.token) {
            httpOptions.headers = {
                'x-f5-auth-token': this.token,
                'User-Agent': constants.USER_AGENT
            };
        }
        if (options.body) {
            httpOptions.method = 'POST';
            httpOptions.body = options.body;
        }

        return Promise.resolve(util.makeRequest(this.host, uri, httpOptions))
            .then((data) => {
                // use uri unless name is explicitly provided
                const nameToUse = options.name !== undefined ? options.name : uri;
                const ret = { name: nameToUse, data };
                return ret;
            })
            .catch((err) => {
                throw err;
            });
    }

    /**
     * Get data for specific endpoint (with some extra logic)
     *
     * @param {Object} endpointProperties - endpoint properties
     *
     * @returns {Object} Promise which is resolved with data
     */
    _getAndExpandData(endpointProperties) {
        const p = endpointProperties;
        let rawDataToModify;
        let referenceKey;
        const childItemKey = 'items';

        return Promise.resolve(this._getData(p.endpoint, { name: p.name, body: p.body }))
            .then((data) => {
                // data is { name: foo, data: bar }
                if (p.expandReferences) {
                    const actualData = data.data;
                    // for now let's just support a single reference
                    referenceKey = Object.keys(p.expandReferences)[0];

                    const promises = [];
                    // assumes we are looking inside of single property, might need to extend this to 'entries', etc.
                    if (typeof actualData === 'object' && actualData[childItemKey] !== undefined && Array.isArray(actualData[childItemKey])) {
                        for (let i = 0; i < actualData[childItemKey].length; i += 1) {
                            const item = actualData[childItemKey][i];
                            // first check for reference and then link property
                            if (item[referenceKey] && item[referenceKey].link) {
                                // remove protocol/host from self link
                                const referenceEndpoint = item[referenceKey].link.replace('https://localhost', '');
                                // use index as name for later use
                                promises.push(this._getData(referenceEndpoint, { name: i }));
                            }
                        }
                    }
                    rawDataToModify = data; // retain raw data for later use
                    return Promise.all(promises);
                }
                return Promise.resolve(data);
            })
            .then((data) => {
                // this tells us we (might) need to modify the raw data
                if (rawDataToModify) {
                    // always return the raw data, but attempt to modify in place
                    data.forEach((i) => {
                        rawDataToModify.data[childItemKey][i.name][referenceKey] = i.data;
                    });
                    return Promise.resolve(rawDataToModify);
                }
                return Promise.resolve(data);
            })
            .catch((err) => {
                throw err;
            });
    }

    /**
     * Get all data
     *
     * @param {Object} endpoints - endpoint object(s) formatted like the following: { endpoint: 'uri' }
     *
     * @returns {Object} Promise which is resolved with an object containing data
     */
    _getAllData(endpoints) {
        let promise;
        // if host is localhost we do not need an auth token
        if (this.host === constants.LOCAL_HOST) {
            promise = Promise.resolve({ token: null });
        } else {
            if (!this.username || !this.passphrase) { throw new Error('Username and passphrase required'); }
            promise = util.getAuthToken(this.host, this.username, this.passphrase, { port: this.port });
        }

        return Promise.resolve(promise)
            .then((token) => {
                this.token = token.token;
                const promises = [];

                endpoints.forEach((i) => {
                    // call getAndExpandData which will handle logic for each endpoint
                    promises.push(this._getAndExpandData(i));
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
     * Collect info based on object provided in properties
     *
     * @param {String} host       - host
     * @param {Integer} port      - port
     * @param {String} username   - username for host
     * @param {String} passphrase - password for host
     *
     * @returns {Object} Promise which is resolved with a map of stats
     */
    collect(host, port, username, passphrase) {
        this.host = host;
        if (!this.host) { throw new Error('Host required'); }
        if (port) { this.port = port; }
        if (username) { this.username = username; }
        if (passphrase) { this.passphrase = passphrase; }

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
