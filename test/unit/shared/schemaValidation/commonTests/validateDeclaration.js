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
