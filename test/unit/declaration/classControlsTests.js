/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
