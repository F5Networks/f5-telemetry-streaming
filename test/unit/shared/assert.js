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
const zip = require('lodash/zip');

chai.use(chaiAsPromised);
const assert = chai.assert;

module.exports = {
    /**
     * Asserts that haystack includes needle
     *
     * @param {Array|string} haystack - haystack
     * @param {RegExp|string} needle - needle to search for in haystack
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
     * Asserts that every element in haystack has match in the same order
     *
     * @param {Array} source - source of data
     * @param {Array<string|RegExp>} needles - ordered array with needles for each object in source
     * @param {string} [message] - message to show on fail
     */
    sameOrderedMatches(sources, needles, message) {
        const ok = zip(sources, needles).every((pair) => {
            const data = pair[0];
            const needle = pair[1];
            return needle instanceof RegExp
                ? needle.test(data)
                : data.indexOf(needle) !== -1;
        });
        if (!ok) {
            assert.sameDeepOrderedMembers(sources, needles, message);
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
