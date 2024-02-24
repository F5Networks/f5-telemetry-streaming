/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-bitwise, no-nested-ternary */

const APP_THRESHOLDS = require('../constants').APP_THRESHOLDS;
const hrtimestamp = require('../utils/datetime').hrtimestamp;
const logger = require('../logger').getChild('memoryMonitor');
const miscUtil = require('../utils/misc');
const rmUtil = require('./utils');
const Service = require('../utils/service');
const timers = require('../utils/timers');

/** @module resourceMonitor/memoryMonitor */

class ServiceError extends Error {}

/**
 * Memory Monitor Class
 *
 * NOTE:
 * - due nature of implementation there is a chance that subscribers
 *   may receive `MemoryCheckStatus` objeects out-of-order. Subscribers
 *   are responsible to check `hrtimestamp`.
 * - when utilization exceeded 100% then check interval will be 1sec.
 *   to avoid additional allocations
 * - `thresholdPercent` is not applicable to `freeMemoryLimit`. Once
 *   `freeUtilizationPercent` exceeded 100% then processing will be disabled.
 *
 * NOTE: RSS/external `bloat` issue. TS heavily relies on buffers/arraybuffers
 * and as result there are might be situations when RSS is above threshold and
 * `external` memory is close to it too. Once traffic stopped following
 * scenarious may occur:
 * - RSS and `external` when back to normal. Traffic enabled.
 * - RSS stil high, but `external` and `heap` are low. Should we enable traffic?
 * - RSS is low, but `external` and/or `heap` are above the threshold. Should we enable traffic?
 * - RSS, `external` and/or `heap` are high. Traffic disabled.
 *
 * It is not a memory leak, because with enabled GC usage counters drops back to normal.
 * This might be due high memory fragmentation. Or node.js weird behavior.
 *
 * @property {number} freeMemoryLimit - OS free memory limit (in MB)
 * @property {boolean} gcEnabled - true if GC enabled otherwise false
 * @property {Logger} logger - logger
 * @property {number} provisioned - max number of MB available for the process
 *      (can be configured via --max_old_space_size CLI option)
 * @property {number} releaseThreshold - amount of memory to release threshold lock (in MB)
 * @property {number} releasePercent - amount of memory to release threshold lock (in %)
 * @property {number} threshold - V8's RSS usage threshold (in MB)
 * @property {number} thresholdPercent - V8's RSS usage threshold (in %)
 */
