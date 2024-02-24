/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-unused-expressions, no-nested-ternary, prefer-template */
/* eslint-disable no-use-before-define */

const APP_THRESHOLDS = require('../constants').APP_THRESHOLDS;
const configUtil = require('../utils/config');
const logger = require('../logger').getChild('resourceMonitor');
const miscUtil = require('../utils/misc');
const rmUtil = require('./utils');

const MemoryMonitor = require('./memoryMonitor');
const Service = require('../utils/service');

/** @module resourceMonitor */

class ServiceError extends Error {}

const MEM_MON_STOP_EVT = 'memoryMonitorStop';

/**
 * Resource Monitor Class
 *
 * @property {logger.Logger} logger
 */
class ResourceMonitor extends Service {
    constructor() {
        super();

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            logger: {
                value: logger.getChild(this.constructor.name)
            }
        });

        this._memoryMonitorState = {
            config: {},
            enabled: false,
            instance: null,
            logging: {
                freq: APP_THRESHOLDS.MEMORY.DEFAULT_LOG_FREQ, // logging requence (in ms.)
                lastMessage: 0, // last logged message timestamp (in ms.)
                level: APP_THRESHOLDS.MEMORY.DEFAULT_LOG_LEVEL
            },
            recentUsage: null
        };
        this.restartsEnabled = true;
    }

    /** @returns {boolean} true if Memory Monitor is running */
    get isMemoryMonitorActive() {
        const memMonitor = this._memoryMonitorState.instance;
        return !!memMonitor && memMonitor.isRunning();
    }

    /** @returns {MemoryMontorLiveConfig} Memory Monitor config */
    get memoryMonitorConfig() {
        return {
            config: this._memoryMonitorState.config,
            enabled: this._memoryMonitorState.enabled,
            logging: this._memoryMonitorState.logging
        };
    }

    /** @returns {memoryMonitor.MemoryCheckStatus} most recent data about memory usage */
    get memoryState() {
        // making a copy ensures that any other piece of code to be able to modify this data
        return miscUtil.deepCopy(this._memoryMonitorState.recentUsage);
    }

    /**
     * Configure and start the service
     *
     * @param {function} onFatalError - function to call on fatal error to restart the service
     */
    _onStart() {
        return new Promise((resolve, reject) => {
            const memState = this._memoryMonitorState;
            if (memState.instance) {
                reject(new ServiceError('_memoryMonitorState.instance exists already!'));
            } else if (memState.enabled) {
                this.logger.verbose('_onStart: Memory Monitor enabled, starting...');
                memState.instance = new MemoryMonitor(
                    memoryMonitorCb.bind(this),
                    Object.assign(miscUtil.deepCopy(memState.config), {
                        logger: this.logger.getChild('Memory Monitor')
                    })
                );
                memState.instance.start()
                    .then(resolve, reject);
            } else {
                memState.recentUsage = null;
                this.logger.verbose('_onStart: Memory Monitor disabled!');
                resolve();
            }
        });
    }

    /**
     * Stop the service
     *
     * @param {boolean} [restart] - true if service going to be restarted
     */
    _onStop(restart) {
        return new Promise((resolve, reject) => {
            const memState = this._memoryMonitorState;
            if (memState.instance) {
                this.logger.verbose(
                    '_onStop: '
                    + ((restart && memState.enabled)
                        ? 'Restarting Memory Monitor to apply configuration.'
                        : 'Stopping Memory Monitor.')
                );
                memState.instance.stop()
                    .then(() => {
                        memState.instance = null;
                        if (!memState.enabled) {
                            memState.recentUsage = null;
                            this.ee.safeEmit(MEM_MON_STOP_EVT);
                        }
                    })
                    .then(resolve, reject);
            } else {
                resolve();
            }
        });
    }

    /** @returns {Promise<boolean>} resolved with true when service destroyed or if it was destroyed already */
    destroy() {
        // disabled Memory Monitor to emit `MEM_MON_STOP_EVT` later
        this._memoryMonitorState.enabled = false;
        this._offConfigUpdates
            && this._offConfigUpdates.off()
            && (this._offConfigUpdates = null);

        return super.destroy()
            .then(() => {
                // all listeners notified already, safe to remove
                this.ee.removeAllListeners(APP_THRESHOLDS.MEMORY.STATE.NOT_OK);
                this.ee.removeAllListeners(APP_THRESHOLDS.MEMORY.STATE.OK);
                this.ee.removeAllListeners(MEM_MON_STOP_EVT);
                this.logger.info('Destroyed! Data processing enabled!');
            });
    }

    /** @param {restWorker.ApplicationContext} appCtx - application context */
    initialize(appCtx) {
        if (appCtx.configMgr) {
            this._offConfigUpdates = appCtx.configMgr.on('change', onConfigEvent.bind(this), { objectify: true });
            this.logger.debug('Subscribed to configuration updates.');
        } else {
            this.logger.warning('Unable to subscribe to configuration updates!');
        }
    }

    /**
     * @param {function} onEnable
     * @param {function} onDisable
     *
     * @returns {ProcessingState} instance
     */
    initializePState(onEnable, onDisable) {
        return (new ProcessingState(this)).initialize(onEnable, onDisable);
    }

    /** @return {boolean} true if processing allowed by most recent memory status check */
    isProcessingEnabled() {
        const recentUsage = this._memoryMonitorState.recentUsage;
        return recentUsage
            ? recentUsage.thresholdStatus === APP_THRESHOLDS.MEMORY.STATE.OK
            : true;
    }
}

