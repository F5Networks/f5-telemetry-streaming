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
    name: 'Device Groups stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set device groups to empty object if not configured (with items property)',
            statsToCollect: ['deviceGroups'],
            contextToCollect: [],
            expectedData: {
                deviceGroups: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/cm\/device-group/,
                    response: {
                        kind: 'tm:cm:device-group:device-groupcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/cm/device-group?ver=14.1.0',
                        items: []
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set device groups to empty object if not configured (without items property)',
            statsToCollect: ['deviceGroups'],
            contextToCollect: [],
            expectedData: {
                deviceGroups: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/cm\/device-group/,
                    response: {
                        kind: 'tm:cm:device-group:device-groupcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/cm/device-group?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect device groups stats',
            statsToCollect: ['deviceGroups'],
            contextToCollect: [],
            expectedData: {
                deviceGroups: {
                    '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg': {
                        tenant: 'Common',
                        commitIdTime: '2020-01-30T07:48:42.000Z',
                        lssTime: '2020-01-30T07:48:42.000Z',
                        timeSinceLastSync: '-',
                        name: '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg',
                        type: 'sync-only'
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/cm\/device-group/,
                    response: {
                        kind: 'tm:cm:device-group:device-groupcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/cm/device-group?ver=14.1.0',
                        items: [
                            {
                                kind: 'tm:cm:device-group:device-groupstate',
                                name: 'datasync-device-ts-big-inst.localhost.localdomain-dg',
                                partition: 'Common',
                                fullPath: '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg?ver=14.1.0',
                                asmSync: 'disabled',
                                autoSync: 'enabled',
                                fullLoadOnSync: 'true',
                                incrementalConfigSyncSizeMax: 1024,
                                networkFailover: 'disabled',
                                saveOnAutoSync: 'false',
                                type: 'sync-only',
                                devicesReference: {
                                    link: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/devices?ver=14.1.0',
                                    isSubcollection: true
                                }
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/stats',
                    response: {
                        kind: 'tm:cm:device-group:device-groupstats',
                        selfLink: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg:~Common~ts-big-inst.localhost.localdomain/stats': {
                                nestedStats: {
                                    kind: 'tm:cm:device-group:device-groupstats',
                                    selfLink: 'https://localhost/mgmt/tm/cm/device-group/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg/~Common~datasync-device-ts-big-inst.localhost.localdomain-dg:~Common~ts-big-inst.localhost.localdomain/stats?ver=14.1.0',
                                    entries: {
                                        commitIdOriginator: {
                                            description: '/Common/ts-big-inst.localhost.localdomain'
                                        },
                                        commitIdTime: {
                                            description: '2020-01-30T07:48:42.000Z'
                                        },
                                        device: {
                                            description: '/Common/ts-big-inst.localhost.localdomain'
                                        },
                                        devicegroup: {
                                            description: '/Common/datasync-device-ts-big-inst.localhost.localdomain-dg'
                                        },
                                        lastSyncType: {
                                            description: 'none'
                                        },
                                        lssOriginator: {
                                            description: '/Common/ts-big-inst.localhost.localdomain'
                                        },
                                        lssTime: {
                                            description: '2020-01-30T07:48:42.000Z'
                                        },
                                        timeSinceLastSync: {
                                            description: '-'
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
