/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EventEmitter2 = require('eventemitter2');

/**
 * Log error
 *
 * @param {Error} error - error to log
 *
 * @returns {Error} error
 */
function logSafeEmitException(error) {
    if (this.logger) {
        this.logger.exception(`${this.constructor.name}.safeEmit(Async) uncaught error`, error);
    }
    return error;
}

/**
 * Subclass of EventEmitter2 with safe 'emit'
 */
class SafeEventEmitter extends EventEmitter2 {
    /**
     * Emit event
     *
     * @returns {Boolean | Error} true if the event had listeners, false otherwise or Error if caught one
     */
    safeEmit() {
        try {
            return this.emit.apply(this, arguments);
        } catch (emitErr) {
            return logSafeEmitException.call(this, emitErr);
        }
    }

    /**
     * Emit async event
     *
     * @async
     * @returns {Promise<Array<any> | Error>} promise resolved with array of responses or
     *      Error if caught one (no rejection)
     */
    safeEmitAsync() {
        try {
            return this.emitAsync.apply(this, arguments)
                .catch(logSafeEmitException.bind(this));
        } catch (emitErr) {
            return Promise.resolve(logSafeEmitException.call(this, emitErr));
        }
    }
}

module.exports = {
    SafeEventEmitter
};
