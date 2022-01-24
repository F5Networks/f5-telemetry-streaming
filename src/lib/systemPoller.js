/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const APP_THRESHOLDS = require('./constants').APP_THRESHOLDS;
const configUtil = require('./utils/config');
const configWorker = require('./config');
const constants = require('./constants');
const dataPipeline = require('./dataPipeline');
const errors = require('./errors');
const logger = require('./logger');
const monitor = require('./utils/monitor');
const promiseUtil = require('./utils/promise');
const SystemStats = require('./systemStats');
const timers = require('./utils/timers');
const tracers = require('./utils/tracer');
const util = require('./utils/misc');

/** @module systemPoller */

// key - poller name, value - { timer, config }
const POLLER_TIMERS = {};

let processingEnabled = true;

class NoPollersError extends errors.ConfigLookupError {}

/**
 * Returns tracked system pollers
 *
 * @returns {Object} - Object containing systemPollers ({ pollerTraceName: { timer, config } })
 */
function getPollerTimers() {
    return POLLER_TIMERS;
}

/**
 * Check if systemPoller(s) are running
 * Toggled by monitor checks
 *
 * @returns {Boolean} - whether or not processing is enabled
 */

function isEnabled() {
    return processingEnabled;
}

function findSystemOrPollerConfigs(originalConfig, sysOrPollerName, pollerName, namespace) {
    // If namespace is undefined, assumption is we're querying for objects in the 'default namespace'
    const namespaceInfo = namespace ? ` in Namespace '${namespace}'` : '';
    namespace = namespace || constants.DEFAULT_UNNAMED_NAMESPACE;
    const systemPollers = configUtil.getTelemetrySystemPollers(originalConfig, namespace);
    let pollers = [];

    if (sysOrPollerName && pollerName) {
        // probably system's and poller's names
        pollers = systemPollers.filter((p) => p.name === pollerName && p.systemName === sysOrPollerName);
    } else {
        // each object has unique name per namespace
        // so, one of the system or poller will be 'undefined'
        pollers = systemPollers.filter((p) => p.systemName === sysOrPollerName);
    }

    if (pollers.length === 0) {
        if (pollerName) {
            throw new errors.ObjectNotFoundInConfigError(`System Poller with name '${pollerName}' doesn't exist in System '${sysOrPollerName}'${namespaceInfo}`);
        }
        throw new errors.ObjectNotFoundInConfigError(`System or System Poller with name '${sysOrPollerName}' doesn't exist or has no configured System Pollers${namespaceInfo}`);
    }
    return pollers;
}

function getEnabledPollerConfigs(originalConfig, includeDisabled) {
    const pollers = configUtil.getTelemetrySystemPollers(originalConfig);
    if (includeDisabled) {
        return pollers;
    }
    return pollers.filter((p) => p.enable);
}

function applyConfig(originalConfig) {
    const currPollers = module.exports.getPollerTimers();
    const systemPollers = getEnabledPollerConfigs(originalConfig);
    const newPollerIDs = [];
    const promises = [];

    systemPollers.forEach((pollerConfig) => {
        const key = pollerConfig.traceName;
        const existingPoller = currPollers[key];
        newPollerIDs.push(key);
        if (!pollerConfig.skipUpdate || !existingPoller) {
            pollerConfig.tracer = tracers.fromConfig(pollerConfig.trace);
            const baseMsg = `system poller ${key}. Interval = ${pollerConfig.interval} sec.`;
            // add to data context to track source poller config and destination(s)
            pollerConfig.destinationIds = configUtil.getReceivers(originalConfig, pollerConfig).map((r) => r.id);
            if (pollerConfig.interval === 0) {
                logger.info(`Configuring non-polling ${baseMsg}`);
                if (currPollers[key] && currPollers[key].timer) {
                    promises.push(currPollers[key].timer.stop()
                        .catch(((error) => logger.exception(`Unable to stop timer for System Poller "${key}"`, error))));
                }
                currPollers[key] = undefined;
            } else if (currPollers[key] && currPollers[key].timer) {
                logger.info(`Updating ${baseMsg}`);
                promises.push(currPollers[key].timer.update(safeProcess, pollerConfig.interval, pollerConfig)
                    .catch(((error) => logger.exception(`Unable to update timer for System Poller "${key}"`, error))));
                currPollers[key].config = pollerConfig;
            } else {
                logger.info(`Starting ${baseMsg}`);
                currPollers[key] = {
                    timer: new timers.SlidingTimer(safeProcess, {
                        abortOnFailure: false,
                        intervalInS: pollerConfig.interval,
                        logger: logger.getChild(`${pollerConfig.traceName}.timer`)
                    }, pollerConfig),
                    config: pollerConfig
                };
                promises.push(currPollers[key].timer.start()
                    .catch(((error) => logger.exception(`Unable to start timer for System Poller "${key}"`, error))));
            }
        }
    });

    Object.keys(currPollers).forEach((key) => {
        if (newPollerIDs.indexOf(key) === -1) {
            logger.info(`Disabling/removing system poller ${key}`);
            // for pollers with interval=0, the key exists, but value is undefined
            if (!util.isObjectEmpty(currPollers[key]) && currPollers[key].timer) {
                promises.push(currPollers[key].timer.stop()
                    .catch(((error) => logger.exception(`Unable to stop timer for System Poller "${key}"`, error))));
            }
            delete currPollers[key];
        }
    });

    return promiseUtil.allSettled(promises);
}

