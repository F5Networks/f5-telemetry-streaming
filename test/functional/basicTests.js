/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

/* eslint-disable global-require */

const assert = require('assert');
const fs = require('fs');
const net = require('net');
const util = require('./util.js');

let hosts;

if (process.env.TEST_HARNESS_FILE !== undefined) {
    // eslint-disable-next-line
    hosts = require(process.env.TEST_HARNESS_FILE);
} else {
    // environment variables should exist when run (whether via pipeline or manually)
    // it could be 1+: x.x.x.x,x.x.x.y
    hosts = process.env.VIO_HOSTS.split(',').map(host => ({
        admin_ip: host,
        admin_username: process.env.VIO_HOST_USER,
        admin_password: process.env.VIO_HOST_PWD
    }));
    // end environment variables
}


const baseILXUri = '/mgmt/shared/telemetry';

// purpose: basic functional test
describe('Basic', function () {
    // set timeouts/retries for functional test suite
    this.timeout(1000 * 60 * 30); // 30 minutes
    this.slow(1000 * 60 * 5); // 5 minutes
    this.retries(5); // retry up to 5 times

    const basicExample = `${__dirname}/basic.json`;
    const basicConfig = fs.readFileSync(basicExample).toString();
    const pollerName = 'My_Poller';
    const consumerName = 'My_Consumer';

    // default to new build directory if it exists, otherwise use dist directory
    const existingBuildDir = `${__dirname}/../../dist`;
    const newBuildDir = `${existingBuildDir}/new_build`;
    const distDir = fs.existsSync(newBuildDir) ? newBuildDir : existingBuildDir;

    const distFiles = fs.readdirSync(distDir);
    const packageFiles = distFiles.filter(f => f.includes('.rpm') && !f.includes('.sha256'));

    // get latest rpm file (by timestamp since epoch)
    // note: this might not work if the artifact resets the timestamps
    const latest = { file: null, time: 0 };
    packageFiles.forEach((f) => {
        const fStats = fs.lstatSync(`${distDir}/${f}`);
        if (fStats.birthtimeMs >= latest.time) latest.file = f; latest.time = fStats.birthtimeMs;
    });
    const packageFile = latest.file;
    console.log(`Package File: ${packageFile}`); // eslint-disable-line no-console

    let authToken = null;
    let options = {};
    beforeEach(() => {
        options = {
            headers: {
                'x-f5-auth-token': authToken
            }
        };
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // run tests for each host
    hosts.forEach((hostObj) => {
        const host = hostObj.admin_ip;
        const user = hostObj.admin_username;
        const password = hostObj.admin_password;

        it(`--- Running tests against host: ${host} ---`, () => {}); // keeps in sync

        it('should get auth token', () => util.getAuthToken(host, user, password)
            .then((data) => {
                authToken = data.token;
            })
            .catch(err => Promise.reject(err)));

        it('should install package', () => {
            const fullPath = `${distDir}/${packageFile}`;
            return util.installPackage(host, authToken, fullPath)
                .then(() => {})
                .catch(err => Promise.reject(err));
        });

        it('should verify installation', () => {
            const uri = `${baseILXUri}/info`;
            return new Promise(resolve => setTimeout(resolve, 5000))
                .then(() => util.makeRequest(host, uri, options))
                .then((data) => {
                    data = data || {};
                    assert.notStrictEqual(data.version, undefined);
                })
                .catch(err => Promise.reject(err));
        });

        it('should accept configuration', () => {
            const uri = `${baseILXUri}/declare`;

            const postOptions = {
                method: 'POST',
                headers: options.headers,
                body: basicConfig
            };

            return util.makeRequest(host, uri, postOptions)
                .then((data) => {
                    data = data || {};
                    assert.strictEqual(data.message, 'success');
                    let encrypted;
                    try {
                        encrypted = data.declaration[consumerName].passphrase.cipherText;
                    } catch (e) {
                        throw e;
                    }
                    // check that the declaration returned contains encrypted text
                    // note: this only applies to TS running on BIG-IP (which is all we are testing for now)
                    assert.strictEqual(encrypted.startsWith('$M'), true);
                })
                .catch(err => Promise.reject(err));
        });

        it('should get systempoller info', () => {
            const uri = `${baseILXUri}/systempoller/${pollerName}`;

            return util.makeRequest(host, uri, options)
                .then((data) => {
                    data = data || {};
                    assert.notStrictEqual(data.system.hostname, undefined);
                })
                .catch(err => Promise.reject(err));
        });

        it('should ensure event listener is up', () => {
            const port = 6514;
            // to reach listener via mgmt IP might require allowing through host fw using below command (or similar)
            // tmsh modify security firewall management-ip-rules rules replace-all-with { telemetry
            // { place-before first ip-protocol tcp destination { ports replace-all-with { 6514 } } action accept } }

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

        it('should uninstall package', () => {
            // package name should be the file name without the .rpm at the end
            const installedPackage = `${packageFile.replace('.rpm', '')}`;

            return util.uninstallPackage(host, authToken, installedPackage)
                .then(() => {})
                .catch(err => Promise.reject(err));
        });
    });
});
