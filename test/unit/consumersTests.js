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
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');

const configWorker = sourceCode('src/lib/config');
const configUtil = sourceCode('src/lib/utils/config');
const consumers = sourceCode('src/lib/consumers');
const moduleLoader = sourceCode('src/lib/utils/moduleLoader').ModuleLoader;

moduleCache.remember();

describe('Consumers', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        const coreStub = stubs.default.coreStub();
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
                    assert.lengthOf(loadedConsumers, 1, 'should load default consumer');
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
                    assert.isEmpty(loadedConsumers, 'should not load disabled consumer');
                });
        });

        it('should return empty list of consumers', () => configWorker.emitAsync('change', { components: [], mappings: {} })
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.isEmpty(loadedConsumers);
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
                    assert.lengthOf(loadedConsumers, 1, 'should load default consumer');
                    return configWorker.emitAsync('change', { components: [], mappings: {} });
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.isEmpty(Object.keys(loadedConsumers), 'should unload default consumer');
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
                .then((normalized) => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(
                        Object.keys(loadedConsumers).indexOf('unknowntype'),
                        -1,
                        'should not load invalid consumer type'
                    );
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
                    assert.lengthOf(loadedConsumers, 1, 'should load default consumer');
                    assert.isTrue(moduleLoaderSpy.calledOnce);
                    existingConsumer = loadedConsumers[0];
                })
                .then(() => configWorker.processNamespaceDeclaration(namespaceConfig, 'NewNamespace'))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.lengthOf(loadedConsumers, 2, 'should load new consumer too');
                    assert.strictEqual(loadedConsumers[0].id, existingConsumer.id);
                    assert.strictEqual(loadedConsumers[1].id, 'NewNamespace::SecondConsumer');
                    assert.isTrue(moduleLoaderSpy.calledTwice);
                });
        });
    });
});
