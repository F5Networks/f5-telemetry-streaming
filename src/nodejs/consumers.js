/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const path = require('path');
const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const tracers = require('./util.js').tracer;
const constants = require('./constants.js');
const configWorker = require('./config.js');

const CONSUMERS_DIR = constants.CONSUMERS_DIR;
const CLASS_NAME = constants.CONSUMERS_CLASS_NAME;
let CONSUMERS = null;

/**
* Load consumer's module
*
* @param {Object} modulePath - path to module
*
* @returns {Object|null} module or null when failed to load module
*/
function loadModule(modulePath) {
    logger.debug(`Loading module ${modulePath}`);

    let module = null;
    try {
        module = require(modulePath); // eslint-disable-line
    } catch (err) {
        logger.exception(`Unable to load module ${modulePath}`, err);
    }
    return module;
}

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
    if (!Array.isArray(config)) {
        logger.info('No consumer(s) to load, define in configuration first');
        return Promise.resolve([]);
    }

    logger.debug(`Loading consumer specific plug-ins from ${CONSUMERS_DIR}`);
    // eslint-disable-next-line
    return Promise.all(config.map((consumerConfig) => {
        if (consumerConfig.config.enable === false) {
            return Promise.resolve(undefined);
        }
        return new Promise((resolve) => {
            const consumerType = consumerConfig.type;
            // path.join removes './' from string, so we need to
            // prepend it manually
            const consumerDir = './'.concat(path.join(CONSUMERS_DIR, consumerType));

            logger.debug(`Loading consumer ${consumerType} plug-in from ${consumerDir}`);
            const consumerModule = loadModule(consumerDir);
            if (consumerModule === null) {
                resolve(undefined);
            } else {
                const consumer = {
                    config: JSON.parse(JSON.stringify(consumerConfig.config)),
                    consumer: consumerModule,
                    tracer: tracers.createFromConfig(CLASS_NAME, consumerConfig.name, consumerConfig.config)
                };
                consumer.config.allowSelfSignedCert = consumer.config.allowSelfSignedCert === undefined
                    ? !constants.STRICT_TLS_REQUIRED : consumer.config.allowSelfSignedCert;
                // copy consumer's data
                resolve(consumer);
            }
        });
    }))
        .then(consumers => consumers.filter(consumer => consumer !== undefined));
}

/**
 * Get set of loaded Consumers' types
 *
 * @returns {Set} set with loaded Consumers' types
 */
function getLoadedConsumerTypes() {
    if (CONSUMERS) {
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

            try {
                delete require.cache[require.resolve(consumerDir)];
            } catch (err) {
                logger.exception(`Exception on attempt to unload '${consumerDir}' from cache`, err);
                return;
            }
            logger.debug(`Consumer module '${consumerDir}' (${consumerType}) was unloaded`);
        }
    });
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in consumers'); // helpful debug
    let consumersConfig;
    if (config.parsed && config.parsed[CLASS_NAME]) {
        consumersConfig = config.parsed[CLASS_NAME];
    }

    // timestamp to filed out-dated tracers
    const tracersTimestamp = new Date().getTime();

    let consumersToLoad = [];
    if (!consumersConfig) {
        consumersToLoad = null;
    } else {
        Object.keys(consumersConfig).forEach((k) => {
            consumersToLoad.push({
                name: k,
                type: consumersConfig[k].type,
                config: consumersConfig[k]
            });
        });
    }
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
            tracers.remove(null, tracer => tracer.name.startsWith(CLASS_NAME)
                                           && tracer.lastGetTouch < tracersTimestamp);
        });
});


module.exports = {
    getConsumers: () => CONSUMERS
};
