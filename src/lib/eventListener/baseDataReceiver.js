/* * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const errors = require('../errors');
const mainLogger = require('../logger');
const SafeEventEmitter = require('../utils/eventEmitter').SafeEventEmitter;

/** @module BaseDataReceiver */

class BaseDataReceiverError extends errors.BaseError {}
class StateTransitionError extends BaseDataReceiverError {}


/**
 * Base class for Data Receivers (base on EventEmitter2)
 *
 * Note:
 * - state should be changed only at the beginning/end of an 'atomic' operation like start/stop/destroy and etc.
 * - all event listeners will be removed when instance DESTROYED
 *
 * @property {Logger} logger - logger instance
 *
 * @fires BaseDataReceiver#stateChanged
 */
class BaseDataReceiver extends SafeEventEmitter {
    /**
     * Constructor
     *
     * @param {Logger} [logger] - logger instance
     */
    constructor(logger) {
        super();
        this.logger = logger || mainLogger.getChild(this.constructor.name);
        this._state = this.constructor.STATE.NEW;
        this.on('stateChanged', () => {
            if (this.hasState(this.constructor.STATE.DESTROYED)) {
                this.removeAllListeners();
            }
        });
    }

    /**
     * Set new state
     *
     * Note: note when state has no 'waitForTransition' then it would be good to check
     * for desired state before starting any operation.
     *
     * @async
     * @param {DataReceiverState | String} desiredState - new state
     * @param {Object} [options = {}] - options
     * @param {Boolean} [options.wait = true] - wait until current transition finished
     * @param {Boolean} [options.force = false] - force state change
     *
     * @returns {Promise} resolved when state changed
     *
     * @fires BaseDataReceiver#stateChanged
     */
    _setState(desiredState, options) {
        options = options || {};
        desiredState = typeof desiredState === 'string' ? this.constructor.STATE[desiredState] : desiredState;
        if (!options.force) {
            if (this._state.waitForTransition && !this.nextStateAllowed(desiredState)) {
                const wait = typeof options.wait === 'undefined' || options.wait;
                if (wait === false) {
                    this.logger.debug(`ignoring state change from '${this.getCurrentStateName()}' to '${desiredState.name}' [wait = ${wait}]`);
                    return Promise.reject(this.getStateTransitionError(desiredState));
                }
                return this.waitFor('stateChanged').then(() => this._setState(desiredState));
            }
            if (!this.nextStateAllowed(desiredState)) {
                // time to check if transition to next state is allowed
                this.logger.debug(`ignoring state change from '${this.getCurrentStateName()}' to '${desiredState.name}'`);
                return Promise.reject(this.getStateTransitionError(desiredState));
            }
        }
        return setState.call(this, desiredState, options.force);
    }

    /**
     * Current state's name
     *
     * @public
     * @returns {String} state name
     */
    getCurrentStateName() {
        return this._state.name;
    }

    /**
     * Destroy receiver
     *
     * Note:
     *  - can't call 'restart', 'start' and 'stop' methods any more. Need to create new instance
     *  - all attached listeners will be removed once instance destroyed
     *
     * @public
     * @async
     * @returns {Promise} resolved once receiver destroyed
     */
    destroy() {
        const stateOpts = { wait: false, force: true };
        return this._setState(this.constructor.STATE.DESTROYING, stateOpts)
            .then(() => callAndSetState.call(
                this,
                this.stopHandler(),
                this.constructor.STATE.DESTROYED,
                this.constructor.STATE.DESTROYED,
                stateOpts
            ));
    }

    /**
     * Get error with message about state transition
     *
     * @param {DataReceiverState | String} desiredState - desired state
     *
     * @returns {StateTransitionError} error
     */
    getStateTransitionError(desiredState) {
        return new StateTransitionError(`Cannot change state from '${this.getCurrentStateName()}' to '${typeof desiredState === 'string' ? desiredState : desiredState.name}'`);
    }

