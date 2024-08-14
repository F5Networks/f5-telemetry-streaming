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

/* eslint-disable import/order, no-constant-condition, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const os = require('os');
const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const helpers = require('./helpers');
const PollerMock = require('./pollerMock');
const reportDiag = require('./reportDiagnostics.json');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const assertLib = sourceCode('src/lib/utils/assert');
const DataPipeline = sourceCode('src/lib/dataPipeline');
const IHealthService = sourceCode('src/lib/ihealth');
const IHealthPoller = sourceCode('src/lib/ihealth/poller');

moduleCache.remember();

describe('iHealth / iHealth Service', () => {
    const downloadFolder = os.tmpdir();
    const localhost = 'localhost';
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
                credentials: {
                    username: decl.ihealthPoller.username,
                    password: decl.ihealthPoller.passphrase.cipherText
                },
                downloadFolder: decl.ihealthPoller.downloadFolder
            },
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

    async function forwardClock(time, cb) {
        while (true) {
            await fakeClock.clockForward(time, { repeat: 1, promisify: true, delay: 1 });
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
            if (declaration.ihealthPoller.interval.frequency === 'monthly') {
                step = 48;
            }
            if (declaration.ihealthPoller.interval.frequency === 'weekly') {
                step = 24;
            }
        }
        return step * 60 * 60 * 1000;
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
            wait ? appEvents.waitFor('ihealth.config.applied') : Promise.resolve(),
            promise
        ]);
    }

    function verifyReport(report) {
        assert.deepStrictEqual(report.data.diagnostics, reportDiag, 'should match expected diagnostics');
        assertLib.string(report.data.system.hostname, 'hostname');
        assertLib.string(report.data.system.ihealthLink, 'ihealthLink');
        assertLib.string(report.data.system.qkviewNumber, 'qkviewNumber');
        assertLib.object(report.data.telemetryServiceInfo, 'telemetryServiceInfo');
        assertLib.string(report.data.telemetryServiceInfo.cycleStart, 'telemetryServiceInfo.cycleStart');
        assertLib.string(report.data.telemetryServiceInfo.cycleEnd, 'telemetryServiceInfo.cycleEnd');
        assert.deepStrictEqual(report.data.telemetryEventCategory, 'ihealthInfo');
        assert.deepStrictEqual(report.type, 'ihealthInfo');
    }

    function verifyReports() {
        reports.map(verifyReport);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        declaration = null;
        fakeClock = null;
        requestSpies = testUtil.requestSpies();

        pollerDestroytub = sinon.stub(IHealthPoller.prototype, 'destroy');
        pollerDestroytub.callThrough();
        pollerStartStub = sinon.stub(IHealthPoller.prototype, 'start');
        pollerStartStub.callThrough();
        pollerStopStub = sinon.stub(IHealthPoller.prototype, 'stop');
        pollerStopStub.callThrough();

        coreStub = stubs.default.coreStub();
        appEvents = coreStub.appEvents.appEvents;
        configWorker = coreStub.configWorker.configWorker;

        dataPipeline = new DataPipeline();
        dataPipeline.initialize(appEvents);

        service = new IHealthService();
        service.initialize(appEvents);

        assert.deepStrictEqual(service.numberOfDemoPollers, 0);
        assert.deepStrictEqual(service.numberOfPollers, 0);

        await dataPipeline.start();
        await service.start();
        await coreStub.startServices();

        await Promise.all([
            appEvents.waitFor('ihealth.config.applied'),
            coreStub.configWorker.configWorker.load()
        ]);

        assert.deepStrictEqual(service.numberOfDemoPollers, 0);
        assert.deepStrictEqual(service.numberOfPollers, 0);
        assert.isEmpty(coreStub.logger.messages.error);

        coreStub.logger.removeAllMessages();

        reports = [];
        service.ee.on('report', (report) => reports.push(report));

        await coreStub.utilMisc.fs.promise.mkdir(downloadFolder);
    });

    afterEach(async () => {
        if (fakeClock) {
            fakeClock.stub.restore();
        }
        await service.destroy();
        await dataPipeline.destroy();
        await coreStub.destroyServices();

        assert.isTrue(service.isDestroyed());

        testUtil.nockCleanup();
        sinon.restore();

        verifyReports();

        if (declaration) {
            helpers.checkBigIpRequests(declaration, requestSpies);
            helpers.checkIHealthRequests(declaration, requestSpies);
        }
    });

    it('should remove obsolete data from the storage if exists (no config)', async () => {
        coreStub.storage.restWorker.loadData = {
            ihealth: {
                obsoleteKey: 'something',
                obsoleteKey2: 'something'
            }
        };
        await Promise.all([
            appEvents.waitFor('ihealth.config.applied'),
            coreStub.restartServices()
        ]);
        await testUtil.waitTill(() => {
            assert.includeMatch(
                coreStub.logger.messages.debug,
                /Removed obsolete data from the iHealth storage/
            );
            return true;
        }, true);

        assert.deepStrictEqual(coreStub.storage.restWorker.savedData.ihealth, {}, 'should remove obsolete keys');
        assert.includeMatch(
            coreStub.logger.messages.debug,
            /Removing obsolete data from the iHealth storage/
        );
    });

    it('should unsubscribe from config updates once destroyed', async () => {
        await processDeclaration(helpers.attachPoller(
            helpers.ihealthPoller({ downloadFolder }),
            helpers.system()
        ));
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
        assert.isEmpty(coreStub.logger.messages.error);
        assert.includeMatch(
            coreStub.logger.messages.all,
            /IHealthService.*Config "change" event/
        );

        await service.destroy();
        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 0, 'should have no active poller');

        coreStub.logger.removeAllMessages();
        await processDeclaration({}, undefined, false);

        assert.notIncludeMatch(
            coreStub.logger.messages.all,
            /IHealthService.*Config "change" event/
        );

        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 0, 'should have no active poller');
    });

    it('should wait till config update complete before proceed with service destroying', async () => {
        const destroyPromise = new Promise((resolve) => {
            pollerStartStub.callsFake(() => {
                service.destroy().then(resolve);
            });
        });

        await processDeclaration(helpers.attachPoller(
            helpers.ihealthPoller({ downloadFolder }),
            helpers.system()
        ));

        await destroyPromise;
        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 0, 'should have no active poller');

        assert.includeMatch(
            coreStub.logger.messages.debug,
            /Waiting for config routine to finish/
        );
    });

    it('should log error when unable to start poller', async () => {
        pollerStartStub.rejects(new Error('expected poller start error'));
        await processDeclaration(helpers.attachPoller(
            helpers.ihealthPoller({ downloadFolder }),
            helpers.system()
        ));
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 0, 'should have 0 active pollers');
        assert.includeMatch(
            coreStub.logger.messages.error,
            /IHealthService.*Uncaught error on attempt to start.*ihealthPoller[\s\S]*expected poller start error/gm
        );
    });

    it('should log error when unable to destroy poller', async () => {
        let poller;
        pollerDestroytub.callsFake(function () {
            poller = this;
            throw new Error('expected poller destroy error');
        });
        await processDeclaration(helpers.attachPoller(
            helpers.ihealthPoller({ downloadFolder }),
            helpers.system()
        ));
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');

        await processDeclaration({});
        assert.includeMatch(
            coreStub.logger.messages.error,
            /IHealthService.*Uncaught error on attempt to destroy poller.*ihealthPoller[\s\S]*expected poller destroy error/gm
        );
        pollerDestroytub.restore();
        await poller.destroy();

        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 0, 'should have 0 active pollers');
    });

    it('should log error when unable to destroy all pollers', async () => {
        const pollers = [];
        pollerDestroytub.callsFake(function () {
            pollers.push(this);
            throw new Error('expected poller destroy error');
        });

        const decl = helpers.attachPoller(
            helpers.ihealthPoller({ downloadFolder }),
            helpers.system()
        );
        decl.system2 = testUtil.deepCopy(decl.system);

        await processDeclaration(decl);
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 2, 'should have 2 active pollers');

        await service.destroy();
        assert.isTrue(service.isDestroyed());
        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
        assert.deepStrictEqual(service.numberOfPollers, 0, 'should have 0 active pollers');

        assert.includeMatch(
            coreStub.logger.messages.error,
            /IHealthService.*Uncaught error on attempt to destroy poller.*ihealthPoller[\s\S]*expected poller destroy error/gm
        );
        pollerDestroytub.restore();
        await Promise.all(pollers.map((p) => p.destroy()));
    });

    describe('configuration variations', () => {
        const combinations = testUtil.product(
            // interval
            testUtil.smokeTests.filter([
                {
                    name: 'daily',
                    value: { frequency: 'daily' }
                },
                {
                    name: 'weekly (day number)',
                    value: { frequency: 'weekly', dayNo: true }
                },
                {
                    name: 'weekly (day name)',
                    value: { frequency: 'weekly', dayStr: true }
                },
                {
                    name: 'monthly',
                    value: { frequency: 'monthly' }
                }
            ]),
            // proxy
            testUtil.smokeTests.filter([
                {
                    name: 'no proxy',
                    value: undefined
                },
                testUtil.smokeTests.ignore({
                    name: 'minimal and no auth',
                    value: { full: false }
                }),
                testUtil.smokeTests.ignore({
                    name: 'minimal and user only',
                    value: { full: false, userOnly: true }
                }),
                testUtil.smokeTests.ignore({
                    name: 'minimal and user and pass',
                    value: { full: false, auth: true }
                }),
                testUtil.smokeTests.ignore({
                    name: 'all props no auth',
                    value: { full: true }
                }),
                testUtil.smokeTests.ignore({
                    name: 'all props and user only',
                    value: { full: true, userOnly: true }
                }),
                {
                    name: 'all props and user and pass',
                    value: { full: true, auth: true }
                }
            ]),
            // system auth
            testUtil.smokeTests.filter([
                {
                    name: 'system without user',
                    value: undefined
                },
                testUtil.smokeTests.ignore({
                    name: 'system with user',
                    value: { username: true }
                }),
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
                testUtil.smokeTests.ignore({
                    name: 'localhost system (explicit)',
                    value: {
                        host: localhost
                    }
                }),
                testUtil.smokeTests.ignore({
                    name: 'localhost system with non default config',
                    value: {
                        allowSelfSignedCert: true,
                        port: 8888,
                        protocol: 'https'
                    }
                }),
                testUtil.smokeTests.ignore({
                    name: 'remote system',
                    value: {
                        host: remotehost
                    }
                }),
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

        combinations.forEach(([intervalConf, proxyConf, systemAuthConf, systemConf, namespaceConf]) => describe(`interval = ${intervalConf.name}, proxy = ${proxyConf.name}, system = ${systemConf.name}, systemAuth = ${systemAuthConf.name}, namespace = ${namespaceConf.name}`,
            () => {
                if (systemConf.value && systemConf.value.host === remotehost
                    && !(systemAuthConf.value && systemAuthConf.value.passphrase)
                ) {
                    return;
                }

                function getDeclaration(enable = true, trace = false) {
                    return helpers.getDeclaration({
                        downloadFolder,
                        enable,
                        intervalConf,
                        proxyConf,
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
                    await processDeclaration(getDeclaration(enableConf.value, traceConf.value), namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, enableConf.value ? 1 : 0, 'should have expected number of active pollers');
                    assert.isEmpty(coreStub.logger.messages.error);
                }));

                it('should process poller config', async () => {
                    await processDeclaration(getDeclaration(), namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.isEmpty(coreStub.logger.messages.error);
                });

                it('should not restart existing poller if no config changed', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getDeclaration();
                    declaration.consumer = dummies.declaration.consumer.default.decrypted();

                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const configID = configWorker.currentConfig.components.find((c) => c.iHealth).id;
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
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*ihealthPoller/
                    );
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const newConfigID = configWorker.currentConfig.components.find((c) => c.iHealth).id;
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
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const configID = configWorker.currentConfig.components.find((c) => c.iHealth).id;
                    const dstIds = configWorker.currentConfig.mappings[configID];

                    assert.isNotEmpty(configID, 'should find ID');
                    assert.isNotEmpty(dstIds, 'should have receivers');

                    await forwardClock(getTimeStep(), () => reports.length > 2);

                    reports.forEach((report) => {
                        assert.deepStrictEqual(report.sourceId, configID);
                        assert.deepStrictEqual(report.destinationIds, dstIds);
                    });

                    // at this step we should have some data in the storage
                    const hashes = Object.keys(coreStub.storage.restWorker.savedData.ihealth);

                    if (declaration.ihealthPoller.interval.frequency === 'daily') {
                        declaration.ihealthPoller.interval.frequency = 'weekly';
                        declaration.ihealthPoller.interval.day = 0;
                    } else {
                        declaration.ihealthPoller.interval.frequency = 'daily';
                        delete declaration.ihealthPoller.interval.day;
                    }

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(declaration, namespaceConf.value);
                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /IHealthService.*Poller.*system::ihealthPoller.*destroyed/
                        );
                        return true;
                    });

                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*ihealthPoller.*Reason - configuration updated/
                    );
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*ihealthPoller/
                    );
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 1);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    const newConfigID = configWorker.currentConfig.components.find((c) => c.iHealth).id;
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

                    assert.isFalse(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth).some((h) => hashes.includes(h)),
                        'should use different hash as the storage key'
                    );
                });

                it('should destroy poller when removed from the declaration', async () => {
                    coreStub.logger.removeAllMessages();
                    const decl = getDeclaration();

                    let declCopy = testUtil.deepCopy(decl);
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*system::.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    // at this step we should have some data in the storage
                    const firstPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)[0];
                    assert.isString(firstPolerHash);

                    declCopy = testUtil.deepCopy(decl);
                    declCopy.system2 = testUtil.deepCopy(decl.system);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 2, 'should have 2 active pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*system::ihealthPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*system::ihealthPoller/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*system2::.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    // at this step we should have some data in the storage
                    const secondPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)
                        .find((h) => firstPolerHash !== h);
                    assert.isString(secondPolerHash);

                    delete declCopy.system;

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(testUtil.deepCopy(declCopy), namespaceConf.value);

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*system::ihealthPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*system2::ihealthPoller/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Removed obsolete data from the iHealth storage/
                        );
                        return true;
                    }, true);

                    assert.include(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        secondPolerHash
                    );
                    assert.notInclude(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        firstPolerHash
                    );

                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 1);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    delete declCopy.system2;

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(testUtil.deepCopy(declCopy), namespaceConf.value);
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /IHealthService.*Poller.*system2::ihealthPoller.*destroyed/
                        );
                        return true;
                    }, true);

                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 0, 'should have 0 active pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 2);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Removed obsolete data from the iHealth storage/
                        );
                        return true;
                    }, true);

                    assert.isEmpty(coreStub.storage.restWorker.savedData.ihealth);
                });

                it('should destroy poller when no consumers defined', async () => {
                    coreStub.logger.removeAllMessages();
                    const decl = getDeclaration();

                    let declCopy = testUtil.deepCopy(decl);
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*system::.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    // at this step we should have some data in the storage
                    const firstPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)[0];
                    assert.isString(firstPolerHash);

                    declCopy = testUtil.deepCopy(decl);
                    declCopy.system2 = testUtil.deepCopy(decl.system);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(declCopy, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 2, 'should have 2 active pollers');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*system::ihealthPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*system::ihealthPoller/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*system2::.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    // at this step we should have some data in the storage
                    const secondPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)
                        .find((h) => firstPolerHash !== h);
                    assert.isString(secondPolerHash);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(testUtil.deepCopy(declCopy), namespaceConf.value, true, false);

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*system::ihealthPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*system2::ihealthPoller.*Reason - configuration updated/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Removed obsolete data from the iHealth storage/
                        );
                        return true;
                    }, true);

                    assert.notInclude(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        secondPolerHash
                    );
                    assert.notInclude(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        firstPolerHash
                    );

                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 0, 'should have 0 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 2);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.isEmpty(coreStub.storage.restWorker.savedData.ihealth);
                });

                it('should not restart existing poller if no config changed (new namespace created)', async () => {
                    const decl = getDeclaration();
                    await processDeclaration(decl, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*system::.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    // at this step we should have some data in the storage
                    const firstPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)[0];

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(decl, 'namesapce-new');
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 2, 'should have 2 active pollers');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*ihealthPoller/
                    );
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*namesapce-new::system::ihealthPoller.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    assert.deepStrictEqual(pollerStartStub.callCount, 2);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    // at this step we should have some data in the storage
                    const secondPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)
                        .find((h) => firstPolerHash !== h);
                    assert.isString(secondPolerHash);

                    coreStub.logger.removeAllMessages();
                    await processDeclaration({}, 'namesapce-new');
                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Removed obsolete data from the iHealth storage/
                        );
                        return true;
                    }, true);

                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*namesapce-new::system::ihealthPoller.*Reason - configuration updated/
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*No configuration changes for.*system::ihealthPoller/
                    );

                    assert.include(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        firstPolerHash
                    );
                    assert.notInclude(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        secondPolerHash
                    );
                });

                if (namespaceConf.value) {
                    it('should not restart existing poller if no config changed (root namespace updated)', async () => {
                        const decl = getDeclaration();
                        await processDeclaration(decl, namespaceConf.value);
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                        assert.deepStrictEqual(pollerStartStub.callCount, 1);
                        assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                        assert.deepStrictEqual(pollerStopStub.callCount, 0);

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.verbose,
                                /IHealthService.Poller.*system::.*Poller.*Going to sleep for/
                            );
                            return true;
                        }, true);

                        // at this step we should have some data in the storage
                        const firstPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)[0];

                        decl[namespaceConf.value] = dummies.declaration.namespace.base.decrypted(Object.assign(
                            {},
                            testUtil.deepCopy(decl),
                            { consumer: dummies.declaration.consumer.default.decrypted({}) }
                        ));

                        coreStub.logger.removeAllMessages();
                        await processDeclaration(decl);
                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfPollers, 2, 'should have 2 active pollers');

                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /IHealthService.*No configuration changes for.*namespace::system::ihealthPoller/
                        );
                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.verbose,
                                /IHealthService.Poller.*f5telemetry_default::system::ihealthPoller.*Poller.*Going to sleep for/
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(pollerStartStub.callCount, 2);
                        assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                        assert.deepStrictEqual(pollerStopStub.callCount, 0);

                        // at this step we should have some data in the storage
                        const secondPolerHash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)
                            .find((h) => firstPolerHash !== h);
                        assert.isString(secondPolerHash);

                        delete decl.system;

                        coreStub.logger.removeAllMessages();
                        await processDeclaration(decl);
                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                /Removed obsolete data from the iHealth storage/
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /IHealthService.*Removing iHealth Poller.*f5telemetry_default::system::ihealthPoller.*Reason - configuration updated/
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /IHealthService.*No configuration changes for.*namespace::system::ihealthPoller/
                        );

                        assert.include(
                            Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                            firstPolerHash
                        );
                        assert.notInclude(
                            Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                            secondPolerHash
                        );
                    });
                }

                it('should schedule execution date correctly', async () => {
                    await processDeclaration(getDeclaration(), namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.verbose,
                            /IHealthService.Poller.*system::.*Poller.*Going to sleep for/
                        );
                        return true;
                    }, true);

                    // at this step we should have some data in the storage
                    const hash = Object.keys(coreStub.storage.restWorker.savedData.ihealth)[0];
                    const execDate = coreStub.storage.restWorker.savedData.ihealth[hash].state.execDate;

                    const tw = helpers.getNextExecWindow(intervalConf.value.frequency);
                    assert.isAtLeast(execDate, tw[0].getTime() - 600 * 1000, `exec date ${new Date(execDate)} should be >= ${tw[0]}`);
                    assert.isAtMost(execDate, tw[1].getTime() + 600 * 1000, `exec date ${new Date(execDate)} should be <= ${tw[1]}`);
                });

                it('should start and finish polling cycle multipe times', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getDeclaration();
                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.isEmpty(reports);

                    const decryptCC = coreStub.deviceUtil.decrypt.callCount;

                    await forwardClock(getTimeStep(), () => reports.length > 2);

                    assert.isEmpty(coreStub.logger.messages.error);
                    const storage = Object.values(coreStub.storage.restWorker.savedData.ihealth);

                    assert.lengthOf(storage, 1);

                    const pollerState = storage[0];
                    assert.deepStrictEqual(pollerState.version, '3.0');
                    assert.isAbove(pollerState.history.length, 2);

                    assert.isAtLeast(pollerState.stats.cycles, pollerState.history.length + 1);
                    assert.isAtLeast(pollerState.stats.cyclesCompleted, pollerState.history.length);
                    assert.isAtLeast(pollerState.stats.qkviewsCollected, pollerState.history.length);
                    assert.isAtLeast(pollerState.stats.qkviewsUploaded, pollerState.history.length);
                    assert.isAtLeast(pollerState.stats.reportsCollected, pollerState.history.length);
                    assert.isAtLeast(pollerState.stats.qkviewCollectRetries, 0);
                    assert.isAtLeast(pollerState.stats.qkviewUploadRetries, 0);
                    assert.isAtLeast(pollerState.stats.reportCollectRetries, 0);

                    // also it should decrypt config multiple times
                    assert.isAbove(
                        coreStub.deviceUtil.decrypt.callCount,
                        decryptCC,
                        'should decrypt config multiple times'
                    );
                });

                it('should fail task when unable to decrypt config', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getDeclaration();
                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await processDeclaration(declaration, namespaceConf.value);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, 1, 'should have 1 active poller');
                    assert.deepStrictEqual(pollerStartStub.callCount, 1);
                    assert.deepStrictEqual(pollerDestroytub.callCount, 0);
                    assert.deepStrictEqual(pollerStopStub.callCount, 0);
                    assert.isEmpty(reports);

                    coreStub.deviceUtil.decrypt.rejects(new Error('expected decrypt error'));

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(
                            coreStub.logger.messages.error,
                            /iHealth Poller cycle failed due task error[\s\S]*expected decrypt error/gm
                        );
                        return true;
                    });
                });
            }));
    });
});
