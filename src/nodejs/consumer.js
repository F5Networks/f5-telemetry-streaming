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

const CONSUMERS_DIR = './consumers';


/**
* Load consumer's module
*
* @param {Object} modulePath - path to module
*
* @returns {Object} module or null when failed to load module
*/
function loadModule(modulePath) {
    logger.debug(`Trying to load module ${modulePath}`);

    let module = null;
    try {
        module = require(modulePath);
    } catch (err) {
        logger.error(`Unable to load module ${modulePath}: ${err}\nDetailed error info:\n`, err);
    }
    return module;
}


/**
* Dummy function-placeholder
*
* @param {Object} data - data for forwarder or translator
*
* @returns {Object} data
*/
const dummyFunction = async (data, ...args) => {
    logger.info("dummy function");
    return data;
};


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
                            consumer: consumerObj,
                            translate: translateFunc,
                            forward: forwardFunc
                        },
                        ...
                    ]
*/
async function loadConsumers(config) {
    if (!Array.isArray(config.consumers)) {
        logger.info('No consumer(s) defined in config');
        return Promise.resolve([]);
    }

    return Promise.all(config.consumers.map(async (consumerObj) => {
        const consumerName = consumerObj.consumer;
        const consumerDir = path.join(CONSUMERS_DIR, consumerName);
        // copy consumer's data
        const newConsumerObj = {
            consumer: JSON.parse(JSON.stringify(consumerObj))
        };

        logger.info(`Trying to load ${consumerName} plugin from ${consumerDir}`);

        const translator = loadModule('./'.concat(path.join(consumerDir, 'translator.js')));
        newConsumerObj['translate'] = translator === null ? dummyFunction : translator;

        const forwarder = loadModule('./'.concat(path.join(consumerDir, 'forwarder.js')));
        newConsumerObj['forward'] = forwarder === null ? dummyFunction : forwarder;

        return newConsumerObj;
    }));
}


module.exports = {
    load: loadConsumers
};