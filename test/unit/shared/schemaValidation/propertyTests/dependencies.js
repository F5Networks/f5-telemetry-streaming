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
