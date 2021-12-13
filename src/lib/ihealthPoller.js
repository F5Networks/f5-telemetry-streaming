/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const machina = require('machina');

const configUtil = require('./utils/config');
const configWorker = require('./config');
const constants = require('./constants');
const datetimeUtil = require('./utils/datetime');
const ihealthUtil = require('./utils/ihealth');
const logger = require('./logger');
const persistentStorage = require('./persistentStorage').persistentStorage;
const promiseUtil = require('./utils/promise');
const SafeEventEmitter = require('./utils/eventEmitter').SafeEventEmitter;
const util = require('./utils/misc');

/** @module iHealthPoller */

/**
 * FSM State Transitions
 *
 * Initial state: uninitialized
 *
 * uninitialized -----> input=start ----> initialized (emits 'started' event)
 *                 +--> prepare
 * initialized ----|
 *                 +--> restore
 * prepare -----------> schedule
 * schedule ----------> scheduleCheck
 *                 +--> sleep ----> scheduleCheck
 * scheduleCheck --|
 *                 +--> collectQkview
 *                 +--> sleep ----> collectQkview
 * collectQkview --|
 *                 +--> uploadQkview
 *                 +--> sleep ----> uploadQkview
 * uploadQkview --|
 *                 +--> collectReport
 *                 +--> sleep ----> collectReport
 * collectReport --|
 *                 +--> processReport (emits 'report' event)
 * processReport -----> cleanup ----> completed (emits 'completed' event)
 *                 +--> prepare
 * completed ------|
 *                 +--> died (emits 'died' event, without additional arguments)
 * died --------------> uninitialized
 *                 +--> scheduleCheck
 *                 +--> collectQkview
 * restore --------|
 *                 +--> uploadQkview
 *                 +--> cleanup
 *
 * All states (except 'cleanup', 'died', 'failed') may transit to 'failed' or 'disabled' states
 *
 * disabled ----------> cleanup ------> died (emits 'died' event, may pass Error as an argument)
 * failed ---------+--> cleanup ------> died (emits 'died' event with Error as an argument)
 *                 +--> died (emits 'died' event with Error as an argument)
 */

/**
 * FSM for iHealth Poller
 *
 * @class
 *
 * @fires IHealthPollerFSM.safeEmitter#completed
 * @fires IHealthPollerFSM.safeEmitter#died
 * @fires IHealthPollerFSM.safeEmitter#disabling
 * @fires IHealthPollerFSM.safeEmitter#report
 * @fires IHealthPollerFSM.safeEmitter#started
 * @fires IHealthPollerFSM.safeEmitter#transitioned
 *
 * @property {Logger} logger - logger instance
 * @property {IHealthPoller} poller - iHealth Poller
 * @property {SafeEventEmitter} safeEmitter - event emitter
 * @property {iHealthPollerStorage} data - data from PersistentStorage
 */