class MemoryMonitor extends Service {
    /**
     * Constructor
     *
     * @param {function(MemoryCheckStatus)} cb - callback
     * @param {object} [options] - options
     * @param {number} [options.freeMemoryLimit] - OS free memory limit (in MB)
     * @param {object} [options.fs] - FS module, by default 'fs' from './misc'
     * @param {Interval[]} [options.intervals] - memory check intervals
     * @param {Logger} [options.logger] - logger
     * @param {number} [options.provisioned] - amount of provisioned memory in MB
     * @param {number} [options.thresholdPercent] - application memory threshold percent to use for alerts
     */
    constructor(cb, options) {
        super();

        options = Object.assign({
            freeMemoryLimit: APP_THRESHOLDS.MEMORY.DEFAULT_MIN_FREE_MEM,
            fs: miscUtil.fs,
            intervals: miscUtil.deepCopy(APP_THRESHOLDS.MEMORY.DEFAULT_CHECK_INTERVALS),
            logger: logger.getChild(this.constructor.name),
            provisioned: miscUtil.getRuntimeInfo().maxHeapSize,
            releasePercent: APP_THRESHOLDS.MEMORY.DEFAULT_RELEASE_PERCENT,
            thresholdPercent: APP_THRESHOLDS.MEMORY.DEFAULT_LIMIT_PERCENT
        }, options || {});

        this._lastKnownIntervalIdx = -1;
        this._lastKnownState = APP_THRESHOLDS.MEMORY.STATE.OK;
        this._timerPromise = Promise.resolve();
        this.restartsEnabled = true;

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            _cb: {
                value: cb
            },
            _gcInterval: {
                value: APP_THRESHOLDS.MEMORY.DEFAULT_GC_INTERVAL * 1000
            },
            _intervals: {
                value: miscUtil.deepFreeze(enrichMemoryCheckIntervals(options.intervals))
            },
            _readOSFreeMem: {
                value: () => options.fs.readFileSync('/proc/meminfo')
            },
            freeMemoryLimit: {
                value: options.freeMemoryLimit
            },
            gcEnabled: {
                value: typeof global.gc === 'function'
            },
            logger: {
                value: options.logger
            },
            provisioned: {
                value: options.provisioned
            },
            releasePercent: {
                value: options.releasePercent
            },
            thresholdPercent: {
                value: options.thresholdPercent
            }
        });

        // >> 0 is like Math.floor actually
        Object.defineProperties(this, {
            threshold: {
                value: Math.floor(this.provisioned * (this.thresholdPercent / 100.0)) >> 0
            }
        });
        Object.defineProperties(this, {
            releaseThreshold: {
                value: Math.floor(this.threshold * (this.releasePercent / 100.0)) >> 0
            }
        });

        const usage = memoryUsage.call(this);
        if (usage.free === -1) {
            this.logger.warning('Unable to get information about available memory from OS!');
        } else {
            this.logger.info(`OS available memory: ${rmUtil.megabytesToStr(usage.free)} (limit = ${rmUtil.megabytesToStr(this.freeMemoryLimit)})`);
        }

        this._lastKnownUtilization = usage.utilization;
        this._lastKnownGCCall = Date.now();

        this.logger.info(`Total memory available to the process (${process.argv[0]}): ${rmUtil.megabytesToStr(this.provisioned)}.`);
        this.logger.info(`Memory threshold: ${rmUtil.megabytesToStr(this.threshold)} (${rmUtil.percentToStr(this.thresholdPercent)}).`);
        this.logger.info(`Memory release threshold: ${rmUtil.megabytesToStr(this.releaseThreshold)} (${rmUtil.percentToStr(this.releasePercent)}).`);
        this.logger.info(`Memory usage: ${rmUtil.megabytesToStr(usage.utilization)} (${rmUtil.percentToStr(usage.utilizationPercent)})`);
        this.logger.info(`GC exposed = ${this.gcEnabled}`);
    }

    /**
     * Start Memory Monitor service
     *
     * @async
     * @param {function(Error)} onFatalError - callback to call on unexpected errors
     *
     * @returns {Promise} resolved with true once instance started and interval
     *      updated according to current memory usage, otherwise false
     */
    _onStart(onFatalError) {
        return new Promise((resolve, reject) => {
            if (this._timer) {
                reject(new ServiceError('_timer exists already!'));
            } else {
                this._timer = new timers.BasicTimer(null, {
                    abortOnFailure: false, // timer will contiue to call a func even on error
                    logger: this.logger.getChild('timer')
                });
                this._lastKnownIntervalIdx = getIntervalIdx.call(
                    this,
                    getOverallUtilization(memoryUsage.call(this))
                );
                const nextConf = this._intervals[this._lastKnownIntervalIdx];

                updateTimerInterval.call(this, nextConf.interval, this._timer)
                    .then(resolve, onFatalError);
            }
        });
    }

    /**
     * Stop Memory Monitor service
     *
     * @async
     * @returns {Promise} resolved once service stopped
     */
    _onStop() {
        return new Promise((resolve, reject) => {
            if (this._timer) {
                const timer = this._timer;
                this._timer = null;
                this._timerPromise = this._timerPromise
                    .then(() => timer.stop())
                    .then(resolve, reject);
            } else {
                resolve();
            }
        });
    }
}

/**
 * Transform user-supplied intervals to internal structures
 *
 * @param {Interval[]} intervals
 *
 * @returns {InternalInterval[]}
 */
