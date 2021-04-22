/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const actionProcessor = require('../../src/lib/actionProcessor');
const actionProcessorData = require('./data/actionProcessorTestsData');
const dataUtil = require('../../src/lib/utils/data');
const dataTagging = require('../../src/lib/dataTagging');
const testUtil = require('./shared/util');

const EVENT_TYPES = require('../../src/lib/constants').EVENT_TYPES;

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Action Processor', () => {
    describe('processActions', () => {
        ['dataTagging', 'dataFiltering', 'combinations'].forEach((actionType) => {
            describe(actionType, () => {
                actionProcessorData.processActions[actionType].forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, () => {
                        const deviceCtx = testConf.deviceCtx || {
                            deviceVersion: '13.0.0.0',
                            provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
                        };

                        actionProcessor.processActions(testConf.dataCtx, testConf.actions, deviceCtx);
                        assert.deepStrictEqual(testConf.dataCtx, testConf.expectedCtx);
                    });
                });
            });
        });

        describe('handler calls', () => {
            it('should handle actions in desired order', () => {
                const handlerCalls = [];
                sinon.stub(dataUtil, 'preserveStrictMatches').callsFake(() => {
                    handlerCalls.push('preserveStrictMatches');
                });
                sinon.stub(dataUtil, 'removeStrictMatches').callsFake(() => {
                    handlerCalls.push('removeStrictMatches');
                });
                sinon.stub(dataTagging, 'addTags').callsFake(() => {
                    handlerCalls.push('addTags');
                });
                const dataCtx = {
                    data: {
                        foo: 'bar'
                    },
                    type: EVENT_TYPES.SYSTEM_POLLER
                };
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
                assert.deepStrictEqual(handlerCalls,
                    ['addTags', 'preserveStrictMatches', 'addTags', 'removeStrictMatches'],
                    'should call handler functions and skip disabled actions');
            });
        });
    });
});
