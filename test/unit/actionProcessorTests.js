/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');

const actionProcessorData = require('./data/actionProcessorTestsData');
const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');
const testUtil = require('./shared/util');

const actionProcessor = sourceCode('src/lib/actionProcessor');
const dataUtil = sourceCode('src/lib/utils/data');
const dataTagging = sourceCode('/src/lib/dataTagging');
const EVENT_TYPES = sourceCode('src/lib/constants').EVENT_TYPES;

moduleCache.remember();

describe('Action Processor', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('processActions', () => {
        ['dataTagging', 'dataFiltering', 'JMESPath', 'combinations'].forEach((actionType) => {
            describe(actionType, () => {
                actionProcessorData.processActions[actionType].forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, () => {
                        const deviceCtx = testConf.deviceCtx || {
                            deviceVersion: '13.0.0',
                            provisioning: { ltm: { name: 'ltm', level: 'nominal' } },
                            bashDisabled: false
                        };

                        actionProcessor.processActions(testConf.dataCtx, testConf.actions, deviceCtx);
                        assert.deepStrictEqual(testConf.dataCtx, testConf.expectedCtx);
                    });
                });
            });
        });

        describe('handler calls', () => {
            let dataCtx;
            let handlerCalls;

            before(() => {
                dataCtx = {
                    data: {
                        foo: 'bar'
                    },
                    type: EVENT_TYPES.SYSTEM_POLLER
                };
                handlerCalls = [];
                sinon.stub(dataUtil, 'preserveStrictMatches').callsFake(() => {
                    handlerCalls.push('preserveStrictMatches');
                });
                sinon.stub(dataUtil, 'removeStrictMatches').callsFake(() => {
                    handlerCalls.push('removeStrictMatches');
                });
                sinon.stub(dataTagging, 'addTags').callsFake(() => {
                    handlerCalls.push('addTags');
                });
            });

            it('should handle actions in desired order', () => {
                const actions = [
                    {
                        enable: true,
                        setTag: {
                            tag1: 'value1'
                        }
                    },
                    {
                        enable: true,
                        includeData: {}
                    },
                    {
                        enable: true,
                        setTag: {
                            tag2: 'value2'
                        }
                    },
                    {
                        enable: false,
                        setTag: {
                            tag3: 'value3'
                        }
                    },
                    {
                        enable: true,
                        excludeData: {}
                    }
                ];

                actionProcessor.processActions(dataCtx, actions);
                assert.deepStrictEqual(
                    handlerCalls,
                    ['addTags', 'preserveStrictMatches', 'addTags', 'removeStrictMatches'],
                    'should call handler functions and skip disabled actions'
                );
            });

            it('should not fail if actions param is undefined', () => {
                actionProcessor.processActions(dataCtx, undefined);
                assert.deepStrictEqual(dataCtx, { data: { foo: 'bar' }, type: 'systemInfo' });
            });

            it('should fail on an unknown action', () => {
                const actions = [
                    {
                        enable: true,
                        myBadAction: {}
                    }
                ];
                assert.throws(
                    () => actionProcessor.processActions(dataCtx, actions),
                    /actionProcessor:processActions error: unknown action.*myBadAction/,
                    'should throw error if unknown action'
                );
            });
        });
    });
});
