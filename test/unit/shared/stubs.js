/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const sinon = require('sinon');

const constants = require('../../../src/lib/constants');
const deepCopy = require('./util').deepCopy;


/**
 * Add 'restore' function for stub
 *
 * @param {object} stub - stub
 * @param {function} restoreFn - function to call on restore
 */
function addStubRestore(stub, restoreFn) {
    const originRestore = stub.restore;
    stub.restore = () => {
        restoreFn();
        if (originRestore) {
            originRestore.call(stub);
        }
    };
}

// reference to module.exports
// eslint-disable-next-line no-multi-assign
const _module = module.exports = {
    /**
     * Stub core modules
     *
     * @param {object} coreModules - core modules to stub
     * @param {ConfigWorker} [coreModules.configWorker] - config worker
     * @param {module} [coreModules.deviceUtil] - Device Utils module
     * @param {module} [coreModules.persistentStorage] - Persistent Storage module
     * @param {module} [coreModules.teemReporter] - Teem Reporter module
     * @param {module} [coreModules.utilMisc] - Utils (misc.) module
     *
     * @returns {CoreStubCtx} stubs for core modules
     */
    coreStub(coreModules) {
        const ctx = {};
        if (coreModules.configWorker) {
            ctx.configWorker = _module.configWorker(coreModules.configWorker);
        }
        if (coreModules.deviceUtil) {
            ctx.deviceUtil = _module.deviceUtil(coreModules.deviceUtil);
        }
        if (coreModules.persistentStorage) {
            ctx.persistentStorage = _module.persistentStorage(coreModules.persistentStorage);
        }
        if (coreModules.teemReporter) {
            ctx.teemReporter = _module.teemReporter(coreModules.teemReporter);
        }
        if (coreModules.utilMisc) {
            ctx.utilMisc = _module.utilMisc(coreModules.utilMisc);
        }
        return ctx;
    },

    /**
     * Stub for Config Worker
     *
     * @param {ConfigWorker} configWorker - instance of ConfigWorker
     *
     * @returns {ConfigWorkerStubCtx} stub context
     */
    configWorker(configWorker) {
        const ctx = _module.eventEmitter(configWorker);
        ctx.configs = [];
        configWorker.on('change', config => ctx.configs.push(config));
        return ctx;
    },

    /**
     * Stub for Device Utils
     *
     * @param {module} deviceUtil - module
     *
     * @returns {DeviceUtilStubCtx} stub context
     */
    deviceUtil(deviceUtil) {
        const ctx = {
            decryptSecret: sinon.stub(deviceUtil, 'decryptSecret'),
            encryptSecret: sinon.stub(deviceUtil, 'encryptSecret'),
            getDeviceType: sinon.stub(deviceUtil, 'getDeviceType')
        };
        ctx.decryptSecret.callsFake(data => Promise.resolve(data.slice(3)));
        ctx.encryptSecret.callsFake(data => Promise.resolve(`$M$${data}`));
        ctx.getDeviceType.resolves(constants.DEVICE_TYPE.BIG_IP);
        return ctx;
    },

    /**
     * Stub for EventEmitter2
     *
     * @param {EventEmitter2} emitter - EventEmitter2 instance
     *
     * @returns {EventEmitter2Ctx} stub context
     */
    eventEmitter(emitter) {
        const ctx = {
            preExistingListeners: {},
            stub: sinon.stub()
        };
        emitter.eventNames().forEach((evtName) => {
            ctx.preExistingListeners[evtName] = emitter.listeners(evtName).slice(0);
        });
        addStubRestore(ctx.stub, () => {
            emitter.removeAllListeners();
            Object.keys(ctx.preExistingListeners).forEach((evtName) => {
                ctx.preExistingListeners[evtName].forEach(listener => emitter.on(evtName, listener));
            });
        });
        return ctx;
    },

    /**
     * Stub listener for EventEmitter
     *
     * @param {EventEmitter} emitter - emitter
     * @param {string} event - event name
     * @param {function} [listener] - listener
     *
     * @returns {object} sinon stub and adds stub as listener for event
     */
    eventEmitterListener(emitter, event, listener) {
        const stub = sinon.stub();
        emitter.on(event, stub);
        stub.callsFake(listener);
        addStubRestore(stub, () => emitter.removeListener(event, stub));
        return stub;
    },

    /**
     * Stub for Persistent Storage with RestStorage as backend
     *
     * @param {module} persistentStorage - module
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
            savedData: null,
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
                ctx.savedData = deepCopy(ctx.savedState._data_);
            }
            cb(ctx.saveError);
        });
        ctx.stub.value(new persistentStorage.RestStorage(restWorker));
        return ctx;
    },

    /**
     * Stub for TeemReporter
     *
     * @param {module} teemReporter - module
     *
     * @returns {TeemReporterStubCtx} stub context
     */
    teemReporter(teemReporter) {
        const ctx = {
            declarations: [],
            stub: sinon.stub(teemReporter.TeemReporter.prototype, 'process')
        };
        ctx.stub.callsFake(declaration => ctx.declarations.push(declaration));
        return ctx;
    },

    /**
     * Stub for Utils (misc.)
     *
     * @param {module} utilMisc  - module
     *
     * @returns {UtilMiscStubCtx} stub context
     */
    utilMisc(utilMisc) {
        const ctx = {
            generateUuid: sinon.stub(utilMisc, 'generateUuid'),
            getRuntimeInfo: sinon.stub(utilMisc, 'getRuntimeInfo'),
            networkCheck: sinon.stub(utilMisc, 'networkCheck')
        };
        ctx.generateUuid.uuidCounter = 0;
        ctx.generateUuid.callsFake(() => {
            ctx.generateUuid.uuidCounter += 1;
            return `uuid${ctx.generateUuid.uuidCounter}`;
        });
        ctx.getRuntimeInfo.value(() => ({ nodeVersion: '4.6.0' }));
        ctx.networkCheck.resolves();
        return ctx;
    }
};

/**
 * @typedef CoreStubCtx
 * @type {object}
 * @property {ConfigWorkerStubCtx} configWorker - config worker stub
 * @property {DeviceUtilStubCtx} deviceUtil - Device Util stub
 * @property {PersistentStorageStubCtx} persistentStorage - Persistent Storage stub
 * @property {TeemReporterStubCtx} teemReporter - Teem Reporter stub
 * @property {UtilMiscStubCtx} utilMisc - Util Misc. stub
 */
/**
 * @typedef DeviceUtilStubCtx
 * @type {object}
 * @property {object} decryptSecret - stub for decryptSecret
 * @property {object} encryptSecret - stub for encryptSecret
 * @property {object} getDeviceType - stub for getDeviceType
 */
/**
 * @typedef EventEmitter2Ctx
 * @type {object}
 * @property {Object<string, Array<function>} preExistingListeners - listeners to restore
 * @property {object} stub - sinon stub
 */
/**
 * @typedef ConfigWorkerStubCtx
 * @type {EventEmitter2Ctx}
 * @property {Array<object>} configs - list of emitted configs
 */
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
 * @property {object} stub - sinon stub
 */
/**
 * @typedef TeemReporterStubCtx
 * @type {object}
 * @property {Array<object>} declarations - list of processed declarations
 * @property {object} stub - sinon stub
 */
/**
 * @typedef UtilMiscStubCtx
 * @type {object}
 * @property {object} generateUuid - stub for generateUuid
 * @property {number} generateUuid.uuidCounter - counter value
 * @property {object} getRuntimeInfo - stub for getRuntimeInfo
 * @property {object} networkCheck - stub for networkCheck
 */
