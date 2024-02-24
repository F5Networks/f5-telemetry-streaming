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

const APP_THRESHOLDS = sourceCode('src/lib/constants').APP_THRESHOLDS;
const configWorker = sourceCode('src/lib/config');
const persistentStorage = sourceCode('src/lib/persistentStorage');
const ResourceMonitor = sourceCode('src/lib/resourceMonitor');

moduleCache.remember();

describe('Resource Monitor / Resource Monitor', () => {
    let coreStub;
    let resourceMonitor;
    let events;

    function eraseEvents() {
        events = {
            all: [],
            check: [],
            notOk: [],
            ok: [],
            stop: []
        };
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        eraseEvents();
        resourceMonitor = new ResourceMonitor();
        resourceMonitor.ee.on(APP_THRESHOLDS.MEMORY.STATE.NOT_OK, (stats) => {
            const evt = { name: 'notOk', stats };
            events.notOk.push(evt);
            events.all.push(evt);
        });
        resourceMonitor.ee.on(APP_THRESHOLDS.MEMORY.STATE.OK, (stats) => {
            const evt = { name: 'ok', stats };
            events.ok.push(evt);
            events.all.push(evt);
        });
        resourceMonitor.ee.on('memoryMonitorStop', () => {
            const evt = { name: 'stop' };
            events.stop.push(evt);
            events.all.push(evt);
        });
        resourceMonitor.ee.on('memoryCheckStatus', (stats) => {
            const evt = { name: 'check', stats };
            events.check.push(evt);
            events.all.push(evt);
        });

        coreStub = stubs.default.coreStub({}, { logger: { ignoreLevelChange: false } });
        coreStub.persistentStorage.loadData = { config: { } };
        coreStub.utilMisc.generateUuid.numbersOnly = false;
        Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
            external: 10 * 1024 * 1024,
            heapTotal: 10 * 1024 * 1024,
            heapUsed: 10 * 1024 * 1024,
            rss: 10 * 1024 * 1024
        });
        coreStub.resourceMonitorUtils.osAvailableMem.free = 500;

        return configWorker.cleanup()
            .then(() => persistentStorage.persistentStorage.load())
            .then(() => resourceMonitor.initialize({ configMgr: configWorker }));
    });

    afterEach(() => resourceMonitor.destroy()
        .then(() => {
            sinon.restore();
        }));

    describe('constructor', () => {
        it('should create a new instance', () => {
            assert.isTrue(resourceMonitor.restartsEnabled);
            assert.isFalse(resourceMonitor.isMemoryMonitorActive);
            assert.isNull(resourceMonitor.memoryState);
            assert.isTrue(resourceMonitor.isProcessingEnabled());
            assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                config: {},
                enabled: false,
                logging: {
                    freq: 10 * 1000,
                    lastMessage: 0,
                    level: 'debug'
                }
            });
        });
    });

    describe('lifecycle', () => {
        let clock;

        beforeEach(() => {
            clock = stubs.clock();
        });

        it('should ignore changes in configuration when destroyed', () => resourceMonitor.start()
            .then(() => {
                assert.isTrue(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                return resourceMonitor.destroy();
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isDestroyed());
                assert.isFalse(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        listener: {
                            class: 'Telemetry_Listener'
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isDestroyed());
                assert.isFalse(resourceMonitor.isRunning());
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
            }));

        it('should start service without a configuration', () => resourceMonitor.start()
            .then(() => {
                assert.isTrue(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {},
                    enabled: false,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 0,
                        level: 'debug'
                    }
                });

                return clock.clockForward(30000, { promisify: true, once: true });
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.isEmpty(events.all);
            }));

        it('should not generate log messages when log level is not debug or verbose', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry',
                listener: {
                    class: 'Telemetry_Listener'
                }
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => {
                coreStub.logger.setLogLevel('verbose');
                coreStub.logger.removeAllMessages();

                return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(coreStub.logger.messages.warning);
                assert.isEmpty(coreStub.logger.messages.info);
                assert.isNotEmpty(coreStub.logger.messages.verbose);
                assert.isNotEmpty(coreStub.logger.messages.debug);
                assert.includeMatch(coreStub.logger.messages.verbose, /MEMORY_USAGE_BELOW_THRESHOLD/);
                assert.includeMatch(coreStub.logger.messages.debug, /MEMORY_USAGE_BELOW_THRESHOLD/);

                coreStub.logger.setLogLevel('debug');
                coreStub.logger.removeAllMessages();
                return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(coreStub.logger.messages.verbose);
                assert.isAbove(coreStub.logger.messages.debug.length, 2);
                assert.notIncludeMatch(coreStub.logger.messages.verbose, /MEMORY_USAGE_BELOW_THRESHOLD/);
                assert.includeMatch(coreStub.logger.messages.debug, /MEMORY_USAGE_BELOW_THRESHOLD/);

                coreStub.logger.setLogLevel('info');
                coreStub.logger.removeAllMessages();

                return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(coreStub.logger.messages.verbose);
                assert.isEmpty(coreStub.logger.messages.debug);
                coreStub.logger.setLogLevel('error');
                coreStub.logger.removeAllMessages();
                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        controls: {
                            class: 'Controls',
                            memoryMonitor: {
                                logLevel: 'error',
                                logFrequency: 30
                            }
                        },
                        listener: {
                            class: 'Telemetry_Listener'
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                coreStub.logger.removeAllMessages();
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 11 });
            })
            .then(() => {
                assert.lengthOf(coreStub.logger.messages.error, 1);
                assert.isEmpty(coreStub.logger.messages.verbose);
                assert.isEmpty(coreStub.logger.messages.debug);

                assert.includeMatch(coreStub.logger.messages.error, /MEMORY_USAGE_BELOW_THRESHOLD/);
            }));

        it('should work according to declaration content', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry'
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => {
                assert.isFalse(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {},
                    enabled: false,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 0,
                        level: 'debug'
                    }
                });

                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isFalse(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isEmpty(events.all);

                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        listener: {
                            class: 'Telemetry_Listener'
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isRunning());
                assert.isTrue(resourceMonitor.isMemoryMonitorActive);
                assert.isNotNull(resourceMonitor.memoryState);
                assert.isAbove(events.check.length, 15);
                assert.deepStrictEqual(
                    events.check[events.check.length - 1].stats,
                    resourceMonitor.memoryState
                );
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 1.5, usage: 50 },
                            { interval: 1, usage: 60 },
                            { interval: 0.8, usage: 70 },
                            { interval: 0.5, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 4096,
                        releasePercent: 90,
                        thresholdPercent: 90
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 85501,
                        level: 'debug'
                    }
                });

                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry'
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.lengthOf(events.stop, 1);

                eraseEvents();
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isEmpty(events.all);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
            }));

        it('should use `warning` level when status changed', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry',
                listener: {
                    class: 'Telemetry_Listener'
                }
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => {
                assert.isNotEmpty(events.ok);
                assert.isEmpty(events.notOk);
                assert.isTrue(resourceMonitor.isProcessingEnabled());

                coreStub.logger.setLogLevel('info');
                coreStub.logger.removeAllMessages();
                eraseEvents();

                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 10000 * 1024 * 1024,
                    heapTotal: 10000 * 1024 * 1024,
                    heapUsed: 10000 * 1024 * 1024,
                    rss: 10000 * 1024 * 1024
                });
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.ok);
                assert.isNotEmpty(events.notOk);
                assert.isFalse(resourceMonitor.isProcessingEnabled());

                assert.notIncludeMatch(coreStub.logger.messages.all, /MEMORY_USAGE_BELOW_THRESHOLD/);
                assert.includeMatch(coreStub.logger.messages.warning, /MEMORY_USAGE_ABOVE_THRESHOLD/);
                assert.notIncludeMatch(coreStub.logger.messages.info, /MEMORY_USAGE_ABOVE_THRESHOLD/);

                assert.deepStrictEqual(coreStub.logger.messages.all.reduce(
                    (a, v) => a + (/MEMORY_USAGE_ABOVE_THRESHOLD/.test(v) ? 1 : 0),
                    0
                ), 1);

                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 10 * 1024 * 1024,
                    heapTotal: 10 * 1024 * 1024,
                    heapUsed: 10 * 1024 * 1024,
                    rss: 10 * 1024 * 1024
                });

                coreStub.logger.removeAllMessages();
                eraseEvents();
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isNotEmpty(events.ok);
                assert.isTrue(resourceMonitor.isProcessingEnabled());

                assert.notIncludeMatch(coreStub.logger.messages.all, /MEMORY_USAGE_ABOVE_THRESHOLD/);
                assert.notIncludeMatch(coreStub.logger.messages.warning, /MEMORY_USAGE_BELOW_THRESHOLD/);
                assert.includeMatch(coreStub.logger.messages.info, /MEMORY_USAGE_BELOW_THRESHOLD/);

                assert.deepStrictEqual(coreStub.logger.messages.all.reduce(
                    (a, v) => a + (/MEMORY_USAGE_BELOW_THRESHOLD/.test(v) ? 1 : 0),
                    0
                ), 1);
            }));

        it('should apply custom configuration from declaration', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry'
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        memoryThresholdPercent: 90,
                        memoryMonitor: {
                            provisionedMemory: 500
                        }
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ]))
            .then(() => {
                assert.isFalse(resourceMonitor.isRunning());
                assert.isFalse(resourceMonitor.isMemoryMonitorActive);
                assert.isNull(resourceMonitor.memoryState);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
            })
            .then(() => Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    controls: {
                        class: 'Controls',
                        memoryThresholdPercent: 90,
                        memoryMonitor: {
                            provisionedMemory: 500,
                            thresholdReleasePercent: 80
                        }
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ]))
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 1.5, usage: 50 },
                            { interval: 1, usage: 60 },
                            { interval: 0.8, usage: 70 },
                            { interval: 0.5, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 500,
                        releasePercent: 80,
                        thresholdPercent: 90
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 85501,
                        level: 'debug'
                    }
                });
                eraseEvents();
                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 400 * 1024 * 1024,
                    heapTotal: 400 * 1024 * 1024,
                    heapUsed: 400 * 1024 * 1024,
                    rss: 400 * 1024 * 1024
                });
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isEmpty(events.ok);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 460 * 1024 * 1024,
                    heapTotal: 460 * 1024 * 1024,
                    heapUsed: 460 * 1024 * 1024,
                    rss: 460 * 1024 * 1024
                });
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isNotEmpty(events.notOk);
                assert.isEmpty(events.ok);
                assert.isFalse(resourceMonitor.isProcessingEnabled());
                eraseEvents();
                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 400 * 1024 * 1024,
                    heapTotal: 400 * 1024 * 1024,
                    heapUsed: 400 * 1024 * 1024,
                    rss: 400 * 1024 * 1024
                });
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isEmpty(events.ok);
                assert.isFalse(resourceMonitor.isProcessingEnabled());
                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 300 * 1024 * 1024,
                    heapTotal: 300 * 1024 * 1024,
                    heapUsed: 300 * 1024 * 1024,
                    rss: 300 * 1024 * 1024
                });
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isNotEmpty(events.ok);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                eraseEvents();
                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 400 * 1024 * 1024,
                    heapTotal: 400 * 1024 * 1024,
                    heapUsed: 400 * 1024 * 1024,
                    rss: 400 * 1024 * 1024
                });
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isEmpty(events.ok);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        listener: {
                            class: 'Telemetry_Listener'
                        },
                        controls: {
                            class: 'Controls',
                            memoryThresholdPercent: 90,
                            memoryMonitor: {
                                provisionedMemory: 500,
                                memoryThresholdPercent: 70
                            }
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 1.5, usage: 50 },
                            { interval: 1, usage: 60 },
                            { interval: 0.8, usage: 70 },
                            { interval: 0.5, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 500,
                        releasePercent: 90,
                        thresholdPercent: 70
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 264001,
                        level: 'debug'
                    }
                });
                assert.isNotEmpty(events.notOk);
                assert.isEmpty(events.ok);
                assert.isFalse(resourceMonitor.isProcessingEnabled());
                eraseEvents();
            })
            .then(() => Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    controls: {
                        class: 'Controls',
                        memoryThresholdPercent: 50,
                        memoryMonitor: {
                            provisionedMemory: 500
                        }
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ]))
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isEmpty(events.ok);
                assert.isFalse(resourceMonitor.isProcessingEnabled());
            })
            .then(() => Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    controls: {
                        class: 'Controls',
                        memoryThresholdPercent: 90,
                        memoryMonitor: {
                            provisionedMemory: 500
                        }
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ]))
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 1.5, usage: 50 },
                            { interval: 1, usage: 60 },
                            { interval: 0.8, usage: 70 },
                            { interval: 0.5, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 500,
                        releasePercent: 90,
                        thresholdPercent: 90
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 323201,
                        level: 'debug'
                    }
                });
                assert.isEmpty(events.notOk);
                assert.isNotEmpty(events.ok);
                assert.isEmpty(events.stop);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
            }));

        it('should log a message when provisioned is more that configured', () => {
            coreStub.utilMisc.getRuntimeInfo.maxHeapSize = 1000;
            return Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    controls: {
                        class: 'Controls',
                        memoryThresholdPercent: 100,
                        memoryMonitor: {
                            provisionedMemory: 1300,
                            interval: 'aggressive'
                        }
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ])
                .then(() => {
                    assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                        config: {
                            freeMemoryLimit: 30,
                            intervals: [
                                { interval: 0.5, usage: 50 },
                                { interval: 0.4, usage: 60 },
                                { interval: 0.3, usage: 70 },
                                { interval: 0.2, usage: 80 },
                                { interval: 0.2, usage: 90 },
                                { interval: 0.1, usage: 100 }
                            ],
                            provisioned: 1000,
                            releasePercent: 90,
                            thresholdPercent: 100
                        },
                        enabled: false,
                        logging: {
                            freq: 10 * 1000,
                            lastMessage: 0,
                            level: 'debug'
                        }
                    });
                    assert.includeMatch(coreStub.logger.messages.all, /Please, adjust memory limit/);
                    assert.includeMatch(coreStub.logger.messages.all, /More frequent Memory Monior checks are enabled/);
                    assert.includeMatch(coreStub.logger.messages.all, /Disabling Memory Monitor due high threshold percent value/);
                    assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig.config.provisioned, 1000);
                    assert.isTrue(resourceMonitor.isProcessingEnabled());
                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            listener: {
                                class: 'Telemetry_Listener'
                            },
                            controls: {
                                class: 'Controls',
                                memoryMonitor: {
                                    provisionedMemory: 1300,
                                    memoryThresholdPercent: 100
                                }
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => {
                    assert.includeMatch(coreStub.logger.messages.all, /Please, adjust memory limit/);
                    assert.includeMatch(coreStub.logger.messages.all, /Disabling Memory Monitor due high threshold percent value/);
                    assert.isEmpty(events.stop);
                    assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig.config.provisioned, 1000);
                    assert.isTrue(resourceMonitor.isProcessingEnabled());
                });
        });

        it('should notify when not enough OS free memory', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry',
                listener: {
                    class: 'Telemetry_Listener'
                },
                controls: {
                    class: 'Controls',
                    memoryMonitor: {
                        osFreeMemory: 50,
                        interval: 'aggressive',
                        memoryThresholdPercent: 80
                    }
                }
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 50,
                        intervals: [
                            { interval: 0.5, usage: 50 },
                            { interval: 0.4, usage: 60 },
                            { interval: 0.3, usage: 70 },
                            { interval: 0.2, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 4096,
                        releasePercent: 90,
                        thresholdPercent: 80
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 23501,
                        level: 'debug'
                    }
                });
                assert.isEmpty(events.notOk);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                eraseEvents();
                coreStub.resourceMonitorUtils.osAvailableMem.free = 40;
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isNotEmpty(events.notOk);
                assert.isFalse(resourceMonitor.isProcessingEnabled());
                eraseEvents();
                coreStub.resourceMonitorUtils.osAvailableMem.free = 400;
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isNotEmpty(events.ok);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                eraseEvents();
                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        listener: {
                            class: 'Telemetry_Listener'
                        },
                        controls: {
                            class: 'Controls',
                            memoryMonitor: {
                                interval: 'aggressive',
                                memoryThresholdPercent: 80
                            }
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.isEmpty(events.notOk);
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                coreStub.resourceMonitorUtils.osAvailableMem.free = 20;
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isNotEmpty(events.notOk);
                assert.isFalse(resourceMonitor.isProcessingEnabled());
                eraseEvents();
                coreStub.resourceMonitorUtils.osAvailableMem.free = 400;
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isTrue(resourceMonitor.isProcessingEnabled());
                assert.isEmpty(events.notOk);
                assert.isNotEmpty(events.ok);
                assert.isEmpty(events.stop);
            }));

        it('should update check intervals according to declaration', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry',
                listener: {
                    class: 'Telemetry_Listener'
                },
                controls: {
                    class: 'Controls',
                    logLevel: 'verbose'
                }
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 1.5, usage: 50 },
                            { interval: 1, usage: 60 },
                            { interval: 0.8, usage: 70 },
                            { interval: 0.5, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 4096,
                        releasePercent: 90,
                        thresholdPercent: 90
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 25501,
                        level: 'debug'
                    }
                });
                eraseEvents();
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                // default interval is 1.5 for low pressure. for 30seconds we should have at least 10
                assert.isBelow(events.check.length, 25);
                eraseEvents();
                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        listener: {
                            class: 'Telemetry_Listener'
                        },
                        controls: {
                            class: 'Controls',
                            logLevel: 'verbose',
                            memoryMonitor: {
                                interval: 'aggressive'
                            }
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 0.5, usage: 50 },
                            { interval: 0.4, usage: 60 },
                            { interval: 0.3, usage: 70 },
                            { interval: 0.2, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 4096,
                        releasePercent: 90,
                        thresholdPercent: 90
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 87001,
                        level: 'debug'
                    }
                });
                eraseEvents();
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                // default interval is 0.5 for low pressure. for 30seconds we should have at least 20
                assert.isAbove(events.check.length, 35);
                eraseEvents();
                return Promise.all([
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        listener: {
                            class: 'Telemetry_Listener'
                        },
                        controls: {
                            class: 'Controls',
                            logLevel: 'verbose',
                            memoryMonitor: {
                                interval: 'default'
                            }
                        }
                    }),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                ]);
            })
            .then(() => {
                assert.deepStrictEqual(resourceMonitor.memoryMonitorConfig, {
                    config: {
                        freeMemoryLimit: 30,
                        intervals: [
                            { interval: 1.5, usage: 50 },
                            { interval: 1, usage: 60 },
                            { interval: 0.8, usage: 70 },
                            { interval: 0.5, usage: 80 },
                            { interval: 0.2, usage: 90 },
                            { interval: 0.1, usage: 100 }
                        ],
                        provisioned: 4096,
                        releasePercent: 90,
                        thresholdPercent: 90
                    },
                    enabled: true,
                    logging: {
                        freq: 10 * 1000,
                        lastMessage: 148501,
                        level: 'debug'
                    }
                });
                eraseEvents();
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                // default interval is 0.5 for low pressure. for 30seconds we should have at least 20
                assert.isBelow(events.check.length, 25);
            }));
    });

    describe('ProcessingState', () => {
        let cbEvents;
        let clock;
        let onDisableCb;
        let onEnableCb;
        let ps;

        function eraseCbEvents() {
            cbEvents = {
                onDisable: [],
                onEnable: []
            };
        }

        beforeEach(() => {
            clock = stubs.clock();

            onDisableCb = () => {
                const memState = ps.memoryState;
                assert.deepStrictEqual(memState.thresholdStatus, APP_THRESHOLDS.MEMORY.STATE.NOT_OK);
                cbEvents.onDisable.push(memState);
            };
            onEnableCb = () => {
                const memState = ps.memoryState;
                if (memState) {
                    assert.deepStrictEqual(memState.thresholdStatus, APP_THRESHOLDS.MEMORY.STATE.OK);
                }
                cbEvents.onEnable.push(memState);
            };

            ps = resourceMonitor.initializePState(onEnableCb, onDisableCb);

            eraseCbEvents();
        });

        it('should allow processing once created', () => {
            assert.isTrue(ps.enabled);
        });

        it('should not call callbacks on initialization', () => {
            ps.initialize(onEnableCb, onDisableCb);
            assert.isEmpty(cbEvents.onDisable);
            assert.isEmpty(cbEvents.onEnable);

            return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                .then(() => {
                    assert.isEmpty(cbEvents.onDisable);
                    assert.isEmpty(cbEvents.onEnable);
                });
        });

        it('should change state according to memory usage', () => Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    memoryMonitor: {
                        provisionedMemory: 300,
                        memoryThresholdPercent: 90
                    }
                },
                listener: {
                    class: 'Telemetry_Listener'
                }
            }),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
        ])
            .then(() => {
                assert.isTrue(ps.enabled);
                // should not call callbacks if enabled already
                assert.isEmpty(cbEvents.onEnable);
                assert.isEmpty(cbEvents.onDisable);
                assert.isNotEmpty(events.all);

                Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                    external: 290 * 1024 * 1024,
                    heapTotal: 290 * 1024 * 1024,
                    heapUsed: 290 * 1024 * 1024,
                    rss: 290 * 1024 * 1024
                });

                ps.initialize(onEnableCb, onDisableCb);
                assert.isTrue(ps.enabled);
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isFalse(ps.enabled);
                assert.isEmpty(cbEvents.onEnable);
                assert.lengthOf(cbEvents.onDisable, 1);
                assert.isNotEmpty(events.all);
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            }));

        it('should change state according to memory usage', () => {
            ps.initialize(onEnableCb, onDisableCb);
            return Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        memoryMonitor: {
                            provisionedMemory: 300,
                            memoryThresholdPercent: 90
                        }
                    },
                    listener: {
                        class: 'Telemetry_Listener'
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ])
                .then(() => {
                    assert.isTrue(ps.enabled);
                    // should not call callbacks if enabled already
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.isNotEmpty(events.all);
                })
                .then(() => {
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 290 * 1024 * 1024,
                        heapTotal: 290 * 1024 * 1024,
                        heapUsed: 290 * 1024 * 1024,
                        rss: 290 * 1024 * 1024
                    });
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 100 * 1024 * 1024,
                        heapTotal: 100 * 1024 * 1024,
                        heapUsed: 100 * 1024 * 1024,
                        rss: 100 * 1024 * 1024
                    });
                    eraseCbEvents();
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.isNotEmpty(events.all);

                    eraseCbEvents();
                    coreStub.resourceMonitorUtils.osAvailableMem.free = 20;
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    coreStub.resourceMonitorUtils.osAvailableMem.free = 500;
                    eraseCbEvents();
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                });
        });

        it('should change enable processing when memory monitor deactivated', () => {
            ps.initialize(onEnableCb, onDisableCb);
            return Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        memoryMonitor: {
                            provisionedMemory: 300,
                            memoryThresholdPercent: 90
                        }
                    },
                    listener: {
                        class: 'Telemetry_Listener'
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ])
                .then(() => {
                    assert.isTrue(ps.enabled);
                    // should not call callbacks if enabled already
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.isNotEmpty(events.all);

                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            controls: {
                                class: 'Controls',
                                memoryMonitor: {
                                    provisionedMemory: 300,
                                    memoryThresholdPercent: 90
                                }
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.isNotEmpty(events.all);
                    eraseEvents();
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.isEmpty(events.all);
                    coreStub.resourceMonitorUtils.osAvailableMem.free = 20;
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    assert.isEmpty(events.all);

                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            controls: {
                                class: 'Controls',
                                memoryMonitor: {
                                    provisionedMemory: 300,
                                    memoryThresholdPercent: 90
                                }
                            },
                            listener: {
                                class: 'Telemetry_Listener'
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);

                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            controls: {
                                class: 'Controls',
                                memoryMonitor: {
                                    provisionedMemory: 300,
                                    memoryThresholdPercent: 90
                                }
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                });
        });

        it('should enable processing once resource monitor destroyed', () => {
            coreStub.resourceMonitorUtils.osAvailableMem.free = 20;
            ps.initialize(onEnableCb, onDisableCb);
            return Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        logLevel: 'verbose',
                        memoryMonitor: {
                            provisionedMemory: 300,
                            memoryThresholdPercent: 90
                        }
                    },
                    listener: {
                        class: 'Telemetry_Listener'
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ])
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                    return resourceMonitor.destroy();
                })
                .then(() => clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 }))
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    assert.isNotEmpty(events.all);
                });
        });

        it('should enable/disable processing according to the state', () => {
            ps.initialize(onEnableCb, onDisableCb);
            return Promise.all([
                configWorker.processDeclaration({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        logLevel: 'verbose',
                        memoryMonitor: {
                            provisionedMemory: 300,
                            memoryThresholdPercent: 90
                        }
                    }
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
            ])
                .then(() => clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 }))
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    coreStub.resourceMonitorUtils.osAvailableMem.free = 20;
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.isEmpty(cbEvents.onDisable);
                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            controls: {
                                class: 'Controls',
                                logLevel: 'verbose',
                                memoryMonitor: {
                                    provisionedMemory: 300,
                                    memoryThresholdPercent: 90
                                }
                            },
                            listener: {
                                class: 'Telemetry_Listener'
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 }))
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.isEmpty(cbEvents.onEnable);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    coreStub.resourceMonitorUtils.osAvailableMem.free = 500;
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.lengthOf(cbEvents.onDisable, 1);
                    Object.assign(coreStub.resourceMonitorUtils.appMemoryUsage, {
                        external: 340 * 1024 * 1024,
                        heapTotal: 340 * 1024 * 1024,
                        heapUsed: 340 * 1024 * 1024,
                        rss: 340 * 1024 * 1024
                    });
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => {
                    assert.isFalse(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 1);
                    assert.lengthOf(cbEvents.onDisable, 2);

                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            controls: {
                                class: 'Controls',
                                logLevel: 'verbose',
                                memoryMonitor: {
                                    provisionedMemory: 500,
                                    memoryThresholdPercent: 90
                                }
                            },
                            listener: {
                                class: 'Telemetry_Listener'
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 2);
                    assert.lengthOf(cbEvents.onDisable, 2);

                    return Promise.all([
                        configWorker.processDeclaration({
                            class: 'Telemetry',
                            controls: {
                                class: 'Controls',
                                logLevel: 'verbose',
                                memoryMonitor: {
                                    provisionedMemory: 500,
                                    memoryThresholdPercent: 90
                                }
                            }
                        }),
                        clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                    ]);
                })
                .then(() => {
                    assert.isTrue(ps.enabled);
                    assert.lengthOf(cbEvents.onEnable, 2);
                    assert.lengthOf(cbEvents.onDisable, 2);
                });
        });
    });
});
