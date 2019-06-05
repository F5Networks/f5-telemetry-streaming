/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses
/* eslint-disable prefer-arrow-callback */

/* eslint-disable global-require */

const assert = require('assert');
const fs = require('fs');
const net = require('net');
const readline = require('readline');
const util = require('./shared/util.js');
const constants = require('./shared/constants.js');

const baseILXUri = '/mgmt/shared/telemetry';
const duts = util.getHosts('BIGIP');
const packageDetails = util.getPackageDetails();

const LOGS_DIR = `${__dirname}/logs`;

/**
 * Post declaration to TS on DUTs
 *
 * @param {Function} callback - callback, should return declaration
 *
 * @returns {Object} Promise resolved when all requests succeed
 */
function postDeclarationToDUTs(callback) {
    const uri = `${baseILXUri}/declare`;

    // account for 1+ DUTs
    const promises = duts.map((item) => {
        const declaration = callback(item);
        const host = item.ip;
        const user = item.username;
        const password = item.password;

        return util.getAuthToken(host, user, password)
            .then((data) => {
                const postOptions = {
                    method: 'POST',
                    headers: {
                        'x-f5-auth-token': data.token
                    },
                    body: declaration
                };
                return util.makeRequest(host, uri, postOptions);
            })
            .then((data) => {
                assert.strictEqual(data.message, 'success');
            });
    });
    return Promise.all(promises);
}

/**
 * Send data to TS Event Listener on DUTs
 *
 * @param {Function} callback - callback, should return data
 *
 * @returns {Object} Promise resolved when all requests succeed
 */
function sendDataToDUTsEventListener(callback) {
    // account for 1+ DUTs
    return Promise.all(duts.map(item => util.sendEvent(item.ip, callback(item))))
        .catch((err) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(err);
                }, 1000);
            })
        });
}

/**
 * Fetch System Poller data from DUTs
 *
 * @param {Function} callback - callback(hostObj, data)
 *
 * @returns {Object} Promise resolved when all requests succeed
 */
function getSystemPollerData(callback) {
    const uri = `${baseILXUri}/systempoller/${constants.DECL.SYSTEM_NAME}`;
    const promises = duts.map((item) => {
        const host = item.ip;
        const user = item.username;
        const password = item.password;

        return util.getAuthToken(host, user, password)
            .then((data) => {
                const postOptions = {
                    method: 'GET',
                    headers: {
                        'x-f5-auth-token': data.token
                    }
                };
                return util.makeRequest(host, uri, postOptions);
            })
            .then((data) => {
                callback(item, data);
            });
    });
    return Promise.all(promises);
}

/**
 * Uninstall all TS packages
 *
 * @param {String} host      - host
 * @param {String} authToken - auth token
 * @param {Object} options   - request options
 *
 * @returns Promise resolved once TS packages removed from F5 device
 */
function uninstallAllTSpackages(host, authToken, options) {
    const uri = `${baseILXUri}/info`;
    let error;
    let data;

    return util.getInstalledPackages(host, authToken)
        .then(installedPackages => Promise.all(installedPackages
            .filter(pkg => pkg.packageName.includes('f5-telemetry'))
            .map(pkg => util.uninstallPackage(host, authToken, pkg.packageName))))
        .then(() => util.makeRequest(host, uri, options))
        .then((resp) => {
            data = resp;
        })
        .catch((err) => {
            error = err;
        })
        .then(() => {
            if (data) {
                throw new Error(`Unexpected response from ${uri}: ${JSON.stringify(data)}`);
            }
            if (error && error.statusCode !== 404) {
                throw new Error(`Expected HTTP 404 Not Found. Actual error ${error}`);
            }
        });
}


