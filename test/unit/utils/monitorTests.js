/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const APP_THRESHOLDS = require('../../../src/lib/constants').APP_THRESHOLDS;

const config = require('../../../src/lib/config');
const monitor = require('../../../src/lib/utils/monitor');
const deviceUtil = require('../../../src/lib/utils/device');
const util = require('../../../src/lib/utils/misc');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Monitor Util', () => {
    let utilStub;

    before(() => {
        // disabled by default, otherwise test imports can trigger multiple monitor instance starts
        // since we're bypassing the singleton in tests using restoreCache
        process.env[APP_THRESHOLDS.MONITOR_DISABLED] = undefined;
    });

    after(() => {
        process.env[APP_THRESHOLDS.MONITOR_DISABLED] = true;
    });

    beforeEach(() => {
        utilStub = { start: [], stop: [], update: [] };

        sinon.stub(util, 'start').callsFake((func, args, interval) => {
            utilStub.start.push({ args, interval });
            return interval;
        });
        sinon.stub(util, 'update').callsFake((id, func, args, interval) => {
            utilStub.update.push({ args, interval });
            return interval;
        });
        sinon.stub(util, 'stop').callsFake((arg) => {
            utilStub.stop.push({ arg });
        });
    });

    afterEach(() => {
        monitor.stop();
        sinon.restore();
    });

    describe('config "on change" event', () => {
        const mockConfig1 = {
            components: [
                {
                    class: 'Telemery_System',
                    enable: true
                },
                {
                    class: 'Controls'
                    // prior to v1.18
                    // memoryThresholdPercent: undefined
                }
            ]
        };
        const mockConfig2 = {
            components: [
                {
                    class: 'Telemery_System',
                    enable: true
                },
                {
                    class: 'Controls',
                    memoryThresholdPercent: 50
                }
            ]
        };
        const mockConfig3 = {
            components: [
                {
                    class: 'Telemery_System',
                    enable: false
                },
                {
                    class: 'Controls',
                    memoryThresholdPercent: 76
                }
            ]
        };

        it('should enable monitor checks when there are components enabled', () => {
            let timer1;
            return config.emitAsync('change', mockConfig1)
                .then(() => {
                    timer1 = monitor.timer;
                    assert.exists(timer1);
                    assert.strictEqual(monitor.memoryThreshold, 1290);
                    assert.deepStrictEqual(utilStub.start, [{ args: null, interval: 5 }]);
                    assert.deepStrictEqual(utilStub.stop, []);
                    assert.deepStrictEqual(utilStub.update, []);
                });
        });

        it('should update monitor checks when there are components enabled', () => config.emitAsync('change', mockConfig1)
            .then(() => {
                assert.exists(monitor.timer);
                assert.strictEqual(monitor.memoryThreshold, 1290);
                return config.emitAsync('change', mockConfig2);
            })
            .then(() => {
                assert.exists(monitor.timer);
                assert.strictEqual(monitor.memoryThreshold, 717);
                assert.deepStrictEqual(utilStub.start, [{ args: null, interval: 5 }]);
                assert.deepStrictEqual(utilStub.stop, []);
                assert.deepStrictEqual(utilStub.update, [{ args: null, interval: 5 }]);
            }));

        it('should disable monitor checks when there are no components enabled', () => config.emitAsync('change', mockConfig2)
            .then(() => {
                assert.exists(monitor.timer);
                assert.strictEqual(monitor.memoryThreshold, 717);
                return config.emitAsync('change', mockConfig3);
            })
            .then(() => {
                assert.notExists(monitor.timer);
                assert.notExists(monitor.memoryThreshold);
                assert.deepStrictEqual(utilStub.start, [{ args: null, interval: 5 }]);
                assert.deepStrictEqual(utilStub.update, []);
                assert.deepStrictEqual(utilStub.stop, [{ arg: 5 }]);
            }));

        it('should disable monitor checks when threshold = 100%', () => config.emitAsync('change', mockConfig2)
            .then(() => {
                assert.exists(monitor.timer);
                assert.strictEqual(monitor.memoryThreshold, 717);
                const mockConfigDisable = {
                    components: [
                        {
                            class: 'Telemery_System',
                            enable: true
                        },
                        {
                            class: 'Controls',
                            memoryThresholdPercent: 100
                        }
                    ]
                };
                return config.emitAsync('change', mockConfigDisable);
            })
            .then(() => {
                assert.notExists(monitor.timer);
                assert.notExists(monitor.memoryThreshold);
                assert.deepStrictEqual(utilStub.start, [{ args: null, interval: 5 }]);
                assert.deepStrictEqual(utilStub.update, []);
                assert.deepStrictEqual(utilStub.stop, [{ arg: 5 }]);
            }));
    });

    describe('.checkThresholds', () => {
        let emitSpy;
        beforeEach(() => {
            sinon.stub(deviceUtil, 'getHostDeviceInfo').returns({ NODE_MEMORY_LIMIT: 1000 });
            sinon.stub(monitor, 'memoryThreshold').value(700);
            emitSpy = sinon.spy(monitor, 'emitAsync');
        });

        it('should emit check event MEMORY_USAGE_HIGH when higher value than threshold', () => {
            sinon.stub(process, 'memoryUsage').returns({ rss: 987654321 });
            return monitor.checkThresholds()
                .then(() => {
                    assert.isTrue(emitSpy.calledOnceWith('check', APP_THRESHOLDS.MEMORY.NOT_OK));
                });
        });

        it('should emit check event MEMORY_USAGE_HIGH when same value as threshold', () => {
            sinon.stub(process, 'memoryUsage').returns({ rss: 734003200 });
            return monitor.checkThresholds()
                .then(() => {
                    assert.isTrue(emitSpy.calledOnceWith('check', APP_THRESHOLDS.MEMORY.NOT_OK));
                });
        });

        it('should emit check event MEMORY_USAGE_OK when below threshold value', () => {
            sinon.stub(process, 'memoryUsage').returns({ rss: 2000000 });
            return monitor.checkThresholds()
                .then(() => {
                    assert.isTrue(emitSpy.calledOnceWith('check', APP_THRESHOLDS.MEMORY.OK));
                });
        });
    });

    describe('auto adjust timer interval based on % memory usage', () => {
        let memUsageStub;

        beforeEach(() => {
            sinon.stub(monitor, 'interval').value(1);
            sinon.stub(monitor, 'memoryLimit').value(1000);
            sinon.stub(monitor, 'memoryThresholdPercent').value(80);
            sinon.stub(monitor, 'memoryThreshold').value(800);
            sinon.stub(monitor, 'emitAsync').resolves();
            memUsageStub = sinon.stub(monitor, 'getProcessMemUsage');
        });


        const usageIntervals = [
            { sec: 30, memUsagePercent: 24, name: 'should configure <25%' },
            { sec: 15, memUsagePercent: 49, name: 'should configure >=25% and < 50%' },
            { sec: 10, memUsagePercent: 74, name: 'should configure >=50% and < 75%' },
            { sec: 5, memUsagePercent: 89, name: 'should configure >=75% and < 90%' },
            { sec: 3, memUsagePercent: 101, name: 'should configure >=90%' }
        ];

        usageIntervals.forEach((usageTest) => {
            testUtil.getCallableIt(usageTest)(usageTest.name, () => {
                const memUsageVal = (usageTest.memUsagePercent / 100) * monitor.memoryLimit;
                memUsageStub.returns(memUsageVal);
                return monitor.checkThresholds()
                    .then(() => {
                        assert.strictEqual(monitor.interval, usageTest.sec, `should change interval to ${usageTest.sec} for usage ${memUsageVal} ${usageTest.memUsagePercent}`);
                        assert.deepStrictEqual(utilStub.update, [{ args: null, interval: usageTest.sec }]);
                    });
            });
        });
    });
});
