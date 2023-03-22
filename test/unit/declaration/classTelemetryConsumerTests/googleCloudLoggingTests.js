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

describe('Declarations -> Telemetry_Consumer -> Google_Cloud_Logging', () => {
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
            type: 'Google_Cloud_Logging',
            logScopeId: 'myProject',
            logId: 'allMyLogs',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail'
        },
        {
            type: 'Google_Cloud_Logging',
            logScope: 'projects',
            logScopeId: 'myProject',
            logId: 'allMyLogs',
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
            type: 'Google_Cloud_Logging',
            logScopeId: 'myProject',
            logId: 'allMyLogs',
            serviceEmail: 'serviceEmail',
            useServiceAccountToken: true
        },
        {
            type: 'Google_Cloud_Logging',
            logScope: 'projects',
            logScopeId: 'myProject',
            logId: 'allMyLogs',
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: false,
            useServiceAccountToken: true
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Google_Cloud_Logging',
            logScope: 'organizations',
            logScopeId: 'myOrganization',
            logId: 'allMyLogs',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: true
        },
        {
            type: 'Google_Cloud_Logging',
            logScope: 'organizations',
            logScopeId: 'myOrganization',
            logId: 'allMyLogs',
            privateKeyId: 'privateKeyId',
            privateKey: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: true,
            useServiceAccountToken: false
        }
    ));

    it('should restrict allowable characters for logId', () => assert.isRejected(shared.validateFull(
        {
            type: 'Google_Cloud_Logging',
            logScope: 'organizations',
            logScopeId: 'myOrganization',
            logId: 'allM yLogs',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: true
        }
    ), /#\/definitions\/logId\/pattern.*should match pattern.*\^\[a-zA-z0-9._-\]\+\$/));

    it('should not allow privateKeyId when useServiceAccountToken is true', () => assert.isRejected(shared.validateFull(
        {
            type: 'Google_Cloud_Logging',
            logScope: 'organizations',
            logScopeId: 'myOrganization',
            logId: 'allM yLogs',
            privateKeyId: 'privateKeyId',
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: true,
            useServiceAccountToken: true
        }
    ), /useServiceAccountToken\/const.*"allowedValue":false/));

    it('should not allow privateKey when useServiceAccountToken is true', () => assert.isRejected(shared.validateFull(
        {
            type: 'Google_Cloud_Logging',
            logScope: 'organizations',
            logScopeId: 'myOrganization',
            logId: 'allM yLogs',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail',
            reportInstanceMetadata: true,
            useServiceAccountToken: true
        }
    ), /useServiceAccountToken\/const.*"allowedValue":false/));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Google_Cloud_Logging',
            logScope: 'organizations',
            logScopeId: 'myOrganization',
            logId: 'allMyLogs',
            privateKeyId: 'privateKeyId',
            privateKey: {
                cipherText: 'privateKey'
            },
            serviceEmail: 'serviceEmail'
        },
        [
            {
                property: 'logScope',
                enumTests: {
                    allowed: ['projects', 'organizations', 'billingAccounts', 'folders'],
                    notAllowed: ['', 'what?', 'newlyInvented']
                },
                ignoreOther: true
            },
            'logScopeId',
            'logId',
            'privateKeyId',
            'serviceEmail'
        ],
        { stringLengthTests: true }
    );
});
