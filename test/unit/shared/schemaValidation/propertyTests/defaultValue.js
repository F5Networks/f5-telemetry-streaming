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
        return 'defaultValueTests';
    },

    /**
     * Generate tests for "default" keyword
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {DefaultValueTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"default" keyword tests${subTitle}`, () => {
            it('should return default value when property not set', () => {
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.unset(testDecl, ctx.property);
                return ctx.validator(testDecl)
                    .then((validDecl) => assert.deepStrictEqual(
                        lodash.get(validDecl, ctx.property),
                        testConf.defaultValue,
                        `should return default value when property "${ctx.propFullName}" not set`
                    ));
            });
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {DefaultValueTestConf} options
     *
     * @returns {DefaultValueTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (options === false) {
                options = { enable: false };
            } else if (!(lodash.isObject(options) && lodash.has(options, 'defaultValue'))) {
                options = { defaultValue: options };
            }
        }
        return options;
    }
};

/**
 * @typedef DefaultValueTestConf
 * @type {BaseTestConf}
 * @property {any} [defaultValue] - default value
 *
 * Config to test 'default' keyword
 */