const IHealthPollerFSM = machina.Fsm.extend({
    namespace: 'ihealth-poller',
    initialState: 'uninitialized',

    /**
     * Constructor
     * @param {object} options - init options
     * @param {IHealthPoller} options.poller - IHealthPoller instance
     */
    initialize: function initialize(options) {
        this.poller = options.poller;
        this.logger = this.poller.logger;
        this.safeEmitter = new SafeEventEmitter();

        this.on('transitioned', (args) => {
            this.logger.debug(`State changed from "${args.fromState}" to "${args.toState}"`);
            this.safeEmitter.safeEmit('transitioned', { fromState: args.fromState, toState: args.toState });
            if (this.states[args.fromState] && this.states[args.fromState].saveOnExit) {
                this.data.lastKnownState = args.fromState;
                fsmRun.call(this, () => saveDataToStorage.call(this.poller, this.data), { resolve: true });
            }
        });
    },

    /**
     * @public
     * @returns {void} once cleaned up (should be used only when instance is not needed any more)
     */
    cleanup: function cleanup() {
        this.data = null;
        this.off();
        if (this.safeEmitter) {
            this.safeEmitter.stopListeningTo();
            this.safeEmitter.removeAllListeners();
            delete this.safeEmitter;
        }
    },

    /**
     * @public
     * @returns {iHealthPollerFsmInfo} FSM stats
     */
    info: function info() {
        const nextExecDate = getNextExecDate.call(this);
        const timeUntilNext = timeUntilNextExecution.call(this);
        return {
            currentCycle: util.deepCopy(this.data.currentCycle),
            demoMode: this.isDemoModeEnabled(),
            disabled: this.isDisabled(),
            nextFireDate: nextExecDate === null ? 'not set' : nextExecDate.toISOString(),
            state: this.state,
            stats: util.deepCopy(this.data.stats),
            timeUntilNextExecution: timeUntilNext === null ? 'not available' : timeUntilNext
        };
    },

    /**
     * @public
     * @returns {boolean} true when state is other than 'uninitialized'
     */
    isActive: function isActive() {
        // 'died' can walk too!
        return this.state !== 'uninitialized';
    },

    /**
     * @public
     * @returns {boolean} true when in 'demo' mode
     */
    isDemoModeEnabled: function isDemoModeEnabled() {
        return this.poller.isDemoModeEnabled();
    },

    /**
     * @public
     * @returns {boolean} true when instance disabled
     */
    isDisabled: function isDisabled() {
        return this.poller.isDisabled();
    },

    /**
     * @public
     * @returns {Promise} resolved once FSM started
     */
    start: function start() {
        return Promise.resolve()
            .then(() => {
                if (this.isActive()) {
                    return Promise.reject(new Error('IHealthPollerFSM instance is active already'));
                }
                const diedPromise = this.safeEmitter.waitFor('died');
                const startedPromise = this.safeEmitter.waitFor('started');
                return promiseUtil.allSettled([
                    // wrap 'start' in promise to catch all errors and cancel pending promises
                    Promise.resolve()
                        .then(() => this.handle('start'))
                        .catch((error) => {
                            diedPromise.cancel();
                            startedPromise.cancel();
                            return Promise.reject(error);
                        }),
                    startedPromise.then(() => diedPromise.cancel()),
                    diedPromise.then((error) => {
                        startedPromise.cancel();
                        return error;
                    })
                ]);
            })
            .then((statuses) => {
                // statuses are in the same order as promises above
                if (statuses[0].status === 'fulfilled' && statuses[1].status === 'fulfilled') {
                    return Promise.resolve();
                }
                // 'startedPromise' has no valid rejection reason besides 'cancel' - not interested
                return Promise.reject(statuses[0].reason
                    || statuses[2].reason
                    || new Error('Unable to start IHealthPollerFSM instance due unknown reason'));
            });
    },

    /**
     * @public
     * @returns {Promise<?Error>} resolved once FSM changed it's state to 'died'
     */
    stop: function stop() {
        return Promise.resolve()
            .then(() => {
                if (!this._diedPromise) {
                    this._diedPromise = this.safeEmitter.waitFor('died');
                    // catch and resolve errors in case of cancellation
                    this._diedPromise.catch((error) => error);
                }
                // need to emit 'disabling' event to
                // - interrupt 'sleep'
                // - let others know that disabling started
                return this.safeEmitter.safeEmitAsync('disabling');
            })
            .then(() => {
                if (!this.isActive()) {
                    if (this._diedPromise) {
                        // it might be fulfilled already
                        // but worth to try to cancel it
                        this._diedPromise.cancel(new Error('IHealthPollerFSM instance is not active'));
                    }
                    return Promise.resolve();
                }
                return this._diedPromise;
            })
            .catch((error) => {
                if (this._diedPromise) {
                    this._diedPromise.cancel(error);
                }
                return error;
            })
            .then((error) => {
                delete this._diedPromise;
                // waitFor may be resolved with Array (see official docs)
                return Array.isArray(error) ? error[0] : error;
            });
    },

    /**
     * States
     *
     * - saveOnExit - when set to 'true' then data will be saved to PersistentStorage once state changed
     */
    states: {
        /**
         * Do cleanup, doesn't matter what state was before
         *
         * Next state on success - depends on input ('completed' by default, to keep the loop running on)
         */
        cleanup: {
            saveOnExit: true,
            /**
             * @param {string} [nextState = 'completed'] - next state once cleanup done
             * @param {...Any} [otherArgs] - other args to pass to next state
             */
            _onEnter: function _onEnter(nextState) {
                nextState = nextState || 'completed';
                // wrapping entire promise chain into _runSafe
                fsmRun.call(this, () => promiseUtil.allSettled([
                    removeQkview.call(this) // remove Qkview
                ])
                    .then(() => this.transition.apply(this, [nextState].concat(Array.from(arguments).slice(1)))));
            }
        },
        /**
         * Collect Qkview data from target device
         *
         * Next state on success - uploadQkview
         */
        collectQkview: {
            saveOnExit: true,
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRunWithRetry.call(this, () => collectQkview.call(this)
                    .then(() => this.transition('uploadQkview')));
            }
        },
        /**
         * Collect Qkview report from F5 iHealth Service
         *
         * Next state on success - processReport
         */
        collectReport: {
            saveOnExit: true,
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRunWithRetry.call(this, () => fetchQkviewReport.call(this)
                    .then((report) => {
                        if (report.isReady) {
                            this.transition('processReport', report.report);
                        } else {
                            this.logger.debug('Qkview report is not ready yet');
                            fsmRetryState.call(this);
                        }
                    }));
            }
        },
        /**
         * Polling cycle successfully completed
         *
         * Next state on success:
         *  - died - when in 'demo' mode
         *  - prepare
         *
         * @fires IHealthPollerFSM.safeEmitter#completed
         */
        completed: {
            /**
             * @fires IHealthPollerFSM.safeEmitter#completed
             */
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                /**
                 * Emit 'completed' event
                 *
                 * @event IHealthPollerFSM.safeEmitter#completed
                 */
                fsmRun.call(this, () => Promise.resolve()
                    .then(() => {
                        this.data.currentCycle.succeed = true;
                        this.data.stats.cyclesCompleted += 1;
                        return this.safeEmitter.safeEmitAsync('completed');
                    })
                    .then(() => this.transition(this.isDemoModeEnabled() ? 'died' : 'prepare')));
            }
        },
        /**
         * Poller died, final state
         *
         * @fires IHealthPollerFSM.safeEmitter#died
         */
        died: {
            /**
             * @param {Error} [error] - error to pass to listeners
             * @fires IHealthPollerFSM#died
             */
            _onEnter: function _onEnter(error) {
                /**
                 * Emit 'died' event
                 *
                 * @event IHealthPollerFSM.safeEmitter#died
                 * @param {Error} [error] - error if exists
                 */
                fsmRun(() => {
                    cleanupSensitiveData.call(this);
                    this.transition('uninitialized');
                    return this.safeEmitter.safeEmitAsync('died', error);
                }, { resolve: true });
            }
        },
        /**
         * Poller was disabled via 'stop'
         *
         * Next state on success - cleanup -> died
         */
        disabled: {
            _onEnter: function _onEnter() {
                fsmRun.call(this, () => this.transition('cleanup', 'died'));
            }
        },
        /**
         * Polling cycle failed
         *
         * Next state on success:
         *  - died - when in 'demo' mode
         *  - prepare
         */
        failed: {
            /**
             * @param {Error} error - fail reason
             */
            _onEnter: function _onEnter(error) {
                fsmRun.call(this, () => {
                    this.data.currentCycle.succeed = false;
                    this.data.currentCycle.errorMsg = `${error}`;
                }, { reject: true })
                    .catch((innerError) => innerError)
                    .then((innerError) => {
                        if (this.isDemoModeEnabled() || this.isDisabled()) {
                            this.transition('died', innerError || error);
                        } else {
                            this.logger.exception('Recovering after receiving error', error);
                            this.transition('prepare');
                        }
                    });
            }
        },
        /**
         * Initialize newly created instance
         *
         * Next state on success - 'prepare' or 'restore'
         */
        initialized: {
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRun.call(this, () => initStorageData.call(this)
                    .then(() => this.safeEmitter.safeEmitAsync('started'))
                    .then(() => this.transition(this.data.lastKnownState ? 'restore' : 'prepare')));
            }
        },
        /**
         * Prepare to next polling cycle
         *
         * Next state on success - schedule
         */
        prepare: {
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRun.call(this, () => {
                    this.data.stats.cycles += 1;
                    initPollingCycleInfo.call(this, this.data);
                    this.transition('schedule');
                });
            }
        },
        /**
         * Process Qkview report
         *
         * Next state on success - cleanup -> completed
         *
         * @fires IHealthPollerFSM#report
         */
        processReport: {
            saveOnExit: true,
            _onEnter: function _onEnter(report) {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                /**
                 * Emit 'report' event
                 *
                 * @event IHealthPollerFSM#report
                 * @param {QkviewReport} report - Qkview report
                 */
                fsmRun.call(this, () => this.safeEmitter.safeEmitAsync('report', processQkviewReport.call(this, report))
                    .then(() => {
                        this.data.currentCycle.qkview.reportProcessed = true;
                        this.transition('cleanup', 'completed');
                    }));
            }
        },
        /**
         * Restore FSM to prev. state if possible
         */
        restore: {
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRun.call(this, () => {
                    const lastKnownState = this.data.lastKnownState;
                    const qkview = (this.data.currentCycle && this.data.currentCycle.qkview) || {};
                    let nextState;

                    this.logger.debug(`Restoring iHealthPollerFSM, last known state is "${lastKnownState}"`);
                    if (lastKnownState === 'schedule') {
                        // might be negative in case if past due already
                        const nextExecTime = timeUntilNextExecution.call(this);
                        nextState = 'schedule';
                        if (nextExecTime >= 0
                            || Math.abs(nextExecTime) < constants.IHEALTH.POLLER_CONF.SCHEDULING.MAX_PAST_DUE) {
                            nextState = 'scheduleCheck';
                        } else {
                            this.logger.debug('Need to schedule new execution date, current one is expired');
                        }
                    } else if (lastKnownState === 'collectQkview') {
                        nextState = 'collectQkview';
                        if (qkview.qkviewFile) {
                            nextState = 'uploadQkview';
                        }
                    } else if (lastKnownState === 'uploadQkview') {
                        nextState = 'uploadQkview';
                        if (qkview.qkviewURI) {
                            nextState = 'collectReport';
                        }
                    } else if (lastKnownState === 'collectReport'
                        || (lastKnownState === 'processReport' && !qkview.reportProcessed)) {
                        nextState = 'collectReport';
                    }
                    if (!nextState) {
                        nextState = 'cleanup';
                    }
                    this.logger.debug(`Restoring iHealthPollerFSM to state "${nextState}"`);
                    this.transition(nextState);
                });
            }
        },
        /**
         * Schedule next polling cycle
         *
         * Next state on success - scheduleCheck
         */
        schedule: {
            saveOnExit: true,
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRun.call(this, () => scheduleNextExecution.call(this)
                    .then(() => this.transition('scheduleCheck')));
            }
        },
        /**
         * Check if it is time to start polling cycle
         *
         * Next state on success:
         *  - sleep -> scheduleCheck - when it is too early
         *  - collectQkview - when it is time to start polling cycle
         */
        scheduleCheck: {
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRun.call(this, () => checkNextExecutionTime.call(this)
                    .then((allowedToStart) => this.handle(allowedToStart ? 'ready' : 'sleep')));
            },
            ready: 'collectQkview',
            sleep: function sleep() {
                const sleepTime = timeUntilNextExecution.call(this);
                const defaultDelay = constants.IHEALTH.POLLER_CONF.SCHEDULING.DELAY;
                this.transition('sleep', {
                    nextState: this.state,
                    sleepTime: sleepTime < defaultDelay ? sleepTime : defaultDelay
                });
            }
        },
        /**
         * Sleep and nothing else
         *
         * Next state on success - depends on input
         */
        sleep: {
            _onEnter: function _onEnter(options) {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                const sleepTime = (options.sleepTime > 0 && options.sleepTime) || 0;
                if (sleepTime) {
                    cleanupSensitiveData.call(this);
                }
                this.logger.debug(`Going to sleep for ${sleepTime} ms. Next state is "${options.nextState}"`);

                const sleepPromise = util.sleep(sleepTime || 0);
                const disablingPromise = this.safeEmitter.waitFor('disabling');

                promiseUtil.allSettled([
                    sleepPromise.then(() => {
                        disablingPromise.cancel();
                        this.transition(options.nextState);
                    }),
                    disablingPromise.then(() => {
                        sleepPromise.cancel();
                        this.transition('disabled');
                    })
                ]);
            }
        },
        /**
         * Initial state when instance created
         *
         * Next state on success - initialized
         */
        uninitialized: {
            start: function start() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRun.call(this, () => this.transition('initialized'));
            }
        },
        /**
         * Upload Qkview to F5 iHealth Service
         *
         * Next state on success - collectReport
         */
        uploadQkview: {
            saveOnExit: true,
            _onEnter: function _onEnter() {
                if (fsmDisabledIfNeeded.call(this)) {
                    return;
                }
                fsmRunWithRetry.call(this, () => uploadQkview.call(this)
                    .then(() => this.transition('collectReport')));
            }
        }
    }
});

