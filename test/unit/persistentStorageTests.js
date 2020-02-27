/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const persistentStorage = require('../../src/lib/persistentStorage');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Persistent Storage', () => {
    describe('persistentStorage', () => {
        const restWorker = {
            loadState: (first, cb) => { cb(null, {}); },
            saveState: (first, state, cb) => { cb(null); }
        };

        let persistentStorageInst;
        let restStorage;

        beforeEach(() => {
            persistentStorageInst = persistentStorage.persistentStorage;
            restStorage = new persistentStorage.RestStorage(restWorker);
            restStorage._cache = null;
            persistentStorageInst.storage = restStorage;
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should return data copy on attempt to \'get\' it', () => {
            const baseState = {
                _data_: {
                    somekey: [1, 2, 3, 4, 5]
                }
            };
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                cb(null, baseState);
            });
            return assert.isFulfilled(
                persistentStorageInst.load()
                    .then(() => persistentStorageInst.get('somekey'))
                    .then((value) => {
                        value.push(6);
                        assert.deepStrictEqual(restStorage._cache._data_.somekey, [1, 2, 3, 4, 5]);
                    })
            );
        });

        it('should return make data copy on attempt to \'save\' it', () => {
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                cb(null, { _data_: {} });
            });
            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                cb(null);
            });
            return assert.isFulfilled(
                persistentStorageInst.load()
                    .then(() => {
                        const data = [1];
                        const promise = persistentStorageInst.set('somekey', data);
                        data.push(2);
                        return promise;
                    })
                    .then(() => {
                        assert.deepStrictEqual(restStorage._cache._data_.somekey, [1]);
                    })
            );
        });
    });

    describe('restStorage', () => {
        const restWorker = {
            loadState: (first, cb) => { cb(null, {}); },
            saveState: (first, state, cb) => { cb(null); }
        };

        let persistentStorageInst;
        let restStorage;

        beforeEach(() => {
            persistentStorageInst = persistentStorage.persistentStorage;
            restStorage = new persistentStorage.RestStorage(restWorker);
            restStorage._cache = null;
            persistentStorageInst.storage = restStorage;
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should fail to load when restWorker returns error', () => {
            const errMsg = 'loadStateError';
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                cb(new Error(errMsg), {});
            });
            const promise = persistentStorageInst.load();
            return assert.isRejected(promise, RegExp(errMsg));
        });

        it('should fail to save when restWorker returns error', () => {
            const errMsg = 'saveStateError';
            sinon.stub(restWorker, 'saveState').callsFake((first, state, cb) => {
                cb(new Error(errMsg), {});
            });
            const promise = persistentStorageInst.load()
                .then(() => persistentStorageInst.save());
            return assert.isRejected(promise, RegExp(errMsg));
        });

        it('should fail to set when restWorker returns error', () => {
            const errMsg = 'setDataError';
            sinon.stub(restWorker, 'saveState').callsFake((first, state, cb) => {
                cb(new Error(errMsg), {});
            });
            const promise = persistentStorageInst.load()
                .then(() => persistentStorageInst.set('somekey', 'somedata'));
            return assert.isRejected(promise, RegExp(errMsg));
        });

        it('should fail to remove when restWorker returns error', () => {
            const errMsg = 'removeDataError';
            sinon.stub(restWorker, 'saveState').callsFake((first, state, cb) => {
                cb(new Error(errMsg), {});
            });
            const promise = persistentStorageInst.load()
                .then(() => persistentStorageInst.remove('somekey'));
            return assert.isRejected(promise, RegExp(errMsg));
        });

        it('should fail to load when no restWorker provided', () => {
            restStorage.restWorker = null;
            assert.throws(
                () => persistentStorageInst.load(),
                /restWorker is not specified/
            );
        });

        it('should fail to save when no restWorker provided', () => {
            restStorage.restWorker = null;
            assert.throws(
                () => persistentStorageInst.save(),
                /restWorker is not specified/
            );
        });

        it('should load empty state', () => {
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => { cb(null, null); });
            return assert.isFulfilled(
                persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(state, {});
                        assert.deepStrictEqual(restStorage._cache, { _data_: {} });
                    })
            );
        });

        it('should fail to save null state', () => {
            restStorage._cache = null;
            assert.throws(
                () => persistentStorageInst.save(),
                /no loaded state/
            );
        });

        it('should save loaded state', () => assert.isFulfilled(
            persistentStorageInst.load()
                .then(() => persistentStorageInst.save())
        ));

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

        it('should remove data when key doesn\'t exists', () => assert.becomes(
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

        it('should load pre-existing state (old-version)', () => {
            const baseState = {
                config: {
                    key: 'somedata'
                }
            };
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                cb(null, testUtil.deepCopy(baseState));
            });
            return assert.becomes(persistentStorageInst.load(), baseState);
        });

        it('should load pre-existing state (new-version)', () => {
            const baseState = {
                _data_: {
                    somekey: 'somedata'
                }
            };
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                cb(null, testUtil.deepCopy(baseState));
            });
            return assert.isFulfilled(
                persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(restStorage._cache, baseState);
                        assert.deepStrictEqual(state, baseState._data_);
                    })
            );
        });

        it('should preserve service properties on load and save', () => {
            const loadState = {
                _data_: {
                    somekey: 'somedata'
                },
                sp1: 100,
                sp2: 200
            };
            const saveState = {
                _data_: {
                    somekey: 'somedata'
                },
                sp1: 200,
                sp2: 300
            };
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                cb(null, loadState);
            });
            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                currentState.sp1 = saveState.sp1;
                currentState.sp2 = saveState.sp2;
                cb(null);
            });
            return assert.isFulfilled(
                persistentStorageInst.load()
                    .then((state) => {
                        assert.deepStrictEqual(restStorage._cache, loadState);
                        assert.deepStrictEqual(state, loadState._data_);
                        return persistentStorageInst.save();
                    })
                    .then(() => {
                        const cache = restStorage._cache;
                        assert.deepStrictEqual(cache, saveState);
                        assert.deepStrictEqual(cache._data_, saveState._data_);
                    })
            );
        });

        it('should save only once in current event cycle', () => {
            const restState = {
                _data_: {}
            };
            let saveCounter = 0;

            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                restState._data_ = currentState._data_;
                saveCounter += 1;
                cb(null, restState);
            });
            return assert.isFulfilled(
                persistentStorageInst.load()
                    .then(() => Promise.all([
                        persistentStorageInst.set('somekey', 1),
                        persistentStorageInst.set('somekey', 2),
                        persistentStorageInst.set('somekey', 3),
                        persistentStorageInst.set('somekey', 'expectedValue')
                    ]))
                    .then(() => persistentStorageInst.get('somekey'))
                    .then((value) => {
                        assert.strictEqual(saveCounter, 1);
                        assert.strictEqual(value, 'expectedValue');
                    })
            );
        });

        it('should load only once in current event cycle', () => {
            const restState = {
                _data_: {}
            };
            let saveCounter = 0;

            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                saveCounter += 1;
                cb(null, restState);
            });
            return assert.isFulfilled(
                persistentStorageInst.load() // load #1
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
                        assert.strictEqual(saveCounter, 3);
                    })
            );
        });

        it('should fail to save when unable to copy data', () => {
            restStorage._cache = {
                _data_: {}
            };
            restStorage._cache._data_.cache = restStorage._cache;
            return assert.isRejected(persistentStorageInst.save(), /Converting circular structure to JSON/);
        });

        it('should be able to save data after previous attempt', () => {
            const restState = {
                _data_: {}
            };
            let saveCounter = 0;

            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                restState._data_ = currentState._data_;
                saveCounter += 1;
                cb(null, restState);
            });
            return assert.isFulfilled(
                persistentStorageInst.load() // load #1
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
                        assert.strictEqual(saveCounter, 2);
                    })
            );
        });

        it('should be able to save / load in current cycle', () => {
            const restState = {
                _data_: {}
            };
            let saveCounter = 0;
            let loadCounter = 0;

            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                restState._data_ = currentState._data_;
                saveCounter += 1;
                cb(null, restState);
            });
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                loadCounter += 1;
                cb(null, restState);
            });
            return assert.isFulfilled(
                persistentStorageInst.load() // load #1
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
                        assert.strictEqual(saveCounter, 1);
                        assert.strictEqual(loadCounter, 2);
                    })
            );
        });

        it('should preserve load-save order', () => {
            const restState = {
                _data_: {}
            };
            let counter = 0;
            let saveIdx = null;
            let loadIdx = null;

            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                restState._data_ = currentState._data_;
                saveIdx = counter;
                counter += 1;
                cb(null, restState);
            });
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                loadIdx = counter;
                counter += 1;
                cb(null, restState);
            });

            persistentStorageInst.storage._cache = restState;
            persistentStorageInst.load(); // load #1
            persistentStorageInst.save(); // save #1
            persistentStorageInst.load(); // load #1
            return assert.isFulfilled(
                persistentStorageInst.save() // save #1
                    .then(() => {
                        assert.strictEqual(loadIdx, 0);
                        assert.strictEqual(saveIdx, 1);
                    })
            );
        });

        it('should preserve save-load order', () => {
            const restState = {
                _data_: {}
            };
            let counter = 0;
            let saveIdx = null;
            let loadIdx = null;

            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                restState._data_ = currentState._data_;
                saveIdx = counter;
                counter += 1;
                cb(null, restState);
            });
            sinon.stub(restWorker, 'loadState').callsFake((first, cb) => {
                loadIdx = counter;
                counter += 1;
                cb(null, restState);
            });

            persistentStorageInst.storage._cache = restState;
            persistentStorageInst.save(); // load #1
            persistentStorageInst.load(); // save #1
            persistentStorageInst.save(); // load #1 !
            return assert.isFulfilled(
                persistentStorageInst.load() // save #1
                    .then(() => {
                        assert.strictEqual(loadIdx, 1);
                        assert.strictEqual(saveIdx, 0);
                    })
            );
        });

        it('should queue \'save\' operation if current \'save\' in progress', () => {
            let counter = 0;

            sinon.stub(restWorker, 'saveState').callsFake((first, currentState, cb) => {
                if (counter === 0) {
                    persistentStorageInst.save();
                }
                counter += 1;
                cb(null);
            });

            return assert.isFulfilled(
                persistentStorageInst.load() // save #1
                    .then(() => persistentStorageInst.save())
                    .then(() => {
                        assert.strictEqual(counter, 2);
                    })
            );
        });
    });
});
