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
const util = require('../shared/util.js');

const baseILXUri = '/mgmt/shared/telemetry'; // eslint-disable-line
const consumerHost = util.getHosts('CONSUMER_HARNESS_FILE')[0]; // only expect one

// purpose: consumer tests
describe('Consumer', function () {
    // set timeouts/retries for test suite
    this.timeout(1000 * 60 * 5); // timeout for each test
    this.slow(1000 * 60 * 3); // increase limit before test is marked as "slow"
    this.retries(20);

    const host = consumerHost.ip;
    const username = consumerHost.username;
    const password = consumerHost.password;

    describe('Setup Host', function () {
        util.log(`Consumer Host: ${host}`);

        it('Set root password', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('Install docker', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });
    });

    describe('Consumer: Splunk', function () {
        const splunkUsername = 'admin';
        const splunkPassword = password; // should probably generate one instead
        const basicAuthHeader = `Basic ${Buffer.from(`${splunkUsername}:${splunkPassword}`).toString('base64')}`;

        it('Install container image', function () {
            // no need to check if image is already installed - if it is installed
            // docker will simply check for updates and exit normally

            return util.performRemoteCmd(host, username, 'docker pull splunk/splunk:latest', { password })
                .catch(err => Promise.reject(err));
        });

        it('Start container', function () {
            const cmd = `docker run -d -p 8000:8000 -p 8089:8089 -e 'SPLUNK_START_ARGS=--accept-license' \
                -e 'SPLUNK_PASSWORD=${splunkPassword}' splunk/splunk:latest`;

            // simple check to see if container already exists
            return util.performRemoteCmd(host, username, 'docker ps | grep splunk', { password })
                .then((data) => {
                    if (data) {
                        util.log('Container already exists, continue');
                        return Promise.resolve(); // contine
                    }
                    return util.performRemoteCmd(host, username, cmd, { password });
                })
                .catch(err => Promise.reject(err));
        });

        it('Check service is up', function () {
            const uri = '/services/server/control?output_mode=json';

            const options = {
                port: 8089,
                headers: {
                    Authorization: basicAuthHeader
                }
            };

            // splunk container takes about 30 seconds to come up
            return new Promise(resolve => setTimeout(resolve, 5000))
                .then(() => util.makeRequest(host, uri, options))
                .then((data) => {
                    assert.strictEqual(data.links.restart, '/services/server/control/restart');
                })
                .catch(err => Promise.reject(err));
        });

        it('Create HTTP data collector', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('Post TS configuration', function () {
            return new Promise((resolve) => {
                setTimeout(function () {
                    resolve();
                }, 500);
            });
        });

        it('Check for system poller data', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('Send event to TS event listener', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('Check for event listener data', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });

        it('Remove container', function () {
            return new Promise((resolve) => {
                resolve();
            });
        });
    });
});
