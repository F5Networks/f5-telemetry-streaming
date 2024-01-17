/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const zip = require('lodash/zip');

chai.use(chaiAsPromised);
const assert = chai.assert;

const additional = {
    /**
     * Asserts that haystack includes needle
     *
     * @param {Array|string} haystack - haystack
     * @param {RegExp|string} needle - needle to search for in haystack
     * @param {string} [message] - message to show on fail
     */
    includeMatch(haystack, needle, message) {
        const checkFn = needle instanceof RegExp
            ? ((elem) => needle.test(elem))
            : ((elem) => elem.indexOf(needle) !== -1);
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
            ? ((elem) => needle.test(elem))
            : ((elem) => elem.indexOf(needle) !== -1);
        const ok = Array.isArray(haystack)
            ? haystack.some(checkFn)
            : checkFn(haystack);
        if (ok) {
            assert.notInclude([].concat(haystack, needle), needle, message);
        }
    }
};

Object.keys(additional).forEach((name) => {
    assert.notProperty(assert, name, 'should have no assertion with such name');
    assert[name] = additional[name];
});

module.exports = assert;
