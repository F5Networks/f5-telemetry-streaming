/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-use-before-define */

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const lodash = require('lodash');
const mochaDescribe = require('mocha').describe;
const path = require('path');

const utils = require('./utils');

const subTests = {
    commonTests: {},
    propertyTests: {}
};
Object.keys(subTests)
    .forEach((parentDir) => fs.readdirSync(path.join(__dirname, parentDir))
        .forEach((subModule) => {
            // eslint-disable-next-line global-require, import/no-dynamic-require
            const lib = require(path.join(__dirname, parentDir, subModule));
            if (lib.name()) {
                subTests[parentDir][lib.name()] = lib;
            }
        }));

chai.use(chaiAsPromised);
const assert = chai.assert;

module.exports = {
    /**
     * Generate schema tests to validate basic keywords
     *
     * @param {function<any>} validator - function to validate declaration
     * @param {any} validDecl - valid declaration to use for tests
     * @param {PropertyTestCb | PropertyTestConf | PropertyTestsConf | string | Array<PropertyTestConf
     *  | PropertyTestsConf | string | Array<string>>} props - properties to test
     * @param {SchemaTestOptions} options - default options
     */
    generateSchemaBasicTests: utils.testControls.describeWrapper(function (validator, validDecl, props, options) {
        options = processOptions(options);

        // see 'describeWrapper' function
        this('JSON Schema validation tests (auto-gen)', () => {
            if (lodash.isFunction(props)) {
                props = props(utils.testControls.describeUserSubTestWrapper());
            }
            props = Array.isArray(props) ? props : [props];
            props.forEach((propToTest) => {
                let suiteDescribe = mochaDescribe;
                if (lodash.isFunction(propToTest)) {
                    const conf = propToTest();
                    suiteDescribe = conf.describe;
                    propToTest = conf.testConf;
                }
                /**
                 * Create property test config and assign defaults from options
                 */
                const propConf = (lodash.isArray(propToTest) || lodash.isString(propToTest))
                    ? { property: propToTest } : propToTest;

                if (!propConf.tests) {
                    propConf.tests = [lodash.cloneDeep(propConf)];
                }
                propConf.tests = propConf.tests.map((testConf) => processOptions(testConf, options));
                propConf.tests.forEach((testConf) => {
                    const baseCtx = {
                        declaration: lodash.cloneDeep(validDecl),
                        validator
                    };

                    if (propConf.property) {
                        /**
                         * Simply verify that path is string(s)
                         */
                        if (Array.isArray(propConf.property)) {
                            propConf.property.forEach((p) => assert.isString(p, `Property path ${JSON.stringify(propConf.property)} should contain strings only`));
                        } else {
                            assert.isString(propConf.property, `Property name "${propConf.property}" should be a string`);
                        }

                        const ctx = Object.assign({
                            property: propConf.property,
                            propFullName: Array.isArray(propConf.property)
                                ? propConf.property.join('.') : propConf.property
                        }, baseCtx);

                        suiteDescribe(`"${ctx.propFullName}" tests`, () => {
                            Object.keys(testConf).forEach((pKey) => {
                                if (pKey.toLowerCase().endsWith('tests')) {
                                    if (!lodash.has(subTests.propertyTests, pKey)) {
                                        assert.fail(`Unknown test config name "${pKey}" for property tests`);
                                    }
                                    if (testConf[pKey].enable) {
                                        subTests.propertyTests[pKey].tests(ctx, testConf[pKey]);
                                    }
                                }
                            });
                        });
                    } else {
                        const ctx = Object.assign({}, baseCtx);
                        suiteDescribe('non-property tests', () => {
                            Object.keys(testConf).forEach((pKey) => {
                                if (pKey.toLowerCase().endsWith('tests')) {
                                    if (!lodash.has(subTests.commonTests, pKey)) {
                                        assert.fail(`Unknown test config name "${pKey}" for common tests`);
                                    }
                                    if (testConf[pKey].enable) {
                                        subTests.commonTests[pKey].tests(ctx, testConf[pKey]);
                                    }
                                }
                            });
                        });
                    }
                });
            });
        });
    }),

    /**
     * Wrap validator for schema basic tests
     *
     * @param {DeclarationValidator} validator - function to validate declaration
     * @param {any} rootDecl - valid declaration to use for tests
     * @param {string | Array<string>>} pathToSubDecl - path to use to assign sub-declaration to root declaration
     * @param {object} options - options
     * @param {string} options.mergeStrategy - 'merge' (default) or 'set'
     *
     * @returns {DeclarationValidator} wrapped validator then Promise resolving with sub-declaration
     */
    wrapValidatorForSchemaBasicTests(validator, rootDecl, pathToSubDecl, options) {
        options = lodash.defaultsDeep(options, { mergeStrategy: 'merge' });
        return (subDecl) => {
            const rootDeclCopy = lodash.cloneDeep(rootDecl);
            if (options.mergeStrategy === 'set') {
                lodash.set(rootDeclCopy, pathToSubDecl, subDecl);
            } else {
                lodash.set(rootDeclCopy, pathToSubDecl, lodash.defaults(
                    subDecl,
                    lodash.get(rootDeclCopy, pathToSubDecl)
                ));
            }
            return validator(rootDeclCopy)
                .then((validated) => lodash.get(validated, pathToSubDecl));
        };
    }
};

