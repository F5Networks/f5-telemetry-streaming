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

/* eslint-disable global-require, import/order */
const moduleCache = require('../shared/restoreCache')();

const path = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtils = require('../shared/util');

const ConsumersService = sourceCode('src/lib/consumers');
const tracerManager = sourceCode('src/lib/tracerManager');

moduleCache.remember();

describe('Consumers', () => {
    let appEvents;
    let configWorker;
    let consumers;
    let consumersStats;
    let coreStub;
    let loadedConsumers;

    const complexKeys = [
        'config', 'consumer', 'logger', 'tracer'
    ];

    function filterConsumerCtx(consumerCtx) {
        const ret = {
            complex: {},
            other: {}
        };
        Object.keys(consumerCtx).forEach((key) => {
            ret[complexKeys.includes(key) ? 'complex' : 'other'][key] = consumerCtx[key];
        });
        return ret;
    }

    function processDeclaration(declaration) {
        return Promise.all([
            appEvents.waitFor('consumers.config.done'),
            configWorker.processDeclaration(declaration)
        ]);
    }

    function processNamespaceDeclaration(declaration, namespace) {
        return Promise.all([
            appEvents.waitFor('consumers.config.done'),
            configWorker.processNamespaceDeclaration(declaration, namespace)
        ]);
    }

    function verifyComplexProps(consumerCtx) {
        assert.isObject(consumerCtx.complex.config);
        assert.isFunction(consumerCtx.complex.consumer);
        assert.isObject(consumerCtx.complex.logger);
        assert.isFunction(consumerCtx.complex.logger.info);

        if (consumerCtx.other.v2) {
            assert.isFunction(consumerCtx.complex.tracer);
        } else if (consumerCtx.complex.tracer) {
            assert.isObject(consumerCtx.complex.tracer);
        } else {
            assert.isNull(consumerCtx.complex.tracer);
        }

        assert.deepStrictEqual(
            Object.keys(consumerCtx.complex).filter((k) => !complexKeys.includes(k)),
            []
        );
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        // used in ./consumers to test modules
        delete global.consumersTests;

        coreStub = stubs.default.coreStub();
        appEvents = coreStub.appEvents.appEvents;
        configWorker = coreStub.configWorker.configWorker;
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        consumersStats = {};
        loadedConsumers = [];

        appEvents.on('consumers.change', (getConsumers) => {
            loadedConsumers = getConsumers();
            loadedConsumers.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
        });
        appEvents.on('consumers.config.done', (stats) => {
            consumersStats = stats;
        });

        await coreStub.startServices();
        coreStub.logger.removeAllMessages();
    });

    afterEach(async () => {
        delete global.consumersTests;
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('service initialization', () => {
        it('should read plugins from default directory', async () => {
            const cs = new ConsumersService();
            cs.initialize(appEvents);
            assert.isTrue(cs.pluginsDir.endsWith('src/lib/consumers'));
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isFalse(cs.isRunning());
            assert.isTrue(cs.isStopped());

            await cs.start();

            assert.deepStrictEqual(cs.numberOfConsumers, 0);
            assert.deepStrictEqual(cs.numberOfModules, 0);
            assert.deepStrictEqual(cs.supportedModules, [
                'AWS_CloudWatch',
                'AWS_S3',
                'Azure_Application_Insights',
                'Azure_Log_Analytics',
                'DataDog',
                'default',
                'ElasticSearch',
                'F5_Cloud',
                'Generic_HTTP',
                'Google_Cloud_Logging',
                'Google_Cloud_Monitoring',
                'Graphite',
                'Kafka',
                'OpenTelemetry_Exporter',
                'Prometheus',
                'Splunk',
                'Statsd',
                'Sumo_Logic'
            ]);
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isTrue(cs.isRunning());
            assert.isFalse(cs.isStopped());

            await cs.destroy();
        });

        it('should fail to start when unable to read directory with plug-ins', async () => {
            const cs = new ConsumersService('/telemetry-consumers');
            cs.initialize(appEvents);
            assert.deepStrictEqual(cs.pluginsDir, '/telemetry-consumers');
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isFalse(cs.isRunning());
            assert.isTrue(cs.isStopped());

            await assert.isRejected(cs.start(), /no such file or directory/);
        });

        it('should start service and make a list of supported plug-ins', async () => {
            const cdir = path.join(__dirname, 'consumers');
            const cs = new ConsumersService(cdir);
            cs.initialize(appEvents);
            assert.deepStrictEqual(cs.pluginsDir, cdir);
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isFalse(cs.isRunning());
            assert.isTrue(cs.isStopped());

            await cs.start();

            assert.deepStrictEqual(cs.pluginsDir, cdir);
            assert.deepStrictEqual(cs.numberOfConsumers, 0);
            assert.deepStrictEqual(cs.numberOfModules, 0);
            assert.deepStrictEqual(cs.supportedModules, [
                'default',
                'Prometheus',
                'Splunk'
            ]);
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isTrue(cs.isRunning());
            assert.isFalse(cs.isStopped());

            await cs.destroy();
        });

        it('should start service even when no consumers in the directory', async () => {
            const cdir = path.join(__dirname, 'consumers', 'not-a-consumer');
            const cs = new ConsumersService(cdir);
            cs.initialize(appEvents);
            assert.deepStrictEqual(cs.pluginsDir, cdir);
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isFalse(cs.isRunning());
            assert.isTrue(cs.isStopped());

            await cs.start();

            assert.deepStrictEqual(cs.pluginsDir, cdir);
            assert.deepStrictEqual(cs.numberOfConsumers, 0);
            assert.deepStrictEqual(cs.numberOfModules, 0);
            assert.deepStrictEqual(cs.supportedModules, []);
            assert.isFalse(cs.isDestroyed());
            assert.isFalse(cs.isRestarting());
            assert.isTrue(cs.isRunning());
            assert.isFalse(cs.isStopped());

            await cs.destroy();
        });
    });

    describe('service start/stop/destroy/events handling', () => {
        beforeEach(() => {
            consumers = new ConsumersService(path.join(__dirname, 'consumers'));
            consumers.initialize(appEvents);
            return consumers.start()
                .then(() => {
                    assert.isFalse(consumers.isDestroyed());
                    assert.isFalse(consumers.isRestarting());
                    assert.isTrue(consumers.isRunning());
                    assert.isFalse(consumers.isStopped());

                    return processDeclaration({ class: 'Telemetry' });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumers.supportedModules, [
                        'default',
                        'Prometheus',
                        'Splunk'
                    ]);
                    assert.deepStrictEqual(loadedConsumers, []);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });
                });
        });

        afterEach(() => Promise.all([
            consumers.isRunning() ? appEvents.waitFor('consumers.change') : Promise.resolve(),
            consumers.isRunning() ? appEvents.waitFor('*.config.done') : Promise.resolve(),
            configWorker.processDeclaration({ class: 'Telemetry' })
        ])
            .then(() => {
                assert.deepStrictEqual(loadedConsumers, []);
                return consumers.stop();
            })
            .then(() => consumers.destroy()));

        it('should log error when unable to load consumer (missing directory)', () => processDeclaration({
            class: 'Telemetry',
            genericHttpConsmer: dummies.declaration.consumer.genericHttp.minimal.decrypted({})
        })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                assert.deepStrictEqual(consumers.numberOfModules, 0);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 0,
                    modules: 0
                });

                assert.includeMatch(
                    coreStub.logger.messages.warning,
                    /Unable to load consumer plug-in "Generic_HTTP": unknown type/
                );
                assert.includeMatch(
                    coreStub.logger.messages.warning,
                    /Unable to initialize consumer "f5telemetry_default::genericHttpConsmer".*plug-in "Generic_HTTP" does not exist/
                );
            }));

        it('should log error when unable to load consumer (unexpected module init exception, API v1)', () => {
            global.consumersTests = {
                default: {
                    fail: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                defaultConsumer: dummies.declaration.consumer.default.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Expected error on attempt to initialize "default" consumer module/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to load consumer plug-in "default"/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::defaultConsumer".*plug-in "default" not loaded/
                    );
                });
        });

        it('should log error when unable to load consumer (unexpected module.load() exception, API v2)', () => {
            global.consumersTests = {
                splunk: {
                    failLoad: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Uncaught exception on attempt to load consumer plug-in "Splunk"/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Expected error splunkModule.load/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::splunkConsumer".*plug-in "Splunk" not loaded/
                    );
                });
        });

        it('should log error when unable to load consumer (unexpected module.load() exception, API v2, promise)', () => {
            global.consumersTests = {
                splunk: {
                    failLoadPromise: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Uncaught exception on attempt to load consumer plug-in "Splunk"/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Expected error splunkModule.load.promise/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::splunkConsumer".*plug-in "Splunk" not loaded/
                    );
                });
        });

        it('should log error when unable to load consumer (unexpected module init exception, API v2)', () => {
            global.consumersTests = {
                splunk: {
                    fail: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Expected error on attempt to initialize "Splunk" consumer module/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to load consumer plug-in "Splunk"/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::splunkConsumer".*plug-in "Splunk" not loaded/
                    );
                });
        });

        it('should log error when unable to load consumer (unexpected module.exports type), API v2)', () => {
            global.consumersTests = {
                splunk: {
                    failExports: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Consumer plug-in "Splunk" should export function \(API v1\)/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::splunkConsumer".*plug-in "Splunk" not loaded/
                    );
                });
        });

        it('should log error when unable to load consumer (missing .load() function), API v2)', () => {
            global.consumersTests = {
                splunk: {
                    failExportsLoad: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Consumer plug-in "Splunk" should export function \(API v1\)/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::splunkConsumer".*plug-in "Splunk" not loaded/
                    );
                });
        });

        [
            'createConsumer',
            'deleteConsumer',
            'onLoad',
            'onUnload'
        ].forEach((methodName) => it(`should log error when unable to load consumer (module instance has no required method "${methodName}", API v2)`, () => {
            global.consumersTests = {
                splunk: {
                    failModuleMethodAPI: methodName
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Uncaught exception on attempt to load consumer plug-in "Splunk"/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        new RegExp(`Consumer plug-in "Splunk" has no required method "${methodName}"`, 'gm'),
                        `should log error message that "${methodName}" method is missing`
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.verbose,
                        /Module.*consumers\/Splunk.*was unloaded/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /Unable to initialize consumer "f5telemetry_default::splunkConsumer".*plug-in "Splunk" not loaded/
                    );
                    coreStub.logger.removeAllMessages();
                });
        }));

        [
            'onData',
            'onLoad',
            'onUnload'
        ].forEach((methodName) => it(`should log error when unable to load consumer (consumer instance has no required method "${methodName}", API v2)`, () => {
            global.consumersTests = {
                splunk: {
                    failConsumerMethodAPI: methodName
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 1,
                        modules: 1
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        new RegExp(`Consumer plug-in instance "Splunk" has no required method "${methodName}"`, 'gm'),
                        `should log error message that "${methodName}" method is missing`
                    );
                    assert.notIncludeMatch(
                        coreStub.logger.messages.verbose,
                        /Module.*consumers\/Splunk.*was unloaded/
                    );
                    coreStub.logger.removeAllMessages();
                });
        }));

        it('should log error when unable to unload consumer (onUnload() error), API v2)', () => {
            global.consumersTests = {
                splunk: {
                    failConsumerOnUnload: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 1,
                        modules: 1
                    });
                    return processDeclaration({
                        class: 'Telemetry'
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Expected error on attempt to unload "Splunk" consumer instance/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Uncaught exception on attemp to call ".onUnload\(\)" method for consumer "f5telemetry_default::splunkConsumer"/
                    );
                });
        });

        it('should log error when unable to unload consumer (deleteConsumer() error), API v2)', () => {
            global.consumersTests = {
                splunk: {
                    failDeleteConsumer: true
                }
            };
            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 2);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 2,
                        modules: 1
                    });
                    return processDeclaration({
                        class: 'Telemetry'
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Expected error on attempt to delete "Splunk" consumer instance/gm
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /Uncaught exception on attemp to call ".deleteConsumer\(\)" method for consumer "f5telemetry_default::splunkConsumer/gm
                    );
                });
        });

        it('should process declaration (API v1 only)', () => {
            let dcModuleTS = null;

            return processDeclaration({
                class: 'Telemetry',
                defaultConsumer1: dummies.declaration.consumer.default.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 1,
                        modules: 1
                    });

                    assert.lengthOf(loadedConsumers, 1);
                    const dcInstCtx = filterConsumerCtx(loadedConsumers[0]);

                    verifyComplexProps(dcInstCtx);
                    assert.deepStrictEqual(dcInstCtx.other, {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer1',
                        id: 'f5telemetry_default::defaultConsumer1',
                        metadata: null,
                        name: 'defaultConsumer1',
                        type: 'default',
                        v2: false
                    });

                    dcInstCtx.complex.consumer('something');
                    assert.deepStrictEqual(dcInstCtx.complex.consumer.getData(), ['something']);
                    dcInstCtx.complex.consumer.reset();
                    assert.deepStrictEqual(dcInstCtx.complex.consumer.getData(), []);

                    dcModuleTS = dcInstCtx.complex.consumer.getTimestamp();

                    assert.lengthOf(tracerManager.registered(), 0);

                    return processDeclaration({
                        class: 'Telemetry',
                        defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
                        defaultConsumer2: dummies.declaration.consumer.default.decrypted({}),
                        defaultConsumer3: dummies.declaration.consumer.default.decrypted({
                            trace: true
                        }),
                        defaultConsumer4: dummies.declaration.consumer.default.decrypted({
                            enable: false
                        })
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 3);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 3,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 3);
                    assert.lengthOf(tracerManager.registered(), 1);

                    for (let i = 1; i < loadedConsumers.length + 1; i += 1) {
                        const dcInstCtx = filterConsumerCtx(loadedConsumers[i - 1]);
                        verifyComplexProps(dcInstCtx);
                        assert.deepStrictEqual(dcInstCtx.other, {
                            allowsPull: false,
                            allowsPush: true,
                            class: 'Telemetry_Consumer',
                            fullName: `f5telemetry_default::defaultConsumer${i}`,
                            id: `f5telemetry_default::defaultConsumer${i}`,
                            metadata: null,
                            name: `defaultConsumer${i}`,
                            type: 'default',
                            v2: false
                        });
                        assert.deepStrictEqual(dcModuleTS, dcInstCtx.complex.consumer.getTimestamp());
                        dcInstCtx.complex.consumer(`something-${i}`);
                    }

                    assert.deepStrictEqual(loadedConsumers[0].consumer.getData(), [
                        'something-1',
                        'something-2',
                        'something-3'
                    ]);
                    loadedConsumers[0].consumer.reset();

                    return processDeclaration({
                        class: 'Telemetry',
                        defaultConsumer3: dummies.declaration.consumer.default.decrypted({}),
                        defaultConsumer4: dummies.declaration.consumer.default.decrypted({})
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 2);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 2,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 2);
                    assert.lengthOf(tracerManager.registered(), 0);

                    for (let i = 0; i < loadedConsumers.length; i += 1) {
                        const dcInstCtx = filterConsumerCtx(loadedConsumers[i]);
                        verifyComplexProps(dcInstCtx);
                        assert.deepStrictEqual(dcInstCtx.other, {
                            allowsPull: false,
                            allowsPush: true,
                            class: 'Telemetry_Consumer',
                            fullName: `f5telemetry_default::defaultConsumer${i + 3}`,
                            id: `f5telemetry_default::defaultConsumer${i + 3}`,
                            metadata: null,
                            name: `defaultConsumer${i + 3}`,
                            type: 'default',
                            v2: false
                        });
                        assert.deepStrictEqual(dcModuleTS, dcInstCtx.complex.consumer.getTimestamp());
                        dcInstCtx.complex.consumer(`something-${i}`);
                    }

                    assert.deepStrictEqual(loadedConsumers[0].consumer.getData(), [
                        'something-0',
                        'something-1'
                    ]);
                    loadedConsumers[0].consumer.reset();

                    return processDeclaration({
                        class: 'Telemetry'
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });
                    assert.lengthOf(loadedConsumers, 0);

                    return processDeclaration({
                        class: 'Telemetry',
                        defaultConsumer: dummies.declaration.consumer.default.decrypted({})
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 1,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 1);
                    const dcInstCtx = filterConsumerCtx(loadedConsumers[0]);
                    verifyComplexProps(dcInstCtx);
                    assert.deepStrictEqual(dcInstCtx.other, {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer',
                        id: 'f5telemetry_default::defaultConsumer',
                        metadata: null,
                        name: 'defaultConsumer',
                        type: 'default',
                        v2: false
                    });

                    dcInstCtx.complex.consumer('something');
                    assert.deepStrictEqual(dcInstCtx.complex.consumer.getData(), ['something']);
                    dcInstCtx.complex.consumer.reset();
                    assert.deepStrictEqual(dcInstCtx.complex.consumer.getData(), []);

                    assert.isAbove(dcInstCtx.complex.consumer.getTimestamp(), dcModuleTS);
                });
        });

        it('should process declaration (API v2 only)', () => {
            let splunkModuleTS = null;
            let splunkModuleCtx = null;
            let splunkConsumerCtx = null;

            return processDeclaration({
                class: 'Telemetry',
                splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 1,
                        modules: 1
                    });

                    assert.lengthOf(loadedConsumers, 1);
                    const dcInstCtx = filterConsumerCtx(loadedConsumers[0]);

                    verifyComplexProps(dcInstCtx);
                    assert.deepStrictEqual(dcInstCtx.other, {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::splunkConsumer1',
                        id: 'f5telemetry_default::splunkConsumer1',
                        metadata: null,
                        name: 'splunkConsumer1',
                        type: 'Splunk',
                        v2: true
                    });

                    const splunk = require('./consumers/Splunk');

                    assert.lengthOf(splunk.getInstances(), 1);
                    splunkModuleCtx = splunk.getInstances()[0];
                    splunkModuleTS = splunk.getTimestamp();

                    assert.deepStrictEqual(splunkModuleCtx.name, 'Splunk');
                    assert.isTrue(splunkModuleCtx.path.endsWith('consumers/Splunk'));
                    assert.isObject(splunkModuleCtx.logger);
                    assert.isFunction(splunkModuleCtx.logger.info);
                    assert.lengthOf(splunkModuleCtx.inst.consumerInstances, 1);
                    assert.lengthOf(splunkModuleCtx.inst.deletedInstances, 0);

                    splunkConsumerCtx = splunkModuleCtx.inst.consumerInstances[0];
                    dcInstCtx.complex.consumer('something');
                    assert.deepStrictEqual(splunkConsumerCtx.inst.dataCtxs, ['something']);
                    splunkConsumerCtx.inst.reset();

                    assert.lengthOf(tracerManager.registered(), 0);

                    return processDeclaration({
                        class: 'Telemetry',
                        splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                        splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                        splunkConsumer3: dummies.declaration.consumer.splunk.minimal.decrypted({
                            trace: true
                        }),
                        splunkConsumer4: dummies.declaration.consumer.splunk.minimal.decrypted({
                            enable: false
                        })
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 3);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 3,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 3);
                    assert.lengthOf(tracerManager.registered(), 1);

                    for (let i = 1; i < loadedConsumers.length + 1; i += 1) {
                        const dcInstCtx = filterConsumerCtx(loadedConsumers[i - 1]);
                        verifyComplexProps(dcInstCtx);
                        assert.deepStrictEqual(dcInstCtx.other, {
                            allowsPull: false,
                            allowsPush: true,
                            class: 'Telemetry_Consumer',
                            fullName: `f5telemetry_default::splunkConsumer${i}`,
                            id: `f5telemetry_default::splunkConsumer${i}`,
                            metadata: null,
                            name: `splunkConsumer${i}`,
                            type: 'Splunk',
                            v2: true
                        });
                        dcInstCtx.complex.consumer(`something-${i}`);
                    }

                    const splunk = require('./consumers/Splunk');

                    assert.lengthOf(splunk.getInstances(), 1);
                    assert.isTrue(splunk.getInstances()[0] === splunkModuleCtx);
                    assert.deepStrictEqual(splunk.getTimestamp(), splunkModuleTS);

                    assert.lengthOf(splunkModuleCtx.inst.consumerInstances, 3);
                    assert.lengthOf(splunkModuleCtx.inst.deletedInstances, 1);

                    assert.isFalse(splunkModuleCtx.inst.deletedInstances[0].isActive);
                    assert.isTrue(splunkModuleCtx.inst.deletedInstances[0] === splunkConsumerCtx.inst);

                    const reloadedConsumer = splunkModuleCtx.inst.consumerInstances.find(
                        (o) => o.inst.id === splunkConsumerCtx.inst.id
                    );
                    assert.isDefined(reloadedConsumer);
                    assert.isFalse(reloadedConsumer.inst === splunkConsumerCtx.inst);

                    assert.sameDeepMembers(
                        splunkModuleCtx.inst.consumerInstances.map((ci) => ci.inst.dataCtxs),
                        [
                            ['something-1'],
                            ['something-2'],
                            ['something-3']
                        ]
                    );
                    splunkModuleCtx.inst.consumerInstances.forEach((ci) => ci.inst.reset());

                    return processDeclaration({
                        class: 'Telemetry',
                        splunkConsumer3: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                        splunkConsumer4: dummies.declaration.consumer.splunk.minimal.decrypted({})
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 2);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 2,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 2);
                    assert.lengthOf(tracerManager.registered(), 0);

                    for (let i = 0; i < loadedConsumers.length; i += 1) {
                        const dcInstCtx = filterConsumerCtx(loadedConsumers[i]);
                        verifyComplexProps(dcInstCtx);
                        assert.deepStrictEqual(dcInstCtx.other, {
                            allowsPull: false,
                            allowsPush: true,
                            class: 'Telemetry_Consumer',
                            fullName: `f5telemetry_default::splunkConsumer${i + 3}`,
                            id: `f5telemetry_default::splunkConsumer${i + 3}`,
                            metadata: null,
                            name: `splunkConsumer${i + 3}`,
                            type: 'Splunk',
                            v2: true
                        });
                        dcInstCtx.complex.consumer(`something-${i}`);
                    }

                    const splunk = require('./consumers/Splunk');
                    assert.lengthOf(splunk.getInstances(), 1);
                    assert.isTrue(splunk.getInstances()[0] === splunkModuleCtx);
                    assert.deepStrictEqual(splunk.getTimestamp(), splunkModuleTS);

                    assert.lengthOf(splunkModuleCtx.inst.consumerInstances, 2);
                    assert.lengthOf(splunkModuleCtx.inst.deletedInstances, 4);

                    const rets = splunkModuleCtx.inst.deletedInstances.map((inst) => {
                        assert.isFalse(inst.isActive);
                        const reloadedConsumer = splunkModuleCtx.inst.consumerInstances.find(
                            (ci) => ci.inst.id === inst.id
                        );
                        if (reloadedConsumer) {
                            assert.isFalse(reloadedConsumer.inst === inst);
                            return true;
                        }
                        return false;
                    });
                    assert.sameDeepMembers(rets, [true, false, false, false], 'should reload 1 consumer');

                    assert.sameDeepMembers(
                        splunkModuleCtx.inst.consumerInstances.map((ci) => ci.inst.dataCtxs),
                        [
                            ['something-0'],
                            ['something-1']
                        ]
                    );

                    return processDeclaration({
                        class: 'Telemetry'
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });
                    assert.lengthOf(loadedConsumers, 0);

                    return processDeclaration({
                        class: 'Telemetry',
                        splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 1,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 1);

                    const dcInstCtx = filterConsumerCtx(loadedConsumers[0]);
                    verifyComplexProps(dcInstCtx);
                    assert.deepStrictEqual(dcInstCtx.other, {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::splunkConsumer',
                        id: 'f5telemetry_default::splunkConsumer',
                        metadata: null,
                        name: 'splunkConsumer',
                        type: 'Splunk',
                        v2: true
                    });

                    const splunk = require('./consumers/Splunk');

                    assert.lengthOf(splunk.getInstances(), 1);
                    assert.isFalse(splunkModuleCtx === splunk.getInstances()[0]);
                    splunkModuleCtx = splunk.getInstances()[0];

                    assert.deepStrictEqual(splunkModuleCtx.name, 'Splunk');
                    assert.isTrue(splunkModuleCtx.path.endsWith('consumers/Splunk'));
                    assert.isObject(splunkModuleCtx.logger);
                    assert.isFunction(splunkModuleCtx.logger.info);
                    assert.lengthOf(splunkModuleCtx.inst.consumerInstances, 1);
                    assert.lengthOf(splunkModuleCtx.inst.deletedInstances, 0);

                    splunkConsumerCtx = splunkModuleCtx.inst.consumerInstances[0];
                    dcInstCtx.complex.consumer('something');
                    assert.deepStrictEqual(splunkConsumerCtx.inst.dataCtxs, ['something']);

                    assert.isAbove(splunk.getTimestamp(), splunkModuleTS);
                });
        });

        it('should destroy instance and unsubscribe from events', () => processDeclaration({
            class: 'Telemetry',
            splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({})
        })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 1);
                assert.deepStrictEqual(consumers.numberOfModules, 1);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 1,
                    modules: 1
                });
                return consumers.destroy();
            })
            .then(() => {
                assert.deepStrictEqual(consumersStats, {
                    consumers: 0,
                    modules: 0
                });
                return Promise.all([
                    testUtils.sleep(50),
                    configWorker.processDeclaration({
                        class: 'Telemetry',
                        splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({})
                    })
                ]);
            })
            .then(() => {
                assert.deepStrictEqual(consumersStats, {
                    consumers: 0,
                    modules: 0
                });
            }));

        it('should load/unload consumers from affected namespace only', () => {
            const customNs1 = {};
            const customNs2 = {};
            const defaultNs = {};
            const namespace1 = 'NewNamespace';
            const namespace2 = 'NewNamespace-2';

            return processDeclaration({
                class: 'Telemetry',
                defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
                defaultConsumer2: dummies.declaration.consumer.default.decrypted({})
            })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 2);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 2,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 2);

                    loadedConsumers
                        .map(filterConsumerCtx)
                        .forEach((lc) => {
                            defaultNs[lc.other.id] = lc.complex.consumer;
                        });

                    assert.lengthOf(Object.keys(defaultNs), 2);

                    return processNamespaceDeclaration({
                        class: 'Telemetry_Namespace',
                        defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
                        defaultConsumer2: dummies.declaration.consumer.default.decrypted({}),
                        splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                        splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({})
                    }, namespace1);
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 6);
                    assert.deepStrictEqual(consumers.numberOfModules, 2);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 6,
                        modules: 2
                    });
                    assert.lengthOf(loadedConsumers, 6);

                    const defaultNs2 = {};
                    loadedConsumers
                        .map(filterConsumerCtx)
                        .forEach((lc) => {
                            (lc.other.id.includes(namespace1)
                                ? customNs1
                                : defaultNs2
                            )[lc.other.id] = lc.complex.consumer;
                        });

                    assert.lengthOf(Object.keys(defaultNs2), 2);
                    assert.lengthOf(Object.keys(customNs1), 4);

                    assert.sameDeepMembers(
                        Object.keys(defaultNs),
                        Object.keys(defaultNs2)
                    );
                    Object.keys(defaultNs)
                        .forEach((key) => {
                            assert.isTrue(defaultNs[key] === defaultNs2[key], 'should not reload consumers from default namespace');
                        });

                    return processNamespaceDeclaration({
                        class: 'Telemetry_Namespace',
                        defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
                        defaultConsumer2: dummies.declaration.consumer.default.decrypted({}),
                        splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                        splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({})
                    }, namespace2);
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 10);
                    assert.deepStrictEqual(consumers.numberOfModules, 2);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 10,
                        modules: 2
                    });
                    assert.lengthOf(loadedConsumers, 10);

                    const defaultNs2 = {};
                    const customNs12 = {};

                    loadedConsumers
                        .map(filterConsumerCtx)
                        .forEach((lc) => {
                            let s = defaultNs2;
                            if (lc.other.id.includes(namespace2)) {
                                s = customNs2;
                            } else if (lc.other.id.includes(namespace1)) {
                                s = customNs12;
                            }
                            s[lc.other.id] = lc.complex.consumer;
                        });

                    assert.lengthOf(Object.keys(defaultNs2), 2);
                    assert.lengthOf(Object.keys(customNs12), 4);
                    assert.lengthOf(Object.keys(customNs2), 4);

                    assert.sameDeepMembers(
                        Object.keys(defaultNs),
                        Object.keys(defaultNs2)
                    );
                    assert.sameDeepMembers(
                        Object.keys(customNs1),
                        Object.keys(customNs12)
                    );
                    Object.keys(defaultNs)
                        .forEach((key) => {
                            assert.isTrue(defaultNs[key] === defaultNs2[key], 'should not reload consumers from default namespace');
                        });
                    Object.keys(customNs1)
                        .forEach((key) => {
                            assert.isTrue(customNs1[key] === customNs12[key], 'should not reload consumers from namespace1');
                        });

                    return processNamespaceDeclaration({
                        class: 'Telemetry_Namespace'
                    }, namespace1);
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 6);
                    assert.deepStrictEqual(consumers.numberOfModules, 2);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 6,
                        modules: 2
                    });
                    assert.lengthOf(loadedConsumers, 6);

                    const defaultNs2 = {};
                    const customNs12 = {};
                    const customNs22 = {};

                    loadedConsumers
                        .map(filterConsumerCtx)
                        .forEach((lc) => {
                            let s = defaultNs2;
                            if (lc.other.id.includes(namespace2)) {
                                s = customNs22;
                            } else if (lc.other.id.includes(namespace1)) {
                                s = customNs12;
                            }
                            s[lc.other.id] = lc.complex.consumer;
                        });

                    assert.lengthOf(Object.keys(defaultNs2), 2);
                    assert.lengthOf(Object.keys(customNs12), 0);
                    assert.lengthOf(Object.keys(customNs22), 4);

                    assert.sameDeepMembers(
                        Object.keys(defaultNs),
                        Object.keys(defaultNs2)
                    );
                    assert.sameDeepMembers(
                        Object.keys(customNs2),
                        Object.keys(customNs22)
                    );
                    Object.keys(defaultNs)
                        .forEach((key) => {
                            assert.isTrue(defaultNs[key] === defaultNs2[key], 'should not reload consumers from default namespace');
                        });
                    Object.keys(customNs1)
                        .forEach((key) => {
                            assert.isTrue(customNs2[key] === customNs22[key], 'should not reload consumers from namespace2');
                        });

                    return processNamespaceDeclaration({
                        class: 'Telemetry_Namespace'
                    }, namespace2);
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 2);
                    assert.deepStrictEqual(consumers.numberOfModules, 1);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 2,
                        modules: 1
                    });
                    assert.lengthOf(loadedConsumers, 2);

                    const defaultNs2 = {};
                    const customNs12 = {};
                    const customNs22 = {};

                    loadedConsumers
                        .map(filterConsumerCtx)
                        .forEach((lc) => {
                            let s = defaultNs2;
                            if (lc.other.id.includes(namespace2)) {
                                s = customNs22;
                            } else if (lc.other.id.includes(namespace1)) {
                                s = customNs12;
                            }
                            s[lc.other.id] = lc.complex.consumer;
                        });

                    assert.lengthOf(Object.keys(defaultNs2), 2);
                    assert.lengthOf(Object.keys(customNs12), 0);
                    assert.lengthOf(Object.keys(customNs22), 0);

                    assert.sameDeepMembers(
                        Object.keys(defaultNs),
                        Object.keys(defaultNs2)
                    );
                    Object.keys(defaultNs)
                        .forEach((key) => {
                            assert.isTrue(defaultNs[key] === defaultNs2[key], 'should not reload consumers from default namespace');
                        });

                    return processDeclaration({
                        class: 'Telemetry'
                    });
                })
                .then(() => {
                    assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                    assert.deepStrictEqual(consumers.numberOfModules, 0);
                    assert.deepStrictEqual(consumersStats, {
                        consumers: 0,
                        modules: 0
                    });
                    assert.lengthOf(loadedConsumers, 0);
                });
        });

        it('should load pull consumers', () => processDeclaration({
            class: 'Telemetry',
            defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
            defaultConsumer2: dummies.declaration.pullConsumer.default.decrypted({
                systemPoller: 'poller'
            }),
            poller: dummies.declaration.systemPoller.minimal.decrypted({})
        })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 2);
                assert.deepStrictEqual(consumers.numberOfModules, 1);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 2,
                    modules: 1
                });

                assert.lengthOf(loadedConsumers, 2);
                const others = [];
                loadedConsumers.forEach((lc) => {
                    lc = filterConsumerCtx(lc);
                    verifyComplexProps(lc);
                    others.push(lc.other);
                });

                assert.sameDeepMembers(others, [
                    {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer1',
                        id: 'f5telemetry_default::defaultConsumer1',
                        metadata: null,
                        name: 'defaultConsumer1',
                        type: 'default',
                        v2: false
                    },
                    {
                        allowsPull: true,
                        allowsPush: false,
                        class: 'Telemetry_Pull_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer2',
                        id: 'f5telemetry_default::defaultConsumer2',
                        metadata: null,
                        name: 'defaultConsumer2',
                        type: 'default',
                        v2: false
                    }
                ]);

                return processDeclaration({
                    class: 'Telemetry',
                    defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
                    defaultConsumer2: dummies.declaration.pullConsumer.default.decrypted({
                        systemPoller: 'poller'
                    }),
                    poller: dummies.declaration.systemPoller.minimal.decrypted({}),
                    prometheus: dummies.declaration.pullConsumer.prometheus.decrypted({
                        systemPoller: 'poller'
                    })
                });
            })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 3);
                assert.deepStrictEqual(consumers.numberOfModules, 2);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 3,
                    modules: 2
                });

                assert.lengthOf(loadedConsumers, 3);
                const others = [];
                loadedConsumers.forEach((lc) => {
                    lc = filterConsumerCtx(lc);
                    verifyComplexProps(lc);
                    others.push(lc.other);
                });

                assert.sameDeepMembers(others, [
                    {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer1',
                        id: 'f5telemetry_default::defaultConsumer1',
                        metadata: null,
                        name: 'defaultConsumer1',
                        type: 'default',
                        v2: false
                    },
                    {
                        allowsPull: true,
                        allowsPush: false,
                        class: 'Telemetry_Pull_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer2',
                        id: 'f5telemetry_default::defaultConsumer2',
                        metadata: null,
                        name: 'defaultConsumer2',
                        type: 'default',
                        v2: false
                    },
                    {
                        allowsPull: true,
                        allowsPush: false,
                        class: 'Telemetry_Pull_Consumer',
                        fullName: 'f5telemetry_default::prometheus',
                        id: 'f5telemetry_default::prometheus',
                        metadata: null,
                        name: 'prometheus',
                        type: 'Prometheus',
                        v2: true
                    }
                ]);

                return processDeclaration({
                    class: 'Telemetry'
                });
            })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                assert.deepStrictEqual(consumers.numberOfModules, 0);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 0,
                    modules: 0
                });

                assert.lengthOf(loadedConsumers, 0);
            }));

        it('should process declaration (mixed)', () => processDeclaration({
            class: 'Telemetry',
            defaultConsumer1: dummies.declaration.consumer.default.decrypted({}),
            defaultConsumer2: dummies.declaration.consumer.default.decrypted({}),
            splunkConsumer1: dummies.declaration.consumer.splunk.minimal.decrypted({}),
            splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({})
        })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 4);
                assert.deepStrictEqual(consumers.numberOfModules, 2);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 4,
                    modules: 2
                });

                assert.lengthOf(loadedConsumers, 4);

                const others = [];
                loadedConsumers.forEach((lc) => {
                    lc = filterConsumerCtx(lc);
                    verifyComplexProps(lc);
                    others.push(lc.other);
                });

                assert.sameDeepMembers(others, [
                    {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::splunkConsumer1',
                        id: 'f5telemetry_default::splunkConsumer1',
                        metadata: null,
                        name: 'splunkConsumer1',
                        type: 'Splunk',
                        v2: true
                    },
                    {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::splunkConsumer2',
                        id: 'f5telemetry_default::splunkConsumer2',
                        metadata: null,
                        name: 'splunkConsumer2',
                        type: 'Splunk',
                        v2: true
                    },
                    {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer1',
                        id: 'f5telemetry_default::defaultConsumer1',
                        metadata: null,
                        name: 'defaultConsumer1',
                        type: 'default',
                        v2: false
                    },
                    {
                        allowsPull: false,
                        allowsPush: true,
                        class: 'Telemetry_Consumer',
                        fullName: 'f5telemetry_default::defaultConsumer2',
                        id: 'f5telemetry_default::defaultConsumer2',
                        metadata: null,
                        name: 'defaultConsumer2',
                        type: 'default',
                        v2: false
                    }
                ]);
                return processDeclaration({
                    class: 'Telemetry'
                });
            })
            .then(() => {
                assert.deepStrictEqual(consumers.numberOfConsumers, 0);
                assert.deepStrictEqual(consumers.numberOfModules, 0);
                assert.deepStrictEqual(consumersStats, {
                    consumers: 0,
                    modules: 0
                });
                assert.lengthOf(loadedConsumers, 0);
                assert.lengthOf(tracerManager.registered(), 0);
            }));
    });
});
