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
    name: 'iRules stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set irules stats to empty object if not configured',
            statsToCollect: ['iRules'],
            expectedData: {
                iRules: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/rule\/stats/,
                    response: {
                        kind: 'tm:ltm:rule:rulecollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/rule/stats?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect irules stats',
            statsToCollect: ['iRules'],
            expectedData: {
                iRules: {
                    '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                        events: {
                            ACCESS_ACL_ALLOWED: {
                                aborts: 0,
                                avgCycles: 0,
                                failures: 0,
                                maxCycles: 0,
                                minCycles: 0,
                                priority: 500,
                                totalExecutions: 0
                            }
                        },
                        tenant: 'Common',
                        name: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth'
                    },
                    '/Common/_sys_auth_tacacs': {
                        events: {
                            AUTH_RESULT: {
                                aborts: 0,
                                avgCycles: 0,
                                failures: 0,
                                maxCycles: 0,
                                minCycles: 0,
                                priority: 500,
                                totalExecutions: 0
                            },
                            HTTP_REQUEST: {
                                aborts: 0,
                                avgCycles: 0,
                                failures: 0,
                                maxCycles: 0,
                                minCycles: 0,
                                priority: 500,
                                totalExecutions: 0
                            }
                        },
                        tenant: 'Common',
                        name: '/Common/_sys_auth_tacacs'
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/rule\/stats/,
                    response: {
                        kind: 'tm:ltm:rule:rulecollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/rule/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_APM_ExchangeSupport_OA_BasicAuth:ACCESS_ACL_ALLOWED/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:rule:rulestats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_APM_ExchangeSupport_OA_BasicAuth:ACCESS_ACL_ALLOWED/stats?ver=14.1.0',
                                    entries: {
                                        aborts: {
                                            value: 0
                                        },
                                        avgCycles: {
                                            value: 0
                                        },
                                        eventType: {
                                            description: 'ACCESS_ACL_ALLOWED'
                                        },
                                        failures: {
                                            value: 0
                                        },
                                        maxCycles: {
                                            value: 0
                                        },
                                        minCycles: {
                                            value: 0
                                        },
                                        tmName: {
                                            description: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth'
                                        },
                                        priority: {
                                            value: 500
                                        },
                                        totalExecutions: {
                                            value: 0
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_auth_tacacs:AUTH_RESULT/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:rule:rulestats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_auth_tacacs:AUTH_RESULT/stats?ver=13.1.0',
                                    entries: {
                                        aborts: {
                                            value: 0
                                        },
                                        avgCycles: {
                                            value: 0
                                        },
                                        eventType: {
                                            description: 'AUTH_RESULT'
                                        },
                                        failures: {
                                            value: 0
                                        },
                                        maxCycles: {
                                            value: 0
                                        },
                                        minCycles: {
                                            value: 0
                                        },
                                        tmName: {
                                            description: '/Common/_sys_auth_tacacs'
                                        },
                                        priority: {
                                            value: 500
                                        },
                                        totalExecutions: {
                                            value: 0
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_auth_tacacs:HTTP_REQUEST/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:rule:rulestats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/rule/~Common~_sys_auth_tacacs:HTTP_REQUEST/stats?ver=13.1.0',
                                    entries: {
                                        aborts: {
                                            value: 0
                                        },
                                        avgCycles: {
                                            value: 0
                                        },
                                        eventType: {
                                            description: 'HTTP_REQUEST'
                                        },
                                        failures: {
                                            value: 0
                                        },
                                        maxCycles: {
                                            value: 0
                                        },
                                        minCycles: {
                                            value: 0
                                        },
                                        tmName: {
                                            description: '/Common/_sys_auth_tacacs'
                                        },
                                        priority: {
                                            value: 500
                                        },
                                        totalExecutions: {
                                            value: 0
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
