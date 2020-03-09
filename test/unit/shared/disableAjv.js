/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Disable Ajv to speed up test process on node 4/6
 */
const Ajv = require('ajv');

/**
 * Restore initial Ajv state
 *
 * @returns {Function} that restores initial Ajv state
 */
module.exports = (function () {
    const funcNames = [
        'addKeyword',
        'addSchema',
        'compile'
    ];
    const originFuncs = {};
    funcNames.forEach((funcName) => {
        originFuncs[funcName] = Ajv.prototype[funcName];
        Ajv.prototype[funcName] = function () {};
    });
    return function restore() {
        funcNames.forEach((funcName) => {
            Ajv.prototype[funcName] = originFuncs[funcName];
        });
    };
}());
