/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Load module from project's root directory.
 * Main intention is to:
 * - reduce number of explicit usage of imports with relative path
 * - reduce number of eslint warning regarding dynamic or global imports
 *
 * @param {string} modulePath - relative path, e.g. src/lib/config
 *
 * @returns {Object} loaded module
 */
module.exports = function (modulePath) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(require.resolve(`${__dirname}/../../../${modulePath}`));
};
