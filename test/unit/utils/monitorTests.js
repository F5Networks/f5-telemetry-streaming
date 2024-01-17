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
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const APP_THRESHOLDS = sourceCode('src/lib/constants').APP_THRESHOLDS;
const config = sourceCode('src/lib/config');
const deviceUtil = sourceCode('src/lib/utils/device');
const logger = sourceCode('src/lib/logger');
const monitor = sourceCode('src/lib/utils/monitor');
const timers = sourceCode('src/lib/utils/timers');

moduleCache.remember();

/**
 * TODO: refactor tests:
 * - add more complex and reliable tests
 */
describe('Monitor Util', () => {
    let disabledEnvVarStub;
    let loggerStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        // disabled by default, otherwise test imports can trigger multiple monitor instance starts
        // since we're bypassing the singleton in tests using restoreCache
        disabledEnvVarStub = sinon.stub(process.env, APP_THRESHOLDS.MONITOR_DISABLED);
        disabledEnvVarStub.value(undefined);
        loggerStub = stubs.logger(logger);
    });

    afterEach(() => {
        monitor.stop();
        sinon.restore();
    });

    describe('config "on change" event', () => {
        const mockConfig1 = {
            components: [
                {
                    class: 'Telemetry_System_Poller',
                    enable: true
                },
                {
                    class: 'Controls',
                    namespace: 'f5telemetry_default'
                    // prior to v1.18
                    // memoryThresholdPercent: undefined
                }
            ]
        };
        const mockConfig2 = {
            components: [
                {
                    class: 'Telemetry_System_Poller',
                    enable: true
                },
                {
                    class: 'Controls',
                    memoryThresholdPercent: 50,
                    namespace: 'f5telemetry_default'
                }
            ]
        };
        const mockConfig3 = {
            components: [
                {
                    class: 'Telemetry_System_Poller',
                    enable: false
                },
                {
                    class: 'Controls',
                    memoryThresholdPercent: 76,
                    namespace: 'f5telemetry_default'
                }
            ]
        };

        it('should enable monitor checks when there are components enabled', () => config.emitAsync('change', mockConfig1)
            .then(() => {
                assert.instanceOf(monitor.timer, timers.BasicTimer);
                assert.strictEqual(monitor.memoryThreshold, 1290);
                assert.strictEqual(monitor.timer.intervalInS, 5, 'should set interval to 5 sec');
                assert.isTrue(monitor.timer.isActive(), 'should be active');
            }));

        it('should update monitor checks when there are components enabled', () => config.emitAsync('change', mockConfig1)
            .then(() => {
                assert.instanceOf(monitor.timer, timers.BasicTimer);
                assert.strictEqual(monitor.memoryThreshold, 1290);
                assert.strictEqual(monitor.timer.intervalInS, 5, 'should set interval to 5 sec');
                assert.isTrue(monitor.timer.isActive(), 'should be active');
                return config.emitAsync('change', mockConfig2);
            })
            .then(() => {
                assert.instanceOf(monitor.timer, timers.BasicTimer);
                assert.strictEqual(monitor.memoryThreshold, 717);
                assert.strictEqual(monitor.timer.intervalInS, 5, 'should set interval to 5 sec');
                assert.isTrue(monitor.timer.isActive(), 'should be active');
            }));

        it('should disable monitor checks when there are no components enabled', () => config.emitAsync('change', mockConfig2)
            .then(() => {
                assert.instanceOf(monitor.timer, timers.BasicTimer);
                assert.strictEqual(monitor.memoryThreshold, 717);
                assert.isTrue(monitor.timer.isActive(), 'should start timer');
                return config.emitAsync('change', mockConfig3);
            })
            .then(() => {
                assert.notExists(monitor.memoryThreshold);
                assert.isFalse(monitor.timer.isActive(), 'should stop timer');
            }));

        it('should disable monitor checks when threshold = 100%', () => config.emitAsync('change', mockConfig2)
            .then(() => {
                assert.instanceOf(monitor.timer, timers.BasicTimer);
                assert.isTrue(monitor.timer.isActive(), 'should start timer');
                assert.strictEqual(monitor.memoryThreshold, 717);

                const mockConfigDisable = {
                    components: [
                        {
                            class: 'Telemetry_System_Poller',
                            enable: true
                        },
                        {
                            class: 'Controls',
                            memoryThresholdPercent: 100,
                            namespace: 'f5telemetry_default'
                        }
                    ]
                };
                return config.emitAsync('change', mockConfigDisable);
            })
            .then(() => {
                assert.isFalse(monitor.timer.isActive(), 'should stop timer');
                assert.notExists(monitor.memoryThreshold);
            }));

        it('should keep timer running after checks', () => {
            sinon.stub(process, 'memoryUsage').returns({ rss: 987654321 });
            const emitSpy = sinon.spy(monitor, 'emitAsync');
            const fakeClock = stubs.clock();
            return config.emitAsync('change', mockConfig2)
                .then(() => {
                    assert.isTrue(monitor.timer.isActive(), 'should be active');
                    fakeClock.clockForward(1000, { promisify: true, repeat: 1000 });
                    return testUtil.sleep(1000 * 999);
                })
                .then(() => {
                    assert.isTrue(emitSpy.alwaysCalledWith('check', APP_THRESHOLDS.MEMORY.NOT_OK));
                    assert.isTrue(monitor.timer.isActive(), 'should be active');
                });
        });

        it('should ignore config changes when disabled via env var', () => {
            disabledEnvVarStub.value('true');
            return config.emitAsync('change', mockConfig1)
                .then(() => {
                    assert.isFalse(monitor.timer.isActive(), 'should be inactive');
                    return config.emitAsync('change', mockConfig1);
                })
                .then(() => {
                    assert.isFalse(monitor.timer.isActive(), 'should be inactive');
                });
        });

        it('should catch event handler errors', () => monitor.emitAsync('error', new Error('test error'))
            .then(() => {
                assert.includeMatch(
                    loggerStub.messages.error,
                    /An unexpected error occurred in monitor check[\s\S]+test error/gm,
                    'should log error message'
                );
            }));

        it('should catch config event handler error', () => {
            sinon.stub(monitor, 'start').throws(new Error('test error'));
            return config.emitAsync('change', mockConfig1)
                .then(() => {
                    assert.includeMatch(
                        loggerStub.messages.error,
                        /An error occurred in monitor checks \(config change handler\)[\s\S]+test error/gm,
                        'should log error message'
                    );
                });
        });
    });

    describe('.checkThresholds', () => {
        let emitSpy;

        beforeEach(() => {
            sinon.stub(deviceUtil, 'getHostDeviceInfo').returns(1000);
            monitor.setLimits(70);
            emitSpy = sinon.spy(monitor, 'emitAsync');
            return monitor.start(70);
        });

        afterEach(() => {
            assert.isEmpty(loggerStub.messages.error, 'should have no error messages');
        });

        afterEach(() => {
            assert.isEmpty(loggerStub.messages.error, 'should have no error messages');
        });

        afterEach(() => {
            assert.isEmpty(loggerStub.messages.error, 'should have no error messages');
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
                        assert.strictEqual(monitor.timer.intervalInS, usageTest.sec, `should change interval to ${usageTest.sec} for usage ${memUsageVal} ${usageTest.memUsagePercent}`);
                    });
            });
        });
    });
});
