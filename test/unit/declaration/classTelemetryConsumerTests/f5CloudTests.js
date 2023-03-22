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

const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> F5_Cloud', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules()
            .utilMisc
            .getRuntimeInfo.value(() => ({ nodeVersion: '8.12.0' }));
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should pass minimal declaration', () => shared.validateMinimal(
        {
            class: 'Telemetry_Consumer',
            type: 'F5_Cloud',
            f5csTenantId: 'a-blabla-a',
            f5csSensorId: '12345',
            payloadSchemaNid: 'f5',
            serviceAccount: {
                authType: 'google-auth',
                type: 'not_used',
                projectId: 'deos-dev',
                privateKeyId: '11111111111111111111111',
                privateKey: {
                    cipherText: 'privateKeyValue'
                },
                clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                clientId: '1212121212121212121212',
                authUri: 'https://accounts.google.com/o/oauth2/auth',
                tokenUri: 'https://oauth2.googleapis.com/token',
                authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
            },
            targetAudience: 'deos-ingest'
        },
        {
            allowSelfSignedCert: false,
            class: 'Telemetry_Consumer',
            enable: true,
            f5csTenantId: 'a-blabla-a',
            f5csSensorId: '12345',
            payloadSchemaNid: 'f5',
            port: 443,
            useSSL: true,
            serviceAccount: {
                authType: 'google-auth',
                authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                authUri: 'https://accounts.google.com/o/oauth2/auth',
                clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                clientId: '1212121212121212121212',
                clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com',
                privateKey: {
                    cipherText: '$M$privateKeyValue',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKeyId: '11111111111111111111111',
                projectId: 'deos-dev',
                tokenUri: 'https://oauth2.googleapis.com/token',
                type: 'not_used'
            },
            targetAudience: 'deos-ingest',
            trace: false,
            type: 'F5_Cloud'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            class: 'Telemetry_Consumer',
            type: 'F5_Cloud',
            f5csTenantId: 'a-blabla-a',
            f5csSensorId: '12345',
            payloadSchemaNid: 'f5',
            port: 500,
            useSSL: false,
            enable: true,
            allowSelfSignedCert: true,
            serviceAccount: {
                type: 'not_used',
                projectId: 'deos-dev',
                privateKeyId: '11111111111111111111111',
                privateKey: {
                    cipherText: 'privateKeyValue'
                },
                clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                clientId: '1212121212121212121212',
                authUri: 'https://accounts.google.com/o/oauth2/auth',
                tokenUri: 'https://oauth2.googleapis.com/token',
                authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
            },
            targetAudience: 'deos-ingest',
            trace: true
        },
        {
            allowSelfSignedCert: true,
            class: 'Telemetry_Consumer',
            enable: true,
            f5csTenantId: 'a-blabla-a',
            f5csSensorId: '12345',
            payloadSchemaNid: 'f5',
            port: 500,
            useSSL: false,
            serviceAccount: {
                authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                authUri: 'https://accounts.google.com/o/oauth2/auth',
                clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                clientId: '1212121212121212121212',
                clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com',
                privateKey: {
                    cipherText: '$M$privateKeyValue',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKeyId: '11111111111111111111111',
                projectId: 'deos-dev',
                tokenUri: 'https://oauth2.googleapis.com/token',
                type: 'not_used'
            },
            targetAudience: 'deos-ingest',
            trace: true,
            type: 'F5_Cloud'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'F5_Cloud',
            f5csTenantId: 'a-blabla-a',
            f5csSensorId: '12345',
            payloadSchemaNid: 'f5',
            serviceAccount: {
                authType: 'google-auth',
                type: 'not_used',
                projectId: 'deos-dev',
                privateKeyId: '11111111111111111111111',
                privateKey: {
                    cipherText: 'privateKeyValue'
                },
                clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
                clientId: '1212121212121212121212',
                authUri: 'https://accounts.google.com/o/oauth2/auth',
                tokenUri: 'https://oauth2.googleapis.com/token',
                authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
                clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
            },
            targetAudience: 'deos-ingest'
        },
        [
            { property: 'f5csSensorId', requiredTests: true },
            { property: 'f5csTenantId', requiredTests: true },
            { property: 'payloadSchemaNid', requiredTests: true },
            'serviceAccount.authProviderX509CertUrl',
            {
                property: 'serviceAccount.authType',
                enumTests: {
                    allowed: 'google-auth',
                    notAllowed: 'other-auth'
                },
                ignoreOther: true
            },
            'serviceAccount.authUri',
            'serviceAccount.clientEmail',
            'serviceAccount.clientId',
            'serviceAccount.clientX509CertUrl',
            { property: 'serviceAccount.privateKeyId', requiredTests: true },
            'serviceAccount.projectId',
            'serviceAccount.tokenUri',
            'serviceAccount.type',
            { property: 'targetAudience', requiredTests: true }
        ],
        { stringLengthTests: true }
    );
});
