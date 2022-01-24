/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

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

moduleCache.remember();

describe('Config Util', () => {
    let coreStub;

    const parseDeclaration = (declaration, options) => configWorker.processDeclaration(
        testUtil.deepCopy(declaration),
        options
    );

    before(() => {
        moduleCache.restore();
    });

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
        it('should return empty array when no config passed', () => assert.isEmpty(configUtil.getComponents()));
        it('should return empty array when no .components', () => assert.isEmpty(configUtil.getComponents({})));

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
                    }
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    let listener = configUtil.getTelemetryListeners(configWorker.currentConfig, 'f5telemetry_default')[0];
                    assert.isEmpty(configUtil.getReceivers(configWorker.currentConfig, listener));

                    listener = configUtil.getTelemetryListeners(configWorker.currentConfig, 'My_Namespace_1')[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, listener).map((c) => c.id),
                        ['My_Namespace_1::consumer']
                    );

                    listener = configUtil.getTelemetryListeners(configWorker.currentConfig, 'My_Namespace_2')[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, listener).map((c) => c.id),
                        ['My_Namespace_2::consumer_1', 'My_Namespace_2::consumer_2']
                    );

                    let poller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig, 'My_Namespace_3')[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, poller).map((c) => c.id),
                        ['My_Namespace_3::consumer']
                    );

                    poller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig, 'My_Namespace_4')[0];
                    assert.isEmpty(configUtil.getReceivers(configWorker.currentConfig, poller));

                    let pullConsumerGroup = configUtil.getTelemetryPullConsumerSystemPollerGroups(configWorker.currentConfig, 'My_Namespace_3')[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, pullConsumerGroup).map((c) => c.id),
                        ['My_Namespace_3::pullConsumer']
                    );

                    pullConsumerGroup = configUtil.getTelemetryPullConsumerSystemPollerGroups(configWorker.currentConfig, 'My_Namespace_4')[0];
                    assert.deepStrictEqual(
                        configUtil.getReceivers(configWorker.currentConfig, pullConsumerGroup).map((c) => c.id),
                        ['My_Namespace_4::pullConsumer']
                    );
                });
        });
    });

    describe('.getSources()', () => {
        it('should return data sources when defined', () => {
            const rawDecl = {
                class: 'Telemetry',
                consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
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
                    listener_1: {
                        class: 'Telemetry_Listener'
                    },
                    listener_2: {
                        class: 'Telemetry_Listener'
                    },
                    consumer: {
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
                    }
                }
            };
            return parseDeclaration(rawDecl)
                .then(() => {
                    let consumer = configUtil.getTelemetryConsumers(configWorker.currentConfig, 'f5telemetry_default')[0];
                    assert.isEmpty(configUtil.getSources(configWorker.currentConfig, consumer));

                    consumer = configUtil.getTelemetryConsumers(configWorker.currentConfig, 'My_Namespace_1')[0];
                    assert.deepStrictEqual(
                        configUtil.getSources(configWorker.currentConfig, consumer).map((c) => c.id),
                        ['My_Namespace_1::listener']
                    );

                    consumer = configUtil.getTelemetryConsumers(configWorker.currentConfig, 'My_Namespace_2')[0];
                    assert.deepStrictEqual(
                        configUtil.getSources(configWorker.currentConfig, consumer).map((c) => c.id),
                        ['My_Namespace_2::listener_1', 'My_Namespace_2::listener_2']
                    );

                    consumer = configUtil.getTelemetryConsumers(configWorker.currentConfig, 'My_Namespace_3')[0];
                    assert.deepStrictEqual(
                        configUtil.getSources(configWorker.currentConfig, consumer).map((c) => c.id),
                        ['My_Namespace_3::poller::poller']
                    );

                    let pullConsumer = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'My_Namespace_3')[0];
                    assert.deepStrictEqual(
                        configUtil.getSources(configWorker.currentConfig, pullConsumer).map((c) => c.id),
                        ['My_Namespace_3::Telemetry_Pull_Consumer_System_Poller_Group_pullConsumer']
                    );

                    consumer = configUtil.getTelemetryConsumers(configWorker.currentConfig, 'My_Namespace_4')[0];
                    assert.isEmpty(configUtil.getSources(configWorker.currentConfig, consumer));

                    pullConsumer = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'My_Namespace_4')[0];
                    assert.deepStrictEqual(
                        configUtil.getSources(configWorker.currentConfig, pullConsumer).map((c) => c.id),
                        ['My_Namespace_4::Telemetry_Pull_Consumer_System_Poller_Group_pullConsumer']
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
                    assert.deepStrictEqual(
                        configUtil.getTelemetryControls(configWorker.currentConfig),
                        {
                            class: 'Controls',
                            name: 'controls',
                            logLevel: 'debug',
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
                .then((configs) => configUtil.mergeDeclaration(configs[1], configs[0]))
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
                    assert.deepStrictEqual(parsedConf.mappings, { 'f5telemetry_default::My_Listener': ['f5telemetry_default::My_Consumer'] });
                    assert.lengthOf(parsedConf.components, 3);

                    configUtil.removeComponents(parsedConf);
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.isEmpty(parsedConf.components);
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
                        'f5telemetry_default::My_Listener': ['f5telemetry_default::My_Consumer', 'f5telemetry_default::My_Consumer_2', 'f5telemetry_default::My_Consumer_3'],
                        'My_Namespace::My_Listener': ['My_Namespace::My_Consumer']
                    });

                    configUtil.removeComponents(parsedConf, { filter: (c) => c.name === 'My_Consumer' });
                    assert.deepStrictEqual(parsedConf.mappings, {
                        'f5telemetry_default::My_Listener': ['f5telemetry_default::My_Consumer_2', 'f5telemetry_default::My_Consumer_3']
                    });
                    assert.lengthOf(configUtil.getTelemetryListeners(parsedConf), 2);
                    assert.lengthOf(configUtil.getTelemetryConsumers(parsedConf), 2);

                    configUtil.removeComponents(parsedConf, { filter: (c) => c.name === 'My_Listener', namespace: 'f5telemetry_default' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.lengthOf(configUtil.getTelemetryListeners(parsedConf), 1);
                    assert.lengthOf(configUtil.getTelemetryConsumers(parsedConf), 2);

                    configUtil.removeComponents(parsedConf, { class: 'Telemetry_Listener', namespace: (c) => c.namespace === 'My_Namespace' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.isEmpty(configUtil.getTelemetryListeners(parsedConf));
                    assert.lengthOf(configUtil.getTelemetryConsumers(parsedConf), 2);

                    configUtil.removeComponents(parsedConf, { filter: (c) => c.name === 'My_Consumer_2' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.lengthOf(configUtil.getTelemetryConsumers(parsedConf), 1);

                    configUtil.removeComponents(parsedConf, { class: 'Telemetry_Consumer' });
                    assert.deepStrictEqual(parsedConf.mappings, {});
                    assert.isEmpty(configUtil.getTelemetryConsumers(parsedConf));
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

    describe('.getTelemetryPullConsumerSystemPollerGroupForPullConsumer()', () => {
        const declaration = {
            class: 'Telemetry',
            Pull_Poller_1: {
                class: 'Telemetry_System_Poller',
                interval: 0
            },
            Pull_Poller_2: {
                class: 'Telemetry_System_Poller',
                interval: 0
            },
            Pull_Poller_3: {
                class: 'Telemetry_System_Poller',
                interval: 0
            },
            My_Pull_Consumer_1: {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                systemPoller: [
                    'Pull_Poller_1',
                    'Pull_Poller_2'
                ]
            },
            My_Pull_Consumer_2: {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                systemPoller: [
                    'Pull_Poller_2',
                    'Pull_Poller_3'
                ]
            },
            My_Namespace: {
                class: 'Telemetry_Namespace',
                Pull_Poller_1: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_2: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                Pull_Poller_3: {
                    class: 'Telemetry_System_Poller',
                    interval: 0
                },
                My_Pull_Consumer_1: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: [
                        'Pull_Poller_1',
                        'Pull_Poller_2'
                    ]
                },
                My_Pull_Consumer_2: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: [
                        'Pull_Poller_2',
                        'Pull_Poller_3'
                    ]
                }
            }
        };

        it('should return Telemetry_Pull_Consumer_System_Poller_Group for each consumer', () => parseDeclaration(declaration)
            .then(() => {
                const pullPoller = configUtil.getTelemetrySystemPollers(configWorker.currentConfig, 'f5telemetry_default')
                    .find((pc) => pc.name === 'Pull_Poller_1');
                assert.isNotEmpty(pullPoller);
                assert.isUndefined(configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
                    configWorker.currentConfig,
                    pullPoller
                ), 'should return "undefined" when unable to find component');

                const pullConsumer1 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'f5telemetry_default')
                    .find((pc) => pc.name === 'My_Pull_Consumer_1');
                assert.isNotEmpty(pullConsumer1);
                assert.deepStrictEqual(
                    configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
                        configWorker.currentConfig,
                        pullConsumer1
                    ),
                    {
                        class: 'Telemetry_Pull_Consumer_System_Poller_Group',
                        enable: true,
                        id: 'f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1',
                        name: 'Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1',
                        namespace: 'f5telemetry_default',
                        pullConsumer: 'f5telemetry_default::My_Pull_Consumer_1',
                        traceName: 'f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1',
                        trace: {
                            enable: false
                        },
                        systemPollers: [
                            'f5telemetry_default::Pull_Poller_1::Pull_Poller_1',
                            'f5telemetry_default::Pull_Poller_2::Pull_Poller_2'
                        ]
                    },
                    'should return Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1'
                );
                const pullConsumer2 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'f5telemetry_default')
                    .find((pc) => pc.name === 'My_Pull_Consumer_2');
                assert.isNotEmpty(pullConsumer1);
                assert.deepStrictEqual(
                    configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
                        configWorker.currentConfig,
                        pullConsumer2
                    ),
                    {
                        class: 'Telemetry_Pull_Consumer_System_Poller_Group',
                        enable: true,
                        id: 'f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2',
                        name: 'Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2',
                        namespace: 'f5telemetry_default',
                        pullConsumer: 'f5telemetry_default::My_Pull_Consumer_2',
                        traceName: 'f5telemetry_default::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2',
                        trace: {
                            enable: false
                        },
                        systemPollers: [
                            'f5telemetry_default::Pull_Poller_2::Pull_Poller_2',
                            'f5telemetry_default::Pull_Poller_3::Pull_Poller_3'
                        ]
                    },
                    'should return Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2'
                );
                const pullConsumer3 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'My_Namespace')
                    .find((pc) => pc.name === 'My_Pull_Consumer_1');
                assert.isNotEmpty(pullConsumer1);
                assert.deepStrictEqual(
                    configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
                        configWorker.currentConfig,
                        pullConsumer3
                    ),
                    {
                        class: 'Telemetry_Pull_Consumer_System_Poller_Group',
                        enable: true,
                        id: 'My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1',
                        name: 'Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1',
                        namespace: 'My_Namespace',
                        pullConsumer: 'My_Namespace::My_Pull_Consumer_1',
                        traceName: 'My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1',
                        trace: {
                            enable: false
                        },
                        systemPollers: [
                            'My_Namespace::Pull_Poller_1::Pull_Poller_1',
                            'My_Namespace::Pull_Poller_2::Pull_Poller_2'
                        ]
                    },
                    'should return Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_1'
                );
                const pullConsumer4 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'My_Namespace')
                    .find((pc) => pc.name === 'My_Pull_Consumer_2');
                assert.isNotEmpty(pullConsumer1);
                assert.deepStrictEqual(
                    configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
                        configWorker.currentConfig,
                        pullConsumer4
                    ),
                    {
                        class: 'Telemetry_Pull_Consumer_System_Poller_Group',
                        enable: true,
                        id: 'My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2',
                        name: 'Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2',
                        namespace: 'My_Namespace',
                        pullConsumer: 'My_Namespace::My_Pull_Consumer_2',
                        traceName: 'My_Namespace::Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2',
                        trace: {
                            enable: false
                        },
                        systemPollers: [
                            'My_Namespace::Pull_Poller_2::Pull_Poller_2',
                            'My_Namespace::Pull_Poller_3::Pull_Poller_3'
                        ]
                    },
                    'should return Telemetry_Pull_Consumer_System_Poller_Group_My_Pull_Consumer_2'
                );
            }));
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
                const pullConsumer1 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'f5telemetry_default')
                    .find((pc) => pc.name === 'My_Pull_Consumer_1');
                assert.isNotEmpty(pullConsumer1);

                const pollerGroup1 = configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
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

                const pullConsumer2 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'f5telemetry_default')
                    .find((pc) => pc.name === 'My_Pull_Consumer_2');
                assert.isNotEmpty(pullConsumer2);

                const pollerGroup2 = configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
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

                const pullConsumer3 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'My_Namespace')
                    .find((pc) => pc.name === 'My_Pull_Consumer_1');
                assert.isNotEmpty(pullConsumer3);

                const pollerGroup3 = configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
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

                const pullConsumer4 = configUtil.getTelemetryPullConsumers(configWorker.currentConfig, 'My_Namespace')
                    .find((pc) => pc.name === 'My_Pull_Consumer_2');
                assert.isNotEmpty(pullConsumer4);

                const pollerGroup4 = configUtil.getTelemetryPullConsumerSystemPollerGroupForPullConsumer(
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
});
