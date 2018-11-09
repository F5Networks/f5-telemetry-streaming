/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const path = require('path');
const logger = require('../logger.js'); // eslint-disable-line no-unused-vars
const CONSUMERS_DIR = require('../constants.js').CONSUMERS_DIR;
const configHandler = require('./configHandler.js');

let CONSUMERS = null;

/**
* Load consumer's module
*
* @param {Object} modulePath - path to module
*
* @returns {Object|null} module or null when failed to load module
*/
function loadModule(modulePath) {
    logger.debug(`Trying to load module ${modulePath}`);

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
                            consumer: function(data, config),
                            config: [object]
                        },
                        ...
                    ]
*/
// TODO: add logic to remove cached module from memory
function loadConsumers(config) {
    if (!Array.isArray(config.consumers)) {
        logger.info('No consumer(s) defined in config');
        return Promise.resolve([]);
    }

    logger.info(`Loading consumer specific plugins from ${CONSUMERS_DIR}`);
    // eslint-disable-next-line
    return Promise.all(config.consumers.map((consumerConf) => {
        return new Promise((resolve) => {
            const consumerName = consumerConf.consumer;
            const consumerDir = './'.concat(path.join(CONSUMERS_DIR, consumerName));

            logger.info(`Trying to load ${consumerName} plug-in from ${consumerDir}`);
            const consumerModule = loadModule(consumerDir);
            if (consumerModule === null) {
                resolve(undefined);
            } else {
                // copy consumer's data
                resolve({
                    config: JSON.parse(JSON.stringify(consumerConf)),
                    consumer: consumerModule
                });
            }
        });
    }))
        .then((consumers) => {
            const availableConsumers = consumers.filter(consumer => consumer !== undefined);
            logger.info(`${availableConsumers.length} plug-in(s) loaded`);
            return availableConsumers;
        });
}


configHandler.on('change', (config) => {
    logger.debug('configHandler change event in consumersHandler'); // helpful debug
    loadConsumers(config)
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
