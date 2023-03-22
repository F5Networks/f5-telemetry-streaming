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

describe('Declarations -> Telemetry_Consumer -> ElasticSearch', () => {
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
            type: 'ElasticSearch',
            host: 'host',
            index: 'index'
        },
        {
            type: 'ElasticSearch',
            host: 'host',
            index: 'index',
            dataType: 'f5.telemetry',
            port: 9200,
            protocol: 'https',
            apiVersion: '6.0'
        }
    ));

    const generateApiVersionTests = () => {
        const createTestCase = (apiVersion, additionalProps) => ({
            apiVersion,
            expectedProps: Object.assign({
                type: 'ElasticSearch',
                host: 'host',
                index: 'index',
                port: 9200,
                protocol: 'https',
                apiVersion
            }, additionalProps)
        });

        return [
            {
                apiVersion: '6',
                additionalProps: { dataType: 'f5.telemetry' }
            },
            {
                apiVersion: '6.7.2',
                additionalProps: { dataType: 'f5.telemetry' }
            },
            {
                apiVersion: '7',
                additionalProps: { dataType: '_doc' }
            },
            {
                apiVersion: '7.11',
                additionalProps: { dataType: '_doc' }
            },
            {
                apiVersion: '8.1'
            },
            {
                apiVersion: 'blah'
            }
        ].map((apiVerionTest) => createTestCase(apiVerionTest.apiVersion, apiVerionTest.additionalProps));
    };

    generateApiVersionTests().forEach((apiVersionTest) => {
        it(`should pass declaration (apiVersion = ${apiVersionTest.apiVersion})`, () => shared.validateMinimal(
            {
                type: 'ElasticSearch',
                host: 'host',
                index: 'index',
                apiVersion: apiVersionTest.apiVersion
            },
            apiVersionTest.expectedProps
        ));
    });

    it('should not allow dataType when apiVersion = 8.1', () => assert.isRejected(
        shared.validateMinimal({
            type: 'ElasticSearch',
            host: 'host',
            index: 'index',
            apiVersion: '8.1',
            dataType: 'custom'
        }),
        /keyword.*not.*dataPath.*should NOT be valid/
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'ElasticSearch',
            host: 'host',
            protocol: 'http',
            port: 8080,
            path: 'path',
            index: 'index',
            username: 'username',
            passphrase: {
                cipherText: 'cipherText'
            },
            apiVersion: '1.0',
            dataType: 'dataType'
        },
        {
            type: 'ElasticSearch',
            host: 'host',
            protocol: 'http',
            port: 8080,
            path: 'path',
            index: 'index',
            username: 'username',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            apiVersion: '1.0',
            dataType: 'dataType'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'ElasticSearch',
            host: 'host',
            index: 'index'
        },
        [
            'apiVersion',
            'dataType',
            'index',
            'path',
            'username'
        ],
        { stringLengthTests: true }
    );
});
