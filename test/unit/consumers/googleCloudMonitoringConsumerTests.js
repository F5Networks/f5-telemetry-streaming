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
const jwt = require('jsonwebtoken');
const nock = require('nock');
const sinon = require('sinon');

const cloudMonitoringIndex = require('../../../src/lib/consumers/Google_Cloud_Monitoring/index');
const logger = require('../../../src/lib/logger');
const stubs = require('../shared/stubs');
const testAssert = require('../shared/assert');
const testUtil = require('../shared/util');
const tracer = require('../../../src/lib/utils/tracer');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Google_Cloud_Monitoring', () => {
    const originContext = {
        event: {
            data: {
                system: {
                    hostname: 'localhost.localdomain',
                    machineId: '00000000-0000-0000-0000-000000000000',
                    callBackUrl: 'https://1.2.3.4',
                    tmmCpu: 10,
                    tmmTraffic: {
                        'clientSideTraffic.bitsIn': 123456
                    },
                    syncStatus: 'Standalone',
                    diskStorage: {
                        '/': {
                            Capacity_Float: 10.10
                        },
                        '/var': {
                            Capacity_Float: 0
                        }
                    }
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
    const originTimeSeries = {
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
                                seconds: 1000
                            }
                        }
                    }
                ],
                resource: {
                    type: 'generic_node',
                    labels: {
                        location: 'global',
                        namespace: 'localhost.localdomain',
                        node_id: '00000000-0000-0000-0000-000000000000'
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
                                seconds: 1000
                            }
                        }
                    }
                ],
                resource: {
                    type: 'generic_node',
                    labels: {
                        location: 'global',
                        namespace: 'localhost.localdomain',
                        node_id: '00000000-0000-0000-0000-000000000000'
                    }
                }
            }
        ]
    };

    let context;
    let loggerStub;
    let tracerStub;

    beforeEach(() => {
        stubs.clock({ fakeTimersOpts: 1000000 });
        loggerStub = stubs.logger(logger);
        tracerStub = stubs.tracer(tracer);

        context = testUtil.deepCopy(originContext);
        context.logger = logger.getChild('gcm');
        context.tracer = tracer.getOrCreate('gcm', 'gcm');

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
            .post('', testUtil.deepCopy(originTimeSeries))
            .reply(200, {});
    });

    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    it('should do nothing when data is not systemInfo', () => {
        context = {
            event: {}
        };
        return cloudMonitoringIndex(context)
            .then((result) => {
                assert.equal(result, undefined);
            })
            .catch(err => Promise.reject(err));
    });

    it('should process systemInfo data', () => {
        nock('https://oauth2.googleapis.com/token')
            .post('')
            .reply(200, { access_token: 'hereHaveSomeAccess' });

        return cloudMonitoringIndex(context)
            .then(() => {
                assert.ok(nock.isDone());
                assert.deepStrictEqual(tracerStub.data.gcm, [originTimeSeries], 'should write data to tracer');
                testAssert.includeMatch(loggerStub.messages.all, '[telemetry.gcm] success', 'should log success message');
            });
    });
});