Object.defineProperty(IHealthPollerFSM.prototype, 'data', {
    get() {
        if (!this._data) {
            this._data = createStorageObject.call(this);
        }
        return this._data;
    },

    set(val) {
        this._data = val;
    }
});

/**
 * iHealth poller
 *
 * Note: when 'demo' set to 'true' then following operations disabled/changed the behavior to speed up
 * the process:
 * - saving current state to storage - disabled
 * - scheduling a next operation - delay decreased to speed up the process
 * - only 1 polling cycle
 * - starts immediately
 *
 * DEMO instances are useful in case when the user needs to check
 * - iHealth credentials/connectivity
 * - proxy configuration/credentials/connectivity
 * - BIG-IP configuration/credentials/connectivity
 *
 * @fires IHealthPoller#completed
 * @fires IHealthPoller#died
 * @fires IHealthPoller#disabled
 * @fires IHealthPoller#report
 * @fires IHealthPoller#started
 * @fires IHealthPoller#transitioned
 *
 * @property {string} id - iHealth Poller config ID
 * @property {Logger} logger - logger instance
 * @property {string} name - instance name
 * @property {string} storageKey - storage key
 */
class IHealthPoller extends SafeEventEmitter {
    /**
     * @param {string} id - config object ID
     * @param {IHealthPollerOptions} [options] - options
     */
    constructor(id, options) {
        super();
        options = util.assignDefaults(options, {
            demo: false,
            name: `${this.constructor.name}_${id}`
        });

        this._demo = !!options.demo;
        this._id = id;
        this._name = `${options.name}${this._demo ? ' (DEMO)' : ''}`;
        this.logger = logger.getChild(this.constructor.name).getChild(this._name);

        this._fsm = new IHealthPollerFSM({ poller: this });
        // passthrough FSM events
        this.listenTo(this._fsm.safeEmitter, {
            completed: 'completed',
            died: 'died',
            disabling: 'disabling',
            report: 'report',
            started: 'started',
            transitioned: 'transitioned'
        });
    }

