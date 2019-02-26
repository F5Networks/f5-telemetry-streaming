/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const request = require('request');
const icrdk = require('icrdk'); // eslint-disable-line import/no-extraneous-dependencies

const DEFAULT_PORT = 443;

module.exports = {

    /**
     * Log a message (simply using console.log)
     *
     * @param {Object|String} msg - message to log
     *
     * @returns {Void}
     */
    log(msg) {
        console.log(`${new Date().toISOString()} ${this.stringify(msg)}`); // eslint-disable-line no-console
    },

    /**
     * Stringify a message
     *
     * @param {Object|String} msg - message to stringify
     *
     * @returns {Object} Stringified message
     */
    stringify(msg) {
        if (typeof msg === 'object') {
            try {
                msg = JSON.stringify(msg);
            } catch (e) {
                // just leave original message intact
            }
        }
        return msg;
    },

    /**
     * Perform HTTP request
     *
     * @param {String} host              - HTTP host
     * @param {String} uri               - HTTP uri
     * @param {Object} options           - function options
     * @param {Integer} [options.port]   - HTTP port
     * @param {String} [options.method]  - HTTP method
     * @param {String} [options.body]    - HTTP body
     * @param {Object} [options.headers] - HTTP headers
     *
     * @returns {Object} Returns promise resolved with response
     */
    makeRequest(host, uri, options) {
        options = options || {};

        let fullUri = `https://${host}`;
        fullUri = options.port ? `${fullUri}:${options.port}${uri}` : `${fullUri}:${DEFAULT_PORT}${uri}`;
        const requestOptions = {
            uri: fullUri,
            method: options.method || 'GET',
            body: options.body ? this.stringify(options.body) : undefined,
            headers: options.headers || {},
            strictSSL: false
        };

        return new Promise((resolve, reject) => {
            request(requestOptions, (err, res, body) => {
                if (err) {
                    reject(new Error(`HTTP error: ${err}`));
                } else if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} ${res.body} for ${uri}`;
                    reject(new Error(msg));
                }
            });
        });
    },

    /**
     * Get auth token
     *
     * @param {String} host     - host
     * @param {String} username - username
     * @param {String} password - password
     *
     * @returns {Object} Returns promise resolved with auth token: { token: 'token' }
     */
    getAuthToken(host, username, password) {
        const uri = '/mgmt/shared/authn/login';
        const body = JSON.stringify({
            username,
            password,
            loginProviderName: 'tmos'
        });
        const postOptions = {
            method: 'POST',
            body
        };

        return this.makeRequest(host, uri, postOptions)
            .then(data => ({ token: data.token.token }))
            .catch((err) => {
                const msg = `getAuthToken: ${err}`;
                throw new Error(msg);
            });
    },

    /**
     * Install ILX package
     *
     * @param {String} host      - host
     * @param {String} authToken - auth token
     * @param {String} file      - local file (RPM) to install
     *
     * @returns {Promise} Returns promise resolved upon completion
     */
    installPackage(host, authToken, file) {
        const opts = {
            HOST: host,
            AUTH_TOKEN: authToken
        };

        return new Promise((resolve, reject) => {
            icrdk.deployToBigIp(opts, file, (err) => {
                if (err) {
                    // resolve if error is because the package is already installed
                    // in that case error is of type 'string' - instead of in .message
                    if (typeof err === 'string' && err.includes('already installed')) resolve();
                    else reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Uninstall ILX package
     *
     * @param {String} host      - host
     * @param {String} authToken - auth token
     * @param {String} pkg       - package to remove from device
     *
     * @returns {Promise} Returns promise resolved upon completion
     */
    uninstallPackage(host, authToken, pkg) {
        const opts = {
            HOST: host,
            AUTH_TOKEN: authToken
        };

        return new Promise((resolve, reject) => {
            icrdk.uninstallPackage(opts, pkg, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
};
