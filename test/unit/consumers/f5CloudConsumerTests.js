/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
/* eslint-disable global-require */

require('../shared/restoreCache')();
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const testUtil = require('../shared/util');
const util = require('../../../src/lib/utils/misc');

let f5CloudIndex;
let google;
let auth;
try {
    f5CloudIndex = require('../../../src/lib/consumers/F5_Cloud/index');
    google = require('google-auth-library');
    auth = google.auth;
} catch (e) {
    f5CloudIndex = null;
    google = null;
    google = null;
    auth = null;
}
chai.use(chaiAsPromised);
const assert = chai.assert;
const F5_CLOUD_NODE_SUPPORTED_VERSION = '8.11.1';
const PROTO_PATH = `${__dirname}/../../../src/lib/consumers/F5_Cloud/deos.proto`;

describe('F5_Cloud', () => {
    if (util.compareVersionStrings(process.version.substring(1), '<', F5_CLOUD_NODE_SUPPORTED_VERSION)) {
        return;
    }
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
            type: 'service_account',
            projectId: 'deos-dev',
            privateKeyId: '11111111111111111111111',
            privateKey: {
                cipherText: '-----BEGIN PRIVATE KEY-----\nPRIVATEKEY'
            },
            clientEmail: 'test@deos-dev.iam.gserviceaccount.com',
            clientId: '1212121212121212121212',
            authUri: 'https://accounts.google.com/o/oauth2/auth',
            tokenUri: 'https://oauth2.googleapis.com/token',
            authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
            clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40deos-dev.iam.gserviceaccount.com'
        },
        targetAudience: '0.0.0.0',
        useSSL: false,
        port: 50051
    };

    const mockBadAuthClient = {
        authorize: () => new Promise((resolve, reject) => {
            reject(new Error('failed!'));
        })
    };

    const mockGoodAuthClient = {
        authorize: () => new Promise(((resolve) => {
            resolve();
        })),
        gtoken: {
            rawToken: {
                id_token: 'fakeIdToken'
            }
        }
    };

    const grpcMock = require('grpc-mock'); // eslint-disable-line global-require
    const mockServer = grpcMock.createMockServer({
        protoPath: PROTO_PATH,
        packageName: 'deos.ingestion.v1alpa1',
        serviceName: 'Ingestion',
        rules: [
            { method: 'Post', input: '.*', output: '{}' }
        ]
    });

    before((done) => {
        sinon.stub(auth, 'fromJSON').callsFake((serviceAccount) => {
            if (serviceAccount.type) {
                return mockGoodAuthClient;
            }
            return mockBadAuthClient;
        });
        mockServer.listen('0.0.0.0:50051');
        done();
    });

    afterEach(() => {
        mockServer.clearInteractions();
    });

    after(() => {
        sinon.restore();
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
                    if (client) {
                        client.close();
                    }
                });
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                config: DEFAULT_CONSUMER_CONFIG,
                eventType: 'systemInfo'
            });
            const expectedData = testUtil.deepCopy(context.event.data);
            return f5CloudIndex(context)
                .then((client) => {
                    if (client) {
                        const a = mockServer.getInteractionsOn('Post');
                        assert.lengthOf(a, 1);
                        assert.equal(JSON.stringify(expectedData), a[0].payload.toString('utf8'));
                        client.close();
                    }
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
                    if (client) {
                        const a = mockServer.getInteractionsOn('Post');
                        assert.lengthOf(a, 1);
                        const decodedData = JSON.parse(a[0].payload.toString('utf8'));
                        assert.deepEqual(expectedData, decodedData);
                        assert.equal(expectedSchemaLabel, a[0].payloadSchema.split(':')[4]);
                        client.close();
                    }
                })
                .catch(err => assert(false, err));
        });

        it('should fail in GCP auth', () => {
            const configCopy = testUtil.deepCopy(DEFAULT_CONSUMER_CONFIG);
            configCopy.serviceAccount = {};
            const context = testUtil.buildConsumerContext({
                config: configCopy,
                eventType: 'systemInfo'
            });
            return f5CloudIndex(context);
        });
    });
});
