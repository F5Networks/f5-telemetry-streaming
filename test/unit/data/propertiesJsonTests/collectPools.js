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
    name: 'Pools stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set pools to empty object if not configured (with items property)',
            statsToCollect: ['pools'],
            contextToCollect: [],
            expectedData: {
                pools: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/pool/,
                    response: {
                        kind: 'tm:ltm:pool:poolcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool?ver=14.1.0',
                        items: []
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set pools to empty object if not configured (without items property)',
            statsToCollect: ['pools'],
            contextToCollect: [],
            expectedData: {
                pools: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/pool/,
                    response: {
                        kind: 'tm:ltm:pool:poolcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect pools stats',
            statsToCollect: ['pools'],
            contextToCollect: [],
            expectedData: {
                pools: {
                    '/Common/test_pool_0': {
                        tenant: 'Common',
                        activeMemberCnt: 0,
                        availabilityState: 'unknown',
                        curPriogrp: 0,
                        enabledState: 'enabled',
                        highestPriogrp: 0,
                        lowestPriogrp: 0,
                        members: {
                            '/Common/10.10.0.2:80': {
                                addr: '10.10.0.2',
                                availabilityState: 'unknown',
                                enabledState: 'enabled',
                                monitorStatus: 'unchecked',
                                poolName: '/Common/test_pool_0',
                                port: 80,
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'Pool member does not have service checking enabled',
                                totRequests: 0
                            },
                            '/Common/10.10.0.2%10:80': {
                                addr: '10.10.0.2%10',
                                availabilityState: 'unknown',
                                enabledState: 'enabled',
                                monitorStatus: 'unchecked',
                                poolName: '/Common/test_pool_0',
                                port: 80,
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'Pool member does not have service checking enabled',
                                totRequests: 0
                            },
                            '/Common/_auto_192.168.2.2:80': {
                                addr: '192.168.2.2',
                                availabilityState: 'available',
                                enabledState: 'enabled',
                                monitorStatus: 'up',
                                poolName: '/Common/test_pool_0',
                                port: 80,
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'Pool member is available',
                                totRequests: 0,
                                fqdn: 'www.thebestwebsite.com'
                            },
                            '/Common/bestwebsite:80': {
                                addr: '::',
                                availabilityState: 'available',
                                enabledState: 'enabled',
                                monitorStatus: 'fqdn-up',
                                poolName: '/Common/test_pool_0',
                                port: 80,
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'The DNS server(s) are available',
                                totRequests: 0,
                                fqdn: 'www.thebestwebsite.com'
                            }
                        },
                        name: '/Common/test_pool_0',
                        'serverside.bitsIn': 0,
                        'serverside.bitsOut': 0,
                        'serverside.curConns': 0,
                        'serverside.maxConns': 0,
                        'serverside.pktsIn': 0,
                        'serverside.pktsOut': 0,
                        'serverside.totConns': 0,
                        'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                        totRequests: 0
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/pool/,
                    response: {
                        kind: 'tm:ltm:pool:poolcollectionstate',
                        items: [
                            {
                                kind: 'tm:ltm:pool:poolstate',
                                name: 'test_pool_0',
                                partition: 'Common',
                                fullPath: '/Common/test_pool_0',
                                generation: 1876,
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                                allowNat: 'yes',
                                allowSnat: 'yes',
                                ignorePersistedWeight: 'disabled',
                                ipTosToClient: 'pass-through',
                                ipTosToServer: 'pass-through',
                                linkQosToClient: 'pass-through',
                                linkQosToServer: 'pass-through',
                                loadBalancingMode: 'round-robin',
                                minActiveMembers: 0,
                                minUpMembers: 0,
                                minUpMembersAction: 'failover',
                                minUpMembersChecking: 'disabled',
                                queueDepthLimit: 0,
                                queueOnConnectionLimit: 'disabled',
                                queueTimeLimit: 0,
                                reselectTries: 0,
                                serviceDownAction: 'none',
                                slowRampTime: 10,
                                membersReference: {
                                    link: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?ver=14.1.0',
                                    isSubcollection: true
                                },
                                gatewayFailsafeDeviceReference: {
                                    link: 'https://localhost/mgmt/tm/cm/device/~Common~localhost?ver=14.1.0',
                                    name: 'gatewayFailsafeDeviceReference'
                                }
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn,selfLink',
                    response: {
                        kind: 'tm:ltm:pool:members:memberscollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members?$select=fqdn%2CselfLink&ver=14.1.4',
                        items: [
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80?ver=14.1.4',
                                fqdn: {
                                    autopopulate: 'disabled'
                                }
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80?ver=14.1.4',
                                fqdn: {
                                    autopopulate: 'disabled'
                                }
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.168.2.2:80?ver=14.1.4',
                                fqdn: {
                                    autopopulate: 'enabled',
                                    tmName: 'www.thebestwebsite.com'
                                }
                            },
                            {
                                selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80?ver=14.1.4',
                                fqdn: {
                                    autopopulate: 'enabled',
                                    tmName: 'www.thebestwebsite.com'
                                }
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/ltm/pool/~Common~test_pool_0/members/stats',
                    response: {
                        kind: 'tm:ltm:pool:members:memberscollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2:80/stats?ver=14.1.0',
                                    entries: {
                                        addr: {
                                            description: '10.10.0.2'
                                        },
                                        'connq.ageEdm': {
                                            value: 0
                                        },
                                        'connq.ageEma': {
                                            value: 0
                                        },
                                        'connq.ageHead': {
                                            value: 0
                                        },
                                        'connq.ageMax': {
                                            value: 0
                                        },
                                        'connq.depth': {
                                            value: 0
                                        },
                                        'connq.serviced': {
                                            value: 0
                                        },
                                        curSessions: {
                                            value: 0
                                        },
                                        monitorRule: {
                                            description: 'none'
                                        },
                                        monitorStatus: {
                                            description: 'unchecked'
                                        },
                                        nodeName: {
                                            description: '/Common/10.10.0.2'
                                        },
                                        poolName: {
                                            description: '/Common/test_pool_0'
                                        },
                                        port: {
                                            value: 80
                                        },
                                        'serverside.bitsIn': {
                                            value: 0
                                        },
                                        'serverside.bitsOut': {
                                            value: 0
                                        },
                                        'serverside.curConns': {
                                            value: 0
                                        },
                                        'serverside.maxConns': {
                                            value: 0
                                        },
                                        'serverside.pktsIn': {
                                            value: 0
                                        },
                                        'serverside.pktsOut': {
                                            value: 0
                                        },
                                        'serverside.totConns': {
                                            value: 0
                                        },
                                        sessionStatus: {
                                            description: 'enabled'
                                        },
                                        'status.availabilityState': {
                                            description: 'unknown'
                                        },
                                        'status.enabledState': {
                                            description: 'enabled'
                                        },
                                        'status.statusReason': {
                                            description: 'Pool member does not have service checking enabled'
                                        },
                                        totRequests: {
                                            value: 0
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~10.10.0.2%2510:80/stats?ver=14.1.0',
                                    entries: {
                                        addr: {
                                            description: '10.10.0.2%10'
                                        },
                                        'connq.ageEdm': {
                                            value: 0
                                        },
                                        'connq.ageEma': {
                                            value: 0
                                        },
                                        'connq.ageHead': {
                                            value: 0
                                        },
                                        'connq.ageMax': {
                                            value: 0
                                        },
                                        'connq.depth': {
                                            value: 0
                                        },
                                        'connq.serviced': {
                                            value: 0
                                        },
                                        curSessions: {
                                            value: 0
                                        },
                                        monitorRule: {
                                            description: 'none'
                                        },
                                        monitorStatus: {
                                            description: 'unchecked'
                                        },
                                        nodeName: {
                                            description: '/Common/10.10.0.2%10'
                                        },
                                        poolName: {
                                            description: '/Common/test_pool_0'
                                        },
                                        port: {
                                            value: 80
                                        },
                                        'serverside.bitsIn': {
                                            value: 0
                                        },
                                        'serverside.bitsOut': {
                                            value: 0
                                        },
                                        'serverside.curConns': {
                                            value: 0
                                        },
                                        'serverside.maxConns': {
                                            value: 0
                                        },
                                        'serverside.pktsIn': {
                                            value: 0
                                        },
                                        'serverside.pktsOut': {
                                            value: 0
                                        },
                                        'serverside.totConns': {
                                            value: 0
                                        },
                                        sessionStatus: {
                                            description: 'enabled'
                                        },
                                        'status.availabilityState': {
                                            description: 'unknown'
                                        },
                                        'status.enabledState': {
                                            description: 'enabled'
                                        },
                                        'status.statusReason': {
                                            description: 'Pool member does not have service checking enabled'
                                        },
                                        totRequests: {
                                            value: 0
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.168.2.2:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~_auto_192.168.2.2:80/stats?ver=14.1.0',
                                    entries: {
                                        addr: {
                                            description: '192.168.2.2'
                                        },
                                        'connq.ageEdm': {
                                            value: 0
                                        },
                                        'connq.ageEma': {
                                            value: 0
                                        },
                                        'connq.ageHead': {
                                            value: 0
                                        },
                                        'connq.ageMax': {
                                            value: 0
                                        },
                                        'connq.depth': {
                                            value: 0
                                        },
                                        'connq.serviced': {
                                            value: 0
                                        },
                                        curSessions: {
                                            value: 0
                                        },
                                        monitorRule: {
                                            description: '/Common/http (pool monitor)'
                                        },
                                        monitorStatus: {
                                            description: 'up'
                                        },
                                        nodeName: {
                                            description: '/Common/_auto_192.168.2.2'
                                        },
                                        poolName: {
                                            description: '/Common/test_pool_0'
                                        },
                                        port: {
                                            value: 80
                                        },
                                        'serverside.bitsIn': {
                                            value: 0
                                        },
                                        'serverside.bitsOut': {
                                            value: 0
                                        },
                                        'serverside.curConns': {
                                            value: 0
                                        },
                                        'serverside.maxConns': {
                                            value: 0
                                        },
                                        'serverside.pktsIn': {
                                            value: 0
                                        },
                                        'serverside.pktsOut': {
                                            value: 0
                                        },
                                        'serverside.totConns': {
                                            value: 0
                                        },
                                        sessionStatus: {
                                            description: 'enabled'
                                        },
                                        'status.availabilityState': {
                                            description: 'available'
                                        },
                                        'status.enabledState': {
                                            description: 'enabled'
                                        },
                                        'status.statusReason': {
                                            description: 'Pool member is available'
                                        },
                                        totRequests: {
                                            value: 0
                                        }
                                    }
                                }
                            },
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:members:membersstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/members/~Common~bestwebsite:80/stats?ver=14.1.0',
                                    entries: {
                                        addr: {
                                            description: '::'
                                        },
                                        'connq.ageEdm': {
                                            value: 0
                                        },
                                        'connq.ageEma': {
                                            value: 0
                                        },
                                        'connq.ageHead': {
                                            value: 0
                                        },
                                        'connq.ageMax': {
                                            value: 0
                                        },
                                        'connq.depth': {
                                            value: 0
                                        },
                                        'connq.serviced': {
                                            value: 0
                                        },
                                        curSessions: {
                                            value: 0
                                        },
                                        monitorRule: {
                                            description: '/Common/http (pool monitor)'
                                        },
                                        monitorStatus: {
                                            description: 'fqdn-up'
                                        },
                                        nodeName: {
                                            description: '/Common/bestwebsite'
                                        },
                                        poolName: {
                                            description: '/Common/test_pool_0'
                                        },
                                        port: {
                                            value: 80
                                        },
                                        'serverside.bitsIn': {
                                            value: 0
                                        },
                                        'serverside.bitsOut': {
                                            value: 0
                                        },
                                        'serverside.curConns': {
                                            value: 0
                                        },
                                        'serverside.maxConns': {
                                            value: 0
                                        },
                                        'serverside.pktsIn': {
                                            value: 0
                                        },
                                        'serverside.pktsOut': {
                                            value: 0
                                        },
                                        'serverside.totConns': {
                                            value: 0
                                        },
                                        sessionStatus: {
                                            description: 'enabled'
                                        },
                                        'status.availabilityState': {
                                            description: 'available'
                                        },
                                        'status.enabledState': {
                                            description: 'enabled'
                                        },
                                        'status.statusReason': {
                                            description: 'The DNS server(s) are available'
                                        },
                                        totRequests: {
                                            value: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    endpoint: '/mgmt/tm/ltm/pool/~Common~test_pool_0/stats',
                    response: {
                        kind: 'tm:ltm:pool:poolstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:pool:poolstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0/stats?ver=14.1.0',
                                    entries: {
                                        activeMemberCnt: {
                                            value: 0
                                        },
                                        availableMemberCnt: {
                                            value: 3
                                        },
                                        'connqAll.ageEdm': {
                                            value: 0
                                        },
                                        'connqAll.ageEma': {
                                            value: 0
                                        },
                                        'connqAll.ageHead': {
                                            value: 0
                                        },
                                        'connqAll.ageMax': {
                                            value: 0
                                        },
                                        'connqAll.depth': {
                                            value: 0
                                        },
                                        'connqAll.serviced': {
                                            value: 0
                                        },
                                        'connq.ageEdm': {
                                            value: 0
                                        },
                                        'connq.ageEma': {
                                            value: 0
                                        },
                                        'connq.ageHead': {
                                            value: 0
                                        },
                                        'connq.ageMax': {
                                            value: 0
                                        },
                                        'connq.depth': {
                                            value: 0
                                        },
                                        'connq.serviced': {
                                            value: 0
                                        },
                                        curPriogrp: {
                                            value: 0
                                        },
                                        curSessions: {
                                            value: 0
                                        },
                                        highestPriogrp: {
                                            value: 0
                                        },
                                        lowestPriogrp: {
                                            value: 0
                                        },
                                        memberCnt: {
                                            value: 3
                                        },
                                        minActiveMembers: {
                                            value: 0
                                        },
                                        monitorRule: {
                                            description: 'none'
                                        },
                                        tmName: {
                                            description: '/Common/test_pool_0'
                                        },
                                        'serverside.bitsIn': {
                                            value: 0
                                        },
                                        'serverside.bitsOut': {
                                            value: 0
                                        },
                                        'serverside.curConns': {
                                            value: 0
                                        },
                                        'serverside.maxConns': {
                                            value: 0
                                        },
                                        'serverside.pktsIn': {
                                            value: 0
                                        },
                                        'serverside.pktsOut': {
                                            value: 0
                                        },
                                        'serverside.totConns': {
                                            value: 0
                                        },
                                        'status.availabilityState': {
                                            description: 'unknown'
                                        },
                                        'status.enabledState': {
                                            description: 'enabled'
                                        },
                                        'status.statusReason': {
                                            description: 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet'
                                        },
                                        totRequests: {
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
