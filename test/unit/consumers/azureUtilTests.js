/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const azureUtilTestsData = require('./data/azureUtilTestsData');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const azureUtil = sourceCode('src/lib/consumers/shared/azureUtil');
const requestsUtil = sourceCode('src/lib/utils/requests');

moduleCache.remember();

describe('Azure Util Tests', () => {
    before(() => {
        moduleCache.restore();
    });

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
                                properties: { InstrumentationKey: 'sub1-appins1-key1', ConnectionString: 'InstrumentationKey=sub1-appins1-key1' }, // #gitleaks:allow
                                name: 'sub1AppIns1'
                            },
                            {
                                properties: { InstrumentationKey: 'sub1-appins2-key2', ConnectionString: 'InstrumentationKey=sub1-appins2-key2' }, // #gitleaks:allow
                                name: 'sub1AppIns2'
                            }
                        ]
                    };
                    const sub2AppInsights = {
                        value: [
                            {
                                properties: { InstrumentationKey: 'sub2-appins1-key1', ConnectionString: 'InstrumentationKey=sub2-appins1-key1;EndpointSuffix=applicationinsights.us' }, // #gitleaks:allow
                                name: 'sub2AppIns1'
                            },
                            {
                                properties: { InstrumentationKey: 'sub2-appins2-key2', ConnectionString: 'InstrumentationKey=sub2-appins2-key2;EndpointSuffix=applicationinsights.us' }, // #gitleaks:allow
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
                    .then((key) => assert.strictEqual(key, 'the-hidden-key'));
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
                                { instrKey: 'sub1-appins1-key1', name: 'sub1AppIns1', connString: 'InstrumentationKey=sub1-appins1-key1' }, // #gitleaks:allow
                                { instrKey: 'sub1-appins2-key2', name: 'sub1AppIns2', connString: 'InstrumentationKey=sub1-appins2-key2' }, // #gitleaks:allow
                                { instrKey: 'sub2-appins1-key1', name: 'sub2AppIns1', connString: 'InstrumentationKey=sub2-appins1-key1;EndpointSuffix=applicationinsights.us' }, // #gitleaks:allow
                                { instrKey: 'sub2-appins2-key2', name: 'sub2AppIns2', connString: 'InstrumentationKey=sub2-appins2-key2;EndpointSuffix=applicationinsights.us' } // #gitleaks:allow
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
                                { instrKey: 'sub1-appins1-key1', name: 'sub1AppIns1', connString: 'InstrumentationKey=sub1-appins1-key1' }, // #gitleaks:allow
                                { instrKey: 'sub1-appins2-key2', name: 'sub1AppIns2', connString: 'InstrumentationKey=sub1-appins2-key2' } // #gitleaks:allow
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
                testSet.tests.forEach((testConf) => testUtil.getCallableIt(testConf)(testConf.name, () => {
                    const context = testUtil.buildConsumerContext({
                        config: testConf.config, metadata: testConf.metadata
                    });
                    const actualUrl = azureUtil.getApiUrl(context, testConf.apiType);
                    assert.strictEqual(actualUrl, testConf.expected);
                }));
            });
        });
    });

    describe('isConfigItems', () => {
        it('not sslCerts and not "proper path" records', () => {
            const testData = {
                topLevelKey1: {
                    name: 'topLevelKey1'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'someType', false));
        });

        it('poolMembers type is always config item', () => {
            const testData = {
                topLevelKey1: {
                    name: 'topLevelKey1'
                }
            };
            assert.isTrue(azureUtil.isConfigItems(testData, 'poolMembers', true));
        });

        it('"proper path" record, but not matching name', () => {
            const testData = {
                '/path1a/path1b': {
                    key1: 'value1',
                    key2: 'value2',
                    name: 'bad name'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'someType', false));
        });

        it('two "proper path" records, first name does not match', () => {
            const testData = {
                '/path1a/path1b': {
                    name: 'bad name'
                },
                '/path2a/path2b': {
                    name: '/path2a/path2b'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'someType', false));
        });

        it('two "proper path" records, second name does not match', () => {
            const testData = {
                '/path1a/path1b': {
                    name: '/path1a/path1b'
                },
                '/path2a/path2b': {
                    name: 'bad name'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'someType', false));
        });

        it('"proper path" records with matching names', () => {
            const testData = {
                '/path1a/path1b': {
                    name: '/path1a/path1b'
                },
                '/path2a/path2b': {
                    key1: 'value1',
                    key2: 'value2',
                    name: '/path2a/path2b'
                }
            };
            assert.isTrue(azureUtil.isConfigItems(testData, 'someType', false));
        });

        it('one "proper path" record, one not', () => {
            const testData = {
                '/path1a/path1b': {
                    name: '/path1a/path1b'
                },
                '/badPath': {
                    name: '/badPath'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'someType', false));
        });

        it('sslCerts type with matching name', () => {
            const testData = {
                topLevelKey1: {
                    key1: 'value1',
                    name: 'topLevelKey1'
                }
            };
            assert.isTrue(azureUtil.isConfigItems(testData, 'sslCerts', false));
        });

        it('sslCerts type with name does not match', () => {
            const testData = {
                topLevelKey1: {
                    key1: 'value1',
                    name: 'topLevelKey1'
                },
                topLevelKey2: {
                    key1: 'value1',
                    name: 'badKey'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'sslCerts', false));
        });

        it('sslCerts type with missing name', () => {
            const testData = {
                topLevelKey1: {
                    key1: 'value1',
                    name: 'topLevelKey1'
                },
                topLevelKey2: {
                    key1: 'value1'
                }
            };
            assert.isFalse(azureUtil.isConfigItems(testData, 'sslCerts', false));
        });
    });

    describe('transformConfigItems', () => {
        it('single key object', () => {
            const inputData = {
                topLevelKey1: {
                    name: 'topLevelKey1'
                }
            };
            const expectedData = [{ name: 'topLevelKey1' }];
            assert.deepStrictEqual(azureUtil.transformConfigItems(inputData), expectedData);
        });

        it('object with two keys', () => {
            const inputData = {
                topLevelKey1: {
                    name: 'topLevelKey1'
                },
                topLevelKey2: {
                    key1: 'value1',
                    key2: 'value2'
                }
            };
            const expectedData = [{ name: 'topLevelKey1' }, { key1: 'value1', key2: 'value2' }];
            assert.deepStrictEqual(azureUtil.transformConfigItems(inputData), expectedData);
        });

        it('nested object', () => {
            const inputData = {
                topLevelKey1: {
                    name: 'topLevelKey1'
                },
                topLevelKey2: {
                    key1: 'value1',
                    key2: {
                        leaf1: 'leaf value 1',
                        leaf2: 'leaf value 2'
                    }
                }
            };
            const expectedData = [
                {
                    name: 'topLevelKey1'
                },
                {
                    key1: 'value1',
                    key2: {
                        leaf1: 'leaf value 1',
                        leaf2: 'leaf value 2'
                    }
                }
            ];
            assert.deepStrictEqual(azureUtil.transformConfigItems(inputData), expectedData);
        });
    });

    describe('ClassPoolToMembersMapping', () => {
        it('test isPoolType', () => {
            const poolMemberMapping = new azureUtil.ClassPoolToMembersMapping();
            assert.strictEqual(poolMemberMapping.isPoolType('pools'), true);
            assert.strictEqual(poolMemberMapping.isPoolType('mxPools'), true);
            assert.strictEqual(poolMemberMapping.isPoolType('arbitrary'), false);
        });

        it('test isPoolMembersType', () => {
            const poolMemberMapping = new azureUtil.ClassPoolToMembersMapping();
            assert.strictEqual(poolMemberMapping.isPoolMembersType('poolMembers'), true);
            assert.strictEqual(poolMemberMapping.isPoolMembersType('mxPoolMembers'), true);
            assert.strictEqual(poolMemberMapping.isPoolMembersType('arbitrary'), false);
        });

        it('test getPoolMembersType', () => {
            const poolMemberMapping = new azureUtil.ClassPoolToMembersMapping();
            assert.strictEqual(poolMemberMapping.getPoolMembersType('pools'), 'poolMembers');
            assert.strictEqual(poolMemberMapping.getPoolMembersType('mxPools'), 'mxPoolMembers');
            assert.strictEqual(poolMemberMapping.getPoolMembersType('arbitrary'), null);
        });

        it('test buildPoolMemeberHolder', () => {
            const expectedPoolMembersHolder = {
                poolMembers: {},
                aPoolMembers: {},
                aaaaPoolMembers: {},
                cnamePoolMembers: {},
                mxPoolMembers: {},
                naptrPoolMembers: {},
                srvPoolMembers: {}
            };
            const poolMemberMapping = new azureUtil.ClassPoolToMembersMapping();
            const allPoolMembers = {};
            poolMemberMapping.buildPoolMemeberHolder(allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembersHolder);
        });
    });

    describe('splitMembersFromPools', () => {
        it('no pool members', () => {
            const pool = {
                key: 'value'
            };
            // expectedPool is the same as pool
            const expectedPool = {
                key: 'value'
            };
            const allPoolMembers = {};
            // expectedPoolMembers is the same as allPoolMembers
            const expectedPoolMembers = {};

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('members is a string (not observed)', () => {
            const pool = {
                key: 'value',
                members: 'not an object'
            };
            // expectedPool is the same as pool
            const expectedPool = {
                key: 'value',
                members: 'not an object'
            };
            const allPoolMembers = {};
            // expectedPoolMembers is the same as allPoolMembers
            const expectedPoolMembers = {};

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('members is an empty object', () => {
            const pool = {
                key: 'value',
                members: {}
            };
            // empty object deleted
            const expectedPool = {
                key: 'value'
            };
            const allPoolMembers = {};
            // expectedPoolMembers is the same as allPoolMembers
            const expectedPoolMembers = {};

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('pool member is a string (not observed)', () => {
            const pool = {
                key: 'value',
                members: {
                    key: 'arbitrary string',
                    topName: {
                        name: 'topName',
                        poolName: 'poolName'
                    }
                }
            };
            // expectedPool is the same as pool
            const expectedPool = {
                key: 'value',
                members: {
                    key: 'arbitrary string'
                }
            };
            const allPoolMembers = {};
            // expectedPoolMembers is the same as allPoolMembers
            const expectedPoolMembers = {
                'topName-separator-poolName': {
                    name: 'topName',
                    poolName: 'poolName'
                }
            };

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('pool member does not have poolName (not observed)', () => {
            const pool = {
                key: 'value',
                members: {
                    topNameA: {
                        name: 'topNameA',
                        poolName: 'poolName'
                    },
                    topNameB: {
                        name: 'topNameB'
                    }
                }
            };
            // expectedPool is the same as pool
            const expectedPool = {
                key: 'value',
                members: {
                    topNameB: {
                        name: 'topNameB'
                    }
                }
            };
            const allPoolMembers = {};
            // expectedPoolMembers is the same as allPoolMembers
            const expectedPoolMembers = {
                'topNameA-separator-poolName': {
                    name: 'topNameA',
                    poolName: 'poolName'
                }
            };

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('pool member without name', () => {
            const pool = {
                key: 'value',
                members: {
                    topName: {
                        poolName: 'poolName'
                    }
                }
            };
            // topName is added as expectedPoolMembers.poolMembers.topName-separator-poolName.name
            const expectedPoolMembers = {
                'topName-separator-poolName': {
                    name: 'topName',
                    poolName: 'poolName'
                }
            };
            // no pool.members anymore
            const expectedPool = {
                key: 'value'
            };
            const allPoolMembers = {};

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('pool member name different from top name', () => {
            const pool = {
                key: 'value',
                members: {
                    topName: {
                        name: 'memberName',
                        poolName: 'poolName'
                    }
                }
            };
            /* 'topName' overwrites 'memberName' in added as
                expectedPoolMembers.poolMembers.topName-separator-poolName.name */
            // in reality, I've only seen that that if the member name is defined, it matches the top name
            const expectedPoolMembers = {
                'topName-separator-poolName': {
                    name: 'topName',
                    poolName: 'poolName'
                }
            };
            // no pool.members anymore
            const expectedPool = {
                key: 'value'
            };
            const allPoolMembers = {};

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('two pool members', () => {
            const pool = {
                key: 'value',
                members: {
                    topNameA: {
                        name: 'topNameA',
                        poolName: 'poolName'
                    },
                    topNameB: {
                        name: 'topNameB',
                        poolName: 'poolName'
                    }
                }
            };
            const expectedPoolMembers = {
                'topNameA-separator-poolName': {
                    name: 'topNameA',
                    poolName: 'poolName'
                },
                'topNameB-separator-poolName': {
                    name: 'topNameB',
                    poolName: 'poolName'
                }
            };
            // no pool.members anymore
            const expectedPool = {
                key: 'value'
            };
            const allPoolMembers = {};

            azureUtil.splitMembersFromPools(pool, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(pool, expectedPool);
        });

        it('two pools, same member name', () => {
            const poolA = {
                key: 'valueA',
                members: {
                    topName: {
                        name: 'topName',
                        poolName: 'poolNameA'
                    }
                }
            };
            const poolB = {
                key: 'valueB',
                members: {
                    topName: {
                        name: 'topName',
                        poolName: 'poolNameB'
                    }
                }
            };
            const expectedPoolMembers = {
                'topName-separator-poolNameA': {
                    name: 'topName',
                    poolName: 'poolNameA'
                },
                'topName-separator-poolNameB': {
                    name: 'topName',
                    poolName: 'poolNameB'
                }
            };
            // no pool.members anymore
            const expectedPoolA = {
                key: 'valueA'
            };
            const expectedPoolB = {
                key: 'valueB'
            };
            const allPoolMembers = {};

            azureUtil.splitMembersFromPools(poolA, allPoolMembers);
            azureUtil.splitMembersFromPools(poolB, allPoolMembers);
            assert.deepStrictEqual(allPoolMembers, expectedPoolMembers);
            assert.deepStrictEqual(poolA, expectedPoolA);
            assert.deepStrictEqual(poolB, expectedPoolB);
        });
    });

    describe('scrubReservedKeys', () => {
        it('no key "tenant" - no change', () => {
            const inputData = { key1: 'value1', key2: 'value2' };
            const expectedData = inputData;
            azureUtil.scrubReservedKeys(inputData);
            assert.deepStrictEqual(inputData, expectedData);
        });

        it('key "tenant" replaced by key "f5tenant"', () => {
            const inputData = { tenant: 'value1', key2: 'value2' };
            const expectedData = { f5tenant: 'value1', key2: 'value2' };
            azureUtil.scrubReservedKeys(inputData);
            assert.deepStrictEqual(inputData, expectedData);
        });
    });
});
