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
 * Build data translation mappings for each consumer.
 * Should be called on start or when configuration changed only.
 *
 * @param {Object}   config                      - object with configuration data
 * @param {Object[]} config.consumers            - list of consumers
 * @param {string}   config.consumers[].consumer - consumer's type/name
 *
 * @returns {Object} Promise which is resolved with the translation
 *                   mapping for each consumer
 */
async function buildTranslationMaps(config) {
    logger.info('Building translation mapping for new config');

    return Promise.all(config.consumers.map(async (consumerObj) => {
        const consumer = consumerObj.consumer;
        const consumerDir = path.join(consumersDir, consumer, 'mapping');
        if (fs.existsSync(consumerDir)) {
            logger.debug(`Consumer "${consumer}", mapping dir - ${consumerDir}`);

            return new Promise((resolve) => {
                fs.readdir(consumerDir, (err, files) => {
                    const mapping = {};

                    files.forEach((fname) => {
                        if (path.extname(fname) === '.js') {
                            const sourceType = path.basename(fname, '.js');
                            const modulePath = './'.concat(path.join(consumerDir, fname));

                            logger.debug(`Consumer "${consumer}", attempt to load module ${modulePath}`);
                            mapping[sourceType] = require(modulePath).translator;

                            logger.debug(`Consumer "${consumer}", supports sourceType - ${sourceType}`);
                        }
                    });
                    resolve({ [consumer]: mapping });
                });
            });
        }
        logger.error(`Consumer "${consumer}" has no valid mapping dir at "${consumerDir}"`);
        return Promise.resolve({ [consumer]: {} });
    }));
}

/**
 * Translate data to consumer's format
 * @param {Object} mapping    - consumers translation mapping
 * @param {Object} consumer   - consumer object
 * @param {string} sourceType - data's sourceType
 * @param {Object} data       - data to transform
 *
 * @returns {Object} Promise which is resolved with the translated data
 */
function translateData(mapping, consumer, sourceType, data) {
    return new Promise((resolve, reject) => {
        if (mapping[consumer.consumer] === undefined) {
            const error = `Missing data mapping: no data mapping for "${consumer.consumer}"`;
            logger.error(`translateData error: ${error}`);
            reject(new Error(error));
        }
        if (mapping[consumer.consumer][sourceType] === undefined) {
            const error = `Missing data sourceType: "${consumer.consumer}" mapping has no sourceType "${sourceType}"`;
            logger.error(`translateData error: ${error}`);
            reject(new Error(error));
        }
        resolve(mapping[consumer.consumer][sourceType](data));
    });
}


module.exports = {
    build: buildTranslationMaps,
    translate: translateData
};
