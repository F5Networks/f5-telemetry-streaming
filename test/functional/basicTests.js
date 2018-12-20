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
const util = require('./util.js');

// environment variables should exist when run (whether via pipeline or manually)
const host = process.env.VIO_HOST;
const user = process.env.VIO_HOST_USER;
const password = process.env.VIO_HOST_PWD;

const baseILXUri = '/mgmt/shared/telemetry';

// purpose: basic functional test
describe('Basic', function () {
    // set long-lived timeouts for test suite
    this.timeout(1000 * 60 * 30); // 30 minutes
    this.slow(1000 * 60 * 5); // 5 minutes

    let packageFile;
    let authToken = null;
    let options = {};
    // prior to running any tests need to setup environment
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
        const distDir = `${__dirname}/../../dist`;
        const distFiles = fs.readdirSync(distDir);
        packageFile = distFiles.filter(f => f.includes('.rpm') && !f.includes('.sha256'))[0];

        return util.installPackage(host, authToken, `${distDir}/${packageFile}`)
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
        const baseExample = `${__dirname}/../../examples/declarations/basic.json`;
        const config = fs.readFileSync(baseExample).toString();

        const postOptions = {
            method: 'POST',
            headers: options.headers,
            body: config
        };

        return util.makeRequest(host, uri, postOptions)
            .then((data) => {
                data = data || {};
                assert.strictEqual(data.message, 'success');
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
