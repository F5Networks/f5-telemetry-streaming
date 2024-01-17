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

/**
 * @module test/functional/shared/utils/promise
 */

// eslint-disable-next-line no-multi-assign
const promiseUtils = module.exports = {
    /**
     * Returns a promise that resolves after all of the given promises have either fulfilled or rejected,
     * with an array of objects that each describes the outcome of each promise.
     *
     * Note: original method is available on node 12.9.0+
     *
     * This function is useful when you run promises that doesn't depend on each other and
     * you don't want them to be in unknown state like Promise.all do when one of the
     * promises was rejected. Ideally this function should be used everywhere instead of Promise.all
     *
     * @param {Array<Promise>}
     *
     * @returns {Promise<Array<PromiseResolutionStatus>>} resolved once all of the
     * given promises have either fulfilled or rejected
     */
    allSettled(promises) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(promises)) {
                reject(new Error(`${promises} is not an array`));
            } else {
                Promise.all(promises.map((p) => Promise.resolve(p)
                    .then(
                        (val) => ({ status: 'fulfilled', value: val }),
                        (err) => ({ status: 'rejected', reason: err })
                    )))
                    .then(resolve, reject);
            }
        });
    },

    /**
     * Get values returned by 'allSettled'
     *
     * Note: when 'ignoreRejected' is true then 'undefined' will be returned for rejected promises
     * to preserve order as in an original array
     *
     * @param {Array<PromiseResolutionStatus>} statuses - array of statuses
     * @param {Boolean} [ignoreRejected = false] - ignore rejected promises
     *
     * @returns {Array<Any>} filtered results
     * @throws {Error} original rejection error
     */
    getValues(statuses, ignoreRejected) {
        return statuses.map((status) => {
            if (!ignoreRejected && typeof status.reason !== 'undefined') {
                throw status.reason;
            }
            return status.value;
        });
    },

    /**
     * Async 'forEach'
     *
     * @param {Array} collection - collection of elements
     * @param {ForLoopCb} callbackFn - function to execute on each element
     *
     * @return {Promise} resolved once finished
     */
    loopForEach(collection, callbackFn) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(collection)) {
                reject(new Error(`${collection} is not an array`));
            } else if (typeof callbackFn !== 'function') {
                reject(new Error(`${callbackFn} is not a function`));
            } else if (collection.length === 0) {
                resolve();
            } else {
                // caching it to ignore possible mutations
                const collectionLength = collection.length;
                let idx = 0;

                promiseUtils.loopUntil((breakCb) => {
                    if (idx >= collectionLength) {
                        return breakCb();
                    }
                    return Promise.resolve()
                        .then(() => callbackFn(collection[idx], idx, collection, breakCb))
                        .then(() => { idx += 1; });
                })
                    .then(resolve, reject);
            }
        });
    },

    /**
     * Async 'until' loop
     *
     * Note:
     * - 'until' because `callbackFn` will be called at least once due implementation
     *
     * @param {LoopUntilCb} callbackFn - function to execute
     *
     * @return {Promise<any>} resolved when stopped and with value returned by
     *  last succeed execution of 'callbackFn'
     */
    loopUntil(callbackFn) {
        return new Promise((resolve, reject) => {
            if (typeof callbackFn !== 'function') {
                reject(new Error(`${callbackFn} is not a function`));
            } else {
                let lastRet;
                let stopRequested = false;
                const stopLoop = () => {
                    stopRequested = true;
                };
                Object.defineProperty(stopLoop, 'called', {
                    get: () => stopRequested
                });

                (function next() {
                    if (stopLoop.called) {
                        resolve(lastRet);
                    } else {
                        Promise.resolve()
                            .then(() => callbackFn(stopLoop))
                            .then((ret) => {
                                lastRet = ret;
                                return next();
                            })
                            .catch(reject);
                    }
                }());
            }
        });
    },

    /**
     * Function that will attempt the promise over and over again
     *
     * Note:
     * - if no 'opts' passed to the function then 'fn' will be executed only once
     * - if 'opts.maxTries' set to 1 then 'fn' will be executed only once
     * - if 'opts.maxTries' set to 2+ then 'fn' will be executed 2+ times
     * - if you want to know how many attempts were made then you can pass '{}' as 'opts' and
     *      then check 'tries' property
     * - if 'opts.callback' specified then it will be executed 'opts.maxTries - 1' times
     *
     * @param {function} fn - function to call
     * @param {PromiseRetryOptions} [opts] - options object
     *
     * @returns {Promise<any>} resolved with value returned by 'fn' when succeed
     */
    retry(fn, opts) {
        return new Promise((resolve, reject) => {
            if (typeof fn !== 'function') {
                reject(new Error(`${fn} is not a function`));
            } else {
                opts = opts || {};
                opts.tries = 0;
                opts.maxTries = Math.abs(opts.maxTries) || 1;

                promiseUtils.loopUntil((breakCb) => Promise.resolve()
                    .then(() => {
                        opts.tries += 1;
                        return fn();
                    })
                    .then((ret) => {
                        breakCb();
                        return ret;
                    })
                    .catch((error) => {
                        if (opts.tries < opts.maxTries && (!opts.callback || opts.callback(error))) {
                            let delay = opts.delay || 0;

                            // applying backoff after the second try only
                            if (opts.backoff && opts.tries > 1) {
                                /* eslint-disable no-restricted-properties */
                                delay += opts.backoff * Math.pow(2, opts.tries - 1);
                            }
                            if (delay) {
                                return promiseUtils.sleep(delay);
                            }
                            return Promise.resolve();
                        }
                        return Promise.reject(error);
                    }))
                    .then(resolve, reject);
            }
        });
    },

    /**
     * Sleep for N ms.
     *
     * @param {integer} sleepTime - number of ms.
     *
     * @returns {Promise} resolved once N .ms passed or rejected if canceled via .cancel()
     */
    sleep(sleepTime) {
        /**
         * According to http://www.ecma-international.org/ecma-262/6.0/#sec-promise-executor
         * executor will be called immediately (synchronously) on attempt to create Promise
         */
        let cancelCb;
        const promise = new Promise((resolve, reject) => {
            const timeoutID = setTimeout(() => {
                cancelCb = null;
                resolve();
            }, sleepTime);
            cancelCb = (reason) => {
                cancelCb = null;
                clearTimeout(timeoutID);
                reject(reason || new Error('canceled'));
            };
        });
        /**
         * @param {Error} [reason] - cancellation reason
         *
         * @returns {Boolean} 'true' if cancelCb called else 'false'
         */
        promise.cancel = (reason) => {
            if (cancelCb) {
                cancelCb(reason);
                return true;
            }
            return false;
        };
        return promise;
    },

    /**
     * Sleep for N ms. and reject after it
     *
     * @param {integer} sleepTime - number of ms.
     * @param {Error | string} [error] - Error or message to use as rejection reason
     *
     * @returns {Promise} resolved after timeout
     */
    sleepAndReject(sleepTime, error) {
        return promiseUtils.sleep(sleepTime)
            .then(() => {
                if (arguments.length < 2) {
                    error = new Error('sleepAndReject error!');
                } else if (typeof error === 'string') {
                    error = new Error(error);
                }
                return Promise.reject(error);
            });
    }
};