    /**
     * @public
     * @returns {Promise} resolved once 'disabling' event received
     */
    get disablingPromise() {
        return this._disablingPromise;
    }

    /**
     * @public
     * @returns {string} poller's config ID
     */
    get id() {
        return this._id;
    }

    /**
     * @public
     * @returns {string} poller's name
     */
    get name() {
        return this._name;
    }

    /**
     * @public
     * @returns {string} key to use to store data in storage
     */
    get storageKey() {
        return this.id;
    }

    /**
     * @public
     * Do cleanup once instance died or deleted, should be performed when FSM not running only
     */
    cleanup() {
        this.stopListeningTo();
        this.removeAllListeners();
        if (this._fsm) {
            this._fsm.cleanup();
            delete this._fsm;
        }
    }

    /**
     * @public
     * @returns {Promise<object>} resolved with config
     */
    getConfig() {
        return Promise.resolve()
            .then(() => {
                const pollerConfig = configUtil.getTelemetryIHealthPollers(configWorker.currentConfig)
                    .find((ihpConf) => ihpConf.traceName === this.id);

                if (util.isObjectEmpty(pollerConfig)) {
                    return Promise.reject(new Error(`Configuration for iHealth Poller "${this.name}" (${this.id}) not found!`));
                }
                return pollerConfig;
            });
    }

    /**
     * @public
     * @returns {iHealthPollerInfo} poller's info
     */
    info() {
        return Object.assign(this._fsm.info(), {
            id: this.id,
            name: this.name
        });
    }

    /**
     * @public
     * @returns {boolean} true when instance is running (even when disabled)
     */
    isActive() {
        return this._fsm.isActive();
    }

    /**
     * @public
     * @returns {boolean} 'true' if instance in 'demo' mode
     */
    isDemoModeEnabled() {
        return this._demo;
    }

    /**
     * @public
     * @returns {boolean} 'true' if instance disabled
     */
    isDisabled() {
        return !!this._stopPromise;
    }

