/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const constants = require('./constants.js');
const datetimeUtil = require('./datetimeUtil.js');
const util = require('./util.js');
const deviceUtil = require('./deviceUtil.js');
const ihUtil = require('./ihealthUtil.js');
const persistentStorage = require('./persistentStorage.js').persistentStorage;
const configWorker = require('./config.js');

const SYSTEM_CLASS_NAME = constants.SYSTEM_CLASS_NAME;
const IHEALTH_POLLER_CLASS_NAME = constants.IHEALTH_POLLER_CLASS_NAME;
const PERSISTENT_STORAGE_KEY = 'ihealth';

const IHEALTH_POLL_MAX_TIMEOUT = 60 * 60 * 1000; // 1 h.
const IHEALTH_POLL_RETRY_DELAY = 2 * 60 * 1000; // 2 min.
const IHEALTH_UPLOAD_RETRY_DELAY = 2 * 60 * 1000; // 2 min.
const IHEALTH_QKVIEW_RETRY_DELAY = 2 * 60 * 1000; // 2 min.

const TASK_MAX_RETRY = 5;
const TASK_PROCESS_DELAY = 1 * 1000; // 1 sec.
const TASK_QUEUE_CHECK_DELAY = 5 * 60 * 1000; // 5 min.


/** @module iHealthPoller */

/**
 * Silent catch
 *
 * @async
 * @private
 * @param {Error} error - error
 *
 * @returns {Promise} Promise resolved in any case
 */
function silentCatch(err) {
    logger.debug(`silentCatch: ${err}`);
    return Promise.resolve();
}

/**
 * Check is qkview valid or not
 *
 * @private
 *
 * @param {Object}  qkview                    - qkview object
 * @param {Boolean} qkview.downloaded        - is qkview downloaded to the local device or not
 * @param {Boolean} qkview.md5verified       - is qkview's md5sum the same as original file
 * @param {Boolean} qkview.remoteOriginPath  - path to qkview on the remote device
 *
 * @returns {Boolean} if qkview is valid
 */
function isQkviewValid(qkview) {
    let valid = false;
    if (!util.isObjectEmpty(qkview) && qkview.downloaded) {
        valid = qkview.md5verified;
    }
    return valid;
}

/**
 * Filter callback
 *
 * @callback IHealthPoller~dataCallback
 * @param {Object} data - iHealth data
 * @param {Object} othe - othe info
 */

/**
 * iHealth poller
 *
 * @class
 *
 * @param {String}  sysName      - System declaration name
 * @param {String}  [ihName]     - iHealth Poller declaration name
 * @param {Boolean} [testOnly]   - 'true' to test pipieline only
 *
 * @property {String}  sysName   - System declaration name
 * @property {String}  ihName    - iHealth Poller declaration name
 * @property {Object}  config    - config
 * @property {String}  state     - current state
 * @property {IHealthPoller~dataCallback} dataCallback - data callback
 */
function IHealthPoller(sysName, ihName, testOnly) {
    this.sysName = sysName;
    this.ihName = ihName;
    this.config = null;
    this.dataCallback = null;

    this._isTestOnly = testOnly === undefined ? false : testOnly;
    this._timerID = null;
    this._inProgress = false;
    this._storage = this._getBaseStorage();

    this.logger = logger.getChild('iHealthPoller').getChild(this.getKey());
}

/**
 * IHealthPoller state
 *
 * @private
 */
