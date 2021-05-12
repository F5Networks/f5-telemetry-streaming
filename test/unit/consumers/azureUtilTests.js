/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();


const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const azureUtil = require('./../../../src/lib/consumers/shared/azureUtil');
const azureUtilTestsData = require('./data/azureUtilTestsData');
const requestsUtil = require('./../../../src/lib/utils/requests');
const testUtil = require('./../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Azure Util Tests', () => {
    describe('Managed Identities', () => {
        before(() => {
            sinon.stub(requestsUtil, 'makeRequest').callsFake((reqOpts) => {
                // metadata
                if (reqOpts.fullURI.includes('metadata/instance')) {
                    return Promise.resolve({
                        compute: {
                            location: 'westus2',
                            name: 'thevm01'
                        }
                    });
                }
                // metadata token
                if (reqOpts.fullURI.includes('metadata/identity/oauth2')) {
                    return Promise.resolve({
                        access_token: 'some-long-string-i-will-not-remember',
                        client_id: 'some-guid'
                    });
                }
                // subscriptions
                if (reqOpts.fullURI === 'https://management.azure.com/subscriptions?api-version=2019-11-01') {
                    return Promise.resolve({
                        value: [
                            {
                                id: '/subscriptions/sub-guid-1',
                                authorizationSource: 'RoleBased',
                                subscriptionId: 'sub-guid-1',
                                tenantId: 'tenant-guid-1',
                                displayName: 'subscription'
                            },
                            {
                                id: '/subscriptions/sub-guid-2',
                                authorizationSource: 'RoleBased',
                                subscriptionId: 'sub-guid-2',
                                tenantId: 'tenant-guid-2',
                                displayName: 'subscription'
                            }
                        ],
                        count: {
                            type: 'Total',
                            value: 2
                        }
                    });
                }
                // list workspaces
                if (reqOpts.fullURI.includes('workspaces?api')) {
                    const sub1Workspaces = {
                        value: [
                            {
                                properties: { customerId: 'sub1-workspace-guid-1' },
                                id: '/subscriptions/sub-guid-1/resourcegroups/test-rg-1/providers/microsoft.operationalinsights/workspaces/test-workspace-1',
                                name: 'test-workspace1',
                                type: 'Microsoft.OperationalInsights/workspaces',
                                location: 'westus2'
                            },
                            {
                                properties: { customerId: 'sub1-workspace-guid-2' },
                                id: '/subscriptions/sub-guid-1/resourcegroups/test-rg-1/providers/microsoft.operationalinsights/workspaces/test-workspace-2',
                                name: 'test-workspace2',
                                type: 'Microsoft.OperationalInsights/workspaces',
                                location: 'westus2'
                            }
                        ]
                    };
                    const sub2Workpaces = {
                        value: [
                            {
                                properties: { customerId: 'sub2-workspace-guid-1' },
                                id: '/subscriptions/sub-guid-2/resourcegroups/test-rg-1/providers/microsoft.operationalinsights/workspaces/test-workspace-1',
                                name: 'test-workspace1',
                                type: 'Microsoft.OperationalInsights/workspaces',
                                location: 'westus2'
                            },
                            {
                                properties: { customerId: 'sub2-workspace-guid-2' },
                                id: '/subscriptions/sub-guid-1/resourcegroups/test-rg-1/providers/microsoft.operationalinsights/workspaces/test-workspace-2',
                                name: 'test-workspace2',
                                type: 'Microsoft.OperationalInsights/workspaces',
                                location: 'westus2'
                            }
                        ]
                    };
                    return Promise.resolve(reqOpts.fullURI.includes('sub-guid-1') ? sub1Workspaces : sub2Workpaces);
                }
                // sharedKeys
                if (reqOpts.fullURI.includes('/subscriptions/sub-guid-1/resourcegroups/test-rg-1/providers/microsoft.operationalinsights/workspaces/test-workspace-2')) {
                    return Promise.resolve({
                        primarySharedKey: 'the-hidden-key'
                    });
                }
                // list app insight components
                if (reqOpts.fullURI.includes('providers/Microsoft.Insights/components')) {
                    const sub1AppInsights = {
                        value: [
                            {
                                properties: { InstrumentationKey: 'sub1-appins1-key1', ConnectionString: 'InstrumentationKey=sub1-appins1-key1' },
                                name: 'sub1AppIns1'
                            },
                            {
                                properties: { InstrumentationKey: 'sub1-appins2-key2', ConnectionString: 'InstrumentationKey=sub1-appins2-key2' },
                                name: 'sub1AppIns2'
                            }
                        ]
                    };
                    const sub2AppInsights = {
                        value: [
                            {
                                properties: { InstrumentationKey: 'sub2-appins1-key1', ConnectionString: 'InstrumentationKey=sub2-appins1-key1;EndpointSuffix=applicationinsights.us' },
                                name: 'sub2AppIns1'
                            },
                            {
                                properties: { InstrumentationKey: 'sub2-appins2-key2', ConnectionString: 'InstrumentationKey=sub2-appins2-key2;EndpointSuffix=applicationinsights.us' },
                                name: 'sub2AppIns2'
                            }
                        ]
                    };
                    return Promise.resolve(reqOpts.fullURI.includes('sub-guid-1') ? sub1AppInsights : sub2AppInsights);
                }
                return Promise.resolve({});
            });
        });

        after(() => {
            sinon.restore();
        });

        describe('getSharedKey', () => {
            it('should generate correct sharedKey when there are multiple subscriptions', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: {
                        workspaceId: 'sub1-workspace-guid-2',
                        useManagedIdentity: true
                    }
                });
                return azureUtil.getSharedKey(context)
                    .then(key => assert.strictEqual(key, 'the-hidden-key'));
            });
        });

        describe('getInstrumentationKeys', () => {
            describe('useManagedIdentity is false', () => {
                it('should return array with single key if there is a single key provided', () => {
                    const context = testUtil.buildConsumerContext({
                        eventType: 'systemInfo',
                        config: {
                            useManagedIdentity: false,
                            instrumentationKey: 'test-single-key',
                            region: 'usgovvirginia'
                        }
                    });
                    return azureUtil.getInstrumentationKeys(context)
                        .then((keys) => {
                            const expectedData = [
                                { instrKey: 'test-single-key', connString: 'InstrumentationKey=test-single-key;EndpointSuffix=applicationinsights.us' }
                            ];
                            return assert.deepStrictEqual(keys, expectedData);
                        });
                });

                it('should return array of keys if there are multiple keys provided', () => {
                    const context = testUtil.buildConsumerContext({
                        eventType: 'systemInfo',
                        config: {
                            useManagedIdentity: false,
                            instrumentationKey: [
                                'test-multi-key1',
                                'test-multi-key2'
                            ]
                        }
                    });
                    return azureUtil.getInstrumentationKeys(context)
                        .then((keys) => {
                            const expectedData = [
                                { instrKey: 'test-multi-key1', connString: undefined },
                                { instrKey: 'test-multi-key2', connString: undefined }
                            ];
                            return assert.deepStrictEqual(keys, expectedData);
                        });
                });
            });

            describe('useManagedIdentity is true', () => {
                it('should return correct instrumentationKeys when there are multiple subscriptions and resources', () => {
                    const context = testUtil.buildConsumerContext({
                        eventType: 'systemInfo',
                        config: {
                            useManagedIdentity: true
                        }
                    });
                    return azureUtil.getInstrumentationKeys(context)
                        .then((keys) => {
                            const expectedData = [
                                { instrKey: 'sub1-appins1-key1', name: 'sub1AppIns1', connString: 'InstrumentationKey=sub1-appins1-key1' },
                                { instrKey: 'sub1-appins2-key2', name: 'sub1AppIns2', connString: 'InstrumentationKey=sub1-appins2-key2' },
                                { instrKey: 'sub2-appins1-key1', name: 'sub2AppIns1', connString: 'InstrumentationKey=sub2-appins1-key1;EndpointSuffix=applicationinsights.us' },
                                { instrKey: 'sub2-appins2-key2', name: 'sub2AppIns2', connString: 'InstrumentationKey=sub2-appins2-key2;EndpointSuffix=applicationinsights.us' }
                            ];
                            return assert.deepStrictEqual(keys, expectedData);
                        });
                });

                it('should return correct instrumentationKeys when a name filter is included', () => {
                    const context = testUtil.buildConsumerContext({
                        eventType: 'systemInfo',
                        config: {
                            useManagedIdentity: true,
                            appInsightsResourceName: 'sub1.*'
                        }
                    });
                    return azureUtil.getInstrumentationKeys(context)
                        .then((keys) => {
                            const expectedData = [
                                { instrKey: 'sub1-appins1-key1', name: 'sub1AppIns1', connString: 'InstrumentationKey=sub1-appins1-key1' },
                                { instrKey: 'sub1-appins2-key2', name: 'sub1AppIns2', connString: 'InstrumentationKey=sub1-appins2-key2' }
                            ];
                            return assert.deepStrictEqual(keys, expectedData);
                        });
                });
            });
        });
    });

    describe('Application Insights', () => {
        describe('getMetrics', () => {
            it('should properly convert data into array of metrics', () => {
                const testData = {
                    system: {
                        stringProp: 'string',
                        numProp: 1234,
                        numStringProp: '1.342',
                        objProp: {
                            objKey1: false,
                            objKey2: 145
                        }
                    },
                    someStats: {
                        statsType1: [
                            {
                                name: 'statsname1',
                                statsValue: 3899
                            },
                            {
                                name: 'statsname2',
                                statsValue: 18
                            }
                        ],
                        statsType2: [
                            {
                                not_name: 'statsname1',
                                statsValue: '1401'
                            },
                            {
                                not_name: 'statsname2',
                                statsValue: '242'
                            }
                        ]
                    }
                };
                const expectedData = [
                    {
                        name: 'F5_system_numProp',
                        value: 1234
                    },
                    {
                        name: 'F5_system_numStringProp',
                        value: 1.342
                    },
                    {
                        name: 'F5_system_objProp_objKey2',
                        value: 145
                    },
                    {
                        name: 'F5_someStats_statsType1_statsname1_statsValue',
                        value: 3899
                    },
                    {
                        name: 'F5_someStats_statsType1_statsname2_statsValue',
                        value: 18
                    },
                    {
                        name: 'F5_someStats_statsType2_0_statsValue',
                        value: 1401
                    },
                    {
                        name: 'F5_someStats_statsType2_1_statsValue',
                        value: 242
                    }
                ];
                const actualMetrics = azureUtil.getMetrics(testData);
                return assert.deepStrictEqual(actualMetrics, expectedData);
            });
        });
    });

    describe('Methods', function () {
        // test data include cases with exceptions
        this.timeout(30000);
        afterEach(() => {
            sinon.restore();
        });
        Object.keys(azureUtilTestsData).forEach((testSetKey) => {
            const testSet = azureUtilTestsData[testSetKey];
            testUtil.getCallableDescribe(testSet)(testSet.name, () => {
                testSet.tests.forEach(testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
                    const context = testUtil.buildConsumerContext({
                        config: testConf.config, metadata: testConf.metadata
                    });
                    const actualUrl = azureUtil.getApiUrl(context, testConf.apiType);
                    assert.strictEqual(actualUrl, testConf.expected);
                }));
            });
        });
    });
});
