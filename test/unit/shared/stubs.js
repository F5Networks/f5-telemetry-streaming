/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const sinon = require('sinon');

const assignDefaults = require('./util').assignDefaults;
const constants = require('../../../src/lib/constants');
const deepCopy = require('./util').deepCopy;
const tsLogsForwarder = require('../../winstonLogger').tsLogger;

let SINON_FAKE_CLOCK = null;

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
     * Sinon fake timers
     *
     * @param {object} [options] - options
     * @param {any} [options.fakeTimersOpts] - sinon.useFakeTimers options, see sinon.useFakeTimers docs
     *
     * @returns {ClockStubCtx} clock stub context
     */
    clock(options) {
        options = options || {};
        if (SINON_FAKE_CLOCK === null) {
            SINON_FAKE_CLOCK = sinon.useFakeTimers(options.fakeTimersOpts);
        } else if (typeof options.fakeTimersOpts !== 'undefined') {
            throw new Error('SINON_FAKE_CLOCK configured already');
        }
        let stopClockForward = false;
        const ctx = {
            stub: sinon.stub()
        };
        if (SINON_FAKE_CLOCK) {
            ctx.fakeClock = SINON_FAKE_CLOCK;
        }
        addStubRestore(ctx.stub, () => {
            if (SINON_FAKE_CLOCK) {
                stopClockForward = true;
                SINON_FAKE_CLOCK.restore();
                SINON_FAKE_CLOCK = null;
                delete ctx.fakeClock;
            }
            ctx.stopClockForward();
        });
        /**
         * Move clock forward
         *
         * @param {number} tickStep - number of ticks
         * @param {object} [fwdOptions] - options
         * @param {function} [fwdOptions.cb] - callback to call before schedule next tick
         * @param {number} [fwdOptions.delay] - delay in ms. before .tick
         * @param {boolean} [fwdOptions.once] - run .tick one time only
         * @param {boolean} [fwdOptions.promisify] - promisify activity
         * @param {number} [fwdOptions.repeat] - repeat .tick N times
         *
         * @returns {Promise | void} once scheduled
         */
        ctx.clockForward = (tickStep, fwdOptions) => {
            fwdOptions = fwdOptions || {};
            stopClockForward = false;

            let callCount = 0;
            const repeatTimes = fwdOptions.once ? 1 : fwdOptions.repeat;

            // eslint-disable-next-line consistent-return
            function doTimeTick(ticks) {
                if (ctx.fakeClock) {
                    callCount += 1;
                    ctx.fakeClock.tick(ticks);
                }
                if (typeof repeatTimes === 'undefined' || (repeatTimes && repeatTimes > callCount)) {
                    return fwdOptions.promisify ? Promise.resolve().then(timeTick) : timeTick();
                }
            }
            function then(ticks) {
                if (stopClockForward) {
                    return;
                }
                if (ticks === false) {
                    return;
                }
                ticks = typeof ticks === 'number' ? ticks : tickStep;
                if (ctx.fakeClock) {
                    if (typeof fwdOptions.delay === 'number') {
                        ctx.fakeClock._setTimeout(doTimeTick, fwdOptions.delay, ticks);
                    } else if (fwdOptions.promisify) {
                        ctx.fakeClock._setImmediate(doTimeTick, ticks);
                    } else {
                        doTimeTick(ticks);
                    }
                }
            }
            function timeTick() {
                let nextTick = tickStep;
                if (stopClockForward) {
                    return;
                }
                if (fwdOptions.cb) {
                    nextTick = fwdOptions.cb();
                }
                if (nextTick.then) {
                    if (!fwdOptions.promisify) {
                        throw new Error('Callback passed to "clockForward" returned Promise but "clockForward" was not configured to use Promises!');
                    }
                    nextTick.then(then);
                } else {
                    then(nextTick);
                }
            }
            return fwdOptions.promisify ? Promise.resolve().then(timeTick) : timeTick();
        };
        /**
         * Stop fake clock activity
         *
         * @returns {void}
         */
        ctx.stopClockForward = () => {
            stopClockForward = true;
        };
        return ctx;
    },

    /**
     * Stub core modules
     *
     * @param {object} coreModules - core modules to stub
     * @param {ConfigWorker} [coreModules.configWorker] - config worker
     * @param {module} [coreModules.deviceUtil] - Device Utils module
     * @param {module} [coreModules.logger] - Logger module
     * @param {module} [coreModules.persistentStorage] - Persistent Storage module
     * @param {module} [coreModules.teemReporter] - Teem Reporter module
     * @param {module} [coreModules.tracer] - Tracer module
     * @param {module} [coreModules.utilMisc] - Utils (misc.) module
     * @param {object} [options] - options, see each stub for additional info
     *
     * @returns {CoreStubCtx} stubs for core modules
     */
    coreStub(coreModules, options) {
        options = options || {};
        const ctx = {};
        if (coreModules.configWorker) {
            ctx.configWorker = _module.configWorker(coreModules.configWorker, options.configWorker);
        }
        if (coreModules.deviceUtil) {
            ctx.deviceUtil = _module.deviceUtil(coreModules.deviceUtil, options.deviceUtil);
        }
        if (coreModules.logger) {
            ctx.logger = _module.logger(coreModules.logger, options.logger);
        }
        if (coreModules.persistentStorage) {
            ctx.persistentStorage = _module.persistentStorage(coreModules.persistentStorage, options.persistentStorage);
        }
        if (coreModules.teemReporter) {
            ctx.teemReporter = _module.teemReporter(coreModules.teemReporter, options.teemReporter);
        }
        if (coreModules.tracer) {
            ctx.tracer = _module.tracer(coreModules.tracer, options.tracer);
        }
        if (coreModules.utilMisc) {
            ctx.utilMisc = _module.utilMisc(coreModules.utilMisc, options.utilMisc);
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
     * Stub modules for iHealthPoller
     *
     * @param {object} modules - modules to stub
     * @param {module} [modules.ihealthUtil] - iHealth Util
     *
     * @returns {iHealthPollerStubCtx} stubs for iHealthPoller related modules
     */
    iHealthPoller(modules) {
        const ctx = {};
        if (modules.ihealthUtil) {
            ctx.ihealthUtil = _module.ihealthUtil(modules.ihealthUtil);
        }
        return ctx;
    },

    /**
     * Stub for iHealth utils
     *
     * @param {module} ihealthUtil - module
     *
     * @returns {ihealthUtilStubCtx} stub context
     */
    ihealthUtil(ihealthUtil) {
        const qkviewFile = 'qkviewFile';
        const qkviewReportExample = {
            diagnostics: [],
            system_information: {
                hostname: 'localhost.localdomain'
            }
        };
        const qkviewURI = 'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/0000000';

        const ctx = {
            DeviceAPI: {
                removeFile: sinon.stub(ihealthUtil.DeviceAPI.prototype, 'removeFile')
            },
            IHealthManager: {
                constructor: sinon.spy(ihealthUtil, 'IHealthManager'),
                fetchQkviewDiagnostics: sinon.stub(ihealthUtil.IHealthManager.prototype, 'fetchQkviewDiagnostics'),
                isQkviewReportReady: sinon.stub(ihealthUtil.IHealthManager.prototype, 'isQkviewReportReady'),
                initialize: sinon.stub(ihealthUtil.IHealthManager.prototype, 'initialize'),
                uploadQkview: sinon.stub(ihealthUtil.IHealthManager.prototype, 'uploadQkview')
            },
            QkviewManager: {
                constructor: sinon.spy(ihealthUtil, 'QkviewManager'),
                initialize: sinon.stub(ihealthUtil.QkviewManager.prototype, 'initialize'),
                process: sinon.stub(ihealthUtil.QkviewManager.prototype, 'process')
            }
        };
        ctx.DeviceAPI.removeFile.resolves();
        ctx.IHealthManager.fetchQkviewDiagnostics.callsFake(() => Promise.resolve(deepCopy(qkviewReportExample)));
        ctx.IHealthManager.isQkviewReportReady.resolves(true);
        ctx.IHealthManager.initialize.callsFake(function init() { return this; });
        ctx.IHealthManager.uploadQkview.resolves(qkviewURI);
        ctx.QkviewManager.initialize.callsFake(function init() { return this; });
        ctx.QkviewManager.process.resolves(qkviewFile);
        return ctx;
    },

    /**
     * Stub for Logger
     *
     * @param {module} logger - module
     * @param {object} [options] - options
     * @param {boolean} [options.setToDebug = true] - set default logging level to DEBUG
     * @param {boolean} [options.ignoreLevelChange = true] - ignore logging level change
     *
     * @returns {LoggerStubCtx} stub context
     */
    logger(logger, options) {
        options = assignDefaults(options, {
            setToDebug: true,
            ignoreLevelChange: true
        });
        if (options.setToDebug) {
            logger.setLogLevel('debug');
        }
        const setLogLevelOrigin = logger.setLogLevel;
        // deeply tied to current implementation
        const ctx = {
            messages: {
                all: [],
                debug: [],
                error: [],
                info: [],
                warning: []
            },
            logLevelHistory: [],
            setLogLevel: sinon.stub(logger, 'setLogLevel')
        };
        const f5Levels = [
            ['finest', 'debug'],
            ['info', 'info'],
            ['severe', 'error'],
            ['warning', 'warning']
        ];
        f5Levels.forEach((pair) => {
            const f5level = pair[0];
            const msgLvl = pair[1];
            ctx[f5level] = sinon.stub(logger.logger, f5level);
            ctx[f5level].callsFake((message) => {
                ctx.messages.all.push(message);
                ctx.messages[msgLvl].push(message);
                ctx[f5level].wrappedMethod(message);

                if (tsLogsForwarder.logger) {
                    tsLogsForwarder.logger[tsLogsForwarder.levels[f5level]](message);
                }
            });
        });
        ctx.setLogLevel.callsFake((level) => {
            ctx.logLevelHistory.push(level);
            if (!options.ignoreLevelChange) {
                setLogLevelOrigin.call(logger, level);
            }
        });
        return ctx;
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
            loadCbAfter: null,
            loadCbBefore: null,
            // loadData - should be set explicitly
            loadError: null,
            loadState: { _data_: {} },
            restWorker,
            saveCbAfter: null,
            saveCbBefore: null,
            saveError: null,
            savedData: null,
            savedState: null,
            savedStateParse: true,
            storage: sinon.stub(persistentStorage.persistentStorage, 'storage')
        };
        restWorker.loadState.callsFake((first, cb) => {
            if (ctx.loadCbBefore) {
                ctx.loadCbBefore(ctx, first, cb);
            }
            if (Object.prototype.hasOwnProperty.call(ctx, 'loadData')) {
                ctx.loadState = { _data_: JSON.stringify(ctx.loadData) };
                delete ctx.loadData;
            }
            cb(ctx.loadError, ctx.loadState);
            if (ctx.loadCbAfter) {
                ctx.loadCbAfter(ctx, first, cb);
            }
        });
        restWorker.saveState.callsFake((first, state, cb) => {
            if (ctx.saveCbBefore) {
                ctx.saveCbBefore(ctx, first, state, cb);
            }
            // override to be able to load it again
            ctx.loadState = state;
            ctx.savedState = deepCopy(state);
            if (ctx.savedState._data_ && ctx.savedStateParse) {
                ctx.savedState._data_ = JSON.parse(ctx.savedState._data_);
                ctx.savedData = deepCopy(ctx.savedState._data_);
            }
            cb(ctx.saveError);
            if (ctx.saveCbAfter) {
                ctx.saveCbAfter(ctx, first, state, cb);
            }
        });
        ctx.storage.value(new persistentStorage.RestStorage(restWorker));
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
            process: sinon.stub(teemReporter.TeemReporter.prototype, 'process')
        };
        ctx.process.callsFake(declaration => ctx.declarations.push(declaration));
        return ctx;
    },

    /**
     * Stub for Tracer
     *
     * @param {module} tracer - module
     *
     * @returns {TracerStubCtx} stub context
     */
    tracer(tracer) {
        const ctx = {
            data: {},
            write: sinon.stub(tracer.Tracer.prototype, 'write')
        };
        ctx.write.callsFake(function write(data) {
            ctx.data[this.name] = ctx.data[this.name] || [];
            ctx.data[this.name].push(data);
        });
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
        ctx.generateUuid.numbersOnly = true;
        ctx.generateUuid.callsFake(function () {
            if (this && !ctx.generateUuid.numbersOnly) {
                if (this.traceName) {
                    return this.traceName;
                }
                if (this.namespace) {
                    return `${this.namespace}::${this.name}`;
                }
            }
            ctx.generateUuid.uuidCounter += 1;
            return `uuid${ctx.generateUuid.uuidCounter}`;
        });
        ctx.getRuntimeInfo.value(() => ({ nodeVersion: '4.6.0' }));
        ctx.networkCheck.resolves();
        return ctx;
    }
};

