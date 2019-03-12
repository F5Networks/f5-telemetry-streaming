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
const util = require('../shared/util.js');
const constants = require('../shared/constants.js');

const baseILXUri = '/mgmt/shared/telemetry';
const hosts = util.getHosts('TEST_HARNESS_FILE');

// purpose: system tests
describe('System', function () {
    // set timeouts/retries for test suite
    this.timeout(1000 * 60 * 5); // timeout for each test
    this.slow(1000 * 60 * 3); // increase limit before test is marked as "slow"
    this.retries(20);

    // read in example config
    const decl = fs.readFileSync(constants.DECL.BASIC_EXAMPLE).toString();
    const pollerName = constants.DECL.POLLER_NAME;
    const consumerName = constants.DECL.CONSUMER_NAME;

    // get package details
    const packageDetails = util.getPackageDetails();
    const packageFile = packageDetails.name;
    const packagePath = packageDetails.path;
    util.log(`Package File: ${packageFile}`);

    // create logs directory - used later
    const logsDir = `${__dirname}/logs`;
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }

    let authToken = null;
    let options = {};
    beforeEach(function () {
        options = {
            headers: {
                'x-f5-auth-token': authToken
            }
        };
    });
    after(function () {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    function checkPassphraseObject(data) {
        const passphrase = data.declaration[consumerName].passphrase;
        // check that the declaration returned contains encrypted text
        // note: this only applies to TS running on BIG-IP (which is all we are testing for now)
        assert.strictEqual(passphrase.cipherText.startsWith('$M'), true);
    }

    // account for 1+ hosts
    hosts.forEach(function (item) {
        const host = item.ip;
        const user = item.username;
        const password = item.password;

        let postResponse;

        it(`--- Running tests against host: ${host} ---`, () => {}); // keeps message in sync

        it('should get auth token', function () {
            return util.getAuthToken(host, user, password)
                .then((data) => {
                    authToken = data.token;
                })
                .catch(err => Promise.reject(err));
        });

        it('should install package', function () {
            const fullPath = `${packagePath}/${packageFile}`;
            return util.installPackage(host, authToken, fullPath)
                .then(() => {})
                .catch(err => Promise.reject(err));
        });

        it('should verify installation', function () {
            const uri = `${baseILXUri}/info`;

            util.log('Verifying installation');
            return new Promise(resolve => setTimeout(resolve, 5000))
                .then(() => util.makeRequest(host, uri, options))
                .then((data) => {
                    data = data || {};
                    assert.notStrictEqual(data.version, undefined);
                })
                .catch(err => Promise.reject(err));
        });

        it('should post configuration', function () {
            const uri = `${baseILXUri}/declare`;

            const postOptions = {
                method: 'POST',
                headers: options.headers,
                body: decl
            };

            return util.makeRequest(host, uri, postOptions)
                .then((data) => {
                    assert.strictEqual(data.message, 'success');

                    checkPassphraseObject(data);
                })
                .catch(err => Promise.reject(err));
        });

        it('should post configuration (again)', function () {
            const uri = `${baseILXUri}/declare`;

            const postOptions = {
                method: 'POST',
                headers: options.headers,
                body: decl
            };

            return util.makeRequest(host, uri, postOptions)
                .then((data) => {
                    postResponse = data; // used later
                })
                .catch(err => Promise.reject(err));
        });

        it('should get configuration', function () {
            const uri = `${baseILXUri}/declare`;

            return util.makeRequest(host, uri, options)
                .then((data) => {
                    assert.strictEqual(JSON.stringify(data.declaration), JSON.stringify(postResponse.declaration));

                    checkPassphraseObject(data);
                })
                .catch(err => Promise.reject(err));
        });

        it('should get systempoller info', function () {
            const uri = `${baseILXUri}/systempoller/${pollerName}`;

            return util.makeRequest(host, uri, options)
                .then((data) => {
                    data = data || {};
                    assert.notStrictEqual(data.system.hostname, undefined);
                })
                .catch(err => Promise.reject(err));
        });

        it('should ensure event listener can be reached', function () {
            // to reach listener via mgmt IP might require allowing through host fw using below command (or similar)
            // tmsh modify security firewall management-ip-rules rules replace-all-with { telemetry
            // { place-before first ip-protocol tcp destination { ports replace-all-with { 6514 } } action accept } }

            const uri = '/mgmt/tm/security/firewall/management-ip-rules/rules';
            const ruleName = 'telemetry';
            let passOnError = false;

            return util.makeRequest(host, uri, options)
                .catch((error) => {
                    // older versions of BIG-IP do not have security enabled by default
                    const errMsg = error.message;
                    if (errMsg.includes('must be licensed')) passOnError = true;
                    return Promise.reject(error);
                })
                .then(() => util.makeRequest(host, uri, options))
                .then((data) => {
                    let match = false;
                    data.items.forEach((i) => {
                        if (i.name === ruleName) match = true;
                    });

                    // check if rule already exists
                    if (match === true) {
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
                                    name: '6514'
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

        it('should ensure event listener is up', function () {
            const port = 6514;

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

        it('should get restnoded log', function () {
            // grab restnoded log - useful during test failures
            // ignore certain lines, for example: "<Date> - finest: socket 1 closed"
            const uri = '/mgmt/tm/util/bash';

            const postOptions = {
                method: 'POST',
                headers: options.headers,
                body: JSON.stringify({
                    command: 'run',
                    utilCmdArgs: '-c "cat /var/log/restnoded/restnoded.log | grep -v socket"'
                })
            };

            return util.makeRequest(host, uri, postOptions)
                .then((data) => {
                    const file = `${logsDir}/restnoded.log`;

                    util.log(`Saving restnoded log to ${file}`);
                    fs.writeFileSync(file, data.commandResult);
                })
                .catch(err => Promise.reject(err));
        });
    });
});
