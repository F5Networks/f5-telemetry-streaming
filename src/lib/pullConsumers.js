/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const path = require('path');

const configWorker = require('./config');
const constants = require('./constants');
const util = require('./utils/misc');
const systemPoller = require('./systemPoller');
const errors = require('./errors');
const logger = require('./logger');
const configUtil = require('./utils/config');
const tracers = require('./utils/tracer');
const moduleLoader = require('./utils/moduleLoader').ModuleLoader;

const PULL_CONSUMERS_DIR = '../pullConsumers';
let PULL_CONSUMERS = [];

class ModuleNotLoadedError extends errors.ConfigLookupError {}
class DisabledError extends errors.ConfigLookupError {}

/**
 * Get data for Pull Consumer
 *
 * @param {String} consumerName - consumer name
 * @param {String} namespace - optional namespace
 */
function getData(consumerName, namespace) {
    let config; // to pass to systemPoller
    let consumerConfig;
    namespace = namespace || constants.DEFAULT_UNNAMED_NAMESPACE;
    return Promise.resolve()
        .then(() => {
            // config was copied by getConfig already
            config = configWorker.currentConfig;

            consumerConfig = getConsumerConfig(config, consumerName, namespace);
            // Don't bother collecting stats if requested Consumer Type is not loaded
            if (!PULL_CONSUMERS.find((pc) => pc.config.type === consumerConfig.type)) {
                throw new ModuleNotLoadedError(`Pull Consumer of type '${consumerConfig.type}' is not loaded`);
            }

            const pollerGroup = configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
                config,
                consumerConfig
            );
            const pollerConfigs = configUtil.getTelemetrySystemPollersForGroup(config, pollerGroup)
                .filter((sp) => sp.enable);

            return systemPoller.fetchPollersData(util.deepCopy(pollerConfigs), true);
        })
        .then((pollerData) => invokeConsumer(consumerConfig, pollerData));
}

/**
 * Invoke the Consumer's processing.
 * Sends the 'raw' data collected from System Poller(s) to the configured Pull Consumer.
 * Gets data from the Pull Consumer, after Pull Consumer's formatting logic has been applied.
 *
 * @param {Object}  consumerConfig   - Configuration of Pull Consumer
 * @param {Array}   dataCtxs         - Complete array of dataCtx objects from associated System Poller(s)
 *
 * @returns {Promise} Promise which is resolved with data formatted by the requested Pull Consumer
 */
function invokeConsumer(consumerConfig, dataCtxs) {
    const consumer = PULL_CONSUMERS.find((pc) => pc.id === consumerConfig.id);

    const context = {
        config: consumerConfig,
        event: dataCtxs,
        logger: consumer.logger,
        tracer: consumer.tracer
    };
    return consumer.consumer(context);
}

function getConsumerConfig(config, consumerName, namespace) {
    const consumers = configUtil.getTelemetryPullConsumers(config, namespace);
    const namespaceInfo = namespace ? ` (namespace: ${namespace})` : '';
    if (consumers.length > 0) {
        const consumer = consumers.find((c) => c.name === consumerName);
        if (util.isObjectEmpty(consumer)) {
            throw new errors.ObjectNotFoundInConfigError(`Pull Consumer with name '${consumerName}' doesn't exist${namespaceInfo}`);
        }
        if (consumer.enable === false) {
            throw new DisabledError(`Pull Consumer with name '${consumerName}' is disabled${namespaceInfo}`);
        }
        return consumer;
    }

    throw new errors.ObjectNotFoundInConfigError(`No configured Pull Consumers found${namespaceInfo}`);
}

/**
* Load plugins for requested pull consumers
*
* @param {Object} config - config object
* @param {Array} config.consumers - array of pull consumers to load
* @param {string} config.consumers[].consumer - pull consumer name/type
*
* @returns {Object} Promise object with resolves with array of
                    loaded plugins. Looks like following:
                    [
                        {
                            consumer: function(context),
                            config: [object]
                        },
                        ...
                    ]
*/
function loadConsumers(config) {
    if (config.length === 0) {
        logger.info('No pull consumer(s) to load, define in configuration first');
        return Promise.resolve([]);
    }
    const enabledConsumers = config.filter((c) => c.enable);
    if (enabledConsumers.length === 0) {
        logger.debug('No enabled pull consumer(s) to load');
        return Promise.resolve([]);
    }

    logger.debug(`Loading pull consumer specific plug-ins from ${PULL_CONSUMERS_DIR}`);

    const loadPromises = enabledConsumers.map((consumerConfig) => new Promise((resolve) => {
        const existingConsumer = PULL_CONSUMERS.find((c) => c.id === consumerConfig.id);
        if (consumerConfig.skipUpdate && existingConsumer) {
            resolve(existingConsumer);
        } else {
            const consumerType = consumerConfig.type;
            const consumerDir = path.join(PULL_CONSUMERS_DIR, consumerType);

            logger.debug(`Loading pull consumer ${consumerType} plug-in from ${consumerDir}`);
            const consumerModule = moduleLoader.load(consumerDir);
            if (consumerModule === null) {
                resolve(undefined);
            } else {
                const consumer = {
                    name: consumerConfig.name,
                    id: consumerConfig.id,
                    config: util.deepCopy(consumerConfig),
                    consumer: consumerModule,
                    logger: logger.getChild(`${consumerType}.${consumerConfig.traceName}`),
                    tracer: tracers.fromConfig(consumerConfig.trace)
                };
                // copy consumer's data
                resolve(consumer);
            }
        }
    }));

    return Promise.all(loadPromises)
        .then((loadedConsumers) => loadedConsumers.filter((c) => c !== undefined));
}

/**
 * Get set of loaded Consumers' types
 *
 * @returns {Set} set with loaded Consumers' types
 */
function getLoadedConsumerTypes() {
    if (PULL_CONSUMERS.length > 0) {
        return new Set(PULL_CONSUMERS.map((consumer) => consumer.config.type));
    }
    return new Set();
}

/**
 * Unload unused modules from cache
 *
 * @param {Set} before - set of Consumers' types before
 */
function unloadUnusedModules(before) {
    if (!before.size) {
        return;
    }

    const loadedTypes = getLoadedConsumerTypes();
    before.forEach((consumerType) => {
        if (!loadedTypes.has(consumerType)) {
            logger.debug(`Unloading Pull Consumer module '${consumerType}'`);
            const consumerDir = path.join(PULL_CONSUMERS_DIR, consumerType);

            moduleLoader.unload(consumerDir);
        }
    });
}

// config worker change event
configWorker.on('change', (config) => Promise.resolve()
    .then(() => {
        logger.debug('configWorker change event in Pull Consumers');

        const consumersToLoad = configUtil.getTelemetryPullConsumers(config);
        const typesBefore = getLoadedConsumerTypes();

        return loadConsumers(consumersToLoad)
            .then((consumers) => {
                PULL_CONSUMERS = consumers;
                logger.info(`${PULL_CONSUMERS.length} pull consumer plug-in(s) loaded`);
            })
            .catch((err) => {
                logger.exception('Unhandled exception when loading consumers', err);
            })
            .then(() => unloadUnusedModules(typesBefore));
    }));

module.exports = {
    ModuleNotLoadedError,
    DisabledError,
    getData,
    getConsumers: () => PULL_CONSUMERS // expose for testing
};
