/**
 * Copyright 2026 F5, Inc.
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

const moduleCache = require('@f5-telemetry-tests/unit-shared/requireCache')();
const assert = require('@f5-telemetry-tests/unit-shared/assert');
const rootDir = require('@f5-telemetry-tests/common/rootdir');
const sinon = require('sinon');
const testUtil = require('@f5-telemetry-tests/unit-shared/util');

const promiseUtil = rootDir.appImport('lib/utils/promise');
const requestsUtil = rootDir.appImport('lib/utils/requests');
const consumer = rootDir.appImport('lib/consumers/Azure_Monitor_Logs_Ingestion/index');
const avrData = require('@f5-telemetry-tests/unit-shared/data/avrData.json');
const ltmData = require('@f5-telemetry-tests/unit-shared/data/ltmData.json');

moduleCache.remember();

describe('Azure_Monitor_Logs_Ingestion', () => {
    let requests;

    const buildConfig = (suffix) => ({
        tenantId: `tenant-${suffix}`,
        clientId: `client-${suffix}`,
        clientSecret: 'secret',
        dataCollectionEndpoint: 'https://example.ingest.monitor.azure.com/',
        dataCollectionRuleImmutableId: 'dcr-0123456789abcdef',
        streamMappings: {
            LTM: 'Custom-F5Telemetry_LTM_CL',
            system: 'Custom-F5Telemetry_system_CL',
            ASM: 'Custom-F5Telemetry_ASM_CL',
            AVR: 'Custom-F5Telemetry_AVR_CL'
        },
        maxRetryAttempts: 1,
        allowSelfSignedCert: false
    });

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        requests = [];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should acquire a token and send an LTM event to the configured stream', () => {
        sinon.stub(requestsUtil, 'makeRequest').callsFake((options) => {
            requests.push(options);
            if (options.fullURI.indexOf('/oauth2/v2.0/token') !== -1) {
                return Promise.resolve({
                    access_token: 'access-token',
                    expires_in: 3600
                });
            }
            return Promise.resolve([{}, { statusCode: 204 }]);
        });

        const context = testUtil.buildConsumerContext({
            eventType: 'LTM',
            config: buildConfig('ltm')
        });
        context.event.data = JSON.parse(JSON.stringify(ltmData));

        return consumer(context)
            .then(() => {
                const expectedData = JSON.parse(JSON.stringify(ltmData));
                expectedData.f5tenant = expectedData.tenant;
                delete expectedData.tenant;

                assert.strictEqual(requests.length, 2);
                assert.strictEqual(
                    requests[0].fullURI,
                    'https://login.microsoftonline.com/tenant-ltm/oauth2/v2.0/token'
                );
                assert.strictEqual(requests[0].json, false);
                assert.include(requests[0].body, 'grant_type=client_credentials');
                assert.include(requests[0].body, 'scope=https%3A%2F%2Fmonitor.azure.com%2F.default');

                assert.strictEqual(
                    requests[1].fullURI,
                    'https://example.ingest.monitor.azure.com/dataCollectionRules/'
                    + 'dcr-0123456789abcdef/streams/Custom-F5Telemetry_LTM_CL?api-version=2023-01-01'
                );
                assert.deepStrictEqual(requests[1].headers, {
                    Authorization: 'Bearer access-token',
                    'Content-Type': 'application/json'
                });
                assert.deepStrictEqual(requests[1].body, [expectedData]);
            });
    });

    it('should route only configured system poller categories', () => {
        sinon.stub(requestsUtil, 'makeRequest').callsFake((options) => {
            requests.push(options);
            if (options.fullURI.indexOf('/oauth2/v2.0/token') !== -1) {
                return Promise.resolve({
                    access_token: 'system-token',
                    expires_in: 3600
                });
            }
            return Promise.resolve([{}, { statusCode: 204 }]);
        });

        const config = buildConfig('system');
        config.streamMappings = {
            system: 'Custom-F5Telemetry_system_CL'
        };
        const context = testUtil.buildConsumerContext({
            eventType: 'systemInfo',
            config
        });
        context.event.data = {
            system: {
                hostname: 'bigip.example.com',
                version: '17.1.0'
            },
            virtualServers: {
                '/Common/app': {
                    name: '/Common/app'
                }
            }
        };

        return consumer(context)
            .then(() => {
                assert.strictEqual(requests.length, 2);
                assert.include(requests[1].fullURI, '/streams/Custom-F5Telemetry_system_CL?');
                assert.deepStrictEqual(requests[1].body, [{
                    hostname: 'bigip.example.com',
                    version: '17.1.0'
                }]);
            });
    });

    it('should refresh the token once after an unauthorized ingestion response', () => {
        let tokenRequests = 0;
        let ingestionRequests = 0;
        sinon.stub(requestsUtil, 'makeRequest').callsFake((options) => {
            requests.push(options);
            if (options.fullURI.indexOf('/oauth2/v2.0/token') !== -1) {
                tokenRequests += 1;
                return Promise.resolve({
                    access_token: `access-token-${tokenRequests}`,
                    expires_in: 3600
                });
            }
            ingestionRequests += 1;
            return Promise.resolve([
                {},
                { statusCode: ingestionRequests === 1 ? 401 : 204 }
            ]);
        });

        const context = testUtil.buildConsumerContext({
            eventType: 'ASM',
            config: buildConfig('refresh')
        });
        context.event.data = {
            hostname: 'bigip.example.com',
            telemetryEventCategory: 'ASM'
        };

        return consumer(context)
            .then(() => {
                assert.strictEqual(tokenRequests, 2);
                assert.strictEqual(ingestionRequests, 2);
                assert.strictEqual(requests[1].headers.Authorization, 'Bearer access-token-1');
                assert.strictEqual(requests[3].headers.Authorization, 'Bearer access-token-2');
            });
    });

    it('should redact the bearer token from trace output', () => {
        sinon.stub(requestsUtil, 'makeRequest').callsFake((options) => {
            if (options.fullURI.indexOf('/oauth2/v2.0/token') !== -1) {
                return Promise.resolve({
                    access_token: 'trace-token',
                    expires_in: 3600
                });
            }
            return Promise.resolve([{}, { statusCode: 204 }]);
        });

        const context = testUtil.buildConsumerContext({
            eventType: 'AVR',
            config: buildConfig('trace')
        });
        context.event.data = JSON.parse(JSON.stringify(avrData));

        return consumer(context)
            .then(() => {
                assert.strictEqual(
                    context.tracer.write.lastCall.args[0].headers.Authorization,
                    '*****'
                );
            });
    });

    it('should retry throttled ingestion requests', () => {
        let ingestionRequests = 0;
        sinon.stub(promiseUtil, 'sleep').resolves();
        sinon.stub(requestsUtil, 'makeRequest').callsFake((options) => {
            if (options.fullURI.indexOf('/oauth2/v2.0/token') !== -1) {
                return Promise.resolve({
                    access_token: 'retry-token',
                    expires_in: 3600
                });
            }
            ingestionRequests += 1;
            return Promise.resolve([
                {},
                { statusCode: ingestionRequests === 1 ? 429 : 204 }
            ]);
        });

        const config = buildConfig('retry');
        config.maxRetryAttempts = 2;
        const context = testUtil.buildConsumerContext({
            eventType: 'LTM',
            config
        });
        context.event.data = {
            hostname: 'bigip.example.com',
            telemetryEventCategory: 'LTM'
        };

        return consumer(context)
            .then(() => {
                assert.strictEqual(ingestionRequests, 2);
                assert.strictEqual(context.logger.exception.callCount, 0);
            });
    });
});