function enablePollers() {
    const currentPollers = module.exports.getPollerTimers();
    const promises = [];

    Object.keys(currentPollers).forEach((pollerKey) => {
        const poller = currentPollers[pollerKey];
        if (poller && poller.config && poller.config.interval > 0) {
            logger.info(`Enabling system poller ${pollerKey}. Interval = ${poller.config.interval} sec.`);
            if (poller.timer) {
                // Update timer to enable/re-enable the poller
                promises.push(poller.timer.update(safeProcess, poller.config.interval, poller.config)
                    .catch(((error) => logger.exception(`Unable to update timer for System Poller "${pollerKey}"`, error))));
            } else {
                poller.timer = new timers.SlidingTimer(safeProcess, {
                    abortOnFailure: false,
                    intervalInS: poller.config.interval,
                    logger: logger.getChild(`${poller.config.traceName}.timer`)
                }, poller.config);
                promises.push(poller.timer.start()
                    .catch(((error) => logger.exception(`Unable to start timer for System Poller "${pollerKey}"`, error))));
            }
        }
    });
    return promiseUtil.allSettled(promises);
}

function disablePollers() {
    const currentPollers = module.exports.getPollerTimers();
    const promises = [];

    Object.keys(currentPollers).forEach((pollerKey) => {
        const poller = currentPollers[pollerKey];
        if (poller && poller.config && poller.config.interval > 0) {
            logger.info(`Disabling system poller ${pollerKey}`);
            if (poller.timer) {
                promises.push(poller.timer.stop()
                    .catch(((error) => logger.exception(`Unable to stop timer for System Poller "${pollerKey}"`, error))));
            }
        }
    });
    return promiseUtil.allSettled(promises);
}

/**
 * Process system(s) stats
 *
 * @param {Object}   args                     - args object
 * @param {Object}   args.config              - system config
 * @param {Boolean}  [args.process]           - determine whether to process through pipeline
 * @param {module:util~Tracer} [args.tracer]  - tracer to write to disk
 * @param []
 *
 * @returns {Promise} Promise which is resolved with data sent
 */
function process() {
    const config = arguments[0];
    const options = arguments.length > 1 ? arguments[1] : {};
    const tracer = config.tracer;
    const startTimestamp = new Date().toISOString();
    logger.debug('System poller cycle started');
    config.name = config.traceName;
    const systemStats = new SystemStats(config);
    return systemStats.collect()
        .then((normalizedData) => {
            // inject service data
            const telemetryServiceInfo = {
                pollingInterval: config.interval,
                cycleStart: startTimestamp,
                cycleEnd: (new Date()).toISOString()
            };
            normalizedData.telemetryServiceInfo = telemetryServiceInfo;
            normalizedData.telemetryEventCategory = constants.EVENT_TYPES.SYSTEM_POLLER;
            // end inject service data

            const dataCtx = {
                data: normalizedData,
                type: constants.EVENT_TYPES.SYSTEM_POLLER,
                isCustom: systemStats.isCustom,
                sourceId: config.id,
                destinationIds: config.destinationIds
            };

            return dataPipeline.process(dataCtx, {
                noConsumers: options.requestFromUser,
                tracer,
                actions: config.dataOpts.actions,
                deviceContext: systemStats.contextData
            });
        })
        .then((dataCtx) => {
            logger.debug('System poller cycle finished');
            return dataCtx;
        })
        .catch((e) => {
            throw e;
        });
}

