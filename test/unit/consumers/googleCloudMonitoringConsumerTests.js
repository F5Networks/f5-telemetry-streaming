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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const nock = require('nock');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const cloudMonitoringIndex = sourceCode('src/lib/consumers/Google_Cloud_Monitoring/index');
const logger = sourceCode('src/lib/logger');
const tracerMgr = sourceCode('src/lib/tracerManager');

moduleCache.remember();

describe('Google_Cloud_Monitoring', () => {
    const originContext = {
        event: {
            data: {
                system: {
                    hostname: 'localhost.localdomain',
                    machineId: '00000000-0000-0000-0000-000000000000',
                    callBackUrl: 'https://192.168.0.1',
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
    const getOriginTimeSeries = () => ({
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
                                seconds: Date.now() / 1000
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
                                seconds: Date.now() / 1000
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
    });
    const metricDescriptors = {
        onGet: {
            metricDescriptors: [
                {
                    name: 'projects/projectId/metricDescriptors/custom.googleapis.com/system/tmmCpu',
                    metricKind: 'GAUGE',
                    valueType: 'INT64',
                    type: 'custom.googleapis.com/system/tmmCpu'
                }
            ]
        },
        onPost: {
            type: 'custom.googleapis.com/system/tmmTraffic/clientSideTraffic.bitsIn',
            metricKind: 'GAUGE',
            valueType: 'INT64'
        }
    };
    const tokenDuration = 3600;

    let context;
    let clock;
    let loggerStub;
    let tracerStub;
    let persistentTime = 0;

    const incrementPersistentTime = () => {
        persistentTime += tokenDuration * 1000;
        clock.clockForward(tokenDuration * 1000, { repeat: 1 });
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        clock = stubs.clock({ fakeTimersOpts: persistentTime });
        // Increment persistent time before each test, so any cached tokens are are expired
        incrementPersistentTime();

        const coreStubs = stubs.default.coreStub({ logger: true, tracer: true });

        loggerStub = coreStubs.logger;
        tracerStub = coreStubs.tracer;
        // Returned signed JWT in format: privateKeyId::privateKey
        sinon.stub(jwt, 'sign').callsFake((_, secret, options) => `${options.header.kid}::${secret}`);

        context = testUtil.deepCopy(originContext);
        context.logger = logger.getChild('gcm');
        context.tracer = tracerMgr.fromConfig({ path: 'gcm' });
    });

    afterEach(() => tracerMgr.unregisterAll()
        .then(() => {
            testUtil.checkNockActiveMocks();
            testUtil.nockCleanup();
            sinon.restore();
        }));

    it('should do nothing when data is not systemInfo', () => {
        context = {
            event: {}
        };
        return cloudMonitoringIndex(context)
            .then((result) => {
                assert.equal(result, undefined);
            })
            .catch((err) => Promise.reject(err));
    });

    it('should process systemInfo data', () => {
        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
            .reply(200, {});

        return cloudMonitoringIndex(context)
            .then(() => tracerStub.waitForData())
            .then(() => {
                assert.deepStrictEqual(tracerStub.data.gcm[0].data, getOriginTimeSeries(), 'should write data to tracer');
                assert.includeMatch(loggerStub.messages.all, '[telemetry.gcm] success', 'should log success message');
            });
    });

    it('should process systemInfo data, when metadata reporting enabled', () => {
        const expectedTimeSeries = testUtil.deepCopy(getOriginTimeSeries());
        expectedTimeSeries.timeSeries.forEach((series) => {
            series.resource = {
                type: 'gce_instance',
                labels: {
                    instance_id: '12345678',
                    zone: 'us-west1-a'
                }
            };
        });

        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/timeSeries', expectedTimeSeries)
            .reply(200, {});

        context.config.reportInstanceMetadata = true;
        context.metadata = {
            hostname: 'myHost',
            id: 12345678,
            zone: 'projects/87654321/zones/us-west1-a'
        };
        return cloudMonitoringIndex(context);
    });

    it('should process systemInfo data, when metadata reporting disabled', () => {
        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/timeSeries', getOriginTimeSeries())
            .reply(200, {});

        context.config.reportInstanceMetadata = false;
        context.metadata = {
            hostname: 'myHost',
            id: 12345678,
            zone: 'projects/87654321/zones/us-west1-a'
        };
        return cloudMonitoringIndex(context);
    });

    it('should process systemInfo data, with a cached access token', () => {
        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === '12345::theprivatekeyvalue')
            .times(2)
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .times(3)
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .times(3)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
            .times(2)
            .reply(200, {});

        return cloudMonitoringIndex(context)
            .then(() => cloudMonitoringIndex(context))
            .then(() => {
                // Increment the clock, to expire token
                incrementPersistentTime();
                nock('https://monitoring.googleapis.com', {
                    reqheaders: {
                        authorization: 'Bearer aToken'
                    }
                })
                    .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
                    .times(1)
                    .reply(200, {});
                return cloudMonitoringIndex(context);
            })
            .then(() => {
                assert.lengthOf(
                    loggerStub.messages.all.filter((r) => r === '[telemetry.gcm] success'),
                    3,
                    'should log success messages'
                );
            });
    });

    it('should process systemInfo data, with multiple cached access tokens', () => {
        // Private Key 1 nocks
        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === 'privateKey1::firstKey')
            .reply(200, { access_token: 'accessTokenOne', expires_in: tokenDuration });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer accessTokenOne'
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .times(2)
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer accessTokenOne'
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .times(2)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer accessTokenOne'
            }
        })
            .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
            .times(2)
            .reply(200, {});

        // Private Key 2 nocks
        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === 'privateKey2::secondKey')
            .reply(200, { access_token: 'accessTokenTwo', expires_in: tokenDuration });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer accessTokenTwo'
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .times(2)
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer accessTokenTwo'
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .times(2)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: 'Bearer accessTokenTwo'
            }
        })
            .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
            .times(2)
            .reply(200, {});

        const context1 = testUtil.deepCopy(context);
        Object.assign(context1.config, { privateKeyId: 'privateKey1', privateKey: 'firstKey' });
        const context2 = testUtil.deepCopy(context);
        Object.assign(context2.config, { privateKeyId: 'privateKey2', privateKey: 'secondKey' });

        return cloudMonitoringIndex(context1)
            .then(() => cloudMonitoringIndex(context2))
            .then(() => cloudMonitoringIndex(context1))
            .then(() => cloudMonitoringIndex(context2))
            .then(() => assert.lengthOf(
                loggerStub.messages.all.filter((r) => r === '[telemetry.gcm] success'),
                4,
                'should log success messages'
            ));
    });

    it('should invalidate token if Unauthorized error on sending data', () => {
        let tokenCounter = 0;

        nock('https://oauth2.googleapis.com')
            .post('/token', (body) => body.assertion === '12345::theprivatekeyvalue')
            .times(2)
            .reply(200, () => {
                tokenCounter += 1;
                return { access_token: `token:${tokenCounter}`, expires_in: tokenDuration };
            });

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: (a) => a === `Bearer token:${tokenCounter}`
            }
        })
            .get('/v3/projects/theProject/metricDescriptors')
            .times(2)
            .reply(200, metricDescriptors.onGet);

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: (a) => a === `Bearer token:${tokenCounter}`
            }
        })
            .post('/v3/projects/theProject/metricDescriptors', metricDescriptors.onPost)
            .times(2)
            .reply(200, {});

        nock('https://monitoring.googleapis.com', {
            reqheaders: {
                authorization: (a) => a === `Bearer token:${tokenCounter}`
            }
        })
            .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
            .reply(401, 'Unauthorized')
            .post('/v3/projects/theProject/timeSeries', testUtil.deepCopy(getOriginTimeSeries()))
            .reply(200, {});

        return cloudMonitoringIndex(context)
            .then(() => cloudMonitoringIndex(context))
            .then(() => {
                assert.includeMatch(loggerStub.messages.all, '[telemetry.gcm] error: Bad status code: 401');
            });
    });
});
