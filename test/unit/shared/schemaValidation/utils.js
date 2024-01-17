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

const lodash = require('lodash');
const mochaDescribe = require('mocha').describe;

const assert = require('../assert');

module.exports = {
    /**
     * All combinations from array
     *
     * @param {Array} valuesArray - source array
     * @param {number} [minSize = 1] - min size
     * @param {number} [maxSize] - max size
     *
     * @returns {Array<Array>} combinations
     */
    arrayCombinations(valuesArray, minSize, maxSize) {
        minSize = minSize || 1;
        maxSize = maxSize || valuesArray.length;
        const ret = [];

        if (minSize > valuesArray.length) {
            return ret;
        }
        // eslint-disable-next-line no-restricted-properties
        const startPos = minSize === 1 ? 0 : (Math.pow(2, minSize) - 1);
        // eslint-disable-next-line no-restricted-properties
        const totalComb = Math.pow(2, valuesArray.length);

        for (let i = startPos; i < totalComb; i += 1) {
            const temp = [];
            for (let j = 0; j < valuesArray.length; j += 1) {
                // eslint-disable-next-line no-bitwise, no-restricted-properties
                if ((i & Math.pow(2, j))) {
                    /**
                     * for example origin array length is 3 then 2 ** 3 = 8,  8 - 1 = 7 combinations in total
                     * for example i === 6 or 0b110 -> then elements with indexes 2 and 3 creates a pair
                     */
                    temp.push(valuesArray[j]);
                }
            }
            if (temp.length >= minSize && temp.length <= maxSize) {
                ret.push(temp);
            }
        }
        ret.sort((a, b) => a.length - b.length);
        return ret;
    },

    /**
     * Generate random string
     *
     * @param {number} len - length of string to be generated
     * @param {number} radix - see Number.prototype.toString,
     *      base to use for representing numeric values. In other words
     *      when 'radix === 2', then output will be contain 1 and 0 only
     *      when 'radix === 16' then output will contain hex chars
     * @returns {string} generated string
     */
    randomString(len, radix) {
        // asserts here to be sure that we generating correct data
        radix = arguments.length >= 2 ? radix : 36;
        assert.isAtLeast(len, 0, 'length of random string should be >= 0');
        assert.isAtLeast(radix, 2, 'radix argument must be between 2 and 36');
        assert.isAtMost(radix, 36, 'radix argument must be between 2 and 36');
        return lodash.times(len, () => lodash.random(35).toString(radix)).join('');
    },

    testControls: {
        describeWrapper(func) {
            return mochaHandlersWrapper.call(mochaDescribe, func);
        },

        /**
         * Wrapper for mocha' describe to use for sub tests
         *
         * @returns {function}
         */
        describeUserSubTestWrapper() {
            function inner(testConf) {
                return () => ({ describe: mochaDescribe, testConf });
            }
            inner.only = function (testConf) {
                return () => ({ describe: mochaDescribe.only, testConf });
            };
            inner.skip = function (testConf) {
                return () => ({ describe: mochaDescribe.skip, testConf });
            };
            return inner;
        },

        /**
         * @param {BaseTestConf} testConf - test config
         * @returns {string} formatted sub-title
         */
        fmtSubTitle(testConf) {
            return testConf.subTitle ? ` (${testConf.subTitle})` : '';
        },

        /**
         * @param {BaseTestConf} testConf - test config
         * @returns {function}
         */
        getSubTestDescribe(testConf) {
            if (testConf.only) {
                return mochaDescribe.only;
            }
            if (testConf.skip) {
                return mochaDescribe.skip;
            }
            return mochaDescribe;
        }
    }
};

function mochaHandlersWrapper(func) {
    const self = this;
    function inner() {
        return func.apply(self, arguments);
    }
    inner.only = function () {
        return func.apply(self.only, arguments);
    };
    inner.skip = function () {
        return func.apply(self.skip, arguments);
    };
    return inner;
}
