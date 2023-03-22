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

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const util = sourceCode('src/lib/utils/misc');

// min supported version for F5_Cloud
const IS_8_11_1_PLUS = util.compareVersionStrings(process.version.substring(1), '>=', '8.11.1');
const PROTO_PATH = 'src/lib/consumers/F5_Cloud/deos.proto';

let f5CloudIndex;
let grpc;
let googleAuthMock;
let protoLoader;

if (IS_8_11_1_PLUS) {
    f5CloudIndex = sourceCode('src/lib/consumers/F5_Cloud/index');
    // eslint-disable-next-line global-require
    grpc = require('@grpc/grpc-js');
    // eslint-disable-next-line global-require
    googleAuthMock = require('google-auth-library').auth;
    // eslint-disable-next-line global-require
    protoLoader = require('@grpc/proto-loader');
}

moduleCache.remember();

(IS_8_11_1_PLUS ? describe : describe.skip)('F5_Cloud', () => {
    if (!IS_8_11_1_PLUS) {
        return;
    }

    let mockServer;
    let postRequests;

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

    before(() => {
        moduleCache.restore();

        const protoDescriptor = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO_PATH));
        mockServer = new grpc.Server();
        mockServer.addService(protoDescriptor.deos.ingestion.v1alpa1.Ingestion.service, {
            Post: (call, callback) => {
                postRequests.push(call.request);
                callback(null);
            }
        });

        return new Promise((resolve, reject) => {
            mockServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err) => {
                if (err) {
                    reject(err);
                } else {
                    mockServer.start();
                    resolve();
                }
            });
        });
    });

    beforeEach(() => {
        postRequests = [];
        sinon.stub(googleAuthMock, 'fromJSON').callsFake((serviceAccount) => {
            if (serviceAccount.auth_type) {
                return mockGoodAuthClient;
            }
            return mockBadAuthClient;
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    after((done) => {
        mockServer.tryShutdown(done);
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
                    // assert.isFalse(context.logger.exception.called, 'should not have logged an exception');
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
                    assert.lengthOf(postRequests, 1);
                    assert.strictEqual(postRequests[0].accountId, 'urn:f5_cs::account:a-blabla-a');
                    assert.strictEqual(postRequests[0].payloadSchema, 'urn:f5:big-ip:event-schema:systeminfo-event:v1');
                    assert.strictEqual(postRequests[0].payload.toString('utf8'), expectedData);
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
                    const decodedData = JSON.parse(postRequests[0].payload.toString('utf8'));
                    assert.lengthOf(postRequests, 1);
                    assert.deepStrictEqual(decodedData, expectedData);
                    assert.strictEqual(postRequests[0].payloadSchema, 'urn:f5:big-ip:event-schema:custom:v1');
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
                    assert.lengthOf(postRequests, 1);
                    assert.strictEqual(postRequests[0].accountId, 'urn:f5_cs::account:a-blabla-a');
                    assert.strictEqual(postRequests[0].payloadSchema, 'urn:f5:big-ip:event-schema:raw-event:v1');
                    assert.strictEqual(postRequests[0].payload.toString('utf8'), expectedData);
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
