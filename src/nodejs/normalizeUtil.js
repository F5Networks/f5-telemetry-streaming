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
 * Average values
 *
 * @param {Object} args                - args object
 * @param {Object} [args.data]         - data to process (always included)
 * @param {Object} [args.keyWithValue] - key containing value to average
 *
 * @returns {Object} Returns averaged value
 */
function getAverage(args) {
    if (!args.keyWithValue) { throw new Error('Argument keyWithValue required'); }
    const data = args.data;
    const values = [];

    // for now assume in object, could also be provided an array and just average that
    Object.keys(data).forEach((k) => {
        const key = args.keyWithValue;
        // throw error if key is missing
        if (!(key in data[k])) { throw new Error(`Expecting key: ${key} in object: ${JSON.stringify(data[k])}`); }
        values.push(data[k][key]);
    });
    const averageFunc = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    return averageFunc(values);
}

module.exports = {
    getAverage
};
