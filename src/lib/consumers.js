/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const path = require('path');
const logger = require('./logger');
const util = require('./util');
const metadataUtil = require('./metadataUtil');
const constants = require('./constants');
const configWorker = require('./config');
const configUtil = require('./configUtil');
const DataFilter = require('./dataFilter').DataFilter;

const CONSUMERS_DIR = constants.CONSUMERS_DIR;
const CLASS_NAME = constants.CONFIG_CLASSES.CONSUMER_CLASS_NAME;
let CONSUMERS = null;

/**
* Load plugins for requested consumers
*
* @param {Object} config - config object
* @param {Array} config.consumers - array of consumers to load
* @param {string} config.consumers[].consumer - consumer name/type
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
        logger.info('No consumer(s) to load, define in configuration first');
        return Promise.resolve([]);
    }

    const enabledConsumers = config.filter(c => c.enable);
    if (enabledConsumers.length === 0) {
        logger.debug('No enabled consumer(s) to load');
        return Promise.resolve([]);
    }

    logger.debug(`Loading consumer specific plug-ins from ${CONSUMERS_DIR}`);
    const loadPromises = enabledConsumers.map(consumerConfig => new Promise((resolve) => {
        const consumerType = consumerConfig.type;
        // path.join removes './' from string, so we need to
        // prepend it manually
        const consumerDir = './'.concat(path.join(CONSUMERS_DIR, consumerType));
        logger.debug(`Loading consumer ${consumerType} plug-in from ${consumerDir}`);
        const consumerModule = util.moduleLoader.load(consumerDir);
        if (consumerModule === null) {
            resolve(undefined);
        } else {
            const consumer = {
                name: consumerConfig.name,
                id: consumerConfig.id,
                config: util.deepCopy(consumerConfig),
                consumer: consumerModule,
                tracer: util.tracer.createFromConfig(CLASS_NAME, consumerConfig.traceName, consumerConfig),
                filter: new DataFilter(consumerConfig)
            };
            consumer.config.allowSelfSignedCert = consumer.config.allowSelfSignedCert === undefined
                ? !constants.STRICT_TLS_REQUIRED : consumer.config.allowSelfSignedCert;
            metadataUtil.getInstanceMetadata(consumer)
                .then((metadata) => {
                    if (!util.isObjectEmpty(metadata)) {
                        consumer.metadata = metadata;
                    }
                    // copy consumer's data
                    resolve(consumer);
                });
        }
    }));
    return Promise.all(loadPromises)
        .then(loadedConsumers => loadedConsumers.filter(c => c !== undefined));
}

/**
 * Get set of loaded Consumers' types
 *
 * @returns {Set} set with loaded Consumers' types
 */
function getLoadedConsumerTypes() {
    if (CONSUMERS && CONSUMERS.length > 0) {
        return new Set(CONSUMERS.map(consumer => consumer.config.type));
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
            logger.debug(`Unloading Consumer module '${consumerType}'`);
            const consumerDir = './'.concat(path.join(CONSUMERS_DIR, consumerType));

            util.moduleLoader.unload(consumerDir);
        }
    });
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in consumers');

    const consumersToLoad = configUtil.getTelemetryConsumers(config);

    // timestamp to filed out-dated tracers
    const tracersTimestamp = new Date().getTime();

    const typesBefore = getLoadedConsumerTypes();
    return loadConsumers(consumersToLoad)
        .then((consumers) => {
            CONSUMERS = consumers;
            logger.info(`${CONSUMERS.length} consumer plug-in(s) loaded`);
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
    getConsumers: () => CONSUMERS
};
