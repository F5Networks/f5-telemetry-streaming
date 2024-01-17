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

const assert = require('../../shared/assert');
const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Google_Cloud_Monitoring', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should pass minimal declaration', () => shared.validateMinimal(
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail'
        },
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: false,
            useServiceAccountToken: false
        }
    ));

    it('should pass minimal declaration (useServiceAccountToken = true)', () => shared.validateMinimal(
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            serviceEmail: 'serviceEmail',
            useServiceAccountToken: true
        },
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: false,
            useServiceAccountToken: true
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail'
        },
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: false,
            useServiceAccountToken: false
        }
    ));

    it('should allow backward compatibility with StackDriver reference', () => shared.validateMinimal(
        {
            type: 'Google_StackDriver',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail'
        },
        {
            type: 'Google_StackDriver',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: false,
            useServiceAccountToken: false
        }
    ));

    it('should not allow privateKeyId when useServiceAccountToken is true', () => assert.isRejected(shared.validateFull(
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            serviceEmail: 'serviceEmail',
            useServiceAccountToken: true
        }
    ), /useServiceAccountToken\/const.*"allowedValue":false/));

    it('should not allow privateKey when useServiceAccountToken is true', () => assert.isRejected(shared.validateFull(
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail',
            useServiceAccountToken: true
        }
    ), /useServiceAccountToken\/const.*"allowedValue":false/));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Google_Cloud_Monitoring',
            projectId: 'projectId',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail'
        },
        [
            'projectId',
            'privateKeyId',
            'serviceEmail'
        ],
        { stringLengthTests: true }
    );
});
