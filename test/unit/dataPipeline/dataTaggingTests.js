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

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');

const dataTagging = sourceCode('src/lib/dataPipeline/dataTagging');

moduleCache.remember();

describe('Data Tagging', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('addTag', () => {
        it('should make deep copy of tag\'s value (example 1)', () => {
            const actionCtx = {
                enable: true,
                setTag: {
                    tag: {
                        key: 'value'
                    }
                }
            };
            const dataCtx = {
                data: {
                    foo: 'bar'
                }
            };
            const deviceCtx = {
                deviceVersion: '13.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
            };
            const expectedCtx = {
                data: {
                    foo: 'bar',
                    tag: {
                        key: 'value'
                    }
                }
            };
            dataTagging.addTags(dataCtx, actionCtx, deviceCtx);
            delete actionCtx.setTag.tag.key;
            // data with injected tag should be not affected
            assert.deepStrictEqual(dataCtx, expectedCtx);
        });

        it('should make deep copy of tag\'s value (example 2)', () => {
            const actionCtx = {
                enable: true,
                setTag: {
                    tag: {
                        key: 'value'
                    }
                },
                locations: {
                    virtualServers: {
                        '.*': true
                    }
                }
            };
            const dataCtx = {
                data: {
                    virtualServers: {
                        vs1: {},
                        vs2: {}
                    }
                }
            };
            const deviceCtx = {
                deviceVersion: '13.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
            };
            const expectedCtx = {
                data: {
                    virtualServers: {
                        vs1: {
                            tag: {
                                key: 'value'
                            }
                        },
                        vs2: {
                            tag: {
                                key: 'value'
                            }
                        }
                    }
                }
            };
            dataTagging.addTags(dataCtx, actionCtx, deviceCtx);
            delete actionCtx.setTag.tag.key;
            // data with injected tag should be not affected
            assert.deepStrictEqual(dataCtx, expectedCtx);
            // data with injected tag should be not affected
            dataCtx.data.virtualServers.vs1.tag.key = 'newValue';
            assert.strictEqual(dataCtx.data.virtualServers.vs2.tag.key, 'value');
        });
    });
});
