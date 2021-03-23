/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../../src/lib/config');
const configUtil = require('../../../src/lib/utils/config');
const configUtilTestData = require('../data/configUtilTestsData');
const constants = require('../../../src/lib/constants');
const deviceUtil = require('../../../src/lib/utils/device');
const persistentStorage = require('../../../src/lib/persistentStorage');
const stubs = require('../shared/stubs');
const teemReporter = require('../../../src/lib/teemReporter');
const testUtil = require('../shared/util');
const utilMisc = require('../../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Config Util', () => {
    let coreStub;

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            persistentStorage,
            teemReporter,
            utilMisc
        });
    });

    afterEach(() => {
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
                coreStub.utilMisc.generateUuid.restore();
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
        const sortMappings = (mappings) => {
            Object.keys(mappings).forEach(key => mappings[key].sort());
        };

        const testSetData = configUtilTestData.normalizeComponents;
        /* eslint-disable implicit-arrow-linebreak */
        Object.keys(testSetData).forEach((testSetKey) => {
            const testSet = testSetData[testSetKey];
            testUtil.getCallableDescribe(testSet)(testSet.name, () => {
                testSet.tests.forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, () =>
                        configWorker.processDeclaration(testConf.declaration)
                            .then(() => {
                                const normalized = configWorker.currentConfig;
                                sortMappings(normalized.mappings);
                                sortMappings(testConf.expected.mappings);

                                assert.deepStrictEqual(normalized.mappings, testConf.expected.mappings);
                                assert.sameDeepMembers(normalized.components, testConf.expected.components);
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

    describe('.decryptAllSecrets()', () => {
        it('should decrypt secrets (JSON declaration)', () => {
            const encrypted = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                }
            };
            const decrypted = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        passphrase: 'passphrase'
                    }
                }
            };
            return assert.becomes(configUtil.decryptSecrets(encrypted), decrypted);
        });

        it('should decrypt secrets (normalized configuration)', () => {
            const encrypted = {
                mappings: {},
                components: [
                    {
                        name: 'My_Consumer',
                        traceName: 'My_Consumer',
                        id: 'uuid2',
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        enable: true,
                        method: 'POST',
                        host: '192.0.2.1',
                        path: '/foo',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        allowSelfSignedCert: false,
                        namespace: 'f5telemetry_default',
                        passphrase: {
                            class: 'Secret',
                            protected: 'SecureVault',
                            cipherText: '$M$passphrase'
                        }
                    }
                ]
            };
            const decrypted = {
                mappings: {},
                components: [
                    {
                        name: 'My_Consumer',
                        traceName: 'My_Consumer',
                        id: 'uuid2',
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        enable: true,
                        method: 'POST',
                        host: '192.0.2.1',
                        path: '/foo',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        allowSelfSignedCert: false,
                        namespace: 'f5telemetry_default',
                        passphrase: 'passphrase' // decrypted secret
                    }
                ]
            };
            return assert.becomes(configUtil.decryptSecrets(encrypted), decrypted);
        });
    });
});
