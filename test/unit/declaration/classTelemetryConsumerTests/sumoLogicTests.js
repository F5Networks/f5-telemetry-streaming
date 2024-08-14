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
const moduleCache = require('../../shared/restoreCache')();

const sinon = require('sinon');

const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Sumo_Logic', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    it('should pass minimal declaration', () => shared.validateMinimal(
        {
            type: 'Sumo_Logic',
            host: 'host',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        {
            type: 'Sumo_Logic',
            host: 'host',
            protocol: 'https',
            port: 443,
            path: '/receiver/v1/http/',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            }
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Sumo_Logic',
            host: 'host',
            protocol: 'http',
            port: 80,
            path: 'path',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        {
            type: 'Sumo_Logic',
            host: 'host',
            protocol: 'http',
            port: 80,
            path: 'path',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            }
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Sumo_Logic',
            host: 'host',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        'path',
        { stringLengthTests: true }
    );
});
