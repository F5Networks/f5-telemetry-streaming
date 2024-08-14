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

/* eslint-disable no-cond-assign, no-constant-condition, no-unused-expressions */

const assert = require('../utils/assert');
const Collector = require('./collector');
const constants = require('../constants');
const defaultLogger = require('../logger');
const { getAgent } = require('../utils/http');
const Loader = require('./loader');
const promiseUtils = require('../utils/promise');
const properties = require('./properties');
const Service = require('../utils/service');
const util = require('../utils/misc');
const { withResolvers } = require('../utils/promise');

/**
 * @module systemPoller/poller
 *
 * @typedef {import('./collector').CollectionResults} CollectedStats
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('./index').ManagerProxy} ManagerProxy
 * @typedef {import('../utils/config').SystemPollerComponent} SystemPollerComponent
 */

/** @type {Object<string, FSMState>} */
const STATES = {
    COLLECT: {
        allowTermination: true,
        next: 'SEND_REPORT',
        onRun() {
            return collectStats.call(this);
        },
        onSuccess() {
            this.logger.debug('Successfully collected stats');
            this.storage.stats.statsCollected += 1;
        }
    },
    DONE: {
        next: 'SCHEDULE',
        onRun() {
            this.logger.debug(`Successfully collected and processed stats. Polling Cycle duration - ${getDuration.call(this)} sec.`);
            this.storage.stats.cyclesCompleted += 1;
            return true;
        }
    },
    FAILED: {
        next: 'SCHEDULE',
        async onRun() {
            this.state.endTimestamp = Date.now();

            this.state.errorMsg = `${this.mostRecentError}`;
            this.logger.exception(`System Poller cycle failed due task error after ${getDuration.call(this)} sec.:`, this.mostRecentError);

            try {
                this.callback(this.mostRecentError, this.poller, null);
            } catch (cbError) {
                this.logger.exception('Uncaught error on attempt to call callback:', cbError);
            }

            this.mostRecentError = undefined;

            return true;
        }
    },
    SCHEDULE: {
        allowTermination: true,
        next: 'WAITING',
        onRun() {
            return scheduleNextExecution.call(this);
        },
        onSuccess() {
            this.logger.debug('Successfully scheduled next execution date');
        }
    },
    SEND_REPORT: {
        next: 'DONE',
        async onRun() {
            this.state.endTimestamp = Date.now();

            // send the report and remove reference to it
            sendReport.call(this, this.stats);
            this.stats = null;

            this.state.succeed = true;
            this.storage.stats.statsProcessed += 1;
            this.state.errorMsg = '';

            return true;
        },
        onSuccess() {
            this.logger.debug('Successfully processed stats report');
        }
    },
    WAITING: {
        allowTermination: true,
        next: 'COLLECT',
        onRun() {
            return waitTillExecDate.call(this);
        },
        onSuccess() {
            this.logger.debug('Starting polling cycle');
            this.state.startTimestamp = Date.now();
        }
    }
};

Object.keys(STATES).forEach((key) => {
    STATES[key] = Object.assign(String(key), STATES[key]);
});

/**
 * System Poller Class
 *
 * @property {function} info - current info
 * @property {boolean} onePassOnly - use the schedule provided by the config
 */
class Poller extends Service {
    /**
     * @param {ManagerProxy} manager
     * @param {OnReportCallback} callback
     * @param {object} options
     * @param {Logger} options.logger - parent logger
     * @param {boolean} [options.onePassOnly = false] - try to collect stats only once, scheduling interval ignored
     */
    constructor(manager, callback, {
        logger = undefined,
        onePassOnly = false
    }) {
        assert.exist(manager, 'manager');
        assert.function(callback, 'callback');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');
        assert.boolean(onePassOnly, 'onePassOnly');

        super(logger);

        // create now and override later to allow to call .info()
        let internals = makeInternals.call(this, manager, callback);
        let loopError = false;

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            info: {
                value: () => getInfo.call(internals)
            },
            onePassOnly: {
                value: !!onePassOnly
            }
        });

        // no restarts in demo-mode
        this.restartsEnabled = !this.onePassOnly;

        /** @inheritdoc */
        this._onStart = async (onFatalError) => {
            internals = makeInternals.call(this, manager, callback);
            loopError = false;

            // kick-off main activity loop
            mainLoop.call(internals)
                .catch(async (error) => {
                    // the loop is dead
                    internals.terminatedCb();

                    loopError = true;

                    this.logger.exception('Terminating system poller due uncaught error:', error);

                    if (this.onePassOnly) {
                        await this.destroy();
                    } else {
                        onFatalError(error);
                    }
                });
        };

        /** @inheritdoc */
        this._onStop = async () => {
            // set flag to let the loop know
            internals.terminated = true;

            // interrupt sleep routine
            if (internals.sleepPromise) {
                internals.sleepPromise.cancel(new Error('terminated'));
            }

            if (loopError) {
                // the loop is dead already
                return;
            }
            // wait till terminated
            await internals.stopPromise;
        };
    }
}

