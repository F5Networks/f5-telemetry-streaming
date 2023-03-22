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

describe('Declarations -> Telemetry_Consumer -> Azure_Application_Insights', () => {
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
            type: 'Azure_Application_Insights',
            instrumentationKey: 'some-key-here'
        },
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: 'some-key-here',
            maxBatchIntervalMs: 5000,
            maxBatchSize: 250,
            useManagedIdentity: false
        }
    ));

    it('should pass minimal declaration - multiple instr Keys', () => shared.validateMinimal(
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: [
                'key-1-guid',
                'key-2-guid'
            ]
        },
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: [
                'key-1-guid',
                'key-2-guid'
            ],
            maxBatchIntervalMs: 5000,
            maxBatchSize: 250,
            useManagedIdentity: false
        }
    ));

    it('should pass with constants pointers', () => shared.validateFull(
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: '`=/Shared/constants/instrKey`',
            customOpts: [
                {
                    name: '`=/Shared/constants/customOptsName`',
                    value: '`=/Shared/constants/customOptsVal`'
                }
            ]
        },
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: 'key-from-pointer',
            useManagedIdentity: false,
            maxBatchIntervalMs: 5000,
            maxBatchSize: 250,
            customOpts: [
                {
                    name: 'nameFromPointer',
                    value: 'valFromPointer'
                }
            ]
        },
        {
            constants: {
                instrKey: 'key-from-pointer',
                customOptsName: 'nameFromPointer',
                customOptsVal: 'valFromPointer'
            }
        }
    ));

    it('should allow full declaration - managedIdentity disabled', () => shared.validateFull(
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: '-jumbledChars++==',
            useManagedIdentity: false,
            maxBatchSize: 20,
            maxBatchIntervalMs: 3000,
            region: 'norwaywest',
            managementEndpointUrl: 'some_url',
            customOpts: [
                {
                    name: 'clientLibNum',
                    value: 10.29
                },
                {
                    name: 'clientLibInt',
                    value: 222
                },
                {
                    name: 'clientLibSecret',
                    value: {
                        cipherText: 'cipherText'
                    }
                },
                {
                    name: 'clientLibString',
                    value: 'going to be passed through the client lib as is'
                },
                {
                    name: 'clientLibBool',
                    value: true
                }
            ]
        },
        {
            type: 'Azure_Application_Insights',
            instrumentationKey: '-jumbledChars++==',
            useManagedIdentity: false,
            maxBatchSize: 20,
            maxBatchIntervalMs: 3000,
            region: 'norwaywest',
            managementEndpointUrl: 'some_url',
            customOpts: [
                {
                    name: 'clientLibNum',
                    value: 10.29
                },
                {
                    name: 'clientLibInt',
                    value: 222
                },
                {
                    name: 'clientLibSecret',
                    value: {
                        class: 'Secret',
                        protected: 'SecureVault',
                        cipherText: '$M$cipherText'
                    }
                },
                {
                    name: 'clientLibString',
                    value: 'going to be passed through the client lib as is'
                },
                {
                    name: 'clientLibBool',
                    value: true
                }
            ]
        }
    ));

    it('should allow full declaration - managedIdentity enabled', () => shared.validateFull(
        {
            type: 'Azure_Application_Insights',
            appInsightsResourceName: 'test.*',
            useManagedIdentity: true,
            maxBatchSize: 20,
            maxBatchIntervalMs: 3000,
            managementEndpointUrl: 'some_url',
            customOpts: [
                {
                    name: 'clientLibNum',
                    value: 221100
                }
            ]
        },
        {
            type: 'Azure_Application_Insights',
            appInsightsResourceName: 'test.*',
            useManagedIdentity: true,
            maxBatchSize: 20,
            maxBatchIntervalMs: 3000,
            managementEndpointUrl: 'some_url',
            customOpts: [
                {
                    name: 'clientLibNum',
                    value: 221100
                }
            ]
        }
    ));

    it('should not allow instrumentationKey when useManagedIdentity is true', () => assert.isRejected(
        shared.validateMinimal({
            type: 'Azure_Application_Insights',
            instrumentationKey: 'somewhere-void',
            useManagedIdentity: true
        }),
        /dependencies\/instrumentationKey.*useManagedIdentity\/const.*allowedValue":false/
    ));

    it('should not require instrumentationKey when useManagedIdentity is false', () => shared.validateMinimal(
        {
            type: 'Azure_Application_Insights',
            useManagedIdentity: true
        },
        {
            type: 'Azure_Application_Insights',
            useManagedIdentity: true,
            maxBatchIntervalMs: 5000,
            maxBatchSize: 250
        }
    ));

    it('should allow appInsightsResourceName when useManagedIdentity is true', () => shared.validateMinimal(
        {
            type: 'Azure_Application_Insights',
            useManagedIdentity: true,
            appInsightsResourceName: 'app.*pattern',
            maxBatchSize: 10
        },
        {
            type: 'Azure_Application_Insights',
            useManagedIdentity: true,
            maxBatchIntervalMs: 5000,
            maxBatchSize: 10,
            appInsightsResourceName: 'app.*pattern'
        }
    ));

    it('should not allow appInsightsResourceName when instrumentationKey is present', () => assert.isRejected(
        shared.validateMinimal({
            type: 'Azure_Application_Insights',
            instrumentationKey: 'test-app1-instr-key',
            appInsightsResourceName: 'test-app-1'
        }),
        /dependencies\/instrumentationKey\/allOf\/1\/not/
    ));

    describe('common basic tests', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                customOpts: [
                    {
                        name: 'name',
                        value: 'value'
                    }
                ],
                instrumentationKey: 'some-key-here',
                maxBatchIntervalMs: 2000,
                maxBatchSize: 2,
                type: 'Azure_Application_Insights'
            },
            [
                'customOpts.0.name',
                'customOpts.0.value',
                {
                    property: 'customOpts',
                    ignoreOther: true,
                    arrayLengthTests: {
                        minItems: 1
                    }
                },
                { property: 'instrumentationKey', requiredTests: true },
                {
                    property: 'maxBatchIntervalMs',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 1000
                    }
                },
                {
                    property: 'maxBatchSize',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 1
                    }
                },
                'region'
            ],
            { stringLengthTests: true }
        );
    });

    describe('instrumentationKey === array', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                instrumentationKey: ['some-key-here'],
                type: 'Azure_Application_Insights'
            },
            [
                'instrumentationKey.0',
                {
                    property: 'instrumentationKey',
                    ignoreOther: true,
                    arrayLengthTests: {
                        minItems: 1
                    }
                }
            ],
            { stringLengthTests: true }
        );
    });

    describe('useManagedIdentity === true', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Azure_Application_Insights',
                useManagedIdentity: true
            },
            'appInsightsResourceName',
            { stringLengthTests: true }
        );
    });
});
