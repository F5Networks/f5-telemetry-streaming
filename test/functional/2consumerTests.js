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
const util = require('../shared/util.js');
const constants = require('../shared/constants.js');

const baseILXUri = '/mgmt/shared/telemetry'; // eslint-disable-line

const packageHost = util.getHosts('BIGIP')[0]; // only *need* one
const consumerHost = util.getHosts('CONSUMER')[0]; // only expect one

// purpose: consumer tests
describe('Consumer', function () {
    const pAddr = packageHost.ip;
    const pUsername = packageHost.username;
    const pPassword = packageHost.password;
    let pAuthToken;

    const cAddr = consumerHost.ip;
    const cUsername = consumerHost.username;
    const cPassword = consumerHost.password;

    // read in example config
    const decl = JSON.parse(fs.readFileSync(constants.DECL.BASIC_EXAMPLE));

    // for now this is a placeholder
    describe('Setup Host', function () {
        util.log(`Consumer Host: ${cAddr}`);

        it('should set root password', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('should install docker', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });
    });

    describe('Consumer: Splunk', function () {
        const splunkUsername = 'admin';
        const splunkPassword = cPassword; // might want to generate one instead
        const basicAuthHeader = `Basic ${Buffer.from(`${splunkUsername}:${splunkPassword}`).toString('base64')}`;

        const containerName = 'ts_splunk_consumer';

        let apiToken;

        it('should pull container image', function () {
            // no need to check if image is already installed - if it is installed
            // docker will simply check for updates and exit normally
            return util.performRemoteCmd(cAddr, cUsername, 'docker pull splunk/splunk:latest', { password: cPassword })
                .catch(err => Promise.reject(err));
        });

        it('should start container', function () {
            const portArgs = '-p 8000:8000 -p 8088:8088 -p 8089:8089';
            const eArgs = `-e 'SPLUNK_START_ARGS=--accept-license' -e 'SPLUNK_PASSWORD=${splunkPassword}'`;
            const cmd = `docker run -d --name ${containerName} ${portArgs} ${eArgs} splunk/splunk:latest`;

            // simple check to see if container already exists
            return util.performRemoteCmd(cAddr, cUsername, `docker ps | grep ${containerName}`, { password: cPassword })
                .then((data) => {
                    if (data) {
                        return Promise.resolve(); // exists, contine
                    }
                    return util.performRemoteCmd(cAddr, cUsername, cmd, { password: cPassword });
                })
                .catch(err => Promise.reject(err));
        });

        it('should check service is up', function () {
            const uri = '/services/server/control?output_mode=json';
            const options = {
                port: 8089,
                headers: {
                    Authorization: basicAuthHeader
                }
            };

            // splunk container takes about 30 seconds to come up
            return new Promise(resolve => setTimeout(resolve, 3000))
                .then(() => util.makeRequest(cAddr, uri, options))
                .then((data) => {
                    assert.strictEqual(data.links.restart, '/services/server/control/restart');
                })
                .catch(err => Promise.reject(err));
        });

        it('should configure HTTP data collector', function () {
            const baseUri = '/services/data/inputs/http';
            const outputMode = 'output_mode=json';
            const tokenName = 'token';

            let uri = `${baseUri}/http?${outputMode}&enableSSL=1&disabled=0`;
            const options = {
                method: 'POST',
                port: 8089,
                headers: {
                    Authorization: basicAuthHeader
                }
            };

            // configure global settings, create token
            return util.makeRequest(cAddr, uri, options)
                .then(() => {
                    uri = `${baseUri}?${outputMode}`;
                    return util.makeRequest(cAddr, uri, Object.assign(util.deepCopy(options), { method: 'GET' }));
                })
                .then((data) => {
                    data = data || {};
                    // check for existence of the token first
                    if (data.entry && data.entry.length) {
                        const exists = data.entry.filter(item => item.name.indexOf(tokenName) !== -1);
                        if (exists) return Promise.resolve({ entry: exists }); // exists, continue
                    }
                    uri = `${baseUri}?${outputMode}`;
                    return util.makeRequest(cAddr, uri, Object.assign(util.deepCopy(options), { body: `name=${tokenName}` }));
                })
                .then((data) => {
                    try {
                        apiToken = data.entry[0].content.token;
                    } catch (error) {
                        throw new Error('HTTP data collector api token could not be retrieved');
                    }
                    assert.notStrictEqual(apiToken, undefined);
                })
                .catch(err => Promise.reject(err));
        });

        it('should get auth token', function () {
            return util.getAuthToken(pAddr, pUsername, pPassword)
                .then((data) => {
                    pAuthToken = data.token;
                })
                .catch(err => Promise.reject(err));
        });

        it('should configure TS', function () {
            const uri = `${baseILXUri}/declare`;

            const consumerDecl = Object.assign(util.deepCopy(decl),
                {
                    Consumer_Splunk: {
                        class: 'Telemetry_Consumer',
                        type: 'Splunk',
                        host: cAddr,
                        protocol: 'https',
                        port: 8088,
                        passphrase: {
                            cipherText: apiToken
                        },
                        allowSelfSignedCert: true
                    }
                });

            const postOptions = {
                method: 'POST',
                headers: {
                    'x-f5-auth-token': pAuthToken
                },
                body: JSON.stringify(consumerDecl)
            };

            return util.makeRequest(pAddr, uri, postOptions)
                .then((data) => {
                    assert.strictEqual(data.message, 'success');
                })
                .catch(err => Promise.reject(err));
        });

        it('should check for system poller data', function () {
            const baseUri = '/services/search/jobs';
            const outputMode = 'output_mode=json';

            let uri = `${baseUri}?${outputMode}`;
            const options = {
                port: 8089,
                headers: {
                    Authorization: basicAuthHeader
                }
            };

            let sid;

            // system poller is on an interval, so space out the retries
            // TODO: determine mechanism to shorten the minimum interval for a
            // system poller cycle to reduce the test time here
            return new Promise(resolve => setTimeout(resolve, 5000))
                .then(() => util.makeRequest(cAddr, uri,
                    Object.assign(util.deepCopy(options), { method: 'POST', body: 'search=search source=f5.telemetry | head 1' })))
                .then((data) => {
                    sid = data.sid;
                    assert.notStrictEqual(sid, undefined);

                    // wait until job search is complete using dispatchState:'DONE'
                    return new Promise((resolve, reject) => {
                        const waitUntilDone = () => {
                            uri = `${baseUri}/${sid}?${outputMode}`;
                            return new Promise(resolveTimer => setTimeout(resolveTimer, 100))
                                .then(() => util.makeRequest(cAddr, uri, options))
                                .then((status) => {
                                    const dispatchState = status.entry[0].content.dispatchState;
                                    if (dispatchState === 'DONE') {
                                        resolve(status);
                                        return Promise.resolve(status);
                                    }
                                    return waitUntilDone();
                                })
                                .catch((e) => {
                                    reject(e);
                                });
                        };
                        waitUntilDone(); // start
                    });
                })
                .then(() => {
                    uri = `${baseUri}/${sid}/results/?${outputMode}`;
                    return util.makeRequest(cAddr, uri, options);
                })
                .then((data) => {
                    // check we have an event
                    const results = data.results;
                    assert.strictEqual(results.length > 0, true);

                    // check that the event is what we expect
                    // TODO: this should expand to use a shared lib to evalute event
                    // across all consumers, possibly using json schema validation
                    const result = JSON.parse(results[0]._raw);
                    assert.notStrictEqual(result.system.hostname, undefined);
                })
                .catch(err => Promise.reject(err));
        });

        xit('should send event to TS event listener', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        xit('should check for event listener data', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('should remove container', function () {
            const cmd = `docker container rm -f ${containerName}`;

            return util.performRemoteCmd(cAddr, cUsername, cmd, { password: cPassword })
                .catch(err => Promise.reject(err));
        });
    });
});
