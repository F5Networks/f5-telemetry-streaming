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
                    .then(validDecl => assert.deepStrictEqual(
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
