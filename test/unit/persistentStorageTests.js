/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const deepCopy = require('./shared/util').deepCopy;
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Persistent Storage', () => {
    let persistentStorageInst;
    let persistentStorageStub;

    beforeEach(() => {
        persistentStorageInst = persistentStorage.persistentStorage;
        persistentStorageStub = stubs.persistentStorage(persistentStorage);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('persistentStorage', () => {
        describe('.get()', () => {
            beforeEach(() => {
                persistentStorageStub.loadData = {
                    somekey: [1, 2, 3, 4, 5]
                };
            });

            it('should return data copy on attempt to \'get\' it', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.get('somekey'))
                .then((value) => {
                    value.push(6);
                    return persistentStorageInst.get('somekey');
                })
                .then(value => assert.deepStrictEqual(value, [1, 2, 3, 4, 5])));

            it('should return data (one level key)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, [1, 2, 3, 4, 5])));

            it('should return data (multi level key)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.get('somekey[1]'))
                .then(value => assert.deepStrictEqual(value, 2)));

            it('should return data (multi level key as array)', () => {
                persistentStorageStub.loadData = {
                    somekey: {
                        'key.with.dot': 10
                    }
                };
                return persistentStorageInst.load()
                    .then(() => persistentStorageInst.get(['somekey', 'key.with.dot']))
                    .then(value => assert.deepStrictEqual(value, 10));
            });
        });

        describe('.set()', () => {
            it('should return make data copy on attempt to \'save\' it', () => persistentStorageInst.load()
                .then(() => {
                    const data = [1];
                    const promise = persistentStorageInst.set('somekey', data);
                    data.push(2);
                    return promise;
                })
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, [1])));

            it('should set data (one level key)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.set('somekey', 1))
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, 1)));

            it('should set data (multi level key)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.set('somekey.first.second', 10))
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, { first: { second: 10 } })));

            it('should set data (multi level key as array)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.set(['somekey', 'first', 'second'], 10))
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, { first: { second: 10 } })));

            it('should set data (multiple requests)', () => {
                persistentStorageStub.loadData = {};
                return persistentStorageInst.load()
                    .then(() => Promise.all([
                        persistentStorageInst.set('a.a', 10),
                        persistentStorageInst.set('a.b', 20)
                    ]))
                    .then(() => Promise.all([
                        persistentStorageInst.get('a.a'),
                        persistentStorageInst.get('a.b')
                    ]))
                    .then(results => assert.deepStrictEqual(results, [10, 20]))
                    .then(() => persistentStorageInst.get('a'))
                    .then(value => assert.deepStrictEqual(value, { a: 10, b: 20 }));
            });

            it('should override data (multiple requests)', () => {
                persistentStorageStub.loadData = {};
                let counter = 0;
                const getAndSet = () => persistentStorageInst.get('data')
                    .then((value) => {
                        if (typeof value === 'undefined') {
                            value = {};
                        }
                        value[counter] = counter;
                        counter += 1;
                        return persistentStorageInst.set('data', value);
                    });
                return Promise.all([getAndSet(), getAndSet()])
                    .then(() => persistentStorageInst.get('data'))
                    .then((data) => {
                        assert.lengthOf(Object.keys(data), 1);
                    });
            });
        });

        describe('.remove()', () => {
            it('should remove data (one level key)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.set('somekey.first.second', 10))
                .then(() => persistentStorageInst.get('somekey'))
                .then((value) => {
                    assert.deepStrictEqual(value, { first: { second: 10 } });
                    return persistentStorageInst.remove('somekey');
                })
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, undefined)));

            it('should remove data (multi level key)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.set('somekey.first.second', 10))
                .then(() => persistentStorageInst.get('somekey'))
                .then((value) => {
                    assert.deepStrictEqual(value, { first: { second: 10 } });
                    return persistentStorageInst.remove('somekey.first.second');
                })
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, { first: { } })));

            it('should remove data (multi level key as array)', () => persistentStorageInst.load()
                .then(() => persistentStorageInst.set('somekey.first.second', 10))
                .then(() => persistentStorageInst.get('somekey'))
                .then((value) => {
                    assert.deepStrictEqual(value, { first: { second: 10 } });
                    return persistentStorageInst.remove(['somekey', 'first', 'second']);
                })
                .then(() => persistentStorageInst.get('somekey'))
                .then(value => assert.deepStrictEqual(value, { first: { } })));
        });
    });

    describe('RestStorage', () => {
        describe('.get()', () => {
            it('should return undefined when key doesn\'t exists', () => assert.becomes(
                persistentStorageInst.load().then(() => persistentStorageInst.get('undefinedkey')),
                undefined
            ));

            it('should return data when key exists', () => assert.becomes(
                persistentStorageInst.load()
                    .then(() => persistentStorageInst.set('someKey', 'someData'))
                    .then(() => persistentStorageInst.get('someKey')),
                'someData'
            ));
        });

        describe('.load()', () => {
            it('should fail to load when restWorker returns error', () => {
                persistentStorageStub.loadError = new Error('loadStateError');
                return assert.isRejected(persistentStorageInst.load(), /loadStateError/);
            });

            it('should fail to load when restWorker throws error', () => {
                persistentStorageStub.loadCbBefore = () => { throw new Error('loadStateError'); };
                return assert.isRejected(persistentStorageInst.load(), /loadStateError/);
            });

            it('should set _data_ to object when loaded null', () => {
                persistentStorageStub.loadData = null;
                return persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(state, {});
                        assert.deepStrictEqual(persistentStorageInst.storage._cache, { _data_: {} });
                    });
            });


            it('should load empty state', () => {
                persistentStorageStub.loadState = null;
                return persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(state, {});
                        assert.deepStrictEqual(persistentStorageInst.storage._cache, { _data_: {} });
                    });
            });

            it('should fail to load when no restWorker provided', () => {
                persistentStorageInst.storage.restWorker = null;
                assert.throws(
                    () => persistentStorageInst.load(),
                    /restWorker is not specified/
                );
            });

            it('should load pre-existing state (old-version)', () => {
                persistentStorageStub.loadState = {
                    config: {
                        key: 'somedata'
                    }
                };
                return assert.becomes(persistentStorageInst.load(), {
                    config: {
                        key: 'somedata'
                    }
                });
            });

            it('should load pre-existing state (new-version)', () => {
                persistentStorageStub.loadState = {
                    _data_: {
                        somekey: 'somedata'
                    }
                };
                return persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(persistentStorageInst.storage._cache, {
                            _data_: {
                                somekey: 'somedata'
                            }
                        });
                        assert.deepStrictEqual(state, { somekey: 'somedata' });
                    });
            });
        });

        describe('.remove()', () => {
            it('should fail to remove when restWorker returns error', () => {
                persistentStorageStub.saveError = new Error('removeDataError');
                return assert.isRejected(
                    persistentStorageInst.load()
                        .then(() => persistentStorageInst.remove('somekey')),
                    /removeDataError/
                );
            });

            it('should not fail when key doesn\'t exists', () => assert.becomes(
                persistentStorageInst.load()
                    .then(() => persistentStorageInst.remove('someKey'))
                    .then(() => persistentStorageInst.get('someKey')),
                undefined
            ));

            it('should remove data when key exists', () => assert.becomes(
                persistentStorageInst.load()
                    .then(() => persistentStorageInst.set('someKey', 'someData'))
                    .then(() => persistentStorageInst.get('someKey')),
                'someData'
            ));
        });

        describe('.save()', () => {
            it('should fail to save when restWorker returns error', () => {
                persistentStorageStub.saveError = new Error('saveStateError');
                return assert.isRejected(
                    persistentStorageInst.load()
                        .then(() => persistentStorageInst.save()),
                    /saveStateError/
                );
            });

            it('should fail to save when restWorker throws error', () => {
                persistentStorageStub.saveCbBefore = () => { throw new Error('saveStateError'); };
                return assert.isRejected(persistentStorageInst.save(), /saveStateError/);
            });

            it('should save loaded state', () => assert.isFulfilled(persistentStorageInst.load()
                .then(() => persistentStorageInst.save())));

            it('should fail to save when no restWorker provided', () => {
                persistentStorageInst.storage.restWorker = null;
                assert.throws(
                    () => persistentStorageInst.save(),
                    /restWorker is not specified/
                );
            });

            it('should fail to save null state', () => {
                persistentStorageInst.storage._cache = null;
                assert.throws(
                    () => persistentStorageInst.save(),
                    /no loaded state/
                );
            });

            it('should queue \'save\' operation if current \'save\' in progress', () => {
                persistentStorageStub.saveCbBefore = () => {
                    // trigger next 'save' op and it will be queued
                    // because we are in the middle of prev. 'save' op.
                    persistentStorageInst.save();
                    delete persistentStorageStub.saveCbBefore;
                };
                return persistentStorageInst.load() // save #1
                    .then(() => persistentStorageInst.save())
                    .then(() => {
                        assert.strictEqual(persistentStorageStub.restWorker.saveState.callCount, 2);
                    });
            });

            it('should fail to save when unable to copy data', () => {
                persistentStorageInst.storage._cache = {
                    _data_: {}
                };
                persistentStorageInst.storage._cache._data_.cache = persistentStorageInst.storage._cache;
                return assert.isRejected(persistentStorageInst.save(), /Converting circular structure to JSON/);
            });
        });

        describe('.set()', () => {
            it('should fail to set when restWorker returns error', () => {
                persistentStorageStub.saveError = new Error('setDataError');
                return assert.isRejected(
                    persistentStorageInst.load()
                        .then(() => persistentStorageInst.set('somekey', 'somedata')),
                    /setDataError/
                );
            });
        });

        describe('.load() & .save() mix', () => {
            it('should preserve service properties on load and save', () => {
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
                persistentStorageStub.loadState = deepCopy(loadState);
                persistentStorageStub.saveCbBefore = (ctx, first, state) => {
                    // sometimes RestWorker backend sets some data required for further work
                    state.sp1 = 200;
                    state.sp2 = 300;
                };
                return persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(persistentStorageInst.storage._cache, loadState);
                        assert.deepStrictEqual(state, loadState._data_);
                        return persistentStorageInst.save();
                    })
                    .then(() => {
                        // cache should be updated with 'service data'
                        const cache = persistentStorageInst.storage._cache;
                        assert.deepStrictEqual(cache, expectedState);
                        assert.deepStrictEqual(cache._data_, expectedState._data_);
                    });
            });

            it('should save only once in current event cycle', () => persistentStorageInst.load()
                .then(() => Promise.all([
                    persistentStorageInst.set('somekey', 1), // #1
                    persistentStorageInst.set('somekey', 2), // #2, overrides #1
                    persistentStorageInst.set('somekey', 3), // #3, overrides #2
                    persistentStorageInst.set('somekey', 'expectedValue') // #4, overrides #3
                ]))
                .then(() => persistentStorageInst.get('somekey'))
                .then((value) => {
                    assert.strictEqual(persistentStorageStub.restWorker.saveState.callCount, 1);
                    assert.strictEqual(value, 'expectedValue');
                }));

            it('should load only once in current event cycle', () => persistentStorageInst.load() // load #1
                .then(() => Promise.all([ // load #2
                    persistentStorageInst.load(),
                    persistentStorageInst.load(),
                    persistentStorageInst.load(),
                    persistentStorageInst.load(),
                    persistentStorageInst.load()
                ]))
                .then(() => Promise.all([ // load #3
                    persistentStorageInst.load(),
                    persistentStorageInst.load(),
                    persistentStorageInst.load(),
                    persistentStorageInst.load(),
                    persistentStorageInst.load()
                ]))
                .then(() => {
                    assert.strictEqual(persistentStorageStub.restWorker.loadState.callCount, 3);
                }));

            it('should be able to save data after previous attempt', () => persistentStorageInst.load() // load #1
                .then(() => Promise.all([ // save #1
                    persistentStorageInst.set('somekey', 1),
                    persistentStorageInst.set('somekey', 2),
                    persistentStorageInst.set('somekey', 3),
                    persistentStorageInst.set('somekey', 4)
                ]))
                .then(() => Promise.all([ // save #2
                    persistentStorageInst.set('somekey', 1),
                    persistentStorageInst.set('somekey', 2),
                    persistentStorageInst.set('somekey', 10),
                    persistentStorageInst.set('somekey', 'expectedValue')
                ]))
                .then(() => persistentStorageInst.get('somekey'))
                .then((value) => {
                    assert.strictEqual(value, 'expectedValue');
                    assert.strictEqual(persistentStorageStub.restWorker.saveState.callCount, 2);
                }));

            it('should be able to save / load in current cycle', () => persistentStorageInst.load() // load #1
                .then(() => Promise.all([ // load #2,  save #1
                    persistentStorageInst.set('somekey1', 1),
                    persistentStorageInst.set('somekey2', 2),
                    persistentStorageInst.set('somekey3', 3),
                    persistentStorageInst.load(),
                    persistentStorageInst.set('somekey4', 4),
                    persistentStorageInst.load(),
                    persistentStorageInst.set('somekey5', 6),
                    persistentStorageInst.load(),
                    persistentStorageInst.set('somekey6', 1)
                ]))
                .then(() => {
                    assert.strictEqual(persistentStorageStub.restWorker.saveState.callCount, 1);
                    assert.strictEqual(persistentStorageStub.restWorker.loadState.callCount, 2);
                }));

            it('should preserve load-save order', () => {
                const history = [];
                persistentStorageStub.loadCbBefore = () => history.push('load');
                persistentStorageStub.saveCbBefore = () => history.push('save');
                persistentStorageInst.load(); // load #1
                persistentStorageInst.save(); // save #1
                persistentStorageInst.load(); // load #1
                persistentStorageInst.save(); // save #1
                return persistentStorageInst.save() // save #1
                    .then(() => {
                        assert.deepStrictEqual(history, ['load', 'save']);
                    });
            });

            it('should preserve save-load order', () => {
                const history = [];
                persistentStorageStub.loadCbBefore = () => history.push('load');
                persistentStorageStub.saveCbBefore = () => history.push('save');
                persistentStorageInst.save(); // load #1
                persistentStorageInst.load(); // save #1
                persistentStorageInst.save(); // load #1
                persistentStorageInst.load(); // save #1
                return persistentStorageInst.load() // save #1
                    .then(() => {
                        assert.deepStrictEqual(history, ['save', 'load']);
                    });
            });
        });
    });
});
