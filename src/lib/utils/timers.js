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

/** @module timers */

const NotImplementedError = require('../errors').NotImplementedError;

/**
 * Interface for classes that represents a recurring timer
 *
 * @class
 */
class TimerInterface {
    /**
     * @returns {boolean} true if instance is active
     */
    isActive() {
        throw new NotImplementedError();
    }

    /**
     * Starts a recurring function
     *
     * @returns {Promise} resolved once scheduled
     */
    start() {
        throw new NotImplementedError();
    }

    /**
     * Updates a recurring function
     *
     * @returns {Promise} resolved once updated and scheduled
     */
    update() {
        throw new NotImplementedError();
    }

    /**
     * Stops a recurring function
     *
     * @returns {Promise} resolved once stopped
     */
    stop() {
        throw new NotImplementedError();
    }
}

/**
 * Basic Interval timer class
 *
 * Schedules a recurring process "naively", using NodeJS setInterval().
 * If the recurring function has a long duration, it is possible for function runs to "overlap"
 *
 * @class
 * @property {function} func - function to schedule
 * @property {Array} args - arguments to pass to scheduled function
 * @property {number} intervalInS - number of seconds to use as the frequency of function executions
 * @property {boolean} abortOnFailure - whether stop scheduling if an error occurs. Default=False
 * @property {Logger} logger - logger instance
 */
class BasicTimer extends TimerInterface {
    /**
     * Constructor
     *
     * @param {function} func - target function
     * @param {number | TimerOptions} intervalInS - interval (in seconds)
     * @param {...any} [args] - arguments to pass to target function
     */
    constructor() {
        super();
        this.abortOnFailure = false;
        setTimerArgs.apply(this, arguments);
    }

    /**
     * @returns {boolean} true if instance is active
     */
    isActive() {
        return typeof this._intervalID !== 'undefined';
    }

    /**
     * Start function
     *
     * @param {function} func - target function
     * @param {number | TimerOptions} intervalInS - interval (in seconds)
     * @param {...any} [args] - arguments to pass to target function
     *
     * @returns {Promise} resolved once scheduled
     */
    start() {
        return Promise.resolve()
            .then(() => {
                if (this.isActive()) {
                    throw new Error('BasicTimer: started already');
                }
                setTimerArgs.apply(this, arguments);
                if (!this.func) {
                    throw new Error('BasicTimer: No function to run');
                }
                const intervalID = setInterval(
                    () => new Promise((resolve, reject) => {
                        Promise.resolve(this.func.apply(null, this.args || []))
                            .then(resolve, reject);
                    })
                        .catch((error) => {
                            if (this.logger) {
                                this.logger.exception('BasicTimer: execution error', error);
                            }
                            if (this.abortOnFailure === true) {
                                if (this.logger) {
                                    this.logger.warning('BasicTimer: aborting on failure, not scheduling next execution');
                                }
                                if (this._intervalID === intervalID) {
                                    this.stop();
                                } else {
                                    clearInterval(intervalID);
                                }
                            }
                        }),
                    (this.intervalInS || 0) * 1000
                );
                this._intervalID = intervalID;
            });
    }

    /**
     * Update function
     *
     * @param {function} func - target function
     * @param {number | TimerOptions} [intervalInS] - interval (in seconds)
     * @param {...any} [args] - arguments to pass to target function
     *
     * @returns {Promise} resolved once updated and scheduled
     */
    update() {
        return this.stop()
            .then(() => this.start.apply(this, arguments));
    }

    /**
     * Stop function
     *
     * @returns {Promise} resolved once stopped
     */
    stop() {
        return Promise.resolve()
            .then(() => {
                if (this.isActive()) {
                    clearInterval(this._intervalID);
                    delete this._intervalID;
                }
            });
    }
}

/**
 * Sliding Timer class
 *
 * Schedules recurring processes to occur, but does not allow scheduled functions to "overlap".
 * If a scheduled function takes longer than the requested interval to run, the next execution is immediate.
 *
 * @class
 * @property {function} func - function to schedule
 * @property {Array} args - arguments to pass to scheduled function
 * @property {number} intervalInS - number of seconds to use as the frequency of function executions
 * @property {boolean} abortOnFailure - whether stop scheduling if an error occurs. Default=False
 * @property {Logger} logger - logger instance
 */
