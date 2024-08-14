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

const APP_THRESHOLDS = require('../constants').APP_THRESHOLDS;
const configUtil = require('../utils/config');
const miscUtil = require('../utils/misc');
const rmUtil = require('./utils');

const MemoryMonitor = require('./memoryMonitor');
const psBuilder = require('./processingState');
const Service = require('../utils/service');

/**
 * @module resourceMonitor
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../utils/config').Configuration} Configuration
 * @typedef {import('./memoryMonitor').MemoryCheckStatus} MemoryCheckStatus
 * @typedef {import('./processingState').ProcessingState} ProcessingState
 */

class ServiceError extends Error {}

const EE_NAMESPACE = 'resmon';

/**
 * Resource Monitor Class
 *
 * NOTE:
 * instance will restore its configuration when destroy -> start/restart happened
 *
 * @fires config.applied
 * @fires pstate
 */
class ResourceMonitorService extends Service {
    constructor() {
        super();
        this._memoryMonitorState = initialMemoryMonitorState();
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

    /** @returns {MemoryCheckStatus} most recent data about memory usage */
    get memoryState() {
        // making a copy ensures that any other piece of code to be able to modify this data
        return miscUtil.deepCopy(this._memoryMonitorState.recentUsage);
    }

    /**
     * Configure and start the service
     *
     * @fires pstate
     *
     * @param {function} onFatalError - function to call on fatal error to restart the service
     * @param {object} info - additional info
     * @param {boolean} info.coldStart - true if the service was started first time after creating or once destroyed
     * @param {boolean} info.restart - true if the service was started due calling `.restart()`.
     *  NOTE: set to `false` on cold start.
     */
    _onStart(onFatalError, info) {
        return (new Promise((resolve, reject) => {
            const memState = this._memoryMonitorState;
            if (memState.instance) {
                reject(new ServiceError('_memoryMonitorState.instance exists already!'));
            } else if (memState.enabled) {
                this.logger.debug('_onStart: Memory Monitor enabled, starting...');
                memState.instance = new MemoryMonitor(
                    memoryMonitorCb.bind(this),
                    Object.assign(miscUtil.deepCopy(memState.config), {
                        logger: this.logger
                    })
                );
                memState.instance.start()
                    .then(resolve, reject);
            } else {
                memState.recentUsage = null;
                this.logger.debug('_onStart: Memory Monitor disabled!');
                resolve();
            }
        }))
            // emit only once on cold start (application start)
            .then(() => info.coldStart && this.ee.safeEmitAsync(
                'pstate',
                (onEnable, onDisable) => psBuilder(this, onEnable, onDisable)
            ));
    }

    /**
     * Stop the service
     *
     * @param {object} info - additional info
     * @param {boolean} info.destroy - true if the service was stopped due calling `.destroy()`.
     * @param {boolean} info.restart - true if the service was started due calling `.restart()`.
     */
    _onStop(info) {
        const memState = this._memoryMonitorState;
        let stopRet;

        return Promise.resolve()
            .then(() => {
                const memMon = memState.instance;
                if (memMon === null) {
                    return Promise.resolve();
                }

                memState.instance = null;
                if (info.destroy) {
                    this.logger.debug('Destroying Memory Monitor.');
                    return memMon.destroy();
                }

                this.logger.debug(
                    '_onStop: '
                    + ((info.restart && memState.enabled)
                        ? 'Restarting Memory Monitor to apply configuration.'
                        : 'Stopping Memory Monitor.')
                );
                return memMon.stop();
            })
            .then((success) => ({ success }), (error) => ({ error }))
            .then((ret) => {
                stopRet = ret;

                if (info.destroy || !memState.enabled) {
                    // clear recent usage stats when monitor disabled
                    memState.recentUsage = null;
                } // otherwise keep recent usage stats to provide seamless service

                if (info.destroy) {
                    return this.ee.safeEmitAsync('pstate.destroy');
                }
                if (!memState.enabled) {
                    // memory monitor disabled, need to re-enable processing (default state)
                    this.logger.warning('Re-enabling processing (memory monitor disabled).');
                    return this.ee.safeEmitAsync(APP_THRESHOLDS.MEMORY.STATE.OK, null);
                }
                // otherwise monitor will be restarted, keep current state
                return Promise.resolve();
            })
            .then(() => (
                stopRet.error
                    ? Promise.reject(stopRet.error)
                    : Promise.resolve(stopRet.success)));
    }

    /** @returns {Promise<boolean>} resolved with true when service destroyed or if it was destroyed already */
    destroy() {
        this._offConfigUpdates
            && this._offConfigUpdates.off()
            && (this._offConfigUpdates = null);

        return super.destroy()
            .then((ret) => {
                this._memoryMonitorState = initialMemoryMonitorState();

                // all listeners notified already, safe to remove
                this._offMyEvents
                    && this._offMyEvents.off()
                    && (this._offMyEvents = null);

                // free all pstate refts
                this.ee.removeAllListeners(APP_THRESHOLDS.MEMORY.STATE.NOT_OK);
                this.ee.removeAllListeners(APP_THRESHOLDS.MEMORY.STATE.OK);
                this.ee.removeAllListeners('pstate.destroy');

                this.logger.warning('Destroyed! Data processing enabled!');

                return ret;
            });
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        this._offConfigUpdates = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
        this.logger.debug('Subscribed to Configuration updates.');

        this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
            { 'config.applied': 'config.applied' },
            { pstate: 'pstate' }
        ]);
    }

    /** @return {boolean} true if processing allowed by most recent memory status check */
    isProcessingEnabled() {
        const recentUsage = this._memoryMonitorState.recentUsage;
        return recentUsage === null || recentUsage.thresholdStatus === APP_THRESHOLDS.MEMORY.STATE.OK;
    }
}

/** @returns {object} initial Memory Monitor state */
function initialMemoryMonitorState() {
    return {
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
}

/**
 * @this ResourceMonitorService
 *
 * @param {MemoryCheckStatus} checkStatus
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
 * Create a Memory Monitor configuration
 *
 * @this ResourceMonitorService
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
 * @this ResourceMonitorService
 *
 * @param {Configuration} config
 */
function onConfigEvent(config) {
    Promise.resolve()
        .then(() => {
            this.logger.debug('Config "change" event');
            return setConfig.call(this, config);
        }).catch((err) => {
            this.logger.exception('Error caught on attempt to apply configuration to Resource Monitor:', err);
        })
        // emit in any case to show we are done with config processing
        .then(() => this.ee.safeEmitAsync('config.applied'));
}

/**
 * Upate Resource Monitor configuration
 *
 * @this ResourceMonitorService
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

module.exports = ResourceMonitorService;

/**
 * @typedef MemoryMontorLiveConfig
 * @type {Object}
 * @property {object} config - config
 * @property {boolean} enabled - true if Memory Monitor enabled
 * @property {object} logging - logging config
 */
/**
 * @callback PStateBuilder
 * @param {function} onEnable
 * @param {function} onDisable
 *
 * @returns {ProcessingState}
 */
/**
 * @event pstate
 * @param {PStateBuilder} getPState - function to create Processing State instance
 *
 * Event fired only once on service very first start
 */
