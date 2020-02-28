/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger'); // eslint-disable-line no-unused-vars
const constants = require('./constants');
const util = require('./util');
const deviceUtil = require('./deviceUtil');
const configWorker = require('./config');
const SystemStats = require('./systemStats');
const dataPipeline = require('./dataPipeline');


const CONSUMER_CLASS_NAME = constants.CONFIG_CLASSES.CONSUMERS_CLASS_NAME;
const ENDPOINTS_CLASS_NAME = constants.CONFIG_CLASSES.ENDPOINTS_CLASS_NAME;
const SYSTEM_CLASS_NAME = constants.CONFIG_CLASSES.SYSTEM_CLASS_NAME;
const SYSTEM_POLLER_CLASS_NAME = constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME;

const pollerIDs = {};

/** @module systemPoller */

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
            try {
                return module.exports.getExpandedConfWithNameRefs(config.parsed, objName, subObjName);
            } catch (err) {
                err.responseCode = 400;
                return Promise.reject(err);
            }
        })
        .then(config => deviceUtil.decryptAllSecrets(config))
        .then(config => Promise.resolve(buildPollerConfigs(config)))
        .then((configs) => {
            // system can have multiple pollers
            const config = configs[objName]
                .map(pollerConfig => module.exports.safeProcess(pollerConfig, { requestFromUser: true }));
            return Promise.all(config);
        })
        .then((dataCtx) => {
            const body = dataCtx.length === 1 ? dataCtx[0].data : dataCtx.map(d => d.data);
            util.restOperationResponder(restOperation, 200, body);
        })
        .catch((error) => {
            let message;
            let code;

            if (error.responseCode !== undefined) {
                code = error.responseCode;
                message = `${error}`;
            } else {
                logger.error(`poller request ended up with error: ${error}`);
                code = 500;
                message = `systemPoller.process error: ${error}`;
            }
            util.restOperationResponder(restOperation, code, { code, message });
        });
}

/**
 *
 * Returns a copy of the config wherein the name references to system pollers are resolved
 *
 * @param {Object} origConfig - Config to copy and expand
 * @param {String} sysOrPollerName - System or System Poller name to look up
 * @param {String} systemPollerName - System Poller name to look up, optional
 * @returns
 */
function getExpandedConfWithNameRefs(origConfig, sysOrPollerName, systemPollerName) {
    // copy here because origConfig needs to be preserved for proper lookup
    const expandedConfig = util.deepCopy(origConfig);
    let systems = expandedConfig[SYSTEM_CLASS_NAME] || {};
    let systemPollers = expandedConfig[SYSTEM_POLLER_CLASS_NAME] || {};

    if (sysOrPollerName && systemPollerName) {
        if (!util.isObjectEmpty(systems[sysOrPollerName]) && !util.isObjectEmpty(systemPollers[systemPollerName])) {
            const system = systems[sysOrPollerName];
            // attach desired System Poller to System
            system.systemPoller = systemPollerName;
            systems = { [sysOrPollerName]: system };
            systemPollers = { [systemPollerName]: systemPollers[systemPollerName] };
        } else {
            throw new Error(`System with name '${sysOrPollerName}' and System Poller with name '${systemPollerName}' don't exist`);
        }
    } else if (!util.isObjectEmpty(systemPollers[sysOrPollerName])) {
        systems = null;
        systemPollers = { [sysOrPollerName]: systemPollers[sysOrPollerName] };
    } else if (!util.isObjectEmpty(systems[sysOrPollerName])) {
        const system = systems[sysOrPollerName];
        systems = { [sysOrPollerName]: system };

        if (typeof system.systemPoller === 'string') {
            systemPollers = { [system.systemPoller]: systemPollers[system.systemPoller] };
        } else if (util.isObjectEmpty(system.systemPoller)) {
            throw new Error(`System with name '${sysOrPollerName}' has no System Poller configured`);
        } else if (Array.isArray(system.systemPoller)) {
            const newPollers = {};
            system.systemPoller.forEach((pollerItem) => {
                if (typeof pollerItem === 'string') {
                    newPollers[pollerItem] = systemPollers[pollerItem];
                }
            });
            systemPollers = util.isObjectEmpty(newPollers) ? null : newPollers;
        } else {
            systemPollers = null;
        }
    } else {
        throw new Error(`System with name '${sysOrPollerName}' or System Poller with name '${sysOrPollerName}' don't exist`);
    }

    if (systems) {
        expandedConfig[SYSTEM_CLASS_NAME] = systems;
    } else {
        delete expandedConfig[SYSTEM_CLASS_NAME];
    }
    if (systemPollers) {
        expandedConfig[SYSTEM_POLLER_CLASS_NAME] = systemPollers;
    } else {
        delete expandedConfig[SYSTEM_POLLER_CLASS_NAME];
    }
    return expandedConfig;
}

