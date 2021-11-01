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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const util = require('../../../src/lib/utils/misc');
const requestsUtil = require('../../../src/lib/utils/requests');

const azureAnalyticsIndex = require('../../../src/lib/consumers/Azure_Log_Analytics/index');
const azureLogData = require('./data/azureLogAnalyticsConsumerTestsData');
const azureUtil = require('../../../src/lib/consumers/shared/azureUtil');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Azure_Log_Analytics', () => {
    let clock;
    let requests;

    const defaultConsumerConfig = {
        workspaceId: 'myWorkspace',
        passphrase: 'secret',
        useManagedIdentity: false,
        allowSelfSignedCert: false
    };

    const getOpsInsightsReq = () => {
        const opInsightsReq = requests.find(r => r.fullURI === 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01');
        assert.notStrictEqual(opInsightsReq, undefined);
        return opInsightsReq;
    };

    const getAllOpsInsightsReqs = () => {
        const opInsightsReqs = requests.filter(r => r.fullURI === 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01');
        assert.notStrictEqual(opInsightsReqs, undefined);
        return opInsightsReqs;
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        requests = [];
        sinon.stub(requestsUtil, 'makeRequest').callsFake((opts) => {
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
                    const opInsightsReq = getOpsInsightsReq();
                    assert.deepStrictEqual(opInsightsReq.headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                });
        });

        it('should configure request options with resourceId if available from context metadata', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = {
                new: 'data'
            };
            context.metadata = {
                compute: {
                    location: 'outerspace',
                    resourceId: 'a-galaxy-far-away',
                    someOtherProp: 'made up'
                }
            };

            return azureAnalyticsIndex(context)
                .then(() => {
                    const opInsightsReq = getOpsInsightsReq();
                    assert.deepStrictEqual(opInsightsReq.headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'x-ms-AzureResourceId': 'a-galaxy-far-away'
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
                    const opInsightsReq = getOpsInsightsReq();
                    assert.deepStrictEqual(opInsightsReq.headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'customLogType_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                    assert.deepStrictEqual(opInsightsReq.allowSelfSignedCert, true);
                });
        });

        it('should trace data with secrets redacted', () => {
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

            return azureAnalyticsIndex(context)
                .then(() => {
                    const opInsightsReq = getOpsInsightsReq();
                    assert.deepStrictEqual(opInsightsReq.headers, {
                        Authorization: 'SharedKey myWorkspace:MGiiWY+WTAxB35tyZ1YljyfwMM5QCqr4ge+giSjcgfI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'customLogType_new',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.strictEqual(traceData[0].headers.Authorization, '*****');
                });
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            return azureAnalyticsIndex(context)
                .then(() => assert.sameDeepMembers(getAllOpsInsightsReqs(), azureLogData.systemData[0].expectedData));
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
                .then(() => assert.deepStrictEqual(getAllOpsInsightsReqs(), expectedData));
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
                .then(() => {
                    const opInsightsReq = getOpsInsightsReq();
                    assert.strictEqual(opInsightsReq.fullURI, 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01');
                    assert.deepStrictEqual(opInsightsReq.headers, {
                        Authorization: `SharedKey myWorkspace:${expSignedKey}`,
                        'Content-Type': 'application/json',
                        'Log-Type': 'customLogType_type1',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    });
                });
        });
    });
});
