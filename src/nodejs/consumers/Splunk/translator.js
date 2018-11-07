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

    logger.info(`${Object.keys(loadedSourceTypes).length} sourceTypes loaded`);
    return loadedSourceTypes;
}());

/**
* Add translated data
*
* @param {Object} request - request object
* @param {Object} newData - translated data
*/
function appendData(request, newData) {
    const context = request.context;
    const newDataStr = JSON.stringify(newData);

    context.currentChunkLength += newDataStr.length;
    if (context.currentChunkLength >= constants.maxDataChunkSize) {
        context.dataLength += context.currentChunkLength;
        context.currentChunkLength = 0;
        context.numberOfRequests += 1;
    }
    context.translatedData.push(newDataStr);
}

/**
* Translate data for specific sourceType
*
* @param {string} sourceType - source type
* @param {Object} request    - request object
*
* @returns {Object} Promise resolved with undefined
*/
function computeSourceType(sourceType, request) {
    return new Promise((resolve) => {
        resolve(sourceTypes[sourceType](request));
    }).then((data) => {
        if (data) {
            if (Array.isArray(data)) {
                data.forEach(part => appendData(request, part));
            } else {
                appendData(request, data);
            }
        }
    }).catch((err) => {
        logger.error(`computeSourceType::${sourceType} error: ${err}\nDetailed error:\n`, err);
    });
}

/**
* Translate normalized data to Consumer's format
*
* @param {Object} data      - normalized data
* @param {Object} consumer  - consumer object
*
* @returns {Object} Promise resolved with list of translated data
*/
function translateData(data, consumer) {
    logger.debug('Incoming data for translation');

    const request = {
        data,
        context: {
            consumer,
            dataLength: 0,
            currentChunkLength: 0,
            numberOfRequests: 0,
            translatedData: []
        }
    };

    return Promise.all(Object.keys(sourceTypes).map(sourceType => computeSourceType(sourceType, request)))
        .then(() => computeSourceType('bigip.tmsh.stats.summary', request))
        .then(() => {
            const translatedData = request.context.translatedData;
            logger.debug(`Done with data translation. ${translatedData.length} object(s) were translated`);
            return Promise.resolve(translatedData);
        });
}


module.exports = translateData;
