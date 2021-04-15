/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('../logger');

/** @module timers */

/**
 * Interface for classes that represents a recurring timer
 *
 * @class
 */
class TimerInterface {
    /**
     * Starts a recurring function
     */
    start() {
        throw new Error('Not implemented');
    }

    /**
     * Updates a recurring function
     */
    update() {
        throw new Error('Not implemented');
    }

    /**
     * Stops a recurring function
     */
    stop() {
        throw new Error('Not implemented');
    }
}

/**
 * Basic Interval timer class
 *
 * Schedules a recurring process "naively", using NodeJS setInterval().
 * If the recurring function has a long duration, it is possible for function runs to "overlap"
 *
 * @class
 */
class BasicTimer extends TimerInterface {
    /**
     * Start function
     *
     * @returns {Object} setInterval ID (to be used by clearInterval)
     */
    start(func, args, intervalInS) {
        return setInterval(func, intervalInS * 1000, args);
    }

    /**
     * Update function
     *
     * @returns {Object} Result of function start()
     */
    update(setIntervalId, func, args, intervalInS) {
        clearInterval(setIntervalId);
        return this.start(func, args, intervalInS);
    }

    /**
     * Stop function
     *
     * @param {integer} intervalID - interval ID
     */
    stop(intervalID) {
        clearInterval(intervalID);
    }
}

/**
 * Sliding Timer class
 *
 * Schedules recurring processes to occur, but does not allow scheduled functions to "overlap".
 * If a scheduled function takes longer than the requested interval to run, the next execution is immediate.
 *
 * @class
 *
 * @property {Object}   func            - Function to schedule
 * @property {Object}   args            - Arguments to pass to scheduled function
 * @property {Number}   intervalInS     - Number of seconds to use as the frequency of function executions
 * @property {Boolean}  abortOnFailure  - Whether stop scheduling if an error occurs. Default=False
 * @property {String}   logInfo         - Additional log information about the scheduled process
 * @property {Object}   timeout         - Current NodeJS.Timeout
 * @property {Boolean}  funcRunning     - Whether or not the scheduled function is currently executing
 * @property {Object}   logger          - Initialized Logger
 */
class SlidingTimer extends TimerInterface {
    /**
     * Constructor
     *
     * @param {Object}  func                    - Function to schedule
     * @param {Object}  args                    - Arguments to pass to scheduled function
     * @param {Number}  intervalInS             - Number of seconds to use as the frequency of function executions
     * @param {Object}  [opts]                  - Options to provide
     * @param {Boolean} [opts.abortOnFailure]   - Whether stop scheduling if an error occurs. Default=False
     * @param {String}  [opts.logInfo]          - Additional log information about the scheduled process
     */
    constructor(func, args, intervalInS, opts) {
        super();
        this.func = func;
        this.args = args;
        this.intervalInS = intervalInS;
        this.options = opts || {};
        this.abortOnFailure = this.options.abortOnFailure || false;
        this.logInfo = this.options.logInfo;

        this.timeout = null;
        this.funcRunning = false;
        this.logger = logger.getChild('timers');
        if (this.logInfo) {
            this.logger = this.logger.getChild(this.logInfo);
        }
    }

    /**
     * Stop (clear) the current Timeout
     */
    stop() {
        this._clearTimeout();
        // If stop() is called while scheduled function is running, use this to check if stop() was called
        this.timeout = null;
    }

    /**
     * Update the current scheduled function
     *
     * @param {Object} func         - Function to schedule
     * @param {Object} args         - Arguments to pass to scheduled function
     * @param {Number} intervalInS  - Number of seconds to use as the frequency of function executions
     */
    update(func, args, intervalInS) {
        this._clearTimeout();
        this.func = func;
        this.args = args;
        this.intervalInS = intervalInS;
        // If scheduled function is currently executing, its next iteration will pick up new parameters.
        // If the scheduled function is not executing (is in a 'waiting' state), can schedule new interval
        if (this.funcRunning === false) {
            this.start();
        }
    }

    /**
     * Starts a scheduled function
     */
    start() {
        const intervalInMs = this.intervalInS * 1000;
        this.timeout = setTimeout(this._funcRunner.bind(this), intervalInMs);
    }

    _clearTimeout() {
        clearTimeout(this.timeout);
    }

    // Internal function runner function
    _funcRunner() {
        this.funcRunning = true;
        const functionStartTime = Date.now();
        let caughtError = false;

        return new Promise((resolve, reject) => {
            try {
                Promise.resolve(this.func(this.args)).then(resolve, reject);
            } catch (err) {
                reject(err);
            }
        })
            .catch((err) => {
                caughtError = true;
                this.logger.exception('SlidingTimer execution error', err);
                if (this.abortOnFailure === true) {
                    this.logger.warning('Aborting on failure. Not scheduling next execution');
                }
            })
            .then(() => {
                // Use the function's duration to determine when to schedule the next execution
                const functionDuration = Date.now() - functionStartTime;
                let nextExecutionDelay = (this.intervalInS * 1000) - functionDuration;

                if (nextExecutionDelay < 0) {
                    this.logger.warning(`Timer has interval of ${this.intervalInS} seconds, but took ${functionDuration / 1000} seconds.`);
                    nextExecutionDelay = 0;
                }
                // Check if stop() was called during this.func() execution, or if error occurred
                if (this.timeout === null || (caughtError && this.abortOnFailure === true)) {
                    // Do not schedule next execution
                } else {
                    this.timeout = setTimeout(this._funcRunner.bind(this), nextExecutionDelay);
                }
                // Only set funcRunning=false after setTimeout() call, so executions don't overlap
                this.funcRunning = false;
            });
    }
}

module.exports = {
    TimerInterface,
    BasicTimer,
    SlidingTimer
};
