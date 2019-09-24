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
const util = require('./util.js');
const deviceUtil = require('./deviceUtil.js');
const configWorker = require('./config.js');
const SystemStats = require('./systemStats.js');
const dataPipeline = require('./dataPipeline.js');
const dataTagging = require('./dataTagging');

const SYSTEM_CLASS_NAME = constants.SYSTEM_CLASS_NAME;
const SYSTEM_POLLER_CLASS_NAME = constants.SYSTEM_POLLER_CLASS_NAME;
const pollerIDs = {};

/** @module systemPoller */

/**
 * Process system(s) stats
 *
 * @param {Object}   args                     - args object
 * @param {Object}   args.config              - system config
 * @param {Boolean}  [args.process]           - determine whether to process through pipeline
 * @param {module:util~Tracer} [args.tracer]  - tracer to write to disk
 *
 * @returns {Promise} Promise which is resolved with data sent
 */
function process(args) {
    const config = args.config;
    const tracer = args.tracer;

    const startTimestamp = new Date().toISOString();
    logger.debug('System poller cycle started');

    return new SystemStats(config.host, config.options).collect()
        .then((data) => {
            const endTimeStamp = new Date().toISOString();
            // inject service data
            const telemetryServiceInfo = {
                pollingInterval: args.interval,
                cycleStart: startTimestamp,
                cycleEnd: endTimeStamp
            };
            data.telemetryServiceInfo = telemetryServiceInfo;
            data.telemetryEventCategory = constants.EVENT_TYPES.SYSTEM_POLLER;
            // end inject service data

            if (config.options.actions) {
                dataTagging.handleActions(data, config.options.actions);
            }

            if (tracer) {
                tracer.write(JSON.stringify(data, null, 4));
            }
            let ret = null;
            if (args.process === false) {
                ret = Promise.resolve(data);
            } else {
                // call out to pipeline
                dataPipeline.process(data, constants.EVENT_TYPES.SYSTEM_POLLER);
            }
            logger.debug('System poller cycle finished');
            return ret;
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
    try {
        // eslint-disable-next-line
        return process.apply(null, arguments)
            .catch((err) => {
                logger.exception('systemPoller:safeProcess unhandled exception in promise-chain', err);
            });
    } catch (err) {
        logger.exception('systemPoller:safeProcess unhandled exception', err);
        return Promise.reject(new Error(`systemPoller:safeProcess unhandled exception: ${err}`));
    }
}

/**
 * Process client's request via REST API
 *
 * @param {Object} restOperation - request object
 */
function processClientRequest(restOperation) {
    // allowed URIs:
    // - shared/telemetry/systempoller/systemName
    // - shared/telemetry/systempoller/systemPollerName
    // - shared/telemetry/systempoller/systemName/systemPollerName
    const parts = restOperation.getUri().pathname.split('/');
    const objName = parts[4];
    const subObjName = parts[5];

    if (!objName) {
        util.restOperationResponder(restOperation, 400,
            { code: 400, message: 'Bad Request. System\'s or System Poller\'s name not specified.' });
        return;
    }
    configWorker.getConfig()
        .then((config) => {
            config = config.parsed;
            const systems = config[SYSTEM_CLASS_NAME] || {};
            const systemPollers = config[SYSTEM_POLLER_CLASS_NAME] || {};

            let system;
            let systemPoller;

            if (objName && subObjName) {
                system = systems[objName];
                systemPoller = systemPollers[subObjName];
            } else if (!util.isObjectEmpty(systemPollers[objName])) {
                systemPoller = systemPollers[objName];
                system = systemPoller;
            } else if (!util.isObjectEmpty(systems[objName])) {
                system = systems[objName];
                if (typeof system.systemPoller === 'string') {
                    systemPoller = systemPollers[system.systemPoller];
                } else if (system.systemPoller) {
                    systemPoller = system.systemPoller;
                }
            }
            if (!(system && systemPoller)) {
                const error = new Error('System Poller declaration not found.');
                error.responseCode = 404;
                return Promise.reject(error);
            }
            return Promise.resolve([system, systemPoller]);
        })
        .then((configs) => {
            const system = configs[0];
            const systemPoller = configs[1];

            if (system.class === SYSTEM_POLLER_CLASS_NAME) {
                return Promise.all([
                    deviceUtil.decryptAllSecrets(system),
                    Promise.resolve(systemPoller)
                ]);
            }
            return Promise.all([
                deviceUtil.decryptAllSecrets(system),
                deviceUtil.decryptAllSecrets(systemPoller)
            ]);
        })
        .then((configs) => {
            const config = mergeConfigs(configs[0], configs[1]);
            config.process = false;
            return safeProcess(config);
        })
        .then(data => util.restOperationResponder(restOperation, 200, data))
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
 * Merge configs
 *
 * @private
 *
 * @param {Object} system - System declaration
 * @param {Object} systemPoller - System Poller declaration
 *
 * @returns {Object} config
 */
function mergeConfigs(system, systemPoller) {
    return {
        enable: Boolean(system.enable && systemPoller.enable),
        trace: Boolean(system.trace && systemPoller.trace),
        interval: systemPoller.interval,
        config: {
            host: system.host,
            options: {
                connection: {
                    port: system.port,
                    protocol: system.protocol,
                    allowSelfSignedCert: system.allowSelfSignedCert
                },
                credentials: {
                    username: system.username,
                    passphrase: system.passphrase
                },
                tags: systemPoller.tag,
                actions: systemPoller.actions
            }
        }
    };
}

/**
 * Build config for provided key
 *
 * @private
 *
 * @param {Object} systems       - System declarations
 * @param {Object} systemPollers - System Poller declarations
 * @param {String} key           - key to build config for
 *
 * @returns {Object} config
 */
function buildConfig(systems, systemPollers, key) {
    let systemPoller;
    let name = key;
    let system = systems[key];

    if (!util.isObjectEmpty(system)) {
        if (typeof system.systemPoller === 'string') {
            name = `${name}_${system.systemPoller}`;
            systemPoller = systemPollers[system.systemPoller];
        } else {
            name = `${name}_System_Poller`;
            systemPoller = system.systemPoller;
        }
    } else {
        systemPoller = systemPollers[key];
        system = systemPoller;
    }
    if (!(system && systemPoller)) {
        // somehow it happen
        return null;
    }
    const config = mergeConfigs(system, systemPoller);
    config.name = name;
    return config;
}


// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in systemPoller'); // helpful debug

    config = config || {};
    const systems = config[SYSTEM_CLASS_NAME] || {};
    const systemPollers = config[SYSTEM_POLLER_CLASS_NAME] || {};
    const validPollerIDs = [];
    const objectsToIter = {};
    const usedSystemPollers = [];

    Object.keys(systems).forEach((sysKey) => {
        const system = systems[sysKey];
        objectsToIter[sysKey] = system;

        if (typeof system.systemPoller === 'string') {
            usedSystemPollers.push(system.systemPoller);
        }
    });
    Object.keys(systemPollers).forEach((sysKey) => {
        objectsToIter[sysKey] = systemPollers[sysKey];
    });

    // timestamp to find out-dated tracers
    const tracersTimestamp = new Date().getTime();

    Object.keys(objectsToIter).forEach((key) => {
        // silently skip System Pollers
        // that are in use by System already
        if (usedSystemPollers.indexOf(key) !== -1) {
            return;
        }

        const spConfig = buildConfig(systems, systemPollers, key);
        if (util.isObjectEmpty(spConfig) || !spConfig.enable) {
            return;
        }

        validPollerIDs.push(spConfig.name);
        spConfig.tracer = util.tracer.createFromConfig(
            SYSTEM_POLLER_CLASS_NAME, spConfig.name, spConfig
        );

        const baseMsg = `system poller ${spConfig.name}. Interval = ${spConfig.interval} sec.`;
        if (pollerIDs[spConfig.name]) {
            logger.info(`Updating ${baseMsg}`);
            pollerIDs[spConfig.name] = util.update(
                pollerIDs[spConfig.name], safeProcess, spConfig, spConfig.interval
            );
        } else {
            logger.info(`Starting ${baseMsg}`);
            pollerIDs[spConfig.name] = util.start(
                safeProcess, spConfig, spConfig.interval
            );
        }
    });

    Object.keys(pollerIDs).forEach((key) => {
        if (validPollerIDs.indexOf(key) === -1) {
            logger.info(`Disabling system poller ${key}`);
            util.stop(pollerIDs[key]);
            delete pollerIDs[key];
        }
    });

    util.tracer.remove(null, tracer => tracer.name.startsWith(SYSTEM_POLLER_CLASS_NAME)
                                       && tracer.lastGetTouch < tracersTimestamp);

    logger.debug(`${Object.keys(pollerIDs).length} system poller(s) running`);
});


module.exports = {
    process,
    processClientRequest
};
