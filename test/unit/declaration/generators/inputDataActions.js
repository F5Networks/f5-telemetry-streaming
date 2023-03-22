/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const declValidator = require('../common').validate;
const schemaValidationUtil = require('../../shared/schemaValidation');
const testUtil = require('../../shared/util');

module.exports = (baseDeclaration, parentPath) => {
    const locationsTests = [
        { valueTests: { valid: {}, checkValue: true, subTitle: 'empty locations' } },
        { valueTests: { valid: { a: true }, checkValue: true, subTitle: 'type of boolean' } },
        { valueTests: { valid: { a: { b: true } }, checkValue: true, subTitle: 'with single property' } },
        { valueTests: { valid: { a: { b: true, c: { d: true } } }, checkValue: true, subTitle: 'multiple properties' } },
        {
            valueTests: {
                valid: { virtualServers: { vs$: true }, pools: { '^/Common/Shared/': true } },
                checkValue: true,
                subTitle: 'regexp are used in locations'
            }
        },
        { valueTests: { invalid: { a: false }, subTitle: '"false" as destination' } },
        { valueTests: { invalid: { a: { b: false, c: true } }, subTitle: 'nested "false" as destination' } },
        { valueTests: { invalid: { a: { b: { d: [] } }, c: true }, subTitle: 'invalid type (array) as destination' } }
    ];

    const actionsValidator = schemaValidationUtil.wrapValidatorForSchemaBasicTests(
        declValidator,
        baseDeclaration,
        parentPath,
        { mergeStrategy: 'merge' }
    );
    schemaValidationUtil.generateSchemaBasicTests(
        actionsValidator,
        {
            actions: [
                {
                    setTag: {
                        tag: 'value'
                    }
                },
                {
                    includeData: {},
                    locations: {
                        path: true
                    }
                },
                {
                    excludeData: {},
                    locations: {
                        path: true
                    }
                }
            ]
        },
        [
            // validate merged declaration at first
            { validateDeclarationTests: true },
            // check default values for Input actions
            {
                property: 'actions',
                tests: [
                    {
                        defaultValueTests: [
                            {
                                enable: true,
                                setTag: { application: '`A`', tenant: '`T`' }
                            }
                        ],
                        valueTests: {
                            subTitle: 'allow empty array',
                            valid: []
                        }
                    }
                ]
            },
            // setTagAction tests
            {
                property: ['actions', '0'],
                tests: [
                    {
                        additionalPropsTests: {
                            combinations: true,
                            notAllowed: true, // random property
                            failing: {
                                excludeData: {},
                                includeData: {}
                            }
                        },
                        optionalPropTests: {
                            combinations: true,
                            properties: {
                                locations: { path: true },
                                enable: true,
                                ifAllMatch: { path: true }
                            }
                        },
                        requiredTests: 'setTag'
                    },
                    {
                        additionalPropsTests: {
                            subTitle: 'can\'t be set at the same time',
                            failing: {
                                ifAllMatch: { path: 'value' },
                                ifAnyMatch: [{ path: 'value' }]
                            }
                        },
                        optionalPropTests: {
                            combinations: true,
                            properties: {
                                locations: { path: true },
                                enable: true,
                                ifAnyMatch: [{ path: true }]
                            }
                        }
                    }
                ]
            },
            {
                property: ['actions', '0', 'locations'],
                tests: testUtil.deepCopy(locationsTests)
            },
            {
                property: ['actions', '0', 'ifAnyMatch'],
                valueTests: {
                    subTitle: 'ifAnyMatch should be wrapped into array',
                    valid: [{
                        insideOfArray: true
                    }],
                    invalid: {
                        shouldBeArray: true
                    }
                }
            },
            {
                property: ['actions', '0', 'ifAllMatch'],
                valueTests: {
                    subTitle: 'ifAllMatch should be wrapped into object',
                    invalid: [{
                        shouldBeObject: true
                    }],
                    valid: {
                        isObject: true
                    }
                }
            },
            // includeDataAction tests
            {
                property: ['actions', '1'],
                tests: [
                    {
                        additionalPropsTests: {
                            combinations: true,
                            notAllowed: true, // random property
                            failing: {
                                excludeData: {},
                                setTag: { tenant: '`T`' }
                            }
                        },
                        optionalPropTests: {
                            combinations: true,
                            properties: {
                                enable: true,
                                ifAllMatch: { path: true }
                            }
                        },
                        requiredTests: {
                            combinations: true,
                            properties: ['includeData', 'locations']
                        }
                    },
                    {
                        additionalPropsTests: {
                            subTitle: 'can\'t be set at the same time',
                            failing: {
                                ifAllMatch: { path: 'value' },
                                ifAnyMatch: [{ path: 'value' }]
                            }
                        },
                        optionalPropTests: {
                            combinations: true,
                            properties: {
                                enable: true,
                                ifAnyMatch: [{ path: true }]
                            }
                        }
                    }
                ]
            },
            {
                property: ['actions', '1', 'locations'],
                tests: testUtil.deepCopy(locationsTests)
            },
            {
                property: ['actions', '1', 'ifAnyMatch'],
                valueTests: {
                    subTitle: 'ifAnyMatch should be wrapped into array',
                    valid: [{
                        insideOfArray: true
                    }],
                    invalid: {
                        shouldBeArray: true
                    }
                }
            },
            {
                property: ['actions', '1', 'ifAllMatch'],
                valueTests: {
                    subTitle: 'ifAllMatch should be wrapped into object',
                    invalid: [{
                        shouldBeObject: true
                    }],
                    valid: {
                        isObject: true
                    }
                }
            },
            // excludeDataAction tests
            {
                property: ['actions', '2'],
                tests: [
                    {
                        additionalPropsTests: {
                            combinations: true,
                            notAllowed: true, // random property
                            failing: {
                                includeData: {},
                                setTag: { tenant: '`T`' }
                            }
                        },
                        optionalPropTests: {
                            combinations: true,
                            properties: {
                                enable: true,
                                ifAllMatch: { path: true }
                            }
                        },
                        requiredTests: {
                            combinations: true,
                            properties: ['excludeData', 'locations']
                        }
                    },
                    {
                        additionalPropsTests: {
                            subTitle: 'can\'t be set at the same time',
                            failing: {
                                ifAllMatch: { path: 'value' },
                                ifAnyMatch: [{ path: 'value' }]
                            }
                        },
                        optionalPropTests: {
                            combinations: true,
                            properties: {
                                enable: true,
                                ifAnyMatch: [{ path: true }]
                            }
                        }
                    }
                ]
            },
            {
                property: ['actions', '2', 'locations'],
                tests: testUtil.deepCopy(locationsTests)
            },
            {
                property: ['actions', '2', 'ifAnyMatch'],
                valueTests: {
                    subTitle: 'ifAnyMatch should be wrapped into array',
                    valid: [{
                        insideOfArray: true
                    }],
                    invalid: {
                        shouldBeArray: true
                    }
                }
            },
            {
                property: ['actions', '2', 'ifAllMatch'],
                valueTests: {
                    subTitle: 'ifAllMatch should be wrapped into object',
                    invalid: [{
                        shouldBeObject: true
                    }],
                    valid: {
                        isObject: true
                    }
                }
            },
            // consumer actions are not allowed
            {
                property: ['actions', '3'],
                valueTests: {
                    subTitle: 'JMESPath not allowed',
                    invalid: {
                        JMESPath: {},
                        expression: '{ message: @, service: telemetryEventCategory, hostname: hostname }'
                    }
                }
            }
        ]
    );
};
