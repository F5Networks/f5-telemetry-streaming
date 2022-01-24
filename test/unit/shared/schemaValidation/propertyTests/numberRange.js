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
        return 'numberRangeTests';
    },

    /**
     * Generate 'minimum' and 'maximum' tests for numbers
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {NumberRangeTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        if (!lodash.isUndefined(testConf.minimum)) {
            utils.testControls.getSubTestDescribe(testConf)(`"minimum" keyword tests (minimum === ${testConf.minimum})${subTitle}`, () => {
                it(`should not allow to set value less than "${testConf.minimum}"`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, testConf.minimum - 1);
                    return assert.isRejected(
                        ctx.validator(testDecl),
                        new RegExp(`"keyword":"minimum".*${ctx.propFullName}.*.*"message":"should be >= ${testConf.minimum}`),
                        `should not allow to set value < ${testConf.minimum}`
                    );
                });

                it(`should allow to set value equal to "${testConf.minimum}"`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, testConf.minimum);
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should allow to set value === ${testConf.minimum}`
                    );
                });
            });
        }
        if (!lodash.isUndefined(testConf.maximum)) {
            utils.testControls.getSubTestDescribe(testConf)(`"maximum" keyword tests (maximum === ${testConf.maximum})${subTitle}`, () => {
                it(`should not allow to set value more than "${testConf.maximum}"`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, testConf.maximum + 1);
                    return assert.isRejected(
                        ctx.validator(testDecl),
                        new RegExp(`"keyword":"maximum".*${ctx.propFullName}.*.*"message":"should be <= ${testConf.maximum}`),
                        `should not allow to set value > ${testConf.maximum}`
                    );
                });

                it(`should allow to set value equal to "${testConf.maximum}"`, () => {
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.set(testDecl, ctx.property, testConf.maximum);
                    return assert.isFulfilled(
                        ctx.validator(testDecl),
                        `should allow to set value === ${testConf.maximum}`
                    );
                });
            });
        }
    },

    /**
     * Process and normalize test options
     *
     * @param {NumberRangeTestConf} options
     *
     * @returns {NumberRangeTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (options === true) {
                options = { minimum: 1 };
            } else if (lodash.isNumber(options)) {
                options = { minimum: options };
            } else if (options === false) {
                options = { enable: false };
            } else if (!lodash.isObject(options)) {
                assert.fail(`numberRangeTests expected to be boolean, number or object, got "${typeof options}" instead`);
            }
        }
        return options;
    }
};

/**
 * @typedef NumberRangeTestConf
 * @type {BaseTestConf}
 * @property {number} [minimum] - lower bound
 * @property {number} [maximum] - upper bound
 *
 * Config to test 'minimum' and 'maximum' keywords (number)
 */
