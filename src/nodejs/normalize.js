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
 * Get data using provided key
 *
 * @param {Object} data - data
 * @param {Object} key  - key to use when accessing item in data
 *
 * @returns {Object} Promise which is resolved with the data
 */
function getDataByKey(data, key) {
    const keys = key.split('::');
    let ret = data;

    keys.forEach((k) => {
        try {
            ret = ret[k];
        } catch (e) {
            const msg = `Incorrect dot notation: ${e} data: ${JSON.stringify(data)}`;
            throw new Error(msg);
        }
    });
    return ret;
}

/**
 * Standardize and reduce complexity of provided data
 *
 * @param {Object} obj - object to reduce
 *
 * @returns {Object} Promise which is resolved with the reduced object
 */
function reduceData(obj) {
    let objRet = Array.isArray(obj) ? [] : {};

    if (obj.nestedStats) {
        objRet = obj.nestedStats;
        return reduceData(objRet);
    }

    // .entries evaluates to true if obj is array
    if (obj.entries && !Array.isArray(obj)) {
        Object.keys(obj.entries).forEach((k) => {
            const v = obj.entries[k];

            // child entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats,
            // we should simplify this somewhat
            const kM = k.replace('https://localhost/', '').replace('mgmt/tm/', '');
            objRet[kM] = v;
        });
        return reduceData(objRet);
    }

    if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            obj.forEach((i) => {
                objRet.push(reduceData(i));
            });
        } else {
            Object.keys(obj).forEach((k) => {
                const v = obj[k];
                objRet[k] = reduceData(v);
            });
        }

        return objRet;
    }

    objRet = obj;
    return objRet;
}

/**
 * Normalize data - standardize and reduce complexity
 *
 * @param {Object} data          - data to normalize
 * @param {Object} options       - options
 * @param {Object} [options.key] - Key to drill down into data, using a defined notation
 *
 * @returns {Object} Promise which is resolved with the normalized data
 */
function normalizeData(data, options) {
    const reducedData = reduceData(data);

    return options.key ? getDataByKey(reducedData, options.key) : reducedData;
}

module.exports = {
    stat: normalizeData
};
