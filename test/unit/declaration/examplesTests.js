/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.utilMisc.fs.promise.mkdir('/example_download_folder');

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

        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
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
