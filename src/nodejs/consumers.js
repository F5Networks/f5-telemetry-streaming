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
// TODO: add logic to remove cached module from memory
function loadConsumers(config) {
    if (!Array.isArray(config)) {
        logger.info('No consumer(s) to load, define in configuration first');
        return Promise.resolve([]);
    }

    logger.info(`Loading consumer specific plugins from ${CONSUMERS_DIR}`);
    // eslint-disable-next-line
    return Promise.all(config.map((consumerConfig) => {
        return new Promise((resolve) => {
            const consumerType = consumerConfig.type;
            const consumerDir = './'.concat(path.join(CONSUMERS_DIR, consumerType));

            logger.info(`Loading consumer ${consumerType} plug-in from ${consumerDir}`);
            const consumerModule = loadModule(consumerDir);
            if (consumerModule === null) {
                resolve(undefined);
            } else {
                // copy consumer's data
                resolve({
                    config: JSON.parse(JSON.stringify(consumerConfig.config)),
                    consumer: consumerModule
                });
            }
        });
    }))
        .then((consumers) => {
            const availableConsumers = consumers.filter(consumer => consumer !== undefined);
            logger.info(`${availableConsumers.length} consumer plug-in(s) loaded`);
            return availableConsumers;
        });
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in consumers'); // helpful debug
    let consumersConfig;
    if (config.parsed && config.parsed[CLASS_NAME]) {
        consumersConfig = config.parsed[CLASS_NAME];
    }

    let consumersToLoad = [];
    if (!consumersConfig) {
        consumersToLoad = undefined;
    } else {
        Object.keys(consumersConfig).forEach((k) => {
            consumersToLoad.push({ type: consumersConfig[k].type, config: consumersConfig[k] });
        });
    }
    loadConsumers(consumersToLoad)
        .then((consumers) => {
            CONSUMERS = consumers;
        })
        .catch((err) => {
            logger.exception('Unhandled exception when loading consumers', err);
        });
});


module.exports = {
    load: loadConsumers,
    getConsumers: () => CONSUMERS
};
