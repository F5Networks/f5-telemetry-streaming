/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

chai.use(chaiAsPromised);
const assert = chai.assert;

const stackDriverIndex = require('../../../src/lib/consumers/Google_StackDriver/index');

describe('Google_StackDriver', () => {
    it('should do nothing when data is not systemInfo', () => {
        const context = {
            event: {}
        };
        return stackDriverIndex(context)
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
            privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0FPqri0cb2JZfXJ/DgYSF6vUp\nwmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/3j+skZ6UtW+5u09lHNsj6tQ5\n1s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQABAoGAFijko56+qGyN8M0RVyaRAXz++xTqHBLh\n3tx4VgMtrQ+WEgCjhoTwo23KMBAuJGSYnRmoBZM3lMfTKevIkAidPExvYCdm5dYq3XToLkkLv5L2\npIIVOFMDG+KESnAFV7l2c+cnzRMW0+b6f8mR1CJzZuxVLL6Q02fvLi55/mbSYxECQQDeAw6fiIQX\nGukBI4eMZZt4nscy2o12KyYner3VpoeE+Np2q+Z3pvAMd/aNzQ/W9WaI+NRfcxUJrmfPwIGm63il\nAkEAxCL5HQb2bQr4ByorcMWm/hEP2MZzROV73yF41hPsRC9m66KrheO9HPTJuo3/9s5p+sqGxOlF\nL0NDt4SkosjgGwJAFklyR1uZ/wPJjj611cdBcztlPdqoxssQGnh85BzCj/u3WqBpE2vjvyyvyI5k\nX6zk7S0ljKtt2jny2+00VsBerQJBAJGC1Mg5Oydo5NwD6BiROrPxGo2bpTbu/fhrT8ebHkTz2epl\nU9VQQSQzY1oZMVX8i1m5WUTLPz2yLJIBQVdXqhMCQBGoiuSoSjafUhV7i1cEGpb88h5NBYZzWXGZ\n37sJ5QsW+sJyoNde3xH8vdXhzU7eT82D6X/scw9RZz+/6rCJ4p0=\n-----END RSA PRIVATE KEY-----\n'
        }
    };
    beforeEach(() => {
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

    afterEach(() => {
        nock.cleanAll();
    });

    it('should process systemInfo data', () => {
        nock('https://oauth2.googleapis.com/token')
            .post('')
            .reply(200, { access_token: 'hereHaveSomeAccess' });

        return assert.isFulfilled(stackDriverIndex(context))
            .then(() => {
                assert.ok(nock.isDone());
            });
    });
});
