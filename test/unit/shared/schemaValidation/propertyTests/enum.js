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
        return 'enumTests';
    },

    /**
     * Generate Enum Tests
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {EnumTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"enum" keyword tests${subTitle}`, () => {
            testConf.notAllowed.forEach((negVal) => it(`should not allow value "${negVal}"`, () => {
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.set(testDecl, ctx.property, negVal);
                return assert.isRejected(
                    ctx.validator(testDecl),
                    new RegExp(`"keyword":"enum".*${ctx.propFullName}.*"message":"should be equal to one of the allowed values"`),
                    `should not allow to set value "${negVal}" that not defined in enum`
                );
            }));
            testConf.allowed.forEach((posVal) => it(`should allow value "${posVal}"`, () => {
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.set(testDecl, ctx.property, posVal);
                return assert.isFulfilled(
                    ctx.validator(testDecl),
                    `should allow to set value "${posVal}" that defined in enum`
                );
            }));
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {EnumTestConf} options
     *
     * @returns {EnumTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (options === true) {
                options = { notAllowed: utils.randomString(10) };
            } else if (options === false) {
                options = { enable: false };
            } else if (Array.isArray(options) || !lodash.isObject(options)) {
                options = { allowed: options };
            }
            if (!Array.isArray(options.allowed)) {
                options.allowed = [options.allowed];
            } else if (lodash.isUndefined(options.allowed)) {
                options.allowed = [];
            }
            if (!Array.isArray(options.notAllowed)) {
                options.notAllowed = [options.notAllowed];
            } else if (lodash.isUndefined(options.notAllowed)) {
                options.notAllowed = [];
            }
        }
        return options;
    }
};

/**
 * @typedef EnumTestConf
 * @type {BaseTestConf}
 * @property {any | Array<any>} [allowed] - allowed values
 * @property {any | Array<any>} [notAllowed] - not allowed values
 *
 * Config to test 'enum' keyword. Normalized version sets 'allowed' and 'notAllowed' to arrays
 */