function setup() {
    // get package details
    const packageFile = packageDetails.name;
    const packagePath = packageDetails.path;
    util.log(`Package File to install on DUT: ${packageFile} [${packagePath}]`);

    // create logs directory - used later
    if (!fs.existsSync(LOGS_DIR)) {
        try {
            fs.mkdirSync(LOGS_DIR);
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    }

    // account for 1+ DUTs
    duts.forEach(function (item) {
        describe(`DUT setup - ${item.hostname}`, function () {
            const host = item.ip;
            const user = item.username;
            const password = item.password;

            let authToken = null;
            let options = {};

            before(function () {
                return util.getAuthToken(host, user, password)
                    .then((data) => {
                        authToken = data.token;
                    });
            });

            beforeEach(function () {
                options = {
                    headers: {
                        'x-f5-auth-token': authToken
                    }
                };
            });

            it('should remove pre-existing TS declaration', function () {
                const uri = `${baseILXUri}/declare`;
                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: {
                        class: "Telemetry"
                    }
                };
                let data;
                let error;

                return util.makeRequest(host, uri, postOptions)
                    .then((resp) => {
                        data = resp;  
                    })
                    .catch((err) => {
                        error = err;
                    })
                    .then(() => {
                        // silently skip error - probably no TS package installed
                        if (error) {
                            return Promise.resolve();
                        }
                        assert.strictEqual(data.message, 'success');
                        // wait for 5 secs while declaration will be saved to storage
                        return new Promise(resolve => setTimeout(resolve, 5000));
                    });
            });

            it('should remove pre-existing TS packages', function () {
                return uninstallAllTSpackages(host, authToken, options);
            });

            it('should erase restnoded log', function () {
                const uri = '/mgmt/tm/util/bash';
                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: JSON.stringify({
                        command: 'run',
                        utilCmdArgs: '-c "> /var/log/restnoded/restnoded.log"'
                    })
                };
                return util.makeRequest(host, uri, postOptions);
            });

            it('should install package', function () {
                const fullPath = `${packagePath}/${packageFile}`;
                return util.installPackage(host, authToken, fullPath)
                    .then(() => {});
            });

            it('should verify installation', function () {
                const uri = `${baseILXUri}/info`;

                return new Promise(resolve => setTimeout(resolve, 5000))
                    .then(() => util.makeRequest(host, uri, options))
                    .then((data) => {
                        data = data || {};
                        util.log(`${uri} response: ${JSON.stringify(data)}`);
                        assert.notStrictEqual(data.version, undefined);
                    });
            });

            it('should configure firewall rules', function () {
                // BIGIP 14.1+ only:
                // to reach listener via mgmt IP might require allowing through host fw
                // using below command (or similar):
                // tmsh modify security firewall management-ip-rules rules replace-all-with { telemetry
                // { place-before first ip-protocol tcp destination {
                // ports replace-all-with { 6514 } } action accept } }
                const uri = '/mgmt/tm/security/firewall/management-ip-rules/rules';
                const ruleName = 'telemetry';
                let passOnError = false;

                return util.makeRequest(host, uri, options)
                    .catch((error) => {
                        // older versions of BIG-IP do not have security enabled by default
                        const errMsg = error.message;
                        // just info the user that something unexpected happened but still trying to proceed
                        if (!errMsg.includes('must be licensed')) {
                            util.log(`Unable to configure management-ip rules, continue with current config. Error message: ${error.message}`);
                        }
                        passOnError = true;
                        return Promise.reject(error);
                    })
                    .then(() => util.makeRequest(host, uri, options))
                    .then((data) => {
                        // check if rule already exists
                        if (data.items.some(i => i.name === ruleName) === true) {
                            // exists, delete the rule
                            const deleteOptions = {
                                method: 'DELETE',
                                headers: options.headers
                            };
                            return util.makeRequest(host, `${uri}/${ruleName}`, deleteOptions);
                        }
                        return Promise.resolve();
                    })
                    .then(() => {
                        // create rule
                        const body = JSON.stringify({
                            name: ruleName,
                            'place-before': 'first',
                            action: 'accept',
                            ipProtocol: 'tcp',
                            destination: {
                                ports: [
                                    {
                                        name: String(constants.EVENT_LISTENER_PORT)
                                    }
                                ]
                            }
                        });
                        const postOptions = {
                            method: 'POST',
                            headers: options.headers,
                            body
                        };
                        return util.makeRequest(host, uri, postOptions);
                    })
                    .catch((err) => {
                        if (passOnError === true) {
                            return Promise.resolve();
                        }
                        return Promise.reject(err);
                    });
            });
        });
    });
}