/**
 * @this {Internals}
 *
 * @returns {void} once exited
 */
async function mainLoop() {
    initStorageData.call(this);
    initPollingState.call(this);

    while (true) {
        const currentState = this.state.lastKnownState;
        let doTaskError;
        let nextState;

        try {
            assert.function(currentState.onRun, `${currentState}.onRun`);
            assert.string(currentState.next, `${currentState}.next`);
            assert.defined(STATES[currentState.next], 'STATES[currentState.next]');

            const succeed = await currentState.onRun.call(this);
            assert.boolean(succeed, 'onRun<return-value>');

            if (succeed === true) {
                if (typeof currentState.onSuccess === 'function') {
                    await currentState.onSuccess.call(this);
                }

                nextState = STATES[currentState.next];

                this.logger.debug(`Successfully completed "${currentState}" step`);
            } else {
                const msg = `Step "${currentState}" failed!`;
                this.logger.debug(msg);
                throw new Error(msg);
            }
        } catch (error) {
            // error might be related to initialization, not the actual process
            doTaskError = error;
        }

        this.mostRecentError = doTaskError || undefined;

        if (this.mostRecentError) {
            nextState = STATES.FAILED;

            if (currentState === STATES.FAILED) {
                // unable to process error, FAILED.onRun failed
                this.logger.exception(`Uncaught error on attept to process "${nextState}" state:`, this.mostRecentError);
                nextState = STATES.SCHEDULE;
            }
        }

        assert.object(nextState, 'nextState');

        if (nextState === STATES.SCHEDULE) {
            // task done
            const prevExecDate = this.state.execDate;
            addHistoryRecord.call(this);

            if (this.poller.onePassOnly) {
                this.logger.debug('Terminating system poller');
                nextState = currentState;
                this.terminated = true;
                break;
            } else {
                removePollingState.call(this);
                initPollingState.call(this, prevExecDate);
            }
        }

        this.state.lastKnownState = nextState;
        this.logger.debug(`Transitioning from step "${currentState}" to "${nextState}"`);

        if (this.terminated && this.state.lastKnownState.allowTermination === true) {
            break;
        }
    }

    await cleanupSensitiveData.call(this);

    if (this.httpAgent) {
        this.httpAgent.destroy();
        this.httpAgent = undefined;
    }

    this.terminatedCb();
}

/**
 * @this {Internals}
 *
 * @returns {void} once record added
 */
function addHistoryRecord() {
    this.storage.history.push(makeHistoryRecord.call(this));

    if (this.storage.history.length > constants.SYSTEM_POLLER.MAX_HISTORY_LEN) {
        this.storage.history = this.storage.history.slice(
            this.storage.history.length - constants.SYSTEM_POLLER.MAX_HISTORY_LEN
        );
    }
}

/**
 * @this {Internals}
 *
 * @returns {void} once sensitive data removed
 */
async function cleanupSensitiveData() {
    await this.manager.cleanupConfig(this.poller);
}

/**
 * @this {Internals}
 *
 * @returns {boolean} true once stats collected
 */
async function collectStats() {
    this.stats = {
        context: {},
        stats: {}
    };

    const config = await getConfig.call(this, true);
    const statsCollector = await (typeof config.endpoints === 'undefined'
        ? getDefaultStatsCollector
        : getCustomStatsCollector).call(this, config);

    if (statsCollector === null) {
        this.logger.debug('No stats to collect!');
        return true;
    }

    try {
        this.stats.stats = (await waitTillStatsCollected.call(this, statsCollector)).stats;
    } catch (error) {
        error.message = `Poller.collectStats: unable to collect stats: ${error.message}`;
        throw error;
    } finally {
        statsCollector.loader.eraseCache();
    }

    return true;
}

/**
 * @this {Internals}
 *
 * @property {boolean} [decrypt = false]
 *
 * @returns {SystemPollerComponent} once the config
 */
async function getConfig(decrypt = false) {
    return this.manager.getConfig(this.poller, decrypt);
}

/**
 * @this {Internals}
 *
 * @property {SystemPollerComponent} config
 *
 * @returns {Collector | null} instance to collect stats from custom endpoints or null when no stats to collect
 */
