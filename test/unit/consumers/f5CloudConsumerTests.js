/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const testUtil = require('../shared/util');
const util = require('../../../src/lib/utils/misc');

const assert = chai.assert;
const F5_CLOUD_NODE_SUPPORTED_VERSION = '8.11.1';
const PROTO_PATH = `${__dirname}/../../../src/lib/consumers/F5_Cloud/deos.proto`;

chai.use(chaiAsPromised);

moduleCache.remember();

describe('F5_Cloud', () => {
    if (util.compareVersionStrings(process.version.substring(1), '<', F5_CLOUD_NODE_SUPPORTED_VERSION)) {
        return;
    }
    // Require libraries that need later versions of Node after Node version check
    /* eslint-disable global-require */
    const f5CloudIndex = require('../../../src/lib/consumers/F5_Cloud/index');
    const grpcMock = require('grpc-mock');
    const googleAuthMock = require('google-auth-library').auth;
    /* eslint-enable global-require */

    const DEFAULT_CONSUMER_CONFIG = {
        allowSelfSignedCert: true,
        class: 'Telemetry_Consumer',
        type: 'F5_Cloud',
        enable: true,
        trace: true,
        f5csTenantId: 'a-blabla-a',
        f5csSensorId: '12345',
        payloadSchemaNid: 'f5',
        serviceAccount: { // mock
            authType: 'google-auth',
            projectId: 'deos-dev',
            privateKeyId: '11111111111111111111111',
            privateKey: {
                cipherText: 'privateKeyValue'
            },
            clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
            clientId: '1212121212121212121212',
            authUri: 'https://accounts.google.com/o/oauth2/auth',
            tokenUri: 'https://oauth2.googleapis.com/token',
            authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
            clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
        },
        eventSchemaVersion: '1',
        targetAudience: '0.0.0.0',
        useSSL: false,
        port: 50051
    };

    const mockBadAuthClient = {
        authorize: () => Promise.reject(new Error('reject in mock'))
    };

    const mockGoodAuthClient = {
        authorize: () => Promise.resolve(),
        gtoken: {
            rawToken: {
                id_token: 'fakeIdToken'
            }
        }
    };

    const mockServer = grpcMock.createMockServer({
        protoPath: PROTO_PATH,
        packageName: 'deos.ingestion.v1alpa1',
        serviceName: 'Ingestion',
        rules: [
            { method: 'Post', input: '.*', output: '{}' }
        ]
    });

    before(() => {
        moduleCache.restore();
        mockServer.listen('0.0.0.0:50051');
    });

    beforeEach(() => {
        sinon.stub(googleAuthMock, 'fromJSON').callsFake((serviceAccount) => {
            if (serviceAccount.auth_type) {
                return mockGoodAuthClient;
            }
            return mockBadAuthClient;
        });
    });

    afterEach(() => {
        sinon.restore();
        mockServer.clearInteractions();
    });

    after(() => {
        mockServer.close(true);
    });

    describe('process', () => {
        it('should POST using default request options', () => {
            const context = testUtil.buildConsumerContext({
                config: DEFAULT_CONSUMER_CONFIG,
                eventType: 'systemInfo'
            });
            return f5CloudIndex(context)
                .then((client) => {
                    client.close();
                    assert.isFalse(context.logger.exception.called, 'should not have logged an exception');
                });
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                config: DEFAULT_CONSUMER_CONFIG,
                eventType: 'systemInfo'
            });
            const expectedData = JSON.stringify(context.event.data);
            return f5CloudIndex(context)
                .then((client) => {
                    const mockResponses = mockServer.getInteractionsOn('Post');
                    assert.lengthOf(mockResponses, 1);
                    assert.strictEqual(mockResponses[0].accountId, 'urn:f5_cs::account:a-blabla-a');
                    assert.strictEqual(mockResponses[0].payloadSchema, 'urn:f5:big-ip:event-schema:systeminfo-event:v1');
                    assert.strictEqual(mockResponses[0].payload.toString('utf8'), expectedData);
                    client.close();
                });
        });

        it('should process custom label data for custom endpoint', () => {
            const context = testUtil.buildConsumerContext({
                config: DEFAULT_CONSUMER_CONFIG,
                eventType: 'systemInfo'
            });
            const expectedSchemaLabel = 'custom';
            const expectedData = testUtil.deepCopy(context.event.data);
            const newObject = {};
            Object.keys(context.event.data).forEach((key) => {
                const value = context.event.data[key];
                if (typeof value !== 'string') {
                    const originalLabel = key;
                    const newLabel = `${expectedSchemaLabel}:${originalLabel}`;
                    newObject[newLabel] = expectedData[originalLabel];
                } else {
                    newObject[key] = value;
                }
            });
            context.event.data = newObject;
            context.event.isCustom = true;
            return f5CloudIndex(context)
                .then((client) => {
                    const mockResponses = mockServer.getInteractionsOn('Post');
                    const decodedData = JSON.parse(mockResponses[0].payload.toString('utf8'));
                    assert.lengthOf(mockResponses, 1);
                    assert.deepStrictEqual(decodedData, expectedData);
                    assert.strictEqual(mockResponses[0].payloadSchema, 'urn:f5:big-ip:event-schema:custom:v1');
                    client.close();
                });
        });

        it('should send raw event data in correct format', () => {
            const context = testUtil.buildConsumerContext({
                config: DEFAULT_CONSUMER_CONFIG,
                eventType: 'raw'
            });
            context.event.data = {
                data: '{"key1":"value1","$F5TelemetryEventCategory":"raw","key3":"value3"}'
            };
            const expectedData = testUtil.deepCopy(context.event.data.data);
            return f5CloudIndex(context)
                .then((client) => {
                    const mockResponses = mockServer.getInteractionsOn('Post');
                    assert.lengthOf(mockResponses, 1);
                    assert.strictEqual(mockResponses[0].accountId, 'urn:f5_cs::account:a-blabla-a');
                    assert.strictEqual(mockResponses[0].payloadSchema, 'urn:f5:big-ip:event-schema:raw-event:v1');
                    assert.strictEqual(mockResponses[0].payload.toString('utf8'), expectedData);
                    client.close();
                });
        });

        it('should fail in GCP auth', () => {
            const context = testUtil.buildConsumerContext({
                config: DEFAULT_CONSUMER_CONFIG,
                eventType: 'systemInfo'
            });
            context.config.serviceAccount = {};
            return f5CloudIndex(context)
                .then(() => {
                    assert.deepStrictEqual(
                        context.logger.exception.args[0][0].message,
                        'reject in mock',
                        'should have logged an exception on error'
                    );
                });
        });
    });
});
