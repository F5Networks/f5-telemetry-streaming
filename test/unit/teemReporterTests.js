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
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');
const TeemRecord = require('@f5devcentral/f5-teem').Record;

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');

const appInfo = sourceCode('src/lib/appInfo');
const configWorker = sourceCode('src/lib/config');
const constants = sourceCode('src/lib/constants');
const TeemReporter = sourceCode('src/lib/teemReporter').TeemReporter;

moduleCache.remember();

describe('TeemReporter', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        stubs.default.coreStub({ teemReporter: false });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('constructor', () => {
        it('should use application version and name from \'appInfo\' when generating asset info', () => {
            const expectedAppName = 'expectedAppName';
            sinon.stub(constants, 'APP_NAME').value(expectedAppName);

            const teemReporter = new TeemReporter();
            assert.strictEqual(teemReporter.assetInfo.name, expectedAppName);
            assert.strictEqual(teemReporter.assetInfo.version, appInfo.version);
        });
    });

    describe('.process', () => {
        const decl = {
            class: 'Telemetry',
            schemaVersion: '1.6.0'
        };
        it('should send TEEM report', () => {
            let recordSent;
            const teemReporter = new TeemReporter();
            const teemDevice = teemReporter.teemDevice;
            const methods = [
                'addClassCount',
                'addPlatformInfo',
                'addRegKey',
                'addProvisionedModules',
                'addJsonObject',
                'calculateAssetId'
            ];
            const teemSpies = methods.map((m) => ({ name: m, instance: sinon.spy(TeemRecord.prototype, m) }));

            const reportRecordStub = sinon.stub(teemDevice, 'reportRecord');
            reportRecordStub.callsFake((record) => {
                recordSent = record;
            });

            return teemReporter.process(decl)
                .then(() => {
                    assert.isTrue(reportRecordStub.calledOnce, 'Expected method reportRecord() to be called once');
                    teemSpies.forEach((spy) => {
                        assert.isTrue(spy.instance.calledOnce, `Expected method ${spy.name}() to be called once`);
                    });
                    assert.deepStrictEqual(recordSent.recordBody.consumers, {});
                    assert.strictEqual(recordSent.recordBody.Telemetry, 1);
                });
        });

        it('should not throw an error if reporting failed', () => {
            const teemReporter = new TeemReporter();
            sinon.stub(teemReporter.teemDevice, 'reportRecord').rejects({ message: 'TEEM failed!' });
            const loggerSpy = sinon.spy(teemReporter.logger, 'debugException');
            return teemReporter.process(decl)
                .then(() => {
                    assert.isTrue(loggerSpy.callCount >= 1, 'should call logger.debugException at least once');
                    assert.deepStrictEqual(loggerSpy.firstCall.args, ['Unable to send analytics data', { message: 'TEEM failed!' }]);
                });
        });
    });

    describe('.fetchExtraData()', () => {
        const teemReporter = new TeemReporter();
        const validate = (decl, expectedExtraData) => configWorker.processDeclaration(decl)
            .then((validConfig) => {
                const extraData = teemReporter.fetchExtraData(validConfig);
                assert.deepStrictEqual(extraData, expectedExtraData);
            });

        it('should process empty object', () => {
            const result = teemReporter.fetchExtraData({});
            assert.deepStrictEqual(result, {
                consumers: {},
                inlineIHealthPollers: 0,
                inlineSystemPollers: 0
            });
        });

        it('should process empty declaration', () => {
            const expectedExtraData = {
                consumers: {},
                inlineIHealthPollers: 0,
                inlineSystemPollers: 0
            };
            const declaration = {
                class: 'Telemetry',
                schemaVersion: '1.11.0'
            };
            return validate(declaration, expectedExtraData);
        });

        it('should return object with counters calculated from declaration', () => {
            const declaration = {
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
            };
            const expectedExtraData = {
                consumers: {
                    Generic_HTTP: 2,
                    Splunk: 1,
                    Azure_Log_Analytics: 3,
                    Graphite: 1,
                    Kafka: 1,
                    ElasticSearch: 1
                },
                inlineIHealthPollers: 1,
                inlineSystemPollers: 3
            };
            return validate(declaration, expectedExtraData);
        });
    });
});
