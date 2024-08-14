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

/* eslint-disable import/order, no-constant-condition, no-nested-ternary, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const helpers = require('./helpers');
const PollerMock = require('./pollerMock');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const DataPipeline = sourceCode('src/lib/dataPipeline');
const ResourceMonitor = sourceCode('src/lib/resourceMonitor');
const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');
const SystemPollerService = sourceCode('src/lib/systemPoller');
const SystemPoller = sourceCode('src/lib/systemPoller/poller');

moduleCache.remember();

describe('System Poller / System Poller Service', () => {
    const defaultInteval = 300;
    const remotehost = 'remotehost.remotedonmain';
    let appEvents;
    let configWorker;
    let coreStub;
    let dataPipeline;
    let declaration;
    let fakeClock;
    let pollerDestroytub;
    let pollerStartStub;
    let pollerStopStub;
    let reports;
    let requestSpies;
    let service;

    function createPollerMock(decl) {
        return new PollerMock(
            {
                connection: {
                    host: decl.system.host,
                    port: decl.system.port,
                    protocol: decl.system.protocol
                },
                credentials: {
                    username: decl.system.username,
                    password: decl.system.passphrase
                        ? decl.system.passphrase.cipherText
                        : undefined
                }
            }
        );
    }

    async function forwardClock(time, cb, repeat = 1, delay = 1) {
        if (!cb) {
            await fakeClock.clockForward(time, { repeat, promisify: true, delay });
            return;
        }

        while (true) {
            await fakeClock.clockForward(time, { repeat, promisify: true, delay });
            try {
                if (await cb()) {
                    break;
                }
            } catch (error) {
                // igonre
            }
        }
    }

    function getTimeStep() {
        let step = 1;
        if (declaration) {
            step = declaration.systemPoller.interval || defaultInteval;
        }
        return step * 100;
    }

    function processDeclaration(decl, namespace, wait = true, addConsumer = true) {
        if (addConsumer) {
            decl = Object.assign({}, decl, {
                consumer: dummies.declaration.consumer.default.decrypted({})
            });
        }

        let promise;
        if (namespace) {
            promise = configWorker.processNamespaceDeclaration(
                dummies.declaration.namespace.base.decrypted(decl),
                namespace
            );
        } else {
            promise = configWorker.processDeclaration(
                dummies.declaration.base.decrypted(decl)
            );
        }
        return Promise.all([
            wait ? appEvents.waitFor('systemPoller.config.applied') : Promise.resolve(),
            promise
        ]);
    }

    function verifyReport(report, options = {}) {
        const isCustom = !!declaration.systemPoller.endpointList;

        const metadata = report.data.telemetryServiceInfo;
        assert.isString(metadata.cycleEnd);
        assert.isString(metadata.cycleStart);
        assert.isNotEmpty(metadata.cycleEnd);
        assert.isNotEmpty(metadata.cycleStart);
        assert.deepStrictEqual(
            metadata.pollingInterval,
            typeof options !== 'undefined' && typeof options.interval !== 'undefined'
                ? options.interval
                : (typeof declaration.systemPoller.interval === 'undefined'
                    ? defaultInteval
                    : declaration.systemPoller.interval)
        );
        assert.deepStrictEqual(report.isCustom, isCustom);

        const expectedStats = helpers.getStatsReport(
            isCustom,
            !!(declaration.splunk && declaration.splunk.format === 'legacy')
        );

        Object.entries(expectedStats.stats).forEach(([key, value]) => {
            assert.deepStrictEqual(
                report.data[key],
                value,
                `should match expected data for "${key}"`
            );
        });
    }

    function verifyReports(data, options = {}) {
        if (typeof data !== 'undefined') {
            data.map((d) => verifyReport(d, options));
        } else {
            reports.map(verifyReport);
        }
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        declaration = null;
        fakeClock = null;
        requestSpies = testUtil.requestSpies();

        pollerDestroytub = sinon.stub(SystemPoller.prototype, 'destroy');
        pollerDestroytub.callThrough();
        pollerStartStub = sinon.stub(SystemPoller.prototype, 'start');
        pollerStartStub.callThrough();
        pollerStopStub = sinon.stub(SystemPoller.prototype, 'stop');
        pollerStopStub.callThrough();

        coreStub = stubs.default.coreStub();
        appEvents = coreStub.appEvents.appEvents;
        configWorker = coreStub.configWorker.configWorker;

        dataPipeline = new DataPipeline();
        dataPipeline.initialize(appEvents);

        service = new SystemPollerService();
        service.initialize(appEvents);

        assert.deepStrictEqual(service.numberOfClassicPollers, 0);
        assert.deepStrictEqual(service.numberOfDemoPollers, 0);
        assert.deepStrictEqual(service.numberOfPassivePollers, 0);

        await dataPipeline.start();
        await service.start();
        await coreStub.startServices();

        await Promise.all([
            appEvents.waitFor('systemPoller.config.applied'),
            coreStub.configWorker.configWorker.load()
        ]);

        assert.deepStrictEqual(service.numberOfClassicPollers, 0);
        assert.deepStrictEqual(service.numberOfDemoPollers, 0);
        assert.deepStrictEqual(service.numberOfPassivePollers, 0);
        assert.isEmpty(coreStub.logger.messages.error);

        coreStub.logger.removeAllMessages();

        reports = [];
        service.ee.on('report', (report) => reports.push(report));
    });

    afterEach(async () => {
        if (fakeClock) {
            await Promise.all([
                forwardClock(getTimeStep() * 100, () => service.isDestroyed()),
                service.destroy()
            ]);
        } else {
            await service.destroy();
        }
        await dataPipeline.destroy();
        await coreStub.destroyServices();

        assert.isTrue(service.isDestroyed());

        testUtil.nockCleanup();
        sinon.restore();

        verifyReports();

        if (declaration) {
            helpers.checkBigIpRequests(declaration, requestSpies);
        }
    });

    describe('Resource Monitor', () => {
        let resourceMonitor;

        beforeEach(async () => {
            resourceMonitor = new ResourceMonitor();
            resourceMonitor.initialize(appEvents);
            await resourceMonitor.start();
        });

        afterEach(async () => {
            await resourceMonitor.destroy();
        });

        it('should enable/disable system pollers according to processing state', async () => {
            declaration = helpers.attachPoller(
                helpers.systemPoller(),
                helpers.system()
            );
            declaration.namespace = dummies.declaration.namespace.base.decrypted(Object.assign(
                {
                    consumer: dummies.declaration.consumer.default.decrypted({})
                },
                helpers.attachPoller(
                    helpers.systemPoller(),
                    helpers.system()
                )
            ));

            createPollerMock(declaration);
            fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

            await processDeclaration(declaration);
            assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
            assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
            assert.deepStrictEqual(service.numberOfClassicPollers, 2, 'should have 2 CLASSIC poller');

            reports = [];
            await forwardClock(getTimeStep(), () => reports.length >= 2);

            reports = [];
            coreStub.resourceMonitorUtils.osAvailableMem.free = 10;

            await forwardClock(getTimeStep(), () => {
                assert.includeMatch(
                    coreStub.logger.messages.warning,
                    /Temporarily disabling system poller/
                );
                return true;
            });

            assert.isEmpty(reports);
            await fakeClock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 });
            assert.isEmpty(reports);

            coreStub.resourceMonitorUtils.osAvailableMem.free = 9999;
            await forwardClock(getTimeStep(), () => {
                assert.includeMatch(
                    coreStub.logger.messages.warning,
                    /Enabling system poller/
                );
                return true;
            });

            await forwardClock(getTimeStep(), () => reports.length >= 2);

            reports = [];
            coreStub.resourceMonitorUtils.osAvailableMem.free = 10;

            await forwardClock(getTimeStep(), () => {
                assert.includeMatch(
                    coreStub.logger.messages.warning,
                    /Temporarily disabling system poller/
                );
                return true;
            });

            assert.isEmpty(reports);
            await fakeClock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 });
            assert.isEmpty(reports);

            coreStub.resourceMonitorUtils.osAvailableMem.free = 9999;
            await forwardClock(getTimeStep(), () => {
                assert.includeMatch(
                    coreStub.logger.messages.warning,
                    /Enabling system poller/
                );
                return true;
            });

            await forwardClock(getTimeStep(), () => reports.length >= 2);
        });
    });

    it('should enable processing by default', () => {
        assert.isTrue(service.isProcessingEnabled());
    });

    it('should unsubscribe from config updates once destroyed', async () => {
        await processDeclaration(helpers.attachPoller(
            helpers.systemPoller(),
            helpers.system()
        ));
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
        assert.isEmpty(coreStub.logger.messages.error);
        assert.includeMatch(
            coreStub.logger.messages.all,
            /SystemPollerService.*Config "change" event/
        );

        await service.destroy();
        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');

        coreStub.logger.removeAllMessages();
        await processDeclaration({}, undefined, false);

        assert.notIncludeMatch(
            coreStub.logger.messages.all,
            /SystemPollerService.*Config "change" event/
        );

        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
    });

    it('should wait till config update complete before proceed with service destroying', async () => {
        const destroyPromise = new Promise((resolve) => {
            pollerStartStub.callsFake(() => {
                service.destroy().then(resolve);
            });
        });

        await processDeclaration(helpers.attachPoller(
            helpers.systemPoller(),
            helpers.system()
        ));

        await destroyPromise;
        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');

        assert.includeMatch(
            coreStub.logger.messages.debug,
            /Waiting for config routine to finish/
        );
    });

    it('should log error when unable to start poller', async () => {
        pollerStartStub.rejects(new Error('expected poller start error'));
        await processDeclaration(helpers.attachPoller(
            helpers.systemPoller(),
            helpers.system()
        ));
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
        assert.includeMatch(
            coreStub.logger.messages.error,
            /SystemPollerService.*Uncaught error on attempt to start.*systemPoller[\s\S]*expected poller start error/gm
        );
    });

    it('should log error when unable to destroy poller', async () => {
        let poller;
        pollerDestroytub.callsFake(function () {
            poller = this;
            throw new Error('expected poller destroy error');
        });
        await processDeclaration(helpers.attachPoller(
            helpers.systemPoller(),
            helpers.system()
        ));
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');

        await processDeclaration({});
        assert.includeMatch(
            coreStub.logger.messages.error,
            /SystemPollerService.*Uncaught error on attempt to destroy poller.*systemPoller[\s\S]*expected poller destroy error/gm
        );
        pollerDestroytub.restore();
        await poller.destroy();

        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
    });

    it('should log error when unable to destroy all pollers', async () => {
        const pollers = [];
        pollerDestroytub.callsFake(function () {
            pollers.push(this);
            throw new Error('expected poller destroy error');
        });

        const decl = helpers.attachPoller(
            helpers.systemPoller(),
            helpers.system()
        );
        decl.system2 = testUtil.deepCopy(decl.system);

        await processDeclaration(decl);
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 2, 'should have 2 CLASSIC pollers');

        await service.destroy();
        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');

        assert.includeMatch(
            coreStub.logger.messages.error,
            /SystemPollerService.*Uncaught error on attempt to destroy poller.*systemPoller[\s\S]*expected poller destroy error/gm
        );
        pollerDestroytub.restore();
        await Promise.all(pollers.map((p) => p.destroy()));
    });

    describe('configuration variations', () => {
        const combinations = testUtil.product(
            // endpoints
            [
                {
                    name: 'default',
                    value: false
                },
                {
                    name: 'custom',
                    value: true
                }
            ],
            // system auth
            testUtil.smokeTests.filter([
                {
                    name: 'system without user',
                    value: undefined
                },
                {
                    name: 'system with user and passphrase',
                    value: { username: true, passphrase: true }
                }
            ]),
            // system connection
            testUtil.smokeTests.filter([
                {
                    name: 'localhost system',
                    value: undefined
                },
                {
                    name: 'remote system with non default config',
                    value: {
                        host: remotehost,
                        allowSelfSignedCert: true,
                        port: 8889,
                        protocol: 'https'
                    }
                }
            ]),
            // namespace
            [
                {
                    name: 'default',
                    value: undefined
                },
                {
                    name: 'custom',
                    value: 'namespace'
                }
            ]
        );

        combinations.forEach(([endpointsConf, systemAuthConf, systemConf, namespaceConf]) => describe(`endpoints = ${endpointsConf.name}, system = ${systemConf.name}, systemAuth = ${systemAuthConf.name}, namespace = ${namespaceConf.name}`,
            () => {
                if (systemConf.value && systemConf.value.host === remotehost
                    && !(systemAuthConf.value && systemAuthConf.value.passphrase)
                ) {
                    // password-less users are not supported by remote device
                    return;
                }

                function getDeclaration(ival = 60, enable = true, trace = false) {
                    return helpers.getDeclaration({
                        enable,
                        endpoints: endpointsConf.value,
                        interval: ival,
                        systemAuthConf,
                        systemConf,
                        trace
                    });
                }

                testUtil.product(
                    // enable
                    [
                        {
                            name: 'enabled',
                            value: true
                        },
                        {
                            name: 'disabled',
                            value: false
                        }
                    ],
                    // trace
                    [
                        {
                            name: 'enabled',
                            value: true
                        },
                        {
                            name: 'disabled',
                            value: false
                        }
                    ]
                ).forEach(([enableConf, traceConf]) => it(`enable = ${enableConf.name}, trace = ${traceConf.name}`, async () => {
                    await processDeclaration(
                        getDeclaration(undefined, enableConf.value, traceConf.value),
                        namespaceConf.value
                    );
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, enableConf.value ? 1 : 0, 'should have expected number of CLASSIC pollers');
                    assert.isEmpty(coreStub.logger.messages.error);
                }));

                it('should process poller config', async () => {
                    await processDeclaration(getDeclaration(), namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.isEmpty(coreStub.logger.messages.error);
                });

                it('should not restart existing poller if no config changed', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getDeclaration();
                    declaration.consumer = dummies.declaration.consumer.default.decrypted();

                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const configID = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                    const dstIds = configWorker.currentConfig.mappings[configID];

                    assert.isNotEmpty(configID, 'should find ID');
                    assert.isNotEmpty(dstIds, 'should have receivers');

                    await forwardClock(getTimeStep(), () => reports.length > 2);

                    reports.forEach((report) => {
                        assert.deepStrictEqual(report.sourceId, configID);
                        assert.deepStrictEqual(report.destinationIds, dstIds);
                    });

                    coreStub.logger.removeAllMessages();

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*systemPoller/
                    );
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const newConfigID = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                    const newDstIds = configWorker.currentConfig.mappings[newConfigID];

                    assert.isNotEmpty(newConfigID, 'should find ID');
                    assert.isNotEmpty(newDstIds, 'should have receivers');
                    assert.notDeepEqual(newConfigID, configID, 'should generated new ID');
                    assert.notDeepEqual(dstIds, newDstIds, 'should update receivers');

                    const reportIdx = reports.length;
                    await forwardClock(getTimeStep(), () => reports.length > (reportIdx + 3));

                    reports.forEach((report, idx) => {
                        if (idx >= reportIdx) {
                            assert.deepStrictEqual(report.sourceId, newConfigID, 'should use new IDs');
                            assert.deepStrictEqual(report.destinationIds, newDstIds, 'should use new IDs');
                        }
                    });
                });

                it('should restart existing poller when config changed', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getDeclaration();
                    declaration.consumer = dummies.declaration.consumer.default.decrypted();

                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const configID = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                    const dstIds = configWorker.currentConfig.mappings[configID];

                    assert.isNotEmpty(configID, 'should find ID');
                    assert.isNotEmpty(dstIds, 'should have receivers');

                    await forwardClock(getTimeStep(), () => reports.length > 2);

                    reports.forEach((report) => {
                        assert.deepStrictEqual(report.sourceId, configID);
                        assert.deepStrictEqual(report.destinationIds, dstIds);
                    });

                    declaration.systemPoller.interval = 400;
                    coreStub.logger.removeAllMessages();

                    await processDeclaration(declaration, namespaceConf.value);
                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*Poller.*system::systemPoller.*destroyed/
                        );
                        return true;
                    });

                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*systemPoller.*Reason - configuration updated/
                    );
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*systemPoller/
                    );
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 1);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const newConfigID = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                    const newDstIds = configWorker.currentConfig.mappings[newConfigID];

                    assert.isNotEmpty(newConfigID, 'should find ID');
                    assert.isNotEmpty(newDstIds, 'should have receivers');
                    assert.notDeepEqual(newConfigID, configID, 'should generated new ID');
                    assert.notDeepEqual(dstIds, newDstIds, 'should update receivers');

                    reports = [];
                    await forwardClock(getTimeStep(), () => reports.length >= 2);

                    reports.forEach((report) => {
                        assert.deepStrictEqual(report.sourceId, newConfigID, 'should use new IDs');
                        assert.deepStrictEqual(report.destinationIds, newDstIds, 'should use new IDs');
                    });
                });

                it('should destroy poller when removed from the declaration', async () => {
                    coreStub.logger.removeAllMessages();
                    const decl = getDeclaration();

                    let declCopy = testUtil.deepCopy(decl);
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    declCopy = testUtil.deepCopy(decl);
                    declCopy.system2 = testUtil.deepCopy(decl.system);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 2, 'should have 2 CLASSIC pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*system::systemPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*system::systemPoller/
                    );

                    delete declCopy.system;
                    coreStub.logger.removeAllMessages();
                    await processDeclaration(testUtil.deepCopy(declCopy), namespaceConf.value);

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*system::systemPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*system2::systemPoller/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*Poller.*system::systemPoller.*destroyed/
                        );
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC pollers');
                        return true;
                    }, true);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 1);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    delete declCopy.system2;
                    delete declCopy.systemPoller;
                    coreStub.logger.removeAllMessages();
                    await processDeclaration(testUtil.deepCopy(declCopy), namespaceConf.value);
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*Poller.*system2::systemPoller.*destroyed/
                        );
                        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
                        return true;
                    }, true);

                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 2);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                });

                it('should destroy pollers when no consumers defined', async () => {
                    coreStub.logger.removeAllMessages();
                    const decl = getDeclaration();

                    let declCopy = testUtil.deepCopy(decl);
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.Poller.*system::systemPoller.*WAITING/
                        );
                        return true;
                    }, true);

                    declCopy = testUtil.deepCopy(decl);
                    declCopy.system2 = testUtil.deepCopy(decl.system);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 2, 'should have 2 CLASSIC pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*system::systemPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*system::systemPoller/
                    );

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.Poller.*system2::systemPoller.*WAITING/
                        );
                        return true;
                    }, true);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(testUtil.deepCopy(declCopy), namespaceConf.value, true, false);

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*system::systemPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*system2::systemPoller.*Reason - configuration updated/
                    );

                    await testUtil.waitTill(() => {
                        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
                        return true;
                    }, true);

                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have no CLASSIC pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 2);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                });

                it('should not restart existing poller if no config changed (new namespace created)', async () => {
                    const decl = getDeclaration();
                    await processDeclaration(decl, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.Poller.*::system::systemPoller.*WAITING/
                        );
                        return true;
                    }, true);

                    coreStub.logger.removeAllMessages();

                    await processDeclaration(decl, 'namesapce-new');
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 2, 'should have 2 CLASSIC pollers');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*::system::systemPoller/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.Poller.*namesapce-new::system::systemPoller.*WAITING/
                        );
                        return true;
                    }, true);

                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration({}, 'namesapce-new');

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*Poller.*namesapce-new::system::systemPoller.*destroyed/
                        );
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                        return true;
                    }, true);

                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*Removing System Poller.*namesapce-new::system::systemPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /SystemPollerService.*No configuration changes for.*system::systemPoller/
                    );
                });

                if (namespaceConf.value) {
                    it('should not restart existing poller if no config changed (root namespace updated)', async () => {
                        const decl = getDeclaration();
                        await processDeclaration(decl, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                        assert.deepStrictEqual(pollerStartStub.callCount, 1);
                        assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                        assert.deepStrictEqual(pollerStopStub.callCount, 0);

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                /SystemPollerService.Poller.*system::systemPoller.*WAITING/
                            );
                            return true;
                        }, true);

                        decl[namespaceConf.value] = dummies.declaration.namespace.base.decrypted(Object.assign(
                            {},
                            testUtil.deepCopy(decl),
                            { consumer: dummies.declaration.consumer.default.decrypted({}) }
                        ));

                        coreStub.logger.removeAllMessages();
                        await processDeclaration(decl);
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 2, 'should have 2 CLASSIC pollers');

                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*No configuration changes for.*namespace::system::systemPoller/
                        );
                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                /SystemPollerService.Poller.*f5telemetry_default::system::systemPoller.*WAITING/
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(pollerStartStub.callCount, 2);
                        assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                        assert.deepStrictEqual(pollerStopStub.callCount, 0);

                        delete decl.system;
                        delete decl.systemPoller;

                        coreStub.logger.removeAllMessages();
                        await processDeclaration(decl);

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                /SystemPollerService.Poller.*f5telemetry_default::system::systemPoller.*destroyed/
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*Removing System Poller.*f5telemetry_default::system::systemPoller.*Reason - configuration updated/
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /SystemPollerService.*No configuration changes for.*namespace::system::systemPoller/
                        );
                    });
                }

                it('should start and finish polling cycle multipe times', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getDeclaration();
                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.isEmpty(reports);

                    await forwardClock(getTimeStep(), () => reports.length > 2);
                    assert.isEmpty(coreStub.logger.messages.error);
                });

                if (systemAuthConf.value) {
                    it('should fail task when unable to decrypt config', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                        assert.deepStrictEqual(pollerStartStub.callCount, 1);
                        assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                        assert.deepStrictEqual(pollerStopStub.callCount, 0);
                        assert.isEmpty(reports);

                        coreStub.deviceUtil.decrypt.rejects(new Error('expected decrypt error'));

                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(
                                coreStub.logger.messages.error,
                                /System Poller cycle failed due task error[\s\S]*expected decrypt error/gm
                            );
                            return true;
                        });
                    });
                }

                if (!endpointsConf.value) {
                    it('should apply post-polling filtering', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        declaration.systemPoller.actions[0].locations.system.provisioning = {
                            asm: true
                        };

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC poller');
                        assert.deepStrictEqual(pollerStartStub.callCount, 1);
                        assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                        assert.deepStrictEqual(pollerStopStub.callCount, 0);
                        assert.isEmpty(reports);

                        await forwardClock(getTimeStep(), () => reports.length >= 1);

                        assert.deepStrictEqual(reports[0].data.system.provisioning, {
                            asm: {
                                level: 'nominal',
                                name: 'asm'
                            }
                        });

                        reports = [];
                    });
                }

                describe('passive polling', () => {
                    let passiveReports;
                    let pullService;

                    function collect(id) {
                        return new Promise((resolve, reject) => {
                            pullService.emit('systemPoller.collect', id, (error, stats) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    passiveReports.push(stats);
                                    resolve();
                                }
                            });
                        });
                    }

                    beforeEach(() => {
                        passiveReports = [];
                        pullService = new SafeEventEmitter();
                        appEvents.register(pullService, 'test', [
                            'systemPoller.collect'
                        ]);
                    });

                    it('should return error when not poller found', async () => {
                        await assert.isRejected(collect('unknownID'), /System Poller with ID "unknownID" not found/);
                    });

                    it('should collect stats using passive poller (0 interval)', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 0;

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have 0 CLASSIC poller');

                        const id = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                        await Promise.all([
                            collect(id),
                            forwardClock(100, () => passiveReports.length > 0)
                        ]);

                        verifyReports(passiveReports, { interval: 0 });
                        reports = [];
                    });

                    it('should collect stats using passive poller (300 interval)', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 300;

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 1, 'should have 1 CLASSIC pollers');

                        const id = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                        await Promise.all([
                            collect(id),
                            forwardClock(100, () => passiveReports.length > 0)
                        ]);

                        verifyReports(passiveReports, { interval: 0 });
                        reports = [];
                    });

                    it('should collect stats using passive poller (disabled)', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        declaration.systemPoller.enable = false;

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have 0 CLASSIC pollers');

                        const id = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                        await Promise.all([
                            collect(id),
                            forwardClock(100, () => passiveReports.length > 0)
                        ]);

                        verifyReports(passiveReports, { interval: 0 });
                        reports = [];
                    });

                    it('should throw error when unable to start poller', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 0;

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have 0 CLASSIC pollers');

                        const id = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;
                        pollerStartStub.rejects(new Error('expected start error'));

                        await assert.isRejected(collect(id), /expected start error/);
                    });

                    it('should throw error when unable to collect stats', async () => {
                        coreStub.logger.removeAllMessages();

                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 0;

                        const pollerMock = createPollerMock(declaration);
                        (endpointsConf.value
                            ? pollerMock.getCustomVirtualsStub()
                            : pollerMock.getSysReadyStub()
                        ).returns(false);

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        await processDeclaration(declaration, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfPassivePollers, 0, 'should have no PASSIVE pollers');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfClassicPollers, 0, 'should have 0 CLASSIC pollers');

                        const id = configWorker.currentConfig.components.find((c) => c.name === 'systemPoller').id;

                        let done = false;
                        await Promise.all([
                            (async () => {
                                await assert.isRejected(collect(id), /Poller.collectStats: unable to collect stats/);
                                done = true;
                            })(),
                            forwardClock(100, () => done)
                        ]);
                    });
                });
            }));
    });
});
