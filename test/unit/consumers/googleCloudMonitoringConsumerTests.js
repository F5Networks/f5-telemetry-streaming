/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const nock = require('nock');
const cloudMonitoringIndex = require('../../../src/lib/consumers/Google_Cloud_Monitoring/index');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Google_Cloud_Monitoring', () => {
    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    it('should do nothing when data is not systemInfo', () => {
        const context = {
            event: {}
        };
        return cloudMonitoringIndex(context)
            .then((result) => {
                assert.equal(result, undefined);
            })
            .catch(err => Promise.reject(err));
    });

    const context = {
        event: {
            data: {
                system: {
                    callBackUrl: 'https://1.2.3.4',
                    tmmCpu: 10,
                    tmmTraffic: {
                        'clientSideTraffic.bitsIn': 123456
                    },
                    syncStatus: 'Standalone'
                },
                telemetryEventCategory: 'systemInfo'
            },
            type: 'systemInfo'
        },
        config: {
            projectId: 'theProject',
            serviceEmail: 'serviceaccount@service.com',
            privateKeyId: '12345',
            privateKey: 'theprivatekeyvalue'
        }
    };

    beforeEach(() => {
        sinon.stub(jwt, 'sign').returns('somejsonwebtoken');
        nock('https://monitoring.googleapis.com/v3/projects/theProject/metricDescriptors')
            .get('')
            .reply(
                200,
                {
                    metricDescriptors: [
                        {
                            name: 'projects/projectId/metricDescriptors/custom.googleapis.com/system/tmmCpu',
                            metricKind: 'GAUGE',
                            valueType: 'INT64',
                            type: 'custom.googleapis.com/system/tmmCpu'
                        }
                    ]
                }
            );
        nock('https://monitoring.googleapis.com/v3/projects/theProject/metricDescriptors')
            .post(
                '',
                {
                    type: 'custom.googleapis.com/system/tmmTraffic/clientSideTraffic.bitsIn',
                    metricKind: 'GAUGE',
                    valueType: 'INT64'
                }
            )
            .reply(200, {});
        nock('https://monitoring.googleapis.com/v3/projects/theProject/timeSeries')
            .post(
                '',
                {
                    timeSeries: [
                        {
                            metric: {
                                type: 'custom.googleapis.com/system/tmmCpu'
                            },
                            points: [
                                {
                                    value: {
                                        int64Value: 10
                                    },
                                    interval: {
                                        endTime: {
                                            seconds: /[0-9]*/
                                        }
                                    }
                                }
                            ],
                            resource: {
                                type: 'generic_node',
                                labels: {
                                    location: 'global'
                                }
                            }
                        },
                        {
                            metric: {
                                type: 'custom.googleapis.com/system/tmmTraffic/clientSideTraffic.bitsIn'
                            },
                            points: [
                                {
                                    value: {
                                        int64Value: 123456
                                    },
                                    interval: {
                                        endTime: {
                                            seconds: /[0-9]*/
                                        }
                                    }
                                }
                            ],
                            resource: {
                                type: 'generic_node',
                                labels: {
                                    location: 'global'
                                }
                            }
                        }
                    ]
                }
            )
            .reply(200, {});
    });

    it('should process systemInfo data', () => {
        nock('https://oauth2.googleapis.com/token')
            .post('')
            .reply(200, { access_token: 'hereHaveSomeAccess' });

        return assert.isFulfilled(cloudMonitoringIndex(context))
            .then(() => {
                assert.ok(nock.isDone());
            });
    });
});
