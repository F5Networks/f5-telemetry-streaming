/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configTestsData = require('./data/configTestsData');
const configWorker = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/utils/device');
const dummies = require('./shared/dummies');
const logger = require('../../src/lib/logger');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const testAssert = require('./shared/assert');
const testUtil = require('./shared/util');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Config', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            logger,
            persistentStorage,
            teemReporter,
            utilMisc
        });
        coreStub.persistentStorage.loadData = { config: { } };
        coreStub.utilMisc.generateUuid.numbersOnly = false;
        return configWorker.cleanup()
            .then(() => persistentStorage.persistentStorage.load());
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('properties', () => {
        describe('.currentConfig', () => {
            it('should return copy BASE_CONFIG when no current config', () => {
                const conf = configWorker.currentConfig;
                assert.deepStrictEqual(conf, { components: [], mappings: {} });
                conf.components.push(1);
                assert.deepStrictEqual(conf, { components: [1], mappings: {} });
                assert.deepStrictEqual(configWorker.currentConfig, { components: [], mappings: {} });
            });

            it('should return copy current config', () => {
                const decl = {
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                };
                const expectedNormalized = {
                    mappings: {},
                    components: [{
                        name: 'My_Consumer',
                        traceName: 'f5telemetry_default::My_Consumer',
                        id: 'f5telemetry_default::My_Consumer',
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true,
                        trace: {
                            enable: false,
                            encoding: 'utf8',
                            maxRecords: 10,
                            path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                            type: 'output'
                        },
                        allowSelfSignedCert: false,
                        namespace: 'f5telemetry_default'
                    }]
                };
                return configWorker.processDeclaration(decl)
                    .then(() => {
                        const conf = configWorker.currentConfig;
                        assert.deepStrictEqual(conf, expectedNormalized);
                        conf.components.push(1);
                        assert.deepStrictEqual(configWorker.currentConfig, expectedNormalized);
                    });
            });
        });

        describe('.teemReporter', () => {
            it('should return TeemReporter instance', () => {
                assert.instanceOf(configWorker.teemReporter, teemReporter.TeemReporter);
            });
        });
    });

    describe('.cleanup()', () => {
        it('should cleanup current sate', () => {
            const obj = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };
            const validatedObj = {
                class: 'Telemetry',
                schemaVersion: constants.VERSION,
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    allowSelfSignedCert: false,
                    enable: true,
                    trace: false
                }
            };
            return configWorker.processDeclaration(obj)
                .then(() => {
                    assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, { raw: validatedObj });
                    assert.deepStrictEqual(configWorker.currentConfig, {
                        mappings: {},
                        components: [{
                            class: 'Telemetry_Consumer',
                            type: 'default',
                            id: 'f5telemetry_default::My_Consumer',
                            name: 'My_Consumer',
                            namespace: 'f5telemetry_default',
                            traceName: 'f5telemetry_default::My_Consumer',
                            enable: true,
                            trace: {
                                enable: false,
                                encoding: 'utf8',
                                maxRecords: 10,
                                path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                                type: 'output'
                            },
                            allowSelfSignedCert: false
                        }]
                    });
                    return configWorker.cleanup();
                })
                .then(() => {
                    assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, undefined);
                    assert.deepStrictEqual(configWorker.currentConfig, {
                        components: [],
                        mappings: {}
                    });
                });
        });
    });

    describe('.getDeclaration()', () => {
        it('should return BASE_DECLARATION when no data in storage', () => {
            coreStub.persistentStorage.loadState = null;
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.getDeclaration())
                .then((declaration) => {
                    assert.deepStrictEqual(declaration, { class: 'Telemetry' });
                });
        });

        it('should return data even when invalid data in storage', () => {
            coreStub.persistentStorage.loadData = { config: { raw: { My_Consumer: { class: 'Telemetry_Consumer' } } } };
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.getDeclaration())
                .then((declaration) => {
                    assert.deepStrictEqual(declaration, { My_Consumer: { class: 'Telemetry_Consumer' } });
                });
        });

        it('should return stored declaration (not expanded)', () => {
            const decl = {
                class: 'Telemetry',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/foo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.0.2.1',
                    path: '`=/Shared/constants/path`',
                    allowSelfSignedCert: false,
                    enable: true,
                    method: 'POST',
                    port: 443,
                    protocol: 'https',
                    trace: false,
                    outputMode: 'processed'
                }
            };
            const expectedDeclaration = {
                class: 'Telemetry',
                schemaVersion: constants.VERSION,
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/foo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    enable: true,
                    method: 'POST',
                    outputMode: 'processed',
                    host: '192.0.2.1',
                    path: '`=/Shared/constants/path`',
                    port: 443,
                    protocol: 'https',
                    trace: false,
                    allowSelfSignedCert: false,
                    compressionType: 'none'
                }
            };
            return configWorker.processDeclaration(decl)
                .then(() => configWorker.getDeclaration())
                .then((declaration) => {
                    assert.deepStrictEqual(declaration, expectedDeclaration);
                });
        });

        it('should fail when no namespace with such name', () => assert.isRejected(
            persistentStorage.persistentStorage.load()
                .then(() => configWorker.getDeclaration('namespace')),
            /Namespace with name 'namespace' doesn't exist/
        ));

        it('should return declaration for particular Namespace (not expanded)', () => {
            const decl = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Shared: {
                        class: 'Shared',
                        constants: {
                            class: 'Constants',
                            path: '/foo'
                        }
                    },
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.0.2.1',
                        path: '`=/Shared/constants/path`',
                        allowSelfSignedCert: false,
                        enable: true,
                        method: 'POST',
                        port: 443,
                        protocol: 'https',
                        trace: false,
                        outputMode: 'processed'
                    }
                }
            };
            const expectedDeclaration = {
                class: 'Telemetry_Namespace',
                Shared: {
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/foo'
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    enable: true,
                    method: 'POST',
                    host: '192.0.2.1',
                    outputMode: 'processed',
                    path: '`=/Shared/constants/path`',
                    port: 443,
                    protocol: 'https',
                    trace: false,
                    allowSelfSignedCert: false,
                    compressionType: 'none'
                }
            };
            return configWorker.processDeclaration(decl)
                .then(() => configWorker.getDeclaration('My_Namespace'))
                .then((declaration) => {
                    assert.deepStrictEqual(declaration, expectedDeclaration);
                });
        });
    });

    describe('.loadConfig()', () => {
        it('should load BASE_DECLARATION and do not save it when unable to load existing one', () => {
            coreStub.persistentStorage.loadData = { config: { raw: { class: 'Telemetry_Test' } } };
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.load())
                .then((declaration) => {
                    assert.deepStrictEqual(declaration, { class: 'Telemetry', schemaVersion: constants.VERSION });
                    assert.deepStrictEqual(coreStub.configWorker.configs[0], { components: [], mappings: {} });
                    assert.deepStrictEqual(configWorker.currentConfig, { components: [], mappings: {} });
                    return configWorker.getDeclaration();
                })
                .then((declaration) => {
                    assert.deepStrictEqual(declaration, { class: 'Telemetry_Test' });
                    assert.deepStrictEqual(coreStub.configWorker.receivedSpy.callCount, 2, 'should emit "received" event 2 times');
                    assert.deepStrictEqual(coreStub.configWorker.validationFailedSpy.callCount, 1, 'should emit "validationFailed" event');
                    assert.deepStrictEqual(coreStub.configWorker.validationSucceedSpy.callCount, 1, 'should emit "validationSucceed" event');

                    let expectedMetadata = { message: 'Loading saved configuration' };
                    assert.deepStrictEqual(
                        coreStub.configWorker.receivedSpy.args[0][0].metadata,
                        expectedMetadata
                    );
                    assert.deepStrictEqual(
                        coreStub.configWorker.validationFailedSpy.args[0][0].metadata,
                        expectedMetadata
                    );

                    expectedMetadata = { message: 'Loading default config! Unable to load saved config, see error message in logs' };
                    assert.deepStrictEqual(
                        coreStub.configWorker.receivedSpy.args[1][0].metadata,
                        expectedMetadata
                    );
                    assert.deepStrictEqual(
                        coreStub.configWorker.validationSucceedSpy.args[0][0].metadata,
                        expectedMetadata
                    );
                });
        });

        it('should load BASE_DECLARATION when no stored declaration', () => {
            coreStub.persistentStorage.loadState = null;
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.load())
                .then((declaration) => {
                    assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, { raw: { class: 'Telemetry', schemaVersion: constants.VERSION } });
                    assert.deepStrictEqual(declaration, { class: 'Telemetry', schemaVersion: constants.VERSION });
                    assert.deepStrictEqual(coreStub.configWorker.configs[0], { components: [], mappings: {} });
                    assert.deepStrictEqual(configWorker.currentConfig, { components: [], mappings: {} });
                });
        });

        it('should load stored declaration with an additional options and show save without them', () => {
            coreStub.persistentStorage.loadData = {
                config: {
                    raw: { class: 'Telemetry', My_Consumer: { class: 'Telemetry_Consumer', type: 'default' } },
                    normalized: { mappings: {}, components: [] }
                }
            };
            const expectedDeclaration = {
                class: 'Telemetry',
                schemaVersion: constants.VERSION,
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true,
                    trace: false,
                    allowSelfSignedCert: false
                }
            };
            const expectedConfiguration = {
                mappings: {},
                components: [{
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    id: 'f5telemetry_default::My_Consumer',
                    name: 'My_Consumer',
                    namespace: 'f5telemetry_default',
                    traceName: 'f5telemetry_default::My_Consumer',
                    enable: true,
                    trace: {
                        enable: false,
                        encoding: 'utf8',
                        maxRecords: 10,
                        path: '/var/tmp/telemetry/Telemetry_Consumer.f5telemetry_default::My_Consumer',
                        type: 'output'
                    },
                    allowSelfSignedCert: false
                }]
            };
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.load())
                .then((loadedDeclaration) => {
                    assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, {
                        raw: {
                            class: 'Telemetry',
                            schemaVersion: constants.VERSION,
                            My_Consumer: {
                                class: 'Telemetry_Consumer',
                                type: 'default',
                                allowSelfSignedCert: false,
                                enable: true,
                                trace: false
                            }
                        }
                    });
                    assert.deepStrictEqual(loadedDeclaration, expectedDeclaration);
                    assert.deepStrictEqual(coreStub.configWorker.configs[0], expectedConfiguration);
                    assert.deepStrictEqual(configWorker.currentConfig, expectedConfiguration);
                });
        });
    });

    describe('.processDeclaration()', () => {
        it('should throw an error if save config fails', () => {
            coreStub.persistentStorage.saveError = new Error('saveStateError');
            return assert.isRejected(configWorker.processDeclaration({ class: 'Telemetry' }), /saveStateError/);
        });

        it('should reject with invalid declaration (no args)', () => assert.isRejected(
            configWorker.processDeclaration(),
            /should have required property.*class/
        ));

        it('should reject with invalid declaration (empty object)', () => assert.isRejected(
            configWorker.processDeclaration({}),
            /should have required property.*class/
        ));
    });

    describe('.processNamespaceDeclaration()', () => {
        it('should throw an error if save config fails', () => {
            coreStub.persistentStorage.saveError = new Error('saveStateError');
            return assert.isRejected(configWorker.processNamespaceDeclaration({ class: 'Telemetry_Namespace' }, 'namespace'), /saveStateError/);
        });

        it('should reject with invalid declaration (no args)', () => assert.isRejected(
            configWorker.processNamespaceDeclaration(),
            /should have required property.*class/
        ));

        it('should reject with invalid declaration (empty object)', () => assert.isRejected(
            configWorker.processNamespaceDeclaration({}),
            /should have required property.*class/
        ));

        it('should reject with invalid namespace declaration (class is not Telemetry_Namespace)', () => assert.isRejected(
            configWorker.processNamespaceDeclaration({ class: 'Telemetry' }),
            /properties\/class\/enum.*"allowedValues":\["Telemetry_Namespace"\]/
        ));

        it('should reject with invalid namespace declaration (invalid property)', () => assert.isRejected(
            configWorker.processNamespaceDeclaration({
                class: 'Telemetry_Namespace',
                My_System_1: {
                    class: 'Telemetry_System'
                },
                additionalProp: { fake: true }
            }, 'NewbieNamespace'),
            /"additionalProperty":"fake".*should NOT have additional properties/
        ));

        it('should reject on attempt to submit Namespace declaration with name that belongs to another type of object', () => assert.isRejected(
            configWorker.processDeclaration({ class: 'Telemetry', namespace: { class: 'Shared' } })
                .then(() => configWorker.processNamespaceDeclaration({ class: 'Telemetry_Namespace' }, 'namespace')),
            /Unable to override existing object with name "namespace"/
        ));
    });

    describe('.processDeclaration() and .processNamespaceDeclaration() common tests', () => {
        let declaration;
        let expectedCurrentConfiguration;
        let expectedExpandedDeclaration;
        let expectedEmittedConfiguration;
        let expectedFullDeclaration;
        let expectedValidatedDeclaration;
        let historyIndex;
        let namespaceName;
        let preloadedState;

        const testSuites = [
            {
                suite: configTestsData.processDeclaration,
                entryPoint: (options) => configWorker.processDeclaration(declaration, options)
            },
            {
                suite: configTestsData.processNamespaceDeclaration,
                entryPoint: (options) => configWorker.processNamespaceDeclaration(declaration, namespaceName, options)
            }
        ];
        testSuites.forEach((testSuite) => {
            testUtil.getCallableDescribe(testSuite.suite)(testSuite.suite.name, () => {
                testSuite.suite.tests.forEach((testConf) => {
                    testUtil.getCallableDescribe(testConf)(testConf.name, () => {
                        beforeEach(() => {
                            declaration = testUtil.deepCopy(testConf.declaration);
                            expectedCurrentConfiguration = testUtil.deepCopy(testConf.expectedCurrentConfiguration);
                            expectedExpandedDeclaration = testUtil.deepCopy(testConf.expectedExpandedDeclaration);
                            expectedEmittedConfiguration = testUtil.deepCopy(testConf.expectedEmittedConfiguration);
                            expectedFullDeclaration = testConf.expectedFullDeclaration
                                ? testUtil.deepCopy(testConf.expectedFullDeclaration)
                                : testUtil.deepCopy(testConf.expectedValidatedDeclaration);
                            expectedValidatedDeclaration = testUtil.deepCopy(testConf.expectedValidatedDeclaration);
                            historyIndex = 0;
                            namespaceName = testConf.namespaceName;

                            let loadPromise = Promise.resolve();
                            if (testConf.preLoadDeclaration) {
                                historyIndex = 1;
                                coreStub.persistentStorage.loadData = {
                                    config: {
                                        raw: testUtil.deepCopy(testConf.preLoadDeclaration)
                                    }
                                };
                                loadPromise = loadPromise
                                    .then(() => persistentStorage.persistentStorage.load())
                                    .then(() => configWorker.load());
                            } else {
                                coreStub.persistentStorage.loadState = null;
                                loadPromise = loadPromise
                                    .then(() => persistentStorage.persistentStorage.load());
                            }
                            return loadPromise
                                .then(() => {
                                    preloadedState = coreStub.persistentStorage.savedState;
                                });
                        });

                        it('should expand config, save it and emit event', () => testSuite.entryPoint()
                            .then((validated) => {
                                assert.deepStrictEqual(
                                    coreStub.teemReporter.declarations[historyIndex],
                                    expectedFullDeclaration,
                                    'should pass whole declaration to TeemReporter'
                                );
                                assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, {
                                    raw: expectedFullDeclaration
                                }, 'should store whole declaration in PersistentStorage');
                                assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], expectedEmittedConfiguration, 'should match expected emitted configuration');
                            }));

                        it('should return expanded declaration', () => testSuite.entryPoint({ expanded: true })
                            .then((validated) => {
                                assert.deepStrictEqual(
                                    coreStub.teemReporter.declarations[historyIndex],
                                    expectedFullDeclaration,
                                    'should pass whole declaration to TeemReporter'
                                );
                                assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, {
                                    raw: expectedFullDeclaration
                                }, 'should store whole declaration in PersistentStorage');
                                assert.deepStrictEqual(validated, expectedExpandedDeclaration, 'should match expected expanded declaration');
                                assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], expectedEmittedConfiguration, 'should match expected emitted configuration');
                            }));

                        if (testConf.additionalTests) {
                            it('should not fail when unable to distribute configuration (decryptAllSecrets failed)', () => {
                                deviceUtil.decryptSecret.rejects(new Error('expected error'));
                                return testSuite.entryPoint()
                                    .then((validated) => {
                                        assert.deepStrictEqual(
                                            coreStub.teemReporter.declarations[historyIndex],
                                            expectedFullDeclaration,
                                            'should pass whole declaration to TeemReporter'
                                        );
                                        assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, {
                                            raw: expectedFullDeclaration
                                        }, 'should store whole declaration in PersistentStorage');
                                        assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                        assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                        assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], undefined, 'should not emit event');
                                    });
                            });

                            it('should not fail when unable to distribute configuration (event listener failed)', () => {
                                const onChangeStub = stubs.eventEmitterListener(configWorker, 'change');
                                onChangeStub.rejects(new Error('expected error'));
                                return testSuite.entryPoint()
                                    .then((validated) => {
                                        assert.deepStrictEqual(
                                            coreStub.teemReporter.declarations[historyIndex],
                                            expectedFullDeclaration,
                                            'should pass whole declaration to TeemReporter'
                                        );
                                        assert.deepStrictEqual(coreStub.persistentStorage.savedData.config, {
                                            raw: expectedFullDeclaration
                                        }, 'should store whole declaration in PersistentStorage');
                                        assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                        assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                        assert.isTrue(onChangeStub.calledOnce);
                                    });
                            });

                            it('should not save config', () => testSuite.entryPoint({ save: false })
                                .then((validated) => {
                                    assert.deepStrictEqual(coreStub.persistentStorage.savedState, preloadedState, 'should match pre-test state');
                                    assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                    assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                    assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], expectedEmittedConfiguration, 'should match expected emitted configuration');
                                }));
                        }
                    });
                });
            });
        });
    });

    describe('\'error\' event', () => {
        it('should log error if caught an error', () => configWorker.safeEmitAsync('error', new Error('expected error'))
            .then(() => {
                testAssert.includeMatch(
                    coreStub.logger.messages.all,
                    /Unhandled error in ConfigWorker[\s\S]+expected error/gm,
                    'should log error message'
                );
            }));
    });

    describe('\'change\' event', () => {
        it('should set log level', () => configWorker.processDeclaration(dummies.declaration.base.decrypted({
            controls: dummies.declaration.controls.full.decrypted({
                logLevel: 'error'
            })
        }))
            .then(() => {
                assert.deepStrictEqual(coreStub.logger.logLevelHistory.slice(-1), ['error'], 'should set log level to error');
                return configWorker.processDeclaration(dummies.declaration.base.decrypted({
                    controls: dummies.declaration.controls.full.decrypted({
                        logLevel: 'debug'
                    })
                }));
            })
            .then(() => {
                assert.deepStrictEqual(coreStub.logger.logLevelHistory.slice(-1), ['debug'], 'should set log level to debug');
            }));
    });

    describe('\'received\' event', () => {
        it('should send event', () => configWorker.processDeclaration(dummies.declaration.base.decrypted({
            controls: dummies.declaration.controls.full.decrypted({
                logLevel: 'error'
            })
        }), {
            metadata: {
                msg: 'here'
            }
        })
            .then(() => {
                assert.deepStrictEqual(coreStub.configWorker.receivedSpy.callCount, 1, 'should call listener for "received" event');
                assert.deepStrictEqual(coreStub.configWorker.receivedSpy.args[0], [{
                    declaration: dummies.declaration.base.decrypted({
                        controls: dummies.declaration.controls.full.decrypted({
                            logLevel: 'error'
                        })
                    }),
                    metadata: {
                        msg: 'here'
                    },
                    transactionID: 'uuid1'
                }], 'should pass data to event');
            }));

        it('should send event (namespace)', () => configWorker.processNamespaceDeclaration(dummies.declaration.namespace.base.decrypted({
            consumer: dummies.declaration.consumer.default.decrypted()
        }),
        'Namespace',
        {
            metadata: {
                msg: 'here'
            }
        })
            .then(() => {
                assert.deepStrictEqual(coreStub.configWorker.receivedSpy.callCount, 1, 'should call listener for "received" event');
                assert.deepStrictEqual(coreStub.configWorker.receivedSpy.args[0], [{
                    declaration: dummies.declaration.base.decrypted({
                        Namespace: dummies.declaration.namespace.base.decrypted({
                            consumer: dummies.declaration.consumer.default.decrypted()
                        })
                    }),
                    metadata: {
                        msg: 'here'
                    },
                    transactionID: 'uuid1'
                }], 'should pass data to event');
            }));
    });

    describe('\'validationFailed\' event', () => {
        it('should send event', () => {
            let validationError;
            configWorker.on('received', (ctx) => {
                // want to be sure that original data distributed only
                ctx.declaration.modified = true;
                ctx.metadata.modified = true;
            });
            return configWorker.processDeclaration(dummies.declaration.base.decrypted({
                invalid: true,
                controls: dummies.declaration.controls.full.decrypted({
                    logLevel: 'error'
                })
            }), {
                metadata: {
                    msg: 'here'
                }
            })
                .catch((error) => {
                    validationError = error;
                })
                .then(() => {
                    assert.deepStrictEqual(coreStub.configWorker.validationSucceedSpy.callCount, 0, 'should not call listener for "validationSucceed" event');
                    assert.deepStrictEqual(coreStub.configWorker.validationFailedSpy.callCount, 1, 'should call listener "validationFailed" event');
                    assert.deepStrictEqual(coreStub.configWorker.validationFailedSpy.args[0], [{
                        declaration: dummies.declaration.base.decrypted({
                            invalid: true,
                            controls: dummies.declaration.controls.full.decrypted({
                                logLevel: 'error'
                            })
                        }),
                        errorMsg: `${validationError}`,
                        metadata: {
                            msg: 'here'
                        },
                        transactionID: 'uuid1'
                    }], 'should pass data to event');
                });
        });
    });

    describe('\'validationSucceed\' event', () => {
        it('should send event', () => {
            configWorker.on('received', (ctx) => {
                // want to be sure that original data distributed only
                ctx.declaration.modified = true;
                ctx.metadata.modified = true;
            });
            return configWorker.processDeclaration(dummies.declaration.base.decrypted({
                controls: dummies.declaration.controls.full.decrypted({
                    logLevel: 'error'
                })
            }), {
                metadata: {
                    msg: 'here'
                }
            })
                .then(() => {
                    assert.deepStrictEqual(coreStub.configWorker.validationFailedSpy.callCount, 0, 'should not call listener for "validationFailed" event');
                    assert.deepStrictEqual(coreStub.configWorker.validationSucceedSpy.callCount, 1, 'should call listener "validationSucceed" event');
                    assert.deepStrictEqual(coreStub.configWorker.validationSucceedSpy.args[0], [{
                        declaration: dummies.declaration.base.decrypted({
                            controls: dummies.declaration.controls.full.decrypted({
                                logLevel: 'error',
                                memoryThresholdPercent: 90
                            }),
                            schemaVersion: constants.VERSION
                        }),
                        metadata: {
                            msg: 'here'
                        },
                        transactionID: 'uuid1'
                    }], 'should pass data to event');
                });
        });
    });
});
