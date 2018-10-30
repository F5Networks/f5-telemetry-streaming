/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars


/**
 * Build set of data translation mappings for each consumer
 * @param {array} consumers
 *
 * @returns {array} translation mapping for each consumer
 */
function buildTranslationMaps(consumers) {
    // build mapping for each consumer
}


/**
 * Translate data to consumer's format
 * @param {string} consumer   - consumer name
 * @param {Object} data       - data to transform
 * @param {string} sourceType - data's sourceType
 *
 * @returns {Object} data translated to consumer's format
 */
function translate(consumer, data, sourceType) {
    // translate data from normazlied to consumer's format
}


module.exports = {
    translate: translate,
    buildTranslationMaps: buildTranslationMaps
};
