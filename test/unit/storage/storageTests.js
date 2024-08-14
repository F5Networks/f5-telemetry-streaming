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
const deepCopy = require('../shared/util').deepCopy;
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const Storage = sourceCode('src/lib/storage/storage');

moduleCache.remember();

describe('Storage Service / Storage', () => {
    let storageInst;
    let restWorkerStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        const coreStub = stubs.default.coreStub({ logger: true });
        restWorkerStub = stubs.restWorker();
        storageInst = new Storage(restWorkerStub, coreStub.logger.logger);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.get()', () => {
        beforeEach(() => {
            restWorkerStub.loadData = {
                somekey: [1, 2, 3, 4, 5]
            };
        });

        it('should return undefined when key does not exist', async () => {
            await storageInst.load();
            const value = await storageInst.get('somekey2');

            assert.isUndefined(value);
        });

        it('should return cached data copy on attempt to \'get\' it', async () => {
            await storageInst.load();
            const value = await storageInst.get('somekey');

            value.push(6);
            const valueCopy = await storageInst.get('somekey');

            assert.deepStrictEqual(valueCopy, [1, 2, 3, 4, 5]);
        });

        it('should return data (one level key)', async () => {
            await storageInst.load();
            const value = await storageInst.get('somekey');

            assert.deepStrictEqual(value, [1, 2, 3, 4, 5]);
        });

        it('should return data (multi level key)', async () => {
            await storageInst.load();
            const value = await storageInst.get('somekey[1]');

            assert.deepStrictEqual(value, 2);
        });

        it('should return data (multi level key as array)', async () => {
            restWorkerStub.loadData = {
                somekey: {
                    'key.with.dot': 10
                }
            };
            await storageInst.load();
            assert.deepStrictEqual(
                await storageInst.get(['somekey', 'key.with.dot']),
                10
            );
            assert.deepStrictEqual(
                await storageInst.get('somekey[\'key.with.dot\']'),
                10
            );
        });

        it('should throw error on invalid key', async () => {
            await assert.isRejected(storageInst.get(10), /should be a string/);
            await assert.isRejected(storageInst.get(['test', 10]), /should be a string/);
            await assert.isRejected(storageInst.get(undefined), /should be a string/);
        });
    });

    describe('.set()', () => {
        it('should make data copy on attempt to \'save\' it', async () => {
            await storageInst.load();

            const data = [1];
            const promise = storageInst.set('somekey', data);
            data.push(2);

            await promise;

            const value = await storageInst.get('somekey');
            assert.deepStrictEqual(value, [1]);
        });

        it('should set data (one level key)', async () => {
            await storageInst.load();
            await storageInst.set('somekey', 1);
            const value = await storageInst.get('somekey');

            assert.deepStrictEqual(value, 1);
        });

        it('should set data (multi level key)', async () => {
            await storageInst.load();
            await storageInst.set('somekey.first.second', 10);
            const value = await storageInst.get('somekey');

            assert.deepStrictEqual(value, { first: { second: 10 } });
        });

        it('should set data (multi level key as array)', async () => {
            await storageInst.load();
            await storageInst.set(['somekey', 'first', 'second'], 10);
            const value = await storageInst.get('somekey');

            assert.deepStrictEqual(value, { first: { second: 10 } });
        });

        it('should set data (multiple requests)', async () => {
            restWorkerStub.loadData = {};
            await storageInst.load();

            await Promise.all([
                storageInst.set('a.a', 10),
                storageInst.set('a.b', 20)
            ]);

            const results = await Promise.all([
                storageInst.get('a.a'),
                storageInst.get('a.b')
            ]);

            assert.deepStrictEqual(results, [10, 20]);

            const value = await storageInst.get('a');
            assert.deepStrictEqual(value, { a: 10, b: 20 });
        });

        it('should overwrite data for existing key (multiple requests)', () => {
            restWorkerStub.loadData = {};
            let counter = 0;
            const getAndSet = () => storageInst.get('data')
                .then((value) => {
                    if (typeof value === 'undefined') {
                        value = {};
                    }
                    value[counter] = counter;
                    counter += 1;
                    return storageInst.set('data', value);
                });
            return Promise.all([getAndSet(), getAndSet()])
                .then(() => storageInst.get('data'))
                .then((data) => {
                    assert.lengthOf(Object.keys(data), 1);
                });
        });

        it('should throw error on invalid key', () => {
            assert.throws(() => storageInst.set(10, 10), /should be a string/);
            assert.throws(() => storageInst.set(['test', 10], 10), /should be a string/);
            assert.throws(() => storageInst.set(undefined, 10), /should be a string/);
        });
    });

    describe('.remove()', () => {
        it('should remove data (one level key)', async () => {
            await storageInst.load();
            await storageInst.set('somekey.first.second', 10);

            const value = await storageInst.get('somekey');
            assert.deepStrictEqual(value, { first: { second: 10 } });

            await storageInst.remove('somekey');

            const valueCopy = await storageInst.get('somekey');
            assert.isUndefined(valueCopy);
        });

        it('should remove data (multi level key)', async () => {
            await storageInst.load();
            await storageInst.set('somekey.first.second', 10);

            const value = await storageInst.get('somekey');
            assert.deepStrictEqual(value, { first: { second: 10 } });

            await storageInst.remove('somekey.first.second');

            const valueCopy = await storageInst.get('somekey');
            assert.deepStrictEqual(valueCopy, { first: { } });
        });

        it('should remove data (multi level key as array)', async () => {
            await storageInst.load();
            await storageInst.set('somekey.first.second', 10);

            const value = await storageInst.get('somekey');
            assert.deepStrictEqual(value, { first: { second: 10 } });

            await storageInst.remove(['somekey', 'first', 'second']);

            const valueCopy = await storageInst.get('somekey');
            assert.deepStrictEqual(valueCopy, { first: { } });
        });

        it('should not error when removing non-existent key', async () => {
            await storageInst.load();
            assert.isUndefined(await storageInst.get('key'));

            await storageInst.remove('key');
            assert.isUndefined(await storageInst.get('key'));
        });

        it('should throw error on invalid key', async () => {
            await assert.isRejected(storageInst.remove(10), /should be a string/);
            await assert.isRejected(storageInst.remove(['test', 10]), /should be a string/);
            await assert.isRejected(storageInst.remove(undefined), /should be a string/);
        });
    });

    describe('.load()', () => {
        it('should fail to load when restWorker returns error', async () => {
            restWorkerStub.loadError = new Error('loadStateError');
            await assert.isRejected(storageInst.load(), /loadStateError/);
        });

        it('should fail to load when restWorker throws error', async () => {
            restWorkerStub.loadCbBefore = () => { throw new Error('loadStateError'); };
            await assert.isRejected(storageInst.load(), /loadStateError/);
        });

        it('should not fail when _data_ is null', async () => {
            restWorkerStub.loadData = null;
            await storageInst.load();
        });

        it('should not fail when state is null', async () => {
            restWorkerStub.loadStateData = null;
            await storageInst.load();
        });

        it('should not fail when state has unknown structure', async () => {
            restWorkerStub.loadStateData = { key: 'value' };
            await storageInst.load();

            assert.isUndefined(await storageInst.get('key'));
        });

        it('should load pre-existing state (old-version)', async () => {
            restWorkerStub.loadStateData = {
                config: {
                    key: 'somedata'
                }
            };
            await storageInst.load();
            assert.deepStrictEqual(await storageInst.get('config.key'), 'somedata');
        });

        it('should load pre-existing state (new-version)', async () => {
            restWorkerStub.loadStateData = {
                _data_: {
                    somekey: 'somedata'
                }
            };
            await storageInst.load();
            assert.deepStrictEqual(await storageInst.get('somekey'), 'somedata');
        });
    });

    describe('.save()', () => {
        it('should fail to save when restWorker returns error', async () => {
            restWorkerStub.saveError = new Error('saveStateError');
            await assert.isRejected(
                storageInst.load()
                    .then(() => storageInst.save()),
                /saveStateError/
            );
        });

        it('should fail to save when restWorker throws error', async () => {
            restWorkerStub.saveCbBefore = () => { throw new Error('saveStateError'); };
            await assert.isRejected(storageInst.save(), /saveStateError/);
        });

        it('should save loaded state', async () => {
            await storageInst.load();
            await storageInst.save();

            assert.deepStrictEqual(restWorkerStub.savedState, { _data_: { } });
        });

        it('should queue \'save\' operation if current \'save\' in progress', async () => {
            restWorkerStub.saveCbBefore = () => {
                // trigger next 'save' op and it will be queued
                // because we are in the middle of prev. 'save' op.
                storageInst.save();
                delete restWorkerStub.saveCbBefore;
            };
            await storageInst.load(); // save #1
            await storageInst.save();

            assert.strictEqual(restWorkerStub.saveState.callCount, 2);
        });

        it('should fail to save when unable to copy data', async () => {
            storageInst.storage._cache = {
                _data_: {}
            };
            storageInst.storage._cache._data_.cache = storageInst.storage._cache;
            await assert.isRejected(storageInst.save(), /Converting circular structure to JSON/);
        });
    });

    describe('.load() & .save() mix', () => {
        it('should preserve service properties on load and save', async () => {
            const expectedState = {
                _data_: {
                    somekey: 'somedata'
                },
                sp1: 200,
                sp2: 300
            };
            const loadState = {
                _data_: {
                    somekey: 'somedata'
                },
                sp1: 100,
                sp2: 200
            };
            restWorkerStub.loadStateData = deepCopy(loadState);
            restWorkerStub.saveCbBefore = (ctx, first, state) => {
                // sometimes RestWorker backend sets some data required for further work
                state.sp1 = 200;
                state.sp2 = 300;
            };
            await storageInst.load();
            await storageInst.save();

            assert.deepStrictEqual(restWorkerStub.savedState, expectedState);
        });

        it('should save only once in current event cycle', async () => {
            await storageInst.load();
            await Promise.all([
                storageInst.set('somekey', 1), // #1
                storageInst.set('somekey', 2), // #2, overrides #1
                storageInst.set('somekey', 3), // #3, overrides #2
                storageInst.set('somekey', 'expectedValue') // #4, overrides #3
            ]);

            const value = await storageInst.get('somekey');

            assert.strictEqual(value, 'expectedValue');
            assert.strictEqual(restWorkerStub.saveState.callCount, 1);
        });

        it('should load only once in current event cycle', async () => {
            await storageInst.load(); // load #1
            await Promise.all([ // load #2
                storageInst.load(),
                storageInst.load(),
                storageInst.load(),
                storageInst.load(),
                storageInst.load()
            ]);
            await Promise.all([ // load #3
                storageInst.load(),
                storageInst.load(),
                storageInst.load(),
                storageInst.load(),
                storageInst.load()
            ]);

            assert.strictEqual(restWorkerStub.loadState.callCount, 3);
        });

        it('should be able to save data after previous attempt', async () => {
            await storageInst.load(); // load #1
            await Promise.all([ // save #1
                storageInst.set('somekey', 1),
                storageInst.set('somekey', 2),
                storageInst.set('somekey', 3),
                storageInst.set('somekey', 4)
            ]);
            await Promise.all([ // save #2
                storageInst.set('somekey', 1),
                storageInst.set('somekey', 2),
                storageInst.set('somekey', 10),
                storageInst.set('somekey', 'expectedValue')
            ]);

            const value = await storageInst.get('somekey');

            assert.strictEqual(value, 'expectedValue');
            assert.strictEqual(restWorkerStub.saveState.callCount, 2);
        });

        it('should be able to save / load in current cycle', async () => {
            await storageInst.load(); // load #1
            await Promise.all([ // load #2,  save #1
                storageInst.set('somekey1', 1),
                storageInst.set('somekey2', 2),
                storageInst.set('somekey3', 3),
                storageInst.load(),
                storageInst.set('somekey4', 4),
                storageInst.load(),
                storageInst.set('somekey5', 6),
                storageInst.load(),
                storageInst.set('somekey6', 1)
            ]);

            assert.strictEqual(restWorkerStub.saveState.callCount, 1);
            assert.strictEqual(restWorkerStub.loadState.callCount, 2);
        });

        it('should preserve load-save order', async () => {
            const history = [];
            restWorkerStub.loadCbBefore = () => history.push('load');
            restWorkerStub.saveCbBefore = () => history.push('save');
            storageInst.load(); // load #1
            storageInst.save(); // save #1
            storageInst.load(); // load #1
            storageInst.save(); // save #1

            await storageInst.save(); // save #1

            assert.deepStrictEqual(history, ['load', 'save']);
        });

        it('should preserve save-load order', async () => {
            const history = [];
            restWorkerStub.loadCbBefore = () => history.push('load');
            restWorkerStub.saveCbBefore = () => history.push('save');
            storageInst.save(); // load #1
            storageInst.load(); // save #1
            storageInst.save(); // load #1
            storageInst.load(); // save #1

            await storageInst.load(); // save #1

            assert.deepStrictEqual(history, ['save', 'load']);
        });
    });
});
