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

const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');

moduleCache.remember();

describe('Safe Event Emitter', () => {
    const eventName = 'eventName';
    let emitter;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        emitter = new SafeEventEmitter();
    });

    afterEach(() => {
        emitter.removeAllListeners(eventName);
    });

    describe('safeEmit', () => {
        it('should catch listener error', () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            const ret = emitter.safeEmit(eventName);
            assert.isTrue(error === ret, 'should return error');
        });
    });

    describe('safeEmitAsync', () => {
        it('should catch listener error in sync part', () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            return assert.becomes(emitter.safeEmitAsync(eventName), error);
        });

        it('should catch listener error in async part', () => {
            const error = new Error('test error');
            emitter.on(eventName, () => new Promise((resolve, reject) => { reject(error); }));
            return assert.becomes(emitter.safeEmitAsync(eventName), error);
        });
    });
});
