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

const configWorker = require('../../src/lib/config');
const configUtil = require('../../src/lib/utils/config');
const consumers = require('../../src/lib/consumers');
const moduleLoader = require('../../src/lib/utils/moduleLoader').ModuleLoader;
const utilMisc = require('../../src/lib/utils/misc');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Consumers', () => {
    beforeEach(() => {
        const coreStub = stubs.coreStub({
            configWorker,
            persistentStorage,
            teemReporter,
            utilMisc
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;
        return configWorker.processDeclaration({ class: 'Telemetry' });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('config listener', () => {
        it('should load required consumers', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };
            return configWorker.processDeclaration(exampleConfig)
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                });
        });

        it('should not load disabled consumers', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                }
            };
            return configWorker.processDeclaration(exampleConfig)
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 0, 'should not load disabled consumer');
                });
        });

        it('should return empty list of consumers', () => configWorker.emitAsync('change', { components: [], mappings: {} })
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.strictEqual(loadedConsumers.length, 0);
            }));

        it('should unload unrequired consumers', () => {
            const priorConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };
            return configWorker.processDeclaration(priorConfig)
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                    return configWorker.emitAsync('change', { components: [], mappings: {} });
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).length, 0, 'should unload default consumer');
                });
        });

        it('should fail to load invalid pull consumer types (consumerType=unknowntype)', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'unknowntype'
                }
            };
            // config will not pass schema validation
            // but this test allows catching if consumer module/dir is not configured properly
            return configUtil.normalizeDeclaration(exampleConfig)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).indexOf('unknowntype'), -1,
                        'should not load invalid consumer type');
                });
        });

        it('should not reload existing consumer when processing a new namespace declaration', () => {
            let existingConsumer;
            const existingConfig = {
                class: 'Telemetry',
                FirstConsumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };

            const namespaceConfig = {
                class: 'Telemetry_Namespace',
                SecondConsumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };
            const moduleLoaderSpy = sinon.spy(moduleLoader, 'load');
            return configWorker.processDeclaration(existingConfig)
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                    assert.isTrue(moduleLoaderSpy.calledOnce);
                    existingConsumer = loadedConsumers[0];
                })
                .then(() => configWorker.processNamespaceDeclaration(namespaceConfig, 'NewNamespace'))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 2, 'should load new consumer too');
                    assert.strictEqual(loadedConsumers[0].id, existingConsumer.id);
                    assert.strictEqual(loadedConsumers[1].id, 'NewNamespace::SecondConsumer');
                    assert.isTrue(moduleLoaderSpy.calledTwice);
                });
        });
    });
});
