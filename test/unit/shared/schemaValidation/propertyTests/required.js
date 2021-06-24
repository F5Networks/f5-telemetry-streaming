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
        return 'requiredTests';
    },

    /**
     * Generate 'required' tests
     *
     * @param {PropertyTestCtx} ctx - context
     * @param {RequiredKwdTestConf} testConf - test config
     *
     * @returns {void} once tests were generated
     */
    tests(ctx, testConf) {
        const subTitle = utils.testControls.fmtSubTitle(testConf);
        utils.testControls.getSubTestDescribe(testConf)(`"required" keyword tests${subTitle}`, () => {
            if (testConf.self) {
                it('should fail when required property is not set', () => {
                    const ajvProp = ctx.propFullName.split('.').slice(-1)[0];
                    const testDecl = lodash.cloneDeep(ctx.declaration);
                    lodash.unset(testDecl, ctx.property);
                    return assert.isRejected(
                        ctx.validator(testDecl),
                        new RegExp(`"keyword":"required".*"missingProperty":.*${ajvProp}.*"message":"should have required property.*${ajvProp}`),
                        `should require property "${ctx.propFullName}"`
                    );
                });

                it('should not fail when required property is set', () => assert.isFulfilled(
                    ctx.validator(lodash.cloneDeep(ctx.declaration)),
                    `should not fail when required property "${ctx.propFullName}" is set`
                ));
            }
            if (testConf.properties && testConf.properties.length > 0) {
                const combinations = utils.arrayCombinations(
                    testConf.properties,
                    testConf.combinations ? 1 : testConf.properties.length,
                    testConf.properties.length
                );
                combinations.forEach((propSets) => {
                    utils.testControls.getSubTestDescribe(testConf)(`test for required properties - ${propSets.join(', ')}`, () => {
                        it('should fail when required properties are not set', () => {
                            const ajvProp = ctx.propFullName.split('.').slice(-1)[0];
                            const testDecl = lodash.cloneDeep(ctx.declaration);
                            const targetObj = lodash.get(testDecl, ctx.property);
                            propSets.forEach(prop => lodash.unset(targetObj, prop));
                            lodash.set(testDecl, ctx.property, targetObj);
                            return assert.isRejected(
                                ctx.validator(testDecl),
                                new RegExp(`"keyword":"required".*${ajvProp}.*"message":"should have required property.*`),
                                `should fail when required child properties for "${ctx.propFullName}" are not set`
                            );
                        });
                    });
                });
            }
        });
    },

    /**
     * Process and normalize test options
     *
     * @param {RequiredKwdTestConf} options
     *
     * @returns {RequiredKwdTestConf} processed and normalized options
     */
    options(options) {
        const processOpts = (opts) => {
            if (lodash.isString(opts)) {
                return [opts];
            }
            if (lodash.isArray(opts)) {
                return opts.map((prop) => {
                    assert.isString(prop, 'expected required property name to be a string');
                    return prop;
                });
            }
            return assert.fail(`requiredTests expected to be string or array of strings, got "${typeof opts}" instead`);
        };
        if (!lodash.isUndefined(options)) {
            if (lodash.isBoolean(options)) {
                options = { enable: options, self: true };
            } else if (!(lodash.isObject(options) && lodash.has(options, 'properties'))) {
                options = { properties: processOpts(options) };
            } else if (lodash.isObject(options) && lodash.has(options, 'properties')) {
                options.properties = processOpts(options.properties);
            } else {
                assert.fail(`requiredTests expected to be boolean, string, array of strings or object, got "${typeof options}" instead`);
            }
        }
        return options;
    }
};

/**
 * @typedef RequiredKwdTestConf
 * @type {BaseTestConf}
 * @property {boolean} combinations - test all combinations
 * @property {string | Array<string>} properties - properties to test
 * @property {boolean} self - test property itself
 *
 * Config to test 'required' keyword
 */
