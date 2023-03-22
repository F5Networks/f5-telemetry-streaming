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
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Azure_Log_Analytics', () => {
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