/** Processing State Class */
class ProcessingState {
    /** @param {ResourceMonitor} resourceMonitor */
    constructor(resourceMonitor) {
        this._enabled = true;
        this._listeners = [];
        this._onDisable = null;
        this._onEnable = null;
        this._resMonitor = resourceMonitor;
    }

    /** @returns {boolean} if processing allowed to continue */
    get enabled() {
        return this._enabled;
    }

    /** @returns {memoryMonitor.MemoryCheckStatus} most recent data about memory usage */
    get memoryState() {
        return this._resMonitor.memoryState;
    }

    /** Destroy instance and unsubscribe from all events */
    destroy() {
        this._enabled = true;
        this._listeners.forEach((listener) => listener.off());
        this._listeners.length = 0;
        this._resMonitor = null;
    }

    /**
     * @param {function} onEnable
     * @param {function} onDisable
     *
     * @returns {ProcessingState} instance
     */
    initialize(onEnable, onDisable) {
        // save prev state
        const isEnabled = this._enabled;
        const resMonitor = this._resMonitor;

        this.destroy();

        // restore prev state
        this._enabled = isEnabled;
        this._resMonitor = resMonitor;

        // assign callbacks and subscribe to events
        this._onEnable = onEnable;
        this._onDisable = onDisable;

        const updateEventCb = updateProcessingState.bind(this, true);
        this._listeners = [
            APP_THRESHOLDS.MEMORY.STATE.NOT_OK,
            APP_THRESHOLDS.MEMORY.STATE.OK,
            MEM_MON_STOP_EVT
        ].map((evt) => this._resMonitor.ee.on(evt, updateEventCb, { objectify: true }));

        updateProcessingState.call(this, false);
        return this;
    }
}

/**
 * @this ResourceMonitor
 *
 * @param {memoryMonitor.MemoryCheckStatus} checkStatus
 */
function memoryMonitorCb(checkStatus) {
    const memState = this._memoryMonitorState;
    if (memState.instance === null) {
        return;
    }

    const prevMemState = memState.recentUsage;
    if (prevMemState && checkStatus.hrtimestamp < prevMemState.hrtimestamp) {
        this.logger.warning(`Memory Monitor event is late by ${prevMemState.hrtimestamp - checkStatus.hrtimestamp}ns.!`);
        return;
    }

    const eventName = (
        !prevMemState
        || prevMemState.thresholdStatus !== checkStatus.thresholdStatus
    )
        ? checkStatus.thresholdStatus
        : '';

    memState.recentUsage = checkStatus;
    if (eventName) {
        this.ee.safeEmit(eventName, checkStatus);
    }

    const logConfig = memState.logging;

    let logLevel = eventName
        ? (checkStatus.thresholdStatus === APP_THRESHOLDS.MEMORY.STATE.NOT_OK ? 'warning' : 'info')
        : logConfig.level;

    if (!eventName && logConfig.lastMessage && (Date.now() - logConfig.lastMessage) < logConfig.freq) {
        logLevel = 'verbose';
    } else {
        logConfig.lastMessage = Date.now();
    }

    if (this.logger.isLevelAllowed(logLevel)) {
        const usageStr = Object.keys(checkStatus.usage)
            .map((k) => `${k}=${rmUtil.formatFloat(checkStatus.usage[k], 2)}`)
            .join(', ');

        this.logger[logLevel](
            `MEMORY_USAGE: (${usageStr}), TREND = ${checkStatus.trend}, STATUS = ${checkStatus.thresholdStatus}`
        );
    }

    this.ee.safeEmit('memoryCheckStatus', checkStatus);
}

/**
 * Event handler for memore usage state updates
 *
 * @this ProcessingState
 *
 * @param {boolean} fireCallbacks - if true then callbacks will be fired
 */
function updateProcessingState(fireCallbacks) {
    const prevEnabled = this._enabled;
    this._enabled = this._resMonitor.isProcessingEnabled();

    if (arguments.length === 1) {
        // monitor stopped, re-enable all
        !prevEnabled && this._onEnable && this._onEnable();
    } else if (fireCallbacks && (prevEnabled !== this._enabled)) {
        // call all callbacks in same event loop
        this.enabled
            ? (this._onEnable && this._onEnable())
            : (this._onDisable && this._onDisable());
    }
}

