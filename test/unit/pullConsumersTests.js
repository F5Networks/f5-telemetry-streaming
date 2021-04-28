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
const configUtil = require('../../src/lib/utils/config');
const CONFIG_CLASSES = require('../../src/lib/constants').CONFIG_CLASSES;
const deviceUtil = require('../../src/lib/utils/device');
const moduleLoader = require('../../src/lib/utils/moduleLoader').ModuleLoader;
const persistentStorage = require('../../src/lib/persistentStorage');
const pullConsumers = require('../../src/lib/pullConsumers');
const pullConsumersTestsData = require('./data/pullConsumersTestsData');
const stubs = require('./shared/stubs');
const systemPoller = require('../../src/lib/systemPoller');
const teemReporter = require('../../src/lib/teemReporter');
const testUtil = require('./shared/util');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Pull Consumers', () => {
    beforeEach(() => {
        stubs.coreStub({
            configWorker,
            deviceUtil,
            persistentStorage,
            teemReporter,
            utilMisc
        });
        stubs.clock();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('config listener', () => {
        it('should load required pull consumer type (consumerType=default)', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return configWorker.processDeclaration(exampleConfig)
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepStrictEqual(loadedConsumers.length, 1);
                    assert.deepStrictEqual(loadedConsumers[0].config.type, 'default', 'should load default consumer');
                });
        });

        it('should not load disabled pull consumer', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller',
                    enable: false
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return configWorker.processDeclaration(exampleConfig)
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepStrictEqual(loadedConsumers, [], 'should not load disabled consumer');
                });
        });

        it('should fail to load invalid pull consumer types (consumerType=unknowntype)', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'unknowntype',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            // config will not pass schema validation
            // but this test allows catching if consumer module/dir is not configured properly
            return configUtil.normalizeDeclaration(exampleConfig)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).indexOf('unknowntype'), -1,
                        'should not load invalid consumer type');
                });
        });

        it('should unload unrequired pull consumers', () => {
            const priorConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return configWorker.processDeclaration(priorConfig)
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepEqual(loadedConsumers[0].config.type, 'default', 'should load default consumer');
                    return configWorker.emitAsync('change', { components: [], mappings: {} });
                })
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepStrictEqual(loadedConsumers, [], 'should unload default consumer');
                })
                .catch(err => Promise.reject(err));
        });

        it('should not reload existing pull consumer when processing a new namespace declaration', () => {
            let existingConsumer;
            const priorConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            const namespaceConfig = {
                class: 'Telemetry_Namespace',
                My_Consumer: testUtil.deepCopy(priorConfig.My_Consumer),
                My_Poller: testUtil.deepCopy(priorConfig.My_Poller)
            };
            const moduleLoaderSpy = sinon.spy(moduleLoader, 'load');
            return configWorker.processDeclaration(priorConfig)
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                    assert.isTrue(moduleLoaderSpy.calledOnce);
                    existingConsumer = loadedConsumers[0];
                })
                .then(() => configWorker.processNamespaceDeclaration(namespaceConfig, 'NewNamespace'))
                .then(() => {
                    const loadedConsumerIds = pullConsumers.getConsumers().map(c => c.id);
                    assert.strictEqual(loadedConsumerIds.length, 2, 'should load new consumer');
                    assert.deepStrictEqual(loadedConsumerIds[0], existingConsumer.id);
                    assert.isTrue(moduleLoaderSpy.calledTwice);
                });
        });
    });

    describe('.getData()', () => {
        let declaration;
        let returnCtx;

        beforeEach(() => {
            returnCtx = null;
            sinon.stub(systemPoller, 'process').callsFake((pollerConfig) => {
                if (returnCtx) {
                    return returnCtx(declaration, pollerConfig);
                }
                return Promise.resolve({
                    data: {
                        mockedResponse: {
                            pollerName: pollerConfig.name,
                            systemName: pollerConfig.systemName
                        }
                    }
                });
            });
        });

        const runTestCase = testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
            declaration = testConf.declaration;
            if (typeof testConf.returnCtx !== 'undefined') {
                returnCtx = testConf.returnCtx;
            }

            return configWorker.processDeclaration(testUtil.deepCopy(declaration))
                .then(() => pullConsumers.getData(testConf.consumerName, testConf.namespace))
                .then((data) => {
                    assert.sameDeepMembers(data, testConf.expectedResponse);
                }, (err) => {
                    if (testConf.errorRegExp) {
                        return assert.match(err, testConf.errorRegExp, 'should match error reg exp');
                    }
                    return Promise.reject(err);
                });
        });

        describe('default (no namespace)', () => pullConsumersTestsData.getData.forEach(testConf => runTestCase(testConf)));

        describe('default (no namespace), lookup using f5telemetry_default name',
            () => pullConsumersTestsData.getData.forEach((testConf) => {
                testConf.namespace = 'f5telemetry_default';
                runTestCase(testConf);
            }));

        describe('with namespace only', () => {
            const namespaceOnlyTestsData = testUtil.deepCopy(pullConsumersTestsData.getData);
            namespaceOnlyTestsData.forEach((testConf) => {
                testConf.declaration = {
                    class: 'Telemetry',
                    Namespace_Only: testConf.declaration
                };
                testConf.declaration.Namespace_Only.class = 'Telemetry_Namespace';
                testConf.namespace = 'Namespace_Only';
                return runTestCase(testConf);
            });
        });

        describe('mix - default (no namespace) and with namespaces', () => {
            const namespaceOnlyTestsData = testUtil.deepCopy(pullConsumersTestsData.getData);
            namespaceOnlyTestsData.forEach((testConf) => {
                testConf.declaration.Wanted_Namespace = testUtil.deepCopy(testConf.declaration);
                testConf.declaration.Wanted_Namespace.class = 'Telemetry_Namespace';
                testConf.declaration.Extra_Namespace = {
                    class: 'Telemetry_Namespace',
                    A_System_Poller: {
                        class: 'Telemetry_System_Poller'
                    }
                };
                testConf.namespace = 'Wanted_Namespace';
                return runTestCase(testConf);
            });

            const addtlTest = {
                name: 'should return an error if consumer exists in namespace but no namespace provided',
                declaration: {
                    class: 'Telemetry',
                    Some_System_Poller: {
                        class: 'Telemetry_System_Poller'
                    },
                    Some_Consumer: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        systemPoller: 'Some_System_Poller'
                    },
                    Wanted_Namespace: {
                        class: 'Telemetry_Namespace',
                        Wanted_Poller: {
                            class: 'Telemetry_System_Poller'
                        },
                        Wanted_Consumer: {
                            class: 'Telemetry_Pull_Consumer',
                            type: 'default',
                            systemPoller: 'Wanted_Poller'
                        }
                    }
                },
                consumerName: 'Wanted_Consumer',
                errorRegExp: /Pull Consumer with name 'Wanted_Consumer' doesn't exist/
            };
            return runTestCase(addtlTest);
        });
    });
});
