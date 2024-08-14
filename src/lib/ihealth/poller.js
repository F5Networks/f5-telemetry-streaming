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
const constants = require('../constants');
const datetimeUtil = require('../utils/datetime');
const defaultLogger = require('../logger');
const DeviceAPI = require('./api/device');
const IHealthAPI = require('./api/ihealth');
const QkviewAPI = require('./api/qkview');
const Service = require('../utils/service');
const util = require('../utils/misc');
const { withResolvers } = require('../utils/promise');

/**
 * @module ihealth/poller
 *
 * @typedef {import('./manager').ManagerProxy} ManagerProxy
 * @typedef {import('../utils/config').IHealthPollerCompontent} IHealthPollerCompontent
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('./api/ihealth').Report} Report
 */

/** @type {Object<string, FSMState>} */
const STATES = {
    DONE: {
        next: 'SCHEDULE',
        onRun() {
            this.state.succeed = true;
            this.storage.stats.cyclesCompleted += 1;
            this.state.errorMsg = '';
            return true;
        }
    },
    FAILED: {
        next: 'SCHEDULE',
        async onRun() {
            this.state.endTimestamp = Date.now();

            // remove qkview file if not done yet
            await removeQkview.call(this);

            this.state.errorMsg = `${this.mostRecentError}`;
            this.logger.exception('iHealth Poller cycle failed due task error:', this.mostRecentError);

            this.mostRecentError = undefined;

            return true;
        }
    },
    PAST_DUE: {
        next: 'FAILED',
        onRun() {
            throw new Error('Polling execution date expired!');
        }
    },
    QKVIEW_GEN: {
        next: 'QKVIEW_UPLOAD',
        onFailure() {
            this.state.retries.qkviewCollect += 1;
            this.storage.stats.qkviewCollectRetries += 1;
            return makeRetryConfig.call(
                this,
                this.state.retries.qkviewCollect,
                constants.IHEALTH.POLLER_CONF.QKVIEW_COLLECT
            );
        },
        onRun() {
            return collectQkview.call(this);
        },
        onSuccess() {
            this.logger.debug('Successfully generated and collected Qkview file');
            this.storage.stats.qkviewsCollected += 1;
        }
    },
    QKVIEW_REPORT: {
        next: 'SEND_REPORT',
        onFailure() {
            this.state.retries.reportCollect += 1;
            this.storage.stats.reportCollectRetries += 1;
            return makeRetryConfig.call(
                this,
                this.state.retries.reportCollect,
                constants.IHEALTH.POLLER_CONF.QKVIEW_REPORT
            );
        },
        onRun() {
            return collectReport.call(this);
        },
        onSuccess() {
            this.logger.debug('Successfully obtained Qkview report');
            this.storage.stats.reportsCollected += 1;
        }
    },
    QKVIEW_UPLOAD: {
        next: 'QKVIEW_REPORT',
        onFailure() {
            this.state.retries.qkviewUpload += 1;
            this.storage.stats.qkviewUploadRetries += 1;
            return makeRetryConfig.call(
                this,
                this.state.retries.qkviewUpload,
                constants.IHEALTH.POLLER_CONF.QKVIEW_UPLOAD
            );
        },
        onRun() {
            return uploadQkview.call(this);
        },
        onSuccess() {
            this.logger.debug('Successfully uploaded Qkview file');
            this.storage.stats.qkviewsUploaded += 1;
        }
    },
    SCHEDULE: {
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

            // remove qkview file if not done yet
            await removeQkview.call(this);

            // send the report and remove reference to it
            sendReport.call(this, this.state.qkview.report);
            delete this.state.qkview.report;

            return true;
        },
        onSuccess() {
            this.logger.debug('Successfully processed Qkview report');
        }
    },
    TERMINATED: {
        next: 'FAILED',
        onRun() {
            throw new Error('Terminated!');
        }
    },
    WAITING: {
        next: 'QKVIEW_GEN',
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

const STORAGE_VER = '3.0';

/**
 * iHealth Poller Class
 *
 * @property {function} info - current info
 * @property {boolean} isDemo
 */
class Poller extends Service {
    /**
     * @param {ManagerProxy} manager
     * @param {object} options
     * @param {Logger} options.logger - parent logger
     * @param {boolean} [options.demo = false] - 'demo' mode (no scheduling)
     */
    constructor(manager, {
        demo = false,
        logger = undefined
    }) {
        assert.exist(manager, 'manager');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');
        assert.boolean(demo, 'demo');

        super(logger);

        // create now and override later to allow to call .info()
        let internals = makeInternals.call(this, manager);
        let loopError = false;

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            info: {
                value: () => getInfo.call(internals)
            },
            isDemo: {
                value: !!demo
            }
        });

        // no restarts in demo-mode
        this.restartsEnabled = !this.isDemo;

        /** @inheritdoc */
        this._onStart = async (onFatalError) => {
            internals = makeInternals.call(this, manager);
            loopError = false;

            // kick-off main activity loop
            mainLoop.call(internals)
                .catch(async (error) => {
                    // the loop is dead
                    internals.terminatedCb();

                    loopError = true;

                    if (this.isDemo) {
                        this.logger.exception('Terminating DEMO poller due uncaught error:', error);
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
    await initStorageData.call(this);
    restoreState.call(this);
    initPollingState.call(this);

    while (true) {
        const currentState = this.terminated
            ? STATES.TERMINATED
            : this.state.lastKnownState;

        if (currentState === STATES.TERMINATED) {
            this.logger.debug(`Transitioning from step "${this.state.lastKnownState}" to "${currentState}"`);
        }

        let delayBefore = 0;
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
                nextState = currentState;

                let retry;

                if (typeof currentState.onFailure === 'function') {
                    retry = await currentState.onFailure.call(this);
                } else {
                    retry = makeRetryConfig.call(1, { DELAY: 0, MAX_RETRIES: 1 });
                }

                const msg = `Step "${currentState}" failed! Re-try allowed = ${retry.allowed}. Re-try attemps left ${retry.left} / ${retry.attempt + retry.left}.`;
                this.logger.debug(msg);

                if (retry.allowed) {
                    delayBefore = retry.delay;
                } else {
                    throw new Error(msg);
                }
            }
        } catch (error) {
            // error might be related to initialization, not the actual process
            doTaskError = error;
        }

        this.mostRecentError = doTaskError || undefined;

        if (this.mostRecentError) {
            nextState = STATES.FAILED;

            if (currentState === nextState) {
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

            if (!this.poller.isDemo) {
                removePollingState.call(this);
                initPollingState.call(this, prevExecDate);
            } else {
                this.logger.debug('Terminating DEMO poller');
                nextState = currentState;
                this.terminated = true;
            }
        }

        if (currentState !== nextState) {
            this.state.lastKnownState = nextState;
            this.logger.debug(`Transitioning from step "${currentState}" to "${nextState}"`);
        }

        await saveState.call(this);

        if (this.terminated) {
            break;
        }

        // sleep before next step if needed
        await sleep.call(this, delayBefore);
    }

    await cleanupSensitiveData.call(this);
    this.terminatedCb();
}

/**
 * @this {Internals}
 *
 * @returns {void} once record added
 */
function addHistoryRecord() {
    this.storage.history.push(makeHistoryRecord.call(this));

    if (this.storage.history.length > constants.IHEALTH.MAX_HISTORY_LEN) {
        this.storage.history = this.storage.history.slice(
            this.storage.history.length - constants.IHEALTH.MAX_HISTORY_LEN
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
 * @returns {boolean} true when the qkview file successfully obtained
 */
async function collectQkview() {
    const mgr = await qkviewManager.call(this);
    let success = true;

    try {
        this.state.qkview.qkviewFile = await mgr.generateQkview();
    } catch (qkviewError) {
        success = false;

        this.state.errorMsg = `Unable to obtain qkview file: ${qkviewError.message || qkviewError}`;
        this.logger.exception('Unable to obtain qkview file:', qkviewError);
    }

    return success;
}

/**
 * @this {Internals}
 *
 * @returns {boolean} true when the qkview report successfully obtained
 */
async function collectReport() {
    const mgr = await ihealthManager.call(this);
    let success = true;

    try {
        this.state.qkview.report = await mgr.fetchQkviewDiagnostics(this.state.qkview.qkviewURI);
        success = this.state.qkview.report.status.done;
    } catch (qkviewError) {
        success = false;

        this.state.errorMsg = `Unable to obtain qkview report: ${qkviewError.message || qkviewError}`;
        this.logger.exception('Unable to obtain qkview report:', qkviewError);
    }
    if (success && this.state.qkview.report.status.error) {
        // qkview processing failed on F5 iHealth Service server, non-recoverable state
        throw new Error(`F5 iHealth Service Error: ${this.state.qkview.report.status.errorMessage}`);
    }
    return success;
}

/**
 * @this {Internals}
 *
 * @property {boolean} [decrypt = false]
 *
 * @returns {IHealthPollerCompontent} once the config
 */
async function getConfig(decrypt = false) {
    return this.manager.getConfig(this.poller, decrypt);
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
        demoMode: this.poller.isDemo,
        nextFireDate,
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
 * @returns {IHealthAPI} instance
 */
async function ihealthManager() {
    const config = await getConfig.call(this, true);

    // no copies of config needed, it should be copied by the instance upon creation
    return new IHealthAPI(
        config.iHealth.credentials,
        {
            logger: this.logger.getChild(config.iHealth.name),
            proxy: config.iHealth.proxy
        }
    );
}

/**
 * @this {Internals}
 *
 * @returns {void} once polling cycle state initialized
 */
function initPollingState(prevExecDate = null) {
    if (!this.storage.state) {
        this.storage.stats.cycles += 1;
        this.storage.state = {
            cycleNo: this.storage.stats.cycles,
            endTimestamp: null,
            execDate: null,
            lastKnownState: STATES.SCHEDULE,
            prevExecDate,
            qkview: {},
            retries: {
                qkviewCollect: 0,
                qkviewUpload: 0,
                reportCollect: 0
            },
            startTimestamp: null
        };
    }
    this.state = this.storage.state;
}

/**
 * @this {Internals}
 *
 * @returns {void} once storage data initialized and ready
 */
async function initStorageData() {
    let storage = await this.manager.getStorage(this.poller);

    if (!(typeof storage === 'object' && storage !== null && storage.version === STORAGE_VER)) {
        this.logger.debug('Creating a new storage struct');
        // ignore prev versions, no migration
        storage = {
            history: [],
            state: null,
            stats: {
                cycles: 0,
                cyclesCompleted: 0,
                qkviewsCollected: 0,
                qkviewCollectRetries: 0,
                qkviewsUploaded: 0,
                qkviewUploadRetries: 0,
                reportsCollected: 0,
                reportCollectRetries: 0
            },
            version: STORAGE_VER
        };
    }
    this.storage = storage;
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
 *
 * @returns {Internals}
 */
function makeInternals(manager) {
    const internals = {};
    const stopPromise = withResolvers();

    /** define static read-only props that should not be overriden */
    Object.defineProperties(internals, {
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
        sleepPromise: null,
        state: null,
        storage: null,
        terminated: false
    });

    return internals;
}

/**
 * @this {Poller}
 *
 * @param {number} attempt - current attempt no.
 * @param {object} options - options
 * @param {number} options.DELAY - retry delay
 * @param {number} optiosn.MAX_RETRIES - max number of attempts to retry
 *
 * @returns {RetryOptions} retry options
 */
function makeRetryConfig(attempt, { DELAY = 0, MAX_RETRIES = 1 } = {}) {
    const conf = {
        attempt,
        delay: DELAY,
        left: MAX_RETRIES - attempt
    };
    conf.allowed = conf.left > 0;

    assert.safeNumberGrEq(conf.left, 0, 'retry.left');
    return conf;
}

/**
 * @this {Internals}
 *
 * @returns {QkviewAPI} instance
 */
async function qkviewManager() {
    const config = await getConfig.call(this, true);

    const localDeviceOptions = {
        logger: this.logger.getChild('self')
    };
    let remoteDevice;
    let sameDevice = false;

    if (config.system.connection.host === constants.LOCAL_HOST) {
        sameDevice = true;
        localDeviceOptions.connection = config.system.connection;
        localDeviceOptions.credentials = config.system.credentials;
    }

    // no copies of config needed, it should be copied by the instance upon creation
    const localDevice = new DeviceAPI(constants.LOCAL_HOST, localDeviceOptions);
    if (sameDevice) {
        remoteDevice = localDevice;
    } else {
        // no copies of config needed, it should be copied by the instance upon creation
        remoteDevice = new DeviceAPI(config.system.connection.host, {
            connection: config.system.connection,
            credentials: config.system.credentials,
            logger: this.logger.getChild(config.system.name)
        });
    }

    return new QkviewAPI(localDevice, remoteDevice, {
        downloadFolder: config.iHealth.downloadFolder
    });
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
 * @returns {void} once the qkview file removed
 */
async function removeQkview() {
    if (!this.state.qkview.qkviewFile) {
        return;
    }

    const mgr = await qkviewManager.call(this);

    try {
        await mgr.removeLocalFile(this.state.qkview.qkviewFile);
    } catch (qkviewError) {
        this.logger.exception('Unable to remove qkview file:', qkviewError);
    }

    delete this.state.qkview.qkviewFile;
}

/**
 * @this {Internals}
 *
 * @returns {void} once the state restored
 */
function restoreState() {
    const state = this.storage.state;
    if (typeof state === 'object' && state !== null) {
        assert.defined(STATES[state.lastKnownState], 'STATES[state.lastKnownState]');
        state.lastKnownState = STATES[state.lastKnownState];

        if (state.lastKnownState === STATES.WAITING) {
            // need to check if it is too late or not
            const timeTill = state.execDate - Date.now();
            if (timeTill < 0 && Math.abs(timeTill) > constants.IHEALTH.POLLER_CONF.SCHEDULING.MAX_PAST_DUE) {
                this.logger.debug(`Next execution is past due - ${timeTill} ms`);
                state.lastKnownState = STATES.PAST_DUE;
            }
        }
        this.logger.debug(`Restoring poller to the state "${state.lastKnownState}". Cycle #${state.cycleNo}`);
    }
}

/**
 * @this {Internals}
 *
 * @returns {void} once the state saved
 */
async function saveState() {
    this.storage.state = this.state;

    const copy = util.deepCopy(this.storage);
    if (copy.state) {
        // removes all state relaed attributes
        copy.state.lastKnownState = String(copy.state.lastKnownState);
    }

    await this.manager.saveStorage(this.poller, copy);
}

/**
 * @this {Internals}
 *
 *
 * @returns {boolean} true once scheduled
 */
async function scheduleNextExecution() {
    if (this.poller.isDemo) {
        this.state.execDate = Date.now();
    } else {
        const config = await getConfig.call(this);
        const prevExecDate = this.state.prevExecDate ? new Date(this.state.prevExecDate) : null;

        const nextExecDate = datetimeUtil.getNextFireDate(
            config.iHealth.interval,
            prevExecDate,
            prevExecDate === null
        );

        this.state.execDate = nextExecDate.getTime();
    }
    this.logger.debug(`Next polling cycle starts on ${(new Date(this.state.execDate)).toISOString()} (in ${Math.floor(timeUntilNextExecution.call(this) / 1000)} s.)`);

    return true;
}

/**
 * @this {Internals}
 *
 * @property {Report} report
 *
 * @returns {void} once report send to the manager
 */
function sendReport(report) {
    report.metadata = {
        cycleStart: this.state.startTimestamp,
        cycleEnd: this.state.endTimestamp,
        qkviewURI: this.state.qkview.qkviewURI
    };
    assert.ihealth.diagnosticsReport(report, 'report');
    this.manager.qkviewReport(this.poller, report);
}

/**
 * @this {Internals}
 *
 * @param {number} sleepTime - number of ms. to sleep
 *
 * @returns {boolean} true when the sleep routine succeed and was not interrupted
 */
async function sleep(sleepTime) {
    if (sleepTime > constants.IHEALTH.SECRETS_TIMEOUT) {
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
 * @returns {boolean} true when the qkview file successfully uploaded
 */
async function uploadQkview() {
    const mgr = await ihealthManager.call(this);
    let success = true;

    try {
        this.state.qkview.qkviewURI = await mgr.uploadQkview(this.state.qkview.qkviewFile);
    } catch (qkviewError) {
        success = false;

        this.state.errorMsg = `Unable to upload qkview file: ${qkviewError.message || qkviewError}`;
        this.logger.exception('Unable to upload qkview file:', qkviewError);
    }

    success && (await removeQkview.call(this));
    return success;
}

/**
 * @this {Internals}
 *
 * @returns {boolean} true when the waiting routine succeed and was not interrupted
 */
async function waitTillExecDate() {
    let success = true;

    const ttu = timeUntilNextExecution.call(this);
    if (ttu > 0) {
        this.logger.verbose(`Going to sleep for ${ttu / 1000}sec.`);
    }

    while (success) {
        const sleepTime = Math.min(
            timeUntilNextExecution.call(this),
            constants.IHEALTH.SLEEP_INTERVAL
        );
        if (sleepTime <= 0) {
            break;
        }
        success = await sleep.call(this, sleepTime);
    }
    return !this.terminated && success;
}

module.exports = Poller;

/**
 * @typedef {String} FSMState
 * @property {string} next - next state on success
 * @property {function(): RetryOptions} [onFailure] - function to run on failure
 * @property {function(): boolean} onRun - function to run, should return true when succeed
 * @property {function} [onSuccess] - function to run on success
 */
/**
 * @typedef {object} Internals
 * @property {Logger} logger - logger
 * @property {ManagerProxy} manager - proxy manager
 * @property {Poller} poller - Poller instance
 * @property {null | Promise} sleepPromise - sleep promise object or null
 * @property {PollingState} state - current polling state, ref. to `StorageState.state`
 * @property {Promise} stopPromise - stop promise, resolved once main polling loop stopped
 * @property {StorageState} storage - storage data
 * @property {boolean} terminated - true if instance was terminated
 * @property {function} terminatedCb - function to call once loop terminated (upon request)
 */
/**
 * @typedef {object} PollerInfo
 * @property {boolean} demoMode
 * @property {string} nextFireDate
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
 * @property {string} lastKnownState - state set before data was saved
 * @property {number} prevExecDate - previous execution date
 * @property {object} qkview - Qkview related data
 * @property {string} qkview.qkviewFile - file path to Qkview obtained from BIG-IP
 * @property {string} qkview.qkviewURI - Qkview URI returned from F5 iHealth Service
 * @property {Report} qkview.report - Qkview report returned from F5 iHealth Service
 * @property {boolean} qkview.reportProcessed - whether or not Qkview report was processed
 * @property {object} retries - iHealth Poller retries info for current polling cycle
 * @property {number} retries.qkviewCollect - number of attempts made to obtain Qkview file
 * @property {number} retries.qkviewUpload - number of attempts made to upload Qkview file
 * @property {number} retries.reportCollect - number of attempts made to obtain Qkview report
 * @property {number} startTimestamp - timestamp of when polling cycle started
 * @property {boolean} succeed - whether or not poll cycle completed successfully
 */
/**
 * @typedef {object} PollingStats
 * @property {number} cycles - number of polling cycles
 * @property {number} cyclesCompleted - number of completed cycles
 * @property {number} qkviewsCollected - number of Qkview files successfully collected
 * @property {number} qkviewCollectRetries - number of attempts made to obtain Qkview file
 * @property {number} qkviewsUploaded - number of Qkview files successfully uploaded
 * @property {number} qkviewUploadRetries - number of attempts made to upload Qkview file
 * @property {number} reportsCollected - number of Qkview reports successfully received
 * @property {number} reportCollectRetries - number of attempts made to obtain Qkview report
 */
/**
 * @typedef {Report} QkviewReport
 * @property {object} metadata
 * @property {number} cycleStart - polling cycle start timestamp
 * @property {number} cycleEnd - polling cycle end timestamp
 */
/**
 * @typedef {object} RetryOptions
 * @property {boolean} allowed - is retry allowed or not
 * @property {number} attempt - current attempt no.
 * @property {number} delay - delay before next attempt
 * @property {number} left - attempts left
 */
/**
 * @typedef {object} StorageState
 * @property {PollingHistory[]} history - last 20 polling cycles history
 * @property {PollingState} state - data related to current polling cycle
 * @property {PollingStats} stats - iHealth Poller stats
 * @property {string} version - data's format version, latest is 3.0
 */
