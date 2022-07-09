/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const FLOAT_REGEXP_STRICT = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/;
const FLOAT_REGEXP = /([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)/;

module.exports = {
    /**
     * Parses string to integer or float (fetches first number)
     *
     * @param {string} val - string to parse
     *
     * @returns {number | boolean} parsed number or false if unable to parse it
     */
    parseNumber(val) {
        val = val.match(FLOAT_REGEXP);
        if (val) {
            val = parseFloat(val[0]);
            if (typeof val === 'number' && Number.isFinite(val)) {
                return val;
            }
        }
        return false;
    },

    /**
     * Parses string to integer or float (only digits and '.' allowed)
     *
     * @param {string} val - string to parse
     *
     * @returns {number | boolean} parsed number or false if unable to parse it
     */
    parseNumberStrict(val) {
        if (FLOAT_REGEXP_STRICT.test(val)) {
            val = parseFloat(val);
            if (typeof val === 'number' && Number.isFinite(val)) {
                return val;
            }
        }
        return false;
    }
};