/**
 * Create a Memory Monitor configuration
 *
 * @this ResourceMonitor
 *
 * @param {Configuration} config
*/
function updateMemoryMonitorConfig(config) {
    const controls = configUtil.getTelemetryControls(config);
    const maxHeapSize = miscUtil.getRuntimeInfo().maxHeapSize;
    const memState = this._memoryMonitorState;

    if (configUtil.hasEnabledComponents(config)) {
        // there are should be `default` values inhereted from the schema anyway
        // otherwise Memory Monitor defaults will be used.
        const memoryMonitorConfig = controls.memoryMonitor || {};
        const freeMemoryLimit = memoryMonitorConfig.osFreeMemory;
        const logLevel = memoryMonitorConfig.logLevel;
        const logFreq = memoryMonitorConfig.logFrequency;
        const memCheckInterval = memoryMonitorConfig.interval;
        const memLimit = memoryMonitorConfig.provisionedMemory;
        const memReleasePct = memoryMonitorConfig.thresholdReleasePercent;
        const memThresholdPct = typeof memoryMonitorConfig.memoryThresholdPercent === 'undefined'
            ? controls.memoryThresholdPercent
            : memoryMonitorConfig.memoryThresholdPercent;

        memState.enabled = true;

        memState.config.freeMemoryLimit = (Number.isSafeInteger(freeMemoryLimit) && freeMemoryLimit > 0)
            ? freeMemoryLimit
            : APP_THRESHOLDS.MEMORY.DEFAULT_MIN_FREE_MEM;

        memState.config.provisioned = (Number.isSafeInteger(memLimit) && memLimit > 0)
            ? memLimit
            : maxHeapSize;

        if (memState.config.provisioned > maxHeapSize) {
            this.logger.warning(
                `Memory limit (${rmUtil.megabytesToStr(memState.config.provisioned)}) is equal or higher `
                + `than V8 max heap size (${rmUtil.megabytesToStr(maxHeapSize)}). Application may crash. `
                + `Please, adjust memory limit's value! Memory limit set to ${maxHeapSize} MB`
            );
            memState.config.provisioned = maxHeapSize;
        }

        memState.config.thresholdPercent = (Number.isSafeInteger(memThresholdPct) && memThresholdPct > 0)
            ? memThresholdPct
            : APP_THRESHOLDS.MEMORY.DEFAULT_LIMIT_PERCENT;

        memState.config.releasePercent = (Number.isSafeInteger(memReleasePct) && memReleasePct > 0)
            ? memReleasePct
            : APP_THRESHOLDS.MEMORY.DEFAULT_RELEASE_PERCENT;

        if (memState.config.thresholdPercent >= 100) {
            this.logger.warning(
                'Disabling Memory Monitor due high threshold percent value '
                + `(${rmUtil.percentToStr(memState.config.thresholdPercent)}).`
            );
            memState.enabled = false;
        }

        memState.config.intervals = miscUtil.deepCopy((memCheckInterval === 'aggressive')
            ? APP_THRESHOLDS.MEMORY.ARGRESSIVE_CHECK_INTERVALS
            : APP_THRESHOLDS.MEMORY.DEFAULT_CHECK_INTERVALS);

        if (memCheckInterval === 'aggressive') {
            this.logger.info('More frequent Memory Monior checks are enabled.');
        }

        if (typeof logLevel === 'string') {
            memState.logging.level = logLevel; // should be validated by the declaration validator
        }
        if (Number.isSafeInteger(logFreq) && logFreq > 0) {
            memState.logging.freq = logFreq * 1000; // convert to ms.
        }
    } else {
        this.logger.info('No active components found in the declaration - no reason to start Memory Monitor.');
        memState.enabled = false;
    }
}

/**
 * @this ResourceMonitor
 *
 * @param {Configuration} config
 *
 * @returns {Promise} resolved once config applied to the instance
 */
function onConfigEvent(config) {
    return Promise.resolve()
        .then(() => {
            this.logger.verbose('Config "change" event');
            return setConfig.call(this, config);
        }).catch((err) => {
            this.logger.exception('Error caught on attempt to apply configuration to Resource Monitor:', err);
        });
}

/**
 * Upate Resource Monitor configuration
 *
 * @this ResourceMonitor
 *
 * @param {Configuration} config - configuration to apply
 *
 * @returns {Promise} resolved once configuration applied/updated
 */
function setConfig(config) {
    let needRestart = false;

    updateMemoryMonitorConfig.call(this, config);
    const memState = this._memoryMonitorState;

    if (memState.enabled) {
        needRestart = true;
        this.logger.info(`Memory Monitor will be restarted to apply new settings: ${JSON.stringify(memState.config)}.`);
    } else if (memState.instance) {
        this.logger.warning('Stopping Memory Monitor!');
        needRestart = true;
    }

    // restart the service, if more sub-services added in future then this line should be
    // upated to restart only updated instances
    return Promise.resolve(needRestart && this.restart());
}

module.exports = ResourceMonitor;

/**
 * @typedef MemoryMontorLiveConfig
 * @type {Object}
 * @property {object} config - config
 * @property {boolean} enabled - true if Memory Monitor enabled
 * @property {object} logging - logging config
 */
