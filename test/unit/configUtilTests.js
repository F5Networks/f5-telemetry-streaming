/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const configUtil = require('../../src/lib/configUtil');
const util = require('../../src/lib/util');

const configUtilTestData = require('./configUtilTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Config Util', () => {
    let uuidCounter = 0;

    beforeEach(() => {
        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });
    });

    afterEach(() => {
        uuidCounter = 0;
        sinon.restore();
    });

    describe('.componentizeConfig()', () => {
        describe('core behavior', () => {
            const noParseResult = {
                mappings: {},
                components: []
            };

            const isValidUuid = (strValue) => {
                const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                return regex.test(strValue);
            };

            it('should return empty object mappings and components when no declaration', () => {
                assert.becomes(configUtil.componentizeConfig(), noParseResult);
            });

            it('should not fail on null', () => {
                // typeof null === 'object'
                assert.becomes(configUtil.componentizeConfig(null), noParseResult);
            });

            it('should assign random UUIDs for the components', () => {
                util.generateUuid.restore();
                const decl = {
                    System1: {
                        class: 'Telemetry_System'
                    },
                    Listener1: {
                        class: 'Telemetry_Listener'
                    }
                };
                return configUtil.componentizeConfig(decl, false)
                    .then((parsedConf) => {
                        assert(isValidUuid(parsedConf.components[1].id));
                        assert(isValidUuid(parsedConf.components[0].id));
                    });
            });
        });

        describe('raw declaration input variations', () => {
            const testSet = configUtilTestData.componentizeConfig;
            testSet.forEach(testConf => testUtil.getCallableIt(testConf)(testConf.name,
                () => assert.becomes(configUtil.componentizeConfig(testConf.inputDecl), testConf.expected)));
        });
    });

    describe('.normalizeComponents', () => {
        // TODO: once namespace is in schema, add some tests with named namespace
        const parseDeclaration = function (declaration) {
            return configWorker.validate(declaration)
                .then(validated => configUtil.componentizeConfig(validated));
        };

        beforeEach(() => {
            sinon.stub(deviceUtil, 'encryptSecret').resolvesArg(0);
            sinon.stub(deviceUtil, 'decryptSecret').resolvesArg(0);
            sinon.stub(deviceUtil, 'getDeviceType').resolves(constants.DEVICE_TYPE.BIG_IP);
            sinon.stub(util, 'networkCheck').resolves();
        });

        const testSetData = configUtilTestData.normalizeComponents;
        /* eslint-disable implicit-arrow-linebreak */
        Object.keys(testSetData).forEach((testSetKey) => {
            const testSet = testSetData[testSetKey];
            testUtil.getCallableDescribe(testSet)(testSet.name, () => {
                testSet.tests.forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, () =>
                        parseDeclaration(testConf.declaration)
                            .then(configData => configUtil.normalizeComponents(configData))
                            .then((normalized) => {
                                assert.deepStrictEqual(normalized, testConf.expected);
                            }));
                });
            });
        });
    });

    describe('.getPollerTraceValue()', () => {
        it('should preserve trace config', () => {
            const matrix = configUtilTestData.getPollerTraceValue;
            const systemTraceValues = matrix[0];

            for (let i = 1; i < matrix.length; i += 1) {
                const pollerTrace = matrix[i][0];

                for (let j = 1; j < systemTraceValues.length; j += 1) {
                    const systemTrace = systemTraceValues[j];
                    const expectedTrace = matrix[i][j];
                    assert.strictEqual(
                        configUtil.getPollerTraceValue(systemTrace, pollerTrace),
                        expectedTrace,
                        `Expected to be ${expectedTrace} when systemTrace=${systemTrace} and pollerTrace=${pollerTrace}`
                    );
                }
            }
        });
    });

    describe('.getControls', () => {
        it('should return controls from new config format (normalized)', () => {
            const rawDecl = {
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    logLevel: 'debug'
                }
            };

            return configUtil.componentizeConfig(rawDecl)
                .then((convertedConfig) => {
                    assert.deepStrictEqual(configUtil.getControls(convertedConfig),
                        {
                            class: 'Controls',
                            name: 'controls',
                            logLevel: 'debug',
                            namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                            id: 'uuid1'
                        });
                });
        });
    });
});