IHealthPoller.STATE = {
    /** @private */
    NEW: 'NEW',
    /** @private */
    DISABLED: 'DISABLED',
    /** @private */
    REMOVED: 'REMOVED',
    /** @private */
    QUEUED: 'QUEUED',
    /** @private */
    PREPARE: 'PREPARE',
    /** @private */
    READY: 'READY',
    /** @private */
    FAILED: 'FAILED',
    /** @private */
    DONE: 'DONE',
    /** @private */
    QKVIEW_IN_PROGRESS: 'QKVIEW_IN_PROGRESS',
    /** @private */
    QKVIEW_RETRY: 'QKVIEW_RETRY',
    /** @private */
    QKVIEW_COLLECTED: 'QKVIEW_COLLECTED',
    /** @private */
    IHEALTH_UPLOAD_IN_PROGRESS: 'IHEALTH_UPLOAD_IN_PROGRESS',
    /** @private */
    IHEALTH_UPLOAD_RETRY: 'IHEALTH_UPLOAD_RETRY',
    /** @private */
    IHEALTH_UPLOADED: 'IHEALTH_UPLOADED',
    /** @private */
    IHEALTH_POLL_IN_PROGRESS: 'IHEALTH_POLL_IN_PROGRESS',
    /** @private */
    IHEALTH_POLL_RETRY: 'IHEALTH_POLL_RETRY',
    /** @private */
    IHEALTH_POLL_DONE: 'IHEALTH_POLL_DONE'
};

/**
 * Get base storage object
 *
 * @private
 * @returns {Object} base storage object
 */
IHealthPoller.prototype._getBaseStorage = function () {
    return {
        sysName: this.sysName,
        ihName: this.ihName,
        state: IHealthPoller.STATE.NEW,
        nextExecTime: 0,
        qkviewRetry: 0,
        ihealthUploadRetry: 0,
        ihealthPollStart: 0
    };
};

/**
 * Fetch instance state from storage
 *
 * @async
 * @private
 * @returns {Promise.<Object>} Promise resolved with instance state
 */
IHealthPoller.prototype._getStorageState = function () {
    if (this.isTestOnly() || this.isDisabled()) {
        return Promise.resolve();
    }
    return IHealthPoller.getStorage()
        .then((storage) => {
            storage = storage || {};
            this._storage = storage[this.getKey()];

            let p;
            if (util.isObjectEmpty(this._storage)) {
                this._storage = this._getBaseStorage();
                p = this._saveStorageState();
            }
            return p || Promise.resolve();
        });
};

/**
 * Save current state to storage
 *
 * @async
 * @private
 * @returns {Promise} Promise resolved when state saved to storage
 */
IHealthPoller.prototype._saveStorageState = function () {
    if (this.isTestOnly() || this.isDisabled()) {
        return Promise.resolve();
    }
    return IHealthPoller.getStorage()
        .then((storage) => {
            // do not update state when disabled!
            if (this.isDisabled()) {
                return Promise.resolve();
            }
            storage[this.getKey()] = this._storage;
            return IHealthPoller.updateStorage(storage);
        })
        .catch((err) => {
            this.logger.debug(`saveStorageState: unable to update storage: ${err}`);
        });
};

/**
 * Get instance key
 *
 * @returns {String} instance key
 */
IHealthPoller.prototype.getKey = function () {
    return IHealthPoller.getKey(this.sysName, this.ihName, this.isTestOnly());
};

/**
 * Return current state
 *
 * @returns {String} current state
 */
IHealthPoller.prototype.getState = function () {
    return this._storage.state;
};

/**
 * Return next fire date
 *
 * @returns {Date} next fire date
 */
IHealthPoller.prototype.getNextFireDate = function () {
    const nextExecTime = this._storage.nextExecTime;
    return nextExecTime ? new Date(nextExecTime) : null;
};

/**
 * Set new state
 *
 * @param {String} newState - new state
 * @param {Boolean} [force] - force the state
 */
IHealthPoller.prototype.setState = function (newState, force) {
    if (newState !== this._storage.state && (force || !this.isDisabled())) {
        this.logger.debug(`State changed from ${this._storage.state} to ${newState}`);
        this._storage.state = newState;
    }
};

/**
 * Check if instance in process of task execution
 *
 * @returns {Boolean} 'true' when instnance is busy now
 */
IHealthPoller.prototype.inProgress = function () {
    return this._inProgress;
};

/**
 * Check is it instance for testing only
 *
 * @returns {Boolean} 'true' when instance for tests only
 */
IHealthPoller.prototype.isTestOnly = function () {
    return this._isTestOnly;
};

/**
 * Check if state is equal to given
 *
 * @param {String} state - state to compare
 */
