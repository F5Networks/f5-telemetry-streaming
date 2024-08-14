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
const testUtils = require('../shared/util');

const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');
const StorageService = sourceCode('src/lib/storage');

moduleCache.remember();

describe('Storage Service', () => {
    let coreStub;
    let emitter;
    let storageService;
    let restWorkerStub;

    function getValue(key) {
        return new Promise((resolve, reject) => {
            emitter.emitAsync('storage.get', key, (error, value) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(value);
                }
            });
        });
    }

    function setValue(key, value, useCallback = true) {
        return new Promise((resolve, reject) => {
            const callback = !useCallback ? null : (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };
            emitter.emitAsync('storage.set', key, value, callback);

            if (!callback) {
                resolve();
            }
        });
    }

    function removeValue(key, useCallback = true) {
        return new Promise((resolve, reject) => {
            const callback = !useCallback ? null : (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };
            emitter.emitAsync('storage.remove', key, callback);

            if (!callback) {
                resolve();
            }
        });
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ appEvents: true, logger: true });

        restWorkerStub = stubs.restWorker();

        emitter = new SafeEventEmitter();
        storageService = new StorageService();
        storageService.initialize(coreStub.appEvents.appEvents, restWorkerStub);

        coreStub.appEvents.appEvents.register(emitter, 'test', ['storage.get', 'storage.set', 'storage.remove']);
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        await storageService.destroy();
        assert.isTrue(storageService.isDestroyed());

        sinon.restore();
    });

    it('should restart when unable to load storage data', async () => {
        restWorkerStub.loadState
            .onFirstCall()
            .callsFake((first, cb) => {
                cb(new Error('expected error'));
            });

        await storageService.restart({ attempts: 3 });
        assert.isTrue(storageService.isRunning());

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Unable to load application state from the storage/
        );
    });

    it('should get/set/remove data', async () => {
        await storageService.start();
        assert.isUndefined(await getValue('test'));

        await setValue('test', 'value');
        assert.deepStrictEqual(await getValue('test'), 'value');

        await setValue('test', { a: { b: { c: 10 } } });
        assert.deepStrictEqual(await getValue('test.a.b.c'), 10);
        assert.deepStrictEqual(await getValue(['test', 'a', 'b']), { c: 10 });

        await removeValue('test.b.c');
        await setValue('test', { a: { b: {} } });
    });

    it('should return error when unable to get data', async () => {
        await storageService.start();
        await assert.isRejected(getValue(['test', 10]), /should be a string/);
        await assert.isRejected(getValue(undefined), /should be a string/);
        await assert.isRejected(getValue(10), /should be a string/);
    });

    it('should return error when unable to set data', async () => {
        await storageService.start();
        await assert.isRejected(setValue(['test', 10], 10), /should be a string/);
        await assert.isRejected(setValue(undefined, 10), /should be a string/);
        await assert.isRejected(setValue(10, 10), /should be a string/);
    });

    it('should return error when unable to remove data', async () => {
        await storageService.start();
        await assert.isRejected(removeValue(['test', 10]), /should be a string/);
        await assert.isRejected(removeValue(undefined), /should be a string/);
        await assert.isRejected(removeValue(10), /should be a string/);
    });

    it('should not fail when no callback passed to storage.set', async () => {
        await storageService.start();

        restWorkerStub.saveState.callsFake((first, state, cb) => cb(new Error('expected save error')));

        await setValue('test', 10, false);
        assert.deepStrictEqual(await getValue('test'), 10);
    });

    it('should not fail when no callback passed to storage.remove', async () => {
        await storageService.start();

        restWorkerStub.saveState.callsFake((first, state, cb) => cb(new Error('expected remove error')));

        await removeValue('test', false);
    });

    it('should unregister listeners once stopped', async () => {
        await storageService.start();

        await setValue('test', 'value');
        assert.deepStrictEqual(await getValue('test'), 'value');

        await storageService.destroy();

        let done = false;
        setValue('test2', 'value')
            .then(() => {
                done = true;
            });

        await testUtils.sleep(500);
        assert.isFalse(done);
    });

    it('should register listeners once restarted', async () => {
        await storageService.start();

        await setValue('test', 'value');
        assert.deepStrictEqual(await getValue('test'), 'value');

        await storageService.restart();

        assert.deepStrictEqual(await getValue('test'), 'value');
    });
});