    /**
     * Check if current state matches desired state
     *
     * @public
     * @param {DataReceiverState | String} desiredState - desired state
     *
     * @returns {Boolean} true if matched
     */
    hasState(desiredState) {
        return this.getCurrentStateName() === (typeof desiredState === 'string' ? desiredState : desiredState.name);
    }

    /**
     * Check if receiver was destroyed
     *
     * @public
     * @returns {Boolean} true if receiver was destroyed
     */
    isDestroyed() {
        return this.hasState(this.constructor.STATE.DESTROYED);
    }

    /**
     * Check if receiver can be restarted
     *
     * @public
     * @returns {Boolean} true if receiver was destroyed
     */
    isRestartAllowed() {
        return this._state.next.indexOf(this.constructor.STATE.RESTARTING.name) !== -1;
    }

    /**
     * Check if receiver is running
     *
     * @public
     * @returns {Boolean} true if receiver is running
     */
    isRunning() {
        return this.hasState(this.constructor.STATE.RUNNING);
    }

    /**
     * Check if transition to next state allowed
     *
     * @public
     * @param {DataReceiverState | String} nextState - next state
     *
     * @returns {Boolean} true when allowed
     */
    nextStateAllowed(nextState) {
        return this._state.next.indexOf(typeof nextState === 'string' ? nextState : nextState.name) !== -1;
    }

    /**
     * Restart receiver
     *
     * @public
     * @async
     * @param {Object} [options = {}] - options
     * @param {Number} [options.attempts] - number of attempts to try
     * @param {Number} [options.delay] - delay before each attempt (in ms.)
     *
     * @returns {Promise} resolved once receiver restarted
     */
    restart(options) {
        options = options || {};
        const attempts = typeof options.attempts !== 'number' ? true : options.attempts;
        const delay = options.delay;

        return this._setState(this.constructor.STATE.RESTARTING)
            .then(() => new Promise((resolve, reject) => {
                const inner = () => this.stop()
                    .catch(stopError => this.logger.exception('caught error on attempt to stop during restart', stopError))
                    .then(() => this.start())
                    .catch(restartErr => this._setState(this.constructor.STATE.FAILED_TO_RESTART)
                        .then(() => {
                            if ((attempts === true || options.attempts > 1) && this.isRestartAllowed()) {
                                this.logger.exception('re-trying to restart due error', restartErr);
                                if (attempts !== true) {
                                    options.attempts -= 1;
                                }
                                return this.restart(options);
                            }
                            this.logger.debug('restart not allowed');
                            return Promise.reject(restartErr);
                        }))
                    .then(resolve)
                    .catch(reject);

                if (delay) {
                    this.logger.debug(`restarting in ${delay} ms.`);
                    setTimeout(inner, delay);
                } else {
                    inner();
                }
            }));
    }

    /**
     * Start receiver
     *
     * @public
     * @async
     * @param {Boolean} [wait = true] - wait till previous operation finished
     *
     * @returns {Promise} resolved once receiver started
     */
    start(wait) {
        const stateOpts = { wait: typeof wait === 'undefined' || wait };
        return this._setState(this.constructor.STATE.STARTING, stateOpts)
            .then(() => callAndSetState.call(
                this,
                this.startHandler(),
                this.constructor.STATE.RUNNING,
                this.constructor.STATE.FAILED_TO_START,
                stateOpts
            ));
    }

    /**
     * Stop receiver
     *
     * Note: still can call 'restart' and 'start' methods
     *
     * @public
     * @async
     * @param {Boolean} [wait = true] - wait till previous operation finished
     *
     * @returns {Promise} resolved once receiver stopped
     */
    stop(wait) {
        const stateOpts = { wait: typeof wait === 'undefined' || wait };
        return this._setState(this.constructor.STATE.STOPPING, stateOpts)
            .then(() => callAndSetState.call(
                this,
                this.stopHandler(),
                this.constructor.STATE.STOPPED,
                this.constructor.STATE.FAILED_TO_STOP,
                stateOpts
            ));
    }

    /**
     * Start receiver
     *
     * @async
     * @returns {Promise} resolved once receiver started
     */
    startHandler() {
        throw new Error('Not implemented');
    }

