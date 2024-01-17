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
        return 'valueTests';
    },

    /**
     * Generate tests to verify property' value
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {ValueTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`property value tests${subTitle}`, () => {
            if (lodash.has(testConf, 'invalid')) {
                it('should fail on attempt to set invalid value', () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, testConf.invalid);
                    return assert.isRejected(
                        ctx.validator(testDecl),
                        /keyword/,
                        `should not allow to set invalid value to property "${ctx.propFullName}"`
                    );
                });
            }
            if (lodash.has(testConf, 'valid')) {
                it('should allow to set valid value', () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, lodash.cloneDeep(testConf.valid));
                    return ctx.validator(testDecl)
                        .then((validated) => {
                            if (testConf.checkValue) {
                                assert.deepStrictEqual(
                                    lodash.get(validated, ctx.property),
                                    testConf.valid,
                                    `should allow to set and verify valid value to property "${ctx.propFullName}"`
                                );
                            }
                        });
                });
            }
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {ValueTestConf} options
     *
     * @returns {ValueTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (lodash.isBoolean(options)) {
                options = { enable: options, valid: options };
            } else if (!(lodash.isObject(options)
                && (lodash.has(options, 'valid') || lodash.has(options, 'invalid')))) {
                options = { valid: options };
            }
        }
        return options;
    }
};

/**
 * @typedef ValueTestConf
 * @type {BaseTestConf}
 * @property {any} invalid - invalid value that cause validator to throw error on attempt to validate declaration
 * @property {any} valid - valid value that allows declaration to pass validation
 * @property {boolean} checkValue - verify value
 *
 * Config to test property' value
 */