    /**
     * @public
     * @returns {Promise} resolved once iHealth Poller started
     */
    start() {
        // simple guardian in case of attempt to start FSM twice
        if (!this._startPromise) {
            this._startPromise = Promise.resolve()
                .then(() => this._fsm.start())
                .catch((error) => error)
                .then((error) => {
                    delete this._startPromise;
                    return error ? Promise.reject(error) : Promise.resolve();
                });
        }
        return this._startPromise;
    }

    /**
     * May take some time to complete, depends on FSM' current state.
     *
     * @public
     * @returns {Promise} resolved once iHealth Poller stopped
     */
    stop() {
        // simple guardian in case of attempt to stop FSM twice
        if (!this._stopPromise) {
            this._disablingPromise = this.waitFor('disabling');
            this._stopPromise = Promise.resolve()
                .then(() => removeDataFromStorage.call(this))
                .then(() => this._fsm.stop())
                .catch((error) => {
                    this._disablingPromise.cancel(error);
                    return error;
                })
                .then((error) => {
                    delete this._disablingPromise;
                    delete this._stopPromise;
                    return error ? Promise.reject(error) : Promise.resolve();
                });
        }
        return this._stopPromise;
    }
}

/**
 * CLASS METHODS
 */
/**
 * @private
 * @member {Array<IHealthPoller>} - instances
 */
IHealthPoller._instances = [];

/**
 * @returns {Promise} resolved once all orphaned data removed from storage
 */
IHealthPoller.cleanupOrphanedStorageData = function cleanupOrphanedStorageData() {
    return persistentStorage.get(constants.IHEALTH.STORAGE_KEY)
        .then((storageData) => {
            storageData = storageData || {};
            // ignoring 'demo' instances - they are restricted from storing the data
            const existingKeys = IHealthPoller.getAll().map((poller) => poller.storageKey);
            Object.keys(storageData).forEach((skey) => {
                if (existingKeys.indexOf(skey) === -1) {
                    delete storageData[skey];
                }
            });
            return persistentStorage.set(constants.IHEALTH.STORAGE_KEY, storageData);
        });
};

/**
 * @param {string} id - poller's config ID
 * @param {IHealthPollerOptions} [options] - options, see IHealthPoller.constructor for more details
 *
 * @returns {IHealthPoller} newly created iHealth Poller instance
 */
IHealthPoller.create = function create(id, options) {
    options = options || {};
    let poller = IHealthPoller._instances.find((p) => p.id === id);

    if (poller && poller.isDemoModeEnabled() === !!options.demo) {
        throw new Error(`iHealthPoller instance with ID "${poller.id}" created already (demo = ${poller.isDemoModeEnabled()})`);
    }
    poller = new IHealthPoller(id, options);
    IHealthPoller._instances.push(poller);
    return poller;
};

/**
 * @param {string} id - poller's config ID
 * @param {IHealthPollerOptions} [options] - options, see IHealthPoller.constructor for more details
 *
 * @returns {IHealthPoller} newly created iHealth Poller 'demo' instance
 */
IHealthPoller.createDemo = function create(id, options) {
    options = options || {};
    options.demo = true;
    return IHealthPoller.create(id, options);
};

/**
 * Disabling and stopping iHealth Poller is tricky process and can take some time (depends on poller's state)
 * to shutdown it properly. Because of it this method returns Promise resolved once poller disabled and return
 * value can be used to wait until it completely died. Instance will be unregistered once disabled.
 *
 * @param {IHealthPoller} poller - IHealthPoller instance
 *
 * @returns {Promise<object>} resolved once instance disabled (not actually stopped or died yet).
 *     Response contains single property 'stopPromise' than will be resolved once poller completely
 *     stopped (never rejects).
 */
IHealthPoller.disable = function disable(poller) {
    const stopPromise = poller.stop();
    return poller.disablingPromise.then(() => {
        IHealthPoller.unregister(poller);
        return {
            stopPromise: stopPromise
                .catch((error) => {
                    poller.logger.exception('Unexpected exception on attempt to stop', error);
                })
                .then(() => poller.cleanup())
                .catch((error) => poller.logger.exception('Unexpected exception on attempt to stop', error))
        };
    });
};

/**
 * @param {string} id - poller's config ID
 *
 * @returns {Array<IHealthPoller>} iHealth Poller instances (non-demo and/or demo)
 */
IHealthPoller.get = function get(id) {
    return IHealthPoller._instances.filter((p) => p.id === id);
};

/**
 * @param {object} [options] - options
 * @param {boolean} [options.demoOnly = false] - include 'demo' instances only
 * @param {boolean} [options.includeDemo = false] - include 'demo' instances too
 *
 * @returns {Array<IHealthPoller>} instances
 */
IHealthPoller.getAll = function getAll(options) {
    options = util.assignDefaults(options, {
        demoOnly: false,
        includeDemo: false
    });
    let instances = [];
    if (!options.demoOnly) {
        instances = instances.concat(IHealthPoller._instances.filter((p) => !p.isDemoModeEnabled()));
    }
    if (options.demoOnly || options.includeDemo) {
        instances = instances.concat(IHealthPoller._instances.filter((p) => p.isDemoModeEnabled()));
    }
    return instances;
};

/**
 * @param {IHealthPoller} poller - IHealthPoller instance or poller's config ID
 *
 * @returns {void} when instance unregistered
 */
IHealthPoller.unregister = function unregister(poller) {
    const idx = IHealthPoller._instances.indexOf(poller);
    if (idx !== -1) {
        IHealthPoller._instances.splice(idx, 1);
    }
};

