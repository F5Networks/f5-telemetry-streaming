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

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const MemoryMonitor = sourceCode('src/lib/resourceMonitor/memoryMonitor');

moduleCache.remember();

describe('Resource Monitor / Memory Monitor', () => {
    let coreStub;
    let results;
    let memMon;

    const callback = (memCheck) => results.push(memCheck);

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true, resourceMonitorUtils: true, utilMisc: true });
        coreStub.resourceMonitorUtils.osAvailableMem.restore();
        results = [];
        global.gc = undefined;
    });

    afterEach(() => {
        sinon.restore();
        return memMon.destroy();
    });

    describe('.constructor()', () => {
        it('should use default parameters', () => {
            memMon = new MemoryMonitor(callback);

            assert.deepStrictEqual(memMon.freeMemoryLimit, 30);
            assert.deepStrictEqual(memMon.provisioned, 4096);
            assert.deepStrictEqual(memMon.releaseThreshold, 3317);
            assert.deepStrictEqual(memMon.releasePercent, 90);
            assert.deepStrictEqual(memMon.threshold, 3686);
            assert.deepStrictEqual(memMon.thresholdPercent, 90);
            assert.isFalse(memMon.gcEnabled);
        });

        it('should use non-default parameters', () => {
            memMon = new MemoryMonitor(callback, {
                freeMemoryLimit: 10,
                provisioned: 100,
                releasePercent: 50,
                thresholdPercent: 50
            });

            assert.deepStrictEqual(memMon.freeMemoryLimit, 10);
            assert.deepStrictEqual(memMon.provisioned, 100);
            assert.deepStrictEqual(memMon.releaseThreshold, 25);
            assert.deepStrictEqual(memMon.releasePercent, 50);
            assert.deepStrictEqual(memMon.threshold, 50);
            assert.deepStrictEqual(memMon.thresholdPercent, 50);
            assert.isFalse(memMon.gcEnabled);
        });

        it('should detect exposed GC', () => {
            global.gc = () => {};
            memMon = new MemoryMonitor(callback);

            assert.deepStrictEqual(memMon.freeMemoryLimit, 30);
            assert.deepStrictEqual(memMon.provisioned, 4096);
            assert.deepStrictEqual(memMon.releaseThreshold, 3317);
            assert.deepStrictEqual(memMon.releasePercent, 90);
            assert.deepStrictEqual(memMon.threshold, 3686);
            assert.deepStrictEqual(memMon.thresholdPercent, 90);
            assert.isTrue(memMon.gcEnabled);
        });
    });

    describe('service activity', () => {
        let clock;
        let fsUtil;

        beforeEach(() => {
            fsUtil = {
                readFileSync: () => PROC_MEM_INFO_OUTPUT
            };

            Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                external: 10 * 1024 * 1024,
                heapTotal: 20 * 1024 * 1024,
                heapUsed: 15 * 1024 * 1024,
                rss: 17 * 1024 * 1024
            });

            clock = stubs.clock();
        });

        it('should provide memory usage stats (simple check, default intervals - 1.5 sec)', () => {
            memMon = new MemoryMonitor(callback, {
                fs: fsUtil
            });
            return Promise.all([
                memMon.start(),
                clock.clockForward(1000, { promisify: true, repeat: 2, delay: 50 })
            ])
                .then(() => {
                    assert.lengthOf(results, 1);
                    assert.deepNestedInclude(results[0], {
                        hrtimestamp: 1500000000,
                        interval: { min: 0, max: 50, interval: 1.5 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_NO_CHANGE',
                        usage: {
                            external: 10,
                            free: 2048,
                            freeLimit: 30,
                            freeUtilizationPercent: 0,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 4096,
                            release: 3317,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 3686,
                            thresholdPercent: 90,
                            thresholdUtilzationPercent: 0.4612045577862181,
                            utilization: 17,
                            utilizationPercent: 0.4150390625
                        }
                    });
                });
        });

        it('should provide memory usage stats (non default intervals)', () => {
            memMon = new MemoryMonitor(callback, {
                freeMemoryLimit: 10,
                fs: fsUtil,
                intervals: [
                    { usage: 50, interval: 0.5 },
                    { usage: 90, interval: 0.3 },
                    { usage: 100, interval: 0.1 }
                ],
                provisioned: 250,
                thresholdPercent: 80
            });
            return Promise.all([
                memMon.start(),
                clock.clockForward(300, { promisify: true, repeat: 2, delay: 10 })
            ])
                .then(() => {
                    assert.lengthOf(results, 1);
                    assert.deepNestedInclude(results[0], {
                        interval: { min: 0, max: 50, interval: 0.5 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_NO_CHANGE',
                        usage: {
                            external: 10,
                            free: 2048,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 8.5,
                            utilization: 17,
                            utilizationPercent: 6.800000000000001
                        }
                    });

                    fsUtil.readFileSync = () => 'MemAvailable:    9000 kB';
                })
                .then(() => clock.clockForward(300, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 2);
                    assert.deepNestedInclude(results[1], {
                        interval: { min: 100, max: 9007199254740991, interval: 1 },
                        thresholdStatus: 'MEMORY_USAGE_ABOVE_THRESHOLD',
                        trend: 'MEMORY_USAGE_NO_CHANGE',
                        usage: {
                            external: 10,
                            free: 8.7890625,
                            freeLimit: 10,
                            freeUtilizationPercent: 112.109375,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 8.5,
                            utilization: 17,
                            utilizationPercent: 6.800000000000001
                        }
                    });

                    fsUtil.readFileSync = () => PROC_MEM_INFO_OUTPUT;
                })
                .then(() => clock.clockForward(600, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 3);
                    assert.deepNestedInclude(results[2], {
                        interval: { min: 0, max: 50, interval: 0.5 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_NO_CHANGE',
                        usage: {
                            external: 10,
                            free: 2048,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 8.5,
                            utilization: 17,
                            utilizationPercent: 6.800000000000001
                        }
                    });
                })
                .then(() => clock.clockForward(75, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 3);
                    fsUtil.readFileSync = () => 'MemFree:    9000 kB';
                })
                .then(() => clock.clockForward(300, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 4);
                    assert.deepNestedInclude(results[3], {
                        interval: { min: 0, max: 50, interval: 0.5 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_NO_CHANGE',
                        usage: {
                            external: 10,
                            free: -1,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 8.5,
                            utilization: 17,
                            utilizationPercent: 6.800000000000001
                        }
                    });

                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 25 * 1024 * 1024,
                        heapTotal: 20 * 1024 * 1024,
                        heapUsed: 15 * 1024 * 1024,
                        rss: 17 * 1024 * 1024
                    });
                })
                .then(() => clock.clockForward(300, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 5);
                    assert.deepNestedInclude(results[4], {
                        interval: { min: 0, max: 50, interval: 0.5 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_GOES_UP',
                        usage: {
                            external: 25,
                            free: -1,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 12.5,
                            utilization: 25,
                            utilizationPercent: 10
                        }
                    });
                    fsUtil.readFileSync = () => 'MemAvailable:    20000 kB';
                })
                .then(() => clock.clockForward(100, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 6);
                    assert.deepNestedInclude(results[5], {
                        interval: { min: 90, max: 100, interval: 0.1 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_NO_CHANGE',
                        usage: {
                            external: 25,
                            free: 19.53125,
                            freeLimit: 10,
                            freeUtilizationPercent: 90.46875,
                            heapTotal: 20,
                            heapUsed: 15,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 17,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 12.5,
                            utilization: 25,
                            utilizationPercent: 10
                        }
                    });
                    fsUtil.readFileSync = () => 'MemAvai:    20000 kB';
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 220 * 1024 * 1024,
                        heapTotal: 220 * 1024 * 1024,
                        heapUsed: 220 * 1024 * 1024,
                        rss: 220 * 1024 * 1024
                    });
                })
                .then(() => clock.clockForward(100, { promisify: true, repeat: 2, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 7);
                    assert.deepNestedInclude(results[6], {
                        interval: { min: 100, max: 9007199254740991, interval: 1 },
                        thresholdStatus: 'MEMORY_USAGE_ABOVE_THRESHOLD',
                        trend: 'MEMORY_USAGE_GOES_UP',
                        usage: {
                            external: 220,
                            free: -1,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 220,
                            heapUsed: 220,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 220,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 110.00000000000001,
                            utilization: 220,
                            utilizationPercent: 88
                        }
                    });
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 190 * 1024 * 1024,
                        heapTotal: 190 * 1024 * 1024,
                        heapUsed: 190 * 1024 * 1024,
                        rss: 190 * 1024 * 1024
                    });
                })
                .then(() => clock.clockForward(100, { promisify: true, repeat: 10, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 8);
                    assert.deepNestedInclude(results[7], {
                        interval: { min: 100, max: 9007199254740991, interval: 1 },
                        thresholdStatus: 'MEMORY_USAGE_ABOVE_THRESHOLD',
                        trend: 'MEMORY_USAGE_GOES_DOWN',
                        usage: {
                            external: 190,
                            free: -1,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 190,
                            heapUsed: 190,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 190,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 95,
                            utilization: 190,
                            utilizationPercent: 76
                        }
                    });
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 100 * 1024 * 1024,
                        heapTotal: 100 * 1024 * 1024,
                        heapUsed: 100 * 1024 * 1024,
                        rss: 100 * 1024 * 1024
                    });
                })
                .then(() => clock.clockForward(100, { promisify: true, repeat: 12, delay: 10 }))
                .then(() => {
                    assert.lengthOf(results, 9);
                    assert.deepNestedInclude(results[8], {
                        interval: { min: 50, max: 90, interval: 0.3 },
                        thresholdStatus: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        trend: 'MEMORY_USAGE_GOES_DOWN',
                        usage: {
                            external: 100,
                            free: -1,
                            freeLimit: 10,
                            freeUtilizationPercent: 0,
                            heapTotal: 100,
                            heapUsed: 100,
                            provisioned: 250,
                            release: 180,
                            releasePercent: 90,
                            rss: 100,
                            threshold: 200,
                            thresholdPercent: 80,
                            thresholdUtilzationPercent: 50,
                            utilization: 100,
                            utilizationPercent: 40
                        }
                    });
                });
        });

        it('should stop and resume activity', () => {
            memMon = new MemoryMonitor(callback, {
                fs: fsUtil,
                intervals: [
                    { usage: 100, interval: 0.1 }
                ],
                provisioned: 250
            });

            return Promise.all([
                memMon.start(),
                clock.clockForward(25, { promisify: true, repeat: 10, delay: 2 })
            ])
                .then(() => {
                    assert.lengthOf(results, 2);
                    return Promise.all([
                        memMon.stop(),
                        clock.clockForward(25, { promisify: true, repeat: 10, delay: 2 })
                    ]);
                })
                .then(() => {
                    assert.lengthOf(results, 2);
                    return Promise.all([
                        memMon.restart(),
                        clock.clockForward(25, { promisify: true, repeat: 10, delay: 2 })
                    ]);
                })
                .then(() => {
                    assert.lengthOf(results, 4);
                    return Promise.all([
                        memMon.restart(),
                        clock.clockForward(25, { promisify: true, repeat: 10, delay: 2 })
                    ]);
                })
                .then(() => {
                    assert.lengthOf(results, 6);
                });
        });

        it('should start with appropriate interval according to mem usage', () => {
            Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                external: 450 * 1024 * 1024,
                heapTotal: 20 * 1024 * 1024,
                heapUsed: 15 * 1024 * 1024,
                rss: 17 * 1024 * 1024
            });
            memMon = new MemoryMonitor(callback, {
                fs: fsUtil,
                intervals: [
                    { usage: 50, interval: 0.5 },
                    { usage: 90, interval: 0.1 }
                ],
                provisioned: 250
            });

            return Promise.all([
                memMon.start(),
                clock.clockForward(250, { promisify: true, repeat: 10, delay: 2 })
            ])
                .then(() => {
                    assert.lengthOf(results, 2);
                });
        });

        it('should call GC', () => {
            global.gc = sinon.spy();
            memMon = new MemoryMonitor(callback, {
                fs: fsUtil,
                intervals: [
                    { usage: 50, interval: 0.5 },
                    { usage: 90, interval: 0.1 }
                ],
                provisioned: 250
            });
            assert.isTrue(memMon.gcEnabled);

            return Promise.all([
                memMon.start(),
                clock.clockForward(600, { promisify: true, repeat: 30, delay: 1 })
            ])
                .then(() => {
                    assert.deepStrictEqual(global.gc.callCount, 0);
                    return clock.clockForward(600, { promisify: true, repeat: 30, delay: 1 });
                })
                .then(() => {
                    assert.deepStrictEqual(global.gc.callCount, 0);
                    return clock.clockForward(60000, { promisify: true, repeat: 2, delay: 1 });
                })
                .then(() => {
                    assert.deepStrictEqual(global.gc.callCount, 2);
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 450 * 1024 * 1024,
                        heapTotal: 20 * 1024 * 1024,
                        heapUsed: 15 * 1024 * 1024,
                        rss: 17 * 1024 * 1024
                    });
                    return clock.clockForward(1500, { promisify: true, repeat: 10, delay: 1 });
                })
                .then(() => {
                    assert.isAbove(global.gc.callCount, 15);
                    assert.isBelow(global.gc.callCount, 21);
                });
        });
    });
});

