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

const configUtil = require('../../../src/lib/utils/config');
const configUtilTestData = require('../data/configUtilTests');
const configWorker = require('../../../src/lib/config');
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

    const parseDeclaration = (declaration, options) => configWorker.processDeclaration(
        testUtil.deepCopy(declaration), options
    );

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            persistentStorage,
            teemReporter,
            utilMisc
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.getComponents', () => {
        it('should return empty array when no config passed', () => assert.deepStrictEqual(configUtil.getComponents(), []));
        it('should return empty array when no .components', () => assert.deepStrictEqual(configUtil.getComponents({}), []));

        configUtilTestData.getComponents.tests.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => parseDeclaration(testConf.declaration)
                .then(() => {
                    assert.sameDeepMembers(
                        configUtil.getComponents(configWorker.currentConfig, {
                            class: testConf.classFilter,
                            filter: testConf.filter,
                            namespace: testConf.namespaceFilter
                        }),
                        testConf.expected
                    );
                }));
        });
    });

    describe('.getReceivers()', () => {
        it('should return receivers when defined', () => {
            const rawDecl = {
                class: 'Telemetry',
                listener: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    let listener = configUtil.getTelemetryListeners(configWorker.currentConfig, 'f5telemetry_default')[0];
                    assert.deepStrictEqual(configUtil.getReceivers(configWorker.currentConfig, listener), []);

                    listener = configUtil.getTelemetryListeners(configWorker.currentConfig, 'My_Namespace')[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, listener).map(c => c.id),
                        ['My_Namespace::consumer']
                    );
                });
        });
    });

    describe('.getTelemetryControls()', () => {
        it('should return Controls', () => {
            const rawDecl = {
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    logLevel: 'debug'
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    assert.deepStrictEqual(configUtil.getTelemetryControls(configWorker.currentConfig),
                        {
                            class: 'Controls',
                            name: 'controls',
                            logLevel: 'debug',
                            namespace: 'f5telemetry_default',
                            id: 'f5telemetry_default::controls',
                            memoryThresholdPercent: 90,
                            debug: false
                        });
                });
        });

        it('should return Controls object and not array when multiple Controls defined', () => {
            const rawDecl = {
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    logLevel: 'debug'
                },
                controls2: {
                    class: 'Controls',
                    logLevel: 'debug'
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    assert.deepStrictEqual(configUtil.getTelemetryControls(configWorker.currentConfig),
                        {
                            class: 'Controls',
                            name: 'controls', // this is just a guess, depends on ordering
                            logLevel: 'debug',
                            namespace: 'f5telemetry_default',
                            id: 'f5telemetry_default::controls',
                            memoryThresholdPercent: 90,
                            debug: false
                        });
                });
        });

        it('should return empty object when Controls not found', () => {
            const rawDecl = {
                class: 'Telemetry'
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    assert.deepStrictEqual(configUtil.getTelemetryControls(configWorker.currentConfig), {});
                });
        });
    });

    describe('.hasEnabledComponents()', () => {
        it('should return false when no config passed', () => assert.deepStrictEqual(configUtil.hasEnabledComponents(), false));
        it('should return false when no .components', () => assert.deepStrictEqual(configUtil.hasEnabledComponents({}), false));

        configUtilTestData.hasEnabledComponents.tests.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => parseDeclaration(testConf.declaration)
                .then(() => {
                    assert.strictEqual(
                        configUtil.hasEnabledComponents(configWorker.currentConfig, {
                            class: testConf.classFilter,
                            filter: testConf.filter,
                            namespace: testConf.namespaceFilter
                        }),
                        testConf.expected
                    );
                }));
        });
    });

    describe('.normalizeDeclaration()', () => {
        describe('core behavior', () => {
            const noParseResult = {
                mappings: {},
                components: []
            };

            const isValidUuid = (strValue) => {
                const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                return regex.test(strValue);
            };

            it('should not fail on null', () => assert.becomes(configUtil.normalizeDeclaration(null), noParseResult));
            it('should not fail on Array', () => assert.becomes(configUtil.normalizeDeclaration([{ class: 'Telemetry' }]), noParseResult));
            it('should not fail on string', () => assert.becomes(configUtil.normalizeDeclaration('declaration'), noParseResult));
            it('should not fail on empty object', () => assert.becomes(configUtil.normalizeDeclaration({}), noParseResult));

            it('should assign random UUIDs for the components', () => {
                coreStub.utilMisc.generateUuid.restore();
                const decl = {
                    class: 'Telemetry',
                    Listener1: {
                        class: 'Telemetry_Listener'
                    },
                    Listener2: {
                        class: 'Telemetry_Listener'
                    }
                };
                return parseDeclaration(decl)
                    .then(() => {
                        assert.isTrue(isValidUuid(configWorker.currentConfig.components[1].id));
                        assert.isTrue(isValidUuid(configWorker.currentConfig.components[0].id));
                    });
            });
        });

        const testSetData = configUtilTestData.normalizeDeclaration;
        Object.keys(testSetData).forEach((testSetKey) => {
            const testSet = testSetData[testSetKey];
            testUtil.getCallableDescribe(testSet)(testSet.name, () => {
                testSet.tests.forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, () => parseDeclaration(testConf.declaration)
                        .then(() => {
                            assert.sameDeepMembers(
                                [configWorker.currentConfig.mappings],
                                [testConf.expected.mappings]
                            );
                            assert.sameDeepMembers(
                                configWorker.currentConfig.components,
                                testConf.expected.components
                            );
                        }));
                });
            });
        });
    });

    describe('.mergeDeclaration()', () => {
        configUtilTestData.mergeDeclaration.tests.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => Promise.all([
                parseDeclaration(testConf.baseDeclaration, { expanded: true }).then(configUtil.normalizeDeclaration),
                parseDeclaration(testConf.newDeclaration, { expanded: true })
            ])
                .then(configs => configUtil.mergeDeclaration(configs[1], configs[0]))
                .then((normalized) => {
                    assert.sameDeepMembers([normalized.mappings], [testConf.expected.mappings]);
                    assert.sameDeepMembers(normalized.components, testConf.expected.components);
                }));
        });
    });

    describe('.removeComponents()', () => {
        it('should not fail no config passed', () => assert.doesNotThrow(() => configUtil.removeComponents()));
        it('should not fail when no .components', () => assert.doesNotThrow(() => configUtil.removeComponents({})));

        it('should remove all components', () => {
            const decl = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener'
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Listener: {
                        class: 'Telemetry_Listener'
                    }
                }
            };
            return parseDeclaration(decl)
                .then(() => {
                    const parsedConf = configWorker.currentConfig;
                    assert.deepStrictEqual(parsedConf.mappings, { My_Listener: ['My_Consumer'] });
                    assert.strictEqual(parsedConf.components.length, 3);

                    configUtil.removeComponents(parsedConf);
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.deepStrictEqual(parsedConf.components, []);
                });
        });

        it('should remove component and update mapping', () => {
            const decl = {
                class: 'Telemetry',
                My_Listener: {
                    class: 'Telemetry_Listener'
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Consumer_3: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Listener: {
                        class: 'Telemetry_Listener'
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            };
            return parseDeclaration(decl)
                .then(() => {
                    const parsedConf = configWorker.currentConfig;
                    assert.deepStrictEqual(parsedConf.mappings, {
                        My_Listener: ['My_Consumer', 'My_Consumer_2', 'My_Consumer_3'],
                        'My_Namespace::My_Listener': ['My_Namespace::My_Consumer']
                    });

                    configUtil.removeComponents(parsedConf, { filter: c => c.name === 'My_Consumer' });
                    assert.deepStrictEqual(parsedConf.mappings, {
                        My_Listener: ['My_Consumer_2', 'My_Consumer_3']
                    });
                    assert.strictEqual(configUtil.getTelemetryListeners(parsedConf).length, 2);
                    assert.strictEqual(configUtil.getTelemetryConsumers(parsedConf).length, 2);

                    configUtil.removeComponents(parsedConf, { filter: c => c.name === 'My_Listener', namespace: 'f5telemetry_default' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.strictEqual(configUtil.getTelemetryListeners(parsedConf).length, 1);
                    assert.strictEqual(configUtil.getTelemetryConsumers(parsedConf).length, 2);

                    configUtil.removeComponents(parsedConf, { class: 'Telemetry_Listener', namespace: c => c.namespace === 'My_Namespace' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.strictEqual(configUtil.getTelemetryListeners(parsedConf).length, 0);
                    assert.strictEqual(configUtil.getTelemetryConsumers(parsedConf).length, 2);

                    configUtil.removeComponents(parsedConf, { filter: c => c.name === 'My_Consumer_2' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.strictEqual(configUtil.getTelemetryConsumers(parsedConf).length, 1);

                    configUtil.removeComponents(parsedConf, { class: 'Telemetry_Consumer' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.strictEqual(configUtil.getTelemetryConsumers(parsedConf).length, 0);
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
