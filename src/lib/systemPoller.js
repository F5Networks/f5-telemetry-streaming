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
const logger = require('./logger'); // eslint-disable-line no-unused-vars
const normalizeConfig = require('./normalizeConfig');
const SystemStats = require('./systemStats');
const util = require('./util');

/** @module systemPoller */

const CONFIG_CLASSES = constants.CONFIG_CLASSES;
// use SYSTEM_POLLER_CLASS_NAME to keep compatibility with previous versions
// but it is possible use SYSTEM_CLASS_NAME instead too
const TRACER_CLASS_NAME = CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME;
// key - poller name, value - timer ID
const POLLER_TIMERS = {};

function getPollerTimers() {
    return POLLER_TIMERS;
}

function getTelemetryObjects(originalConfig, className) {
    return originalConfig[className] || {};
}

function getTelemetrySystems(originalConfig) {
    return getTelemetryObjects(originalConfig, CONFIG_CLASSES.SYSTEM_CLASS_NAME);
}

function getTelemetrySystemPollers(originalConfig) {
    return getTelemetryObjects(originalConfig, CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME);
}

function getTelemetryConsumers(originalConfig) {
    return getTelemetryObjects(originalConfig, CONFIG_CLASSES.CONSUMER_CLASS_NAME);
}

function createCustomConfig(originalConfig, sysOrPollerName, pollerName) {
    // originalConfig is not normalized yet
    let systems = getTelemetrySystems(originalConfig);
    let pollers = getTelemetrySystemPollers(originalConfig);
    let system;
    let poller;

    if (sysOrPollerName && pollerName) {
        system = systems[sysOrPollerName];
        poller = pollers[pollerName];
    } else {
        // each object has unique name across the entire declaration.
        // so, one of them will be 'undefined'
        system = systems[sysOrPollerName];
        poller = pollers[sysOrPollerName];
    }

    const systemFound = !util.isObjectEmpty(system);
    const pollerFound = !util.isObjectEmpty(poller);
    // check for errors at first
    if (!systemFound || !pollerFound) {
        if (pollerName) {
            // sysOrPollerName and pollerName both passed to the function
            if (!systemFound) {
                throw new Error(`System with name '${sysOrPollerName}' doesn't exist`);
            }
            if (!pollerFound) {
                throw new Error(`System Poller with name '${pollerName}' doesn't exist`);
            }
        }
        if (!(systemFound || pollerFound)) {
            throw new Error(`System or System Poller with name '${sysOrPollerName}' doesn't exist`);
        }
        if (systemFound && util.isObjectEmpty(system.systemPoller)) {
            throw new Error(`System with name '${sysOrPollerName}' has no System Poller configured`);
        }
    }
    // error check passed and now we have valid objects to continue with
    if (systemFound && pollerFound) {
        systems = { [sysOrPollerName]: system };
        pollers = { [pollerName]: poller };
        system.systemPoller = pollerName;
    } else if (pollerFound) {
        systems = {};
        pollers = { [sysOrPollerName]: poller };
    } else {
        const newPollers = {};
        systems = { [sysOrPollerName]: system };

        system.systemPoller = Array.isArray(system.systemPoller) ? system.systemPoller
            : [system.systemPoller];

        system.systemPoller.forEach((pollerVal) => {
            if (typeof pollerVal === 'string') {
                newPollers[pollerVal] = pollers[pollerVal];
            }
        });
        pollers = newPollers;
    }
    originalConfig[CONFIG_CLASSES.SYSTEM_CLASS_NAME] = systems;
    originalConfig[CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME] = pollers;
    return originalConfig;
}

/**
 * Compute trace's value from System and System Poller config
 *
 * @param {Boolean|String} [systemTrace] - system's trace config
 * @param {Boolean|String} [pollerTrace] - poller's trace config
 *
 * @returns {Boolean|String} trace's value
 */
function getTraceValue(systemTrace, pollerTrace) {
    if (typeof systemTrace === 'undefined' && typeof pollerTrace === 'undefined') {
        pollerTrace = false;
    } else {
        // we know that one of the values is defined (or both)
        // set default value to true to do not block tracer usage
        systemTrace = typeof systemTrace === 'undefined' ? true : systemTrace;
        pollerTrace = typeof pollerTrace === 'undefined' ? true : pollerTrace;
        if (typeof pollerTrace === 'string') {
            // preserve poller's value
            pollerTrace = systemTrace && pollerTrace;
        } else if (pollerTrace === true) {
            // preserve system's value
            pollerTrace = systemTrace;
        }
    }
    return pollerTrace;
}

function createPollerConfig(systemConfig, pollerConfig, fetchTMStats) {
    return {
        name: `${systemConfig.name}::${pollerConfig.name}`,
        enable: Boolean(systemConfig.enable && pollerConfig.enable),
        trace: module.exports.getTraceValue(systemConfig.trace, pollerConfig.trace),
        interval: pollerConfig.interval,
        connection: {
            host: systemConfig.host,
            port: systemConfig.port,
            protocol: systemConfig.protocol,
            allowSelfSignedCert: systemConfig.allowSelfSignedCert
        },
        credentials: {
            username: systemConfig.username,
            passphrase: systemConfig.passphrase
        },
        dataOpts: {
            tags: pollerConfig.tag,
            actions: pollerConfig.actions,
            noTMStats: !fetchTMStats
        },
        endpointList: pollerConfig.endpointList
    };
}

