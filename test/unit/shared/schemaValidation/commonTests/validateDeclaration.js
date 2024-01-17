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
        return 'validateDeclarationTests';
    },

    /**
     * Validate declaration only
     *
     * @param {CommonTestCtx} ctx - context
     * @param {ValidateDeclarationTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`validating entire declaration${subTitle}`, () => {
            it('should validate entire declaration', () => assert.isFulfilled(
                ctx.validator(lodash.cloneDeep(ctx.declaration)),
                'should validate declaration'
            ));
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {ValidateDeclarationTestConf} options
     *
     * @returns {ValidateDeclarationTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (lodash.isBoolean(options)) {
                options = { enable: options };
            } else if (!lodash.isObject(options)) {
                assert.fail(`validateDeclarationTests expected to be boolean or object, got "${typeof options}" instead`);
            }
        }
        return options;
    }
};

/**
 * @typedef ValidateDeclarationTestConf
 * @type {BaseTestConf}
 *
 * Config for 'validateDeclaration' test
 */
