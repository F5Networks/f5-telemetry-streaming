/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const actionProcessor = require('../../src/lib/actionProcessor');
const constants = require('../../src/lib/constants');
const consumers = require('../../src/lib/consumers');
const dataPipeline = require('../../src/lib/dataPipeline');
const forwarder = require('../../src/lib/forwarder');
const logger = require('../../src/lib/logger');
const monitor = require('../../src/lib/utils/monitor');
const stubs = require('./shared/stubs');
const testAssert = require('./shared/assert');

const EVENT_TYPES = constants.EVENT_TYPES;

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Data Pipeline', () => {
    let forwardFlag;
    let forwardedData;
    let forwardError;
    let processActionsData;
    let processActionsStub;

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
        let coreStub;

        const dataCtx = {
            data: {
                event_source: 'request_logging',
                event_timestamp: '2019-01-01:01:01.000Z',
                telemetryEventCategory: 'LTM'
            },
            type: EVENT_TYPES.LTM_EVENT,
            destinationIds: [1234, 6789]
        };

        const dataCtx2 = {
            data: {
                EOCTimestamp: '1556592720',
                AggrInterval: '30',
                HitCount: '3',
                telemetryEventCategory: 'AVR'
            },
            type: EVENT_TYPES.AVR_EVENT,
            destinationIds: [4564]
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
            coreStub = stubs.coreStub({
                logger
            });
        });

        it('should not forward when memory thresholds reached and log info for skipped data', () => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK)
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                assert.strictEqual(forwardFlag, false, 'should not call forwarder');
                assert.strictEqual(dataPipeline.isEnabled(), false, 'should disable data pipeline');
                testAssert.includeMatch(coreStub.logger.messages.warning, 'MEMORY_USAGE_HIGH. Incoming data will not be forwarded');
                testAssert.includeMatch(coreStub.logger.messages.warning, 'Skipped Data - Category: "LTM" | Consumers: ["consumer1","consumer3"] | Addtl Info: "event_timestamp": "2019-01-01:01:01.000Z"');
            }));

        it('should re-enable when memory thresholds return to normal', () => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK)
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.OK))
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                assert.strictEqual(forwardFlag, true, 'should call forwarder');
                assert.strictEqual(dataPipeline.isEnabled(), true, 'should enable data pipeline');
                testAssert.includeMatch(coreStub.logger.messages.warning, 'MEMORY_USAGE_OK. Resuming data pipeline processing.');
            }));

        it('should only log when status changed', () => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.OK)
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                // default threshold ok, so emitting an OK should not trigger a log
                assert.isTrue(coreStub.logger.warning.notCalled);
                return monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK);
            })
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                testAssert.includeMatch(coreStub.logger.messages.warning, 'MEMORY_USAGE_HIGH. Incoming data will not be forwarded.');
                testAssert.includeMatch(coreStub.logger.messages.warning, 'Skipped Data - Category: "LTM" | Consumers: ["consumer1","consumer3"] | Addtl Info: "event_timestamp": "2019-01-01:01:01.000Z"');
                return monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK);
            })
            .then(() => dataPipeline.process(dataCtx2, options))
            .then(() => {
                testAssert.includeMatch(coreStub.logger.messages.warning, 'Skipped Data - Category: "AVR" | Consumers: ["consumer2"] | Addtl Info: "EOCTimestamp": "1556592720"');
            }));
    });
});
