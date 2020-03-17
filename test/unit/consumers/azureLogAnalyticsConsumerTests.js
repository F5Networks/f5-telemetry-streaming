/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const sinon = require('sinon');
const util = require('../../../src/lib/util');

const azureAnalyticsIndex = require('../../../src/lib/consumers/Azure_Log_Analytics/index');
const azureLogData = require('./azureLogAnalyticsConsumerTestsData');
const azureUtil = require('../../../src/lib/consumers/Azure_Log_Analytics/azureUtil');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Azure_Log_Analytics', () => {
    let clock;
    let requests;

    const defaultConsumerConfig = {
        workspaceId: 'myWorkspace',
        passphrase: 'secret',
        useManagedIdentity: false
    };

    beforeEach(() => {
        requests = [];
        sinon.stub(util, 'makeRequest').callsFake((opts) => {
            requests.push(opts);
            return Promise.resolve({ statusCode: 200 });
        });

        sinon.stub(azureUtil, 'getSharedKey').resolves('stubbed-shared-key');
        // Fake the clock to get consistent values in the 'x-ms-date' variable
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        sinon.restore();
        clock.restore();
    });

    describe('process', () => {
        it('should configure default request options', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = {
                new: 'data'
            };

            return azureAnalyticsIndex(context)
                .then(() => {
                    assert.strictEqual(requests[0].fullURI, 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01');
                    assert.deepStrictEqual(requests[0].headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                });
        });

        it('should configure request options with provided values', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    workspaceId: 'myWorkspace',
                    passphrase: 'secret',
                    logType: 'customLogType',
                    allowSelfSignedCert: true
                }
            });
            context.event.data = {
                new: 'data'
            };

            return azureAnalyticsIndex(context)
                .then(() => {
                    assert.strictEqual(requests[0].fullURI, 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01');
                    assert.deepStrictEqual(requests[0].headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'customLogType_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                    assert.deepStrictEqual(requests[0].allowSelfSignedCert, true);
                });
        });

        it('should trace data with secrets redacted', () => {
            let traceData;
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    workspaceId: 'myWorkspace',
                    passphrase: 'secret',
                    logType: 'customLogType'
                }
            });
            context.event.data = {
                new: 'data'
            };
            context.tracer = {
                write: (input) => {
                    traceData = JSON.parse(input);
                }
            };

            return azureAnalyticsIndex(context)
                .then(() => {
                    assert.deepStrictEqual(requests[0].headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'customLogType_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                    assert.strictEqual(traceData[0].headers.Authorization, '*****');
                });
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = azureLogData.systemData[0].expectedData;

            return azureAnalyticsIndex(context)
                .then(() => assert.deepStrictEqual(requests, expectedData));
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: util.deepCopy(defaultConsumerConfig)
            });
            context.config.allowSelfSignedCert = true;
            const expectedData = azureLogData.eventData[0].expectedData;
            context.event.type = 'AVR';

            return azureAnalyticsIndex(context)
                .then(() => assert.deepStrictEqual(requests, expectedData));
        });

        it('should generate sharedKey to use when useManagedIdentity is true', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    workspaceId: 'myWorkspace',
                    useManagedIdentity: true,
                    logType: 'customLogType'
                }
            });
            context.event.data = {
                type1: { prop: 'data' }
            };
            const expSignedKey = azureUtil.signSharedKey(
                'stubbed-shared-key',
                'Thu, 01 Jan 1970 00:00:00 GMT',
                JSON.stringify([{ prop: 'data' }])
            );
            return azureAnalyticsIndex(context)
                .then(() => assert.strictEqual(requests[0].fullURI, 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'))
                .then(() => assert.deepStrictEqual(requests[0].headers, {
                    Authorization: `SharedKey myWorkspace:${expSignedKey}`,
                    'Content-Type': 'application/json',
                    'Log-Type': 'customLogType_type1',
                    'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                }));
        });
    });
});
