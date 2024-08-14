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

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');

moduleCache.remember();

describe('Safe Event Emitter', () => {
    let coreStub;
    const eventName = 'eventName';
    let emitter;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true });
        emitter = new SafeEventEmitter();
    });

    afterEach(() => {
        emitter.removeAllListeners(eventName);
        sinon.restore();
    });

    describe('.emitAsync()', () => {
        it('should reject with listener error (sync error)', async () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            await assert.isRejected(
                emitter.emitAsync(eventName),
                /test error/,
                'should reject with error'
            );
        });

        it('should reject with listener error (async error)', async () => {
            const error = new Error('test error');
            emitter.on(eventName, () => new Promise((resolve, reject) => {
                setTimeout(() => reject(error), 10);
            }));
            await assert.isRejected(
                emitter.emitAsync(eventName),
                /test error/,
                'should reject with error'
            );
        });
    });

    describe('.safeEmit()', () => {
        it('should catch listener error', async () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            const ret = emitter.safeEmit(eventName);
            assert.isTrue(error === ret, 'should return error');
        });

        it('should log error', async () => {
            emitter.logger = coreStub.logger.logger.getChild('emitter');

            coreStub.logger.removeAllMessages();
            assert.isEmpty(coreStub.logger.messages.all);

            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            const ret = emitter.safeEmit(eventName);
            assert.isTrue(error === ret, 'should return error');

            assert.includeMatch(
                coreStub.logger.messages.error,
                /test error/
            );
        });
    });

    describe('.safeEmitAsync()', () => {
        it('should catch listener error in sync part', async () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            await assert.becomes(emitter.safeEmitAsync(eventName), error);
        });

        it('should log error (sync)', async () => {
            emitter.logger = coreStub.logger.logger.getChild('emitter');

            coreStub.logger.removeAllMessages();
            assert.isEmpty(coreStub.logger.messages.all);

            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            await assert.becomes(emitter.safeEmitAsync(eventName), error);

            assert.includeMatch(
                coreStub.logger.messages.error,
                /test error/
            );
        });

        it('should catch listener error in async part', async () => {
            const error = new Error('test error');
            emitter.on(eventName, () => new Promise((resolve, reject) => { reject(error); }));
            await assert.becomes(emitter.safeEmitAsync(eventName), error);
        });

        it('should log error (async)', async () => {
            emitter.logger = coreStub.logger.logger.getChild('emitter');

            coreStub.logger.removeAllMessages();
            assert.isEmpty(coreStub.logger.messages.all);

            const error = new Error('test error');
            emitter.on(eventName, () => new Promise((resolve, reject) => { reject(error); }));
            await assert.becomes(emitter.safeEmitAsync(eventName), error);

            assert.includeMatch(
                coreStub.logger.messages.error,
                /test error/
            );
        });
    });
});
