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

const EventEmitter2 = require('eventemitter2');
const memfs = require('memfs');
const pathUtil = require('path');
const sinon = require('sinon');

const assignDefaults = require('./util').assignDefaults;
const deepCopy = require('./util').deepCopy;
const tsLogsForwarder = require('../../winstonLogger').tsLogger;
const sourceCode = require('./sourceCode');

const constants = sourceCode('src/lib/constants');
const promisifyNodeFsModule = sourceCode('src/lib/utils/misc').promisifyNodeFsModule;

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
                return fwdOptions.promisify ? Promise.resolve() : undefined;
            }
            function then(ticks) {
                if (stopClockForward || ticks === false || !ctx.fakeClock) {
                    return fwdOptions.promisify ? Promise.resolve() : undefined;
                }
                ticks = typeof ticks === 'number' ? ticks : tickStep;
                if (typeof fwdOptions.delay === 'number') {
                    if (fwdOptions.promisify) {
                        return new Promise((resolve) => {
                            ctx.fakeClock._setTimeout(resolve, fwdOptions.delay);
                        })
                            .then(() => doTimeTick(ticks));
                    }
                    return ctx.fakeClock._setTimeout(doTimeTick, fwdOptions.delay, ticks);
                }
                if (fwdOptions.promisify) {
                    return new Promise((resolve) => {
                        ctx.fakeClock._setImmediate(resolve);
                    })
                        .then(() => doTimeTick(ticks));
                }
                return doTimeTick(ticks);
            }
            function timeTick() {
                let nextTick = tickStep;
                if (stopClockForward) {
                    return fwdOptions.promisify ? Promise.resolve() : undefined;
                }
                if (fwdOptions.cb) {
                    nextTick = fwdOptions.cb();
                }
                if (nextTick.then) {
                    if (!fwdOptions.promisify) {
                        throw new Error('Callback passed to "clockForward" returned Promise but "clockForward" was not configured to use Promises!');
                    }
                    return nextTick.then(then);
                }
                return then(nextTick);
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
        if (coreModules.resourceMonitorUtils) {
            ctx.resourceMonitorUtils = _module.resourceMonitorUtils(
                coreModules.resourceMonitorUtils,
                options.resourceMonitorUtils
            );
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
        ctx.receivedSpy = sinon.spy();
        ctx.validationFailedSpy = sinon.spy();
        ctx.validationSucceedSpy = sinon.spy();
        configWorker.on('change', (config) => ctx.configs.push(config));
        configWorker.on('received', ctx.receivedSpy);
        configWorker.on('validationFailed', ctx.validationFailedSpy);
        configWorker.on('validationSucceed', ctx.validationSucceedSpy);
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
        ctx.decryptSecret.callsFake((data) => Promise.resolve(data.slice(3)));
        ctx.encryptSecret.callsFake((data) => Promise.resolve(`$M$${data}`));
        ctx.getDeviceType.callsFake(() => Promise.resolve(constants.DEVICE_TYPE.BIG_IP));
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
                ctx.preExistingListeners[evtName].forEach((listener) => emitter.on(evtName, listener));
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
        ctx.IHealthManager.initialize.callsFake(function init() { return Promise.resolve(this); });
        ctx.IHealthManager.uploadQkview.callsFake(() => Promise.resolve(deepCopy(qkviewURI)));
        ctx.QkviewManager.initialize.callsFake(function init() { return Promise.resolve(this); });
        ctx.QkviewManager.process.callsFake(() => Promise.resolve(deepCopy(qkviewFile)));
        return ctx;
    },

    /**
     * Stub for Logger
     *
     * @param {module} logger - module
     * @param {object} [options] - options
     * @param {boolean} [options.setToVerbose = true] - set default logging level to VERBOSE
     * @param {boolean} [options.ignoreLevelChange = true] - ignore logging level change
     *
     * @returns {LoggerStubCtx} stub context
     */
    logger(logger, options) {
        options = assignDefaults(options, {
            setToVerbose: true,
            ignoreLevelChange: true
        });
        if (options.setToVerbose) {
            logger.setLogLevel('verbose');
        }
        const setLogLevelOrigin = logger.setLogLevel;
        // deeply tied to current implementation
        const ctx = {
            messages: {
                all: []
            },
            logLevelHistory: [],
            setLogLevel: sinon.stub(logger, 'setLogLevel')
        };
        const levels = [
            ['verbose', 'finest'],
            ['debug', 'finest'],
            ['info', 'info'],
            ['warning', 'warning'],
            ['error', 'severe']
        ];
        levels.forEach((pair) => {
            const msgLevel = pair[0];
            const f5level = pair[1];
            const stubKey = `proxy_${msgLevel}`;

            ctx.messages[msgLevel] = [];
            ctx[stubKey] = sinon.stub(logger.logger, msgLevel);
            ctx[stubKey].callsFake((message) => {
                ctx.messages.all.push(message);
                ctx.messages[msgLevel].push(message);
                ctx[stubKey].wrappedMethod.call(logger.logger, message);

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
        ctx.removeAllMessages = () => {
            ctx.messages = { all: [] };
            levels.forEach((pair) => {
                ctx.messages[pair[0]] = [];
            });
        };
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
     * Stub for ResourceMonitor
     *
     * @param {module} resourceMonitor - module
     *
     * @returns {ResourceMonitorUtilsStubCtx} stub context
     */
    resourceMonitorUtils(resourceMonitorUtils) {
        const ctx = {
            appMemoryUsage: sinon.stub(resourceMonitorUtils, 'appMemoryUsage'),
            osAvailableMem: sinon.stub(resourceMonitorUtils, 'osAvailableMem')
        };
        ctx.appMemoryUsage.external = 100;
        ctx.appMemoryUsage.heapTotal = 101;
        ctx.appMemoryUsage.heapUsed = 90;
        ctx.appMemoryUsage.rss = 300;
        ctx.appMemoryUsage.callsFake(() => ({
            external: ctx.appMemoryUsage.external,
            heapTotal: ctx.appMemoryUsage.heapTotal,
            heapUsed: ctx.appMemoryUsage.heapUsed,
            rss: ctx.appMemoryUsage.rss
        }));

        ctx.osAvailableMem.free = 100;
        ctx.osAvailableMem.callsFake(() => ctx.osAvailableMem.free);
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
        ctx.process.callsFake((declaration) => {
            ctx.declarations.push(declaration);
            return Promise.resolve();
        });
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
        const cwd = process.cwd();
        const pathMap = {};
        const volume = new memfs.Volume();
        const virtualFS = memfs.createFsFromVolume(volume);
        const promisifiedFS = promisifyNodeFsModule(virtualFS);
        const emitter = new EventEmitter2();
        this.eventEmitter(emitter);

        sinon.stub(virtualFS, 'mkdir').callsFake(function (dirPath) {
            volume.mkdirSync(dirPath, { recursive: true });
            return virtualFS.mkdir.wrappedMethod.apply(virtualFS, arguments);
        });

        volume.reset();

        let pendingWrites = 0;
        emitter.on('dec', () => emitter.emit('change', -1));
        emitter.on('inc', () => emitter.emit('change', 1));
        emitter.on('change', (delta) => {
            pendingWrites += delta;
            emitter.emit('changed', pendingWrites);
        });

        const ctx = {
            create: sinon.stub(tracer, 'create'),
            fs: virtualFS,
            promisifiedFS,
            waitForData() {
                if (!pendingWrites) {
                    return Promise.resolve();
                }
                return emitter.waitFor('changed', {
                    filter: (counter) => counter === 0
                });
            },
            write: sinon.stub(tracer.Tracer.prototype, 'write')
        };
        Object.defineProperties(ctx, {
            data: {
                get() {
                    const virtualPaths = volume.toJSON();
                    Object.keys(virtualPaths).forEach((absolute) => {
                        // parse data at first
                        let data = virtualPaths[absolute];
                        try {
                            virtualPaths[absolute] = JSON.parse(data);
                        } catch (_) {
                            // do nothing
                        }
                        if (pathMap[absolute]) {
                            data = virtualPaths[absolute];
                            delete virtualPaths[absolute];
                            pathMap[absolute].forEach((relative) => {
                                virtualPaths[relative] = data;
                            });
                        }
                    });
                    return virtualPaths;
                }
            },
            pendingWrites: {
                get() { return pendingWrites; }
            }
        });

        ctx.create.callsFake((path, options) => {
            if (!pathUtil.isAbsolute(path)) {
                const normPath = pathUtil.resolve(
                    pathUtil.join(cwd, pathUtil.normalize(path))
                );
                pathMap[normPath] = pathMap[normPath] || [];
                pathMap[normPath].push(path);
            }
            // - make copy to avoid modifications for origin options
            // - copy it back to origin options to reflect changes
            // reason:
            // - caller POV: want to see all changes and don't want to see virtualFS ref
            // - Tracer POV: want to keep 'optionsCopy' unmodified
            const optionsCopy = Object.assign({}, options || {});
            optionsCopy.fs = promisifiedFS;
            const inst = ctx.create.wrappedMethod.call(tracer, path, optionsCopy);
            Object.assign(options || {}, optionsCopy);
            if (options) {
                delete options.fs;
            }
            return inst;
        });
        ctx.write.callsFake(function (data) {
            emitter.emit('inc');
            return ctx.write.wrappedMethod.call(this, data)
                .then(
                    (ret) => {
                        emitter.emit('dec');
                        return Promise.resolve(ret);
                    },
                    (err) => {
                        emitter.emit('dec');
                        return Promise.reject(err);
                    }
                );
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

        ctx.getRuntimeInfo.nodeVersion = '4.6.0';
        ctx.getRuntimeInfo.maxHeapSize = 4096;
        ctx.getRuntimeInfo.callsFake(() => ({
            maxHeapSize: ctx.getRuntimeInfo.maxHeapSize,
            nodeVersion: ctx.getRuntimeInfo.nodeVersion
        }));
        ctx.networkCheck.resolves();
        return ctx;
    }
};

/**
 * Default stubs - modules from 'src' dir only
 */
_module.default = {
    /**
     * Load default modules for 'core' stub
     *
     * @param {Object.<string, boolean>} [modules] - modules to load
     * @param {object} [options] - options for stubs
     *
     * @returns {CoreStubCtx}
     */
    coreStub(modules, options) {
        modules = Object.assign({}, modules);
        const srcMap = {
            configWorker: 'src/lib/config',
            deviceUtil: 'src/lib/utils/device',
            logger: 'src/lib/logger',
            persistentStorage: 'src/lib/persistentStorage',
            resourceMonitorUtils: 'src/lib/resourceMonitor/utils',
            teemReporter: 'src/lib/teemReporter',
            tracer: 'src/lib/utils/tracer',
            utilMisc: 'src/lib/utils/misc'
        };
        const keys = Object.keys(modules);
        let toLoad = srcMap;

        if (keys.length > 0) {
            toLoad = {};
            if (keys.every((k) => modules[k] === false)) {
                Object.keys(srcMap)
                    .forEach((k) => {
                        modules[k] = modules[k] !== false;
                    });
            }
            toLoad = {};
            Object.keys(modules).forEach((key) => {
                if (modules[key] === true && typeof srcMap[key] !== 'undefined') {
                    toLoad[key] = srcMap[key];
                }
            });
        }
        Object.keys(toLoad).forEach((key) => {
            toLoad[key] = sourceCode(toLoad[key]);
        });
        return _module.coreStub(toLoad, options);
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
 * @property {sinon.spy} receivedSpy - spy for 'received' event
 * @property {sinon.spy} validationFailedSpy - spy for 'validationFailed' event
 * @property {sinon.spy} validationSucceedSpy - spy for 'validationSucceed' event
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
 * @typedef LoggerStubCtx
 * @type {object}
 * @property {object} messages - logged messages
 * @property {Array<string>} messages.all - all logged messages
 * @property {Array<string>} messages.debug - debug messages
 * @property {Array<string>} messages.error - error messages
 * @property {Array<string>} messages.info - info messages
 * @property {Array<string>} messages.warning - warning messages
 * @property {Array<string>} logLevelHistory - log level history
 * @property {object} proxy_verbose - sinon stub for Logger.logger.verbose
 * @property {object} proxy_debug - sinon stub for Logger.logger.debug
 * @property {object} proxy_info - sinon stub for Logger.logger.info
 * @property {object} proxy_warning - sinon stub for Logger.logger.warning
 * @property {object} proxy_erro - sinon stub for Logger.logger.error
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
 * @typedef ResourceMonitorUtilsStubCtx
 * @type {object}
 * @property {object} appMemoryUsage - stub for appMemoryUsage
 * @property {number} appMemoryUsage.external - `external` value
 * @property {number} appMemoryUsage.heapTotal - `heapTotal` value
 * @property {number} appMemoryUsage.heapUsed - `heapUsed` value
 * @property {number} appMemoryUsage.rss - `rss` value
 * @property {object} osAvailableMem - stub for osAvailableMem
 * @property {number} osAvailableMem.free - free memory value
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
 * @property {object} fromConfig - sinon stub for tracer.fromConfig method
 * @property {number} pendingWrites - number of pending attempts to write data
 * @property {function} waitForData - wait until all data flushed
 * @property {object} write - sinon stub for Tracer.prototype.write
 */
/**
 * @typedef UtilMiscStubCtx
 * @type {object}
 * @property {object} generateUuid - stub for generateUuid
 * @property {number} generateUuid.uuidCounter - counter value
 * @property {boolean} generateUuid.numbersOnly - numbers only
 * @property {object} getRuntimeInfo - stub for getRuntimeInfo
 * @property {string} getRuntimeInfo.nodeVersion - node.js version
 * @property {number} getRuntimeInfo.maxHeapSize - V8 max heap size
 * @property {object} networkCheck - stub for networkCheck
 */
