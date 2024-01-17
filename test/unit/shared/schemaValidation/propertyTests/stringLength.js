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
        return 'stringLengthTests';
    },

    /**
     * Generate 'minLength' and 'maxLength' tests for strings
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {StringLengthTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        if (!lodash.isUndefined(testConf.minLength)) {
            utils.testControls.getSubTestDescribe(testConf)(`"minLength" keyword tests (minLength === ${testConf.minLength})${subTitle}`, () => {
                if (testConf.minLength > 0) {
                    // no sense to test it when minLength is 0
                    it('should not allow to set string with length less than minLength', () => {
                        const testDecl = lodash.cloneDeep(ctx.declaration);
                        lodash.set(
                            testDecl,
                            ctx.property,
                            testConf.valueCb(
                                testDecl,
                                ctx.property,
                                testConf.minLength - 1
                            )
                        );
                        return assert.isRejected(
                            ctx.validator(testDecl),
                            new RegExp(`"keyword":"minLength".*"dataPath":.*${ctx.propFullName}.*"message":"should NOT be shorter than ${testConf.minLength} characters"`),
                            `should not allow to set string with length shorter than ${testConf.minLength} characters`
                        );
                    });
                }

                it('should allow to set string with length equal to minLength', () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(
                        testDecl,
                        ctx.property,
                        testConf.valueCb(
                            testDecl,
                            ctx.property,
                            testConf.minLength
                        )
                    );
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should allow to set string with length equal to ${testConf.minLength} characters`
                    );
                });
            });
        }
        if (!lodash.isUndefined(testConf.maxLength)) {
            utils.testControls.getSubTestDescribe(testConf)(`"maxLength" keyword tests (maxLength === ${testConf.maxLength})${subTitle}`, () => {
                it('should not allow to set string with length more than maxLength', () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(
                        testDecl,
                        ctx.property,
                        testConf.valueCb(
                            testDecl,
                            ctx.property,
                            testConf.maxLength + 1
                        )
                    );
                    return assert.isRejected(
                        ctx.validator(testDecl),
                        new RegExp(`"keyword":"maxLength".*"dataPath":.*${ctx.propFullName}.*"message":"should NOT be longer than ${testConf.maxLength} characters"`),
                        `should not allow to set string with length more than ${testConf.maxLength} characters`
                    );
                });

                it('should allow to set string with length equal to maxLength', () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(
                        testDecl,
                        ctx.property,
                        testConf.valueCb(
                            testDecl,
                            ctx.property,
                            testConf.maxLength
                        )
                    );
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should allow to set string with length equal to ${testConf.maxLength} characters`
                    );
                });
            });
        }
    },
    /**
     * Process and normalize test options
     *
     * @param {StringLengthTestConf} options
     *
     * @returns {StringLengthTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (options === true) {
                options = { minLength: 1 };
            } else if (options === false) {
                options = { enable: false };
            } else if (lodash.isNumber(options)) {
                options = { minLength: options };
            } else if (!lodash.isObject(options)) {
                assert.fail(`stringLengthTests expected to be "true", number or object, got "${typeof options}" instead`);
            }
            if (!options.valueCb) {
                options.valueCb = (decl, prop, len) => utils.randomString(len);
            }
        }
        return options;
    }
};

/**
 * @typedef StringLengthTestConf
 * @type {BaseTestConf}
 * @property {number} [minLength] - lower bound for string length
 * @property {number} [maxLength] - upper bound for string length
 * @property {StringLengthTestValueCb} valueCb - callback to generate specific string
 *
 * Config to test 'minLength' keyword (string)
 */
/**
 * @callback StringLengthTestValueCb
 * @param {any} decl - declaration
 * @param {PropertyNamePath} property - property
 * @param {number} len - string length to generate
 * @returns {string} value to set
 */
