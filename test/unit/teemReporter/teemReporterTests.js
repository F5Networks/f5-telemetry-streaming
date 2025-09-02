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

/* eslint-disable import/order, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');
const TeemDevice = require('@f5devcentral/f5-teem').Device;

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const appInfo = sourceCode('src/lib/appInfo');
const TeemReporterService = sourceCode('src/lib/teemReporter');

moduleCache.remember();

describe('Teem Reporter / Teem Reporter Service', () => {
    let configWorker;
    let coreStub;
    let teemRecords;
    let teemReportStub;
    let teemService;

    function processDeclaration(decl) {
        return Promise.all([
            configWorker.processDeclaration(decl),
            coreStub.appEvents.appEvents.waitFor('teem.reported')
        ]);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub();
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        configWorker = coreStub.configWorker.configWorker;

        teemRecords = [];

        teemService = new TeemReporterService();
        teemService.initialize(coreStub.appEvents.appEvents);

        teemReportStub = sinon.stub(TeemDevice.prototype, 'reportRecord');
        teemReportStub.callsFake(function (record) {
            teemRecords.push({ info: this.assetInfo, record: record.recordBody });
            return Promise.resolve();
        });

        await coreStub.startServices();
        await configWorker.cleanup();
        await teemService.start();

        assert.isTrue(teemService.isRunning());
    });

    afterEach(async () => {
        await teemService.destroy();
        await coreStub.destroyServices();
        sinon.restore();
    });

    it('should send TEEM report for minimal declaration', () => processDeclaration({
        class: 'Telemetry',
        schemaVersion: '1.39.0'
    })
        .then(() => {
            assert.lengthOf(teemRecords, 1);
            assert.deepStrictEqual(
                teemRecords[0].info,
                {
                    name: 'Telemetry Streaming',
                    version: appInfo.version
                }
            );
            assert.deepStrictEqual(
                teemRecords[0].record,
                {
                    regkey: 'unknown',
                    platformID: 'unknown',
                    platform: 'unknown',
                    platformVersion: 'unknown',
                    nicConfiguration: 'unknown',
                    modules: {},
                    Telemetry: 1,
                    consumers: {},
                    inlineIHealthPollers: 0,
                    inlineSystemPollers: 0
                }
            );
        }));

    it('should send multiple TEEM reports', () => processDeclaration({
        class: 'Telemetry',
        schemaVersion: '1.39.0'
    })
        .then(() => {
            assert.lengthOf(teemRecords, 1);
            assert.deepStrictEqual(
                teemRecords[0].info,
                {
                    name: 'Telemetry Streaming',
                    version: appInfo.version
                }
            );
            assert.deepStrictEqual(
                teemRecords[0].record,
                {
                    regkey: 'unknown',
                    platformID: 'unknown',
                    platform: 'unknown',
                    platformVersion: 'unknown',
                    nicConfiguration: 'unknown',
                    modules: {},
                    Telemetry: 1,
                    consumers: {},
                    inlineIHealthPollers: 0,
                    inlineSystemPollers: 0
                }
            );

            return processDeclaration({
                class: 'Telemetry',
                schemaVersion: '1.39.0',
                listener: {
                    class: 'Telemetry_Listener'
                }
            });
        })
        .then(() => {
            assert.lengthOf(teemRecords, 2);
            assert.deepStrictEqual(
                teemRecords[1].info,
                {
                    name: 'Telemetry Streaming',
                    version: appInfo.version
                }
            );
            assert.deepStrictEqual(
                teemRecords[1].record,
                {
                    regkey: 'unknown',
                    platformID: 'unknown',
                    platform: 'unknown',
                    platformVersion: 'unknown',
                    nicConfiguration: 'unknown',
                    modules: {},
                    Telemetry: 1,
                    Telemetry_Listener: 1,
                    consumers: {},
                    inlineIHealthPollers: 0,
                    inlineSystemPollers: 0
                }
            );
        }));

    it('should send TEEM report', () => processDeclaration({
        class: 'Telemetry',
        schemaVersion: '1.11.0',
        consumer1: {
            class: 'Telemetry_Consumer',
            type: 'Generic_HTTP',
            host: 'x.x.x.x'
        },
        consumer2: {
            class: 'Telemetry_Consumer',
            type: 'Splunk',
            host: 'x.x.x.x',
            passphrase: { cipherText: 'passphrase' }
        },
        consumer3: {
            class: 'Telemetry_Consumer',
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            passphrase: { cipherText: 'passphrase' }
        },
        consumer4: {
            class: 'Telemetry_Consumer',
            type: 'Graphite',
            host: 'x.x.x.x'
        },
        consumer5: {
            class: 'Telemetry_Consumer',
            type: 'Kafka',
            host: 'x.x.x.x',
            topic: 'topic'
        },
        consumer6: {
            class: 'Telemetry_Consumer',
            type: 'ElasticSearch',
            host: 'x.x.x.x',
            index: 'index'
        },
        consumer7: {
            class: 'Telemetry_Consumer',
            type: 'Generic_HTTP',
            host: 'x.x.x.x'
        },
        consumer8: {
            class: 'Telemetry_Consumer',
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            passphrase: { cipherText: 'passphrase' }
        },
        consumer9: {
            class: 'Telemetry_Consumer',
            type: 'Azure_Log_Analytics',
            workspaceId: 'workspaceId',
            passphrase: { cipherText: 'passphrase' }
        },
        system1: {
            class: 'Telemetry_System',
            systemPoller: [
                { interval: 300 },
                { interval: 300 },
                'systemPoller1'
            ],
            iHealthPoller: {
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                },
                interval: {
                    timeWindow: {
                        start: '23:15',
                        end: '02:15'
                    },
                    frequency: 'daily'
                }
            }
        },
        systemPoller1: {
            class: 'Telemetry_System_Poller'
        },
        system2: {
            class: 'Telemetry_System',
            systemPoller: {
                interval: 100
            }
        }
    })
        .then(() => {
            assert.lengthOf(teemRecords, 1);
            assert.deepStrictEqual(
                teemRecords[0].info,
                {
                    name: 'Telemetry Streaming',
                    version: appInfo.version
                }
            );
            assert.deepStrictEqual(
                teemRecords[0].record,
                {
                    regkey: 'unknown',
                    platformID: 'unknown',
                    platform: 'unknown',
                    platformVersion: 'unknown',
                    nicConfiguration: 'unknown',
                    modules: {},
                    Telemetry: 1,
                    Telemetry_Consumer: 9,
                    Secret: 5,
                    Telemetry_System: 2,
                    Telemetry_System_Poller: 1,
                    consumers: {
                        Azure_Log_Analytics: 3,
                        ElasticSearch: 1,
                        Generic_HTTP: 2,
                        Graphite: 1,
                        Kafka: 1,
                        Splunk: 1
                    },
                    inlineIHealthPollers: 1,
                    inlineSystemPollers: 3
                }
            );
        }));

    it('should not thorw error if reporting failed', () => {
        teemReportStub.throws(new Error('expected error'));
        return processDeclaration({
            class: 'Telemetry',
            schemaVersion: '1.39.0'
        })
            .then(() => {
                assert.lengthOf(teemRecords, 0);
                assert.includeMatch(
                    coreStub.logger.messages.debug,
                    /Unable to send analytics data/
                );
            });
    });
});
