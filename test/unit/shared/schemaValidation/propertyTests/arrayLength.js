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
        return 'arrayLengthTests';
    },

    /**
     * Generate Array Length Tests
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {ArrayLengthTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        if (!lodash.isUndefined(testConf.minItems)) {
            utils.testControls.getSubTestDescribe(testConf)(`"minItems" keyword tests (minItems === ${testConf.minItems})${subTitle}`, () => {
                if (testConf.minItems > 0) {
                    // no sense to test when minItems is 0
                    it(`should not allow to set less items than "${testConf.minItems}"`, () => {
                        const testDecl = lodash.cloneDeep(ctx.declaration);
                        lodash.set(testDecl, ctx.property, lodash.fill(
                            Array(testConf.minItems - 1),
                            lodash.get(testDecl, ctx.property)[0]
                        ));
                        return assert.isRejected(
                            ctx.validator(testDecl),
                            new RegExp(`"keyword":"minItems".*${ctx.propFullName}.*.*"message":"should NOT have fewer than ${testConf.minItems} items`),
                            `should not allow to set less items than ${testConf.minItems}`
                        );
                    });
                }

                it(`should allow to set "${testConf.minItems}" items`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, lodash.fill(
                        Array(testConf.minItems),
                        lodash.get(testDecl, ctx.property)[0]
                    ));
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should allow to set ${testConf.minItems} items`
                    );
                });
            });
        }
        if (!lodash.isUndefined(testConf.maxItems)) {
            utils.testControls.getSubTestDescribe(testConf)(`"maxItems" keyword tests (maxItems === ${testConf.maxItems})${subTitle}`, () => {
                it(`should not allow to set more items than "${testConf.maxItems}"`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, lodash.fill(
                        Array(testConf.maxItems + 1),
                        lodash.get(testDecl, ctx.property)[0]
                    ));
                    return assert.isRejected(
                        ctx.validator(testDecl),
                        new RegExp(`"keyword":"minItems".*${ctx.propFullName}.*.*"message":"should NOT have more than ${testConf.maxItems} items`),
                        `should not allow to set more items than ${testConf.maxItems}`
                    );
                });

                it(`should allow to set "${testConf.maxItems}" items`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, lodash.fill(
                        Array(testConf.maxItems),
                        lodash.get(testDecl, ctx.property)[0]
                    ));
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should allow to set ${testConf.maxItems} items`
                    );
                });
            });
        }
    },

    /**
     * Process and normalize test options
     *
     * @param {ArrayLengthTestConf} options
     *
     * @returns {ArrayLengthTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (options === true) {
                options = { minItems: 1 };
            } else if (options === false) {
                options = { enable: false };
            } else if (lodash.isNumber(options)) {
                options = { minItems: options };
            } else if (!lodash.isObject(options)) {
                assert.fail(`arrayLengthTests expected to be boolean, number or object, got "${typeof options}" instead`);
            }
        }
        return options;
    }
};

/**
 * @typedef ArrayLengthTestConf
 * @type {BaseTestConf}
 * @property {number} [minItems] - lower bound for array length
 * @property {number} [maxItems] - upper bound for array length
 *
 * Config to test 'minItems' and 'maxItems' keywords (array)
 */