IHealthPoller.prototype.isStateEq = function (state) {
    return this._storage.state === state;
};

/**
 * Check if instance disabled or not
 *
 * @returns {Boolean} 'true' if instance disabled else 'false'
 */
IHealthPoller.prototype.isDisabled = function () {
    return this.isStateEq(IHealthPoller.STATE.DISABLED) || this.isRemoved();
};

/**
 * Check if instance removed or not
 *
 * @returns {Boolean} 'true' if instance removed else 'false'
 */
IHealthPoller.prototype.isRemoved = function () {
    return this.isStateEq(IHealthPoller.STATE.REMOVED);
};

/**
 * Check if task done or not
 *
 * @returns {Boolean} 'true' if task don else 'false'
 */
IHealthPoller.prototype.isDone = function () {
    return this.isStateEq(IHealthPoller.STATE.DONE);
};

/**
 * Check if task failed or not
 *
 * @returns {Boolean} 'true' if task failed else 'false'
 */
IHealthPoller.prototype.isFailed = function () {
    return this.isStateEq(IHealthPoller.STATE.FAILED);
};

/**
 * Check if task queued or not
 *
 * @returns {Boolean} 'true' if task queued else 'false'
 */
IHealthPoller.prototype.isQueued = function () {
    return this.isStateEq(IHealthPoller.STATE.QUEUED);
};

/**
 * Check if task can be scheduled or not
 *
 * @returns {Boolean} 'true' if task can be scheduled else 'false'
 */
IHealthPoller.prototype.canBeScheduled = function () {
    return !this.isRemoved() && (this.isStateEq(IHealthPoller.STATE.NEW)
        || this.isDone()
        || this.isFailed());
};

/**
 * Check if task should be fired or not
 *
 * @returns {Boolean} 'true' if task should be fired else 'false'
 */
IHealthPoller.prototype.shouldBeFired = function () {
    return this.timeBeforeFire() <= TASK_QUEUE_CHECK_DELAY;
};

/**
 * Check if config available
 *
 * @returns {Boolean} 'true' if config available else 'false'
 */
IHealthPoller.prototype.isConfigsAvailable = function () {
    return !util.isObjectEmpty(this.config);
};

/**
 * Return time before next fire
 *
 * @returns {Integer} time in ms. before next task firing
 */
IHealthPoller.prototype.timeBeforeFire = function () {
    return this._storage.nextExecTime - (new Date()).getTime();
};

/**
 * Fetch System and iHealth configs
 *
 * @async
 * @returns {Promise} Promise resolved when System and iHealth config are decrypted.
 *     It doesn't guarantee that config exists at all.
 */
IHealthPoller.prototype.fetchConfigs = function () {
    if (this.config) {
        return Promise.resolve();
    }

    return configWorker.getConfig()
        .then((config) => {
            config = config.parsed || {};
            const searchRet = IHealthPoller.getConfig(config, this.sysName, this.ihName);
            const system = searchRet[0];
            const ihPoller = searchRet[1];

            if (util.isObjectEmpty(system) || util.isObjectEmpty(ihPoller)) {
                return Promise.reject(new Error('System or iHealth Poller declaration not found'));
            }

            return Promise.all([
                deviceUtil.decryptAllSecrets(system),
                deviceUtil.decryptAllSecrets(ihPoller)
            ]);
        })
        .then((configs) => {
            this.config = IHealthPoller.mergeConfigs(configs[0], configs[1]);
        })
        .catch((err) => {
            throw new Error(`fetchConfigs: ${err}`);
        });
};

/**
 * Return delay to schedule next iteration depending on current state
 *
 * @returns {Integer} delay in ms.
 */
