/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const sinon = require('sinon');
const assert = require('assert');
const testUtil = require('./../shared/util');
const util = require('./../../../src/lib/util');
const azureUtil = require('./../../../src/lib/consumers/Azure_Log_Analytics/azureUtil');

describe('Azure Util Tests', () => {
    describe('Managed Identities', () => {
        before(() => {
            sinon.stub(util, 'makeRequest').callsFake((reqOpts) => {
                // metadata
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
                return Promise.resolve({});
            });
        });

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
});
