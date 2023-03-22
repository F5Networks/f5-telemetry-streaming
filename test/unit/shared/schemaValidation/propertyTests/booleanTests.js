/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
        return 'booleanTests';
    },

    /**
     * Generate tests to verify property' value
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {BooleanTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"boolean" type tests${subTitle}`, () => {
            [true, false].forEach((val) => it(`should allow to set "${val}" as value`, () => {
                const testDecl = lodash.cloneDeep(ctx.declaration);
                lodash.set(testDecl, ctx.property, val);
                return ctx.validator(testDecl)
                    .then((validated) => {
                        if (testConf.checkValue) {
                            assert.deepStrictEqual(
                                lodash.get(validated, ctx.property),
                                val,
                                `should allow to set "${val}" to property "${ctx.propFullName}"`
                            );
                        }
                    });
            }));
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {BooleanTestConf} options
     *
     * @returns {BooleanTestConf} processed and normalized options
     */
    options(options) {
        if (!lodash.isUndefined(options)) {
            if (lodash.isBoolean(options)) {
                options = { checkValue: options };
            }
        }
        return options;
    }
};

/**
 * @typedef BooleanTestConf
 * @type {BaseTestConf}
 * @property {boolean} checkValue - verify value
 *
 * Config to test boolean type
 */
