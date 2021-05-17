/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Function that will attempt the promise over and over again
 *
 * @param {Function} fn              - function which returns Promise as the result of execution
 * @param {Object}   [opts]          - options object
 * @param {Array}    [opts.args]     - array of arguments to apply to the function. By default 'null'.
 * @param {Object}   [opts.context]  - context to apply to the function (.apply). By default 'null'.
 * @param {Number}   [opts.maxTries] - max number of re-try attempts. By default '1'.
 * @param {Function} [opts.callback] - callback(err) to execute when function failed.
 *      Should return 'true' to continue 'retry' process. By default 'null'.
 * @param {Number}   [opts.delay]    - a delay to apply between attempts. By default 0.
 * @param {Number}   [opts.backoff]  - a backoff factor to apply between attempts after the second try
 *      (most errors are resolved immediately by a second try without a delay). By default 0.
 *
 * @returns {Promise} resolved when 'fn' succeed
 */
function retry(fn, opts) {
    opts = opts || {};
    opts.tries = opts.tries || 0;
    opts.maxTries = opts.maxTries || 1;

    return fn.apply(opts.context || null, opts.args || null)
        .catch((err) => {
            if (opts.tries < opts.maxTries && (!opts.callback || opts.callback(err))) {
                opts.tries += 1;
                let delay = opts.delay || 0;

                // applying backoff after the second try only
                if (opts.backoff && opts.tries > 1) {
                    /* eslint-disable no-restricted-properties */
                    delay += opts.backoff * Math.pow(2, opts.tries - 1);
                }
                if (delay) {
                    return new Promise((resolve) => {
                        setTimeout(() => resolve(retry(fn, opts)), delay);
                    });
                }
                return retry(fn, opts);
            }
            return Promise.reject(err);
        });
}

module.exports = {
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
     * @returns {Promise<Array<PromiseResolutionStatus>>} resolved once all of the
     * given promises have either fulfilled or rejected
     */
    allSettled(promises) {
        return Promise.all(promises.map(p => Promise.resolve(p)
            .then(
                val => ({ status: 'fulfilled', value: val }),
                err => ({ status: 'rejected', reason: err })
            )));
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

    /** @see retry */
    retry
};

/**
 * Promise status
 *
 * @typedef PromiseResolutionStatus
 * @type {Object}
 * @property {String} status - fulfilled or rejected
 * @property {Any} value - value returned by fulfilled promise
 * @property {Error} reason - rejection reason (error object)
 */
