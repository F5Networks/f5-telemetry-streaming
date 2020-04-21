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
const logger = require('./logger');

const PULL_CONSUMERS_DIR = constants.PULL_CONSUMERS_DIR;
const CLASS_NAME = constants.CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME;
let PULL_CONSUMERS = {};

/**
 * Process client's request via REST API
 *
 * @param {Object} restOperation - request object
 */
function processClientRequest(restOperation) {
    // Only GET requests are allowed
    // URL structure:
    // - /shared/telemetry/pullconsumer/My_Pull_Consumer
    const parts = restOperation.getUri().pathname.split('/');
    const consumerName = (parts[4] || '').trim();

    let config; // to pass to systemPoller
    let consumerConfig;

    (new Promise((resolve, reject) => {
        if (consumerName === '') {
            const err = new Error('Bad Request. Name for Pull Consumer was not specified.');
            err.responseCode = 400;
            reject(err);
        } else {
            resolve();
        }
    }))
        .then(() => configWorker.getConfig())
        .then((curConfig) => {
            // config was copied by getConfig already
            config = curConfig;
            try {
                consumerConfig = getConsumerConfig(config.parsed, consumerName);
                // Don't bother collecting stats if requested Consumer Type is not loaded
                if (typeof PULL_CONSUMERS[consumerConfig.type] === 'undefined') {
                    throw new Error(`Pull Consumer of type '${consumerConfig.type}' is not loaded`);
                }
            } catch (err) {
                err.responseCode = 404;
                return Promise.reject(err);
            }
            let pollers = consumerConfig.systemPoller;
            if (!Array.isArray(pollers)) {
                pollers = [pollers];
            }
            return pollers;
        })
        .then((consumersPollers) => {
            // deepCopy our config, since fetchPollerData() will 'spoil' the passed config
            const pollers = consumersPollers.map(
                poller => systemPoller.fetchPollerData(util.deepCopy(config), poller, { includeDisabled: false })
            );
            return Promise.all(pollers);
        })
        .then((results) => {
            // systemPoller.fetchPollerData() returns an array of Poller responses.
            // Since the Pull Consumer queries a specific Poller, will only have 1 Poller result in the array response.
            // Calling map() to hoist nested Poller object into the top-level array
            const dataCtxs = results.map(d => d[0]);
            return invokeConsumer(consumerConfig, dataCtxs);
        })
        .then((data) => {
            util.restOperationResponder(restOperation, 200, data);
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
                logger.exception('pull consumer request ended up with error', error);
            }
            util.restOperationResponder(restOperation, code, { code, message });
        });
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

function getConsumerConfig(config, consumerName) {
    const configuredConsumers = config[CLASS_NAME] || {};
    const consumer = configuredConsumers[consumerName];
    if (util.isObjectEmpty(consumer)) {
        throw new Error(`Pull Consumer with name '${consumerName}' doesn't exist`);
    }
    if (consumer.enable === false) {
        throw new Error(`Pull Consumer with name '${consumerName}' is disabled`);
    }
    consumer.name = consumerName;
    return consumer;
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
    if (!Array.isArray(config)) {
        logger.info('No pull consumer(s) to load, define in configuration first');
        return Promise.resolve([]);
    }

    logger.debug(`Loading pull consumer specific plug-ins from ${PULL_CONSUMERS_DIR}`);
    // eslint-disable-next-line
    return Promise.all(config.map((consumerConfig) => {
        if (consumerConfig.config.enable === false) {
            return Promise.resolve(undefined);
        }
        return new Promise((resolve) => {
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
                    config: util.deepCopy(consumerConfig.config),
                    consumer: consumerModule,
                    logger: logger.getChild(`${consumerConfig.type}.${consumerConfig.name}`),
                    tracer: util.tracer.createFromConfig(CLASS_NAME, consumerConfig.name, consumerConfig.config)
                };
                // copy consumer's data
                resolve(consumer);
            }
        });
    }))
        .then(consumers => consumers.filter(consumer => consumer !== undefined));
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
    let consumersConfig;
    if (config && config[CLASS_NAME]) {
        consumersConfig = config[CLASS_NAME];
    }
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
    processClientRequest,
    getConsumers: () => PULL_CONSUMERS // expose for testing
};
