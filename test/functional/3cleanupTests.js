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

const util = require('./shared/util.js');

const hosts = util.getHosts('BIGIP');

// purpose: cleanup tests
describe('Cleanup', function () {
    // get package details
    const packageDetails = util.getPackageDetails();
    const packageFile = packageDetails.name;

    let authToken = null;
    after(function () {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // account for 1+ hosts
    hosts.forEach(function (item) {
        const host = item.ip;
        const user = item.username;
        const password = item.password;

        it('should get auth token', function () {
            return util.getAuthToken(host, user, password)
                .then((data) => {
                    authToken = data.token;
                })
                .catch(err => Promise.reject(err));
        });

        it('should uninstall package', function () {
            // package name should be the file name without the .rpm at the end
            const installedPackage = `${packageFile.replace('.rpm', '')}`;

            return util.uninstallPackage(host, authToken, installedPackage)
                .then(() => {})
                .catch(err => Promise.reject(err));
        });
    });
});
