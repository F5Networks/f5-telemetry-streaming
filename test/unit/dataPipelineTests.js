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
require('./shared/disableAjv'); // forwarder imports config with ajv

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const dataFilter = require('../../src/lib/dataFilter');
const dataPipeline = require('../../src/lib/dataPipeline');
const dataTagging = require('../../src/lib/dataTagging');
const EVENT_TYPES = require('../../src/lib/constants').EVENT_TYPES;
const forwarder = require('../../src/lib/forwarder');

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
                assert.deepStrictEqual(JSON.parse(tracerData), dataCtx, 'tracer data should match processed data');
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
});
