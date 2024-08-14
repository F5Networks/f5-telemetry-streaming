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
const configUtilTestData = require('../data/configUtilTests');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const srcAssert = sourceCode('src/lib/utils/assert');
const configUtil = sourceCode('src/lib/utils/config');
const constants = sourceCode('src/lib/constants');

moduleCache.remember();

describe('Config Util', () => {
    let configWorker;
    let coreStub;

    const parseDeclaration = (declaration, options) => configWorker.processDeclaration(
        testUtil.deepCopy(declaration),
        options
    )
        .then((ret) => {
            const components = configWorker.currentConfig.components;
            assert.isDefined(components);

            components.forEach((comp) => {
                if (comp.class === constants.CONFIG_CLASSES.IHEALTH_POLLER_CLASS_NAME) {
                    srcAssert.config.ihealthPoller(comp, 'iHealth Poller Component');
                }
                if (comp.class === constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME) {
                    srcAssert.config.systemPoller(comp, 'System Poller Component');
                }
                if (comp.class === constants.CONFIG_CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME) {
                    srcAssert.config.pullConsumerPollerGroup(comp, 'Pull Consumer System Poller Group Component');
                }
            });
            return ret;
        });

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub();
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        await coreStub.startServices();

        configWorker = coreStub.configWorker.configWorker;
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('.getComponents', () => {
        it('should return empty array when no config passed', () => assert.isEmpty(configUtil.getComponents()));
        it('should return empty array when no .components', () => assert.isEmpty(configUtil.getComponents({})));

        it('should pass combinations tests', async () => {
            await parseDeclaration(configUtilTestData.getComponents.declaration);

            testUtil.product(
                configUtilTestData.getComponents.params.class,
                configUtilTestData.getComponents.params.filter,
                configUtilTestData.getComponents.params.name,
                configUtilTestData.getComponents.params.namespace
            ).forEach(([cls, filter, name, namespace]) => {
                const expected = cls.expected
                    .filter((c) => filter.expected.find((e) => e.id === c.id)
                        && name.expected.find((e) => e.id === c.id)
                        && namespace.expected.find((e) => e.id === c.id));

                assert.sameDeepMembers(
                    configUtil.getComponents(configWorker.currentConfig, {
                        class: cls.filter,
                        filter: filter.filter,
                        name: name.filter,
                        namespace: namespace.filter
                    }).map((c) => ({ id: c.id, class: c.class })),
                    expected
                );
            });
        });
    });

    describe('.getReceivers()', () => {
        it('should return receivers when defined', () => {
            const rawDecl = {
                class: 'Telemetry',
                listener: {
                    class: 'Telemetry_Listener'
                },
                My_Namespace_1: {
                    class: 'Telemetry_Namespace',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                },
                My_Namespace_2: {
                    class: 'Telemetry_Namespace',
                    listener: {
                        class: 'Telemetry_Listener'
                    },
                    consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                },
                My_Namespace_3: {
                    class: 'Telemetry_Namespace',
                    poller: {
                        class: 'Telemetry_System_Poller'
                    },
                    consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    pullConsumer: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        systemPoller: ['poller']
                    }
                },
                My_Namespace_4: {
                    class: 'Telemetry_Namespace',
                    poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 0
                    },
                    consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    },
                    pullConsumer: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        systemPoller: ['poller']
                    },
                    pullConsumer2: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        enable: false,
                        systemPoller: ['poller']
                    }
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    let listener = configUtil.getTelemetryListeners(configWorker.currentConfig, { namespace: 'f5telemetry_default' })[0];
                    assert.isEmpty(configUtil.getReceivers(configWorker.currentConfig, listener));

                    listener = configUtil.getTelemetryListeners(configWorker.currentConfig, { namespace: 'My_Namespace_1' })[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, listener).map((c) => c.id),
                        ['My_Namespace_1::consumer']
                    );

                    listener = configUtil.getTelemetryListeners(configWorker.currentConfig, { namespace: 'My_Namespace_2' })[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, listener).map((c) => c.id),
                        ['My_Namespace_2::consumer_1', 'My_Namespace_2::consumer_2']
                    );

                    let poller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig, { namespace: 'My_Namespace_3' })[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, poller).map((c) => c.id),
                        ['My_Namespace_3::consumer']
                    );

                    poller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig, { namespace: 'My_Namespace_4' })[0];
                    assert.isEmpty(configUtil.getReceivers(configWorker.currentConfig, poller));

                    let pullConsumer = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, { namespace: 'My_Namespace_3' })[0];
                    let pullConsumerGroup = configUtil.getTelemetryPullConsumerSystemPollerGroup(
                        configWorker.currentConfig, pullConsumer
                    );

                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, pullConsumerGroup).map((c) => c.id),
                        ['My_Namespace_3::pullConsumer']
                    );

                    pullConsumer = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, { namespace: 'My_Namespace_4', name: 'pullConsumer' })[0];
                    pullConsumerGroup = configUtil.getTelemetryPullConsumerSystemPollerGroup(
                        configWorker.currentConfig, pullConsumer
                    );

                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, pullConsumerGroup).map((c) => c.id),
                        ['My_Namespace_4::pullConsumer']
                    );

                    pullConsumer = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, { namespace: 'My_Namespace_4', name: 'pullConsumer2' })[0];
                    assert.isUndefined(configUtil.getTelemetryPullConsumerSystemPollerGroup(
                        configWorker.currentConfig, pullConsumer
                    ));
                });
        });
    });

    describe('.getTelemetryControls()', () => {
        it('should return Controls', () => {
            const rawDecl = {
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    logLevel: 'verbose'
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    assert.deepStrictEqual(
                        configUtil.getTelemetryControls(configWorker.currentConfig),
                        {
                            class: 'Controls',
                            name: 'controls',
                            logLevel: 'verbose',
                            namespace: 'f5telemetry_default',
                            id: 'f5telemetry_default::controls',
                            memoryThresholdPercent: 90,
                            debug: false
                        }
                    );
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
                    assert.deepStrictEqual(
                        configUtil.getTelemetryControls(configWorker.currentConfig),
                        {
                            class: 'Controls',
                            name: 'controls', // this is just a guess, depends on ordering
                            logLevel: 'debug',
                            namespace: 'f5telemetry_default',
                            id: 'f5telemetry_default::controls',
                            memoryThresholdPercent: 90,
                            debug: false
                        }
                    );
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
                        configUtil.hasEnabledComponents(configWorker.currentConfig),
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
                .then((configs) => configUtil.mergeDeclaration(configs[1], configs[0]))
                .then((normalized) => {
                    assert.sameDeepMembers([normalized.mappings], [testConf.expected.mappings]);
                    assert.sameDeepMembers(normalized.components, testConf.expected.components);
                }));
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
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
                        host: '192.168.2.1',
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

    describe('.getTelemetrySystemPollersForGroup()', () => {
        const declaration = {
            class: 'Telemetry',
            Disabled_Pull_Poller_Standalone: {
                class: 'Telemetry_System_Poller',
                enable: false,
                interval: 0
            },
            Disabled_Pull_Poller_1: {
                class: 'Telemetry_System_Poller',
                enable: false,
                interval: 0
            },
            Pull_Poller_1: {
                class: 'Telemetry_System_Poller',
                interval: 0
            },
            Pull_Poller_2: {
                class: 'Telemetry_System_Poller',
                interval: 0,
                enable: false
            },
            Pull_Poller_3: {
                class: 'Telemetry_System_Poller',
                interval: 0
            },
            Pull_Poller_4: {
                class: 'Telemetry_System_Poller'
            },
            Pull_System_1: {
                class: 'Telemetry_System',
                host: 'host1',
                systemPoller: 'Pull_Poller_2'
            },
            Pull_System_2: {
                class: 'Telemetry_System',
                host: 'host2',
                systemPoller: [
                    'Pull_Poller_4',
                    'Disabled_Pull_Poller_1'
                ]
            },
            Pull_System_3: {
                class: 'Telemetry_System',
                enable: true,
                host: 'host3',
                systemPoller: 'Pull_Poller_2'
            },
            Pull_System_4: {
                class: 'Telemetry_System',
                host: 'host4',
                enable: false,
                systemPoller: 'Pull_Poller_4'
            },
            My_Pull_Consumer_1: {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                systemPoller: [
                    'Pull_Poller_1',
                    'Pull_Poller_2',
                    'Pull_Poller_4',
                    'Disabled_Pull_Poller_Standalone'
                ]
            },
            My_Pull_Consumer_2: {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                systemPoller: [
                    'Pull_Poller_2',
                    'Pull_Poller_3',
                    'Pull_Poller_4',
                    'Disabled_Pull_Poller_Standalone'
                ]
            },
            My_Namespace: {
                class: 'Telemetry_Namespace',
                Disabled_Pull_Poller_Standalone: {
                    class: 'Telemetry_System_Poller',
                    enable: false,
                    interval: 0
                },
                Disabled_Pull_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    enable: false,
                    interval: 0
                },
                Pull_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_2: {
                    class: 'Telemetry_System_Poller',
                    interval: 0,
                    enable: false
                },
                Pull_Poller_3: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_4: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_System_1: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    systemPoller: 'Pull_Poller_2'
                },
                Pull_System_2: {
                    class: 'Telemetry_System',
                    host: 'host2',
                    systemPoller: [
                        'Pull_Poller_4',
                        'Disabled_Pull_Poller_1'
                    ]
                },
                Pull_System_3: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host3',
                    systemPoller: 'Pull_Poller_2'
                },
                Pull_System_4: {
                    class: 'Telemetry_System',
                    host: 'host4',
                    enable: false,
                    systemPoller: 'Pull_Poller_4'
                },
                My_Pull_Consumer_1: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: [
                        'Pull_Poller_1',
                        'Pull_Poller_2',
                        'Pull_Poller_4',
                        'Disabled_Pull_Poller_Standalone'
                    ]
                },
                My_Pull_Consumer_2: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: [
                        'Pull_Poller_2',
                        'Pull_Poller_3',
                        'Pull_Poller_4',
                        'Disabled_Pull_Poller_Standalone'
                    ]
                }
            }
        };

        it('should return Telemetry_System_Poller for each group', () => parseDeclaration(declaration)
            .then(() => {
                const pullConsumer1 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, {
                    name: (name) => name === 'My_Pull_Consumer_1',
                    namespace: 'f5telemetry_default'
                })[0];
                assert.isDefined(pullConsumer1);

                const pollerGroup1 = configUtil.getTelemetryPullConsumerSystemPollerGroup(
                    configWorker.currentConfig,
                    pullConsumer1
                );
                assert.isNotEmpty(pollerGroup1);
                assert.deepStrictEqual(pollerGroup1.id, 'f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1');
                assert.sameDeepMembers(
                    configUtil.getTelemetrySystemPollersForGroup(configWorker.currentConfig, pollerGroup1)
                        .map((sp) => sp.id),
                    [
                        'f5telemetry_default::Pull_Poller_1::Pull_Poller_1',
                        'f5telemetry_default::Pull_System_2::Pull_Poller_4'
                    ],
                    'should return Telemetry_System_Poller objects for f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1 group'
                );

                const pullConsumer2 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, {
                    name: 'My_Pull_Consumer_2',
                    namespace: 'f5telemetry_default'
                })[0];
                assert.isDefined(pullConsumer2);

                const pollerGroup2 = configUtil.getTelemetryPullConsumerSystemPollerGroup(
                    configWorker.currentConfig,
                    pullConsumer2
                );
                assert.isNotEmpty(pollerGroup2);
                assert.deepStrictEqual(pollerGroup2.id, 'f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2');
                assert.sameDeepMembers(
                    configUtil.getTelemetrySystemPollersForGroup(configWorker.currentConfig, pollerGroup2)
                        .map((sp) => sp.id),
                    [
                        'f5telemetry_default::Pull_Poller_3::Pull_Poller_3',
                        'f5telemetry_default::Pull_System_2::Pull_Poller_4'
                    ],
                    'should return Telemetry_System_Poller objects for f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2 group'
                );

                const pullConsumer3 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, {
                    name: 'My_Pull_Consumer_1',
                    namespace: 'My_Namespace'
                })[0];
                assert.isDefined(pullConsumer3);

                const pollerGroup3 = configUtil.getTelemetryPullConsumerSystemPollerGroup(
                    configWorker.currentConfig,
                    pullConsumer3
                );
                assert.isNotEmpty(pollerGroup3);
                assert.deepStrictEqual(pollerGroup3.id, 'My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1');
                assert.sameDeepMembers(
                    configUtil.getTelemetrySystemPollersForGroup(configWorker.currentConfig, pollerGroup3)
                        .map((sp) => sp.id),
                    [
                        'My_Namespace::Pull_Poller_1::Pull_Poller_1',
                        'My_Namespace::Pull_System_2::Pull_Poller_4'
                    ],
                    'should return Telemetry_System_Poller objects for My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1 group'
                );

                const pullConsumer4 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, {
                    name: 'My_Pull_Consumer_2',
                    namespace: 'My_Namespace'
                })[0];
                assert.isDefined(pullConsumer4);

                const pollerGroup4 = configUtil.getTelemetryPullConsumerSystemPollerGroup(
                    configWorker.currentConfig,
                    pullConsumer4
                );
                assert.isNotEmpty(pollerGroup4);
                assert.deepStrictEqual(pollerGroup4.id, 'My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2');
                assert.sameDeepMembers(
                    configUtil.getTelemetrySystemPollersForGroup(configWorker.currentConfig, pollerGroup4)
                        .map((sp) => sp.id),
                    [
                        'My_Namespace::Pull_Poller_3::Pull_Poller_3',
                        'My_Namespace::Pull_System_2::Pull_Poller_4'
                    ],
                    'should return Telemetry_System_Poller objects for My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2 group'
                );
            }));
    });

    describe('.getComponentHash()', () => {
        const ignoredTopLevelKeys = ['enable', 'id', 'trace'];

        function verifyChanges(originObject) {
            const originHash = configUtil.getComponentHash(originObject);
            const objectCopy = testUtil.deepCopy(originObject);
            const prevHash = [];

            function checkHash(path) {
                const newHash = configUtil.getComponentHash(objectCopy);
                assert.notDeepEqual(originHash, newHash, `should generate different from origin hash (${path.join('::')})`);
                assert.notInclude(prevHash, newHash, `should not generate existing hash (${path.join('::')})`);
                prevHash.push(newHash);
            }

            function verify(data, level = 0, path = []) {
                path = path.slice();
                path.push('');

                if (Array.isArray(data)) {
                    data.forEach((item, idx) => {
                        path[path.length - 1] = idx;

                        data[idx] = 'test_value';
                        checkHash(path);
                        data[idx] = item;

                        verify(item, level + 1, path.slice());
                    });
                } else if (typeof data === 'object' && data !== null) {
                    if (level === 0) {
                        ignoredTopLevelKeys.forEach((key) => {
                            data[key] = 'test_value';
                            assert.deepStrictEqual(
                                originHash,
                                configUtil.getComponentHash(objectCopy),
                                `should ignore new value for a top-level key "${key}"`
                            );
                        });
                        ignoredTopLevelKeys.forEach((key) => {
                            delete data[key];
                            assert.deepStrictEqual(
                                originHash,
                                configUtil.getComponentHash(data),
                                `should ignore when top-level key "${key}" deleted`
                            );
                        });
                    }
                    // top level keys deleted at that moment already
                    Object.entries(data)
                        .forEach(([key, item]) => {
                            path[path.length - 1] = key;

                            data[key] = 'test_value';
                            checkHash(path);
                            data[key] = item;

                            verify(item, level + 1, path.slice());
                        });
                }
            }
            verify(objectCopy);
        }

        it('should generate hash for Telemetry_iHealth_Poller', async () => {
            await parseDeclaration({
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    enable: true,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    iHealthPoller: {
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_1'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        },
                        proxy: {
                            host: 'proxyhost',
                            port: 5555,
                            protocol: 'https'
                        }
                    },
                    systemPoller: {
                        interval: 60,
                        workers: 6,
                        chunkSize: 60
                    }
                },
                My_System_2: {
                    class: 'Telemetry_System',
                    host: 'host1',
                    enable: true,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    iHealthPoller: {
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_1'
                        },
                        interval: {
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        },
                        proxy: {
                            host: 'proxyhost',
                            port: 5555,
                            protocol: 'https'
                        }
                    },
                    systemPoller: {
                        interval: 60,
                        workers: 6,
                        chunkSize: 60
                    }
                }
            });

            const poller = configUtil.getTelemetryIHealthPollers(configWorker.currentConfig)[0];
            assert.isDefined(poller);

            const originHash = configUtil.getComponentHash(poller);

            assert.isString(originHash, 'should be a string');
            assert.isNotEmpty(originHash, 'should be a non-empty string');

            assert.deepStrictEqual(
                originHash,
                configUtil.getComponentHash(configUtil.getTelemetryIHealthPollers(configWorker.currentConfig)[0]),
                'should generate the same hash value'
            );

            const pollers = configUtil.getTelemetryIHealthPollers(configWorker.currentConfig);

            assert.notDeepEqual(pollers[0].id, pollers[1].id);
            assert.notDeepEqual(
                configUtil.getComponentHash(pollers[0]),
                configUtil.getComponentHash(pollers[1]),
                'should generate different hash values for different objects'
            );

            pollers.forEach(verifyChanges);
        });

        it('should generate hash for Telemetry_System_Poller', async () => {
            await parseDeclaration({
                class: 'Telemetry',
                Poller_1: {
                    class: 'Telemetry_System_Poller',
                    enable: true,
                    host: 'host1',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    tag: {
                        test: 'tag'
                    },
                    endpointList: {
                        enable: true,
                        items: {
                            test: {
                                path: '/test'
                            }
                        }
                    }
                },
                Poller_2: {
                    class: 'Telemetry_System_Poller',
                    enable: true,
                    host: 'host1',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    tag: {
                        test: 'tag'
                    }
                }
            });

            const poller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig)[0];
            assert.isDefined(poller);

            const originHash = configUtil.getComponentHash(poller);

            assert.isString(originHash, 'should be a string');
            assert.isNotEmpty(originHash, 'should be a non-empty string');

            assert.deepStrictEqual(
                originHash,
                configUtil.getComponentHash(configUtil.getTelemetrySystemPollers(configWorker.currentConfig)[0]),
                'should generate the same hash value'
            );

            const pollers = configUtil.getTelemetrySystemPollers(configWorker.currentConfig);

            assert.notDeepEqual(pollers[0].id, pollers[1].id);
            assert.notDeepEqual(
                configUtil.getComponentHash(pollers[0]),
                configUtil.getComponentHash(pollers[1]),
                'should generate different hash values for different objects'
            );

            pollers.forEach(verifyChanges);
        });

        it('should generate hash for Telemetry_System', async () => {
            await parseDeclaration({
                class: 'Telemetry',
                Poller_1: {
                    class: 'Telemetry_System_Poller',
                    enable: true,
                    host: 'host1',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    tag: {
                        test: 'tag'
                    },
                    endpointList: {
                        enable: true,
                        items: {
                            test: {
                                path: '/test'
                            }
                        }
                    }
                },
                System_1: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    systemPoller: ['Poller_1']
                },
                System_2: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'host1',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    systemPoller: {
                        tag: {
                            test: 'tag'
                        }
                    }
                }
            });

            const poller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig)[0];
            assert.isDefined(poller);

            const originHash = configUtil.getComponentHash(poller);

            assert.isString(originHash, 'should be a string');
            assert.isNotEmpty(originHash, 'should be a non-empty string');

            assert.deepStrictEqual(
                originHash,
                configUtil.getComponentHash(configUtil.getTelemetrySystemPollers(configWorker.currentConfig)[0]),
                'should generate the same hash value'
            );

            const pollers = configUtil.getTelemetrySystemPollers(configWorker.currentConfig);

            assert.notDeepEqual(pollers[0].id, pollers[1].id);
            assert.notDeepEqual(
                configUtil.getComponentHash(pollers[0]),
                configUtil.getComponentHash(pollers[1]),
                'should generate different hash values for different objects'
            );

            pollers.forEach(verifyChanges);
        });
    });
});
