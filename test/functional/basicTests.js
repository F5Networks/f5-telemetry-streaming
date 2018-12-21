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

// environment variables should exist when run (whether via pipeline or manually)
const host = process.env.VIO_HOST;
const user = process.env.VIO_HOST_USER;
const password = process.env.VIO_HOST_PWD;
// end environment variables

const baseILXUri = '/mgmt/shared/telemetry';

// purpose: basic functional test
describe('Basic', function () {
    // set long(er) lived timeouts for test suite
    this.timeout(1000 * 60 * 30); // 30 minutes
    this.slow(1000 * 60 * 5); // 5 minutes

    const basicExample = `${__dirname}/basic.json`;
    const basicConfig = fs.readFileSync(basicExample).toString();

    const distDir = `${__dirname}/../../dist`;
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
    // eslint-disable-next-line arrow-body-style
    before(() => {
        // get auth token
        return util.getAuthToken(host, user, password)
            .then((data) => {
                authToken = data.token;
            });
    });
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

    it('should install package', () => {
        const fullPath = `${distDir}/${packageFile}`;
        return util.installPackage(host, authToken, fullPath)
            .then(() => {})
            .catch(err => Promise.reject(err));
    });

    it('should verify installation', () => {
        const uri = `${baseILXUri}/info`;

        return util.makeRequest(host, uri, options)
            .then((data) => {
                data = data || {};
                assert.notStrictEqual(data.version, undefined);
            });
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
            });
    });

    it('should get systempoller info', () => {
        const uri = `${baseILXUri}/systempoller/My_Poller`;

        return util.makeRequest(host, uri, options)
            .then((data) => {
                data = data || {};
                assert.notStrictEqual(data.hostname, undefined);
            });
    });

    it('should ensure event listener is up', () => {
        const port = 6514;
        // to reach listener via mgmt IP requires allowing through host fw using below command (or similar)
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
