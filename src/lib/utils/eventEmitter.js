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

/**
 * Log error
 *
 * @param {string} event - event
 * @param {Error} error - error to log
 *
 * @returns {Error} error
 */
function logSafeEmitException(event, error, isAsync) {
    if (this.logger) {
        this.logger.exception(`${this.constructor.name}.safeEmit${isAsync ? 'Async' : ''}, event "${event}", uncaught error`, error);
    }
    return error;
}

/**
 * Subclass of EventEmitter2 with safe 'emit'
 */
class SafeEventEmitter extends EventEmitter2 {
    /**
     * @inheritdoc
     *
     * NOTE: makes the function trully async. Original implementation is sync
     */
    async emitAsync() {
        return super.emitAsync.apply(this, arguments);
    }

    /**
     * Emit event
     *
     * @returns {boolean | Error} true if the event had listeners, false otherwise or Error if caught one
     */
    safeEmit() {
        try {
            return this.emit.apply(this, arguments);
        } catch (emitErr) {
            return logSafeEmitException.call(this, arguments[0], emitErr, false);
        }
    }

    /**
     * Emit async event
     *
     * @returns {Promise<any[]> | Error>} promise resolved with array of responses or
     *      Error if caught one (no rejection)
     */
    async safeEmitAsync() {
        try {
            return await this.emitAsync.apply(this, arguments);
        } catch (emitErr) {
            return logSafeEmitException.call(this, arguments[0], emitErr, true);
        }
    }
}

module.exports = SafeEventEmitter;

/**
 * @typedef CallOnceOnly
 * @type {function}
 * @property {boolean} calledOnce - true when function was called already
 *
 * When .calledOnce returns true and callee trying to call a function then error will be thrown
 */