/**
 * "break" callback
 *
 * @callback BreakCb
 * @property {boolean} called - returns true if loop stop was requested
 *
 * @returns {void}
 */
/**
 * "forLoop" callback
 *
 * @callback ForLoopCb
 * @param {any} item - the current element being processed in the array
 * @param {number} [index] - the index of element in the array
 * @param {Array} [array] - the array forLoop() was called upon
 * @param {BreakCb} [breakCb] - callback to stop a loop
 *
 * @returns {void|Promise}
 */
/**
 * Promise status
 *
 * @typedef PromiseResolutionStatus
 * @type {object}
 * @property {string} status - fulfilled or rejected
 * @property {any} value - value returned by fulfilled promise
 * @property {Error} reason - rejection reason (error object)
 */
/** Promise re-try options
 * @typedef PromiseRetryOptions
 * @type {object}
 * @param {number} [backoff] - a backoff factor to apply between attempts after the second try
 *      (most errors are resolved immediately by a second try without a delay). By default 0.
 * @param {function} [callback] - callback(err) to execute when function failed.
 *      Should return 'true' to continue 'retry' process. By default 'null'.
 * @param {number} [delay] - a delay to apply between attempts. By default 0.
 * @param {number} [maxDelay] - max delay
 * @param {number} [maxTries] - max number of re-try attempts. By default '1'.
 * @param {number} [minDelay] - min delay
 */
/**
 * "loopUntil" callback
 *
 * @callback LoopUntilCb
 * @param {BreakCb} breakCb - callback to stop a loop
 *
 * @returns {void|Promise}
 */
