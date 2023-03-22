/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../../shared/assert');
const common = require('../common');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Pull_Consumer -> Default', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should pass minimal declaration', () => shared.validateMinimal({}, {}));

    it('should allow full declaration', () => shared.validateFull({}, {}));

    it('should not allow additional properties', () => assert.isRejected(
        shared.validateMinimal({ someKey: 'someValue' }),
        /My_Pull_Consumer.*someKey.*should NOT have additional properties/
    ));
});