IHealthPoller.prototype.getProcessDelay = function () {
    if (this.isStateEq(IHealthPoller.STATE.QKVIEW_RETRY)) {
        return IHEALTH_QKVIEW_RETRY_DELAY;
    }
    if (this.isStateEq(IHealthPoller.STATE.IHEALTH_UPLOAD_RETRY)) {
        return IHEALTH_UPLOAD_RETRY_DELAY;
    }
    if (this.isStateEq(IHealthPoller.STATE.IHEALTH_POLL_RETRY)) {
        return IHEALTH_POLL_RETRY_DELAY;
    }
    if (this.isQueued()) {
        const beforeFire = this.timeBeforeFire();
        return beforeFire < TASK_QUEUE_CHECK_DELAY ? beforeFire : TASK_QUEUE_CHECK_DELAY;
    }
    if (this.isDisabled()) {
        return 1000; // 1 sec.
    }
    return TASK_PROCESS_DELAY;
};

/**
 * QkviewManager factory
 *
 * @returns {module:ihealthUtil~QkviewManager} instance of QkviewManager
 */
IHealthPoller.prototype.getQkviewManager = function () {
    const system = this.config.system;
    const iHealth = this.config.iHealth;
    const options = {
        deviceName: this.sysName,
        dacliUID: this.getKey(),
        credentials: util.deepCopy(system.credentials),
        connection: util.deepCopy(system.connection),
        shouldDownload: true,
        downloadFolder: iHealth.downloadFolder
    };

    const qkviewManager = new ihUtil.QkviewManager(system.host, options);
    if (!util.isObjectEmpty(this._storage.qkview)) {
        qkviewManager.qkview = this._storage.qkview;
    }
    return qkviewManager;
};

/**
 * IHealthManager factory
 *
 * @returns {module:ihealthUtil~IHealthManager} instance of IHealthManager
 */
IHealthPoller.prototype.getIHealthManager = function () {
    const qkview = this._storage.qkview || {};
    const iHealth = this.config.iHealth;
    const options = {
        deviceName: this.sysName,
        dacliUID: this.getKey(),
        qkviewFile: qkview.localDownloadPath,
        qkviewURI: qkview.ihealthURI,
        proxy: util.deepCopy(iHealth.proxy),
        ihealth: {
            credentials: util.deepCopy(iHealth.credentials)
        }
    };
    return new ihUtil.IHealthManagerLocal(options);
};

/**
 * Gather Qkview from the F5 device
 *
 * @async
 * @returns {Promise} Promise resolved when Qkview created and downloaded (optional)
 */
IHealthPoller.prototype.gatherQkview = function () {
    let error;
    delete this._storage.qkview;

    this.setState(IHealthPoller.STATE.QKVIEW_IN_PROGRESS);

    const qm = this.getQkviewManager();
    return qm.prepare()
        .then(() => {
            // when device is remote tnen qkview should be
            // downloaded to local machine
            if (!(qm.isLocalDevice || qm.shouldDownload)) {
                this.setState(IHealthPoller.STATE.FAILED);
                return Promise.reject(new Error('downloadFolder should be '
                    + 'configured to support remote devices'));
            }
            return Promise.resolve();
        })
        .then(() => qm.process())
        .catch((err) => {
            error = err;
        })
        .then(() => {
            if (error && !isQkviewValid(qm.qkview)) {
                this.logger.debug(`gatherQkview: Unable to collect Qkview: ${error}`);
                return qm.cleanup().catch(silentCatch);
            }
            this._storage.qkview = util.deepCopy(qm.qkview);
            return Promise.resolve();
        })
        .then(() => {
            let p;

            if (!util.isObjectEmpty(this._storage.qkview)) {
                this.setState(IHealthPoller.STATE.QKVIEW_COLLECTED);
            } else if (this._storage.qkviewRetry < TASK_MAX_RETRY) {
                this.setState(IHealthPoller.STATE.QKVIEW_RETRY);
                this._storage.qkviewRetry += 1;
            } else {
                this.setState(IHealthPoller.STATE.FAILED);
                p = Promise.reject(new Error('gatherQkview: Unable to collect Qkview '
                    + `after ${TASK_MAX_RETRY} attempts`));
            }
            return p || Promise.resolve();
        });
};

/**
 * Upload Qkview file to F5 iHealth Service
 *
 * @async
 * @returns {Promise} Promise resolved when Qkview uploaded
 */