/**
 * Set control properties for test config
 *
 * Note: This method mutates "testConf".
 *
 * @param {BaseTestConf} testConf - test config
 * @returns {void} once set
 */
function setControlProperties(testConf) {
    if (lodash.isUndefined(testConf.enable)) {
        testConf.enable = true;
    }
    if (lodash.isUndefined(testConf.only)) {
        testConf.only = false;
    }
    if (lodash.isUndefined(testConf.skip)) {
        testConf.skip = false;
    }
}

/**
 * Process and normalize test options
 *
 * @param {SchemaTestOptions} options
 * @param {SchemaTestOptions} [parentDefaults] - default options
 *
 * @returns {SchemaTestOptions} processed and normalized options
 */
function processOptions(options, parentDefaults) {
    options = lodash.cloneDeep(options || {});
    parentDefaults = lodash.cloneDeep(parentDefaults);

    Object.keys(subTests).forEach((parentDir) => {
        Object.keys(subTests[parentDir]).forEach((tKey) => {
            options[tKey] = subTests[parentDir][tKey].options(options[tKey]);
            if (!lodash.isUndefined(options[tKey])) {
                setControlProperties(options[tKey]);
            } else {
                delete options[tKey];
            }
        });
    });
    /**
     * Assign defaults from options
     */
    if (parentDefaults) {
        /**
         * Copy test configs from options. When test disabled, then ignore it
         */
        Object.keys(parentDefaults).forEach((parentKey) => {
            if ((!options.ignoreOther && lodash.isUndefined(options[parentKey]))
                || (options[parentKey] && options[parentKey].enable)) {
                options[parentKey] = lodash.defaultsDeep(options[parentKey], parentDefaults[parentKey]);
            }
        });
    }
    return options;
}

/**
 * DEFINITIONS ONLY
 */
/**
 * @typedef PropertyNamePath
 * @type {string | Array<string>}
 *
 * Property name or path (see lodash.set/get/unset methods)
 */
