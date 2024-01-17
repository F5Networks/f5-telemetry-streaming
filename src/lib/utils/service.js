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

/* eslint-disable no-multi-assign */

'use strict';

const getKey = require('lodash/get');
const machina = require('machina');

const hrtimestamp = require('./datetime').hrtimestamp;
const logger = require('../logger').getChild('service');
const SafeEventEmitter = require('./eventEmitter');

/** @module utils/service */

/**
 * Service FSM State Transitions
 *
 * Initial state: stopped
 *                 +--> starting
 * stopped --------|
 *                 +--> restarting
 *                 +--> stopping
 * starting -------|
 *                 +--> running
 *                 +--> restarting
 * running --------|
 *                 +--> stopping
 *                 +--> running
 * retarting ------|
 *                 +--> stopping
 * stopping ----------> stopped
 *
 * `stopped` allowed to `start` or `restart`
 * `running` allowed to `stop`  or `restart`
 * `restarting` allowed to `stop`
 *
 * all states are able to transit to `destroyed` state
 */

const serviceFsm = new machina.BehavioralFsm({
    namespace: 'service-fsm',
    initialState: 'stopped',

    states: {
        destroyed: {
            _onEnter(service) {
                service.logger.debug('destroyed.');
                service.ee.emitAsync('destroyed');
            }
        },
        restarting: {
            _onEnter(service, options) {
                let currentAttempt = 0;

                options = options || service.getRestartOptions() || {};
                const attempts = options.attempts || Infinity;
                const delay = options.delay || 0;

                const inner = () => {
                    currentAttempt += 1;
                    const attemptsStr = `(attempt #${currentAttempt} of ${attempts})`;
                    service.logger.debug(`restarting... ${attemptsStr}`);

                    Promise.resolve()
                        .then(() => {
                            if (!service._stopRequested) {
                                return Promise.resolve()
                                    .then(() => {
                                        service.logger.debug(`stopping... ${attemptsStr}`);
                                        return service._onStop(true);
                                    })
                                    .catch((error) => service.logger.debugException(`caught error on attempt to stop ${attemptsStr}:`, error));
                            }
                            return null;
                        })
                        .then(() => new Promise((resolve) => {
                            if (!service._stopRequested) {
                                service.logger.debug(`starting... ${attemptsStr}`);
                                service._fatalErrorHandler = this._createFatalErroFn((fatalError) => {
                                    resolve(fatalError);
                                    resolve = null;
                                });
                                Promise.resolve()
                                    .then(() => service._onStart(service._fatalErrorHandler.onError))
                                    .then(
                                        () => resolve && resolve(),
                                        (err) => resolve && resolve(err)
                                    );
                            } else {
                                resolve();
                            }
                        }))
                        .catch((error) => error)
                        .then((error) => {
                            if (service._fatalErrorHandler && !error) {
                                error = service._fatalErrorHandler.error();
                            }
                            if (!error && service._stopRequested) {
                                error = new Error('Service stop requested!');
                            }
                            if (error) {
                                service._fatalErrorHandler.cancel();
                                service.logger.debugException(`failed to start due error ${attemptsStr}:`, error);
                            }

                            if (service._stopRequested || (error && currentAttempt >= attempts)) {
                                error.$restartFailed = true;
                                this.transition(service, 'stopping', error);
                            } else if (error) {
                                setTimeout(inner, delay || 0);
                            } else {
                                this.transition(service, 'running');
                            }
                        })
                        .catch((error) => {
                            service.logger.debugException('caught uncaught error on attempt to restart', error);
                            this.transition(service, 'stopping', error);
                        });
                };
                setImmediate(inner);
            },
            _onExit(service) {
                service._stopRequested = undefined;
            },
            destroy(service) {
                service.logger.debug(`termination requested [state=${this.getState(service)}]`);
                this.deferUntilTransition(service);
                this.handle(service, 'stop');
            },
            stop(service) {
                service.logger.debug(`stop requested [state=${this.getState(service)}]`);
                service._stopRequested = true;
            }
        },
        running: {
            _onEnter(service) {
                service.ee.emitAsync('running');
            },
            _onExit(service) {
                service._fatalErrorHandler.cancel();
            },
            destroy(service) {
                service.logger.debug(`termination requested [state=${this.getState(service)}]`);
                this.deferUntilTransition(service);
                this.handle(service, 'stop');
            },
            fatalError(service, error) {
                if (service.restartsEnabled) {
                    this.handle(service, 'restart', null, error);
                } else {
                    service.logger.debug(`restarts on fatal error are prohibited [state=${this.getState(service)}]`);
                    this.handle(service, 'stop', error);
                }
            },
            restart(service, options, error) {
                if (error) {
                    // make it visible because it is uncaught error
                    service.logger.exception(`restart requested due error [state=${this.getState(service)}]:`, error);
                } else {
                    service.logger.debug(`restart requested [state=${this.getState(service)}]`);
                }
                this.transition(service, 'restarting', options);
            },
            stop(service, error) {
                service.logger.debug(`stop requested [state=${this.getState(service)}]`);
                this.transition(service, 'stopping', error);
            }
        },
        starting: {
            _onEnter(service) {
                // unique ID to prevent situations when the service entered `starting`
                // state while the prev `starting` promise not resolved yet (e.g. fatalError occured)
                const startID = service._startTimestamp = hrtimestamp();
                Promise.resolve()
                    .then(() => {
                        service._fatalErrorHandler = this._createFatalErroFn(
                            (fatalError) => this.handle(service, 'fatalError', fatalError)
                        );
                        return service._onStart(service._fatalErrorHandler.onError);
                    })
                    .then(
                        // call handler here to avoid unnecessary transition
                        // in case `fatalError` happened before promise was resolved
                        // and FSM transitiong to next state already
                        () => this.handle(service, 'startingDone', startID),
                        (err) => this.handle(service, 'startingFailed', err, startID)
                    );
            },
            _onExit(service) {
                service._startTimestamp = undefined;
            },
            destroy(service) {
                service.logger.debug(`termination requested [state=${this.getState(service)}]`);
                this.deferUntilTransition(service);
                this.handle(service, 'stop');
            },
            fatalError(service, error) {
                // at that time the Promise in _onEnter still might be not resolved/rejected yet
                // unique names for handlers `starting*` helps to avoid unnecessary transitions
                // once the promise resolved, rejected
                this.handle(service, 'startingFailed', error);
            },
            startingDone(service, startID) {
                if (startID === service._startTimestamp) {
                    this.transition(service, 'running');
                } else {
                    service.logger.debug('ignoring successfull start that happened out of order');
                }
            },
            startingFailed(service, error, startID) {
                if (!startID || startID === service._startTimestamp) {
                    service._fatalErrorHandler.cancel();
                    service.logger.debug(`failed to start due error [state=${this.getState(service)}]`);
                    this.transition(service, 'stopping', error);
                } else {
                    service.logger.debugException('ignoring failed start that happened out of order due error:', error);
                }
            },
            stop(service) {
                service._fatalErrorHandler.cancel();
                service.logger.debug(`stop requested [state=${this.getState(service)}]`);
                this.transition(service, 'stopping');
            }
        },
        stopped: {
            _onEnter(service, error) {
                if (this.getPriorState(service) !== 'stopped') {
                    if (error) {
                        service.logger.debugException(`stopped due error [state=${this.getState(service)}]:`, error);
                        service.ee.emitAsync('failed', error);
                    } else {
                        service.ee.emitAsync('stopped');
                    }
                }
            },
            destroy(service) {
                service.logger.debug(`termination requested [state=${this.getState(service)}]`);
                this.transition(service, 'destroyed');
            },
            restart(service, options) {
                service.logger.debug(`restart requested [state=${this.getState(service)}]`);
                this.transition(service, 'restarting', options);
            },
            start(service) {
                service.logger.debug(`start requested [state=${this.getState(service)}]`);
                this.transition(service, 'starting');
            }
        },
        stopping: {
            _onEnter(service, error) {
                Promise.resolve()
                    .then(() => service._onStop(false))
                    .then(
                        () => this.transition(service, 'stopped', error),
                        (stopError) => this.transition(service, 'stopped', stopError)
                    );
            },
            destroy(service) {
                service.logger.debug(`termination requested [state=${this.getState(service)}]`);
                this.deferUntilTransition(service);
            }
        }
    },

    /**
     * @param {string} stateName
     * @param {string} handlerName
     *
     * @returns {boolean} true if state has handler with `handlerName` name
     */
    _stateHasHandler(stateName, handlerName) {
        return typeof this.states[stateName][handlerName] === 'function';
    },

    /**
     * @param {Service} service
     *
     * @return {boolean} true if current state allows restart service
     */
    _allowedToRestart(service) {
        return this._stateHasHandler(this.getState(service), 'restart');
    },

    /**
     * @param {Service} service
     *
     * @return {boolean} true if current state allows start service
     */
    _allowedToStart(service) {
        return this._stateHasHandler(this.getState(service), 'start');
    },

    /**
     * @param {Service} service
     *
     * @return {boolean} true if current state allows stop service
     */
    _allowedToStop(service) {
        return this._stateHasHandler(this.getState(service), 'stop');
    },

    /**
     * @param {function(error)} cb - optional callback to call on error
     *
     * @returns {{cancel: () => void, error: () => Error | null, onError: (Error) => void}}
     */
    _createFatalErroFn(cb) {
        let error = null;
        return {
            cancel() {
                error = true;
            },
            error() {
                return error === true ? null : error;
            },
            onError: (fatalError) => {
                if (!error) {
                    // active and no errors registered yet
                    error = fatalError;
                    // allow to swtich to another state if in process
                    setImmediate(() => {
                        if (error !== true) {
                            cb(fatalError);
                        }
                    });
                }
            }
        };
    },

    /**
     * @param {Service} service
     * @param {string} action
     * @param {string | string[]} successEvents
     * @param {string | string[]} failureEvents
     *
     * @returns {Promise<boolean>} resolved with `true` if action succeed or rejected with error
     */
    _promisifyActionHandle(service, action, successEvents, failureEvents) {
        return new Promise((resolve, reject) => {
            successEvents = Array.isArray(successEvents) ? successEvents : [successEvents];
            failureEvents = Array.isArray(failureEvents) ? failureEvents : [failureEvents];

            const cancel = () => {
                successEvents.forEach((p) => p.cancel());
                failureEvents.forEach((p) => p.cancel());
            };

            successEvents = successEvents.map((evtName) => {
                const promise = service.ee.waitFor(evtName);
                promise.then((args) => {
                    resolve(args.length === 0 || args);
                    cancel();
                })
                    .catch(() => {});
                return promise;
            });
            failureEvents = failureEvents.map((evtName) => {
                const promise = service.ee.waitFor(evtName);
                promise.then((args) => {
                    reject(args.length === 0 ? new Error(`Service emitted event "${evtName}"`) : args[0]);
                    cancel();
                })
                    .catch(() => {});
                return promise;
            });

            this.handle.apply(this, [service, action].concat(Array.from(arguments).slice(4)));
        });
    },

    /**
     * @param {Service} service
     *
     * @returns {Promise<boolean>} resolved with true when service destroyed or false if destroyed already
     */
    destroy(service) {
        return this.isDestroyed(service)
            ? Promise.resolve(false)
            : this._promisifyActionHandle(service, 'destroy', 'destroyed', ['failed', 'running', 'stopped'])
                .catch((error) => (this.isDestroyed(service) ? true : Promise.reject(error)));
    },

    /**
     * @param {Service} service
     *
     * @returns {string} prior state
     */
    getPriorState(service) {
        return getKey(service, ['__machina__', this.namespace, 'priorState']) || 'stopped';
    },

    /**
     * @param {Service} service
     *
     * @returns {string} current state
     */
    getState(service) {
        return getKey(service, ['__machina__', this.namespace, 'state']) || 'stopped';
    },

    /**
     * @param {Service} service
     *
     * @returns {boolean} true if service is destroyed
     */
    isDestroyed(service) {
        return this.getState(service) === 'destroyed';
    },

    /**
     * @param {Service} service
     *
     * @returns {boolean} true if service is restarting
     */
    isRestarting(service) {
        return this.getState(service) === 'restarting';
    },

    /**
     * @param {Service} service
     *
     * @returns {boolean} true if service is running
     */
    isRunning(service) {
        return this.getState(service) === 'running';
    },

    /**
     * @param {Service} service
     *
     * @returns {boolean} true if service is fully stopped
     */
    isStopped(service) {
        return this.getState(service) === 'stopped';
    },

    /**
     * @param {Service} service
     * @param {RestartOptions} [options = {}] - options
     * @param {integer} [options.attempts = 1] - number of attempts to try
     * @param {number} [options.delay = 0] - delay before each attempt (in ms.)} service
     *
     * @returns {Promise<boolean>} resolve with `true` if service restarted or `false` if restart not allowed
     */
    restart(service, options) {
        options = options || {};
        const retryOpts = {
            attempts: (Number.isSafeInteger(options.attempts) && Math.abs(options.attempts)) || 1,
            delay: (Number.isSafeInteger(options.delay) && Math.abs(options.delay)) || 0
        };

        return this._allowedToRestart(service)
            ? this._promisifyActionHandle(service, 'restart', 'running', ['destroyed', 'failed', 'stopped'], retryOpts)
            : Promise.resolve(false);
    },

    /**
     * @param {Service} service
     * @returns {Promise<boolean>} resolve with `true` if service started or `false` if start not allowed
     */
    start(service) {
        return this._allowedToStart(service)
            ? this._promisifyActionHandle(service, 'start', 'running', ['destroyed', 'failed', 'stopped'])
            : Promise.resolve(false);
    },

    /**
     * @param {Service} service
     * @returns {Promise<boolean>} resolve with `true` if service stopped or `false` if stop not allowed
     */
    stop(service) {
        return this._allowedToStop(service)
            ? this._promisifyActionHandle(service, 'stop', 'stopped', ['destroyed', 'failed', 'running'])
                .catch((error) => (error.$restartFailed ? true : Promise.reject(error)))
            : Promise.resolve(false);
    }
});