IHealthPoller.prototype.uploadQkview = function () {
    let error;
    let p;

    this.setState(IHealthPoller.STATE.IHEALTH_UPLOAD_IN_PROGRESS);

    const im = this.getIHealthManager();
    if (!im.qkviewFile) {
        this.setState(IHealthPoller.STATE.FAILED);
        const errMsg = 'uploadQkview: no path to Qkview file provided';
        this.logger.error(errMsg);
        return Promise.reject(new Error(errMsg));
    }

    return im.prepare()
        .then(() => im.uploadQkview())
        .then((location) => {
            this._storage.qkview.ihealthURI = location;
            this.setState(IHealthPoller.STATE.IHEALTH_UPLOADED);
        })
        .catch((err) => {
            error = err;
            this.logger.debug('uploadQkview: Unable to upload Qkview to '
                + `F5 iHealth service: ${error}`);

            if (this._storage.ihealthUploadRetry < TASK_MAX_RETRY) {
                this.setState(IHealthPoller.STATE.IHEALTH_UPLOAD_RETRY);
                this._storage.ihealthUploadRetry += 1;
            } else {
                this.setState(IHealthPoller.STATE.FAILED);
                error = new Error('uploadQkview: Unable to upload Qkview '
                    + `after ${TASK_MAX_RETRY} attempts`);
                p = Promise.reject(error);
            }
        })
        /* eslint-disable-next-line */
        .then(() => {
            // cleanup cookies and etc. if needed
            return im.cleanup().catch(silentCatch);
        })
        .then(() => {
            if (!error) {
                // we don't need qkview anymore - removing it
                const qm = this.getQkviewManager();
                return qm.prepare()
                    .then(() => qm.cleanup())
                    .catch(silentCatch);
            }
            return p || Promise.resolve();
        });
};

/**
 * Download Qkview diagnostics from F5 iHealth Service
 *
 * @async
 * @returns {Promise} Promise resolved when Qkview diagnostics downloaded
 */
IHealthPoller.prototype.fetchDiagnostics = function () {
    let data;
    let error;
    let p;

    this.setState(IHealthPoller.STATE.IHEALTH_POLL_IN_PROGRESS);

    const im = this.getIHealthManager();
    if (!im.qkviewURI) {
        this.setState(IHealthPoller.STATE.FAILED);
        const errMsg = 'fetchDiagnostics: no URI to Qkview diagnostics '
            + 'on F5 iHealth Service provided';
        this.logger.error(errMsg);
        return Promise.reject(new Error(errMsg));
    }

    // set polling start time
    if (this._storage.ihealthPollStart === 0) {
        this._storage.ihealthPollStart = (new Date()).getTime();
    }

    return im.prepare()
        .then(() => im.isQkviewAnalyzeReady())
        /* eslint-disable-next-line */
        .then((isReady) => {
            return isReady ? im.getDiagnosticsJSON() : Promise.resolve(false);
        })
        .then((resp) => {
            data = resp;
        })
        .catch((err) => {
            error = err;
        })
        .then(() => {
            if (data && !util.isObjectEmpty(data.diagnostics)) {
                this.setState(IHealthPoller.STATE.IHEALTH_POLL_DONE);
                this.sendDataToPipeline(data);
            } else if (((new Date()).getTime() - this._storage.ihealthPollStart) < IHEALTH_POLL_MAX_TIMEOUT) {
                this.setState(IHealthPoller.STATE.IHEALTH_POLL_RETRY);
                if (!error) {
                    let errMsg = 'Invalid response from F5 iHealth Service';
                    if (data) {
                        errMsg = `${errMsg}: unable to fetch 'diagnostics' key from response`;
                    }
                    error = new Error(errMsg);
                }
                this.logger.debug(`fetchDiagnostics: ${error}`);
            } else {
                this.setState(IHealthPoller.STATE.FAILED);
                error = new Error('fetchDiagnostics: Unable to poll Qkview Analysis '
                    + `results from F5 iHealth service: ${error || 'timeout'}`);
                p = Promise.reject(error);
            }
            return Promise.resolve();
        })
        /* eslint-disable-next-line */
        .then(() => {
            // cleanup cookies and etc. if needed
            return im.cleanup().catch(silentCatch);
        })
        .then(() => p || Promise.resolve());
};

