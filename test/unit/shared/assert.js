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

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;

chai.use(chaiAsPromised);
const assert = chai.assert;

const additional = {
    /**
     * Asserts that all assertions from the list are passing
     *
     * @param {function[]} assertions
     * @param {string} message
     *
     * @throws {Error} when assertion failed
     */
    allOfAssertions(...assertions) {
        assert.isAbove(assertions.length, 0);

        let message = assertions[assertions.length - 1];
        if (typeof message === 'string') {
            message = `${message}: `;
            assertions.pop();
        } else {
            message = '';
        }

        assertions.forEach((assertion, idx) => {
            try {
                assertion();
            } catch (error) {
                error.message = `${message}assert.allOfAssertions: assertion #${idx} failed to pass the test: [${error.message || error}]`;
                assert.ifError(error);
            }
        });
    },

    /**
     * Asserts that is at least one assertion from the list is passing
     *
     * @param {function[]} assertions
     * @param {string} message
     *
     * @throws {Error} first failed assertion
     */
    anyOfAssertions(...assertions) {
        assert.isAbove(assertions.length, 0);

        let message = assertions[assertions.length - 1];
        if (typeof message === 'string') {
            message = `${message}: `;
            assertions.pop();
        } else {
            message = '';
        }

        const errors = [];
        const success = assertions.some((assertion) => {
            try {
                assertion();
            } catch (error) {
                errors.push(`#${errors.length + 1}: ${error.message || error}`);
                return false;
            }
            return true;
        });

        if (success === false) {
            assert.ifError(new Error(`${message}assert.anyOfAssertions: none assertions from the list are passing the test: [${errors.join(', ')}]`));
        }
    },

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
    },

    /**
     * Asserts that only one assertion from the list is passing
     *
     * @param {function[]} assertions
     * @param {string} message
     */
    oneOfAssertions(...assertions) {
        assert.isAbove(assertions.length, 0);

        let message = assertions[assertions.length - 1];
        if (typeof message === 'string') {
            message = `${message}: `;
            assertions.pop();
        } else {
            message = '';
        }

        let lastPassIdx = -1;
        const errors = [];

        assertions.forEach((assertion, idx) => {
            try {
                assertion();
            } catch (error) {
                errors.push(`#${errors.length + 1}: ${error.message || error}`);
                // it is OK to return here
                return;
            }
            // assertion passed, need to check if it is the only one passing the test or not
            if (lastPassIdx === -1) {
                lastPassIdx = idx;
            } else {
                assert.ifError(new Error(`${message}assert.oneOfAssertions: assertions #${lastPassIdx} and #${idx} are both passing the test`));
            }
        });

        if (lastPassIdx === -1) {
            assert.ifError(new Error(`${message}assert.oneOfAssertions: none assertions from the list are passing the test: [${errors.join(', ')}]`));
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
    }
};

Object.keys(additional).forEach((name) => {
    assert.notProperty(assert, name, 'should have no assertion with such name');
    assert[name] = additional[name];
});

module.exports = assert;
