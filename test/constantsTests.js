/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');

const constants = require('../src/nodejs/constants.js');

/* eslint-disable global-require */

describe('Constants', () => {
    // just to avoid mistakes
    it('global STRICT_TLS_REQUIRED should be true', () => {
        assert.strictEqual(constants.STRICT_TLS_REQUIRED, true);
    });
});
