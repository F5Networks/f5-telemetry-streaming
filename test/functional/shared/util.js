/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const fs = require('fs');
const icrdk = require('icrdk'); // eslint-disable-line import/no-extraneous-dependencies
const net = require('net');
const request = require('request');
const SSHClient = require('ssh2').Client; // eslint-disable-line import/no-extraneous-dependencies

const constants = require('./constants');
const logger = require('../../winstonLogger').logger;

/**
 * Allows calling makeRequest with retryOptions
 *
 * @param {Function} makeRequest - function call to makeRequest
 * @param {Number} interval - time in ms between retries
 * @param {Number} maxRetries - maximum number of retry attempts
 * @returns {Promise}
 */

const makeRequestWithRetry = function (makeRequest, interval, maxRetries) {
    return new Promise((resolve, reject) => {
        makeRequest()
            .then(resolve)
            .catch((error) => {
                setTimeout(() => {
                    if (maxRetries <= 1) {
                        error.message = `Maximum retries reached. Last error: ${error.message}`;
                        reject(error);
                        return;
                    }
                    makeRequestWithRetry(makeRequest, interval, maxRetries - 1)
                        .then(resolve, reject);
                }, interval);
            });
    });
};

module.exports = {

    makeRequestWithRetry,
    logger,

    /** Create folder (sync method)
     *
     * @param {String} fpath - path to folder
     */
    createDir(fpath) {
        if (!fs.existsSync(fpath)) {
            try {
                fs.mkdirSync(fpath);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            }
        }
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
     * Deep copy
     *
     * @param {Object} obj - data to deep copy
     *
     * @returns {Object} Copied object
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Get package details
     *
     * @returns {Object} { name: 'foo.rpm', path: '/tmp/foo.rpm' }
     */
    getPackageDetails() {
        // default to new build directory if it exists, otherwise use dist directory
        const dir = `${__dirname}/../../../dist`;

        const distFiles = fs.readdirSync(dir);
        const packageFiles = distFiles.filter((f) => f.endsWith('.rpm'));

        // get latest rpm file (by timestamp since epoch)
        // note: this might not work if the artifact resets the timestamps
        const latest = { file: null, time: 0 };
        packageFiles.forEach((f) => {
            const fStats = fs.lstatSync(`${dir}/${f}`);
            if (fStats.birthtimeMs >= latest.time) {
                latest.file = f;
                latest.time = fStats.birthtimeMs;
            }
        });
        const packageFile = latest.file;
        if (!packageFile) {
            throw new Error(`Unable to find RPM in ${dir}`);
        }

        return { name: packageFile, path: dir };
    },

    /**
     * Perform HTTP request
     *
     * @param {String}  host                    - HTTP host
     * @param {String}  uri                     - HTTP uri
     * @param {Object}  options                 - function options
     * @param {Integer} [options.port]          - HTTP port, default is 443
     * @param {String}  [options.protocol]      - HTTP protocol, default is https
     * @param {String}  [options.method]        - HTTP method, default is GET
     * @param {String}  [options.body]          - HTTP body
     * @param {Object}  [options.headers]       - HTTP headers
     * @param {Boolean} [otions.rawResponse]    - Whether or not to return raw HTTP response. Default=false
     *
     * @returns {Object} Returns promise resolved with response
     */
    makeRequest(host, uri, options) {
        options = options || {};
        const port = options.port === undefined ? constants.REQUEST.PORT : options.port;
        const protocol = options.protocol === undefined ? constants.REQUEST.PROTOCOL : options.protocol;

        host = host.endsWith('/') ? host.slice(0, host.length - 1) : host;
        uri = uri || '';
        uri = uri.startsWith('/') ? uri : `/${uri}`;

        const fullUri = `${protocol}://${host}:${port}${uri}`;
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
                    reject(new Error(`HTTP error for '${fullUri}' : ${err}`));
                } else if (res.statusCode >= 200 && res.statusCode <= 299) {
                    if (options.rawResponse) {
                        resolve(res);
                    } else {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            resolve(body);
                        }
                    }
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} ${res.body} for '${fullUri}'`;
                    err = new Error(msg);
                    err.statusCode = res.statusCode;
                    err.statusMessage = res.statusMessage;
                    reject(err);
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
     * @param {String} port - port
     * @returns {Promise} Returns promise resolved with auth token: { token: 'token' }
     */
    getAuthToken(host, username, password, port) {
        const uri = '/mgmt/shared/authn/login';
        const body = JSON.stringify({
            username,
            password,
            loginProviderName: 'tmos'
        });
        const postOptions = {
            method: 'POST',
            port,
            body
        };

        return this.makeRequest(host, uri, postOptions)
            .then((data) => ({ token: data.token.token }))
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
    installPackage(host, authToken, file, port) {
        const opts = {
            HOST: host,
            AUTH_TOKEN: authToken,
            PORT: port
        };

        return new Promise((resolve, reject) => {
            icrdk.deployToBigIp(opts, file, (err) => {
                if (err) {
                    // resolve if error is because the package is already installed
                    // in that case error is of type 'string' - instead of in .message
                    if (process.env[constants.ENV_VARS.TEST_CONTROLS.REUSE_INSTALLED_PACKAGE] !== undefined
                            && /already installed/.test(err)) {
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Get list of installed ILX packages
     * @param {String} host      - host
     * @param {String} authToken - auth token
     *
     * @returns {Promise} Returns promise resolved upon completion
     */
    getInstalledPackages(host, authToken) {
        // icrdk bug - should pass headers and should send additional requests
        const opts = {
            HOST: host,
            headers: {
                'x-f5-auth-token': authToken
            }
        };
        const self = this;

        return new Promise((resolve, reject) => {
            function checkDataAndRetry(data) {
                if (data.queryResponse) {
                    resolve(data.queryResponse);
                } else if (data.selfLink) {
                    const uri = data.selfLink.replace('https://localhost', '');
                    setTimeout(() => {
                        self.makeRequest(host, uri, { headers: opts.headers })
                            .then(checkDataAndRetry);
                    }, 300);
                } else {
                    reject(new Error(`Unable to fetch data. Unexpected response: ${JSON.stringify(data)}`));
                }
            }

            icrdk.queryInstalledPackages(opts, (err, queryResults) => {
                if (err) {
                    reject(err);
                } else {
                    checkDataAndRetry(queryResults);
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

        const conn = new SSHClient();
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
     * Get host(s) - info provided in one of two ways
     * - *Harness File* - file: look for example test/deployment/example_harness_facts.json
     * - *Environment Vars* - constants contains var for IP (1+), USER, PWD
     *
     * @param {String} harnessType - type of harness to query for: BIGIP|CONSUMER
     *
     * @returns {Object} Returns [ { ip: x.x.x.x, username: admin, password: admin } ]
     */
    getHosts(harnessType) {
        let hosts;
        let envVars;

        if (harnessType === 'BIGIP') {
            envVars = constants.ENV_VARS.TEST_HARNESS;
        } else if (harnessType === 'CONSUMER') {
            envVars = constants.ENV_VARS.CONSUMER_HARNESS;
        }

        const testHarnessFile = envVars.FILE ? process.env[envVars.FILE] : null;
        if (testHarnessFile && fs.existsSync(testHarnessFile)) {
            let filter;
            if (harnessType === 'BIGIP') {
                filter = (item) => item.is_f5_device && item.type === 'bigip';
            } else {
                filter = (item) => !item.is_f5_device;
            }
            // eslint-disable-next-line import/no-dynamic-require, global-require
            hosts = require(testHarnessFile).filter(filter).map((item) => {
                if (item.is_f5_device) {
                    item = {
                        ip: item.admin_ip,
                        username: item.f5_rest_user.username,
                        password: item.f5_rest_user.password,
                        hostname: item.f5_hostname,
                        hostalias: item.f5_hostname.substring(item.f5_hostname.indexOf('bigip'), item.f5_hostname.indexOf('.'))
                    };
                } else {
                    item = {
                        ip: item.admin_ip,
                        username: item.ssh_user.username,
                        password: item.ssh_user.password
                    };
                }
                return item;
            });
        } else if (envVars && envVars.IP && process.env[envVars.IP]) {
            // straight up environment variables - could be 1+ hosts: x.x.x.x,x.x.x.y
            hosts = process.env[envVars.IP].split(',').map((host) => ({
                ip: host,
                username: process.env[envVars.USER],
                password: process.env[envVars.PWD]
            }));
            // end environment variables
        } else {
            const msg = 'Error: Please provide appropriate test harness environment variables';
            logger.error(msg);
            throw new Error(msg);
        }
        return hosts;
    },

    /**
     * Send event - send msg using tcp
     *
     * @param {String} host - host where event should be sent
     * @param {String} msg  - msg to send
     *
     * @returns {Promise} Returns promise resolved on sent message
     */
    sendEvent(host, msg) {
        const port = constants.EVENT_LISTENER_DEFAULT_PORT;

        return new Promise((resolve, reject) => {
            const client = net.createConnection({ host, port }, () => {
                logger.info(`Sending following message to ${host} [port=${port}]`, { msg });
                client.write(msg);
                client.end();
            });
            client.on('end', () => {
                resolve();
            });
            client.on('error', (err) => {
                reject(err);
            });
        });
    },

    /**
     * Validate data against JSON schema
     *
     * @param {String} data   - data to validate
     * @param {String} schema - JSON schema to use during validation
     *
     * @returns {Boolean|Object} Returns true on successful validation or object with errors
     */
    validateAgainstSchema(data, schema) {
        const ajv = new Ajv({ useDefaults: true });
        const validator = ajv.compile(schema);
        const valid = validator(data);
        if (!valid) {
            return { errors: validator.errors };
        }
        return true;
    },

    /**
     * Performs a POST declaration request to a device
     *
     * @param {Object} deviceInfo
     * @param {Object} declaration
     * @returns {Promise} Promise resolved with response
     */
    postDeclaration(deviceInfo, declaration) {
        const uri = `${constants.BASE_ILX_URI}/declare`;
        const host = deviceInfo.ip;
        const user = deviceInfo.username;
        const password = deviceInfo.password;
        const port = deviceInfo.port;

        return this.getAuthToken(host, user, password, port)
            .then((data) => {
                const postOptions = {
                    port,
                    method: 'POST',
                    headers: {
                        'x-f5-auth-token': data.token
                    },
                    body: declaration
                };
                return this.makeRequest(host, uri, postOptions);
            });
    },

    /**
     * Sleep for N milliseconds
     *
     * @param {Integer} sleepTime - number of ms.
     *
     * @returns {Promise}
     */
    sleep(sleepTime) {
        return new Promise((resolve) => { setTimeout(resolve, sleepTime); });
    },

    /**
     * Gets the full version of the Device Under Test (dut)
     *
     * @param {Object} dut              - Device Under Test object
     * @param {String} dut.ip           - DUT IP address
     * @param {String} dut.username     - DUT username
     * @param {String} dut.password     - DUT password
     *
     * @returns {Promise} Promise resolved with full version of the DUT (ex: '14.1.4.2')
     */
    getBigipVersion(dut) {
        const uri = '/mgmt/tm/sys/clock';
        const host = dut.ip;
        const user = dut.username;
        const password = dut.password;
        return this.getAuthToken(host, user, password)
            .then((data) => {
                const postOptions = {
                    method: 'GET',
                    headers: {
                        'x-f5-auth-token': data.token
                    }
                };
                return this.makeRequest(host, uri, postOptions);
            })
            .then((response) => response.selfLink.split('ver=')[1]);
    }
};
