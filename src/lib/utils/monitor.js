/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const APP_THRESHOLDS = require('../constants').APP_THRESHOLDS;
const deviceUtil = require('./device');
const logger = require('../logger');
const timers = require('./timers');
const configWorker = require('../config');
const configUtil = require('./config');
const SafeEventEmitter = require('./eventEmitter').SafeEventEmitter;

// eslint-disable-next-line no-restricted-properties
const BYTES_TO_MB_DIVISOR = Math.pow(1024, 2);

const DEFAULT_INTERVAL_SEC = 5;
// mapping of intervals to use according to memory usage
// higher usage %, more frequent checks
const MEM_PERCENT_TO_INTERVAL_SEC = [
    { min: 0, max: 24, interval: 30 },
    { min: 25, max: 49, interval: 15 },
    { min: 50, max: 74, interval: 10 },
    { min: 75, max: 89, interval: 5 },
    { min: 90, max: Number.MAX_VALUE, interval: 3 }
];

/**
 * Monitor that performs checks on an interval
 * Used to determine if certain thresholds are met
 * And if so, if certain events need to be emitted
 *
 * @class Monitor
 * @extends {EventEmitter2}
 */
class Monitor extends SafeEventEmitter {
    constructor() {
        super();
        this.logger = logger.getChild(this.constructor.name);
        this.memoryThreshold = null;
        this.memoryThresholdPercent = null;
        this.memoryLimit = null;
        this.timer = new timers.BasicTimer(this.checkThresholds.bind(this), {
            abortOnFailure: false,
            intervalInS: DEFAULT_INTERVAL_SEC,
            logger: this.logger.getChild('timer')
        });

        const stopSignals = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'];
        stopSignals.forEach((signal) => {
            process.on(signal, this.stop.bind(this));
        });
    }

    /**
     * Returns whether monitor is enabled, by default true unless toggled with env var
     *
     * @returns {Boolean} - whether monitor checks are enabled
     */
    isEnabled() {
        return process.env[APP_THRESHOLDS.MONITOR_DISABLED] !== 'true';
    }

    /**
     * Configure the monitor limit settings to use for checks
     *
     * @param {Number} memThresholdPercent - Memory threshold percent
     *      (% of total memory usage that once reached, fires an event)
     *
     * @returns {void}
     */
    setLimits(memThresholdPercent) {
        // default memThreshold also set at 90% set in schema
        this.memoryThresholdPercent = memThresholdPercent || APP_THRESHOLDS.MEMORY.DEFAULT_LIMIT_PERCENT;
        // do this here in case Host Device Cache might not be fully loaded earlier
        this.memoryLimit = deviceUtil.getHostDeviceInfo('NODE_MEMORY_LIMIT') || APP_THRESHOLDS.MEMORY.DEFAULT_MB;
        this.memoryThreshold = Math.round(this.memoryLimit * (this.memoryThresholdPercent / 100));
        logger.info(`Total Memory Provisioned (node process): ${this.memoryLimit} MB. Memory Threshold: ${this.memoryThreshold} MB (${this.memoryThresholdPercent}%)`);
    }

    /**
     * Starts the monitor timer
     *
     * @param {Number} memThresholdPercent - Memory threshold percent
     *      (% of total memory usage that once reached, triggers an event).
     *       First run starts after 5 seconds, then interval auto-adjusts according to usage
     *
     * @returns {Promise} resolved once timer started
     */
    start(memThresholdPercent) {
        return this.update(memThresholdPercent, DEFAULT_INTERVAL_SEC);
    }

    /**
     * Stops and clear the monitor timer
     *
     *  @returns {Promise} resolved once timer stopped
     */
    stop() {
        this.memoryThreshold = null;
        return this.timer.stop()
            .then(() => logger.info('Monitor checks stopped.'));
    }

    /**
     * Updates the monitor timer
     *
     * @param {Number} memThresholdPercent - Memory threshold percent
     *      (% of total memory usage that once reached, fires an event)
     * @param {Number} interval - The frequency of monitor timer in seconds, defaults to 5
     *
     *  @returns {Promise} resolved once timer updated
     */
    update(memThresholdPercent, interval) {
        if (!this.isEnabled()) {
            return Promise.resolve();
        }
        interval = interval || DEFAULT_INTERVAL_SEC;
        this.setLimits(memThresholdPercent);
        return this.timer.update(this.checkThresholds.bind(this), interval)
            .then(() => logger.info(`Monitor checks updated. Interval: ${this.timer.intervalInS}s | Memory Threshold: ${this.memoryThreshold} MB`));
    }

    /**
     * Perform the actual checks and event notification
     * Automatically adjusts timer interval depending on % memory usage
     *
     *  @returns {Promise} resolved once all checks are done
     */
    checkThresholds() {
        let usedMem;
        return Promise.resolve()
            .then(() => {
                usedMem = this.getProcessMemUsage();
                const memEventName = usedMem < this.memoryThreshold
                    ? APP_THRESHOLDS.MEMORY.OK : APP_THRESHOLDS.MEMORY.NOT_OK;
                return this.safeEmitAsync('check', memEventName);
            })
            .then(() => {
                const usedMemPercent = Math.round((usedMem / this.memoryLimit) * 100);
                logger.debug(`MEMORY_USAGE: ${usedMem} MB (${usedMemPercent}%, limit = ${this.memoryLimit} MB)`);
                const newInterval = MEM_PERCENT_TO_INTERVAL_SEC.find(
                    mapping => usedMemPercent >= mapping.min && usedMemPercent <= mapping.max
                ).interval;
                if (this.timer.intervalInS !== newInterval) {
                    return this.update(this.memoryThresholdPercent, newInterval);
                }
                return Promise.resolve();
            });
    }

    /**
     * Gets this node process' total memory usage (rss value)
     *
     * @returns {Number} - the memory usage in MB
     */
    getProcessMemUsage() {
        // use rss to add some extra buffer to our check (includes all c++ and js objects and code)
        // node v15 adds a new method process.memoryUsage.rss() which is supposed to be faster
        return process.memoryUsage().rss / BYTES_TO_MB_DIVISOR;
    }
}

const monitor = new Monitor();

monitor.on('error', (err) => {
    logger.exception('An unexpected error occurred in monitor checks', err);
});

configWorker.on('change', config => Promise.resolve()
    .then(() => {
        logger.debug('configWorker change event in monitor');
        const controls = configUtil.getTelemetryControls(config);
        const monitoringNeeded = configUtil.hasEnabledComponents(config);
        const memThresholdPct = controls.memoryThresholdPercent;

        if (!monitoringNeeded || memThresholdPct >= 100) {
            return monitor.stop();
        }
        return monitor.timer.isActive()
            ? monitor.update(memThresholdPct)
            : monitor.start(memThresholdPct);
    }).catch((err) => {
        logger.exception('An error occurred in monitor checks (config change handler)', err);
    }));

module.exports = monitor;
