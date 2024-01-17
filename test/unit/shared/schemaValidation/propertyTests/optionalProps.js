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
        return 'optionalPropTests';
    },

    /**
     * Generate tests to check that property is optional
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {OptionalPropTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"optional" property tests${subTitle}`, () => {
            if (testConf.self) {
                it('should not fail when optional property is not set', () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.unset(testDecl, ctx.property);
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should not fail when optional property "${ctx.propFullName}" is not set`
                    );
                });

                it('should not fail when optional property is set', () => {
                    if (!lodash.has(ctx.declaration, ctx.property)) {
                        assert.fail(`Declaration has no such property with name (or at path) "${ctx.property}`);
                    }
                    return assert.isFulfilled(
                        ctx.validator(ctx.declaration),
                        `should not fail when optional property "${ctx.propFullName}" is set`
                    );
                });
            }
            if (testConf.properties && testConf.properties.length > 0) {
                const combinations = utils.arrayCombinations(
                    lodash.range(testConf.properties.length),
                    testConf.combinations ? 1 : testConf.properties.length,
                    testConf.properties.length
                );
                combinations.forEach((propSets) => {
                    utils.testControls.getSubTestDescribe(testConf)(`test for optional properties - ${propSets.map((idx) => testConf.properties[idx].name).join(', ')}`, () => {
                        it('should not fail when optional child properties are not set', () => {
                            const testDecl = lodash.cloneDeep(ctx.declaration);
                            const targetObj = lodash.get(testDecl, ctx.property);
                            propSets.forEach((idx) => lodash.unset(targetObj, testConf.properties[idx].name));
                            lodash.set(testDecl, ctx.property, targetObj);
                            return assert.isFulfilled(
                                ctx.validator(testDecl),
                                `should not fail when optional child properties for "${ctx.propFullName}" are not set`
                            );
                        });
                        if (lodash.some(propSets.map((idx) => lodash.has(testConf.properties[idx], 'value')))) {
                            it('should not fail when optional child properties are set', () => {
                                const testDecl = lodash.cloneDeep(ctx.declaration);
                                const targetObj = lodash.get(testDecl, ctx.property);
                                propSets.forEach((idx) => {
                                    if (lodash.has(testConf.properties[idx], 'value')) {
                                        lodash.set(
                                            targetObj,
                                            testConf.properties[idx].name,
                                            testConf.properties[idx].value
                                        );
                                    }
                                });
                                lodash.set(testDecl, ctx.property, targetObj);
                                return assert.isFulfilled(
                                    ctx.validator(testDecl),
                                    `should not fail when optional child properties for "${ctx.propFullName}" are set`
                                );
                            });
                        }
                    });
                });
            }
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {OptionalPropTestConf} options
     *
     * @returns {OptionalPropTestConf} processed and normalized options
     */
    options(options) {
        const processOpts = (opts) => {
            if (lodash.isString(opts)) {
                return [{ name: opts }];
            }
            if (lodash.isArray(opts)) {
                return opts.map((prop) => {
                    assert.isString(prop, 'expected optional property name to be a string');
                    return { name: prop };
                });
            }
            if (lodash.isObject(opts)) {
                return Object.keys(opts).map((prop) => ({ name: prop, value: opts[prop] }));
            }
            return assert.fail(`optionalPropTests expected to be string, array of strings or object, got "${typeof opts}" instead`);
        };

        if (!lodash.isUndefined(options)) {
            if (lodash.isBoolean(options)) {
                options = { enable: options, self: true };
            } else if (!(lodash.isObject(options) && lodash.has(options, 'properties'))) {
                options = { properties: processOpts(options) };
            } else if (lodash.isObject(options) && lodash.has(options, 'properties')) {
                if (!(lodash.isArray(options.properties) && lodash.isObject(options.properties[0]))) {
                    options.properties = processOpts(options.properties);
                }
            } else {
                assert.fail(`optionalPropTests expected to be boolean, string, array of strings or object, got "${typeof options}" instead`);
            }
        }
        return options;
    }
};

/**
 * @typedef OptionalPropTestConf
 * @type {BaseTestConf}
 * @property {boolean} combinations - test all combinations
 * @property {string | Array<string> | object} properties - properties to test
 * @property {boolean} self - test property itself
 *
 * Config to test that property is optional
 */
