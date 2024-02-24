/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-restricted-properties, no-use-before-define */

/** @type {integer} */
const BYTES_TO_MB_DIVISOR = Math.pow(1024, 2);

/** @type {integer} number of digits to appear after the decimal point */
const FLOAT_DIGITS = 2;

/** @returns {object} application's memory usage */
function appMemoryUsage() {
    return process.memoryUsage();
}

/**
 * Conver bytes to megabytes
 *
 * @param {number} value - Bytes to convert to MegaBytes
 *
 * @returns {number} value in in MB
 */
const bytesToMegabytes = (value) => value / BYTES_TO_MB_DIVISOR;

/**
 * Trim number of digits after the decimal point
 *
 * @param {number} number - number to format
 * @param {integer} [digits=FLOAT_DIGITS] - number of digits to appear after the decimal point
 *
 * @returns {string} format number as a string
 */
function formatFloat(number, digits) {
    digits = arguments.length > 1 ? digits : FLOAT_DIGITS;
    return number.toFixed(digits);
}

/**
 * @param {number} value - value to convert
 *
 * @returns {string} printable represenation of value (in MB)
 */
function megabytesToStr(value) {
    return wrapMB(formatFloat(value, 2));
}

/**
 * Read MemAvailable from /proc/meminfo data
 *
 * NOTE:
 * - never tested on BIG-IP 13.0.x and older
 *
 * @returns {number} available memory in MB or -1 if unable to fetch data
 */
function osAvailableMem(readMemInfoFn) {
    let ret = -1;
    try {
        const data = readMemInfoFn().toString();
        const idx = data.indexOf('MemAvailable');
        if (idx !== -1) {
            const nl = data.indexOf('\n', idx);
            // parse to int and convert to megabytes
            ret = parseInt(
                data.substring(idx, (nl !== -1) ? nl : data.length - 1)
                    .trim()
                    .split(':')[1],
                10
            ) / 1024; // KB -> MB
        }
    } catch (err) {
        // do nothing
    }
    return ret;
}

/**
 * @param {number} value - value to convert
 *
 * @returns {string} printable represenation of value (in %)
 */
function percentToStr(value) {
    return `${formatFloat(value, 2)}%`;
}

/**
 * Wrap string or number with ` MB` suffix
 *
 * @param {number | string} value - value to wrap
 *
 * @returns {string} wrapped string
 */
const wrapMB = (value) => `${value} MB`;

module.exports = {
    appMemoryUsage,
    bytesToMegabytes,
    formatFloat,
    megabytesToStr,
    osAvailableMem,
    percentToStr,
    wrapMB
};
