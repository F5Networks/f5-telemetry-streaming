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

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');
const testUtil = require('./shared/util');

const actionProcessor = sourceCode('src/lib/actionProcessor');
const configWorker = sourceCode('src/lib/config');
const constants = sourceCode('src/lib/constants');
const consumers = sourceCode('src/lib/consumers');
const dataPipeline = sourceCode('src/lib/dataPipeline');
const forwarder = sourceCode('src/lib/forwarder');
const ResourceMonitor = sourceCode('src/lib/resourceMonitor');

const EVENT_TYPES = constants.EVENT_TYPES;

moduleCache.remember();

describe('Data Pipeline', () => {
    let forwardFlag;
    let forwardedData;
    let forwardError;
    let processActionsData;
    let processActionsStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        forwardedData = undefined;
        forwardError = undefined;
        forwardFlag = false;
        processActionsData = [];

        sinon.stub(forwarder, 'forward').callsFake((data) => {
            forwardFlag = true;
            if (forwardError) {
                return Promise.reject(forwardError);
            }
            forwardedData = data;
            return Promise.resolve();
        });

        processActionsStub = sinon.stub(actionProcessor, 'processActions').callsFake((dataCtx, actions, deviceCtx) => {
            processActionsData.push({ dataCtx, actions, deviceCtx });
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should process data without options', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        return dataPipeline.process(dataCtx)
            .then((processedData) => {
                assert.deepStrictEqual(processedData, dataCtx);
                assert.deepStrictEqual(forwardedData, processedData, 'forwarded data should match processed data');
            });
    });

    it('should not forward data when noConsumers is true', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        return dataPipeline.process(dataCtx, { noConsumers: true })
            .then((processedData) => {
                assert.deepStrictEqual(processedData, dataCtx);
                assert.strictEqual(forwardedData, undefined, 'should not forward data');
            });
    });

    it('should write JSON data to tracer', () => {
        let tracerData;
        const tracer = {
            write: (data) => {
                tracerData = data;
            }
        };
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        return dataPipeline.process(dataCtx, { tracer })
            .then(() => {
                assert.notStrictEqual(tracerData, undefined, 'should write data to tracer');
                assert.deepStrictEqual(tracerData, dataCtx, 'tracer data should match processed data');
            });
    });

    it('should catch forwarder error', () => {
        forwardError = new Error('test error');
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        return assert.isFulfilled(dataPipeline.process(dataCtx));
    });

    it('should set telemetryEventCategory if undefined', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        return dataPipeline.process(dataCtx)
            .then((processedData) => {
                assert.strictEqual(processedData.data.telemetryEventCategory, EVENT_TYPES.DEFAULT);
                assert.strictEqual(forwardedData.data.telemetryEventCategory, EVENT_TYPES.DEFAULT);
            });
    });

    it('should ignore actions for iHealth data', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.IHEALTH_POLLER
        };
        const options = {
            actions: [
                {
                    enable: true,
                    setTag: {}
                }
            ]
        };
        return dataPipeline.process(dataCtx, options)
            .then(() => {
                assert.isEmpty(processActionsData);
            });
    });

    it('should ignore actions for raw event data', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.RAW_EVENT
        };
        const options = {
            actions: [
                {
                    enable: true,
                    setTag: {}
                }
            ]
        };
        return dataPipeline.process(dataCtx, options)
            .then(() => {
                assert.isEmpty(processActionsData);
            });
    });

    it('should pass deviceCtx as param for dataTagging handleAction if event is systemPoller', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.SYSTEM_POLLER
        };
        const options = {
            actions: [
                {
                    enable: true,
                    setTag: {}
                }
            ],
            deviceContext: {
                deviceVersion: 'a.b.c.1'
            }
        };
        return dataPipeline.process(dataCtx, options)
            .then(() => {
                assert.deepStrictEqual(
                    processActionsData,
                    [
                        {
                            dataCtx: {
                                data: {
                                    foo: 'bar',
                                    telemetryEventCategory: 'systemInfo'
                                },
                                type: 'systemInfo'
                            },
                            actions: [{ enable: true, setTag: {} }],
                            deviceCtx: { deviceVersion: 'a.b.c.1' }
                        }
                    ]
                );
            });
    });

    it('should handle actions in desired order', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        const options = {
            actions: [
                {
                    enable: true,
                    setTag: {}
                },
                {
                    enable: true,
                    includeData: {}
                },
                {
                    enable: true,
                    setTag: {}
                },
                {
                    enable: false,
                    setTag: {}
                },
                {
                    enable: true,
                    excludeData: {}
                }
            ]
        };
        return dataPipeline.process(dataCtx, options)
            .then(() => {
                const actualActions = processActionsData[0].actions;
                assert.lengthOf(actualActions, 5);
                assert.deepStrictEqual(actualActions[0].setTag, {});
                assert.deepStrictEqual(actualActions[1].includeData, {});
                assert.deepStrictEqual(actualActions[2].setTag, {});
                assert.deepStrictEqual(actualActions[3].setTag, {});
                assert.deepStrictEqual(actualActions[4].excludeData, {});
            });
    });

    it('should not fail on unknown action', () => {
        const dataCtx = {
            data: {
                foo: 'bar'
            },
            type: EVENT_TYPES.DEFAULT
        };
        const options = {
            actions: [
                {
                    enable: true,
                    unknownAction: {}
                }
            ]
        };

        return assert.isFulfilled(dataPipeline.process(dataCtx, options), 'should not fail on unknown actions');
    });

    it('should not forward when no data', () => {
        processActionsStub.reset();
        processActionsStub.callsFake((dataCtx) => {
            dataCtx.data = {};
        });
        const dataCtx = {
            data: {},
            type: EVENT_TYPES.DEFAULT
        };
        const options = {
            actions: [
                {
                    enable: true,
                    setTag: {}
                }
            ]
        };
        return dataPipeline.process(dataCtx, options)
            .then(() => {
                assert.strictEqual(forwardFlag, false, 'should not call forwarder');
            });
    });

    describe('monitor "on check" event', () => {
        let clock;
        let coreStub;
        let resourceMonitor;

        const defaultDeclaration = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                trace: true,
                systemPoller: [
                    {
                        interval: 180
                    },
                    {
                        interval: 200
                    }
                ]
            },
            My_Poller: {
                class: 'Telemetry_System_Poller',
                interval: 0
            }
        };

        const dataCtx = {
            data: {
                event_source: 'request_logging',
                event_timestamp: '2019-01-01:01:01.000Z',
                telemetryEventCategory: 'LTM'
            },
            type: EVENT_TYPES.LTM_EVENT,
            destinationIds: [1234, 6789]
        };

        const options = {
            actions: [
                {
                    enable: true,
                    setTag: {}
                }
            ]
        };

        beforeEach(() => {
            clock = stubs.clock();
            coreStub = stubs.default.coreStub({});
            resourceMonitor = new ResourceMonitor();

            const appCtx = {
                configMgr: configWorker,
                resourceMonitor
            };

            resourceMonitor.initialize(appCtx);
            dataPipeline.initialize(appCtx);

            sinon.stub(consumers, 'getConsumers').returns([
                {
                    name: 'consumer1',
                    id: 1234
                },
                {
                    name: 'consumer2',
                    id: 4564
                },
                {
                    name: 'consumer3',
                    id: 6789
                }
            ]);
            return resourceMonitor.start()
                .then(() => Promise.all([
                    configWorker.processDeclaration(testUtil.deepCopy(defaultDeclaration)),
                    clock.clockForward(3000, { promisify: true, delay: 1, repeat: 30 })
                ]));
        });

        it('should not forward when memory thresholds reached and log info for skipped data', () => {
            coreStub.resourceMonitorUtils.osAvailableMem.free = 10;
            return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                .then(() => dataPipeline.process(dataCtx, options))
                .then(() => {
                    assert.strictEqual(forwardFlag, false, 'should not call forwarder');
                    assert.strictEqual(dataPipeline.isEnabled(), false, 'should disable data pipeline');
                });
        });

        it('should re-enable when memory thresholds return to normal', () => {
            coreStub.resourceMonitorUtils.osAvailableMem.free = 10;
            return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 })
                .then(() => dataPipeline.process(dataCtx, options))
                .then(() => {
                    coreStub.resourceMonitorUtils.osAvailableMem.free = 500;
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
                })
                .then(() => dataPipeline.process(dataCtx, options))
                .then(() => {
                    assert.strictEqual(forwardFlag, true, 'should call forwarder');
                    assert.strictEqual(dataPipeline.isEnabled(), true, 'should enable data pipeline');
                });
        });
    });
});