// resend events to appropriate instances of Service
serviceFsm.on('transition', (data) => data.client.ee.emitAsync('transition', data));

/**
 * Service Class
 *
 * Note: event emitter `ee` fires folllowing events:
 * - destroyed() - service completely destroyed
 * - failed(error) - service stopped with `error`
 * - running() - service is running
 * - transition(data) - state transition
 * - stopped() - service stopped
 *
 * @property {SafeEventEmitter} ee - event emitter
 * @property {logger.Logger} logger - logger
 * @property {boolean} restartsEnabled - true if restarts on fatal error at `running` state are enabled
 */
class Service {
    /**
     * @param {logger.Logger} [logger] - logger instance
     */
    constructor(_logger) {
        // create read-only properties
        Object.defineProperties(this, {
            ee: {
                value: new SafeEventEmitter()
            }
        });

        this.logger = _logger || logger;
        this.restartsEnabled = true;
        this.ee.on('transition', (data) => this.logger.debug(`transition from "${data.fromState}" to "${data.toState}" (action=${data.action})`));

        this._fatalErrorHandler = undefined;
        this._startTimestamp = undefined;
        this._stopRequested = undefined;
    }

    /** @returns {Promise<boolean>} resolved with true when service destroyed or if it was destroyed already */
    destroy() {
        return serviceFsm.destroy(this);
    }