/**
 * @typedef ClockStubCtx
 * @type {object}
 * @property {function} clockForward - move clock forward
 * @property {object} [fakeClock] - sinon' fakeTimer object
 * @property {function} stopClockForward - stop fake clock activity
 * @property {object} stub - sinon stub
 */
/**
 * @typedef ConfigWorkerStubCtx
 * @type {EventEmitter2Ctx}
 * @property {Array<object>} configs - list of emitted configs
 */
/**
 * @typedef CoreStubCtx
 * @type {object}
 * @property {ConfigWorkerStubCtx} configWorker - config worker stub
 * @property {DeviceUtilStubCtx} deviceUtil - Device Util stub
 * @property {LoggerStubCtx} logger - Logger stub
 * @property {PersistentStorageStubCtx} persistentStorage - Persistent Storage stub
 * @property {TeemReporterStubCtx} teemReporter - Teem Reporter stub
 * @property {TracerStubCtx} tracer - Tracer stub
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
 * @typedef LoggerStubCtx
 * @type {object}
 * @property {object} messages - logged messages
 * @property {Array<string>} messages.all - all logged messages
 * @property {Array<string>} messages.debug - debug messages
 * @property {Array<string>} messages.error - error messages
 * @property {Array<string>} messages.info - info messages
 * @property {Array<string>} messages.warning - warning messages
 * @property {Array<string>} logLevelHistory - log level history
 * @property {object} finest - sinon stub for Logger.logger.finest
 * @property {object} info - sinon stub for Logger.logger.info
 * @property {object} severe - sinon stub for Logger.logger.severe
 * @property {object} warning - sinon stub for Logger.logger.warning
 * @property {object} setLogLevel - sinon stub for Logger.setLogLevel
 */