class SlidingTimer extends BasicTimer {
    /**
     * Start function
     *
     * @param {function} func - target function
     * @param {number | TimerOptions} intervalInS - interval (in seconds)
     * @param {...any} [args] - arguments to pass to target function
     *
     * @returns {Promise} resolved once scheduled
     */
    start() {
        return Promise.resolve()
            .then(() => {
                if (this.isActive()) {
                    throw new Error('SlidingTimer: started already');
                }
                setTimerArgs.apply(this, arguments);
                if (!this.func) {
                    throw new Error('SlidingTimer: No function to run');
                }
                const intervalID = setSlidingInterval(
                    () => this.func.apply(null, this.args || []),
                    {
                        interval: (this.intervalInS || 0) * 1000,
                        onError: (error) => {
                            if (this.logger) {
                                this.logger.exception('SlidingTimer: execution error', error);
                            }
                            if (this.abortOnFailure === true) {
                                if (this.logger) {
                                    this.logger.warning('SlidingTimer: aborting on failure, not scheduling next execution');
                                }
                                if (this._intervalID === intervalID) {
                                    this.stop();
                                } else {
                                    clearSlidingInterval(intervalID);
                                }
                            }
                        },
                        onIntervalSlide: (duration, interval) => {
                            if (this.logger) {
                                this.logger.warning(`SlidingTimer: configured interval of ${interval / 1000}s., but took ${duration / 1000}s.`);
                            }
                        }
                    }
                );
                this._intervalID = intervalID;
            });
    }

    /**
     * Stop function
     *
     * @param {boolean} [wait = false] - wait till complete stop
     *
     * @returns {Promise} resolved once stopped
     */
    stop(wait) {
        return Promise.resolve()
            .then(() => {
                if (this.isActive()) {
                    return new Promise((resolve) => {
                        if (!clearSlidingInterval(this._intervalID, wait ? resolve : null) || !wait) {
                            resolve();
                        }
                        delete this._intervalID;
                    });
                }
                return Promise.resolve();
            });
    }
}

/**
 * @param {SlidingIntervalRef} ref - SlidingInterval instance
 * @param {siErrorCb} [stopCb] - callback to call once SlidingInterval instance stopped
 *
 * @returns {boolean} true when SlidingInterval instance unregistered (but not stopped yet) or false
 *     when SlidingInterval instance not found
 */
function clearSlidingInterval(ref, stopCb) {
    // eslint-disable-next-line no-use-before-define
    const inst = SlidingInterval.findByRef(ref);
    if (inst) {
        inst.addStopCb(stopCb);
        inst.disable();
        return true;
    }
    return false;
}

/**
 * @param {function} func - function to run
 * @param {number | SlidingIntervalOptions} interval - interval value or options
 *
 * @returns {SlidingIntervalRef} SlidingIntervalRef instance that might be used to stop SlidingInterval
 */
function setSlidingInterval(func, options) {
    let interval;
    if (typeof options === 'object') {
        interval = options.interval;
    } else {
        interval = options;
        options = {};
    }
    interval = typeof interval === 'number' ? interval : 0;

    // eslint-disable-next-line no-use-before-define
    return new SlidingInterval(
        func,
        interval,
        Array.prototype.slice.call(arguments, 2),
        options
    ).ref;
}

/**
 * PRIVATE METHODS
 */
/**
 * Parse arguments
 *
 * @this SlidingTimer
 * @param {function} func - target function
 * @param {number | TimerOptions} [intervalInS] - interval (in seconds) or options
 * @param {...any} [args] - arguments to pass to target function
 */
function setTimerArgs() {
    if (arguments.length === 0) {
        return;
    }
    let preserveArgs = true;
    if (arguments.length >= 1) {
        this.func = arguments[0];
    }
    if (arguments.length >= 2) {
        this.intervalInS = arguments[1];
        const varType = typeof this.intervalInS;
        if (varType === 'object') {
            this.logger = this.intervalInS.logger;
            this.abortOnFailure = !!this.intervalInS.abortOnFailure;
            preserveArgs = typeof this.intervalInS.preserveArgs === 'boolean'
                ? this.intervalInS.preserveArgs
                : preserveArgs;
            this.intervalInS = this.intervalInS.intervalInS;
        }
    }
    if (arguments.length >= 3) {
        this.args = Array.from(arguments).slice(2);
    } else if (!preserveArgs) {
        delete this.args;
    }
}

/**
 * Class to use as unique anonymous reference for SlidingInterval
 */
class SlidingIntervalRef {}

/**
 * Sliding Interval Class
 */
