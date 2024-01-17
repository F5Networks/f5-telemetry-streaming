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
        return 'dependenciesTests';
    },

    /**
     * Generate Dependencies Tests
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {DependenciesTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"dependencies" keyword tests${subTitle}`, () => {
            it('should depend on other property(s)', () => {
                const ajvProp = ctx.propFullName.split('.').slice(-1)[0];
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.unset(testDecl, ctx.property);
                return assert.isRejected(
                    ctx.validator(testDecl),
                    new RegExp(`"keyword":"dependencies".*"missingProperty":.*${ajvProp}.*"message":"should have property.*${ajvProp} when property.*${testConf.dependsOn}.*is present`),
                    `property "${ctx.propFullName}" should depend on other prop(s)`
                );
            });
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {DependenciesTestConf} options
     *
     * @returns {DependenciesTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (options === true) {
                options = { dependsOn: '' };
            } else if (options === false) {
                options = { enable: false };
            } else if (lodash.isString(options)) {
                options = { dependsOn: options };
            } else if (!lodash.isObject(options)) {
                assert.fail(`dependenciesTests expected to be boolean, string or object, got "${typeof options}" instead`);
            }
        }
        return options;
    }
};

/**
 * @typedef DependenciesTestConf
 * @type {BaseTestConf}
 * @property {string} [dependsOn] - dependant property
 *
 * Config to test 'dependencies' keyword
 */
