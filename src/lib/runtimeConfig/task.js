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

const getKey = require('lodash/get');
const isEqual = require('lodash/isEqual');
const machina = require('machina');
const pathUtil = require('path');
const uuid = require('uuid').v4;

const constants = require('../constants');
const dacli = require('../utils/dacli');
const deviceUtil = require('../utils/device');
const logger = require('../logger').getChild('runtimeConfig').getChild('Task');
const miscUtil = require('../utils/misc');
const SafeEventEmitter = require('../utils/eventEmitter');
const updater = require('./updater');

/**
 * @private
 *
 * @module runtimeConfig/task
 *
 * @typedef {import('./updater').AppContext} AppContext
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('./updater').ScriptConfig} ScriptConfig
 */

const DACLI_SCRIPT_NAME = 'telemetry_delete_me__async_restnoded_updater';
const UPDATER_SCRIPT = pathUtil.join(__dirname, 'updater.js');

/**
 * FSM State Transitions
 *
 * Initial state: uninitialized
 *
 * uninitialized          ----> cleanup
 * cleanup                ----> config-pre-check || stopped
 * config-pre-check       ----> shell-check || done || stopped
 * shell-check            ----> updater-run || done || stopped
 * updater-run            ----> config-post-check || stopped || failed
 * config-post-check      ----> restart-service-delay || stopped || failed
 * restart-service-delay  ----> restart-service || stopped
 * restart-service        ----> restart-service-force || done || stopped
 * restart-service-force  ----> done || stopped
 */

/**
 * @private
 *
 * @param {string} cmd - command to execute
 *
 * @returns {boolean} true if command succeed or false otherwise
 */
async function runRemoteCmd(cmd) {
    try {
        await dacli(cmd, { scriptName: DACLI_SCRIPT_NAME });
    } catch (err) {
        return false;
    }
    return true;
}

const taskFsm = new machina.BehavioralFsm({
    namespace: 'updater-fsm',
    initialState: 'uninitialized',

    states: {
        cleanup: {
            _onEnter(task) {
                updater.cleanupLogsFile(task.appCtx);
                this._doTransition(task, 'config-pre-check');
            }
        },
        'config-post-check': {
            _onEnter(task) {
                const config = task.runtimeConfig;
                const scriptConfig = updater.fetchConfigFromScript(task.appCtx);

                // if we are here then shell command succeed already
                let configApplied = true;
                if (scriptConfig === null) {
                    task.logger.error('Unable to read configuration from the startup script.');
                } else {
                    configApplied = isEqual(config, scriptConfig);
                }
                if (!configApplied) {
                    task.logger.error('Configuration was not applied to the script!');
                }
                this._doTransition(task, configApplied ? 'restart-service-delay' : 'failed');
            }
        },
        'config-pre-check': {
            _onEnter(task) {
                const config = task.runtimeConfig;
                const scriptConfig = updater.fetchConfigFromScript(task.appCtx);
                let hasChanges = false;

                if (scriptConfig === null) {
                    task.logger.error('Unable to read configuration from the startup script.');
                } else {
                    // remove before comparison
                    delete scriptConfig.id;
                    delete config.id;

                    hasChanges = !isEqual(config, scriptConfig);

                    if (!hasChanges) {
                        task.logger.debug('No changes found between running configuration and the new one.');
                    }
                }

                if (hasChanges) {
                    config.id = uuid();
                    hasChanges = updater.saveScriptConfigFile(config, task.appCtx);
                }
                this._doTransition(task, hasChanges ? 'shell-check' : 'done');
            }
        },
        done: {
            _onEnter(task) {
                task.logger.error('Task done!');
                task.ee.emit('done');
            }
        },
        failed: {
            _onEnter(task) {
                task.logger.error('Task failed!');
                task.ee.emit('failed');
            }
        },
        'restart-service-force': {
            _onEnter(task) {
                task._restartRequested = true;
                task.logger.warning('Unable to restart service gracefully! Calling process.exit(0) to restart it');
                this._doTransition(task, 'done');
                process.exit(0);
            }
        },
        'restart-service': {
            async _onEnter(task) {
                task.logger.warning('Restarting service to apply new changes for the runtime configuraiton!');
                const success = await runRemoteCmd('bigstart restart restnoded');

                if (success) {
                    task.logger.warning('Service will be restarted in a moment to apply changes in the configuration!');
                    task._restartRequested = true;
                } else {
                    task.logger.error('Unable to restart service via bigstart. Calling process.exit(0) instead to restart it');
                }
                this._doTransition(task, success ? 'done' : 'restart-service-force');
            }
        },
        'restart-service-delay': {
            async _onEnter(task) {
                task.logger.warning('New configuration was successfully applied to the startup script! Scheduling service restart in 1 min.');
                await miscUtil.sleep(60 * 1000);
                this._doTransition(task, 'restart-service');
            }
        },
        'shell-check': {
            async _onEnter(task) {
                let enabled = false;
                try {
                    enabled = await deviceUtil.isShellEnabled(constants.LOCAL_HOST);
                } catch (err) {
                    task.logger.exception('Error on attempt to check shell status:', err);
                }

                if (enabled) {
                    task.logger.debug('Shell available, proceeding with task execution.');
                } else {
                    task.logger.debug('Shell not available, unable to proceed with task execution.');
                }
                this._doTransition(task, enabled ? 'updater-run' : 'done');
            }
        },
        stopped: {
            _onEnter(task) {
                task.logger.error('Task stopped!');
                task.ee.emit('stopped');
            }
        },
        uninitialized: {
            '*': function (task) {
                this._doTransition(task, 'cleanup');
            }
        },
        'updater-run': {
            async _onEnter(task) {
                task.logger.debug('Trying to execute "updater" script');
                const success = await runRemoteCmd(`${process.argv[0]} ${UPDATER_SCRIPT}`);

                let logs = updater.readLogsFile(task.appCtx);
                if (logs === null) {
                    logs = 'no logs available!';
                }
                task.logger.debug(`Device Async CLI logs:\n${logs}`);

                if (!success) {
                    task.logger.error('Attempt to update the runtime configuration failed! See logs for more details.');
                }
                this._doTransition(task, 'config-post-check');
            }
        }
    },

    /**
     * @private
     *
     * @param {Task} task
     *
     * @returns {boolean} true if task allowed to start
     */
    _allowedToStart(task) {
        return this.getState(task) === 'uninitialized';
    },

    /**
     * @private
     *
     * @param {Task} task
     *
     * @returns {boolean} true if task allowed to stop
     */
    _allowedToStop(task) {
        const state = this.getState(task);
        return state !== 'done' && state !== 'failed' && state !== 'stopped';
    },

    /**
     * Do transition if not stopped yet
     *
     * @private
     *
     * @param {Task} task
     * @param {string} state
     */
    _doTransition(task, state) {
        this.transition(task, task._stopRequested ? 'stopped' : state);
    },

    /**
     * @private
     *
     * @param {Task} task
     * @param {string} action
     * @param {string | string[]} successEvents
     * @param {string | string[]} failureEvents
     *
     * @returns {Promise<boolean>} resolved with `true` if action succeed or rejected with error
     */
    _promisifyActionHandle(task, action, successEvents, failureEvents) {
        return new Promise((resolve, reject) => {
            successEvents = Array.isArray(successEvents) ? successEvents : [successEvents];
            failureEvents = Array.isArray(failureEvents) ? failureEvents : [failureEvents];

            const cancel = () => {
                successEvents.forEach((p) => p.cancel());
                failureEvents.forEach((p) => p.cancel());
            };

            successEvents = successEvents.map((evtName) => {
                const promise = task.ee.waitFor(evtName);
                promise.then((args) => {
                    resolve(args.length === 0 || args);
                    cancel();
                })
                    .catch(() => {});
                return promise;
            });
            failureEvents = failureEvents.map((evtName) => {
                const promise = task.ee.waitFor(evtName);
                promise.then((args) => {
                    reject(args.length === 0 ? new Error(`Task emitted event "${evtName}"`) : args[0]);
                    cancel();
                })
                    .catch(() => {});
                return promise;
            });

            this.handle.apply(this, [task, action].concat(Array.from(arguments).slice(4)));
        });
    },

    /**
     * @public
     *
     * @param {Task} task
     *
     * @returns {string} current state
     */
    getState(task) {
        return getKey(task, ['__machina__', this.namespace, 'state']) || 'uninitialized';
    },

    /**
     * @public
     *
     * @param {Task} task
     *
     * @returns {boolean} true if task failed to complete execution
     */
    isFailed(task) {
        return this.getState(task) === 'failed';
    },

    /**
     * @public
     *
     * @param {Task} task
     *
     * @returns {boolean} true if task is running
     */
    isRunning(task) {
        return !this._allowedToStart(task) && this._allowedToStop(task);
    },

    /**
     * @public
     *
     * @param {Task} task
     *
     * @returns {Promise<boolean>} resolve with `true` if task started and successfully finished
     */
    run(task) {
        return this._allowedToStart(task)
            ? this._promisifyActionHandle(task, 'start', 'done', ['failed', 'stopped'])
            : Promise.resolve(false);
    },

    /**
     * @public
     *
     * @param {Task} task
     *
     * @returns {Promise<boolean>} resolve with `true` if task stopped or `false` if stop not allowed
     */
    stop(task) {
        return this._allowedToStop(task)
            ? this._promisifyActionHandle(task, 'stop', ['done', 'stopped'], 'failed')
            : Promise.resolve(false);
    }

});

