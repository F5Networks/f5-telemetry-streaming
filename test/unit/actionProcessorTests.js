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