function enrichMemoryCheckIntervals(intervals) {
    // sort by usage and drop intervals with same usage
    intervals = intervals
        .sort((a, b) => a.usage - b.usage)
        .filter((conf, idx) => conf.usage
            && conf.usage <= APP_THRESHOLDS.MEMORY.DEFAULT_OK_USAGE_PERCENT
            && (
                idx === 0
                || conf.usage > intervals[idx - 1].usage
            ));

    intervals = intervals.map((conf, idx) => {
        const min = idx === 0 ? 0 : intervals[idx - 1].usage;
        return {
            min,
            max: conf.usage,
            interval: conf.interval
        };
    });

    let maxUsage = intervals[intervals.length - 1];
    if (maxUsage.max < APP_THRESHOLDS.MEMORY.DEFAULT_OK_USAGE_PERCENT) {
        intervals.push(maxUsage = {
            interval: APP_THRESHOLDS.MEMORY.DEFAULT_MIN_INTERVAL,
            min: maxUsage.max,
            max: APP_THRESHOLDS.MEMORY.DEFAULT_OK_USAGE_PERCENT
        });
    }

    intervals.push({
        interval: APP_THRESHOLDS.MEMORY.DEFAULT_MIN_INTERVAL * 10,
        min: maxUsage.max,
        max: Number.MAX_SAFE_INTEGER
    });
    return intervals;
}

/**
 * Get interval index according to memory usage
 *
 * @this MemoryMonitor
 *
 * @param {number} usagePercent - memory usage percent
 *
 * @returns {integer} index number
 */
function getIntervalIdx(usagePercent) {
    return this._intervals.findIndex(
        (conf) => usagePercent >= conf.min && usagePercent < conf.max
    );
}

/**
 * Perform memory check
 *
 * @this MemoryMonitor
 *
 * @param {timers.BasicTimer} timer - origin time (used to verify that timer is still active)
 *
 * @returns {Promise} resolved once timer updated and notification sent
 */
function memoryMonitorCheck(timer) {
    const usage = memoryUsage.call(this);
    const trend = (this._lastKnownUtilization > usage.utilization)
        ? APP_THRESHOLDS.MEMORY.TREND.DOWN
        : ((this._lastKnownUtilization < usage.utilization)
            ? APP_THRESHOLDS.MEMORY.TREND.UP
            : APP_THRESHOLDS.MEMORY.TREND.NO_CHANGE);

    this._lastKnownUtilization = usage.utilization;

    this._lastKnownState = (
        this._lastKnownState === APP_THRESHOLDS.MEMORY.STATE.NOT_OK
        && usage.utilization > this.releaseThreshold
    )
        ? this._lastKnownState
        : ((Math.max(
            usage.freeUtilizationPercent,
            usage.thresholdUtilzationPercent
        ) < APP_THRESHOLDS.MEMORY.DEFAULT_OK_USAGE_PERCENT)
            ? APP_THRESHOLDS.MEMORY.STATE.OK
            : APP_THRESHOLDS.MEMORY.STATE.NOT_OK);

    if (this.gcEnabled && (
        this._lastKnownState === APP_THRESHOLDS.MEMORY.STATE.NOT_OK
        || ((Date.now() - this._lastKnownGCCall) > this._gcInterval)
    )) {
        this._lastKnownGCCall = Date.now();
        global.gc();
    }

    const nextConfIdx = (this._lastKnownState === APP_THRESHOLDS.MEMORY.STATE.NOT_OK)
        ? (this._intervals.length - 1)
        : getIntervalIdx.call(this, getOverallUtilization(usage));

    const nextConf = this._intervals[nextConfIdx];

    if (nextConfIdx !== this._lastKnownIntervalIdx
        && this._intervals[this._lastKnownIntervalIdx].interval !== nextConf.interval
        && this._timer === timer
    ) {
        updateTimerInterval.call(this, nextConf.interval, timer);
    }

    this._lastKnownIntervalIdx = nextConfIdx;

    setImmediate(this._cb, {
        hrtimestamp: hrtimestamp(),
        interval: miscUtil.deepCopy(nextConf),
        thresholdStatus: this._lastKnownState,
        trend,
        usage
    });
}

/**
 * Set new interval for the timer
 *
 * @this MemoryMonitor
 *
 * @param {number} interval - interval in seconds
 * @param {timers.BasicTimer} timer - origin time (used to verify that timer is still active)
 *
 * @returns {Promise} resolved once timer updated
 */
