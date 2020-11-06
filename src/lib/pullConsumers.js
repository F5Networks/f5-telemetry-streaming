/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const path = require('path');

const configWorker = require('./config');
const constants = require('./constants');
const util = require('./util');
const systemPoller = require('./systemPoller');
const errors = require('./errors');
const logger = require('./logger');
const configUtil = require('./configUtil');

const PULL_CONSUMERS_DIR = constants.PULL_CONSUMERS_DIR;
const CLASS_NAME = constants.CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME;
let PULL_CONSUMERS = {};

class ModuleNotLoadedError extends errors.ConfigLookupError {}
class DisabledError extends errors.ConfigLookupError {}

/**
 * Get data for Pull Consumer
 *
 * @param {String} consumerName - consumer name
 */
function getData(consumerName) {
    let config; // to pass to systemPoller
    let consumerConfig;

    return configWorker.getConfig()
        .then((curConfig) => {
            // config was copied by getConfig already
            config = curConfig;

            consumerConfig = getConsumerConfig(config.normalized, consumerName);
            // Don't bother collecting stats if requested Consumer Type is not loaded
            if (typeof PULL_CONSUMERS[consumerConfig.type] === 'undefined') {
                throw new ModuleNotLoadedError(`Pull Consumer of type '${consumerConfig.type}' is not loaded`);
            }
            // TODO: again need to update when namespace is supported in path
            const pollerConfigs = getEnabledPollersForConsumer(config.normalized, consumerConfig.id);
            return systemPoller.fetchPollersData(util.deepCopy(pollerConfigs), true);
        })
        .then(pollerData => invokeConsumer(consumerConfig, pollerData));
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
    const consumer = PULL_CONSUMERS[consumerConfig.type];

    const context = {
        config: consumerConfig,
        event: dataCtxs,
        logger: consumer.logger,
        tracer: consumer.tracer
    };
    return consumer.consumer(context);
}

function getEnabledPollersForConsumer(config, consumerId) {
    const pollerIds = config.mappings[consumerId];
    return config.components.filter(c => pollerIds.indexOf(c.id) > -1 && c.enable);
}


function getConsumerConfig(config, consumerName) {
    const consumers = configUtil.getTelemetryPullConsumers(config);
    // TODO: update when we support namespace in path
    if (consumers.length > 0) {
        const consumer = consumers.find(c => c.name === consumerName);
        if (util.isObjectEmpty(consumer)) {
            throw new errors.ObjectNotFoundInConfigError(`Pull Consumer with name '${consumerName}' doesn't exist`);
        }
        if (consumer.enable === false) {
            throw new DisabledError(`Pull Consumer with name '${consumerName}' is disabled`);
        }
        return consumer;
    }

    throw new errors.ObjectNotFoundInConfigError('No configured Pull Consumers found');
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
    const enabledConsumers = config.filter(c => c.enable);
    if (enabledConsumers.length === 0) {
        logger.debug('No enabled pull consumer(s) to load');
        return Promise.resolve([]);
    }

    logger.debug(`Loading pull consumer specific plug-ins from ${PULL_CONSUMERS_DIR}`);

    const loadPromises = enabledConsumers.map(consumerConfig => new Promise((resolve) => {
        const consumerType = consumerConfig.type;
        // path.join removes './' from string, so we need to
        // prepend it manually
        const consumerDir = './'.concat(path.join(PULL_CONSUMERS_DIR, consumerType));

        logger.debug(`Loading pull consumer ${consumerType} plug-in from ${consumerDir}`);
        const consumerModule = util.moduleLoader.load(consumerDir);
        if (consumerModule === null) {
            resolve(undefined);
        } else {
            const consumer = {
                name: consumerConfig.name,
                config: util.deepCopy(consumerConfig),
                consumer: consumerModule,
                logger: logger.getChild(`${consumerType}.${consumerConfig.traceName}`),
                tracer: util.tracer.createFromConfig(CLASS_NAME, consumerConfig.traceName, consumerConfig)
            };
            // copy consumer's data
            resolve(consumer);
        }
    }));

    return Promise.all(loadPromises)
        .then(loadedConsumers => loadedConsumers.filter(c => c !== undefined));
}

/**
 * Unload unused modules from cache
 *
 * @param {Set} before - set of Consumers' types before
 */
function unloadUnusedModules(before) {
    const previousTypes = Object.keys(before);
    if (previousTypes.length === 0) {
        return;
    }
    const currentPullConsumers = Object.keys(PULL_CONSUMERS);
    previousTypes.forEach((consumerType) => {
        if (currentPullConsumers.indexOf(consumerType) === -1) {
            logger.debug(`Unloading Pull Consumer module '${consumerType}'`);
            const consumerDir = './'.concat(path.join(PULL_CONSUMERS_DIR, consumerType));

            util.moduleLoader.unload(consumerDir);
        }
    });
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in Pull Consumers');

    // TODO: once Pull Consumers can accept 'normalized' configuration, update
    // (where config will just be the normalized config)
    const consumersToLoad = configUtil.getTelemetryPullConsumers(config.normalized);
    // timestamp to filed out-dated tracers
    const tracersTimestamp = new Date().getTime();

    const typesBefore = PULL_CONSUMERS;

    return loadConsumers(consumersToLoad)
        .then((consumers) => {
            PULL_CONSUMERS = {};
            consumers.forEach((consumer) => {
                PULL_CONSUMERS[consumer.config.type] = consumer;
            });
            logger.info(`${Object.keys(PULL_CONSUMERS).length} pull consumer plug-in(s) loaded`);
        })
        .catch((err) => {
            logger.exception('Unhandled exception when loading consumers', err);
        })
        .then(() => {
            unloadUnusedModules(typesBefore);
            util.tracer.remove(tracer => tracer.name.startsWith(CLASS_NAME)
                && tracer.lastGetTouch < tracersTimestamp);
        });
});

module.exports = {
    ModuleNotLoadedError,
    DisabledError,
    getData,
    getConsumers: () => PULL_CONSUMERS // expose for testing
};
