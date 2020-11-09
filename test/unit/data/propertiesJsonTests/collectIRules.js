/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-useless-escape */

/**
 * NOTE: DO NOT REMOVE 'kind' AND 'selfLink' PROPERTIES FROM RESPONSE's TOP LEVEL
 */
/**
 * TODO: update/remove 'options: { times: XXXX }' when EndpointLoader's cache will be fixed
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
            contextToCollect: [],
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
            contextToCollect: [],
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
                            }
                        }
                    }
                }
            ]
        }
    ]
};
