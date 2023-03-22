/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const fs = require('fs');
const sinon = require('sinon');

const common = require('./common');
const declValidator = require('./common').validate;
const testUtil = require('../shared/util');

moduleCache.remember();

describe('Declarations -> Examples', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = common.stubCoreModules();

        // fs access modification to skip folder check
        const originFsAccess = fs.access;
        sinon.stub(fs, 'access').callsFake(function () {
            const path = arguments[0];
            const callback = arguments[arguments.length - 1];
            if (path === 'example_download_folder') {
                callback();
            } else {
                originFsAccess.apply(null, arguments);
            }
        });
        coreStub.utilMisc.getRuntimeInfo.nodeVersion = '8.12.0';
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Validate Example Declarations from examples/declarations', () => {
        testUtil.fs.listFiles('./examples/declarations')
            .filter((fpath) => fpath.endsWith('.json'))
            .forEach((fpath) => {
                it(`should validate example: ${fpath}`, () => {
                    const data = JSON.parse(fs.readFileSync(fpath));
                    return declValidator(data);
                });
            });
    });

    describe('Validate Example Declarations from test/functional/shared/data/declarations', () => {
        testUtil.fs.listFiles('./test/functional/shared/data/declarations')
            .filter((fpath) => fpath.endsWith('.json'))
            .forEach((fpath) => {
                it(`should validate example: ${fpath}`, () => {
                    const data = JSON.parse(fs.readFileSync(fpath));
                    return declValidator(data);
                });
            });
    });
});