// resend events to appropriate instances of Task
taskFsm.on('transition', (data) => data.client.ee.emitAsync('transition', data));

/**
 * Task Class
 *
 * Note: event emitter `ee` fires folllowing events:
 * - transition(data) - state transition
 *
 * @property {SafeEventEmitter} ee - event emitter
 * @property {Logger} logger - logger
 */
class Task {
    /**
     * @param {ScriptConfig} config
     * @param {AppContext} appCtx
     * @param {Logger} [logger] - logger instance
     */
    constructor(config, appCtx, _logger) {
        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            ee: {
                value: new SafeEventEmitter()
            }
        });

        this._restartRequested = false;
        this._stopRequested = false;
        this.appCtx = appCtx;
        this.logger = _logger || logger;
        this.runtimeConfig = config;

        this.ee.logger = this.logger.getChild('ee');
        this.ee.on('transition', (data) => this.logger.debug(`transition from "${data.fromState}" to "${data.toState}" (action=${data.action})`));
    }

    /** @returns {Task} copy (state not copied) */
    copy() {
        return new Task(this.runtimeConfig, this.appCtx, this.logger);
    }

    /** @returns {boolean} true if task failed to complete execution */
    isFailed() {
        return taskFsm.isFailed(this);
    }

    /** @returns {boolean} true if service restart was requested as result of task execution */
    isRestartRequested() {
        return this._restartRequested;
    }

    /** @returns {boolean} true if task is running */
    isRunning() {
        return taskFsm.isRunning(this);
    }

    /** @returns {Promise<boolean>} resolve with `true` if task started and successfully finished */
    run() {
        return taskFsm.run(this);
    }

    /** @returns {Promise<boolean>} resolve with `true` if task stopped or `false` if stop not allowed */
    stop() {
        this._stopRequested = true;
        return taskFsm.stop(this);
    }
}

module.exports = Task;
