/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const util = require('./util.js');


module.exports = {

    /**
     * Average values
     *
     * @param {Object} args                - args object
     * @param {Object} [args.data]         - data to process (always included)
     * @param {Object} [args.keyWithValue] - key containing value to average
     *
     * @returns {Object} Returns averaged value
     */
    getAverage(args) {
        if (!args.keyWithValue) { throw new Error('Argument keyWithValue required'); }
        const data = args.data;
        const values = [];

        // for now assume in object, could also be provided an array and just average that
        Object.keys(data).forEach((k) => {
            const key = args.keyWithValue;
            // throw error if key is missing
            if (!(key in data[k])) { throw new Error(`Expecting key: ${key} in object: ${util.stringify(data[k])}`); }
            values.push(data[k][key]);
        });
        const averageFunc = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        return averageFunc(values);
    },

    /**
     * Sum values
     *
     * @param {Object} args            - args object
     * @param {Object} [args.data]     - data to process (always included)
     *
     * @returns {Object} Returns object containing sum
     */
    getSum(args) {
        const data = args.data;
        const values = {};

        // assume we are processing an object which also has a child object containing the keys interested in
        if (typeof data === 'object') {
            Object.keys(data).forEach((k) => {
                if (typeof data[k] === 'object') {
                    Object.keys(data[k]).forEach((cK) => {
                        if (values[cK] === undefined) {
                            values[cK] = data[k][cK];
                        } else {
                            values[cK] += data[k][cK];
                        }
                    });
                }
            });
        }
        return values;
    },

    /**
     * getFirstKey
     *
     * @param {Object} args                - args object
     * @param {Object} [args.data]         - data to process (always included)
     * @param {Object} [args.splitOnValue] - only get up to a certain character of first key
     * @param {Object} [args.keyPrefix]    - prefix key with value
     *
     * @returns {Object} Returns key (if non-existent, a standard string is returned)
     */
    getFirstKey(args) {
        const data = args.data;
        // standard value returned if object is empty
        let ret = 'null';

        const objKeys = typeof data === 'object' ? Object.keys(data) : [];
        if (objKeys.length) {
            ret = objKeys[0];
            ret = args.splitOnValue ? ret.split(args.splitOnValue)[0] : ret;
            ret = args.keyPrefix ? `${args.keyPrefix}${ret}` : ret;
        }
        return ret;
    },

    /**
     * getPercentFromKeys
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     * @param {Object} [args.totalKey]   - key containing total (max) value
     * @param {Object} [args.partialKey] - key containing partial value, such as free or used
     * @param {Object} [args.inverse]    - inverse percentage
     *
     * @returns {Object} Returns calculated percentage
     */
    getPercentFromKeys(args) {
        const data = args.data;

        // this should result in a number between 0 and 100 (percentage)
        let ret = Math.round(data[args.partialKey] / data[args.totalKey] * 100);
        ret = args.inverse ? 100 - ret : ret;
        return ret;
    },

    /**
     * formatAsJson
     *
     * @param {Object} args              - args object
     * @param {Object} [args.data]       - data to process (always included)
     * @param {String} [args.type]       - type, such as csv
     * @param {String} [args.mapKey]     - key to use during convertArrayToMap
     * @param {Array} [args.filterKeys]  - filter keys according to array
     *
     * @returns {Object} Returns formatted data
     */
    formatAsJson(args) {
        const data = args.data;
        let ret = [];

        if (args.type === 'csv') {
            const dataSplit = data.split('\n');
            // assume first row contains headers, save off
            const headers = dataSplit[0].split(',');
            dataSplit.shift();

            dataSplit.forEach((l) => {
                // avoid any empty lines
                if (l !== '') {
                    const iRet = {};
                    // split into each value and add according to headers
                    l = l.split(',');
                    for (let i = 0; i < l.length; i += 1) {
                        iRet[headers[i]] = l[i];
                    }
                    ret.push(iRet);
                }
            });
            // now convert to map
            ret = util.convertArrayToMap(ret, args.mapKey, {});
            // finally filter keys - if required
            ret = args.filterKeys ? util.filterDataByKeys(ret, args.filterKeys) : ret;
        } else {
            throw new Error(`Unsupported type: ${args.type}`);
        }
        return ret;
    }
};