async function getCustomStatsCollector(config) {
    this.state.isCustom = true;

    const customProps = properties.custom(config.endpoints, config.dataOpts.actions);
    if (Object.keys(customProps.properties).length === 0) {
        return null;
    }

    const loader = await getLoader.call(this, config);
    loader.setEndpoints(customProps.endpoints);

    return new Collector(
        loader,
        customProps.properties,
        {
            isCustom: true,
            logger: this.logger.getChild('custom'),
            workers: config.workers
        }
    );
}

/**
 * @this {Internals}
 *
 * @property {SystemPollerComponent} config
 *
 * @returns {Collector | null} instance to collect stats from default endpoints or null when no stats to collect
 */
async function getDefaultStatsCollector(config) {
    this.state.isCustom = false;

    const loader = await getLoader.call(this, config);
    const contextProps = properties.context();

    const contextCollector = new Collector(
        loader,
        contextProps.properties,
        {
            isCustom: false,
            logger: this.logger.getChild('context'),
            workers: config.workers
        }
    );
    // should be fast, no need to listen for poller termination
    loader.setEndpoints(contextProps.endpoints);

    try {
        this.stats.context = (await waitTillStatsCollected.call(this, contextCollector)).stats;
    } catch (error) {
        error.message = `Poller.collectContext: unable to collect device context data: ${error.message}`;
        throw error;
    }

    const defaultProps = properties.default({
        contextData: this.stats.context,
        dataActions: config.dataOpts.actions,
        includeTMStats: !config.dataOpts.noTMStats,
        tags: config.dataOpts.tags
    });
    if (Object.keys(defaultProps.properties).length === 0) {
        return null;
    }

    loader.setEndpoints(defaultProps.endpoints);
    return new Collector(
        loader,
        defaultProps.properties,
        {
            isCustom: false,
            logger: this.logger.getChild('stats'),
            workers: config.workers
        }
    );
}

/** @returns {number} number of seconds spent to complete current polling cycle */
function getDuration() {
    if (this.state.endTimestamp && this.state.startTimestamp) {
        return Math.floor((this.state.endTimestamp - this.state.startTimestamp) / 1000);
    }
    return 0;
}

/**
 * @this {Internals}
 *
 * @returns {PollerInfo} poller's current info data
 */
function getInfo() {
    let nextFireDate;
    let prevFireDate;
    let timeTill;

    if (this.state && this.state.execDate) {
        nextFireDate = (new Date(this.state.execDate)).toISOString();
        timeTill = Math.floor(timeUntilNextExecution.call(this) / 1000);
    } else {
        nextFireDate = 'not set';
        timeTill = 'not available';
    }
    if (this.state && this.state.prevExecDate) {
        prevFireDate = (new Date(this.state.prevExecDate)).toISOString();
    } else {
        prevFireDate = 'not set';
    }

    const ret = {
        nextFireDate,
        onePassOnly: this.poller.onePassOnly,
        prevFireDate,
        state: util.deepCopy(this.storage),
        terminated: this.terminated,
        timeUntilNextExecution: timeTill
    };
    if (ret.state && ret.state.state) {
        ret.state.state.lastKnownState = String(ret.state.state.lastKnownState);
    }
    return ret;
}

/**
 * @this {Internals}
 *
 * @returns {Loader} instance that passed auth process
 */
async function getLoader(config) {
    if (typeof this.httpAgent === 'undefined' && Array.isArray(config.httpAgentOpts)) {
        this.logger.debug(`Using HTTP aagent with options: ${JSON.stringify(config.httpAgentOpts)}`);
        this.httpAgent = getAgent(config).agent;
    }

    const loader = new Loader(config.connection.host, {
        agent: this.httpAgent,
        chunkSize: config.chunkSize,
        connection: config.connection,
        credentials: config.credentials,
        logger: this.logger,
        workers: config.workers
    });
    await loader.auth();
    return loader;
}

/**
 * @this {Internals}
 *
 * @returns {void} once polling cycle state initialized
 */
function initPollingState(prevExecDate = null) {
    this.storage.stats.cycles += 1;
    this.storage.state = {
        cycleNo: this.storage.stats.cycles,
        endTimestamp: null,
        execDate: null,
        isCustom: null,
        lastKnownState: STATES.SCHEDULE,
        prevExecDate,
        startTimestamp: null,
        stats: null
    };
    this.state = this.storage.state;
}

/**
 * @this {Internals}
 *
 * @returns {void} once storage data initialized and ready
 */
function initStorageData() {
    this.storage = {
        history: [],
        state: null,
        stats: {
            cycles: 0,
            cyclesCompleted: 0,
            statsCollected: 0,
            statsProcessed: 0
        }
    };
}

