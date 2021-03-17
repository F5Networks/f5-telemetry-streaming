/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const dataFilter = require('../../src/lib/dataFilter');
const dataPipeline = require('../../src/lib/dataPipeline');
const dataTagging = require('../../src/lib/dataTagging');
const constants = require('../../src/lib/constants');
const forwarder = require('../../src/lib/forwarder');
const logger = require('../../src/lib/logger');

const consumers = require('../../src/lib/consumers');
const monitor = require('../../src/lib/utils/monitor');

const EVENT_TYPES = constants.EVENT_TYPES;

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Data Pipeline', () => {
    let forwardFlag;
    let forwardedData;
    let forwardError;
    let handleActionsData;
    let taggingHandlerStub;

    beforeEach(() => {
        forwardedData = undefined;
        forwardError = undefined;
        forwardFlag = false;
        handleActionsData = [];

        sinon.stub(forwarder, 'forward').callsFake((data) => {
            forwardFlag = true;
            if (forwardError) {
                return Promise.reject(forwardError);
            }
            forwardedData = data;
            return Promise.resolve();
        });
        taggingHandlerStub = sinon.stub(dataTagging, 'handleAction');
        taggingHandlerStub.callsFake((dataCtx, actionCtx, deviceCtx) => {
            handleActionsData.push({ dataCtx, actionCtx, deviceCtx });
        });
        sinon.stub(dataFilter, 'handleAction').callsFake((dataCtx, actionCtx) => {
            handleActionsData.push({ dataCtx, actionCtx });
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
                assert.deepStrictEqual(handleActionsData, []);
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
                    handleActionsData,
                    [
                        {
                            dataCtx: {
                                data: {
                                    foo: 'bar',
                                    telemetryEventCategory: 'systemInfo'
                                },
                                type: 'systemInfo'
                            },
                            actionCtx: { enable: true, setTag: {} },
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
                assert.strictEqual(handleActionsData.length, 4);
                assert.deepStrictEqual(handleActionsData[0].actionCtx.setTag, {});
                assert.deepStrictEqual(handleActionsData[1].actionCtx.includeData, {});
                assert.deepStrictEqual(handleActionsData[2].actionCtx.setTag, {});
                assert.deepStrictEqual(handleActionsData[3].actionCtx.excludeData, {});
            });
    });

    it('should fail when unknown', () => {
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
        return assert.isRejected(
            dataPipeline.process(dataCtx, options),
            /unknown action/,
            'should fail when unknown action passed'
        );
    });

    it('should not forward when no data', () => {
        taggingHandlerStub.reset();
        taggingHandlerStub.callsFake((dataCtx) => {
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
        let loggerSpy;

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
            loggerSpy = sinon.spy(logger, 'warning');
        });

        afterEach(() => {
            loggerSpy.restore();
        });


        it('should not forward when memory thresholds reached and log info for skipped data', () => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK)
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                assert.strictEqual(forwardFlag, false, 'should not call forwarder');
                assert.strictEqual(dataPipeline.isEnabled(), false, 'should disable data pipeline');
                assert.strictEqual(loggerSpy.firstCall.args[0], 'MEMORY_USAGE_HIGH. Incoming data will not be forwarded.');
                assert.strictEqual(loggerSpy.secondCall.args[0], 'Skipped Data - Category: "LTM" | Consumers: ["consumer1","consumer3"] | Addtl Info: "event_timestamp": "2019-01-01:01:01.000Z"');
            }));

        it('should re-enable when memory thresholds return to normal', () => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK)
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.OK))
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                assert.strictEqual(forwardFlag, true, 'should call forwarder');
                assert.strictEqual(dataPipeline.isEnabled(), true, 'should enable data pipeline');
                assert.strictEqual(loggerSpy.lastCall.args[0], 'MEMORY_USAGE_OK. Resuming data pipeline processing.');
            }));

        it('should only log when status changed', () => monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.OK)
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                // default threshold ok, so emitting an OK should not trigger a log
                assert.isTrue(loggerSpy.notCalled);
                return monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK);
            })
            .then(() => dataPipeline.process(dataCtx, options))
            .then(() => {
                assert.strictEqual(loggerSpy.firstCall.args[0], 'MEMORY_USAGE_HIGH. Incoming data will not be forwarded.');
                assert.strictEqual(loggerSpy.secondCall.args[0], 'Skipped Data - Category: "LTM" | Consumers: ["consumer1","consumer3"] | Addtl Info: "event_timestamp": "2019-01-01:01:01.000Z"');
                return monitor.safeEmitAsync('check', constants.APP_THRESHOLDS.MEMORY.NOT_OK);
            })
            .then(() => dataPipeline.process(dataCtx2, options))
            .then(() => {
                assert.strictEqual(loggerSpy.callCount, 3);
                assert.strictEqual(loggerSpy.thirdCall.args[0], 'Skipped Data - Category: "AVR" | Consumers: ["consumer2"] | Addtl Info: "EOCTimestamp": "1556592720"');
            }));
    });
});
