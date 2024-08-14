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

/* eslint-disable no-useless-escape */

/**
 * NOTE: DO NOT REMOVE 'kind' AND 'selfLink' PROPERTIES FROM RESPONSE's TOP LEVEL
 */

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    name: 'LTM policies stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set ltm policies to empty object if not configured',
            statsToCollect: ['ltmPolicies'],
            expectedData: {
                ltmPolicies: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/policy\/stats/,
                    response: {
                        kind: 'tm:ltm:policy:policycollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/policy/stats?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect ltm policies stats',
            statsToCollect: ['ltmPolicies'],
            expectedData: {
                ltmPolicies: {
                    '/Common/asm_auto_l7_policy__test_vs': {
                        actions: {
                            'default:1': {
                                invoked: 1,
                                succeeded: 1
                            }
                        },
                        invoked: 1,
                        name: '/Common/asm_auto_l7_policy__test_vs',
                        tenant: 'Common',
                        succeeded: 1
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/policy\/stats/,
                    response: {
                        kind: 'tm:ltm:policy:policycollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/policy/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:policy:policystats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/stats?ver=14.1.0',
                                    entries: {
                                        invoked: {
                                            value: 1
                                        },
                                        policyName: {
                                            description: '/Common/asm_auto_l7_policy__test_vs'
                                        },
                                        succeeded: {
                                            value: 1
                                        },
                                        vsName: {
                                            description: 'N/A'
                                        },
                                        'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/actions/stats': {
                                            nestedStats: {
                                                entries: {
                                                    'https://localhost/mgmt/tm/ltm/policy/~Common~asm_auto_l7_policy__test_vs/actions/default:1/stats': {
                                                        nestedStats: {
                                                            entries: {
                                                                action: {
                                                                    description: 'enable'
                                                                },
                                                                actionId: {
                                                                    value: 1
                                                                },
                                                                invoked: {
                                                                    value: 1
                                                                },
                                                                ruleName: {
                                                                    description: 'default'
                                                                },
                                                                succeeded: {
                                                                    value: 1
                                                                },
                                                                tmTarget: {
                                                                    description: 'asm'
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
    ]
};
