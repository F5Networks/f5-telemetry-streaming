/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

module.exports = {
    /**
     * Asserts that haystack includes needle
     *
     * @param {Array|string} haystack - haystack
     * @param {RegExp} needle - needle to search for in haystack
     * @param {string} [message] - message to show on fail
     */
    includeMatch(haystack, needle, message) {
        const checkFn = needle instanceof RegExp
            ? (elem => needle.test(elem))
            : (elem => elem.indexOf(needle) !== -1);
        const ok = Array.isArray(haystack)
            ? haystack.some(checkFn)
            : checkFn(haystack);
        if (!ok) {
            assert.include(haystack, needle, message);
        }
    },

    /**
     * Asserts that haystack does not include needle
     *
     * @param {Array|string} haystack - haystack
     * @param {RegExp} needle - needle to search for in haystack
     * @param {string} [message] - message to show on fail
     */
    notIncludeMatch(haystack, needle, message) {
        const checkFn = needle instanceof RegExp
            ? (elem => needle.test(elem))
            : (elem => elem.indexOf(needle) !== -1);
        const ok = Array.isArray(haystack)
            ? haystack.some(checkFn)
            : checkFn(haystack);
        if (ok) {
            assert.notInclude(haystack, needle, message);
        }
    }
};
