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
const mochaDescribe = require('mocha').describe;


chai.use(chaiAsPromised);
const assert = chai.assert;

module.exports = {
    /**
     * Generate schema tests to validate basic keywords
     *
     * @param {any} validDecl - valid declaration to use for tests
     * @param {PropertyTestCb | PropertyTestConf | string | Array<PropertyTestConf
     *  | string | Array<string>>} props - properties to test
     * @param {SchemaTestOptions} options - default options
     */
    generateBasicSchemaTests: describeWrapper(function (validator, validDecl, props, options) {
        /**
         * props might be:
         * - string - property name/path
         * - object - property test config
         * - array of array of strings - path to the property that can't be described as
         *      plane string (e.g. dot is part of the name, see "lodash.set")
         * - collection (array) of everything above:
         *    [
         *        'string',
         *        ['path', 'to', '.property']
         *        { property: 'string' },
         *        { property: ['path', 'to', '.property'] }
         *    ]
         * - function(describeWrapper) - callback that might return all of the above plus:
         *      - result of calling describeWrapper
         * (describeWrapper) => [
         *      'string',
         *      describeWrapper('path to property'),
         *      describeWrapper(['path', 'to', '.property']),
         *      describeWrapper.skip({ property: 'string' }),
         *      describeWrapper.only({ property: ['path', 'to', '.property'] })
         * ]
         */
        options = processOptions(options);

        // see 'describeWrapper' function
        this('JSON Schema keywords validation tests (auto-gen)', () => {
            if (typeof props === 'function') {
                props = props(describeUserSubTestWrapper());
            }
            props = Array.isArray(props) ? props : [props];
            props.forEach((propToTest) => {
                let propTestDescribe = mochaDescribe;
                if (typeof propToTest === 'function') {
                    const conf = propToTest();
                    propTestDescribe = conf.describe;
                    propToTest = conf.testConf;
                }
                /**
                 * Create property test config and assign defaults from options
                 */
                let propConf = (Array.isArray(propToTest) || typeof propToTest === 'string')
                    ? { property: propToTest } : propToTest;
                propConf = processOptions(propConf, options);

                /**
                 * Simply verify that path is string(s)
                 */
                if (Array.isArray(propConf.property)) {
                    propConf.property.forEach(p => assert.isString(
                        p, `Property path ${JSON.stringify(propConf.property)} should contain strings only`
                    ));
                } else {
                    assert.isString(propConf.property, `Property name "${propConf.property}" should be a string`);
                }

                const declCopy = lodash.cloneDeep(validDecl);
                const propFullName = Array.isArray(propConf.property)
                    ? propConf.property.join('.') : propConf.property;

                propTestDescribe(`"${propFullName}" tests`, () => {
                    if (propConf.arrayLengthTests && propConf.arrayLengthTests.enable) {
                        if (!lodash.isUndefined(propConf.arrayLengthTests.minItems)) {
                            getSubTestDescribe(propConf.arrayLengthTests)('"minItems" keyword tests', () => {
                                if (propConf.arrayLengthTests.minItems > 0) {
                                    // no sense to test when minItems is 0
                                    it(`should not allow to set less items than "${propConf.arrayLengthTests.minItems}"`, () => {
                                        const testDecl = lodash.cloneDeep(declCopy);
                                        lodash.set(testDecl, propConf.property, lodash.fill(
                                            Array(propConf.arrayLengthTests.minItems - 1),
                                            lodash.get(testDecl, propConf.property)[0]
                                        ));
                                        return assert.isRejected(
                                            validator(testDecl),
                                            new RegExp(`"keyword":"minItems".*${propFullName}.*.*"message":"should NOT have fewer than ${propConf.arrayLengthTests.minItems} items`),
                                            `should not allow to set less items than ${propConf.arrayLengthTests.minItems}`
                                        );
                                    });
                                }

                                it(`should allow to set "${propConf.arrayLengthTests.minItems}" items`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, lodash.fill(
                                        Array(propConf.arrayLengthTests.minItems),
                                        lodash.get(testDecl, propConf.property)[0]
                                    ));
                                    return assert.isFulfilled(
                                        validator(testDecl),
                                        `should allow to set ${propConf.arrayLengthTests.minItems} items`
                                    );
                                });
                            });
                        }
                        if (!lodash.isUndefined(propConf.arrayLengthTests.maxItems)) {
                            getSubTestDescribe(propConf.arrayLengthTests)('"maxItems" keyword tests', () => {
                                it(`should not allow to set more items than "${propConf.arrayLengthTests.maxItems}"`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, lodash.fill(
                                        Array(propConf.arrayLengthTests.maxItems + 1),
                                        lodash.get(testDecl, propConf.property)[0]
                                    ));
                                    return assert.isRejected(
                                        validator(testDecl),
                                        new RegExp(`"keyword":"minItems".*${propFullName}.*.*"message":"should NOT have more than ${propConf.arrayLengthTests.maxItems} items`),
                                        `should not allow to set more items than ${propConf.arrayLengthTests.maxItems}`
                                    );
                                });

                                it(`should allow to set "${propConf.arrayLengthTests.maxItems}" items`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, lodash.fill(
                                        Array(propConf.arrayLengthTests.maxItems),
                                        lodash.get(testDecl, propConf.property)[0]
                                    ));
                                    return assert.isFulfilled(
                                        validator(testDecl),
                                        `should allow to set ${propConf.arrayLengthTests.maxItems} items`
                                    );
                                });
                            });
                        }
                    }

                    if (propConf.dependenciesTests && propConf.dependenciesTests.enable) {
                        getSubTestDescribe(propConf.dependenciesTests)('"dependencies" keyword tests', () => {
                            it('should depend on other property(s)', () => {
                                const ajvProp = propFullName.split('.').slice(-1)[0];
                                const testDecl = lodash.cloneDeep(declCopy);
                                lodash.unset(testDecl, propConf.property);
                                return assert.isRejected(
                                    validator(testDecl),
                                    new RegExp(`"keyword":"dependencies".*"missingProperty":.*${ajvProp}.*"message":"should have property.*${ajvProp} when property.*${propConf.dependenciesTests.dependsOn}.*is present`),
                                    `property ${propFullName} should depend on other prop(s)`
                                );
                            });
                        });
                    }

                    if (propConf.enumTests && propConf.enumTests.enable) {
                        getSubTestDescribe(propConf.enumTests)('"enum" keyword tests', () => {
                            propConf.enumTests.notAllowed.forEach(negVal => it(`should not allow value "${negVal}"`, () => {
                                const testDecl = lodash.cloneDeep(declCopy);
                                lodash.set(testDecl, propConf.property, negVal);
                                return assert.isRejected(
                                    validator(testDecl),
                                    new RegExp(`"keyword":"enum".*${propFullName}.*"message":"should be equal to one of the allowed values"`),
                                    `should not allow to set value "${negVal}" that not defined in enum`
                                );
                            }));
                            propConf.enumTests.allowed.forEach(posVal => it(`should allow value "${posVal}"`, () => {
                                const testDecl = lodash.cloneDeep(declCopy);
                                lodash.set(testDecl, propConf.property, posVal);
                                return assert.isFulfilled(
                                    validator(testDecl),
                                    `should allow to set value "${posVal}" that defined in enum`
                                );
                            }));
                        });
                    }

                    if (propConf.numberRangeTests && propConf.numberRangeTests.enable) {
                        if (!lodash.isUndefined(propConf.numberRangeTests.minimum)) {
                            getSubTestDescribe(propConf.numberRangeTests)('"minimum" keyword tests', () => {
                                it(`should not allow to set value less than "${propConf.numberRangeTests.minimum}"`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, propConf.numberRangeTests.minimum - 1);
                                    return assert.isRejected(
                                        validator(testDecl),
                                        new RegExp(`"keyword":"minimum".*${propFullName}.*.*"message":"should be >= ${propConf.numberRangeTests.minimum}`),
                                        `should not allow to set value < ${propConf.numberRangeTests.minimum}`
                                    );
                                });

                                it(`should allow to set value equal to "${propConf.numberRangeTests.minimum}"`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, propConf.numberRangeTests.minimum);
                                    return assert.isFulfilled(
                                        validator(testDecl),
                                        `should allow to set value === ${propConf.numberRangeTests.minimum}`
                                    );
                                });
                            });
                        }
                        if (!lodash.isUndefined(propConf.numberRangeTests.maximum)) {
                            getSubTestDescribe(propConf.numberRangeTests)('"maximum" keyword tests', () => {
                                it(`should not allow to set value more than "${propConf.numberRangeTests.maximum}"`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, propConf.numberRangeTests.maximum + 1);
                                    return assert.isRejected(
                                        validator(testDecl),
                                        new RegExp(`"keyword":"maximum".*${propFullName}.*.*"message":"should be <= ${propConf.numberRangeTests.maximum}`),
                                        `should not allow to set value > ${propConf.numberRangeTests.maximum}`
                                    );
                                });

                                it(`should allow to set value equal to "${propConf.numberRangeTests.maximum}"`, () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property, propConf.numberRangeTests.maximum);
                                    return assert.isFulfilled(
                                        validator(testDecl),
                                        `should allow to set value === ${propConf.numberRangeTests.maximum}`
                                    );
                                });
                            });
                        }
                    }

                    if (propConf.requiredTests && propConf.requiredTests.enable) {
                        getSubTestDescribe(propConf.requiredTests)('"required" keyword tests', () => {
                            it('should require property', () => {
                                const ajvProp = propFullName.split('.').slice(-1)[0];
                                const testDecl = lodash.cloneDeep(declCopy);
                                lodash.unset(testDecl, propConf.property);
                                return assert.isRejected(
                                    validator(testDecl),
                                    new RegExp(`"keyword":"required".*"missingProperty":.*${ajvProp}.*"message":"should have required property.*${ajvProp}`),
                                    `should require property ${propFullName}`
                                );
                            });
                        });
                    }

                    if (propConf.stringLengthTests && propConf.stringLengthTests.enable) {
                        if (!lodash.isUndefined(propConf.stringLengthTests.minLength)) {
                            getSubTestDescribe(propConf.stringLengthTests)(`"minLength" keyword tests (minLength === ${propConf.minLen})`, () => {
                                if (propConf.stringLengthTests.minLength > 0) {
                                    // no sense to test it when minLength is 0
                                    it('should not allow to set string with length less than minLength', () => {
                                        const testDecl = lodash.cloneDeep(declCopy);
                                        lodash.set(testDecl, propConf.property,
                                            propConf.stringLengthTests.valueCb(
                                                testDecl,
                                                propConf.property,
                                                propConf.stringLengthTests.minLength - 1
                                            ));
                                        return assert.isRejected(
                                            validator(testDecl),
                                            new RegExp(`"keyword":"minLength".*"dataPath":.*${propFullName}.*"message":"should NOT be shorter than ${propConf.stringLengthTests.minLength} characters"`),
                                            `should not allow to set string with length shorter than ${propConf.stringLengthTests.minLength} characters`
                                        );
                                    });
                                }

                                it('should allow to set string with length equal to minLength', () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property,
                                        propConf.stringLengthTests.valueCb(
                                            testDecl,
                                            propConf.property,
                                            propConf.stringLengthTests.minLength
                                        ));
                                    return assert.isFulfilled(
                                        validator(testDecl),
                                        `should allow to set string with length equal to ${propConf.stringLengthTests.minLength} characters`
                                    );
                                });
                            });
                        }
                        if (!lodash.isUndefined(propConf.stringLengthTests.maxLength)) {
                            getSubTestDescribe(propConf.stringLengthTests)(`"maxLength" keyword tests (maxLength === ${propConf.minLen})`, () => {
                                it('should not allow to set string with length more than maxLength', () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property,
                                        propConf.stringLengthTests.valueCb(
                                            testDecl,
                                            propConf.property,
                                            propConf.stringLengthTests.maxLength + 1
                                        ));
                                    return assert.isRejected(
                                        validator(testDecl),
                                        new RegExp(`"keyword":"maxLength".*"dataPath":.*${propFullName}.*"message":"should NOT be longer than ${propConf.stringLengthTests.maxLength} characters"`),
                                        `should not allow to set string with length more than ${propConf.stringLengthTests.maxLength} characters`
                                    );
                                });

                                it('should allow to set string with length equal to maxLength', () => {
                                    const testDecl = lodash.cloneDeep(declCopy);
                                    lodash.set(testDecl, propConf.property,
                                        propConf.stringLengthTests.valueCb(
                                            testDecl,
                                            propConf.property,
                                            propConf.stringLengthTests.maxLength
                                        ));
                                    return assert.isFulfilled(
                                        validator(testDecl),
                                        `should allow to set string with length equal to ${propConf.stringLengthTests.maxLength} characters`
                                    );
                                });
                            });
                        }
                    }
                });
            });
        });
    })
};

