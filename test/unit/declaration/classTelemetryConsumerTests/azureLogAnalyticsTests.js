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

describe('Declarations -> Telemetry_Consumer -> Azure_Log_Analytics', () => {
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
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        {
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            format: 'default',
            useManagedIdentity: false,
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            }
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            format: 'propertyBased',
            useManagedIdentity: false,
            passphrase: {
                cipherText: 'cipherText'
            },
            region: 'australiacentral',
            managementEndpointUrl: 'some_url',
            odsOpinsightsEndpointUrl: 'another_url'
        },
        {
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            format: 'propertyBased',
            useManagedIdentity: false,
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            region: 'australiacentral',
            managementEndpointUrl: 'some_url',
            odsOpinsightsEndpointUrl: 'another_url'
        }
    ));

    it('should not allow passphrase when useManagedIdentity is true', () => assert.isRejected(
        shared.validateFull({
            type: 'Azure_Log_Analytics',
            workspaceId: 'someId',
            useManagedIdentity: true,
            passphrase: {
                cipherText: 'mumblemumblemumble'
            }
        }),
        /useManagedIdentity\/const.*"allowedValue":false/
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        [
            { property: 'passphrase', requiredTests: true, ignoreOther: true },
            'region',
            'workspaceId',
            {
                property: 'format',
                ignoreOther: true,
                enumTests: {
                    allowed: ['default', 'propertyBased'],
                    notAllowed: ['format']
                }
            }
        ],
        { stringLengthTests: true }
    );

    describe('useManagedIdentity === false', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Azure_Log_Analytics',
                workspaceId: 'workspaceId',
                useManagedIdentity: false,
                passphrase: {
                    cipherText: 'cipherText'
                }
            },
            'passphrase',
            { requiredTests: true }
        );
    });
});
