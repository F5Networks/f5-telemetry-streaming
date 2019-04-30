/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');

/* eslint-disable global-require */

describe('PersistentStorage', () => {
    let psModule;
    let persistentStorage;
    let restStorage;
    let restWorker;

    beforeEach(() => {
        psModule = require('../../src/nodejs/persistentStorage.js');
        persistentStorage = psModule.persistentStorage;
        restWorker = {
            loadState: (first, cb) => { cb(null, {}); },
            saveState: (first, state, cb) => { cb(null); }
        };
        restStorage = new psModule.RestStorage(restWorker);
        restStorage._cache = null;

        persistentStorage.storage = restStorage;
    });
    afterEach(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should fail to load when restWorker returns error (restStorage)', () => {
        const errMsg = 'loadStateError';
        restWorker.loadState = (first, cb) => { cb(new Error(errMsg), {}); };
        return persistentStorage.load()
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (RegExp(errMsg).test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail to save when restWorker returns error (restStorage)', () => {
        const errMsg = 'saveStateError';
        restWorker.saveState = (first, state, cb) => cb(new Error(errMsg));
        return persistentStorage.load().then(() => persistentStorage.save())
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (RegExp(errMsg).test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail to set when restWorker returns error (restStorage)', () => {
        const errMsg = 'setDataError';
        restWorker.saveState = (first, second, cb) => { cb(new Error(errMsg), {}); };
        return persistentStorage.load()
            .then(() => persistentStorage.set('somekey', 'somedata'))
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (RegExp(errMsg).test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail to remove when restWorker returns error (restStorage)', () => {
        const errMsg = 'removeDataError';
        restWorker.saveState = (first, second, cb) => { cb(new Error(errMsg), {}); };
        return persistentStorage.load()
            .then(() => persistentStorage.remove('somekey'))
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (RegExp(errMsg).test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail to load when no restWorker provided (restStorage)', () => {
        restStorage.restWorker = null;
        try {
            persistentStorage.load();
            assert.fail('Should throw an error');
        } catch (err) {
            if (!/restWorker is not specified/.test(err)) assert.fail(err);
        }
    });

    it('should fail to save when no restWorker provided (restStorage)', () => {
        restStorage.restWorker = null;
        try {
            persistentStorage.save();
            assert.fail('Should throw an error');
        } catch (err) {
            if (!/restWorker is not specified/.test(err)) assert.fail(err);
        }
    });

    it('should load empty state (restStorage)', () => {
        restWorker.loadState = (first, cb) => { cb(null, null); };
        return persistentStorage.load()
            .then((state) => {
                assert.deepEqual(state, {});
                assert.deepEqual(restStorage._cache, { _data_: {} });
                return Promise.resolve();
            });
    });

    it('should fail to save null state (restStorage)', () => {
        restStorage._cache = null;
        try {
            persistentStorage.save();
            assert.fail('Should throw an error');
        } catch (err) {
            if (!/no loaded state/.test(err)) assert.fail(err);
        }
    });

    it('should save loaded state (restStorage)', () => persistentStorage.load()
        .then(() => persistentStorage.save()));

    it('should return undefined when key doesn\'t exists', () => persistentStorage.load()
        .then(() => persistentStorage.get('undefinedkey'))
        .then((data) => {
            assert.strictEqual(data, undefined);
            return Promise.resolve();
        }));

    it('should return data when key exists (restStorage)', () => {
        const someKey = 'somekey';
        const someData = 'somedata';

        return persistentStorage.load()
            .then(() => persistentStorage.set(someKey, someData))
            .then(() => persistentStorage.get(someKey))
            .then((data) => {
                assert.strictEqual(data, someData);
                return Promise.resolve();
            });
    });

    it('should removed data when key doesn\'t exists (restStorage)', () => {
        const someKey = 'somekey';

        return persistentStorage.load()
            .then(() => persistentStorage.remove(someKey))
            .then(() => persistentStorage.get(someKey))
            .then((data) => {
                assert.strictEqual(data, undefined);
                return Promise.resolve();
            });
    });

    it('should removed data when key exists (restStorage)', () => {
        const someKey = 'somekey';
        const someData = 'somedata';

        return persistentStorage.load()
            .then(() => persistentStorage.set(someKey, someData))
            .then(() => persistentStorage.get(someKey))
            .then((data) => {
                assert.strictEqual(data, someData);
                return Promise.resolve();
            });
    });

    it('should load pre-existing old-version state (restStorage)', () => {
        const baseState = {
            config: {
                key: 'somedata'
            }
        };

        restWorker.loadState = (first, cb) => { cb(null, JSON.parse(JSON.stringify(baseState))); };
        return persistentStorage.load()
            .then((state) => {
                assert.deepEqual(state, baseState);
                return Promise.resolve();
            });
    });

    it('should load pre-existing current-version state (restStorage)', () => {
        const baseState = {
            _data_: {
                somekey: 'somedata'
            }
        };

        restWorker.loadState = (first, cb) => { cb(null, baseState); };
        return persistentStorage.load()
            .then((state) => {
                assert.deepEqual(restStorage._cache, baseState);
                assert.deepEqual(state, baseState._data_);
                return Promise.resolve();
            });
    });

    it('should preserve service properties on load and save (restStorage)', () => {
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

        restWorker.loadState = (first, cb) => { cb(null, loadState); };
        restWorker.saveState = (first, currentState, cb) => {
            currentState.sp1 = saveState.sp1;
            currentState.sp2 = saveState.sp2;
            cb(null);
        };

        return persistentStorage.load()
            .then((state) => {
                assert.deepEqual(restStorage._cache, loadState);
                assert.deepEqual(state, loadState._data_);

                return persistentStorage.save();
            })
            .then(() => {
                const cache = restStorage._cache;
                assert.deepEqual(cache, saveState);
                assert.deepEqual(cache._data_, saveState._data_);
                return Promise.resolve();
            });
    });

    it('should save only once in current event cycle (restStorage)', () => {
        const restState = {
            _data_: {}
        };
        let saveCounter = 0;
        const key = 'somekey';
        const expectedValue = 'expectedValue';

        restWorker.saveState = (first, currentState, cb) => {
            restState._data_ = currentState._data_;
            saveCounter += 1;
            cb(null, restState);
        };
        return persistentStorage.load()
            .then(() => Promise.all([
                persistentStorage.set(key, 1),
                persistentStorage.set(key, 2),
                persistentStorage.set(key, 3),
                persistentStorage.set(key, expectedValue)
            ]))
            .then(() => persistentStorage.get(key))
            .then((value) => {
                assert.strictEqual(saveCounter, 1);
                assert.strictEqual(value, expectedValue);
                return Promise.resolve();
            });
    });

    it('should load only once in current event cycle (restStorage)', () => {
        const restState = {
            _data_: {}
        };
        let saveCounter = 0;

        restWorker.loadState = (first, cb) => {
            saveCounter += 1;
            cb(null, restState);
        };
        return persistentStorage.load() // load #1
            .then(() => Promise.all([ // load #2
                persistentStorage.load(),
                persistentStorage.load(),
                persistentStorage.load(),
                persistentStorage.load(),
                persistentStorage.load()
            ]))
            .then(() => Promise.all([ // load #3
                persistentStorage.load(),
                persistentStorage.load(),
                persistentStorage.load(),
                persistentStorage.load(),
                persistentStorage.load()
            ]))
            .then(() => {
                assert.strictEqual(saveCounter, 3);
                return Promise.resolve();
            });
    });

    it('should fail to save when unable to copy data (restStorage)', () => {
        restStorage._cache = {
            _data_: {}
        };
        restStorage._cache._data_.cache = restStorage._cache;

        return persistentStorage.save()
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Converting circular structure to JSON/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should be able to save data after previous attempt (restStorage)', () => {
        const restState = {
            _data_: {}
        };
        let saveCounter = 0;
        const key = 'somekey';
        const expectedValue = 'expectedValue';

        restWorker.saveState = (first, currentState, cb) => {
            restState._data_ = currentState._data_;
            saveCounter += 1;
            cb(null, restState);
        };
        return persistentStorage.load() // load #1
            .then(() => Promise.all([ // save #1
                persistentStorage.set(key, 1),
                persistentStorage.set(key, 2),
                persistentStorage.set(key, 3),
                persistentStorage.set(key, 4)
            ]))
            .then(() => Promise.all([ // save #2
                persistentStorage.set(key, 1),
                persistentStorage.set(key, 2),
                persistentStorage.set(key, 10),
                persistentStorage.set(key, expectedValue)
            ]))
            .then(() => persistentStorage.get(key))
            .then((value) => {
                assert.strictEqual(value, expectedValue);
                assert.strictEqual(saveCounter, 2);
                return Promise.resolve();
            });
    });

    it('should be able to save / load in current cycle (restStorage)', () => {
        const restState = {
            _data_: {}
        };
        let slCounter = 0;
        const loadIdx = [];
        const saveIdx = [];


        restWorker.saveState = (first, currentState, cb) => {
            restState._data_ = currentState._data_;
            saveIdx.push(slCounter);
            slCounter += 1;
            cb(null, restState);
        };

        restWorker.loadState = (first, cb) => {
            loadIdx.push(slCounter);
            slCounter += 1;
            cb(null, restState);
        };

        return persistentStorage.load() // load #1
            .then(() => Promise.all([ // load #2,  save #1
                persistentStorage.set('somekey1', 1),
                persistentStorage.set('somekey2', 2),
                persistentStorage.set('somekey3', 3),
                persistentStorage.load(),
                persistentStorage.set('somekey4', 4),
                persistentStorage.load(),
                persistentStorage.set('somekey5', 6),
                persistentStorage.load(),
                persistentStorage.set('somekey6', 1)
            ]))
            .then(() => {
                assert.strictEqual(saveIdx.length, 1);
                assert.strictEqual(loadIdx.length, 2);
                return Promise.resolve();
            });
    });

    it('should preserve load-save order (restStorage)', () => {
        const restState = {
            _data_: {}
        };
        let slCounter = 0;
        let loadIdx = null;
        let saveIdx = null;

        restWorker.saveState = (first, currentState, cb) => {
            restState._data_ = currentState._data_;
            saveIdx = slCounter;
            slCounter += 1;
            cb(null, restState);
        };

        restWorker.loadState = (first, cb) => {
            loadIdx = slCounter;
            slCounter += 1;
            cb(null, restState);
        };
        persistentStorage.storage._cache = restState;
        persistentStorage.load(); // load #1
        persistentStorage.save(); // save #1
        persistentStorage.load(); // load #1 !
        return persistentStorage.save() // save #1
            .then(() => {
                assert.strictEqual(loadIdx, 0);
                assert.strictEqual(saveIdx, 1);
                return Promise.resolve();
            });
    });

    it('should preserve save-load order (restStorage)', () => {
        const restState = {
            _data_: {}
        };
        let slCounter = 0;
        let loadIdx = null;
        let saveIdx = null;

        restWorker.saveState = (first, currentState, cb) => {
            restState._data_ = currentState._data_;
            saveIdx = slCounter;
            slCounter += 1;
            cb(null, restState);
        };

        restWorker.loadState = (first, cb) => {
            loadIdx = slCounter;
            slCounter += 1;
            cb(null, restState);
        };
        persistentStorage.storage._cache = restState;
        persistentStorage.save(); // load #1
        persistentStorage.load(); // save #1
        persistentStorage.save(); // load #1 !
        return persistentStorage.load() // save #1
            .then(() => {
                assert.strictEqual(loadIdx, 1);
                assert.strictEqual(saveIdx, 0);
                return Promise.resolve();
            });
    });
});
