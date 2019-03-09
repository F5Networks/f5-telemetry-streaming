/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const fs = require('fs');
const request = require('request');
const SshClient = require('ssh2').Client; // eslint-disable-line import/no-extraneous-dependencies
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

        // handle query string values, if any, according to lib
        const checkForQS = uri.split('?');
        const qs = {};
        if (checkForQS.length > 1) {
            uri = checkForQS[0];
            checkForQS[1].split('&').forEach((i) => {
                const kV = i.split('=');
                qs[kV[0]] = kV[1];
            });
        }

        let fullUri = `https://${host}`;
        fullUri = options.port ? `${fullUri}:${options.port}${uri}` : `${fullUri}:${DEFAULT_PORT}${uri}`;
        const requestOptions = {
            uri: fullUri,
            qs,
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
     * @returns {Promise} Returns promise resolved with auth token: { token: 'token' }
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
    },

    /**
     * Perform remote command (over ssh)
     *
     * @param {String} host                  - host
     * @param {String} username              - username
     * @param {String} command               - command to run
     * @param {Object} options               - function options
     * @param {Integer} [options.port]       - port
     * @param {Integer} [options.password]   - password (use this or privateKey)
     * @param {Integer} [options.privateKey] - path to private key
     *
     * @returns {Promise} Returns promise resolved with response
     */
    performRemoteCmd(host, username, command, options) {
        options = options || {};

        const conn = new SshClient();
        return new Promise((resolve, reject) => {
            let response = '';
            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) throw err;

                    stream.on('data', (data) => {
                        response += data.toString('utf8');
                    });
                    stream.on('close', () => {
                        conn.end();
                    });
                    stream.stderr.on('data', (data) => {
                        reject(new Error(data.toString('utf8')));
                    });
                });
            })
                .connect({
                    host,
                    port: options.port || 22,
                    username,
                    password: options.password || null,
                    privateKey: options.privateKey ? fs.readFileSync(options.privateKey) : null
                });

            conn.on('end', () => {
                resolve(response);
            });
        });
    },

    /**
     * Get host(s) - provided via two options
     * - *harnessFileEnv* - path to file: [ { admin_ip: x.x.x.x, admin_username: admin, admin_password: admin } ]
     * - VIO_HOSTS (1+) + VIO_HOST_USER + VIO_HOST_PWD
     *
     * @param {String} harnessFileEnv - Name of the environment variable containing the file
     *
     * @returns {Object} Returns [ { ip: x.x.x.x, username: admin, password: admin } ]
     */
    getHosts(harnessFileEnv) {
        let hosts;

        const testHarnessFile = process.env[harnessFileEnv];
        if (testHarnessFile && fs.existsSync(testHarnessFile)) {
            // eslint-disable-next-line import/no-dynamic-require, global-require
            hosts = require(testHarnessFile).map(item => ({
                ip: item.admin_ip,
                username: item.admin_username,
                password: item.admin_password
            }));
        } else if (process.env.VIO_HOSTS) {
            // straight up environment variables - could be 1+ hosts: x.x.x.x,x.x.x.y
            hosts = process.env.VIO_HOSTS.split(',').map(host => ({
                ip: host,
                username: process.env.VIO_HOST_USER,
                password: process.env.VIO_HOST_PWD
            }));
            // end environment variables
        } else {
            const msg = 'Error: Please provide appropriate environment variables';
            this.log(msg);
            throw new Error(msg);
        }
        return hosts;
    }
};
