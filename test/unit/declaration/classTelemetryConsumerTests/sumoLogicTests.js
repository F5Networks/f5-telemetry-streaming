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

describe('Declarations -> Telemetry_Consumer -> Sumo_Logic', () => {
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