function createPollerConfig(system, fetchTMStats) {
    const config = [];
    // trace can be boolean or string (path to file) or undefined
    // when no systemPoller defined
    // TODO: entire block should be re-written and schema should be updated
    // because 'trace' should have no default value
    let trace = system.trace;
    system.systemPoller.forEach((poller) => {
        if (trace && poller.trace) {
            if (typeof poller.trace === 'string') {
                trace = poller.trace;
            }
        } else {
            trace = false;
        }
        config.push({
            enable: Boolean(system.enable && poller.enable),
            trace,
            interval: poller.interval,
            connection: {
                host: system.host,
                port: system.port,
                protocol: system.protocol,
                // TODO: schema should set default value to 'false' instead of undefined
                allowSelfSignedCert: system.allowSelfSignedCert
            },
            credentials: {
                username: system.username,
                passphrase: system.passphrase
            },
            dataOpts: {
                tags: poller.tag,
                actions: poller.actions,
                noTMStats: !fetchTMStats
            },
            endpointList: poller.endpointList
        });
    });
    return config;
}

function expandEndpoints(systems, globalConfig) {
    const endpointsGlobal = globalConfig[ENDPOINTS_CLASS_NAME] || {};

    function computeBasePath(endpoint) {
        let basePath = '';
        if (endpoint.basePath && endpoint.basePath.length > 0) {
            const pathPrefix = endpoint.basePath[0] === '/' ? '' : '/';
            if (endpoint.basePath[endpoint.basePath.length - 1] === '/') {
                basePath = endpoint.basePath.substring(0, endpoint.basePath.length - 1);
            } else {
                basePath = endpoint.basePath;
            }
            basePath = `${pathPrefix}${basePath}`;
        }
        return basePath;
    }

    function parseEndpointItem(endpoint, key) {
        const basePath = computeBasePath(endpoint);
        const innerEndpoint = endpoint.items[key];
        innerEndpoint.enable = endpoint.enable && innerEndpoint.enable;
        const separator = innerEndpoint.path[0] === '/' ? '' : '/';
        innerEndpoint.path = `${basePath}${separator}${innerEndpoint.path}`;
        innerEndpoint.name = innerEndpoint.name || key;
        return innerEndpoint;
    }

    function processEndpoint(endpoint, cb) {
        if (typeof endpoint === 'object') {
            // array of definitions - can be all of the following
            if (Array.isArray(endpoint)) {
                endpoint.forEach(innerEndpoint => processEndpoint(innerEndpoint, cb));
            // endpoint is Telemetry_Endpoints
            } else if (endpoint.class === ENDPOINTS_CLASS_NAME || endpoint.items) {
                const endpKeys = Object.keys(endpoint.items);
                endpKeys.forEach((key) => {
                    const innerEndpoint = parseEndpointItem(endpoint, key);
                    cb(innerEndpoint);
                });
            // endpoint is Telemetry_Endpoint
            } else if (typeof endpoint.path === 'string') {
                endpoint.path = endpoint.path[0] === '/' ? endpoint.path : `/${endpoint.path}`;
                cb(endpoint);
            }
        } else if (typeof endpoint === 'string') {
            const refs = endpoint.split('/');
            // reference to a Telemetry_Endpoints object
            let resolvedObj = endpointsGlobal[refs[0]];
            if (refs.length > 1) {
                // reference to a child of Telemetry_Endpoints.items
                const item = resolvedObj[refs[1]][refs[2]];
                resolvedObj = {
                    items: { [item.name]: item },
                    basePath: resolvedObj.basePath,
                    enable: resolvedObj.enable
                };
            }
            processEndpoint(resolvedObj, cb);
        }
    }

    Object.keys(systems).forEach((systemName) => {
        const system = systems[systemName];
        system.systemPoller.forEach((poller) => {
            const endpoints = {};
            if (poller.endpointList) {
                processEndpoint(poller.endpointList, (endpoint) => {
                    if (endpoint.enable) {
                        endpoints[endpoint.name] = endpoint;
                    } else {
                        logger.debug(`Ignoring disabled endpoint with name "${endpoint.name}" and path "${endpoint.path}"`);
                    }
                });
                poller.endpointList = endpoints;
            }
        });
    });
}

function createSystemFromSystemPoller(systemPoller) {
    const keysToCopy = [
        'allowSelfSignedCert', 'enable', 'enableHostConnectivityCheck', 'host',
        'port', 'protocol', 'passphrase', 'trace', 'username'
    ];
    const skipDelete = ['enable', 'trace'];
    const system = {};

    keysToCopy.forEach((key) => {
        system[key] = systemPoller[key];
        if (skipDelete.indexOf(key) === -1) {
            delete systemPoller[key];
        }
    });
    system.systemPoller = [systemPoller];
    return system;
}