const PROC_MEM_INFO_OUTPUT = `
MemTotal:       16434000 kB
MemFree:          617812 kB
MemAvailable:    2097152 kB
Buffers:          391188 kB
Cached:          1353364 kB
SwapCached:            0 kB
Active:          2302144 kB
Inactive:         633088 kB
Active(anon):    1429616 kB
Inactive(anon):     3956 kB
Active(file):     872528 kB
Inactive(file):   629132 kB
Unevictable:      244068 kB
Mlocked:          244084 kB
SwapTotal:       1023996 kB
SwapFree:        1023996 kB
Dirty:               796 kB
Writeback:             0 kB
AnonPages:       1458780 kB
Mapped:           367316 kB
Shmem:             74592 kB
Slab:             242204 kB
SReclaimable:     181236 kB
SUnreclaim:        60968 kB
KernelStack:        8464 kB
PageTables:        16128 kB
NFS_Unstable:          0 kB
Bounce:                0 kB
WritebackTmp:          0 kB
CommitLimit:     3084708 kB
Committed_AS:    2498648 kB
VmallocTotal:   34359738367 kB
VmallocUsed:      161868 kB
VmallocChunk:   34359341052 kB
HardwareCorrupted:     0 kB
AnonHugePages:         0 kB
CmaTotal:              0 kB
CmaFree:               0 kB
HugePages_Total:    6012
HugePages_Free:       19
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
DirectMap4k:      124800 kB
DirectMap2M:     6166528 kB
DirectMap1G:    12582912 kB
`;