    /** @returns {RestartOptions} restart options */
    getRestartOptions() {
        return {
            attempts: this.isRestarting() ? Infinity : 1,
            delay: 100
        };
    }

    /** @returns {boolean} true if service is destroyed */
    isDestroyed() {
        return serviceFsm.isDestroyed(this);
    }

    /** @returns {boolean} true if service is restarting */
    isRestarting() {
        return serviceFsm.isRestarting(this);
    }

    /** @returns {boolean} true if service is running */
    isRunning() {
        return serviceFsm.isRunning(this);
    }

    /** @returns {boolean} true if service is fully stopped */
    isStopped() {
        return serviceFsm.isStopped(this);
    }

    /**
     * @param {RestartOptions} [options] - restart options
     *
     * @returns {Promise<boolean>} resolve with `true` if service restarted or `false` if restart not allowed
     */
    restart(options) {
        return serviceFsm.restart(this, options || this.getRestartOptions());
    }

    /** @returns {Promise<boolean>} resolve with `true` if service started or `false` if started not allowed */
    start() {
        return serviceFsm.start(this);
    }

    /** @returns {Promise<boolean>} resolve with `true` if service stopped or `false` if stop not allowed */
    stop() {
        return serviceFsm.stop(this);
    }

    /**
     * Configure and start the service (should be overriden by child class)
     *
     * @param {function} onFatalError - function to call on fatal error to restart the service
     */
    _onStart() {
        this.logger.debug('running...');
    }

    /**
     * Stop the service (should be overriden by child class)
     *
     * @param {boolean} [restart] - true if service going to be restarted
     */
    _onStop() {
        this.logger.debug('stopping...');
    }
}

module.exports = Service;

/**
 * @typedef RestartOptions
 * @type {object}
 * @property {integer} attempts - number of attempts to try to start service until stopping with failure, >= 1
 * @property {integer} delay - number of ms. to delay before next attempt, >= 0
 */
