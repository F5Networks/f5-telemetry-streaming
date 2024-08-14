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

describe('Declarations -> Telemetry_Consumer -> AWS_S3', () => {
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

    it('should pass minimal declaration (IAM enabled, no creds required)', () => shared.validateMinimal(
        {
            type: 'AWS_S3',
            region: 'region',
            bucket: 'bucket'
        },
        {
            type: 'AWS_S3',
            region: 'region',
            bucket: 'bucket'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'AWS_S3',
            region: 'region',
            bucket: 'bucket',
            username: 'username',
            passphrase: {
                cipherText: 'cipherText'
            },
            endpointUrl: 'userDefinedUrl'
        },
        {
            type: 'AWS_S3',
            region: 'region',
            bucket: 'bucket',
            username: 'username',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            endpointUrl: 'userDefinedUrl'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'AWS_S3',
            region: 'region',
            bucket: 'bucket',
            username: 'username',
            passphrase: {
                cipherText: 'cipherText'
            },
            endpointUrl: 'userDefinedUrl'
        },
        [
            'bucket',
            { property: 'passphrase', dependenciesTests: 'username', ignoreOther: true },
            'region',
            { property: 'username', dependenciesTests: 'passphrase' },
            'endpointUrl'
        ],
        { stringLengthTests: true }
    );
});
