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
const nodeFS = require('fs');
const nodeUtil = require('util');
const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('./assert');
const assignDefaults = require('./util').assignDefaults;
const BigIpRestApiMock = require('./bigipAPIMock');
const deepCopy = require('./util').deepCopy;
const tsLogsForwarder = require('../../winstonLogger').tsLogger;
const sourceCode = require('./sourceCode');

/**
 * @typedef {import("./bigipAPIMock").MockNockStubBase} MockNockStubBase
 */

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
     * Stub for Application Events
     *
     * @param {object} AppEvents - class
     *
     * @returns {AppEventsStubCtx} stub context
     */
    appEvents(AppEvents) {
        const ctx = {
            appEvents: new AppEvents(),
            stub: sinon.stub()
        };
        addStubRestore(ctx.stub, () => {
            ctx.appEvents.stop();
        });
        return ctx;
    },

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
     * @param {module} [coreModules.tracer] - Tracer module
     * @param {module} [coreModules.utilMisc] - Utils (misc.) module
     * @param {object} [options] - options, see each stub for additional info
     *
     * @returns {CoreStubCtx} stubs for core modules
     */
    coreStub(coreModules, options) {
        const localhostBigIp = new BigIpRestApiMock();
        localhostBigIp.addPasswordlessUser('admin');

        options = options || {};
        const ctx = {
            localhostBigIp
        };
        if (coreModules.deviceUtil || coreModules.tracer || coreModules.utilMisc) {
            coreModules.utilMisc = coreModules.utilMisc || sourceCode('src/lib/utils/misc');
            ctx.utilMisc = _module.utilMisc(coreModules.utilMisc, options.utilMisc);
        }
        if (coreModules.tracer) {
            ctx.tracer = _module.tracer(coreModules.tracer, options.tracer, ctx);
        }
        if (coreModules.appEvents) {
            ctx.appEvents = _module.appEvents(coreModules.appEvents, options.appEvents);
        }
        if (coreModules.configWorker) {
            ctx.configWorker = _module.configWorker(coreModules.configWorker, options.configWorker, ctx);
        }
        if (coreModules.deviceUtil) {
            ctx.deviceUtil = _module.deviceUtil(coreModules.deviceUtil, options.deviceUtil, ctx);
        }
        if (coreModules.logger) {
            ctx.logger = _module.logger(coreModules.logger, options.logger);
        }
        if (coreModules.resourceMonitorUtils) {
            ctx.resourceMonitorUtils = _module.resourceMonitorUtils(
                coreModules.resourceMonitorUtils,
                options.resourceMonitorUtils
            );
        }
        if (coreModules.storage) {
            ctx.storage = _module.storage(
                coreModules.storage,
                options.storage,
                ctx
            );
        }

        ctx.destroyServices = async () => {
            if (ctx.storage && ctx.storage.service.isRunning()) {
                if (ctx.configWorker) {
                    await ctx.configWorker.configWorker.cleanup();
                }
                await ctx.storage.service.destroy();
            }
            // time to remove all listeners
            if (ctx.appEvents) {
                ctx.appEvents.appEvents.stop();
            }
        };
        ctx.restartServices = async () => {
            // start first, dependency for configWorker
            if (ctx.storage) {
                await ctx.storage.service.restart();
                if (ctx.configWorker) {
                    await ctx.configWorker.configWorker.load();
                }
            }
        };
        ctx.startServices = async () => {
            // start first, dependency for configWorker
            if (ctx.storage) {
                await ctx.storage.service.start();
                if (ctx.configWorker) {
                    await ctx.configWorker.configWorker.cleanup();
                }
            }
        };
        ctx.stopServices = async () => {
            if (ctx.storage && ctx.storage.service.isRunning()) {
                await ctx.storage.service.stop();
            }
        };
        return ctx;
    },

    /**
     * Stub for Config Worker
     *
     * @param {ConfigWorker} configWorker - instance of ConfigWorker
     * @param {object} options
     * @param {CoreStubCtx} coreCtx
     *
     * @returns {ConfigWorkerStubCtx} stub context
     */
    configWorker(configWorker, options, coreCtx) {
        const ctx = _module.eventEmitter(configWorker);
        ctx.configs = [];
        ctx.receivedSpy = sinon.spy();
        ctx.validationFailedSpy = sinon.spy();
        ctx.validationSucceedSpy = sinon.spy();
        configWorker.on('change', (config) => ctx.configs.push(config));
        configWorker.on('received', ctx.receivedSpy);
        configWorker.on('validationFailed', ctx.validationFailedSpy);
        configWorker.on('validationSucceed', ctx.validationSucceedSpy);

        if (coreCtx.appEvents) {
            configWorker.initialize(coreCtx.appEvents.appEvents);
        }

        ctx.configWorker = configWorker;
        return ctx;
    },

    /**
     * Stub for Device Utils
     *
     * @param {module} deviceUtil - module
     * @param {object} options
     * @param {CoreStubCtx} coreCtx
     *
     * @returns {DeviceUtilStubCtx} stub context
     */
    deviceUtil(deviceUtil, options, coreCtx) {
        const decryptStub = coreCtx.localhostBigIp.mockDecryptSecret();
        decryptStub.callsFake((...secrets) => secrets.map((s) => s.slice(3)).join(''));

        const encryptStub = coreCtx.localhostBigIp.mockEncryptSecret({ optionally: true, replyTimes: Infinity });
        encryptStub.encrypt.stub.callsFake((reqBody) => [200, {
            secret: `$M$${reqBody.secret}`
        }]);

        const getDeviceType = coreCtx.localhostBigIp.mockDeviceType();

        const ctx = {
            decrypt: decryptStub,
            encrypt: encryptStub,
            getDeviceType
        };

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
            logger,
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
     * Stub for ResourceMonitor
     *
     * @param {module} resourceMonitor - module
     * @param {object} [options]
     *
     * @returns {ResourceMonitorUtilsStubCtx} stub context
     */
    resourceMonitorUtils(resourceMonitorUtils) {
        const ctx = {
            appMemoryUsage: sinon.stub(process, 'memoryUsage'),
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
     * Stub for Persistent Storage with RestStorage as backend
     *
     * @returns {RestWorkerStubCtx} stub context
     */
    restWorker() {
        const ctx = {
            loadCbAfter: null,
            loadCbBefore: null,
            // loadData - should be set explicitly
            loadError: null,
            loadState: sinon.stub(),
            loadStateData: { _data_: {} },
            saveCbAfter: null,
            saveCbBefore: null,
            saveError: null,
            savedData: null,
            saveState: sinon.stub(),
            savedState: null,
            savedStateParse: true
        };
        ctx.loadState.callsFake((first, cb) => {
            if (ctx.loadCbBefore) {
                ctx.loadCbBefore(ctx, first, cb);
            }
            if (Object.prototype.hasOwnProperty.call(ctx, 'loadData')) {
                ctx.loadStateData = { _data_: JSON.stringify(ctx.loadData) };
                delete ctx.loadData;
            }
            cb(ctx.loadError, ctx.loadStateData);
            if (ctx.loadCbAfter) {
                ctx.loadCbAfter(ctx, first, cb);
            }
        });
        ctx.saveState.callsFake((first, state, cb) => {
            if (ctx.saveCbBefore) {
                ctx.saveCbBefore(ctx, first, state, cb);
            }
            // override to be able to load it again
            ctx.loadStateData = state;
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
        return ctx;
    },

    /**
     * Stub for Storage Service
     *
     * @param {object} StorageService - class
     * @param {object} options
     * @param {CoreStubCtx} coreCtx
     *
     * @returns {StorageStubCtx} stub context
     */
    storage(StorageService, options, coreCtx) {
        const ctx = {
            service: new StorageService(),
            restWorker: _module.restWorker()
        };

        ctx.service.initialize(
            coreCtx.appEvents.appEvents, ctx.restWorker
        );

        return ctx;
    },

    /**
     * Stub for Tracer
     *
     * @param {module} tracer - module
     * @param {object} options
     * @param {CoreStubCtx} coreCtx
     *
     * @returns {TracerStubCtx} stub context
     */
    tracer(tracer, options, coreCtx) {
        const cwd = process.cwd();
        const pathMap = {};

        const emitter = new EventEmitter2();
        this.eventEmitter(emitter);

        let pendingWrites = 0;
        emitter.on('dec', () => emitter.emit('change', -1));
        emitter.on('inc', () => emitter.emit('change', 1));
        emitter.on('change', (delta) => {
            pendingWrites += delta;
            emitter.emit('changed', pendingWrites);
        });

        const ctx = {
            create: sinon.stub(tracer, 'create'),
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
                    const virtualPaths = coreCtx.utilMisc.fs.volume.toJSON();
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

        ctx.create.callsFake((path, createOptions) => {
            if (!pathUtil.isAbsolute(path)) {
                const normPath = pathUtil.resolve(
                    pathUtil.join(cwd, pathUtil.normalize(path))
                );
                pathMap[normPath] = pathMap[normPath] || [];
                pathMap[normPath].push(path);
            }
            return ctx.create.wrappedMethod.call(tracer, path, createOptions);
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

        ctx.fs = {
            volume: new memfs.Volume()
        };
        ctx.fs.fs = memfs.createFsFromVolume(ctx.fs.volume);

        const realFS = utilMisc.fs;
        const originMethods = {
            mkdir: ctx.fs.fs.mkdir
        };
        ctx.fs.fs.mkdir = function customMkdir(dirPath) {
            ctx.fs.volume.mkdirSync(pathUtil.dirname(dirPath), { recursive: true });
            return originMethods.mkdir.apply(ctx.fs.fs, arguments);
        };

        ['access', 'readdir', 'stat'].forEach((method) => {
            originMethods[method] = ctx.fs.fs[method];
            ctx.fs.fs[method] = function customFN(fsPath) {
                if (fsPath.includes('lib/consumers')
                    || fsPath.includes('unit/consumers')
                    || fsPath.includes('unit/dataPipeline/consumers')) {
                    return realFS[method].apply(realFS, arguments);
                }
                return originMethods[method].apply(ctx.fs.fs, arguments);
            };
        });

        // need to copy symbols first
        const symb = Object.getOwnPropertySymbols(nodeFS.read).find((s) => /customPromisifyArgs/.test(s.toString()));
        assert.isDefined(symb, 'should be able to find a symbol!');
        Object.entries(nodeFS).forEach(([key, fn]) => {
            if (fn[symb]) {
                ctx.fs.fs[key][symb] = fn[symb];
            }
        });

        ctx.fs.promise = (function promisifyNodeFsModule(fsModule) {
            const newFsModule = Object.create(fsModule);
            Object.keys(fsModule).forEach((key) => {
                if (typeof fsModule[`${key}Sync`] !== 'undefined') {
                    newFsModule[key] = nodeUtil.promisify(fsModule[key]);
                }
            });
            return newFsModule;
        }(ctx.fs.fs));

        sinon.stub(ctx.fs.promise);
        Object.values(ctx.fs.promise).forEach((fn) => fn.callThrough());

        utilMisc.fs = ctx.fs.promise;
        ctx.fs.volume.reset();

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
            appEvents: 'src/lib/appEvents',
            configWorker: 'src/lib/config',
            deviceUtil: 'src/lib/utils/device',
            logger: 'src/lib/logger',
            resourceMonitorUtils: 'src/lib/resourceMonitor/utils',
            storage: 'src/lib/storage',
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
 * @typedef {object} AppEventsStubCtx
 * @property {object} appEvents - instance of AppEvents
 * @property {object} stub - sinon stub
 */
/**
 * @typedef {object} ClockStubCtx
 * @property {function} clockForward - move clock forward
 * @property {object} [fakeClock] - sinon' fakeTimer object
 * @property {function} stopClockForward - stop fake clock activity
 * @property {object} stub - sinon stub
 */
/**
 * @typedef {EventEmitter2Ctx} ConfigWorkerStubCtx
 * @property {Array<object>} configs - list of emitted configs
 * @property {ConfigWorker} configWorker - Config Worker instances
 * @property {sinon.spy} receivedSpy - spy for 'received' event
 * @property {sinon.spy} validationFailedSpy - spy for 'validationFailed' event
 * @property {sinon.spy} validationSucceedSpy - spy for 'validationSucceed' event
 */
/**
 * @typedef {object} CoreStubCtx
 * @property {ConfigWorkerStubCtx} configWorker - config worker stub
 * @property {function} destroyServices - destroy services
 * @property {DeviceUtilStubCtx} deviceUtil - Device Util stub
 * @property {BigIpRestApiMock} localhostBigIp - BigIpRestApiMock instance for localhost
 * @property {LoggerStubCtx} logger - Logger stub
 * @property {function} startServices - start services
 * @property {function} stopServices - stop services
 * @property {TracerStubCtx} tracer - Tracer stub
 * @property {UtilMiscStubCtx} utilMisc - Util Misc. stub
 */
/**
 * @typedef {object} DeviceUtilStubCtx
 * @property {MockNockStubBase} decrypt - stub for decryptSecrets
 * @property {MockNockStubBase} encrypt - stub for encryptSecret
 * @property {MockNockStubBase} getDeviceType - stub for getDeviceType
 */
/**
 * @typedef {object} EventEmitter2Ctx
 * @property {Object<string, Array<function>} preExistingListeners - listeners to restore
 * @property {object} stub - sinon stub
 */
/**
 * @typedef {object} LoggerStubCtx
 * @property {Logger} logger - logger
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
 * @typedef {object} ResourceMonitorUtilsStubCtx
 * @property {object} appMemoryUsage - stub for appMemoryUsage
 * @property {number} appMemoryUsage.external - `external` value
 * @property {number} appMemoryUsage.heapTotal - `heapTotal` value
 * @property {number} appMemoryUsage.heapUsed - `heapUsed` value
 * @property {number} appMemoryUsage.rss - `rss` value
 * @property {object} osAvailableMem - stub for osAvailableMem
 * @property {number} osAvailableMem.free - free memory value
 */
/**
 * @typedef {object} RestWorkerStubCtx
 * @property {function} loadCbAfter - error to throw on attempt to load
 * @property {function} loadCbBefore - error to throw on attempt to load
 * @property {any} loadData - data to set to '_data_' property on attempt to load
 * @property {Error} loadError - error to return to callback passed on attempt to load
 * @property {sinon.stub} loadState - stub for 'loadState' function
 * @property {any} loadStateData - state to return on attempt to load
 * @property {object} restWorker - RestWorker stub
 * @property {function} saveCbAfter - error to throw on attempt to save
 * @property {function} saveCbBefore - error to throw on attempt to save
 * @property {Error} saveError - error to return to callback passed on attempt to save
 * @property {sinon.stub} saveState - stub for 'saveState' function
 * @property {any} savedState - saved state on attempt to save (will override 'loadState')
 * @property {boolean} savedStateParse - parse '_data_' property of saved state if exist
 */
/**
 * @typedef {object} StorageStubCtx
 * @property {StorageService} service - Storage Service instance
 * @property {RestWorkerStubCtx} restWorker - Rest Worker stub
 */
/**
 * @typedef {object} TracerStubCtx
 * @property {Object<string, Array<any>>} data - data written to tracers
 * @property {object} fromConfig - sinon stub for tracer.fromConfig method
 * @property {number} pendingWrites - number of pending attempts to write data
 * @property {function} waitForData - wait until all data flushed
 * @property {object} write - sinon stub for Tracer.prototype.write
 */
/**
 * @typedef {object} UtilMiscStubCtx
 * @property {object} fs - stub for FS
 * @property {memfs.Volume} fs.volume
 * @property {memfs.FS} fs.fs - virtual FS module
 * @property {memfs.FS} fs.promise - promisified virtual FS module
 * @property {object} generateUuid - stub for generateUuid
 * @property {number} generateUuid.uuidCounter - counter value
 * @property {boolean} generateUuid.numbersOnly - numbers only
 * @property {object} getRuntimeInfo - stub for getRuntimeInfo
 * @property {string} getRuntimeInfo.nodeVersion - node.js version
 * @property {number} getRuntimeInfo.maxHeapSize - V8 max heap size
 * @property {object} networkCheck - stub for networkCheck
 */
