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

describe('Declarations -> Telemetry_Consumer -> Splunk', () => {
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
            type: 'Splunk',
            host: 'host',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        {
            type: 'Splunk',
            host: 'host',
            protocol: 'https',
            port: 8088,
            format: 'default',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            compressionType: 'gzip'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Splunk',
            host: 'host',
            protocol: 'http',
            port: 80,
            format: 'legacy',
            passphrase: {
                cipherText: 'cipherText'
            },
            proxy: {
                host: 'localhost',
                protocol: 'http',
                port: 80,
                allowSelfSignedCert: true,
                enableHostConnectivityCheck: false,
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                }
            },
            compressionType: 'gzip'
        },
        {
            type: 'Splunk',
            host: 'host',
            protocol: 'http',
            port: 80,
            format: 'legacy',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            proxy: {
                host: 'localhost',
                protocol: 'http',
                port: 80,
                allowSelfSignedCert: true,
                enableHostConnectivityCheck: false,
                username: 'username',
                passphrase: {
                    class: 'Secret',
                    protected: 'SecureVault',
                    cipherText: '$M$passphrase'
                }
            },
            compressionType: 'gzip'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Splunk',
            host: 'host',
            passphrase: {
                cipherText: 'cipherText'
            },
            compressionType: 'none'
        },
        {
            property: 'compressionType',
            enumTests: {
                allowed: ['none', 'gzip'],
                notAllowed: ['compressionType']
            }
        }
    );
});