/**
 * Safe process - start process system(s) stats safely
 *
 * @async
 * @see module:systemPoller~process
 *
 * @returns {Promise.<Object>} Promise resolved with data from System Poller
 */
function safeProcess() {
    const requestFromUser = (arguments.length > 1 ? arguments[1] : {}).requestFromUser;
    try {
        // eslint-disable-next-line
        return module.exports.process.apply(null, arguments)
            .catch((err) => {
                logger.exception('systemPoller:safeProcess unhandled exception in promise-chain', err);
                if (requestFromUser) {
                    return Promise.reject(err);
                }
                return Promise.resolve();
            });
    } catch (err) {
        logger.exception('systemPoller:safeProcess unhandled exception', err);
        if (requestFromUser) {
            return Promise.reject(new Error(`systemPoller:safeProcess unhandled exception: ${err}`));
        }
    }
    return Promise.resolve();
}

/**
 * Get System Poller config if exists
 *
 * @param {String}  sysOrPollerName                     - system name or poller name
 * @param {Object}  [options]                           - optional values
 * @param {String}  [options.pollerName]                - poller name
 * @param {String}  [options.namespace]                 - namespace name
 * @param {Boolean} [options.includeDisabled = false]   - whether to include disabled pollers
 *
 * @returns {Promise<Object>} resolved with poller's config
 */
function getPollersConfig(sysOrPollerName, options) {
    options = options || {};
    const includeDisabled = (typeof options.includeDisabled === 'undefined') ? false : options.includeDisabled;
    return Promise.resolve()
        .then(() => findSystemOrPollerConfigs(
            configWorker.currentConfig,
            sysOrPollerName,
            options.pollerName,
            options.namespace
        ))
        .then((config) => configUtil.decryptSecrets(config))
        .then((configs) => {
            if (configs.length === 0) {
                // unexpected, something went wrong
                throw new errors.ObjectNotFoundInConfigError(`No System or System Poller with name '${sysOrPollerName}' configured`);
            }
            configs = configs.filter((c) => c.enable || includeDisabled);
            return configs;
        });
}

/**
 * Get System Poller data for each provided configuration
 *
 * @param {Array<Object>} pollerConfigs - array of poller configurations
 * @param {Boolean} [decryptSecrets = false] - whether decryption of secrets is needed
 *
 * @returns {Promise<Array>} resolved with pollers data
 */
function fetchPollersData(pollerConfigs, decryptSecrets) {
    // need to wrap with catch to avoid situations when one of the promises was rejected
    // and another one left in unknown state
    const caughtErrors = [];
    const promise = decryptSecrets ? configUtil.decryptSecrets(pollerConfigs)
        : Promise.resolve(pollerConfigs);

    return promise
        .then((decryptedConf) => {
            const processPollers = decryptedConf.map((pollerConf) => safeProcess(pollerConf, { requestFromUser: true })
                .catch((err) => caughtErrors.push(err)));
            return Promise.all(processPollers);
        })
        .then((data) => {
            if (caughtErrors.length > 0) {
                return Promise.reject(caughtErrors[0]);
            }
            return Promise.resolve(data);
        });
}

// config worker change event
configWorker.on('change', (config) => Promise.resolve()
    .then(() => {
        logger.debug('configWorker change event in systemPoller');
        // reset for monitor check
        processingEnabled = true;
        return applyConfig(util.deepCopy(config));
    })
    .then(() => logger.debug(`${Object.keys(getPollerTimers()).length} system poller(s) running`))
    .catch((error) => logger.exception('Uncaught error during System Poller(s) configuration', error)));

monitor.on('check', (status) => new Promise((resolve) => {
    const monitorChecksOk = status === APP_THRESHOLDS.MEMORY.OK;
    // only enable/disable when there is change in state
    if (processingEnabled !== monitorChecksOk) {
        // also only log here to minimize entries
        logger.warning(`${status}. ${monitorChecksOk ? 'Re-enabling system poller(s).' : 'Temporarily disabling system poller(s).'}`);
        if (monitorChecksOk) {
            enablePollers();
        } else {
            disablePollers();
        }
    }
    processingEnabled = monitorChecksOk;
    resolve();
}).catch((err) => {
    logger.exception('Unexpected error in system poller (monitor check handler).', err);
}));

module.exports = {
    NoPollersError,
    findSystemOrPollerConfigs,
    fetchPollersData,
    getPollersConfig,
    getPollerTimers,
    process,
    safeProcess,
    isEnabled
};
