/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
            testConf.notAllowed.forEach(negVal => it(`should not allow value "${negVal}"`, () => {
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.set(testDecl, ctx.property, negVal);
                return assert.isRejected(
                    ctx.validator(testDecl),
                    new RegExp(`"keyword":"enum".*${ctx.propFullName}.*"message":"should be equal to one of the allowed values"`),
                    `should not allow to set value "${negVal}" that not defined in enum`
                );
            }));
            testConf.allowed.forEach(posVal => it(`should allow value "${posVal}"`, () => {
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
