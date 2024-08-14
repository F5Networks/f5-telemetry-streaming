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
    name: 'HTTP profiles stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set http profiles to empty object if not configured',
            statsToCollect: ['httpProfiles'],
            expectedData: {
                httpProfiles: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/profile\/http\/stats/,
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
            name: 'should collect http profiles stats',
            statsToCollect: ['httpProfiles'],
            expectedData: {
                httpProfiles: {
                    '/Common/http': {
                        '2xxResp': 1,
                        '3xxResp': 0,
                        '4xxResp': 0,
                        '5xxResp': 0,
                        cookiePersistInserts: 0,
                        getReqs: 1,
                        maxKeepaliveReq: 1,
                        name: '/Common/http',
                        tenant: 'Common',
                        numberReqs: 1,
                        postReqs: 0,
                        respGreaterThan2m: 0,
                        respLessThan2m: 0,
                        v10Reqs: 0,
                        v10Resp: 0,
                        v11Reqs: 1,
                        v11Resp: 1,
                        v9Reqs: 0,
                        v9Resp: 0
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/profile\/http\/stats/,
                    response: {
                        kind: 'tm:ltm:profile:http:httpcollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/profile/http/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/profile/http/~Common~http/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:profile:http:httpstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/profile/http/~Common~http/stats?ver=14.1.0',
                                    entries: {
                                        cookiePersistInserts: {
                                            value: 0
                                        },
                                        getReqs: {
                                            value: 1
                                        },
                                        maxKeepaliveReq: {
                                            value: 1
                                        },
                                        tmName: {
                                            description: '/Common/http'
                                        },
                                        numberReqs: {
                                            value: 1
                                        },
                                        passthroughConnect: {
                                            value: 0
                                        },
                                        passthroughExcessClientHeaders: {
                                            value: 0
                                        },
                                        passthroughExcessServerHeaders: {
                                            value: 0
                                        },
                                        passthroughHeaders: {
                                            value: 0
                                        },
                                        passthroughIrule: {
                                            value: 0
                                        },
                                        passthroughOversizeClientHeaders: {
                                            value: 0
                                        },
                                        passthroughOversizeServerHeaders: {
                                            value: 0
                                        },
                                        passthroughPipeline: {
                                            value: 0
                                        },
                                        passthroughUnknownMethod: {
                                            value: 0
                                        },
                                        passthroughWebSockets: {
                                            value: 0
                                        },
                                        postReqs: {
                                            value: 0
                                        },
                                        proxyConnReqs: {
                                            value: 0
                                        },
                                        proxyReqs: {
                                            value: 0
                                        },
                                        resp_2xxCnt: {
                                            value: 1
                                        },
                                        resp_3xxCnt: {
                                            value: 0
                                        },
                                        resp_4xxCnt: {
                                            value: 0
                                        },
                                        resp_5xxCnt: {
                                            value: 0
                                        },
                                        respBucket_128k: {
                                            value: 0
                                        },
                                        respBucket_16k: {
                                            value: 1
                                        },
                                        respBucket_1k: {
                                            value: 0
                                        },
                                        respBucket_2m: {
                                            value: 0
                                        },
                                        respBucket_32k: {
                                            value: 0
                                        },
                                        respBucket_4k: {
                                            value: 0
                                        },
                                        respBucket_512k: {
                                            value: 0
                                        },
                                        respBucket_64k: {
                                            value: 0
                                        },
                                        respBucketLarge: {
                                            value: 0
                                        },
                                        typeId: {
                                            description: 'ltm profile http'
                                        },
                                        v10Reqs: {
                                            value: 0
                                        },
                                        v10Resp: {
                                            value: 0
                                        },
                                        v11Reqs: {
                                            value: 1
                                        },
                                        v11Resp: {
                                            value: 1
                                        },
                                        v9Reqs: {
                                            value: 0
                                        },
                                        v9Resp: {
                                            value: 0
                                        },
                                        vsName: {
                                            description: 'N/A'
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