function updateTimerInterval(interval, timer) {
    this._timerPromise = this._timerPromise
        .then(
            // is it still same timer or not
            () => timer === this._timer
                && this._timer
                    .update(memoryMonitorCheck.bind(this, this._timer), interval)
                    .then(() => this.logger.info(`Interval updated to ${interval}s.`)),
            (err) => this.logger.exception('Uncaught error on attempt to update interval:', err)
        );
    return this._timerPromise;
}

/**
 * Application's memory usage stats
 *
 * @this MemoryMonitor
 *
 * @returns {MemoryUsage}
 */
function memoryUsage() {
    const usage = rmUtil.appMemoryUsage();
    Object.keys(usage).forEach((key) => {
        usage[key] = rmUtil.bytesToMegabytes(usage[key]);
    });

    const free = rmUtil.osAvailableMem(this._readOSFreeMem);
    const freeUtilizationPercent = (free >= 0)
        ? ((this.freeMemoryLimit <= free)
            ? (100 + this.freeMemoryLimit - free) // result might be negative
            : ((2 - free / this.freeMemoryLimit) * 100))
        : 0;

    const maxUtilization = Math.max(usage.rss, usage.external, usage.heapUsed);
    return Object.assign(usage, {
        free,
        freeLimit: this.freeMemoryLimit,
        freeUtilizationPercent: freeUtilizationPercent >= 0 ? freeUtilizationPercent : 0,
        provisioned: this.provisioned,
        release: this.releaseThreshold,
        releasePercent: this.releasePercent,
        threshold: this.threshold,
        thresholdPercent: this.thresholdPercent,
        thresholdUtilzationPercent: (maxUtilization / this.threshold) * 100.0,
        utilization: maxUtilization,
        utilizationPercent: (maxUtilization / this.provisioned) * 100.0
    });
}

/**
 * @param {MemoryUsage} usage
 *
 * @returns {number} overall max usage
 */
function getOverallUtilization(usage) {
    return usage.freeUtilizationPercent > usage.thresholdUtilzationPercent
        ? usage.freeUtilizationPercent
        : usage.thresholdUtilzationPercent;
}

module.exports = MemoryMonitor;

/**
 * @typedef InternalInterval
 * @type {Object}
 * @property {number} min - min memory usage in %
 * @property {number} max - max memory usage in %
 * @property {number} interval - check interval to use
 */
/**
 * @typedef Interval
 * @type {Object}
 * @property {number} usage - max memory usage in %
 * @property {number} interval - check interval to use when actual usage is below `usage`
 */
/**
 * @typedef MemoryCheckStatus
 * @type {Object}
 * @property {number} hrtimestamp - timestamp (high-resolution time)
 * @property {InternalInterval} interval - current interval config
 * @property {string} thresholdStatus - threshold status (might be used as an event name)
 * @property {'down' | 'same' | 'up'} trend - interval-related trend
 * @property {MemoryUsage} usage - used memory (in MB)
 */
/**
 * @typedef MemoryUsage
 * @type {Object}
 * @property {number} external - C++ object bound to JS layer (in MB)
 * @property {number} free - OS freem memory (in MB)
 * @property {number} freeLimit - OS free memory limit (in MB)
 * @property {number} freeUtilizationPercent - OS free memory utilization (in %)
 * @property {number} heapTotal - V8's memory usage - amount of heap size (in MB)
 * @property {number} heapUsed - V8's memory usage - amount of used heap (in MB)
 * @property {number} provisioned - amount of provisioned memory (in MB)
 * @property {number} release - memory release threshold limit (in MB)
 * @property {number} releasedPercent - memory release threshold limit (in %)
 * @property {number} rss - amount of space occupied in the main memory device (in MB)
 * @property {number} threshold - memory threshold limit (in MB)
 * @property {number} thresholdPercent - memory threshold limit (in %)
 * @property {number} thresholdUtilzationPercent - memory threshold utilization (in %)
 * @property {number} utilization - memory usage (in MB)
 * @property {number} utilizationPercent - memory utilization (in %)
 */
