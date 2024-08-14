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

/* eslint-disable no-unused-expressions */

const APP_THRESHOLDS = require('../constants').APP_THRESHOLDS;

/**
 * @private
 *
 * @module resourceMonitor/processingState
 *
 * @typedef {import('eventemitter2').Listener} Listener
 * @typedef {import('./memoryMonitor').MemoryCheckStatus} MemoryCheckStatus
 * @typedef {import('./index').ResourceMonitor} ResourceMonitor
 */

/**
 * Event handler for memore usage state updates
 *
 * @this ProcessingStateCtx
 *
 * @param {boolean} forceCallback - true if callbacks need to be called
 * @param {undefined | MemoryCheckStatus} [memoryStatus] - current memory state info.
 *  Is `undefined` on init or when destroyed.
 */
function updateProcessingState(forceCallback, memoryStatus) {
    if (this.resMonitor === null) {
        // destroyed already, ignore
        return;
    }

    const prevEnabled = this.enabled;
    let cb = null;

    // update state
    this.enabled = this.resMonitor.isProcessingEnabled();

    if (forceCallback) {
        cb = this.enabled ? this.onEnable : this.onDisable;
    } else if (!memoryStatus) {
        // monitor stopped, re-enable all if not yet
        cb = prevEnabled ? null : this.onEnable;
    } else if (prevEnabled !== this.enabled) {
        cb = this.enabled ? this.onEnable : this.onDisable;
    }

    cb && setImmediate(cb);
}

/**
 * @param {ResourceMonitor} resMonitor - Resource Monitor instance
 * @param {function} onEnable - callback to call when processing disabled
 * @param {function} onDisable - callback to call when processing disabled
 *
 * @returns {ProcessingStateCtx}
 */
function makeProcessingStateCtx(resMonitor, onEnable, onDisable) {
    return {
        enabled: true,
        listeners: [],
        onDisable,
        onEnable,
        resMonitor
    };
}

/**
 * @param {ProcessingStateCtx} ctx - context
 *
 * @returns {ProcessingState} processing state handler
 */
function buildProcessingStateHandler(ctx) {
    /**
     * - create anonymous structure to keep fields private
     * - ideally `receiver` should not retain access to `instance`
     *   because `updateProcessingState` retains `ctx` with all properties
     *   and `updateProcessingState` is retained by resMonitor.ee as event listener.
     *   Once resMonitor.ee. removed all listeners then refs will be freed.
     */

    const instance = {};
    /** define static read-only props that should not be overriden */
    Object.defineProperties(instance, {
        destroy: {
            value: () => {
                if (instance.destroyed) {
                    return;
                }

                // shallow copy to be able to remove instance properly
                const ctxCopy = Object.assign({}, ctx);

                ctx.enabled = true;
                ctx.listeners.forEach((listener) => listener.off());
                ctx.listeners.length = 0;
                ctx.onDisable = null;
                ctx.onEnable = null;
                ctx.resMonitor = null;

                updateProcessingState.call(ctxCopy, false);
            }
        },
        destroyed: {
            get() {
                return ctx.resMonitor === null;
            }
        },
        enabled: {
            get() {
                return ctx.enabled;
            }
        },
        memoryState: {
            get() {
                return ctx.resMonitor.memoryState;
            }
        }
    });

    const updateEventCb = updateProcessingState.bind(ctx, false);
    ctx.listeners = [
        APP_THRESHOLDS.MEMORY.STATE.NOT_OK,
        APP_THRESHOLDS.MEMORY.STATE.OK
    ].map((evt) => ctx.resMonitor.ee.on(evt, updateEventCb, { objectify: true }));

    ctx.listeners.push(
        ctx.resMonitor.ee.on(
            'pstate.destroy',
            instance.destroy,
            { objectify: true }
        )
    );

    updateProcessingState.call(ctx, true);
    return instance;
}

/**
 * Build Processing State instance
 *
 * @param {ResourceMonitor} resMonitor
 * @param {function} onEnable
 * @param {function} onDisable
 *
 * @returns {ProcessingState}
 */
module.exports = function builder(resMonitor, onEnable, onDisable) {
    return buildProcessingStateHandler(
        makeProcessingStateCtx(resMonitor, onEnable, onDisable)
    );
};

/**
 * @typedef ProcessingState
 * @type {Object}
 * @property {function} destroy - destroy instance
 * @property {boolean} destroyed - true if processing state instance was detroyed
 * @property {boolean} enabled - if processing allowed to continue
 * @property {MemoryCheckStatus} memoryState - most recent data about memory usage
 */
/**
 * @typedef ProcessingStateCtx
 * @type {object}
 * @property {boolean} enabled - current state
 * @property {Listener[]} listeners - events listeners
 * @property {function} onDisable - callback to call when processing disabled
 * @property {function} onEnable - callback to call when processing disabled
 * @property {ResourceMonitor} resMonitor - Resource Monitor instance
 */
