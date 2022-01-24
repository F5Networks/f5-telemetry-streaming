/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const lodash = require('lodash');

const utils = require('../utils');

chai.use(chaiAsPromised);
const assert = chai.assert;

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
