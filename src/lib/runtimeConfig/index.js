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

/* eslint-disable no-unused-expressions, no-nested-ternary, prefer-template */
/* eslint-disable no-use-before-define */

const configUtil = require('../utils/config');
const constants = require('../constants');
const miscUtil = require('../utils/misc');
const Service = require('../utils/service');
const Task = require('./task');
const updater = require('./updater');

/**
 * @module runtimeConfig
 *
 * @typedef {import('./updater').AppContext} AppContext
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../utils/config').Configuration} Configuration
 * @typedef {import('./updater').ScriptConfig} ScriptConfig
 */

const EE_NAMESPACE = 'runtimecfg';

/**
 * Runtime Config Class
 */
class RuntimeConfigService extends Service {
    /**
     * Configure and start the service
     *
     * @param {function} onFatalError - function to call on fatal error to restart the service
     */
    async _onStart() {
        this._taskLoop = Promise.resolve();
        this._currentTask = null;
        this._nextTask = null;
    }

    /**
     * Stop the service
     *
     * @param {boolean} [restart] - true if service going to be restarted
     */
    async _onStop() {
        this._taskLoop = null;
        this._nextTask = null;

        try {
            await (this._currentTask && this._currentTask.isRunning() && this._currentTask.stop());
            this._currentTask = null;
        } catch (error) {
            // ignore everything
        }
    }

    /** @returns {Promise<boolean>} resolved with true when service destroyed or if it was destroyed already */
    destroy() {
        this._offConfigUpdates
            && this._offConfigUpdates.off()
            && (this._offConfigUpdates = null);

        return super.destroy()
            .then((ret) => {
                this._offMyEvents
                    && this._offMyEvents.off()
                    && (this._offMyEvents = null);

                return ret;
            });
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        this._offConfigUpdates = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
        this.logger.debug('Subscribed to Configuration updates.');

        this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
            { 'config.applied': 'config.applied' }
        ]);
    }
}

/**
 * @this RuntimeConfigService
 *
 * @param {Configuration} config
 */
async function onConfigEvent(config) {
    const applyConfig = () => {
        /**
         * Configuration is validated, no additional check required
         */
        this.logger.debug('Config "change" event');
        this.logger.info(`Current runtime state: ${JSON.stringify(runtimeState())}`);

        // even empty configuration should be processed - e.g. restore defaults
        const runtimeConfig = configUtil.getTelemetryControls(config).runtime || {};
        const newRuntimeConfig = updater.enrichScriptConfig({}); // initialize with defaults

        if (runtimeConfig.enableGC === true) {
            this.logger.info('Going to try to enable GC (request from user).');
            newRuntimeConfig.gcEnabled = true;
        } // disabled by default

        if (Number.isSafeInteger(runtimeConfig.maxHeapSize)) {
            if (runtimeConfig.maxHeapSize <= constants.APP_THRESHOLDS.MEMORY.DEFAULT_HEAP_SIZE) {
                // - need to remove CLI option from the script if presented - use default value then
                // - can't go lower than default without affecting other apps
                this.logger.info('Going to try to restore the default heap size (request from user).');
            } else {
                // need to add/update CLI option to the script
                this.logger.info(`Going to try to set the heap size to ${runtimeConfig.maxHeapSize} MB (request from user).`);
                newRuntimeConfig.heapSize = runtimeConfig.maxHeapSize;
            }
        } // else use default value

        if (Number.isSafeInteger(runtimeConfig.httpTimeout)) {
            this.logger.info(`Going to try to set the HTTP timeout value to ${runtimeConfig.httpTimeout} seconds (request from user).`);
            newRuntimeConfig.httpTimeout = runtimeConfig.httpTimeout * 1000; // to ms.
        }

        this.logger.info(`New runtime configuration: ${JSON.stringify(newRuntimeConfig)}`);
        this.logger.debug('Scheduling an update to apply the new runtime configuration.');

        addTask.call(this, newRuntimeConfig);
    };

    try {
        applyConfig();
    } catch (error) {
        this.logger.exception('Error caught on attempt to apply configuration to Runtime Config:', error);
    } finally {
        // emit in any case to show we are done with config processing
        this.ee.safeEmitAsync('config.applied');
    }
}

/**
 * @private
 *
 * @this RuntimeConfigService
 *
 * @returns {AppContext}
 */
function makeAppCtx() {
    const log = this.logger;
    return {
        fsUtil: miscUtil.fs,
        logger: {
            debug(msg) { log.debug(msg); },
            error(msg) { log.error(msg); },
            exception(msg, error) { log.debugException(msg, error); },
            info(msg) { log.debug(msg); },
            warning(msg) { log.warning(msg); }
        }
    };
}

/**
 * @private
 *
 * @returns {NodeRuntimeState} current state of the runtime
 */
function runtimeState() {
    return {
        gcEnabled: typeof global.gc !== 'undefined',
        maxHeapSize: miscUtil.getRuntimeInfo().maxHeapSize
    };
}

/**
 * Add config to the task loop
 *
 * @private
 *
 * @this RuntimeConfigService
 *
 * @param {ScriptConfig} config - configuration to apply
 */
function addTask(config) {
    taskLoop.call(this, new Task(config, makeAppCtx.call(this), this.logger.getChild('task')));
}

/**
 * Schedule the update task
 *
 * @private
 *
 * @this RuntimeConfigService
 *
 * @param {Task} task - task to add to the loop
 */
function taskLoop(task) {
    if (!task || this._taskLoop === null) {
        if (task && this._taskLoop === null) {
            this.logger.info('Unable to schedule next task: the service restart requested already.');
        }
        return Promise.resolve();
    }

    // ignore previosuly scheduled task
    this._nextTask = task;

    if (this._currentTask) {
        this.logger.debug('Stopping current task...');
        return this._currentTask.stop()
            .then(() => {}, () => {}); // ignore all errors and etc.
    }

    this._currentTask = task;
    this._nextTask = null;

    this._taskLoop = this._taskLoop.then(() => this._currentTask.run())
        .then(() => this.logger.debug('Update task finished!'))
        .catch((error) => this.logger.exception('Uncaught error on attempt to run "update" task to apply changes to runtime configuration:', error))
        .then(() => {
            if (this._currentTask) {
                if (this._currentTask.isFailed()) {
                    if (this._nextTask === null) {
                        if (this._currentTask.__retry !== true) {
                            this.logger.debug('Retrying attempt to update the startup script!');
                            this._nextTask = this._currentTask.copy();
                            this._nextTask.__retry = true;
                        } else {
                            this.logger.debug('No retries left for the failed task');
                        }
                    }
                } else if (this._currentTask.isRestartRequested()) {
                    this.logger.info('Restart scheduled to apply changes to the runtime configuration');
                    // drop next task
                    this._nextTask = null;
                    this._taskLoop = null;
                }
            }
            this._currentTask = null;
            return taskLoop.call(this, this._nextTask);
        });
    return Promise.resolve();
}

module.exports = RuntimeConfigService;

/**
 * @typedef NodeRuntimeState
 * @type {object}
 * @property {boolean} gcEnabled - true if GC enabled
 * @property {integer} maxHeapSize - max V8 heap size in MB
 */
