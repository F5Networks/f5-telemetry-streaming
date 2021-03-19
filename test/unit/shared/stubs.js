/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const sinon = require('sinon');

const deepCopy = require('./util').deepCopy;


module.exports = {
    /**
     * Stub for Persistent Storage with RestStorage as backend
     *
     * @param {module} persistentStorage - instance
     *
     * @returns {PersistentStorageStubCtx} stub context
     */
    persistentStorage(persistentStorage) {
        const restWorker = {
            loadState: sinon.stub(),
            saveState: sinon.stub()
        };
        const ctx = {
            loadCb: null,
            // loadData - should be set explicitly
            loadError: null,
            loadState: { _data_: {} },
            restWorker,
            saveCb: null,
            saveError: null,
            savedState: null,
            savedStateParse: true,
            stub: sinon.stub(persistentStorage.persistentStorage, 'storage')
        };
        restWorker.loadState.callsFake((first, cb) => {
            if (ctx.loadCb) {
                ctx.loadCb(ctx, first, cb);
            }
            if (Object.prototype.hasOwnProperty.call(ctx, 'loadData')) {
                ctx.loadState = { _data_: JSON.stringify(ctx.loadData) };
                delete ctx.loadData;
            }
            cb(ctx.loadError, ctx.loadState);
        });
        restWorker.saveState.callsFake((first, state, cb) => {
            if (ctx.saveCb) {
                ctx.saveCb(ctx, first, state, cb);
            }
            // override to be able to load it again
            ctx.loadState = state;
            ctx.savedState = deepCopy(state);
            if (ctx.savedState._data_ && ctx.savedStateParse) {
                ctx.savedState._data_ = JSON.parse(ctx.savedState._data_);
            }
            cb(ctx.saveError);
        });
        ctx.stub.value(new persistentStorage.RestStorage(restWorker));
        return ctx;
    }
};

/**
 * @typedef PersistentStorageStubCtx
 * @type {object}
 * @property {function} loadCb - error to throw on attempt to load
 * @property {any} loadData - data to set to '_data_' property on attempt to load
 * @property {Error} loadError - error to return to callback passed on attempt to load
 * @property {any} loadState - state to return on attempt to load
 * @property {object} restWorker - RestWorker stub
 * @property {function} saveCb - error to throw on attempt to save
 * @property {Error} saveError - error to return to callback passed on attempt to save
 * @property {any} savedState - saved state on attempt to save (will override 'loadState')
 * @property {boolean} savedStateParse - parse '_data_' property of saved state if exist
 */