/**
 * Start main pipeline for task processing
 *
 * @async
 * @returns {Promise} Promise resolved when pipeline completed
 */
IHealthPoller.prototype.process = function () {
    this._inProgress = true;

    return this._getStorageState()
        .then(() => this.fetchConfigs())
        .then(() => {
            if (!this.isConfigsAvailable()) {
                // no configs - disable poller and remove it later
                this.disable();
            }
        })
        .then(() => {
            if (this.canBeScheduled()) {
                return this.putOnSchedule();
            }
            return Promise.resolve();
        })
        .then(() => {
            if (this.isQueued() && this.shouldBeFired()) {
                return this.prepare();
            }
            return Promise.resolve();
        })
        .then(() => {
            if (this.isStateEq(IHealthPoller.STATE.READY)
                || this.isStateEq(IHealthPoller.STATE.QKVIEW_RETRY)) {
                return this.gatherQkview();
            }
            if (this.isStateEq(IHealthPoller.STATE.QKVIEW_COLLECTED)
                || this.isStateEq(IHealthPoller.STATE.IHEALTH_UPLOAD_RETRY)) {
                return this.uploadQkview();
            }
            if (this.isStateEq(IHealthPoller.STATE.IHEALTH_UPLOADED)
                || this.isStateEq(IHealthPoller.STATE.IHEALTH_POLL_RETRY)) {
                return this.fetchDiagnostics();
            }
            return Promise.resolve();
        })
        .catch((err) => {
            this.setState(IHealthPoller.STATE.FAILED);
            this.logger.exception(`IHealthPoller.processs: ${err}`, err);
        })
        .then(() => {
            if (this.isStateEq(IHealthPoller.STATE.IHEALTH_POLL_DONE)) {
                this.setState(IHealthPoller.STATE.DONE);
            }
            if (this.isTestOnly() && (this.isDone() || this.isFailed())) {
                this.disable();
            }
            if (!this.isRemoved() && (this.isFailed() || this.isDisabled())) {
                const p = this.cleanup().catch(silentCatch);
                if (this.isDisabled()) {
                    p.then(() => this.removeAllData()).catch(silentCatch);
                }
            }
            return Promise.resolve();
        })
        .then(() => this._saveStorageState())
        .catch((err) => {
            this.setState(IHealthPoller.STATE.FAILED);
            this.logger.exception(`IHealthPoller.processs: ${err}`, err);
        })
        .then(() => {
            // set it here to set correct timeout
            // according to current state
            this._inProgress = false;

            if (this.isRemoved()) {
                return Promise.resolve();
            }
            // schedule next iteration
            const delay = this.getProcessDelay();
            this._timerID = setTimeout(() => this.process(), delay);

            if (this.isTestOnly()) {
                this.logger.debug(`Next pipeline check scheduled in ${(delay || 1) / 1000} sec.`);
            }
            return Promise.resolve();
        })
        .catch((err) => {
            this.logger.exception('IHealthPoller.processs: unexpected error', err);
        });
};

/**
 * Create tracer instance or return existing one
 *
 * @returns {module:util~Tracer} tracer instance
 */
IHealthPoller.prototype.getTracer = function () {
    return util.tracer.createFromConfig(IHEALTH_POLLER_CLASS_NAME, this.sysName, this.config);
};

/**
 * Send data to Data Pipeline
 *
 * @param {Object} data - data to send
 */
IHealthPoller.prototype.sendDataToPipeline = function (data) {
    this.logger.debug('iHealth poller cycle finished');

    if (this.isDisabled() || !this.dataCallback) {
        return;
    }
    const parts = this._storage.qkview.ihealthURI.split('/');
    const other = {
        ihealthLink: this._storage.qkview.ihealthURI,
        qkviewNumber: parts[parts.length - 1] || parts[parts.length - 2],
        cycleStart: this._storage.startTimeStamp,
        cycleEnd: new Date().toISOString()
    };
    this.dataCallback(this, data, other);
};

