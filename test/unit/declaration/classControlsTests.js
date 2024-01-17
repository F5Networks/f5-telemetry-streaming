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

const assert = require('../shared/assert');
const common = require('./common');
const declValidator = require('./common').validate;

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

    describe('logLevel', () => {
        [
            {
                logLevel: 'verbose',
                expectedToPass: true
            },
            {
                logLevel: 'debug',
                expectedToPass: true
            },
            {
                logLevel: 'info',
                expectedToPass: true
            },
            {
                logLevel: 'error',
                expectedToPass: true
            },
            {
                logLevel: 'invalidValue',
                expectedToPass: false
            }
        ].forEach((testCase) => {
            it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "logLevel" to "${testCase.logLevel}"`, () => {
                const data = {
                    class: 'Telemetry',
                    Controls: {
                        class: 'Controls',
                        logLevel: testCase.logLevel
                    }
                };
                if (testCase.expectedToPass) {
                    return declValidator(data)
                        .then((validConfig) => {
                            assert.strictEqual(validConfig.Controls.logLevel, testCase.logLevel, `'should match "${testCase.logLevel}"`);
                        });
                }
                return assert.isRejected(declValidator(data), /logLevel.*should be equal to one of the allowed value/);
            });
        });
    });

    describe('listenerMode', () => {
        [
            {
                listenerMode: 'string',
                expectedToPass: true
            },
            {
                listenerMode: 'buffer',
                expectedToPass: true
            },
            {
                listenerMode: 'other',
                expectedToPass: false
            },
            {
                listenerMode: 'mode',
                expectedToPass: false
            }
        ].forEach((testCase) => {
            it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "listenerMode" to "${testCase.listenerMode}"`, () => {
                const data = {
                    class: 'Telemetry',
                    Controls: {
                        class: 'Controls',
                        listenerMode: testCase.listenerMode
                    }
                };
                if (testCase.expectedToPass) {
                    return declValidator(data)
                        .then((validConfig) => {
                            assert.strictEqual(validConfig.Controls.listenerMode, testCase.listenerMode, `'should match "${testCase.listenerMode}"`);
                        });
                }
                return assert.isRejected(declValidator(data), /listenerMode.*should be equal to one of the allowed value/);
            });
        });
    });
    describe('listenerStrategy', () => {
        [
            {
                listenerStrategy: 'drop',
                expectedToPass: true
            },
            {
                listenerStrategy: 'ring',
                expectedToPass: true
            },
            {
                listenerStrategy: 'other',
                expectedToPass: false
            },
            {
                listenerStrategy: 'mode',
                expectedToPass: false
            }
        ].forEach((testCase) => {
            it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "listenerStrategy" to "${testCase.listenerStrategy}"`, () => {
                const data = {
                    class: 'Telemetry',
                    Controls: {
                        class: 'Controls',
                        listenerStrategy: testCase.listenerStrategy
                    }
                };
                if (testCase.expectedToPass) {
                    return declValidator(data)
                        .then((validConfig) => {
                            assert.strictEqual(validConfig.Controls.listenerStrategy, testCase.listenerStrategy, `'should match "${testCase.listenerStrategy}"`);
                        });
                }
                return assert.isRejected(declValidator(data), /listenerStrategy.*should be equal to one of the allowed value/);
            });
        });
    });

    describe('debug', () => {
        [
            {
                debug: true,
                expectedToPass: true
            },
            {
                debug: false,
                expectedToPass: true
            },
            {
                debug: 'invalidValue',
                expectedToPass: false
            }
        ].forEach((testCase) => {
            it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "debug" to "${testCase.debug}"`, () => {
                const data = {
                    class: 'Telemetry',
                    Controls: {
                        class: 'Controls',
                        debug: testCase.debug
                    }
                };
                if (testCase.expectedToPass) {
                    return declValidator(data)
                        .then((validConfig) => {
                            assert.strictEqual(validConfig.Controls.debug, testCase.debug, `'should match "${testCase.debug}"`);
                        });
                }
                return assert.isRejected(declValidator(data), /debug.*should be boolean/);
            });
        });
    });

    describe('memoryThresholdPercent', () => {
        [
            {
                memoryThresholdPercent: 1,
                expectedToPass: true
            },
            {
                memoryThresholdPercent: 100,
                expectedToPass: true
            },
            {
                memoryThresholdPercent: 50,
                expectedToPass: true
            },
            {
                memoryThresholdPercent: 101,
                expectedToPass: false,
                errorMsg: /memoryThresholdPercent.*should be <= 100/
            },
            {
                memoryThresholdPercent: 0,
                expectedToPass: false,
                errorMsg: /memoryThresholdPercent.*should be >= 1/
            },
            {
                memoryThresholdPercent: 'invalidValue',
                expectedToPass: false,
                errorMsg: /memoryThresholdPercent.*should be integer/
            }
        ].forEach((testCase) => {
            it(`should ${testCase.expectedToPass ? '' : 'not '}allow to set "memoryThresholdPercent" to "${testCase.memoryThresholdPercent}"`, () => {
                const data = {
                    class: 'Telemetry',
                    Controls: {
                        class: 'Controls',
                        memoryThresholdPercent: testCase.memoryThresholdPercent
                    }
                };
                if (testCase.expectedToPass) {
                    return declValidator(data)
                        .then((validConfig) => {
                            assert.strictEqual(validConfig.Controls.memoryThresholdPercent, testCase.memoryThresholdPercent, `'should match "${testCase.memoryThresholdPercent}"`);
                        });
                }
                return assert.isRejected(declValidator(data), testCase.errorMsg);
            });
        });
    });
});