function buildSystems(globalConfig) {
    const systems = globalConfig[SYSTEM_CLASS_NAME] || {};
    const systemPollers = globalConfig[SYSTEM_POLLER_CLASS_NAME] || {};
    const sysPollerNamedRefs = [];

    Object.keys(systems).forEach((systemName) => {
        const system = systems[systemName];
        system.systemPoller = system.systemPoller || {};

        if (typeof system.systemPoller === 'string') {
            // track System Poller referenced by name
            sysPollerNamedRefs.push(system.systemPoller);
            // copy system poller to avoid conflicts later
            // if system poller was shared by several systems
            system.systemPoller = [util.deepCopy(systemPollers[system.systemPoller])];
        }
        if (typeof system.systemPoller === 'object') {
            if (Array.isArray(system.systemPoller)) {
                const pollers = util.deepCopy(system.systemPoller);
                system.systemPoller = [];
                pollers.forEach((poller) => {
                    if (typeof poller === 'string') {
                        sysPollerNamedRefs.push(poller);
                        system.systemPoller.push(util.deepCopy(systemPollers[poller]));
                    } else {
                        system.systemPoller.push(poller);
                    }
                });
            } else {
                system.systemPoller = [system.systemPoller];
            }
        }
    });

    sysPollerNamedRefs.forEach((systemPollerName) => {
        delete systemPollers[systemPollerName];
    });
    Object.keys(systemPollers).forEach((systemPollerName) => {
        systems[systemPollerName] = createSystemFromSystemPoller(systemPollers[systemPollerName]);
    });
    return systems;
}

function hasSplunkLegacy(globalConfig) {
    const consumers = globalConfig[CONSUMER_CLASS_NAME] || {};
    return Object.keys(consumers).some(consumerKey => consumers[consumerKey].type === 'Splunk' && consumers[consumerKey].format === 'legacy');
}

function buildPollerConfigs(globalConfig) {
    const systems = buildSystems(globalConfig);
    expandEndpoints(systems, globalConfig);

    const configs = {};
    const fetchTMStats = hasSplunkLegacy(globalConfig);
    Object.keys(systems).forEach((systemName) => {
        configs[systemName] = createPollerConfig(systems[systemName], fetchTMStats);
    });
    return configs;
}

function getPollerIDs() {
    return pollerIDs;
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in systemPoller');

    config = config || {};
    const systems = config[SYSTEM_CLASS_NAME] || {};
    const systemPollers = config[SYSTEM_POLLER_CLASS_NAME] || {};
    const validPollerIDs = [];
    const sysOrPollerObjs = {};
    let systemPollerRefs = [];

    const currPollerIDs = module.exports.getPollerIDs();

    Object.keys(systems).forEach((sysKey) => {
        const system = systems[sysKey];
        sysOrPollerObjs[sysKey] = system;

        if (typeof system.systemPoller === 'string') {
            systemPollerRefs.push(system.systemPoller);
        } else if (Array.isArray(system.systemPoller)) {
            systemPollerRefs = systemPollerRefs.concat(system.systemPoller.filter(p => typeof p === 'string'));
        }
    });

    Object.keys(systemPollers).forEach((sysPollerKey) => {
        sysOrPollerObjs[sysPollerKey] = systemPollers[sysPollerKey];
    });

    // timestamp to find out-dated tracers
    const tracersTimestamp = new Date().getTime();

    Object.keys(sysOrPollerObjs).forEach((sysOrPollerKey) => {
        // skip System Pollers that are referenced by System already
        if (systemPollerRefs.indexOf(sysOrPollerKey) !== -1) {
            return;
        }

        // for this System or System_Poller, build the config
        const resolvedConfigs = buildPollerConfigs(getExpandedConfWithNameRefs(config, sysOrPollerKey));
        const confName = Object.keys(resolvedConfigs)[0];
        const confArr = resolvedConfigs[confName];

        confArr.forEach((spConfig, index) => {
            if (util.isObjectEmpty(spConfig) || !spConfig.enable) {
                return;
            }
            spConfig.name = confArr.length === 1 ? confName : `${confName}_${index}`;
            validPollerIDs.push(spConfig.name);
            spConfig.tracer = util.tracer.createFromConfig(
                SYSTEM_POLLER_CLASS_NAME, spConfig.name, spConfig
            );

            const baseMsg = `system poller ${spConfig.name}. Interval = ${spConfig.interval} sec.`;
            if (currPollerIDs[spConfig.name]) {
                logger.info(`Updating ${baseMsg}`);
                currPollerIDs[spConfig.name] = util.update(
                    currPollerIDs[spConfig.name], safeProcess, spConfig, spConfig.interval
                );
            } else {
                logger.info(`Starting ${baseMsg}`);
                currPollerIDs[spConfig.name] = util.start(
                    safeProcess, spConfig, spConfig.interval
                );
            }
        });
    });

    Object.keys(currPollerIDs).forEach((key) => {
        if (validPollerIDs.indexOf(key) === -1) {
            logger.info(`Disabling system poller ${key}`);
            util.stop(currPollerIDs[key]);
            delete currPollerIDs[key];
        }
    });

    util.tracer.remove(null, tracer => tracer.name.startsWith(SYSTEM_POLLER_CLASS_NAME)
                                       && tracer.lastGetTouch < tracersTimestamp);

    logger.debug(`${Object.keys(currPollerIDs).length} system poller(s) running`);
});


module.exports = {
    buildPollerConfigs,
    getExpandedConfWithNameRefs,
    process,
    safeProcess,
    processClientRequest,
    getPollerIDs
};
