/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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

const cloudLoggingIndex = sourceCode('src/lib/consumers/Google_Cloud_Logging/index');

moduleCache.remember();

// Note: if a test has no explicit assertions then it relies on 'checkNockActiveMocks' in 'afterEach'
describe('Google_Cloud_Logging', () => {
    const tokenDuration = 3600;

    let clock;
    let persistentTime = 0;

    const incrementPersistentTime = () => {
        persistentTime += tokenDuration * 1000;
        clock.clockForward(tokenDuration * 1000, { repeat: 1 });
    };

    const getDefaultConsumerConfig = () => testUtil.deepCopy({
        logScope: 'projects',
        logScopeId: 'myProject',
        logId: 'thisIsMyLog',
        serviceEmail: 'serviceaccount@service.com',
        privateKeyId: '12345',
        privateKey: 'theprivatekeyvalue',
        reportInstanceMetadata: false
    });

    const getExpectedData = (entries, opts) => {
        opts = opts || {};
        return {
            logName: opts.logName || 'projects/myProject/logs/thisIsMyLog',
            resource: opts.resource || {
                type: 'generic_node',
                labels: {
                    node_id: 'telemetry.bigip.com',
                    location: 'global'
                }
            },
            entries
        };
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        clock = stubs.clock({ fakeTimersOpts: persistentTime });
        // Increment persistent time before each test, so any cached tokens are are expired
        incrementPersistentTime();

        // Returned signed JWT in format: privateKeyId::privateKey
        sinon.stub(jwt, 'sign').callsFake((_, secret, options) => `${options.header.kid}::${secret}`);
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        nock.cleanAll();
        sinon.restore();
    });

    it('should process data (eventType = systemInfo)', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, getExpectedData([{
                jsonPayload: testUtil.deepCopy(
                    context.event.data
                )
            }])));

        return cloudLoggingIndex(context);
    });

    it('should process data (eventType = AVR)', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'AVR',
            config: getDefaultConsumerConfig()
        });

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, getExpectedData([{
                jsonPayload: testUtil.deepCopy(
                    context.event.data
                )
            }])));

        return cloudLoggingIndex(context);
    });

    it('should process data (dataType = string)', () => {
        const context = testUtil.buildConsumerContext({
            config: getDefaultConsumerConfig()
        });
        context.event.data = 'some random string we make get';

        const expectedData = getExpectedData(
            [{ textPayload: testUtil.deepCopy(context.event.data) }],
            {
                resource: {
                    type: 'generic_node',
                    labels: {
                        location: 'global'
                    }
                }
            }
        );

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(context);
    });

    it('should log and trace data', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });
        const expectedData = getExpectedData(
            [{ jsonPayload: testUtil.deepCopy(context.event.data) }]
        );

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(context)
            .then(() => {
                const traceRecord = context.tracer.write.args[0];
                assert.strictEqual(context.logger.error.callCount, 0, 'should not log error');
                assert.deepStrictEqual(context.logger.debug.args, [['success']], 'should log success');
                assert.deepStrictEqual(
                    traceRecord,
                    [expectedData],
                    'trace should include expected data'
                );
            });
    });

    it('should process data, when metadata reporting enabled', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });
        context.config.reportInstanceMetadata = true;
        context.metadata = {
            hostname: 'myHost',
            id: 12345678,
            zone: 'projects/87654321/zones/us-west1-a'
        };

        const expectedData = getExpectedData(
            [{ jsonPayload: testUtil.deepCopy(context.event.data) }],
            {
                resource: {
                    type: 'gce_instance',
                    labels: {
                        instance_id: '12345678',
                        zone: 'us-west1-a'
                    }
                }
            }
        );

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(context);
    });

    it('should process data, when metadata reporting disabled', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });
        context.metadata = {
            hostname: 'myHost',
            id: 12345678,
            zone: 'projects/87654321/zones/us-west1-a'
        };

        const expectedData = getExpectedData(
            [{ jsonPayload: testUtil.deepCopy(context.event.data) }]
        );

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(context);
    });

    it('should process systemInfo data, with a cached access token', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });

        const expectedData = getExpectedData(
            [{ jsonPayload: testUtil.deepCopy(context.event.data) }]
        );

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .times(2)
            .reply(200, { access_token: 'aToken', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer aToken'
            }
        })
            .post('')
            .times(3)
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(context)
            .then(() => cloudLoggingIndex(context))
            .then(() => {
                incrementPersistentTime();
                return cloudLoggingIndex(context);
            })
            .then(() => {
                assert.deepStrictEqual(
                    context.logger.debug.args,
                    Array(3).fill(['success']),
                    'should have 3 successful messages'
                );
            });
    });

    it('should process systemInfo data, with multiple cached access tokens', () => {
        // Context A
        const contextA = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });
        Object.assign(contextA.config, { privateKeyId: 'privateKey1', privateKey: 'firstKey' });

        // Context B
        const contextB = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });
        Object.assign(contextB.config, { privateKeyId: 'privateKey2', privateKey: 'secondKey' });

        const expectedData = getExpectedData(
            [{ jsonPayload: testUtil.deepCopy(contextA.event.data) }]
        );

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === 'privateKey1::firstKey')
            .reply(200, { access_token: 'tokenA', expires_in: tokenDuration });

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === 'privateKey2::secondKey')
            .reply(200, { access_token: 'tokenB', expires_in: tokenDuration });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer tokenA'
            }
        })
            .post('')
            .times(2)
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: 'Bearer tokenB'
            }
        })
            .post('')
            .times(2)
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(contextA)
            .then(() => cloudLoggingIndex(contextB))
            .then(() => cloudLoggingIndex(contextA))
            .then(() => cloudLoggingIndex(contextB));
    });

    it('should invalidate token if Unauthorized error on sending data', () => {
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config: getDefaultConsumerConfig()
        });

        const expectedData = getExpectedData(
            [{ jsonPayload: testUtil.deepCopy(context.event.data) }]
        );
        let tokenCounter = 0;

        nock('https://oauth2.googleapis.com/token')
            .post('', (body) => body.assertion === '12345::theprivatekeyvalue')
            .times(2)
            .reply(200, () => {
                tokenCounter += 1;
                return { access_token: `token:${tokenCounter}`, expires_in: tokenDuration };
            });

        nock('https://logging.googleapis.com/v2/entries:write', {
            reqheaders: {
                authorization: (a) => a === `Bearer token:${tokenCounter}`
            }
        })
            .post('')
            .reply(401, (_, req) => {
                assert.deepStrictEqual(req, expectedData);
                return 'Unauthorized';
            })
            .post('')
            .reply(200, (_, req) => assert.deepStrictEqual(req, expectedData));

        return cloudLoggingIndex(context)
            .then(() => cloudLoggingIndex(context));
    });
});
