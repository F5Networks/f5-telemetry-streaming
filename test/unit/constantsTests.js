/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const constants = require('../../src/lib/constants');
const packageInfo = require('../../package.json');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Constants', () => {
    // just to avoid mistakes
    it('global STRICT_TLS_REQUIRED should be true', () => {
        assert.strictEqual(constants.STRICT_TLS_REQUIRED, true);
    });

    it('should get version info from package.json', () => {
        const versionInfo = packageInfo.version.split('-');
        if (versionInfo.length === 1) {
            versionInfo.push('1');
        }
        // to be sure that we really have some data
        assert.notStrictEqual(versionInfo[0].length, 0);
        assert.notStrictEqual(versionInfo[1].length, 0);
        assert.strictEqual(constants.VERSION, versionInfo[0]);
        assert.strictEqual(constants.RELEASE, versionInfo[1]);
    });
});
