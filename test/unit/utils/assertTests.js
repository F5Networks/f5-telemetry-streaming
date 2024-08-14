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

const assertUtil = sourceCode('src/lib/utils/assert');

moduleCache.remember();

describe('Misc Util', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('assert', () => {
        describe('.boolean()', () => {
            it('should validate boolean', () => {
                assert.throws(() => assertUtil.boolean(null, 'boolean'));
                assert.throws(() => assertUtil.boolean({}, 'boolean'));
                assert.throws(() => assertUtil.boolean('', 'boolean'));
                assert.throws(() => assertUtil.boolean(undefined, 'boolean'));

                assertUtil.boolean(true, 'boolean');
                assertUtil.boolean(false, 'boolean');
            });
        });

        describe('.object()', () => {
            it('should validate object', () => {
                assert.throws(() => assertUtil.object([], 'object'));
                assert.throws(() => assertUtil.object([10], 'object'));
                assert.throws(() => assertUtil.object(true, 'object'));
                assert.throws(() => assertUtil.object(10, 'object'));
                assert.throws(() => assertUtil.object(null, 'object'));
                assert.throws(() => assertUtil.object(undefined, 'object'));
                assert.throws(() => assertUtil.object({}, 'object'));

                assertUtil.object({ key: 'value' }, 'object');
            });
        });

        describe('.instanceOf()', () => {
            it('should validate instance', () => {
                class Class {}
                class AnotherClass {}
                const inst = new Class();

                assert.throws(() => assertUtil.instanceOf(inst, AnotherClass, 'instance'));

                assertUtil.instanceOf(inst, Class, 'instance');
            });
        });

        describe('.string()', () => {
            it('should validate string', () => {
                assert.throws(() => assertUtil.string(null, 'string'));
                assert.throws(() => assertUtil.string({}, 'string'));
                assert.throws(() => assertUtil.string('', 'string'));
                assert.throws(() => assertUtil.string(undefined, 'string'));

                assertUtil.string('string', 'string');
            });
        });
    });
});