/**
 * Disable instance
 */
IHealthPoller.prototype.disable = function () {
    if (this.isRemoved()) {
        return;
    }

    this.setState(IHealthPoller.STATE.DISABLED);
    if (this._inProgress) {
        // do nothing, because it means removal will
        // be schedule inside of 'process'
        return;
    }
    clearTimeout(this._timerID);
    this._timerID = setTimeout(() => this.process(), this.getProcessDelay());
};

/**
 * Pre-processing state - set all required params to initial state/values
 *
 * @async
 * @returns {Promise} Promise resolved when preparation done
 */
IHealthPoller.prototype.prepare = function () {
    if (this.isDisabled()) {
        return Promise.resolve();
    }
    this.setState(IHealthPoller.STATE.PREPARE);

    this._storage.startTimeStamp = new Date().toISOString();
    this._storage.qkviewRetry = 0;
    this._storage.ihealthUploadRetry = 0;
    this._storage.ihealthPollStart = 0;
    delete this._storage.qkview;

    this.setState(IHealthPoller.STATE.READY);
    return Promise.resolve();
};

/**
 * Put task on schedule
 */
IHealthPoller.prototype.putOnSchedule = function () {
    let nextExecDate = this.getNextFireDate();
    const fromDate = nextExecDate;
    const allowNow = !nextExecDate;
    nextExecDate = datetimeUtil.getNextFireDate(this.config.iHealth.interval, fromDate, allowNow);

    this._storage.nextExecTime = nextExecDate.getTime();
    this.logger.debug(`Next execution date for iHealth Poller "${this.sysName}": ${nextExecDate.toISOString()}`);

    if (this.isTestOnly()) {
        nextExecDate = new Date();
        this._storage.nextExecTime = nextExecDate.getTime();
    }

    this.setState(IHealthPoller.STATE.QUEUED);
};

/**
 * Clean up all data in case when task failed or instance disabled
 *
 * @async
 * @returns {Promise} Promise resolved when data removed
 */
IHealthPoller.prototype.cleanup = function () {
    // remove nextExecTime to allow task to be
    // rescheduled in current time frame
    this._storage.nextExecTime = 0;

    if (util.isObjectEmpty(this._storage.qkview) || util.isObjectEmpty(this.config)) {
        return Promise.resolve();
    }

    const qm = this.getQkviewManager();
    const im = this.getIHealthManager();
    delete this._storage.qkview;

    return qm.prepare()
        .then(() => qm.cleanup())
        .catch(silentCatch)
        .then(() => im.prepare())
        .then(() => im.cleanup())
        .catch(silentCatch);
};

/**
 * Remove all data associated with instance
 *
 * @async
 * @returns {Promise} Promise resolved when data deleted
 */
IHealthPoller.prototype.removeAllData = function () {
    this.setState(IHealthPoller.STATE.REMOVED, true);
    // we don't need timeout anymore
    clearTimeout(this._timerID);
    if (this.isTestOnly()) {
        // remove it from registered instances
        IHealthPoller.remove(this);
    }
};

/**
 * iHealth Poller instances
 *
 * @member {Object.<string, IHealthPoller>} - instances cache
 */
IHealthPoller.instances = {};

/**
 * Build iHealth poller key
 *
 * @private
 *
 * @param {String} sysName     - System declaration name
 * @param {String} ihName      - iHealth declaration name
 * @param {Boolean} [testOnly] - 'true' to test pipieline only
 *
 * @returns {String} iHealth poller key
 */
IHealthPoller.getKey = function (sysName, ihName, testOnly) {
    ihName = ihName || '';
    if (ihName) {
        sysName = `${sysName}.${ihName}`;
    }
    const key = `${sysName}_ihp${sysName.length}${ihName.length}`;
    const suffix = testOnly ? '_test' : '';
    return `${key}${suffix}`;
};

/**
 * Get iHealth poller
 *
 * @param {String} sysName     - System declaration name
 * @param {String} ihName      - iHealth declaration name
 * @param {Boolean} [testOnly] - 'true' to test pipieline only
 *
 * @returns {module:ihealth~IHealthPoller | undefined} iHealth Poller instance
 *     if exists else undefined
 */
