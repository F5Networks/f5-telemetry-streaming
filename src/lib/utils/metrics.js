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
