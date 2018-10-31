/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

const consumersDir = './consumers';


/**
 * Build data forwarder mappings for each consumer.
 * Should be called on start or when configuration changed only.
 *
 * @param {Object}   config                      - object with configuration data
 * @param {Object[]} config.consumers            - list of consumers
 * @param {string}   config.consumers[].consumer - consumer's type/name
 *
 * @returns {Object} Promise which is resolved with the forwader
 *                   mapping for each consumer
 */
async function buildForwarders(config) {
    logger.info('Building forwarder mapping for new config');

    return Promise.all(config.consumers.map(async (consumerObj) => {
        const consumer = consumerObj.consumer;
        const forwarderPath = path.join(consumersDir, consumer, 'forwarder.js');

        if (fs.existsSync(forwarderPath)) {
            const modulePath = './'.concat(forwarderPath);
            logger.debug(`Consumer "${consumer}", attempt to load module - ${modulePath}`);

            const forwarder = require(modulePath).forwarder;

            logger.debug(`Consumer "${consumer}", forwarder loaded`);
            return Promise.resolve({ [consumer]: forwarder });
        }
        logger.error(`Consumer "${consumer}" has no valid forwader at "${forwarderPath}"`);
        return Promise.resolve({ [consumer]: {} });
    }));
}

/**
 * Forward data to consumer
 * @param {Object} mapping    - forwarder mapping for consumers
 * @param {Object} consumer   - consumer object
 * @param {Object} data       - data to forward
 *
 * @returns {Object} Promise which is resolved with the forwarded data
 */
function forwardData(mapping, consumer, data) {
    return new Promise((resolve, reject) => {
        if (mapping[consumer.consumer] === undefined) {
            const error = `Missing forwarder: mapping has no forwarder for "${consumer.consumer}"`;
            logger.error(`forward error: ${error}`);
            reject(new Error(error));
        }
        resolve(mapping[consumer.consumer](consumer, data));
    });
}


module.exports = {
    build: buildForwarders,
    forward: forwardData
};