IHealthPoller.get = function (sysName, ihName, testOnly) {
    return IHealthPoller.instances[IHealthPoller.getKey(sysName, ihName, testOnly)];
};

/**
 * Create new iHealth poller
 *
 * @param {String} sysName     - System declaration name
 * @param {String} ihName      - iHealth declaration name
 * @param {Boolean} [testOnly] - 'true' to test pipieline only
 *
 * @returns {module:ihealth~IHealthPoller} iHealth Poller instance
 */
IHealthPoller.create = function (sysName, ihName, testOnly) {
    const poller = new IHealthPoller(sysName, ihName, testOnly);
    IHealthPoller.instances[poller.getKey()] = poller;
    return poller;
};

/**
 * Remove iHealth poller
 * @param {module:ihealth~IHealthPoller} poller - IHealthPoller instance
 */
IHealthPoller.remove = function (poller) {
    delete IHealthPoller.instances[poller.getKey()];
};

/**
 * Merge System and iHealthPoller configs
 *
 * @param {Object} system        - System declaration
 * @param {Object} ihPoller - iHealth Poller declaration
 *
 * @returns {Object} config
 */
IHealthPoller.mergeConfigs = function (system, ihPoller) {
    const config = {
        enable: Boolean(system.enable && ihPoller.enable),
        trace: Boolean(system.trace && ihPoller.trace),
        system: {
            host: system.host,
            connection: {
                port: system.port,
                protocol: system.protocol,
                allowSelfSignedCert: system.allowSelfSignedCert
            },
            credentials: {
                username: system.username,
                passphrase: system.passphrase
            }
        },
        iHealth: {
            credentials: {
                username: ihPoller.username,
                passphrase: ihPoller.passphrase
            },
            downloadFolder: ihPoller.downloadFolder,
            interval: {
                timeWindow: {
                    start: ihPoller.interval.timeWindow.start,
                    end: ihPoller.interval.timeWindow.end
                },
                frequency: ihPoller.interval.frequency,
                day: ihPoller.interval.day
            }
        }
    };
    const ihProxy = ihPoller.proxy || {};
    config.iHealth.proxy = {
        connection: {
            host: ihProxy.host,
            port: ihProxy.port,
            protocol: ihProxy.protocol,
            allowSelfSignedCert: ihProxy.allowSelfSignedCert
        },
        credentials: {
            username: ihProxy.username,
            passphrase: ihProxy.passphrase
        }
    };
    return config;
};

/**
* Get System and iHealth Poller configs
*
* @param {Object} config         - parsed and formatted config
* @param {Object} sysName        - System declaration name
* @param {Object} [ihPollerName] - iHealth Poller declaration name
*
* @returns {Object} config
*/
IHealthPoller.getConfig = function (config, sysName, ihPollerName) {
    config = config || {};
    const systems = config[SYSTEM_CLASS_NAME] || {};
    const ihPollers = config[IHEALTH_POLLER_CLASS_NAME] || {};
    const system = systems[sysName];
    let ihPoller;

    if (!util.isObjectEmpty(system)) {
        if (ihPollerName) {
            ihPoller = ihPollers[ihPollerName];
        } else if (typeof system.iHealthPoller === 'string') {
            ihPoller = ihPollers[system.iHealthPoller];
        } else {
            ihPoller = system.iHealthPoller;
        }
    }
    return [system, ihPoller];
};

/**
 * Get storage data
 *
 * @async
 * @returns {Promise.<Object>} Promise resolved current storage data
 */
IHealthPoller.getStorage = function () {
    return persistentStorage.get(PERSISTENT_STORAGE_KEY) || {};
};

/**
 * Updated storage
 *
 * @async
 * @param {Object} data - data to save
 *
 * @returns {Promise} Promise resolved when data saved to storage
 */
IHealthPoller.updateStorage = function (data) {
    return persistentStorage.set(PERSISTENT_STORAGE_KEY, data);
};


module.exports = IHealthPoller;
