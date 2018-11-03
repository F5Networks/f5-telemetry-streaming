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

// Load all sourceTypes at initialization just once
const sourceTypesDir = './sourceTypes';
const moduleExt = '.js';

const sourceTypes = (function loadSourceTypes() {
    // absolute path to sourceTypes dir is required
    const absolutePath = path.join(path.dirname(__filename), sourceTypesDir);
    const loadedSourceTypes = {};

    fs.readdirSync(absolutePath).forEach((fname) => {
        const modulePath = './'.concat(path.join(sourceTypesDir, fname));
        logger.debug(`Loading module ${modulePath}`);

        try {
            loadedSourceTypes[path.basename(fname, moduleExt)] = require(modulePath);
        } catch (err) {
            logger.error(`Unable to load ${modulePath}. Detailed error:\n`, err);
            return
        }
        logger.debug(`Module ${modulePath} - loaded!`);
    });
    return loadedSourceTypes;
}());


async function translateData(data, consumer) {
    logger.debug('Incoming data for translation');
    const translatedData = [];
    const maxPromises = 2;
    let promises = [];

    Object.keys(sourceTypes).forEach((sourceType) => {
        if (promises.length === maxPromises) {
            Promise.all(promises).catch((err) => {
                logger.error(`translateData error: ${err}\nDetailed error info:\n`, err);
            });
            promises = [];
        }
        promises.push(new Promise((resolve, reject) => {
            sourceTypes[sourceType](data, consumer).then((res) => {
                if (res !== undefined) {
                    if (Array.isArray(res)) {
                        res.forEach(part => translatedData.push(part));
                    } else {
                        translatedData.push(res);
                    }
                }
                resolve();
            }).catch(err => console.log(`translateData::${sourceType} error: ${err}.\nDetailed error info:\n`, err));
        }));
    });
    if (promises.length) {
        Promise.all(promises).catch((err) => {
            logger.error(`translateData error: ${err}\nDetailed error info:\n`, err);
        });
    }
    return translatedData;
}


module.exports = translateData;