    /**
     * Stop receiver
     *
     * @async
     * @returns {Promise} resolved once receiver stopped
     */
    stopHandler() {
        throw new Error('Not implemented');
    }
}

/**
 * @property {Object.<String, DataReceiverState>} STATE - states
 */
BaseDataReceiver.STATE = {
    NEW: {
        name: 'NEW',
        next: ['DESTROYING', 'RESTARTING', 'STARTING', 'STOPPING']
    },
    DESTROYED: {
        name: 'DESTROYED',
        next: []
    },
    DESTROYING: {
        name: 'DESTROYING',
        next: ['DESTROYED'],
        waitForTransition: true
    },
    FAILED_TO_RESTART: {
        name: 'FAILED_TO_RESTART',
        next: ['DESTROYING', 'RESTARTING', 'STARTING', 'STOPPING']
    },
    FAILED_TO_START: {
        name: 'FAILED_TO_START',
        next: ['DESTROYING', 'FAILED_TO_RESTART', 'RESTARTING', 'STARTING', 'STOPPING']
    },
    FAILED_TO_STOP: {
        name: 'FAILED_TO_STOP',
        next: ['DESTROYING', 'FAILED_TO_RESTART', 'RESTARTING', 'STARTING', 'STOPPING']
    },
    RESTARTING: {
        name: 'RESTARTING',
        next: ['DESTROYING', 'STARTING', 'STOPPING']
    },
    RUNNING: {
        name: 'RUNNING',
        next: ['DESTROYING', 'RESTARTING', 'STOPPING']
    },
    STARTING: {
        name: 'STARTING',
        next: ['FAILED_TO_START', 'RUNNING'],
        waitForTransition: true
    },
    STOPPED: {
        name: 'STOPPED',
        next: ['DESTROYING', 'RESTARTING', 'STARTING']
    },
    STOPPING: {
        name: 'STOPPING',
        next: ['FAILED_TO_STOP', 'STOPPED'],
        waitForTransition: true
    }
};

/**
 * PRIVATE METHODS
 */
/**
 * Catch error (if promise throws it) and set next state
 *
 * @this BaseDataReceiver
 * @param {Promise} promise - promise
 * @param {DataReceiverState | String} successState - state to try to set when promise is fulfilled
 * @param {DataReceiverState | String} failState - state to try to set when promise is rejected
 * @param {Object} [options] - options for ._setState
 *
 * @returns {Promise} resolved with original return value
 */
function callAndSetState(promise, successState, failState, options) {
    let uncaughtErr;
    let originRet;

    return promise.then((ret) => {
        originRet = ret;
    })
        .catch((err) => {
            uncaughtErr = err;
        })
        .then(() => this._setState(uncaughtErr ? failState : successState, options))
        .then(() => (uncaughtErr ? Promise.reject(uncaughtErr) : Promise.resolve(originRet)));
}

/**
 * Set state
 *
 * @this BaseDataReceiver
 * @param {DataReceiverState} nextState - next state
 *
 * @returns {Promise} resolved when state changed
 */
function setState(nextState, force) {
    force = typeof force === 'undefined' ? false : force;
    this.logger.debug(`changing state from '${this.getCurrentStateName()}' to '${nextState.name}' [force = ${force}]`);
    const prevState = this._state;
    this._state = nextState;
    return this.safeEmitAsync('stateChanged', { current: this.getCurrentStateName(), previous: prevState.name });
}

module.exports = {
    BaseDataReceiver,
    BaseDataReceiverError,
    StateTransitionError
};

/**
 * @typedef DataReceiverState
 * @type {Object}
 * @property {String} name - state name
 * @property {Array<String>} next - allowed state transitions
 * @property {Boolean} waitForTransition - doesn't allow mid-state transitions until it finishes current transition
 */
/**
 * State changed event
 *
 * @event BaseDataReceiver#stateChanged
 * @type {Object}
 * @property {String} current - current state
 * @property {String} previous - previous state
 */