function getEnabledPollerConfigs(systemObj, fetchTMStats, includeDisabled) {
    const pollers = [];
    if (systemObj.enable || includeDisabled) {
        systemObj.systemPollers.forEach((pollerConfig) => {
            if (pollerConfig.enable || includeDisabled) {
                const newPollerConfig = module.exports.createPollerConfig(systemObj, pollerConfig, fetchTMStats);
                pollers.push(newPollerConfig);
            }
        });
    }
    return pollers;
}

function hasSplunkLegacy(originalConfig) {
    const consumers = getTelemetryConsumers(originalConfig);
    return Object.keys(consumers).some(consumerKey => consumers[consumerKey].type === 'Splunk'
        && consumers[consumerKey].format === 'legacy');
}

function applyConfig(originalConfig) {
    const systems = getTelemetrySystems(originalConfig);
    const fetchTMStats = hasSplunkLegacy(originalConfig);
    const newPollerIDs = [];
    const currPollerIDs = module.exports.getPollerTimers();

    Object.keys(systems).forEach((systemName) => {
        module.exports.getEnabledPollerConfigs(systems[systemName], fetchTMStats).forEach((pollerConfig) => {
            newPollerIDs.push(pollerConfig.name);
            pollerConfig.tracer = util.tracer.createFromConfig(
                TRACER_CLASS_NAME, pollerConfig.name, pollerConfig
            );
            const baseMsg = `system poller ${pollerConfig.name}. Interval = ${pollerConfig.interval} sec.`;
            if (currPollerIDs[pollerConfig.name]) {
                logger.info(`Updating ${baseMsg}`);
                currPollerIDs[pollerConfig.name] = util.update(
                    currPollerIDs[pollerConfig.name], module.exports.safeProcess, pollerConfig, pollerConfig.interval
                );
            } else {
                logger.info(`Starting ${baseMsg}`);
                currPollerIDs[pollerConfig.name] = util.start(
                    module.exports.safeProcess, pollerConfig, pollerConfig.interval
                );
            }
        });
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
                isCustom: systemStats.isCustom
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
 * Process client's request via REST API
 *
 * @param {Object} restOperation - request object
 */
function processClientRequest(restOperation) {
    // only GET requests allowed
    // allowed URIs:
    // - shared/telemetry/systempoller/systemName
    // - shared/telemetry/systempoller/systemPollerName
    // - shared/telemetry/systempoller/systemName/systemPollerName
    const parts = restOperation.getUri().pathname.split('/');
    const objName = (parts[4] || '').trim();
    const subObjName = (parts[5] || '').trim();

    (new Promise((resolve, reject) => {
        if (objName === '') {
            const err = new Error('Bad Request. Name for System or System Poller was not specified.');
            err.responseCode = 400;
            reject(err);
        } else {
            resolve();
        }
    }))
        .then(() => configWorker.getConfig())
        .then((config) => {
            // config was copied by getConfig already
            // before calling normalizeConfig we have to create custom config
            try {
                return module.exports.createCustomConfig(config.parsed, objName, subObjName);
            } catch (err) {
                err.responseCode = 404;
                return Promise.reject(err);
            }
        })
        .then(config => deviceUtil.decryptAllSecrets(config))
        .then((config) => {
            const system = getTelemetrySystems(normalizeConfig(config))[objName];
            if (util.isObjectEmpty(system.systemPollers)) {
                // unexpected, something went wrong
                const err = new Error(`System '${objName}' has no System Poller(s) configured`);
                err.responseCode = 404;
                return Promise.reject(err);
            }

            const pollers = module.exports.getEnabledPollerConfigs(system, false, true)
                .map(pollerConfig => module.exports.safeProcess(pollerConfig, { requestFromUser: true }));
            return Promise.all(pollers);
        })
        .then((dataCtx) => {
            util.restOperationResponder(restOperation, 200, dataCtx.map(d => d.data));
        })
        .catch((error) => {
            let message;
            let code;

            if (error.responseCode !== undefined) {
                code = error.responseCode;
                message = `${error}`;
            } else {
                message = `${error}`;
                code = 500;
                logger.exception(`poller request ended up with error: ${message}`, error);
            }
            util.restOperationResponder(restOperation, code, { code, message });
        });
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in systemPoller');
    // timestamp to find out-dated tracers
    const tracersTimestamp = new Date().getTime();
    // copy, normalize and apply config
    module.exports.applyConfig(normalizeConfig(util.deepCopy(config || {})));
    // remove tracers that were not touched
    util.tracer.remove(tracer => tracer.name.startsWith(TRACER_CLASS_NAME)
        && tracer.lastGetTouch < tracersTimestamp);

    logger.debug(`${Object.keys(module.exports.getPollerTimers()).length} system poller(s) running`);
});


module.exports = {
    applyConfig,
    createCustomConfig,
    createPollerConfig,
    getEnabledPollerConfigs,
    getPollerTimers,
    getTraceValue,
    process,
    processClientRequest,
    safeProcess
};