/**
 * @typedef iHealthPollerStubCtx
 * @type {object}
 * @property {ihealthUtilStubCtx} ihealthUtil - iHealth Utils stubs
 */
/**
 * @typedef ihealthUtilStubCtx
 * @type {object}
 * @property {object} IHealthManager - IHealthManager stubs
 * @property {object} IHealthManager.fetchQkviewDiagnostics - stub for IHealthManager.prototype.fetchQkviewDiagnostics
 * @property {object} IHealthManager.isQkviewReportReady - stub for IHealthManager.prototype.isQkviewReportReady
 * @property {object} IHealthManager.initialize - stub for IHealthManager.prototype.initialize
 * @property {object} IHealthManager.uploadQkview - stub for IHealthManager.prototype.uploadQkview
 * @property {object} QkviewManager - IHealthManager stubs
 * @property {object} QkviewManager.initialize - stub for QkviewManager.prototype.initialize
 * @property {object} QkviewManager.process - stub for QkviewManager.prototype.process
 */
/**
 * @typedef PersistentStorageStubCtx
 * @type {object}
 * @property {function} loadCbAfter - error to throw on attempt to load
 * @property {function} loadCbBefore - error to throw on attempt to load
 * @property {any} loadData - data to set to '_data_' property on attempt to load
 * @property {Error} loadError - error to return to callback passed on attempt to load
 * @property {any} loadState - state to return on attempt to load
 * @property {object} restWorker - RestWorker stub
 * @property {function} saveCbAfter - error to throw on attempt to save
 * @property {function} saveCbBefore - error to throw on attempt to save
 * @property {Error} saveError - error to return to callback passed on attempt to save
 * @property {any} savedState - saved state on attempt to save (will override 'loadState')
 * @property {boolean} savedStateParse - parse '_data_' property of saved state if exist
 * @property {object} storage - sinon stub for persistentStorage.persistentStorage.storage
 */
/**
 * @typedef TeemReporterStubCtx
 * @type {object}
 * @property {Array<object>} declarations - list of processed declarations
 * @property {object} process - sinon stub for TeemReporter.prototype.process
 */
/**
 * @typedef TracerStubCtx
 * @type {object}
 * @property {Object<string, Array<any>>} data - data written to tracers
 * @property {object} write - sinon stub for Tracer.prototype.write
 */
/**
 * @typedef UtilMiscStubCtx
 * @type {object}
 * @property {object} generateUuid - stub for generateUuid
 * @property {number} generateUuid.uuidCounter - counter value
 * @property {boolean} generateUuid.numbersOnly - numbers only
 * @property {object} getRuntimeInfo - stub for getRuntimeInfo
 * @property {object} networkCheck - stub for networkCheck
 */