class SlidingInterval {
    /**
     * Constructor
     *
     * @param {function} func - function to run
     * @param {number} interval - interval
     * @param {Array} args - arguments to pass to function
     * @param {SlidingIntervalOptions} options - options
     */
    constructor(func, interval, args, options) {
        this.ref = new SlidingIntervalRef();
        this.func = func;
        this.interval = interval;
        this.args = args;
        this.onError = options.onError;
        this.onIntervalSlide = options.onIntervalSlide;
        // register new instance first and then call .run to unlock scheduling
        SlidingInterval.INSTANCES.push(this);
        this.run();
    }

    /**
     * @param {function} cb - callback to call once instance stopped
     *
     * @returns {void} once added
     */
    addStopCb(cb) {
        this.stopCb = cb;
    }

    /**
     * @returns {void} once instance disabled (but not stopped yet)
     */
    disable() {
        const idx = SlidingInterval.INSTANCES.indexOf(this);
        SlidingInterval.INSTANCES.splice(idx, 1);
        if (typeof this.timeoutID !== 'undefined') {
            // execution scheduled and not ran yet so
            // it can be canceled right away
            // otherwise callback will be executed in 'run' method
            clearTimeout(this.timeoutID);
            delete this.timeoutID;
            this.execStopCb();
        }
    }

    /**
     * Execute 'stop' callback in async way
     *
     * @returns {void} once callback execution scheduled
     */
    execStopCb() {
        if (this.stopCb) {
            // run callback in async way
            setImmediate(this.stopCb);
        }
    }

    /**
     * @returns {boolean} true if instance was disabled
     */
    isDisabled() {
        return !SlidingInterval.INSTANCES.some((si) => si === this);
    }

    /**
     * @param {number} [delay] - delay before next execution to use instead of configured interval
     *
     * @returns {void} once execution of target function scheduled
     */
    run(delay) {
        // check before scheduling
        if (this.isDisabled()) {
            this.execStopCb();
            return;
        }
        this.timeoutID = setTimeout(() => {
            delete this.timeoutID;
            const startTime = Date.now();
            /**
             * run target function inside of a Promise to track execution time
             * in case if target function returns a Promise
             */
            new Promise((resolve, reject) => {
                Promise.resolve(this.func.apply(null, this.args))
                    .then(resolve, reject);
            })
                .catch((error) => (this.onError ? this.onError(error) : Promise.reject(error)))
                .then(() => {
                    const duration = Date.now() - startTime;
                    if (duration > this.interval && this.onIntervalSlide) {
                        this.onIntervalSlide(duration, this.interval);
                    }
                    delay = this.interval - duration;
                    delay = delay > 0 ? delay : 0;
                    this.run.call(this, delay);
                });
        }, arguments.length ? delay : this.interval);
    }
}

/**
 * @property {Array<SlidingInterval>} - active instances
 */
SlidingInterval.INSTANCES = [];

/**
 * @param {SlidingIntervalRef} ref - SlidingIntervalRef to use to find SlidingInterval instance
 *
 * @returns {SlidingInterval | undefined} SlidingInterval instance or undefined if not found
 */
SlidingInterval.findByRef = (ref) => SlidingInterval.INSTANCES.find((si) => si.ref === ref);

module.exports = {
    TimerInterface,
    BasicTimer,
    SlidingTimer,

    clearSlidingInterval,
    numberOfActiveSlidingIntervals() { return SlidingInterval.INSTANCES.length; },
    setSlidingInterval
};

/**
 * @typedef SlidingIntervalRef
 * @type {object}
 * @property {SlidingInterval} ref - SlidingInterval instance
 * @property {Array<function>} stopCbs - stop callbacks
 * @property {object} timeoutID - ID returned by setTimeout
 */
/**
 * @typedef SlidingIntervalOptions
 * @type {object}
 * @property {number} interval - interval
 * @property {siErrorCb} [onError]
 * @property {siIntervalSlideCb} [onIntervalSlide]
 */
/**
 * The callback to call when caught unexpected error on attempt to execute target function
 * @callback siErrorCb
 * @param {Error} error - uncaught error
 */
/**
 * The callback to call when execution time of target function took longer then configured interval
 * @callback siIntervalSlideCb
 * @param {number} duration - duration of target function execution (in ms.)
 * @param {number} interval - configured interval (in ms.)
 */
/**
 * @typedef TimerOptions
 * @type {object}
 * @property {boolean} abortOnFailure - stop on failure
 * @property {number} intervalInS - interval in seconds
 * @property {Logger} logger - logger instance
 * @property {boolean} [preserveArgs = true] - whether to preserve current args when nothing passed to the function
 */