/**
 * @this {Internals}
 *
 * @returns {PollingHistory} history record
 */
function makeHistoryRecord() {
    return {
        cycleNo: this.state.cycleNo,
        end: this.state.endTimestamp,
        endISO: (new Date(this.state.endTimestamp)).toISOString(),
        errorMsg: this.state.errorMsg,
        isCustom: this.state.isCustom,
        schedule: this.state.execDate,
        scheduleISO: (new Date(this.state.execDate)).toISOString(),
        state: String(this.state.lastKnownState),
        start: this.state.startTimestamp,
        startISO: (new Date(this.state.startTimestamp)).toISOString()
    };
}

/**
 * @this {Poller}
 *
 * @param {ManagerProxy} manager
 * @param {OnReportCallback} callback
 *
 * @returns {Internals}
 */
function makeInternals(manager, callback) {
    const internals = {};
    const stopPromise = withResolvers();

    /** define static read-only props that should not be overriden */
    Object.defineProperties(internals, {
        callback: {
            value: callback
        },
        logger: {
            value: this.logger
        },
        manager: {
            value: manager
        },
        poller: {
            value: this
        },
        stopPromise: {
            value: stopPromise.promise
        },
        terminatedCb: {
            value: stopPromise.resolve
        }
    });

    Object.assign(internals, {
        httpAgent: undefined,
        sleepPromise: null,
        state: null,
        stats: null,
        storage: null,
        terminated: false
    });

    return internals;
}

/**
 * @this {Internals}
 *
 * @returns {void} once polling state removed
 */
function removePollingState() {
    this.state = null;
    this.storage.state = null;
}

/**
 * @this {Internals}
 *
 *
 * @returns {boolean} true once scheduled
 */
async function scheduleNextExecution() {
    if (this.poller.onePassOnly === true) {
        this.state.pollingInterval = 0;
    } else {
        const config = await getConfig.call(this);
        this.state.pollingInterval = config.interval;
    }

    const prevExecDate = this.state.prevExecDate ? new Date(this.state.prevExecDate) : new Date();
    this.state.execDate = (new Date(prevExecDate.getTime() + this.state.pollingInterval * 1000)).getTime();

    this.logger.debug(`Next polling cycle starts on ${(new Date(this.state.execDate)).toISOString()} (in ${Math.floor(timeUntilNextExecution.call(this) / 1000)} s.)`);

    return true;
}

/**
 * @this {Internals}
 *
 * @property {CollectionResults} stats
 *
 * @returns {void} once report send to the manager
 */
function sendReport(stats) {
    this.callback(null, this.poller, {
        stats: stats.stats,
        metadata: {
            cycleStart: this.state.startTimestamp,
            cycleEnd: this.state.endTimestamp,
            deviceContext: stats.context,
            isCustom: this.state.isCustom,
            pollingInterval: this.state.pollingInterval
        }
    });
}

/**
 * @this {Internals}
 *
 * @param {number} sleepTime - number of ms. to sleep
 *
 * @returns {boolean} true when the sleep routine succeed and was not interrupted
 */
async function sleep(sleepTime) {
    if (sleepTime > constants.SYSTEM_POLLER.SECRETS_TIMEOUT) {
        await cleanupSensitiveData.call(this);
    }
    if (this.terminated) {
        return false;
    }
    let success = true;
    if (sleepTime <= 0) {
        return success;
    }

    assert.safeNumber(sleepTime, 'sleepTime');
    this.sleepPromise = util.sleep(sleepTime);

    try {
        await this.sleepPromise;
    } catch (sleepError) {
        success = false;
        this.logger.debug(`Sleep routine interrupted: ${sleepError.message}`);
    } finally {
        this.sleepPromise = null;
    }

    return success;
}

/**
 * @this {Internals}
 *
 * @returns {nunmber} number of milliseconds left till next scheduled execution
 */
function timeUntilNextExecution() {
    return this.state.execDate - Date.now();
}

/**
 * @this {Internals}
 *
 * @returns {boolean} true when the waiting routine succeed and was not interrupted
 */
async function waitTillExecDate() {
    let success = true;

    while (success) {
        const sleepTime = Math.min(
            timeUntilNextExecution.call(this),
            constants.SYSTEM_POLLER.SLEEP_INTERVAL
        );
        if (sleepTime <= 0) {
            break;
        }
        success = await sleep.call(this, sleepTime);
    }
    return !this.terminated && success;
}

/**
 * @this {Internals}
 *
 * @param {Collector} collector - data collector
 *
 * @returns {CollectedStats} collected data
 */
