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

const constants = require('./constants.js');
const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

/**
* Load all sourceTypes at initialization just once
*
* @returns {Object} object, where key is sourceType string and
*                   value is function(request, consumer) -> object
*/
const sourceTypes = (function loadSourceTypes() {
    const sourceTypesDir = constants.sourceTypes.dir;
    const sourceTypeExt = constants.sourceTypes.ext;

    // absolute path to sourceTypes dir is required
    const absolutePath = path.join(path.dirname(__filename), sourceTypesDir);
    const loadedSourceTypes = {};

    fs.readdirSync(absolutePath).forEach((fname) => {
        const modulePath = './'.concat(path.join(sourceTypesDir, fname));
        logger.debug(`Loading module ${modulePath}`);

        try {
            // eslint-disable-next-line
            loadedSourceTypes[path.basename(fname, sourceTypeExt)] = require(modulePath);
        } catch (err) {
            logger.error(`Unable to load ${modulePath}. Detailed error:\n`, err);
            return;
        }
        logger.debug(`Module ${modulePath} - loaded!`);
    });
    return loadedSourceTypes;
}());


/**
* Add overll all summary to report
*
* @param {Object} request      - request with included context
* @param {Object} request.data - normalized data
* @param {Object} request.context - context information
*
* @returns {Object} Promise resolved with summary object
*/
async function addReportStats(request) {
    const data = request.data;
    return {
        time: data.timestamp,
        host: data.hostname,
        index: data.rbac_system_index,
        source: 'bigip.tmsh.stats.summary',
        sourcetype: 'f5:bigip:stats:iapp:json',
        event: {
            aggr_period: data.aggregationPeriod,
            devicegroup: data.deviceGroup,
            facility: data.facility,
            files_sent: request.context.numberOfRequests,
            bytes_transfered: request.context.dataLength
        }
    };
}


/**
* Translate normalized data to Consumer's format
*
* @param {Object} data      - normalized data
* @param {Object} consumer  - consumer object
*
* @returns {Object} Promise resolved with list of translated data
*/
async function translateData(data, consumer) {
    logger.debug('Incoming data for translation');

    const translatedData = [];
    const request = {
        data,
        context: {
            consumer,
            dataLength: 0,
            currentChunkLength: 0,
            numberOfRequests: 0
        }
    };
    const appendData = function (newData) {
        const context = request.context;
        const newDataStr = JSON.stringify(newData);

        context.currentChunkLength += newDataStr.length;
        if (context.currentChunkLength >= constants.maxDataChunkSize) {
            context.dataLength += context.currentChunkLength;
            context.currentChunkLength = 0;
            context.numberOfRequests += 1;
        }
        translatedData.push(newDataStr);
    };

    const promises = Object.keys(sourceTypes)
        .map(sourceType => new Promise((resolve) => {
            resolve(sourceTypes[sourceType](request, consumer));
        }).then((res) => {
            if (res !== undefined) {
                if (Array.isArray(res)) {
                    res.forEach(part => appendData(part));
                } else {
                    appendData(res);
                }
            }
        }).catch(err => logger.error(`translateData::${sourceType} error: ${err}\nDetailed error info:\n`, err)));

    return Promise.all(promises)
        .then(() => addReportStats(request, translatedData))
        .then((res) => {
            appendData(res);
            return translatedData;
        });
}


module.exports = translateData;