function test() {
    // read in example config
    const declaration = fs.readFileSync(constants.DECL.BASIC_EXAMPLE).toString();

    function checkPassphraseObject(data) {
        const passphrase = data.declaration[constants.DECL.CONSUMER_NAME].passphrase;
        // check that the declaration returned contains encrypted text
        // note: this only applies to TS running on BIG-IP (which is all we are testing for now)
        assert.strictEqual(passphrase.cipherText.startsWith('$M'), true);
    }

    // account for 1+ DUTs
    duts.forEach(function (item) {
        describe(`DUT test - ${item.hostname}`, function () {
            const host = item.ip;
            const user = item.username;
            const password = item.password;

            let postResponse;
            let authToken = null;
            let options = {};

            before(function () {
                return util.getAuthToken(host, user, password)
                    .then((data) => {
                        authToken = data.token;
                    });
            });

            beforeEach(function () {
                options = {
                    headers: {
                        'x-f5-auth-token': authToken
                    }
                };
            });

            it('should post configuration', function () {
                const uri = `${baseILXUri}/declare`;

                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: declaration
                };

                return util.makeRequest(host, uri, postOptions)
                    .then((data) => {
                        assert.strictEqual(data.message, 'success');

                        checkPassphraseObject(data);
                    });
            });

            it('should post configuration (again)', function () {
                const uri = `${baseILXUri}/declare`;

                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: declaration
                };

                return util.makeRequest(host, uri, postOptions)
                    .then((data) => {
                        postResponse = data; // used later
                    });
            });

            it('should get configuration', function () {
                const uri = `${baseILXUri}/declare`;

                return util.makeRequest(host, uri, options)
                    .then((data) => {
                        assert.strictEqual(JSON.stringify(data.declaration), JSON.stringify(postResponse.declaration));

                        checkPassphraseObject(data);
                    });
            });

            it('should get systempoller info', function () {
                const uri = `${baseILXUri}/systempoller/${constants.DECL.SYSTEM_NAME}`;

                return util.makeRequest(host, uri, options)
                    .then((data) => {
                        data = data || {};
                        const schema = JSON.parse(fs.readFileSync(constants.DECL.SYSTEM_POLLER_SCHEMA));
                        const valid = util.validateAgainstSchema(data, schema);
                        if (valid !== true) {
                            assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                        }
                    });
            });

            it('should ensure event listener is up', function () {
                const port = constants.EVENT_LISTENER_PORT;

                return new Promise((resolve, reject) => {
                    const client = net.createConnection({ host, port }, () => {
                        client.end();
                    });
                    client.on('end', () => {
                        resolve();
                    });
                    client.on('error', (err) => {
                        reject(err);
                    });
                });
            });
        });
    });
}

function teardown() {
    // purpose: cleanup tests
    // account for 1+ DUTs
    duts.forEach(function (item) {
        describe(`Cleanup DUT - ${item.hostname}`, function () {
            const host = item.ip;
            const user = item.username;
            const password = item.password;

            let authToken = null;
            let logFile = null;
            let options = {};

            before(function () {
                return util.getAuthToken(host, user, password)
                    .then((data) => {
                        authToken = data.token;
                    });
            });

            beforeEach(function () {
                options = {
                    headers: {
                        'x-f5-auth-token': authToken
                    }
                };
            });

            it('should get restnoded log', function () {
                // grab restnoded log - useful during test failures
                // interested only in lines with 'telemetry'
                const uri = '/mgmt/tm/util/bash';
                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: JSON.stringify({
                        command: 'run',
                        utilCmdArgs: '-c "cat /var/log/restnoded/restnoded.log | grep telemetry"'
                    })
                };
                return util.makeRequest(host, uri, postOptions)
                    .then((data) => {
                        logFile = `${LOGS_DIR}/restnoded_${host}.log`;
                        util.log(`Saving restnoded log to ${logFile}`);
                        fs.writeFileSync(logFile, data.commandResult);
                    });
            });

            it('should check restnoded log for errors in [telemetry] messages', function () {
                let errCounter = 0;
                const regexp = new RegExp(/\[telemetry][\S\s]*error/, 'i');

                const rl = readline.createInterface({
                    input: fs.createReadStream(logFile)
                });
                rl.on('line', (line) => {
                    if (regexp.test(line)) {
                        errCounter += 1;
                    }
                });
                return new Promise((resolve) => {
                    rl.on('close', resolve);
                })
                    .then(() => {
                        if (errCounter) {
                            return Promise.reject(new Error(`${errCounter} error messages were found in ${logFile}`));
                        }
                        return Promise.resolve();
                    });
            });

            it('should remove existing TS packages', function () {
                return uninstallAllTSpackages(host, authToken, options);
            });
        });
    });
}

module.exports = {
    setup,
    test,
    teardown,
    utils: {
        postDeclarationToDUTs,
        sendDataToDUTsEventListener,
        getSystemPollerData
    }
};