function mochaHandlersWrapper(func) {
    const self = this;
    function inner() {
        return func.apply(self, arguments);
    }
    inner.only = function () {
        return func.apply(self.only, arguments);
    };
    inner.skip = function () {
        return func.apply(self.skip, arguments);
    };
    return inner;
}

function describeWrapper(func) {
    return mochaHandlersWrapper.call(mochaDescribe, func);
}

/**
 * Wrapper for mocha' describe to use for sub tests
 *
 * @returns {function}
 */
function describeUserSubTestWrapper() {
    function inner(testConf) {
        return () => ({ describe: mochaDescribe, testConf });
    }
    inner.only = function (testConf) {
        return () => ({ describe: mochaDescribe.only, testConf });
    };
    inner.skip = function (testConf) {
        return () => ({ describe: mochaDescribe.skip, testConf });
    };
    return inner;
}

/**
 * @param {BaseTestConf} testConf - test config
 * @returns {function}
 */
function getSubTestDescribe(testConf) {
    if (testConf.only) {
        return mochaDescribe.only;
    }
    if (testConf.skip) {
        return mochaDescribe.skip;
    }
    return mochaDescribe;
}

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
    /**
     * Array Length Test Options
     */
    if (!lodash.isUndefined(options.arrayLengthTests)) {
        if (options.arrayLengthTests === true) {
            options.arrayLengthTests = { minItems: 1 };
        } else if (options.arrayLengthTests === false) {
            options.arrayLengthTests = { enable: false };
        } else if (typeof options.arrayLengthTests === 'number') {
            options.arrayLengthTests = { minItems: options.arrayLengthTests };
        } else if (typeof options.arrayLengthTests !== 'object') {
            assert.fail(`arrayLengthTests expected to be boolean, number or object, got "${typeof options.arrayLengthTests}" instead`);
        }
        setControlProperties(options.arrayLengthTests);
    }
    /**
     * Dependencies Test Options
     */
    if (!lodash.isUndefined(options.dependenciesTests)) {
        if (options.dependenciesTests === true) {
            options.dependenciesTests = { dependsOn: '' };
        } else if (options.dependenciesTests === false) {
            options.dependenciesTests = { enable: false };
        } else if (typeof options.dependenciesTests === 'string') {
            options.dependenciesTests = { dependsOn: options.dependenciesTests };
        } else if (typeof options.dependenciesTests !== 'object') {
            assert.fail(`dependenciesTests expected to be boolean, string or object, got "${typeof options.dependenciesTests}" instead`);
        }
        setControlProperties(options.dependenciesTests);
    }
    /**
     * Enum Test Options
     */
    if (!lodash.isUndefined(options.enumTests)) {
        if (options.enumTests === true) {
            options.enumTests = { notAllowed: randomString(10) };
        } else if (options.enumTests === false) {
            options.enumTests = { enable: false };
        } else if (Array.isArray(options.enumTests) || typeof options.enumTests !== 'object') {
            options.enumTests = { allowed: options.enumTests };
        }
        if (!Array.isArray(options.enumTests.allowed)) {
            options.enumTests.allowed = [options.enumTests.allowed];
        } else if (lodash.isUndefined(options.enumTests.allowed)) {
            options.enumTests.allowed = [];
        }
        if (!Array.isArray(options.enumTests.notAllowed)) {
            options.enumTests.notAllowed = [options.enumTests.notAllowed];
        } else if (lodash.isUndefined(options.enumTests.notAllowed)) {
            options.enumTests.notAllowed = [];
        }
        setControlProperties(options.enumTests);
    }
    /**
     * Number Range Test Options
     */
    if (!lodash.isUndefined(options.numberRangeTests)) {
        if (options.numberRangeTests === true) {
            options.numberRangeTests = { minimum: 1 };
        } else if (typeof options.numberRangeTests === 'number') {
            options.numberRangeTests = { minimum: options.numberRangeTests };
        } else if (options.numberRangeTests === false) {
            options.numberRangeTests = { enable: false };
        } else if (typeof options.numberRangeTests !== 'object') {
            assert.fail(`numberRangeTests expected to be boolean, number or object, got "${typeof options.numberRangeTests}" instead`);
        }
        setControlProperties(options.numberRangeTests);
    }
    /**
     * "required" Test Options
     */
    if (!lodash.isUndefined(options.requiredTests)) {
        if (lodash.isBoolean(options.requiredTests)) {
            options.requiredTests = { enable: options.requiredTests };
        } else if (typeof options.requiredTests !== 'object') {
            assert.fail(`requiredTests expected to be boolean or object, got "${typeof options.requiredTests}" instead`);
        }
        setControlProperties(options.requiredTests);
    }
    /**
     * String Length Test Options
     */
    if (!lodash.isUndefined(options.stringLengthTests)) {
        if (options.stringLengthTests === true) {
            options.stringLengthTests = { minLength: 1 };
        } else if (options.stringLengthTests === false) {
            options.stringLengthTests = { enable: false };
        } else if (typeof options.stringLengthTests === 'number') {
            options.stringLengthTests = { minLength: options.stringLengthTests };
        } else if (typeof options.stringLengthTests !== 'object') {
            assert.fail(`stringLengthTests expected to be "true", number or object, got "${typeof options.stringLengthTests}" instead`);
        }
        if (!options.stringLengthTests.valueCb) {
            options.stringLengthTests.valueCb = (decl, prop, len) => randomString(len);
        }
        setControlProperties(options.stringLengthTests);
    }
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
 * Generate random string
 *
 * @param {number} len - length of string to be generated
 * @param {number} radix - see Number.prototype.toString,
 *      base to use for representing numeric values. In other words
 *      when 'radix === 2', then output will be contain 1 and 0 only
 *      when 'radix === 16' then output will contain hex chars
 * @returns {string} generated string
 */
