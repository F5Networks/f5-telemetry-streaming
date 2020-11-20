/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('./constants');
const configWorker = require('./config');
const dataPipeline = require('./dataPipeline');
const deviceUtil = require('./deviceUtil');
const errors = require('./errors');
const logger = require('./logger');
const SystemStats = require('./systemStats');
const util = require('./util');
const configUtil = require('./configUtil');

/** @module systemPoller */

const CONFIG_CLASSES = constants.CONFIG_CLASSES;
// use SYSTEM_POLLER_CLASS_NAME to keep compatibility with previous versions
const TRACER_CLASS_NAME = CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME;
// key - poller name, value - timer ID
const POLLER_TIMERS = {};

class NoPollersError extends errors.ConfigLookupError {}

function getPollerTimers() {
    return POLLER_TIMERS;
}

function findSystemOrPollerConfigs(originalConfig, sysOrPollerName, pollerName, namespace) {
    // If namespace is undefined, assumption is we're querying for objects in the 'default namespace'
    const namespaceInfo = namespace ? ` in Namespace '${namespace}'` : '';
    namespace = namespace || constants.DEFAULT_UNNAMED_NAMESPACE;
    const systems = configUtil.getTelemetrySystems(originalConfig, namespace);
    const systemPollers = configUtil.getTelemetrySystemPollers(originalConfig, namespace);
    let poller;

    const system = systems.find(s => s.name === sysOrPollerName);
    if (sysOrPollerName && pollerName) {
        if (!util.isObjectEmpty(system)) {
            poller = systemPollers.filter(p => p.name === pollerName && system.systemPollers.indexOf(p.id) > -1);
        }
    } else {
        // each object has unique name per namespace
        // so, one of the system or poller will be 'undefined'
        poller = systemPollers.filter(p => p.name === sysOrPollerName);
    }

    const systemFound = !util.isObjectEmpty(system);
    const pollerFound = poller && poller.length > 0;
    // check for errors at first
    if (!systemFound || !pollerFound) {
        if (pollerName) {
            // sysOrPollerName and pollerName both passed to the function
            if (!systemFound) {
                throw new errors.ObjectNotFoundInConfigError(`System with name '${sysOrPollerName}' doesn't exist${namespaceInfo}`);
            }

            if (!pollerFound) {
                throw new errors.ObjectNotFoundInConfigError(`System Poller with name '${pollerName}' doesn't exist in System '${sysOrPollerName}'${namespaceInfo}`);
            }

            throw new errors.ObjectNotFoundInConfigError(`System Poller with name '${pollerName}' doesn't exist${namespaceInfo}`);
        }
        if (!(systemFound || pollerFound)) {
            throw new errors.ObjectNotFoundInConfigError(`System or System Poller with name '${sysOrPollerName}' doesn't exist${namespaceInfo}`);
        }

        if (systemFound && system.systemPollers.length === 0) {
            throw new NoPollersError(`System with name '${sysOrPollerName}' has no System Poller configured${namespaceInfo}`);
        }
    }
    // error check passed and now we have valid objects to continue with
    let config = [];
    if (pollerFound) {
        config = poller;
    } else {
        config = originalConfig.components.filter(c => system.systemPollers.indexOf(c.id) > -1);
    }
    return config;
}

function getEnabledPollerConfigs(originalConfig, includeDisabled) {
    const pollers = configUtil.getTelemetrySystemPollers(originalConfig);
    if (includeDisabled) {
        return pollers;
    }
    return pollers.filter(p => p.enable);
}


function applyConfig(originalConfig) {
    const systemPollers = getEnabledPollerConfigs(originalConfig);

    const newPollerIDs = [];
    const currPollerIDs = module.exports.getPollerTimers();

    systemPollers.forEach((pollerConfig) => {
        // TODO: keep using traceName as ID for now
        // tackle using IDs with AUTOTOOL-1834
        // and see if there's a simple way to skip 'update' altogether
        // if the exact same poller is configured and already running

        newPollerIDs.push(pollerConfig.traceName);
        pollerConfig.tracer = util.tracer.createFromConfig(
            TRACER_CLASS_NAME, pollerConfig.traceName, pollerConfig
        );
        const baseMsg = `system poller ${pollerConfig.traceName}. Interval = ${pollerConfig.interval} sec.`;
        // add to data context to track source poller config and destination(s)
        pollerConfig.destinationIds = originalConfig.mappings[pollerConfig.id];
        if (pollerConfig.interval === 0) {
            logger.info(`Configuring non-polling ${baseMsg}`);
            if (currPollerIDs[pollerConfig.traceName]) {
                util.stop(currPollerIDs[pollerConfig.traceName]);
            }
            currPollerIDs[pollerConfig.traceName] = undefined;
        } else if (currPollerIDs[pollerConfig.traceName]) {
            logger.info(`Updating ${baseMsg}`);
            currPollerIDs[pollerConfig.traceName] = util.update(
                currPollerIDs[pollerConfig.traceName], safeProcess, pollerConfig, pollerConfig.interval
            );
        } else {
            logger.info(`Starting ${baseMsg}`);
            currPollerIDs[pollerConfig.traceName] = util.start(
                safeProcess, pollerConfig, pollerConfig.interval
            );
        }
    });

    Object.keys(currPollerIDs).forEach((key) => {
        if (newPollerIDs.indexOf(key) === -1) {
            logger.info(`Disabling system poller ${key}`);
            util.stop(currPollerIDs[key]);
            delete currPollerIDs[key];
        }
    });
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
    return configWorker.getConfig()
        .then(currentConfig => findSystemOrPollerConfigs(
            currentConfig.normalized, sysOrPollerName, options.pollerName, options.namespace
        ))
        .then(config => deviceUtil.decryptAllSecrets(config))
        .then((configs) => {
            if (configs.length === 0) {
                // unexpected, something went wrong
                throw new errors.ObjectNotFoundInConfigError(`No System or System Poller with name '${sysOrPollerName}' configured`);
            }
            configs = configs.filter(c => c.enable || includeDisabled);
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
    const promise = decryptSecrets ? deviceUtil.decryptAllSecrets(pollerConfigs)
        : Promise.resolve(pollerConfigs);

    return promise
        .then((decryptedConf) => {
            const processPollers = decryptedConf.map(pollerConf => safeProcess(pollerConf, { requestFromUser: true })
                .catch(err => caughtErrors.push(err)));
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
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in systemPoller');
    // timestamp to find out-dated tracers
    const tracersTimestamp = new Date().getTime();

    applyConfig(util.deepCopy(config));
    // remove tracers that were not touched
    util.tracer.remove(tracer => tracer.name.startsWith(TRACER_CLASS_NAME)
        && tracer.lastGetTouch < tracersTimestamp);

    logger.debug(`${Object.keys(getPollerTimers()).length} system poller(s) running`);
});


module.exports = {
    NoPollersError,
    applyConfig,
    findSystemOrPollerConfigs,
    fetchPollersData,
    getPollersConfig,
    getPollerTimers,
    process,
    safeProcess
};