/**
 * @typedef SchemaTestOptions
 * @type {object}
 * @property {boolean | string | object | AdditionalPropsTestConf} [additionalPropsTests]
 * @property {boolean | number | ArrayLengthTestConf} [arrayLengthTests]
 * @property {boolean | string | DefaultValueTestConf} [defaultValueTests]
 * @property {boolean | any | DependenciesTestConf} [dependenciesTests]
 * @property {boolean | any | Array<any> | EnumTestConf} [enumTests]
 * @property {boolean | number | NumberRangeTestConf} [numberRangeTests]
 * @property {boolean | OptionalPropTestConf} [optionalTests]
 * @property {boolean | RequiredKwdTestConf} [requiredTests]
 * @property {boolean | number | StringLengthTestConf} [stringLengthTests]
 * @property {boolean | ValidateDeclarationTestConf} [validateDeclarationTests]
 *
 * Schema Test Options:
 * - additionalPropsTests:
 *   - when set to 'true' then it will generate random name for property and test against it
 *   - when set to 'string' then it will be used as allowed property name and test again it
 *   - when set to 'object' then it will merged to declaration as allowed properties and test against it
 *   - when set to 'false' then disabled
 * - arrayLengthTests:
 *   - when set to 'true' it will try to test 'minItems' keyword with value 1
 *   - when set to 'number' it will try to test 'minItems' with that number
 *   - when set to 'false' then disabled
 * - defaultValueTests:
 *   - when set to any type other than DefaultValueTestConf then it will try to remove property
 *      and check property's value against provided value
 *   - when set to 'false' then disabled
 * - dependenciesTests:
 *   - when set to 'true' then it will try to remove property and search for particular error message
 *   - when set to 'string' then it will try to remove property and search dependent property in error message
 *   - when set to 'false' then disabled
 * - enumTests:
 *   - when set to 'true' then it will test property against not allowed random string
 *   - when set to 'array of any' and not an object then it will be treated as one or array of allowed values
 *   - when set to 'false' then disabled
 * - numberRangeTests:
 *   - when set to 'true' it will try to test 'minimum' keyword with value 1
 *   - when set to 'number' then it will test property against 'minimum' keyword
 *   - when set to 'false' then disabled
 * - optionalPropTests:
 *   - when set to 'true' it will try to remove property itself
 *   - when set to 'string' or 'array of string' or 'object'
 *      then it will be used as name(s) to remove nested property(s)
 *   - when set to 'false' then disabled
 * - stringLengthTests:
 *   - when set to 'true' it will try to test 'minLength' keyword with value 1
 *   - when set to 'number' it will try to test 'minLength' with that number
 *   - when set to 'false' then disabled
 */
/**
 * @typedef PropertyTestConf
 * @type {SchemaTestOptions}
 * @property {PropertyNamePath} property - property name/path
 * @property {boolean} [ignoreOther] - ignore other tests defined in options
 */
/**
 * @typedef PropertyTestsConf
 * @type {SchemaTestOptions}
 * @property {PropertyNamePath} property - property name/path
 * @property {Array<SchemaTestOptions>} tests - tests to generate
 */
/**
 * @typedef BaseTestConf
 * @type {object}
 * @property {boolean} [enable = true] - enable or disable
 * @property {boolean} [only = false] - use .only
 * @property {boolean} [skip = false] - use .skip
 * @property {string} [subTitle] - additional title
 */
/**
 * @typedef BaseTestCtx
 * @type {object}
 * @property {any} declaration - declaration
 * @property {DeclarationValidator} validator - validator
 */
/**
 * @typedef CommonTestCtx
 * @type {BaseTestCtx}
 */
/**
 * @typedef PropertyTestCtx
 * @type {BaseTestCtx}
 * @property {string | Array<string>} property - property name/path
 * @property {string} propFullName - property full name
 */
/**
 * @callback PropertyTestCb
 * @param {function(string | Array<string> | PropertyTestConf | PropertyTestsConf)} subTestDescribe
 * @param {function(string | Array<string> | PropertyTestConf | PropertyTestsConf)} subTestDescribe.only
 * @param {function(string | Array<string> | PropertyTestConf | PropertyTestsConf)} subTestDescribe.skip
 * @returns {string | Array<string> | function | PropertyTestCb}
 */
/**
 * @callback DeclarationValidator
 * @param {any} declaration - declaration to validate
 * @returns {Promise<any>} resolved with validated and expanded declaration
 */
