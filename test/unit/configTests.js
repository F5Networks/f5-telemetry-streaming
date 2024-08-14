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

/* eslint-disable import/order, no-restricted-syntax */
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');

const assert = require('./shared/assert');
const configTestsData = require('./data/configTestsData');
const dummies = require('./shared/dummies');
const getComponentTestsData = require('./data/configUtilTests/getComponentsTestsData');
const stubs = require('./shared/stubs');
const sourceCode = require('./shared/sourceCode');
const testUtil = require('./shared/util');

const appInfo = sourceCode('src/lib/appInfo');
const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');

moduleCache.remember();

describe('Config', () => {
    let configWorker;
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub();
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        configWorker = coreStub.configWorker.configWorker;

        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
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

            it('should return copy current config', async () => {
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
                await configWorker.processDeclaration(decl);

                const conf = configWorker.currentConfig;
                assert.deepStrictEqual(conf, expectedNormalized);
                conf.components.push(1);
                assert.deepStrictEqual(configWorker.currentConfig, expectedNormalized);
            });
        });
    });

    describe('.cleanup()', () => {
        it('should cleanup current sate', async () => {
            const obj = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };
            const validatedObj = {
                class: 'Telemetry',
                schemaVersion: appInfo.version,
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    allowSelfSignedCert: false,
                    enable: true,
                    trace: false
                }
            };
            await configWorker.processDeclaration(obj);

            assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, { raw: validatedObj });
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

            await configWorker.cleanup();

            assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, undefined);
            assert.deepStrictEqual(configWorker.currentConfig, {
                components: [],
                mappings: {}
            });
        });
    });

    describe('.getDeclaration()', () => {
        it('should return BASE_DECLARATION when no data in storage', async () => {
            coreStub.storage.restWorker.loadStateData = null;

            await coreStub.storage.service.restart();
            const declaration = await configWorker.getDeclaration();

            assert.deepStrictEqual(declaration, { class: 'Telemetry' });
        });

        it('should return data even when invalid data in storage', async () => {
            coreStub.storage.restWorker.loadData = { config: { raw: { My_Consumer: { class: 'Telemetry_Consumer' } } } };

            await coreStub.storage.service.restart();
            const declaration = await configWorker.getDeclaration();

            assert.deepStrictEqual(declaration, { My_Consumer: { class: 'Telemetry_Consumer' } });
        });

        it('should return stored declaration (not expanded)', async () => {
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
                    host: '192.168.2.1',
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
                schemaVersion: appInfo.version,
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
                    host: '192.168.2.1',
                    path: '`=/Shared/constants/path`',
                    port: 443,
                    protocol: 'https',
                    trace: false,
                    allowSelfSignedCert: false,
                    compressionType: 'none'
                }
            };

            await configWorker.processDeclaration(decl);
            const declaration = await configWorker.getDeclaration();

            assert.deepStrictEqual(declaration, expectedDeclaration);
        });

        it('should fail when no namespace with such name', async () => {
            await assert.isRejected(
                configWorker.getDeclaration('namespace'),
                /Namespace with name 'namespace' doesn't exist/
            );
        });

        it('should return declaration for particular Namespace (not expanded)', async () => {
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
                        host: '192.168.2.1',
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
                    host: '192.168.2.1',
                    outputMode: 'processed',
                    path: '`=/Shared/constants/path`',
                    port: 443,
                    protocol: 'https',
                    trace: false,
                    allowSelfSignedCert: false,
                    compressionType: 'none'
                }
            };

            await configWorker.processDeclaration(decl);
            const declaration = await configWorker.getDeclaration('My_Namespace');

            assert.deepStrictEqual(declaration, expectedDeclaration);
        });
    });

    describe('.loadConfig()', () => {
        it('should load BASE_DECLARATION and do not save it when unable to load existing one', async () => {
            coreStub.storage.restWorker.loadData = { config: { raw: { class: 'Telemetry_Test' } } };
            await coreStub.storage.service.restart();

            let declaration = await configWorker.load();
            assert.deepStrictEqual(declaration, { class: 'Telemetry', schemaVersion: appInfo.version });
            assert.deepStrictEqual(coreStub.configWorker.configs[0], { components: [], mappings: {} });
            assert.deepStrictEqual(configWorker.currentConfig, { components: [], mappings: {} });

            declaration = await configWorker.getDeclaration();
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

        it('should load BASE_DECLARATION when no stored declaration', async () => {
            coreStub.storage.restWorker.loadStateData = null;
            await coreStub.storage.service.restart();

            const declaration = await configWorker.load();
            assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, { raw: { class: 'Telemetry', schemaVersion: appInfo.version } });
            assert.deepStrictEqual(declaration, { class: 'Telemetry', schemaVersion: appInfo.version });
            assert.deepStrictEqual(coreStub.configWorker.configs[0], { components: [], mappings: {} });
            assert.deepStrictEqual(configWorker.currentConfig, { components: [], mappings: {} });
        });

        it('should load stored declaration with an additional options and show save without them', async () => {
            coreStub.storage.restWorker.loadData = {
                config: {
                    raw: { class: 'Telemetry', My_Consumer: { class: 'Telemetry_Consumer', type: 'default' } },
                    normalized: { mappings: {}, components: [] }
                }
            };
            const expectedDeclaration = {
                class: 'Telemetry',
                schemaVersion: appInfo.version,
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

            await coreStub.storage.service.restart();

            const loadedDeclaration = await configWorker.load();
            assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, {
                raw: {
                    class: 'Telemetry',
                    schemaVersion: appInfo.version,
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

    describe('.processDeclaration()', () => {
        it('should ignore an error if save config fails', async () => {
            coreStub.storage.restWorker.saveError = new Error('saveStateError');
            await configWorker.processDeclaration({ class: 'Telemetry' });
        });

        it('should reject with invalid declaration (no args)', async () => {
            await assert.isRejected(
                configWorker.processDeclaration(),
                /should have required property.*class/
            );
        });

        it('should reject with invalid declaration (empty object)', async () => {
            await assert.isRejected(
                configWorker.processDeclaration({}),
                /should have required property.*class/
            );
        });
    });

    describe('.processNamespaceDeclaration()', () => {
        it('should ignore an error if save config fails', async () => {
            coreStub.storage.restWorker.saveError = new Error('saveStateError');
            await configWorker.processNamespaceDeclaration({ class: 'Telemetry_Namespace' }, 'namespace');
        });

        it('should reject with invalid declaration (no args)', async () => {
            await assert.isRejected(
                configWorker.processNamespaceDeclaration(),
                /should have required property.*class/
            );
        });

        it('should reject with invalid declaration (empty object)', async () => {
            await assert.isRejected(
                configWorker.processNamespaceDeclaration({}),
                /should have required property.*class/
            );
        });

        it('should reject with invalid namespace declaration (class is not Telemetry_Namespace)', async () => {
            await assert.isRejected(
                configWorker.processNamespaceDeclaration({ class: 'Telemetry' }),
                /properties\/class\/enum.*"allowedValues":\["Telemetry_Namespace"\]/
            );
        });

        it('should reject with invalid namespace declaration (invalid property)', async () => {
            await assert.isRejected(
                configWorker.processNamespaceDeclaration({
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System'
                    },
                    additionalProp: { fake: true }
                }, 'NewbieNamespace'),
                /"additionalProperty":"fake".*should NOT have additional properties/
            );
        });

        it('should reject on attempt to submit Namespace declaration with name that belongs to another type of object', async () => {
            await configWorker.processDeclaration({ class: 'Telemetry', namespace: { class: 'Shared' } });
            await assert.isRejected(
                configWorker.processNamespaceDeclaration({ class: 'Telemetry_Namespace' }, 'namespace'),
                /Unable to override existing object with name "namespace"/
            );
        });
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
                                coreStub.storage.restWorker.loadData = {
                                    config: {
                                        raw: testUtil.deepCopy(testConf.preLoadDeclaration)
                                    }
                                };
                                loadPromise = loadPromise
                                    .then(() => coreStub.storage.service.restart())
                                    .then(() => configWorker.load());
                            } else {
                                coreStub.storage.restWorker.loadStateData = null;
                                loadPromise = loadPromise
                                    .then(() => coreStub.storage.service.restart());
                            }
                            return loadPromise
                                .then(() => {
                                    preloadedState = coreStub.storage.restWorker.savedState;
                                });
                        });

                        it('should expand config, save it and emit event', async () => {
                            const validated = await testSuite.entryPoint();

                            assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, {
                                raw: expectedFullDeclaration
                            }, 'should store whole declaration in Storage');
                            assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                            assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                            assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], expectedEmittedConfiguration, 'should match expected emitted configuration');
                        });

                        it('should return expanded declaration', async () => {
                            const validated = await testSuite.entryPoint({ expanded: true });

                            assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, {
                                raw: expectedFullDeclaration
                            }, 'should store whole declaration in Storag');
                            assert.deepStrictEqual(validated, expectedExpandedDeclaration, 'should match expected expanded declaration');
                            assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                            assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], expectedEmittedConfiguration, 'should match expected emitted configuration');
                        });

                        if (testConf.additionalTests) {
                            it('should not fail when unable to distribute configuration (decryptAllSecrets failed)', async () => {
                                coreStub.deviceUtil.decrypt.rejects(new Error('expected error'));
                                const validated = await testSuite.entryPoint();

                                assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, {
                                    raw: expectedFullDeclaration
                                }, 'should store whole declaration in Storage');
                                assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], undefined, 'should not emit event');
                            });

                            it('should not fail when unable to distribute configuration (event listener failed)', async () => {
                                const onChangeStub = stubs.eventEmitterListener(configWorker, 'change');
                                onChangeStub.rejects(new Error('expected error'));

                                const validated = await testSuite.entryPoint();
                                assert.deepStrictEqual(coreStub.storage.restWorker.savedData.config, {
                                    raw: expectedFullDeclaration
                                }, 'should store whole declaration in Storage');
                                assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                assert.isTrue(onChangeStub.calledOnce);
                            });

                            it('should not save config', async () => {
                                const validated = await testSuite.entryPoint({ save: false });

                                assert.deepStrictEqual(coreStub.storage.restWorker.savedState, preloadedState, 'should match pre-test state');
                                assert.deepStrictEqual(validated, expectedValidatedDeclaration, 'should match expected validated declaration');
                                assert.deepStrictEqual(configWorker.currentConfig, expectedCurrentConfiguration, 'should match expected current configuration');
                                assert.deepStrictEqual(coreStub.configWorker.configs[historyIndex], expectedEmittedConfiguration, 'should match expected emitted configuration');
                            });
                        }
                    });
                });
            });
        });
    });

    describe('\'error\' event', () => {
        it('should log error if caught an error', async () => {
            await configWorker.safeEmitAsync('error', new Error('expected error'));

            assert.includeMatch(
                coreStub.logger.messages.all,
                /Unhandled error in ConfigWorker[\s\S]+expected error/gm,
                'should log error message'
            );
        });
    });

    describe('\'change\' event', () => {
        it('should set log level', async () => {
            await configWorker.processDeclaration(dummies.declaration.base.decrypted({
                controls: dummies.declaration.controls.full.decrypted({
                    logLevel: 'error'
                })
            }));

            assert.deepStrictEqual(coreStub.logger.logLevelHistory.slice(-1), ['error'], 'should set log level to error');

            await configWorker.processDeclaration(dummies.declaration.base.decrypted({
                controls: dummies.declaration.controls.full.decrypted({
                    logLevel: 'debug'
                })
            }));

            assert.deepStrictEqual(coreStub.logger.logLevelHistory.slice(-1), ['debug'], 'should set log level to debug');
        });
    });

    describe('\'received\' event', () => {
        it('should send event', async () => {
            await configWorker.processDeclaration(dummies.declaration.base.decrypted({
                controls: dummies.declaration.controls.full.decrypted({
                    logLevel: 'error'
                })
            }), {
                metadata: {
                    msg: 'here'
                }
            });

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
        });

        it('should send event (namespace)', async () => {
            await configWorker.processNamespaceDeclaration(dummies.declaration.namespace.base.decrypted({
                consumer: dummies.declaration.consumer.default.decrypted()
            }),
            'Namespace',
            {
                metadata: {
                    msg: 'here'
                }
            });

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
        });
    });

    describe('\'validationFailed\' event', () => {
        it('should send event', async () => {
            let validationError;
            configWorker.on('received', (ctx) => {
                // want to be sure that original data distributed only
                ctx.declaration.modified = true;
                ctx.metadata.modified = true;
            });

            try {
                await configWorker.processDeclaration(dummies.declaration.base.decrypted({
                    invalid: true,
                    controls: dummies.declaration.controls.full.decrypted({
                        logLevel: 'error'
                    })
                }), {
                    metadata: {
                        msg: 'here'
                    }
                });
            } catch (error) {
                validationError = error;
            }

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

            let data;
            assert.doesNotThrow(() => {
                data = JSON.parse(validationError.message);
            }, 'should be valid JSON');

            assert.isArray(data);
        });
    });

    describe('\'validationSucceed\' event', () => {
        it('should send event', async () => {
            configWorker.on('received', (ctx) => {
                // want to be sure that original data distributed only
                ctx.declaration.modified = true;
                ctx.metadata.modified = true;
            });
            await configWorker.processDeclaration(dummies.declaration.base.decrypted({
                controls: dummies.declaration.controls.full.decrypted({
                    logLevel: 'error'
                })
            }), {
                metadata: {
                    msg: 'here'
                }
            });

            assert.deepStrictEqual(coreStub.configWorker.validationFailedSpy.callCount, 0, 'should not call listener for "validationFailed" event');
            assert.deepStrictEqual(coreStub.configWorker.validationSucceedSpy.callCount, 1, 'should call listener "validationSucceed" event');
            assert.deepStrictEqual(coreStub.configWorker.validationSucceedSpy.args[0], [{
                declaration: dummies.declaration.base.decrypted({
                    controls: dummies.declaration.controls.full.decrypted({
                        logLevel: 'error',
                        memoryThresholdPercent: 90
                    }),
                    schemaVersion: appInfo.version
                }),
                metadata: {
                    msg: 'here'
                },
                transactionID: 'uuid1'
            }], 'should pass data to event');
        });
    });

    describe('\'*.config.getConfig\' event', () => {
        it('should listen for the event', async () => {
            const ee = new SafeEventEmitter();
            coreStub.appEvents.appEvents.register(ee, 'test', ['config.getConfig']);

            const getConfig = async (filter) => {
                const components = await new Promise((resolve) => {
                    ee.emit('config.getConfig', resolve, filter);
                });
                return components.map((c) => ({ id: c.id, class: c.class }));
            };

            assert.deepStrictEqual(await getConfig(), [], 'should return empty array for empty config');

            await configWorker.processDeclaration(getComponentTestsData.declaration);

            const combinations = testUtil.product(
                getComponentTestsData.params.class,
                getComponentTestsData.params.filter,
                getComponentTestsData.params.name,
                getComponentTestsData.params.namespace
            );

            for (const [cls, filter, name, namespace] of combinations) {
                const expected = cls.expected
                    // `filter` ignored === all ids
                    .filter((c) => getComponentTestsData.allIDs.find((e) => e.id === c.id)
                        && name.expected.find((e) => e.id === c.id)
                        && namespace.expected.find((e) => e.id === c.id));

                assert.sameDeepMembers(
                    (await getConfig({
                        class: cls.filter,
                        filter: filter.filter,
                        name: name.filter,
                        namespace: namespace.filter
                    })).map((c) => ({ id: c.id, class: c.class })),
                    expected
                );
            }
        });
    });

    describe('\'*.config.decrypt\' event', () => {
        let ee;

        const decryptConfig = (data) => new Promise((resolve, reject) => {
            ee.emit('config.decrypt', data, (error, decryptedData) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(decryptedData);
                }
            });
        });

        const getConfig = () => new Promise((resolve) => {
            ee.emit('config.getConfig', resolve);
        });

        beforeEach(async () => {
            ee = new SafeEventEmitter();
            coreStub.appEvents.appEvents.register(ee, 'test', [
                'config.getConfig',
                'config.decrypt'
            ]);

            await configWorker.processDeclaration({
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '/test',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '/test',
                        passphrase: {
                            cipherText: 'test_passphrase_2'
                        }
                    }
                }
            });
        });

        it('should decrypt config', async () => {
            const components = await getConfig();
            assert.isTrue(
                components.every((c) => c.passphrase.cipherText.startsWith('$M$')),
                'should encrypt secrets'
            );

            const decrypted = await decryptConfig(components);
            assert.sameDeepMembers(
                decrypted.map((c) => c.passphrase),
                ['test_passphrase_1', 'test_passphrase_2'],
                'should decrypt secrets'
            );
            assert.sameDeepMembers(
                components.map((c) => c.passphrase),
                ['test_passphrase_1', 'test_passphrase_2'],
                'should modify origin data'
            );
        });

        it('should return error when unable to decypt', async () => {
            const components = await getConfig();
            assert.isTrue(
                components.every((c) => c.passphrase.cipherText.startsWith('$M$')),
                'should encrypt secrets'
            );

            coreStub.deviceUtil.decrypt.rejects(new Error('expected decrypt error'));
            await assert.isRejected(decryptConfig(components), /expected decrypt error/);
        });
    });

    describe('\'*.config.getHash\' event', () => {
        let ee;

        const getHash = (data) => new Promise((resolve, reject) => {
            ee.emit('config.getHash', data, (error, hash) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(hash);
                }
            });
        });

        const getConfig = () => new Promise((resolve) => {
            ee.emit('config.getConfig', resolve);
        });

        beforeEach(async () => {
            ee = new SafeEventEmitter();
            coreStub.appEvents.appEvents.register(ee, 'test', [
                'config.getConfig',
                'config.getHash'
            ]);

            await configWorker.processDeclaration({
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP',
                    host: '192.168.2.1',
                    path: '/test',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    }
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '192.168.2.1',
                        path: '/test',
                        passphrase: {
                            cipherText: 'test_passphrase_2'
                        }
                    }
                }
            });
        });

        it('should get config hash', async () => {
            const components = await getConfig();

            const hashList = await getHash(components);
            assert.isArray(hashList);
            hashList.forEach((hash, idx) => {
                assert.isString(hash);
                assert.isNotEmpty(hash);

                if (idx !== (hashList.length - 1)) {
                    assert.notInclude(hashList.slice(idx + 1), hash, 'should return different hashes for objects');
                }
            });

            const reversedHashList = await getHash(components.slice().reverse());
            reversedHashList.forEach((hash, idx) => {
                assert.deepStrictEqual(hash, hashList[hashList.length - 1 - idx]);
            });

            const componentsCopy = components.slice();
            componentsCopy.forEach((c) => {
                c.name = 'test_value';
            });

            const updatedHashList = await getHash(componentsCopy);
            updatedHashList.forEach((hash, idx) => {
                assert.isString(hash);
                assert.isNotEmpty(hash);

                if (idx !== (updatedHashList.length - 1)) {
                    assert.notInclude(updatedHashList.slice(idx + 1), hash, 'should return different hashes for objects');
                }
            });
            updatedHashList.forEach((hash) => {
                assert.notInclude(hashList, hash, 'should generate a new hash value');
            });

            const singleHash = await getHash(componentsCopy[0]);
            assert.isString(singleHash);
            assert.isNotEmpty(singleHash);
            assert.include(updatedHashList, singleHash);
        });

        it('should return error when unable to get hash', async () => {
            await assert.isRejected(getHash(), 'config should be an object');
        });
    });
});