async function waitTillStatsCollected(collector) {
    const results = promiseUtils.getValues(await promiseUtils.allSettled([
        collector.collect(),
        (async () => {
            while (collector.isActive()) {
                await sleep.call(this, 100);
                if (this.terminated) {
                    break;
                }
            }
            await collector.stop();
            if (this.terminated) {
                const msg = 'Stats collection routine terminated!';
                this.logger.debug(msg);
                throw new Error(msg);
            }
        })()
    ]))[0];
    if (results.errors.length > 0) {
        throw results.errors[0];
    }
    return results;
}

module.exports = Poller;

/**
 * @typedef {object} CollectionResults
 * @property {object} context - collected context data
 * @property {object} stats - collected stats
 */
/**
 * @typedef {String} FSMState
 * @property {boolean} [allowTermination] - allow the state be terminated
 * @property {string} next - next state on success
 * @property {function(): RetryOptions} [onFailure] - function to run on failure
 * @property {function(): boolean} onRun - function to run, should return true when succeed
 * @property {function} [onSuccess] - function to run on success
 */
/**
 * @typedef {object} Internals
 * @property {OnReportCallback} callback - callback to call once report collected or fatal error caught
 * @property {object} [httpAgent] - HTTP Agent instance
 * @property {Logger} logger - logger
 * @property {ManagerProxy} manager - proxy manager
 * @property {Poller} poller - Poller instance
 * @property {null | Promise} sleepPromise - sleep promise object or null
 * @property {PollingState} state - current polling state, ref. to `StorageState.state`
 * @property {CollectionResults} stats - stats for current polling cycle
 * @property {Promise} stopPromise - stop promise, resolved once main polling loop stopped
 * @property {StorageState} storage - storage data
 * @property {boolean} terminated - true if instance was terminated
 * @property {function} terminatedCb - function to call once loop terminated (upon request)
 */
/**
 * @callback OnReportCallback
 * @param {Error | null} error - fatal error if caught
 * @param {Poller} poller - poller
 * @param {StatsReport | null} report - collected report
 */
/**
 * @typedef {object} PollerInfo
 * @property {string} nextFireDate
 * @property {boolean} onePassOnly
 * @property {string} prevFireDate
 * @property {StorageState} state
 * @property {boolean} terminated
 * @property {number} timeUntilNextExecution
 */
/**
 * @typedef {object} PollingHistory
 * @property {number} cycleNo - cycle number
 * @property {number} end - end date timestamp
 * @property {string} endISO - end date in ISO format
 * @property {string} errorMsg - when state is FAILED
 * @property {boolean} isCustom - `true` when custom endpoints were used to collect stats
 * @property {number} schedule - origin exec date
 * @property {number} scheduleISO - origin exec date in ISO format
 * @property {string} state - state
 * @property {number} start - start date timestamp
 * @property {string} startISO - start date in ISO format
 */
/**
 * @typedef {object} PollingState
 * @property {number} cycleNo - iteration number
 * @property {number} endTimestamp - timestamp of when polling cycle finished
 * @property {string} errorMsg - error message if poll cycle failed
 * @property {number} execDate - execution date
 * @property {boolean} isCustom - `true` when custom endpoints were used to collect stats
 * @property {string} lastKnownState - state set before data was saved
 * @property {number} pollingInterval - polling interval
 * @property {number} prevExecDate - previous execution date
 * @property {number} startTimestamp - timestamp of when polling cycle started
 * @property {CollectionResults} stats - collected starts
 * @property {boolean} succeed - whether or not poll cycle completed successfully
 */
/**
 * @typedef {object} PollingStats
 * @property {number} cycles - number of polling cycles
 * @property {number} cyclesCompleted - number of polling cycles
 * @property {number} statsCollected - number of cycles when COLLECT succeed
 * @property {number} statsProcessed - number of cycles when SEND_REPORT succeed
 */
/**
 * @typedef {object} StatsReport
 * @property {object} metadata - metadata
 * @property {number} metadata.cycleStart - polling cycle start timestamp
 * @property {number} metadata.cycleEnd - polling cycle end timestamp
 * @property {object} metadata.deviceContext - device's context stats/data
 * @property {boolean} metadata.isCustom - data produced by fetching data from custom endpoints
 * @property {number} metadata.pollingInterval - polling interval
 */
/**
 * @typedef {object} StorageState
 * @property {PollingHistory[]} history - last 20 polling cycles history
 * @property {PollingState} state - data related to current polling cycle
 * @property {PollingStats} stats - System Poller stats
 */
