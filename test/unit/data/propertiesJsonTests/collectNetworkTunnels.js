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
    name: 'Network Tunnels stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set network tunnels to empty object if not configured',
            statsToCollect: ['networkTunnels'],
            contextToCollect: [],
            expectedData: {
                networkTunnels: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/net\/tunnels\/tunnel\/stats/,
                    response: {
                        kind: 'tm:net:tunnels:tunnel:tunnelcollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/net/tunnels/tunnel/stats?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect network tunnels stats',
            statsToCollect: ['networkTunnels'],
            contextToCollect: [],
            expectedData: {
                networkTunnels: {
                    '/Common/http-tunnel': {
                        hcInBroadcastPkts: 0,
                        hcInMulticastPkts: 0,
                        hcInOctets: 0,
                        hcInUcastPkts: 0,
                        hcOutBroadcastPkts: 0,
                        hcOutMulticastPkts: 0,
                        hcOutOctets: 0,
                        hcOutUcastPkts: 0,
                        inDiscards: 0,
                        inErrors: 0,
                        inUnknownProtos: 0,
                        outDiscards: 0,
                        outErrors: 0,
                        tenant: 'Common',
                        name: '/Common/http-tunnel'
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/net\/tunnels\/tunnel\/stats/,
                    response: {
                        kind: 'tm:net:tunnels:tunnel:tunnelcollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/net/tunnels/tunnel/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/net/tunnels/tunnel/~Common~http-tunnel/stats': {
                                nestedStats: {
                                    kind: 'tm:net:tunnels:tunnel:tunnelstats',
                                    selfLink: 'https://localhost/mgmt/tm/net/tunnels/tunnel/~Common~http-tunnel/stats?ver=14.1.0',
                                    entries: {
                                        hcInBroadcastPkts: {
                                            value: 0
                                        },
                                        hcInMulticastPkts: {
                                            value: 0
                                        },
                                        hcInOctets: {
                                            value: 0
                                        },
                                        hcInUcastPkts: {
                                            value: 0
                                        },
                                        hcOutBroadcastPkts: {
                                            value: 0
                                        },
                                        hcOutMulticastPkts: {
                                            value: 0
                                        },
                                        hcOutOctets: {
                                            value: 0
                                        },
                                        hcOutUcastPkts: {
                                            value: 0
                                        },
                                        inDiscards: {
                                            value: 0
                                        },
                                        inErrors: {
                                            value: 0
                                        },
                                        inUnknownProtos: {
                                            value: 0
                                        },
                                        tmName: {
                                            description: '/Common/http-tunnel'
                                        },
                                        outDiscards: {
                                            value: 0
                                        },
                                        outErrors: {
                                            value: 0
                                        },
                                        typeId: {
                                            description: 'net tunnels tunnel'
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
