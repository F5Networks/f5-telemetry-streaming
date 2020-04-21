/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const TeemRecord = require('@f5devcentral/f5-teem').Record;
const TeemReporter = require('../../src/lib/teemReporter').TeemReporter;
const VERSION = require('../../src/lib/constants').VERSION;


chai.use(chaiAsPromised);
const assert = chai.assert;

describe('TeemReporter', () => {
    afterEach(() => {
        sinon.restore();
    });
    describe('constructor', () => {
        it('should use correct TS version when generating asset info', () => {
            const teemReporter = new TeemReporter();
            assert.strictEqual(teemReporter.assetInfo.version, VERSION);
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
            const teemSpies = methods.map(m => ({ name: m, instance: sinon.spy(TeemRecord.prototype, m) }));

            sinon.stub(teemDevice, 'reportRecord').callsFake((record) => {
                recordSent = record;
            });

            return assert.isFulfilled(teemReporter.process(decl))
                .then(() => {
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
            const loggerSpy = sinon.spy(teemReporter.logger, 'exception');
            return teemReporter.process(decl)
                .then(() => assert.deepStrictEqual(loggerSpy.firstCall.args, ['Unable to send analytics data', { message: 'TEEM failed!' }]));
        });
    });


    describe('._getCountByClassTypes()', () => {
        const teemReporter = new TeemReporter();
        it('should return empty consumer object', () => {
            const result = teemReporter._getCountByClassTypes({}, 'Telemetry_Consumer', 'consumers');
            assert.deepStrictEqual(result, { consumers: {} });
        });

        it('should return object with count of consumer classes', () => {
            const declaration = {
                class1: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP'
                },
                class2: {
                    class: 'Telemetry_Consumer',
                    type: 'Splunk'
                },
                class3: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics'
                },
                class4: {
                    class: 'Telemetry_Consumer',
                    type: 'Graphite'
                },
                class5: {
                    class: 'Telemetry_Consumer',
                    type: 'Kafka'
                },
                class6: {
                    class: 'Telemetry_Consumer',
                    type: 'ElasticSearch'
                },
                class7: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP'
                },
                class8: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics'
                },
                class9: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics'
                },
                class10: {
                    class: 'Telemetry_System'
                },
                class11: {
                    class: 'Telemetry_System_Poller'
                }
            };
            const expected = {
                consumers: {
                    Generic_HTTP: 2,
                    Splunk: 1,
                    Azure_Log_Analytics: 3,
                    Graphite: 1,
                    Kafka: 1,
                    ElasticSearch: 1
                }
            };
            const result = teemReporter._getCountByClassTypes(declaration, 'Telemetry_Consumer', 'consumers');
            assert.deepStrictEqual(result, expected);
        });
    });
});
