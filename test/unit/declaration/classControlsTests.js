/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const common = require('./common');
const schemaValidationUtil = require('../shared/schemaValidation');

moduleCache.remember();

describe('Declarations -> Controls', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

    schemaValidationUtil.generateSchemaBasicTests(
        (decl) => validateMinimal(decl),
        {
            class: 'Controls'
        },
        [
            {
                property: 'logLevel',
                enumTests: {
                    allowed: ['verbose', 'debug', 'info', 'error'],
                    notAllowed: ['my-log-level', 'warning']
                },
                defaultValueTests: {
                    defaultValue: 'debug'
                }
            },
            {
                property: 'debug',
                booleanTests: true,
                valueTests: {
                    invalid: 'debug'
                },
                defaultValueTests: {
                    defaultValue: false
                }
            },
            {
                property: 'listenerMode',
                enumTests: {
                    allowed: ['buffer', 'string'],
                    notAllowed: ['my-mode', 10]
                }
            },
            {
                property: 'listenerStrategy',
                enumTests: {
                    allowed: ['drop', 'ring'],
                    notAllowed: ['my-mode', 10]
                }
            },
            {
                property: 'memoryThresholdPercent',
                defaultValueTests: {
                    defaultValue: 90
                },
                numberRangeTests: {
                    minimum: 1,
                    maximum: 100
                }
            }
        ]
    );
    schemaValidationUtil.generateSchemaBasicTests(
        (decl) => validateMinimal(decl),
        {
            class: 'Controls',
            memoryMonitor: {
                memoryThresholdPercent: 10
            }
        },
        [
            {
                property: 'memoryMonitor',
                optionalPropTests: true,
                additionalPropsTests: {
                    allowed: {
                        interval: 'aggressive',
                        logFrequency: 10,
                        logLevel: 'debug',
                        osFreeMemory: 10,
                        provisionedMemory: 10
                    },
                    notAllowed: {
                        something: 'else'
                    }
                },
                defaultValueTests: {
                    defaultValue: undefined
                }
            },
            {
                property: 'memoryMonitor.interval',
                enumTests: {
                    allowed: ['default', 'aggressive'],
                    notAllowed: ['my-log-level', 'warning']
                },
                defaultValueTests: {
                    defaultValue: 'default'
                }
            },
            {
                property: 'memoryMonitor.logFrequency',
                defaultValueTests: {
                    defaultValue: 10
                },
                numberRangeTests: {
                    minimum: 1
                }
            },
            {
                property: 'memoryMonitor.logLevel',
                enumTests: {
                    allowed: ['verbose', 'debug', 'info', 'error'],
                    notAllowed: ['my-log-level', 'warning']
                },
                defaultValueTests: {
                    defaultValue: 'debug'
                }
            },
            {
                property: 'memoryMonitor.memoryThresholdPercent',
                defaultValueTests: {
                    defaultValue: undefined
                },
                numberRangeTests: {
                    minimum: 1,
                    maximum: 100
                }
            },
            {
                property: 'memoryMonitor.osFreeMemory',
                defaultValueTests: {
                    defaultValue: 30
                },
                numberRangeTests: {
                    minimum: 1
                }
            },
            {
                property: 'memoryMonitor.provisionedMemory',
                defaultValueTests: {
                    defaultValue: undefined
                },
                numberRangeTests: {
                    minimum: 1,
                    maximum: 1400
                }
            },
            {
                property: 'memoryMonitor.thresholdReleasePercent',
                defaultValueTests: {
                    defaultValue: 90
                },
                numberRangeTests: {
                    minimum: 1,
                    maximum: 100
                }
            }
        ]
    );

    schemaValidationUtil.generateSchemaBasicTests(
        (decl) => validateMinimal(decl),
        {
            class: 'Controls',
            runtime: {
                enableGC: true,
                maxHeapSize: 1400
            }
        },
        [
            {
                property: 'runtime',
                optionalPropTests: true,
                additionalPropsTests: {
                    allowed: {
                        enableGC: true,
                        maxHeapSize: 1400
                    },
                    notAllowed: {
                        something: 'else',
                        memoryAllocator: 'default'
                    }
                },
                defaultValueTests: {
                    defaultValue: undefined
                }
            },
            {
                property: 'runtime.enableGC',
                booleanTests: true,
                valueTests: {
                    invalid: 'debug'
                },
                defaultValueTests: {
                    defaultValue: false
                }
            },
            {
                property: 'runtime.maxHeapSize',
                defaultValueTests: {
                    defaultValue: 1400
                },
                numberRangeTests: {
                    minimum: 1400
                }
            }
        ]
    );
});

function validateMinimal(controlsProps, expectedProps, addtlContext) {
    return common.validatePartOfIt(
        {
            class: 'Telemetry',
            controls: {
                class: 'Controls'
            }
        },
        'controls',
        controlsProps,
        {
            class: 'Controls'
        },
        expectedProps,
        addtlContext
    );
}
