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

const assert = require('../../assert');
const utils = require('../utils');

module.exports = {
    /**
     * @returns {string} name to use to configure tests
     */
    name() {
        return 'booleanTests';
    },

    /**
     * Generate tests to verify property' value
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {BooleanTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"boolean" type tests${subTitle}`, () => {
            [true, false].forEach((val) => it(`should allow to set "${val}" as value`, () => {
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.set(testDecl, ctx.property, val);
                return ctx.validator(testDecl)
                    .then((validated) => {
                        if (testConf.checkValue) {
                            assert.deepStrictEqual(
                                lodash.get(validated, ctx.property),
                                val,
                                `should allow to set "${val}" to property "${ctx.propFullName}"`
                            );
                        }
                    });
            }));
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {BooleanTestConf} options
     *
     * @returns {BooleanTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (lodash.isBoolean(options)) {
                options = { checkValue: options };
            }
        }
        return options;
    }
};

/**
 * @typedef BooleanTestConf
 * @type {BaseTestConf}
 * @property {boolean} checkValue - verify value
 *
 * Config to test boolean type
 */
