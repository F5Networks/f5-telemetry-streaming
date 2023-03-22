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

describe('Declarations -> Telemetry_Consumer -> AWS_S3', () => {
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
