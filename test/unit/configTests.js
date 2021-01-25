/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const util = require('../../src/lib/utils/misc');
const config = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/utils/device');
const psModule = require('../../src/lib/persistentStorage');
const configTestsData = require('./data/configTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Config', () => {
    let persistentStorage;
    let restStorage;
    let upgradeConfigurationMock;
    let uuidCounter = 0;

    const baseState = {
        _data_: {
            config: {
                raw: {},
                normalized: { components: [], mappings: {} }
            }
        }
    };

    before(() => {
        persistentStorage = psModule.persistentStorage;
        restStorage = new psModule.RestStorage({
            loadState: (first, cb) => { cb(null, baseState); },
            saveState: (first, state, cb) => { cb(null); }
        });
    });

    beforeEach(() => {
        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });
        sinon.stub(persistentStorage, 'storage').value(restStorage);
        restStorage._cache = JSON.parse(JSON.stringify(baseState));
        // Stub upgradeConfiguration() to ensure no config side-effects
        upgradeConfigurationMock = sinon.stub(config, 'upgradeConfiguration').callsFake(c => Promise.resolve(c));
    });

    afterEach(() => {
        uuidCounter = 0;
        sinon.restore();
    });

    describe('.validate()', () => {
        it('should validate basic declaration (default = full schema)', () => {
            const obj = {
                class: 'Telemetry'
            };
            return assert.isFulfilled(config.validate(obj));
        });

        it('should validate declaration for a subschema (schemaType = namespace)', () => {
            const obj = {
                class: 'Telemetry_Namespace'
            };
            return assert.isFulfilled(config.validate(obj, { schemaType: 'Telemetry_Namespace' }));
        });

        it('should throw error when no validators found', () => {
            const obj = {
                class: 'Telemetry'
            };
            sinon.stub(config, 'validators').value(null);
            return assert.isRejected(config.validate(obj), 'Validator is not available');
        });

        it('should throw error when no specific validator found (default full schema type)', () => {
            const obj = {
                class: 'Telemetry_New'
            };
            sinon.stub(config, 'validators').value({ otherType: data => data });
            return assert.isRejected(config.validate(obj, { schemaType: 'Telemetry_New' }), 'Validator is not available');
        });
    });

    describe('.processDeclaration()', () => {
        let emitAsyncSpy;
        let savedConfig;
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
                path: '`=/Shared/constants/path`'
            }
        };
        const expectedNormalized = {
            mappings: {},
            components: [
                {
                    name: 'Shared',
                    id: 'uuid1',
                    class: 'Shared',
                    constants: {
                        class: 'Constants',
                        path: '/foo'
                    },
                    namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                },
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
                    namespace: constants.DEFAULT_UNNAMED_NAMESPACE
                }
            ]
        };

        beforeEach(() => {
            emitAsyncSpy = sinon.spy(config, 'emitAsync');
            sinon.stub(config, 'saveConfig').callsFake((configToSave) => {
                savedConfig = configToSave;
                return Promise.resolve();
            });
            sinon.stub(config, 'getConfig').callsFake(() => Promise.resolve(savedConfig));
            sinon.stub(deviceUtil, 'decryptAllSecrets').callsFake(data => Promise.resolve(data));
        });

        it('should validate and apply basic declaration', () => {
            const obj = {
                class: 'Telemetry'
            };
            const validatedObj = {
                class: 'Telemetry',
                schemaVersion: constants.VERSION
            };
            return assert.becomes(config.processDeclaration(obj), validatedObj);
        });

        it('should expand config and save', () => config.processDeclaration(decl)
            .then(() => {
                assert.deepStrictEqual(savedConfig.normalized, expectedNormalized);
            }));

        it('should emit expected normalized config', () => config.processDeclaration(decl)
            .then(() => {
                assert.deepStrictEqual(emitAsyncSpy.firstCall.args[1], expectedNormalized);
            }));
    });

    describe('.saveConfig()', () => {
        it('should throw an error if save config fails', () => {
            sinon.stub(persistentStorage, 'set').rejects(new Error('saveStateError'));
            return assert.isRejected(config.saveConfig(), /saveStateError/);
        });
    });

    describe('.getConfig()', () => {
        it('should return BASE_CONFIG if data is undefined', () => {
            sinon.stub(persistentStorage, 'get').resolves(undefined);
            return assert.becomes(config.getConfig(),
                { raw: {}, normalized: { components: [], mappings: {} } });
        });

        it('should return BASE_CONFIG if data is {}', () => {
            sinon.stub(persistentStorage, 'get').resolves({});
            return assert.becomes(config.getConfig(),
                { raw: {}, normalized: { components: [], mappings: {} } });
        });


        it('should return BASE_CONFIG even if data.parsed is {}, and remove parsed property', () => {
            sinon.stub(persistentStorage, 'get').resolves({ raw: {}, parsed: {} });
            return assert.becomes(config.getConfig(),
                { raw: {}, normalized: { components: [], mappings: {} } });
        });

        it('should return data if data.normalized is set', () => {
            sinon.stub(persistentStorage, 'get').resolves({ raw: { value: 'Hello World' }, normalized: { value: 'Hello World' } });
            return assert.becomes(config.getConfig(), { raw: { value: 'Hello World' }, normalized: { value: 'Hello World' } });
        });

        it('should return BASE_CONFIG if data.raw is {}', () => {
            sinon.stub(persistentStorage, 'get').resolves({ raw: {} });
            return assert.becomes(config.getConfig(),
                { raw: {}, normalized: { components: [], mappings: {} } });
        });
        it('should return data if data.raw is set', () => {
            sinon.stub(persistentStorage, 'get').resolves({ raw: { value: 'Hello World' }, normalized: { components: [{ value: 'Hello World' }] } });
            return assert.becomes(config.getConfig(), { raw: { value: 'Hello World' }, normalized: { components: [{ value: 'Hello World' }] } });
        });
    });

    describe('.loadConfig()', () => {
        let configChangeMock;
        beforeEach(() => {
            configChangeMock = sinon.stub(config, '_notifyConfigChange').resolves();
        });

        afterEach(() => {
            configChangeMock.restore();
        });

        it('should reject if persistentStorage errors', () => {
            sinon.stub(persistentStorage, 'get').rejects(new Error('loadStateError'));
            return assert.isRejected(config.loadConfig(), /loadStateError/);
        });

        it('should set config to BASE_CONFIG, even if persistentStorage returns {}', () => {
            sinon.stub(persistentStorage, 'get').resolves({});
            return config.loadConfig()
                .then(() => {
                    assert.deepStrictEqual(configChangeMock.firstCall.args[0],
                        { raw: {}, normalized: { components: [], mappings: {} } });
                });
        });

        it('should set config BASE_CONFIG, if decryptAllSecrets returns {}', () => {
            sinon.stub(deviceUtil, 'decryptAllSecrets').resolves({});
            return config.loadConfig()
                .then(() => {
                    assert.deepStrictEqual(configChangeMock.firstCall.args[0],
                        { raw: {}, normalized: { components: [], mappings: {} } });
                });
        });

        it('should set config if there is an unexpected error in setConfig', () => {
            sinon.stub(config, 'setConfig').rejects(new Error('Unexpected Error'));
            return assert.isRejected(config.loadConfig(), /Unexpected Error/);
        });

        it('should get config in old format, convert to new, and propagate the change', () => {
            sinon.stub(config, 'getConfig')
                .resolves({ raw: { class: 'Telemetry' }, parsed: { class: 'Telemetry' } });
            upgradeConfigurationMock.restore();
            return config.loadConfig()
                .then(() => {
                    assert.deepStrictEqual(
                        configChangeMock.firstCall.args[0],
                        { raw: { class: 'Telemetry' }, normalized: { components: [], mappings: {} } }
                    );
                });
        });
    });

    describe('.setConfig()', () => {
        it('should fail to set config when invalid config provided', () => {
            assert.isRejected(config.setConfig({}),
                '_notifyConfigChange() Missing required config.');
        });

        it('should upgrade the configuration when required', () => {
            upgradeConfigurationMock.restore();
            const _notifyConfigChangeMock = sinon.stub(config, '_notifyConfigChange').resolves();
            const curConfig = {
                raw: { class: 'Telemetry', listener: { class: 'Telemetry_Listener' } },
                parsed: { value: 'some old format' }
            };

            return config.setConfig(curConfig)
                .then(() => {
                    assert.deepStrictEqual(
                        _notifyConfigChangeMock.firstCall.args[0],
                        {
                            raw: { class: 'Telemetry', listener: { class: 'Telemetry_Listener' } },
                            normalized: {
                                components: [
                                    {
                                        // note that this is the expanded version
                                        class: 'Telemetry_Listener',
                                        id: 'uuid1',
                                        name: 'listener',
                                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                                        actions: [
                                            {
                                                enable: true,
                                                setTag: {
                                                    application: '`A`',
                                                    tenant: '`T`'
                                                }
                                            }
                                        ],
                                        enable: true,
                                        match: '',
                                        port: 6514,
                                        trace: false,
                                        tag: {},
                                        traceName: 'listener'
                                    }
                                ],
                                mappings: {
                                    uuid1: []
                                }
                            }
                        }
                    );
                });
        });

        it('should not normalize the configuration if an upgrade is not needed', () => {
            upgradeConfigurationMock.restore();
            const _notifyConfigChangeMock = sinon.stub(config, '_notifyConfigChange').resolves();
            // Stub saveConfig(), since normalizeConfig is problematic to stub
            const saveConfigMock = sinon.stub(config, 'saveConfig').rejects();
            const curConfig = {
                normalized: { value: 'aword' }
            };

            return config.setConfig(curConfig)
                .then(() => {
                    assert.strictEqual(saveConfigMock.called, false);
                    assert.deepStrictEqual(_notifyConfigChangeMock.firstCall.args[0], {
                        normalized: { value: 'aword' }
                    });
                });
        });
    });

    describe('.upgradeConfiguration', () => {
        it('should add normalized configuration to config object, if not present', () => {
            upgradeConfigurationMock.restore();
            const curConfig = {
                raw: {
                    class: 'Telemetry',
                    theConsumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    theListener: {
                        class: 'Telemetry_Listener'
                    }
                },
                parsed: {
                    Telemetry_Consumer: {
                        theConsumer: {
                            class: 'Telemetry_Consumer',
                            type: 'default'
                        }
                    },
                    Telemetry_Listener: {
                        theListener: {
                            class: 'Telemetry_Listener'
                        }
                    }
                }
            };

            return assert.becomes(config.upgradeConfiguration(curConfig), {
                raw: {
                    class: 'Telemetry',
                    theConsumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    theListener: {
                        class: 'Telemetry_Listener'
                    }
                },
                normalized: {
                    components: [
                        {
                            id: 'uuid1',
                            name: 'theConsumer',
                            type: 'default',
                            class: 'Telemetry_Consumer',
                            traceName: 'theConsumer',
                            namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                            allowSelfSignedCert: false,
                            enable: true,
                            trace: false
                        },
                        {
                            id: 'uuid2',
                            name: 'theListener',
                            class: 'Telemetry_Listener',
                            namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ],
                            enable: true,
                            match: '',
                            port: 6514,
                            trace: false,
                            tag: {},
                            traceName: 'theListener'
                        }
                    ],
                    mappings: {
                        uuid2: ['uuid1']
                    }
                }
            });
        });

        it('should not add normalized property if already present', () => {
            upgradeConfigurationMock.restore();
            sinon.stub(config, 'saveConfig').rejects(new Error('Should not have been called'));
            const curConfig = {
                normalized: {
                    components: [{
                        id: 'uuid1',
                        name: 'theConsumer',
                        type: 'default',
                        class: 'Telemetry_Consumer',
                        traceName: 'theConsumer',
                        namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
                        allowSelfSignedCert: false,
                        enable: true,
                        trace: false
                    }],
                    mappings: {}
                }
            };
            return assert.becomes(config.upgradeConfiguration(util.deepCopy(curConfig)), curConfig);
        });

        it('should not fail on empty config', () => {
            upgradeConfigurationMock.restore();

            const curConfig = {};
            return assert.becomes(config.upgradeConfiguration(curConfig), {
                raw: {},
                normalized: { components: [], mappings: {} }
            });
        });
    });

    describe('.processNamespaceDeclaration()', () => {
        const testSet = configTestsData.processNamespaceDeclaration;
        let savedConfig;
        let emitAsyncSpy;

        beforeEach(() => {
            emitAsyncSpy = sinon.spy(config, 'emitAsync');
            sinon.stub(config, 'saveConfig').callsFake((configToSave) => {
                savedConfig = configToSave;
                return Promise.resolve();
            });
            sinon.stub(config, 'getConfig').callsFake(() => Promise.resolve(savedConfig));
            sinon.stub(deviceUtil, 'decryptAllSecrets').callsFake(data => Promise.resolve(data));
        });

        testSet.forEach(testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
            savedConfig = testConf.existingConfig;
            return config.processNamespaceDeclaration(testConf.input.declaration, testConf.input.namespace)
                .then((result) => {
                    assert.deepStrictEqual(savedConfig.normalized, testConf.expectedNormalized);
                    assert.deepStrictEqual(result, testConf.expectedResult);
                });
        }));

        it('should reject with invalid namespace declaration (class is not Telemetry_Namespace)', () => assert.isRejected(
            config.processNamespaceDeclaration({ class: 'Telemetry' }),
            /properties\/class\/enum.*"allowedValues":\["Telemetry_Namespace"\]/
        ));

        it('should reject with invalid namespace declaration (invalid property)', () => assert.isRejected(config.processNamespaceDeclaration(
            {
                class: 'Telemetry_Namespace',
                My_System_1: {
                    class: 'Telemetry_System'
                },
                additionalProp: { fake: true }
            },
            'NewbieNamespace'
        ), /"additionalProperty":"fake".*should NOT have additional properties/));

        it('should emit expected normalized config (unchanged namespaces have skipUpdate = true)', () => {
            const baseComp = {
                name: 'My_System_1',
                class: 'Telemetry_System',
                enable: true,
                systemPollers: [],
                allowSelfSignedCert: false,
                host: 'localhost',
                port: 8100,
                protocol: 'http'
            };
            const defComp = util.assignDefaults({ id: 'uuid-default', namespace: 'f5telemetry_default' }, util.deepCopy(baseComp));
            const existingComp = util.assignDefaults({ id: 'uuid-namespace-was-here', namespace: 'NamespaceWasHere' }, util.deepCopy(baseComp));
            const newComp = util.assignDefaults({ id: 'uuid1', namespace: 'NewbieNamespace' }, util.deepCopy(baseComp));

            savedConfig = {
                raw: {
                    class: 'Telemetry',
                    My_System_1: {
                        class: 'Telemetry_System'
                    },
                    NamespaceWasHere: {
                        class: 'Telemetry_Namespace',
                        My_System_1: {
                            class: 'Telemetry_System'
                        }
                    }
                },
                normalized: {
                    mappings: {},
                    components: [
                        defComp,
                        existingComp
                    ]
                }
            };

            const expectedNormalized = util.deepCopy(savedConfig.normalized);
            expectedNormalized.components[0].skipUpdate = true;
            expectedNormalized.components[1].skipUpdate = true;
            expectedNormalized.components.push(newComp);

            return config.processNamespaceDeclaration(
                {
                    class: 'Telemetry_Namespace',
                    My_System_1: {
                        class: 'Telemetry_System'
                    }
                },
                'NewbieNamespace'
            )
                .then(() => {
                    assert.deepStrictEqual(emitAsyncSpy.firstCall.args[1], expectedNormalized);
                });
        });
    });
});