/**
 * PRIVATE METHODS
 */
/**
 * @this IHealthPollerFSM
 * @returns {Promise<boolean>} resolved with true if it is time to start next polling cycle
 */
function checkNextExecutionTime() {
    const allowedToStart = shouldBeExecuted.call(this);
    if (allowedToStart) {
        this.data.currentCycle.startTimestamp = Date.now();
        this.logger.debug('Starting the polling cycle now');
    } else {
        this.logger.debug(`Next scheduled polling cycle starts in ${timeUntilNextExecution.call(this) / 1000} s.) (${getNextExecDate.call(this).toISOString()})`);
    }
    return Promise.resolve(allowedToStart);
}

/**
 * @this IHealthPollerFSM
 * @returns {void} once sensitive data cleaned up
 */
function cleanupSensitiveData() {
    this.config = null;
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolved once Qkview collected
 */
function collectQkview() {
    return createQkviewManager.call(this)
        .then((qkviewMgr) => qkviewMgr.process())
        .then((qkviewFilePath) => {
            this.data.currentCycle.qkview.qkviewFile = qkviewFilePath;
            this.data.stats.qkviewsCollected += 1;
        });
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise<IHealthManager>} resolved with IHealthManager instance
 */
function createIHealthManager() {
    return initConfig.call(this)
        .then(decryptConfigIfNeeded.bind(this))
        .then(() => new ihealthUtil.IHealthManager(util.deepCopy(this.config.iHealth.credentials), {
            logger: this.logger,
            proxy: util.deepCopy(this.config.iHealth.proxy)
        }));
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise<QkviewManager>} resolved with QkviewManager instance
 */
function createQkviewManager() {
    return initConfig.call(this)
        .then(decryptConfigIfNeeded.bind(this))
        .then(() => new ihealthUtil.QkviewManager(this.config.system.host, {
            connection: util.deepCopy(this.config.system.connection),
            credentials: util.deepCopy(this.config.system.credentials),
            downloadFolder: this.config.iHealth.downloadFolder || constants.DEVICE_TMP_DIR,
            logger: this.logger
        }));
}

/**
 * @this IHealthPollerFSM
 * @returns {object} base 'data' object
 */
function createStorageObject() {
    const data = {
        schedule: {
            nextExecTime: 0
        },
        stats: {
            cycles: 0,
            cyclesCompleted: 0,
            qkviewsCollected: 0,
            qkviewCollectRetries: 0,
            qkviewsUploaded: 0,
            qkviewUploadRetries: 0,
            reportsCollected: 0,
            reportCollectRetries: 0
        },
        version: '2.0'
    };
    initPollingCycleInfo.call(this, data);
    return data;
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolve once configuration data decrypted
 */
function decryptConfigIfNeeded() {
    if (this.config.isDecrypted) {
        return Promise.resolve();
    }
    return configUtil.decryptSecrets(this.config)
        .then((decryptedConfig) => {
            this.config = decryptedConfig;
            this.config.isDecrypted = true;
        });
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise<object>} resolved with Qkview report
 */
function fetchQkviewReport() {
    let ihealthMgr;
    return createIHealthManager.call(this)
        .then((_ihealthMgr) => {
            ihealthMgr = _ihealthMgr;
            return ihealthMgr.isQkviewReportReady(this.data.currentCycle.qkview.qkviewURI);
        })
        .then((isReady) => {
            if (isReady) {
                return ihealthMgr.fetchQkviewDiagnostics(this.data.currentCycle.qkview.qkviewURI);
            }
            return null;
        })
        .then((reportData) => {
            if (reportData) {
                this.data.stats.reportsCollected += 1;
                this.data.currentCycle.endTimestamp = Date.now();
            }
            return {
                report: reportData,
                isReady: !!reportData
            };
        });
}

/**
 * Do transition to 'disabled' if needed
 *
 * @this IHealthPollerFSM
 * @returns {boolean} true if instance was disabled
 */
function fsmDisabledIfNeeded() {
    if (this.isDisabled()) {
        fsmRun.call(this, () => this.transition('disabled'));
        return true;
    }
    return false;
}

/**
 * Do following transition - current_state -> cleanup -> failed (error)
 *
 * @this IHealthPollerFSM
 * @param {Error} error - error
 */
function fsmFatalFailure(error) {
    this.transition('cleanup', 'failed', error);
}

/**
 * Do transition to the same state after delay if possible
 *
 * @this IHealthPollerFSM
 * @param {Error} [error] - error to log
 */
function fsmRetryState(error) {
    if (error) {
        this.logger.debugException(`Error caught (state = ${this.state})`, error);
    }
    const keys = {
        collectQkview: {
            opt: 'QKVIEW_COLLECT',
            retry: 'qkviewCollect',
            stats: 'qkviewCollectRetries'
        },
        collectReport: {
            opt: 'QKVIEW_REPORT',
            retry: 'reportCollect',
            stats: 'reportCollectRetries'
        },
        uploadQkview: {
            opt: 'QKVIEW_UPLOAD',
            retry: 'qkviewUpload',
            stats: 'qkviewUploadRetries'
        }
    }[this.state];
    const retries = this.data.currentCycle.retries;
    const stats = this.data.stats;

    if (!keys) {
        fsmFatalFailure.call(this, new Error(`Unexpected state "${this.state}" in fsmRetryState()!`));
    } else if (retries[keys.retry] < constants.IHEALTH.POLLER_CONF[keys.opt].MAX_RETRIES) {
        retries[keys.retry] += 1;
        stats[keys.stats] += 1;

        this.logger.debug(`State "${this.state}" going to retry after sleep (#${retries[keys.retry]}, max. ${constants.IHEALTH.POLLER_CONF[keys.opt].MAX_RETRIES} retries)`);
        this.transition('sleep', {
            nextState: this.state,
            sleepTime: constants.IHEALTH.POLLER_CONF[keys.opt].DELAY
        });
    } else {
        fsmFatalFailure.call(this, new Error(`Max. number of retries for state "${this.state}" reached!`));
    }
}

/**
 * Exec function with wrapped in '.catch'
 *
 * @this IHealthPollerFSM
 * @param {Function} fn - function to run
 * @param {object} [options] - options
 * @param {object} [options.reject = false] - reject when caught an error
 * @param {object} [options.resolve = false] - resolve when caught an error
 *
 * @returns {Promise}
 */
function fsmRun(fn, options) {
    options = options || {};
    return Promise.resolve()
        .then(fn)
        .catch((error) => {
            if (options.reject) {
                return Promise.reject(error);
            }
            if (options.resolve) {
                return Promise.resolve(error);
            }
            return fsmFatalFailure.call(this, error);
        });
}

/**
 * @this IHealthPollerFSM
 * @param {Function} fn - function to run and re-run on fail
 */
function fsmRunWithRetry(fn) {
    Promise.resolve()
        .then(fn)
        .catch(fsmRetryState.bind(this));
}

/**
 * @this IHealthPollerFSM
 * @returns {Date | null} next execution Date or null
 */
function getNextExecDate() {
    const nextExecTime = this.data.schedule.nextExecTime || null;
    return nextExecTime ? new Date(nextExecTime) : null;
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolved once System and/or iHealth config found
 */
function initConfig() {
    if (!util.isObjectEmpty(this.config)) {
        return Promise.resolve();
    }
    return this.poller.getConfig()
        .then((config) => {
            this.config = config;
        });
}

/**
 * @this IHealthPollerFSM
 * @param {object} data - data from PersistentStorage
 * @returns {void} once info related to prev. polling cycle removed
 */
function initPollingCycleInfo(data) {
    data.currentCycle = {
        cycleNo: data.stats.cycles,
        endTimestamp: null,
        qkview: {},
        retries: {
            qkviewCollect: 0,
            qkviewUpload: 0,
            reportCollect: 0
        },
        startTimestamp: null
    };
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolved once data from PersistentStorage received and initialized
 */
function initStorageData() {
    return loadDataFromStorage.call(this.poller)
        .then((data) => {
            if (!util.isObjectEmpty(data) && data.version) {
                this.data = data;
            }
        });
}

/**
 * @this IHealthPoller
 * @returns {Promise<iHealthPollerStorage>} resolved with data from PersistentStorage assigned to 'storageKey'
 *     or simply resolved when in 'demo' mode or disabled
 */
function loadDataFromStorage() {
    if (this.isDemoModeEnabled() || this.isDisabled()) {
        return Promise.resolve();
    }
    return persistentStorage.get([constants.IHEALTH.STORAGE_KEY, this.storageKey]);
}

/**
 * @this IHealthPollerFSM
 * @param {object} report - raw Qkview report data to process
 *
 * @returns {QkviewReport} processed Qkview report
 */
function processQkviewReport(report) {
    // https://ihealth-api.f5.com/qkview-analyzer/api/qkviews/<qkview_id>/ (last / is optional)
    const currentCycle = this.data.currentCycle;
    const uriParts = currentCycle.qkview.qkviewURI.split('/');
    const additionalInfo = {
        ihealthLink: currentCycle.qkview.qkviewURI,
        qkviewNumber: uriParts[uriParts.length - 1] || uriParts[uriParts.length - 2],
        cycleStart: currentCycle.startTimestamp,
        cycleEnd: currentCycle.endTimestamp
    };
    return {
        report,
        additionalInfo
    };
}

/**
 * @this IHealthPoller
 * @returns {Promise} resolved once data assigned to 'storageKey' removed
 *     from PersistentStorage or simply resolved when in 'demo' mode or disabled
 */
function removeDataFromStorage() {
    if (this.isDemoModeEnabled()) {
        return Promise.resolve();
    }
    return persistentStorage.remove([constants.IHEALTH.STORAGE_KEY, this.storageKey]);
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolved once Qkview removed from localhost
 */
function removeQkview() {
    const qkviewPath = ((this.data.currentCycle && this.data.currentCycle.qkview) || {}).qkviewFile;
    if (!qkviewPath) {
        return Promise.resolve();
    }
    return createQkviewManager.call(this)
        .then((qkviewMgr) => qkviewMgr.localDevice.removeFile(qkviewPath));
}

/**
 * @this IHealthPoller
 * @param {iHealthPollerStorage} data - data to save (JSON-serializable)
 *
 * @returns {Promise} resolved once data assigned and saved to PersistentStorage using 'storageKey'
 *     or simply resolved when in 'demo' mode or disabled
 */
function saveDataToStorage(data) {
    if (this.isDemoModeEnabled() || this.isDisabled()) {
        return Promise.resolve();
    }
    return persistentStorage.set([constants.IHEALTH.STORAGE_KEY, this.storageKey], data);
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolved once next execution scheduled
 */
function scheduleNextExecution() {
    return initConfig.call(this)
        .then(() => {
            let nextExecDate = getNextExecDate.call(this);
            const fromDate = nextExecDate;
            const allowNow = !nextExecDate;
            nextExecDate = datetimeUtil.getNextFireDate(this.config.iHealth.interval, fromDate, allowNow);
            this.data.schedule.nextExecTime = nextExecDate.getTime();
            this.logger.debug(`Next polling cycle starts on ${nextExecDate.toISOString()} (in ${timeUntilNextExecution.call(this) / 1000} s.)`);
        });
}

/**
 * @this IHealthPollerFSM
 * @returns {boolean} 'true' if task should be executed (only 'true' will be returned when in 'demo' mode)
 */
function shouldBeExecuted() {
    return this.isDemoModeEnabled() || timeUntilNextExecution.call(this) <= 0;
}

/**
 * @this IHealthPollerFSM
 * @returns {Integer | null} number of milliseconds left till next scheduled execution, (0 when in 'demo' mode)
 *      or null when not available
 */
function timeUntilNextExecution() {
    if (this.isDemoModeEnabled()) {
        return 0;
    }
    const nextExecDate = getNextExecDate.call(this);
    return nextExecDate ? (nextExecDate.getTime() - Date.now()) : null;
}

/**
 * @this IHealthPollerFSM
 * @returns {Promise} resolved once Qkview uploaded to F5 iHealth Service
 */
function uploadQkview() {
    return createIHealthManager.call(this)
        .then((ihealthMgr) => ihealthMgr.uploadQkview(this.data.currentCycle.qkview.qkviewFile))
        .then((qkviewURI) => {
            this.data.currentCycle.qkview.qkviewURI = qkviewURI;
            this.data.stats.qkviewsUploaded += 1;
        });
}

module.exports = IHealthPoller;

/**
 * @typedef QkviewReport
 * @type {object}
 * @property {object} report - Qkview report data
 * @property {object} additionalInfo - additional service info
 * @property {string} ihealthLink - F5 iHealth Service Qkview URI
 * @property {string} qkviewNumber - Qkview ID
 * @property {number} cycleStart - time when polling cycle started
 * @property {number} cycleEnd - time when polling cycle ended
 */
/**
 * @typedef iHealthPollerFsmPollCycle
 * @type {object}
 * @property {number} cycleNo - iteration number
 * @property {number} endTimestamp - timestamp of when polling cycle finished
 * @property {string} errorMsg - error message if poll cycle failed
 * @property {object} qkview - Qkview related data
 * @property {string} qkview.qkviewFile - file path to Qkview obtained from BIG-IP
 * @property {string} qkview.qkviewURI - Qkview URI returned from F5 iHealth Service
 * @property {boolean} qkview.reportProcessed - whether or not Qkview report was processed
 * @property {object} retries - iHealth Poller retries info for current polling cycle
 * @property {number} retries.qkviewCollect - number of retries made on attempt to obtain Qkview file
 * @property {number} retries.qkviewUpload - number of retries made on attempt to upload Qkview file
 * @property {number} retries.reportCollect - number of retries made on attempt to obtain Qkview report
 * @property {number} startTimestamp - timestamp of when polling cycle started
 * @property {boolean} succeed - whether or not poll cycle completed successfully
 */
/**
 * @typedef iHealthPollerFsmStats
 * @type {object}
 * @property {number} cycles - number of polling cycles
 * @property {number} cyclesCompleted - number of completed cycles
 * @property {number} qkviewsCollected - number of Qkview files successfully collected
 * @property {number} qkviewCollectRetries - number of retries made on attempt to obtain Qkview file
 * @property {number} qkviewsUploaded - number of Qkview files successfully uploaded
 * @property {number} qkviewUploadRetries - number of retries made on attempt to upload Qkview file
 * @property {number} reportsCollected - number of Qkview reports successfully received
 * @property {number} reportCollectRetries - number of retries made on attempt to obtain Qkview report
 */
/**
 * @typedef iHealthPollerStorage
 * @type {object}
 * @property {iHealthPollerFsmPollCycle} currentCycle - data related to current polling cycle
 * @property {string} lastKnownState - state set before data was saved
 * @property {object} schedule - iHealth Poller polling schedule data
 * @property {number} schedule.nextExecTime - timestamp of next scheduled execution
 * @property {iHealthPollerFsmStats} stats - iHealth Poller stats
 * @property {string} version - data's format version
 */
/**
 * @typedef iHealthPollerFsmInfo
 * @type {object}
 * @property {iHealthPollerFsmPollCycle} currentCycle - current cycle info
 * @property {boolean} demoMode - whether or not in 'demo' mode
 * @property {boolean} disabled - whether or not instance was disabled (attempted to stop)
 * @property {string} nextFireDate - next scheduled execution date
 * @property {string} state - current state
 * @property {iHealthPollerFsmStats} stats - iHealth Poller FSM stats
 * @property {number} timeUntilNextExecution - number of ms. before next scheduled execution
 */
/**
 * @typedef iHealthPollerInfo
 * @type {iHealthPollerFsmInfo}
 * @property {string} id - instance's config ID
 * @property {string} name - instance's name
 */
/**
 * @typedef IHealthPollerOptions
 * @type {object}
 * @property {boolean} [demo = false] - enable 'demo' mode
 * @property {string} [name] - name to use (e.g. for logging)
 */