function randomString(len, radix) {
    // asserts here to be sure that we generating correct data
    radix = arguments.length >= 2 ? radix : 36;
    assert.isAtLeast(len, 0, 'length of random string should be >= 0');
    assert.isAtLeast(radix, 2, 'radix argument must be between 2 and 36');
    assert.isAtMost(radix, 36, 'radix argument must be between 2 and 36');
    return lodash.times(len, () => lodash.random(35).toString(radix)).join('');
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
 * @property {boolean | number | ArrayLengthTestConf} [arrayLengthTests]
 * @property {boolean | string | DependenciesTestConf} [dependenciesTests]
 * @property {boolean | any | Array<any> | EnumTestConf} [enumTests]
 * @property {boolean | number | NumberRangeKwdTestConf} [numberRangeTests]
 * @property {boolean | RequiredKwdTestConf} [requiredTests]
 * @property {boolean | number | StringLengthTestConf} [stringLengthTests]
 *
 * Schema Test Options:
 * - arrayLengthTests:
 *   - when set to 'true' it will try to test 'minItems' keyword with value 1
 *   - when set to 'number' it will try to test 'minItems' with that number
 *   - when set to 'false' then disabled
 * - dependenciesTests:
 *   - when value is 'true' then it will try to remove property and search for particular error message
 *   - when value is 'string' then it will try to remove property and search dependent property in error message
 *   - when set to 'false' then disabled
 * - enumTests:
 *   - when value is 'true' then it will test property against not allowed random string
 *   - when value is 'array of any' and not an object then it will be treated as one or array of allowed values
 *   - when set to 'false' then disabled
 * - numberRangeTests:
 *   - when set to 'true' it will try to test 'minimum' keyword with value 1
 *   - when value is 'number' then it will test property against 'minimum' keyword
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
 * @typedef BaseTestConf
 * @type {object}
 * @property {boolean} [enable = true] - enable or disable
 * @property {boolean} [only = false] - use .only
 * @property {boolean} [skip = false] - use .skip
 */
/**
 * @typedef ArrayLengthTestConf
 * @type {BaseTestConf}
 * @property {number} [minItems] - lower bound for array length
 * @property {number} [maxItems] - upper bound for array length
 *
 * Config to test 'minItems' and 'maxItems' keywords (array)
 */
/**
 * @typedef DependenciesTestConf
 * @type {BaseTestConf}
 * @property {string} [dependsOn] - dependant property
 *
 * Config to test 'dependencies' keyword
 */
/**
 * @typedef EnumTestConf
 * @type {BaseTestConf}
 * @property {any | Array<any>} [allowed] - allowed values
 * @property {any | Array<any>} [notAllowed] - not allowed values
 *
 * Config to test 'enum' keyword. Normalized version sets 'allowed' and 'notAllowed' to arrays
 */
/**
 * @typedef NumberRangeKwdTestConf
 * @type {BaseTestConf}
 * @property {number} [minimum] - lower bound
 * @property {number} [maximum] - upper bound
 *
 * Config to test 'minimum' and 'maximum' keywords (number)
 */
/**
 * @typedef RequiredKwdTestConf
 * @type {BaseTestConf}
 *
 * Config to test 'required' keyword
 */
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
/**
 * @callback PropertyTestCb
 * @param {function(string | Array<string> | PropertyTestConf)} subTestDescribe
 * @param {function(string | Array<string> | PropertyTestConf)} subTestDescribe.only
 * @param {function(string | Array<string> | PropertyTestConf)} subTestDescribe.skip
 * @returns {string | Array<string> | function | PropertyTestCb}
 */
