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

/* eslint-disable import/order, no-constant-condition, no-continue, no-restricted-syntax, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const os = require('os');
const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const helpers = require('./helpers');
const PollerMock = require('./pollerMock');
const reportDiag = require('./reportDiagnostics.json');
const restAPIUtils = require('../restAPI/utils');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const assertLib = sourceCode('src/lib/utils/assert');
const DataPipeline = sourceCode('src/lib/dataPipeline');
const IHealthService = sourceCode('src/lib/ihealth');
const IHealthPoller = sourceCode('src/lib/ihealth/poller');
const RESTAPIService = sourceCode('src/lib/restAPI');
const RestWorker = sourceCode('src/nodejs/restWorker');

moduleCache.remember();

describe('iHealth / iHealth DEMO Service', () => {
    const downloadFolder = os.tmpdir();
    const ihURI = '/ihealthpoller';
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
    let restAPI;
    let restWorker;
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
        return 60 * 1000;
    }

    function processDeclaration(decl, namespace) {
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
            appEvents.waitFor('ihealth.config.applied'),
            appEvents.waitFor('restapi.config.applied'),
            promise
        ]);
    }

    function sendRequest() {
        return restAPIUtils.waitRequestComplete(
            restWorker,
            restAPIUtils.buildRequest.apply(restAPIUtils, arguments)
        );
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

        restAPI = new RESTAPIService(restAPIUtils.TELEMETRY_URI_PREFIX);
        restWorker = new RestWorker();
        restAPI.initialize(appEvents);
        restWorker.initialize(appEvents);

        dataPipeline = new DataPipeline();
        dataPipeline.initialize(appEvents);

        service = new IHealthService();
        service.initialize(appEvents);

        assert.deepStrictEqual(service.numberOfDemoPollers, 0);
        assert.deepStrictEqual(service.numberOfPollers, 0);

        await dataPipeline.start();
        assert.isTrue(dataPipeline.isRunning());

        await service.start();
        assert.isTrue(service.isRunning());

        await restAPI.start();
        assert.isTrue(restAPI.isRunning());

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
        await dataPipeline.destroy();
        await restAPI.destroy();
        await service.destroy();
        await coreStub.destroyServices();

        assert.isTrue(restAPI.isDestroyed());
        assert.isTrue(service.isDestroyed());

        testUtil.nockCleanup();
        sinon.restore();

        verifyReports();

        if (declaration) {
            helpers.checkBigIpRequests(declaration, requestSpies);
            helpers.checkIHealthRequests(declaration, requestSpies);
        }
    });

    it('should destroy demo pollers on service destroy', async () => {
        declaration = helpers.getDeclaration({
            downloadFolder,
            enable: true,
            intervalConf: { frequency: 'daily' },
            trace: false
        });
        const mainDeclaration = Object.assign({
            controls: dummies.declaration.controls.full.decrypted({ debug: true })
        }, declaration);

        await processDeclaration(mainDeclaration);

        const restOp = await sendRequest({ method: 'POST', path: `${ihURI}/system` });
        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

        await service.destroy();

        assert.includeMatch(
            coreStub.logger.messages.debug,
            /Poller "DEMO_f5telemetry_default::system::ihealthPoller" destroyed/gm
        );

        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO poller');
    });

    it('should remove inactive demo pollers', async () => {
        declaration = helpers.getDeclaration({
            downloadFolder,
            enable: true,
            intervalConf: { frequency: 'daily' },
            trace: false
        });

        await service.destroy();

        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
        await Promise.all([
            (async () => {
                await service.start();
            })(),
            forwardClock(getTimeStep(), () => service.isRunning())
        ]);

        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO poller');

        const mainDeclaration = Object.assign({
            controls: dummies.declaration.controls.full.decrypted({ debug: true })
        }, declaration);

        let done = false;
        await Promise.all([
            (async () => {
                await processDeclaration(mainDeclaration);
                done = true;
            })(),
            forwardClock(getTimeStep(), () => done)
        ]);

        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO poller');

        createPollerMock(declaration);

        done = false;
        await Promise.all([
            (async () => {
                const restOp = await sendRequest({ method: 'POST', path: `${ihURI}/system` });
                assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                done = true;
            })(),
            forwardClock(getTimeStep(), () => done)
        ]);

        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller');

        done = false;
        await Promise.all([
            (async () => {
                let restOp;
                while (!done) {
                    await testUtil.sleep(120 * 1000);
                    restOp = await sendRequest({ method: 'GET', path: `${ihURI}/system?demo=true` });
                    assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                    done = restOp.body.states[0].terminated;
                }
                assert.deepStrictEqual(restOp.body.states[0].state.state.lastKnownState, 'DONE');
            })(),
            forwardClock(getTimeStep(), () => done)
        ]);

        assert.includeMatch(
            coreStub.logger.messages.debug,
            /DEMO_Poller.*Poller.*Terminating DEMO poller/
        );

        coreStub.logger.removeAllMessages();

        done = false;
        await forwardClock(getTimeStep(), () => {
            assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have 0 DEMO poller');
            assert.includeMatch(
                coreStub.logger.messages.debug,
                /Removing DEMO iHealth Poller "DEMO_f5telemetry_default::system::ihealthPoller"/
            );
            return true;
        });
    });

    it('should be a debug endpoint only', async () => {
        const mainDeclaration = Object.assign({
            controls: dummies.declaration.controls.full.decrypted({ debug: false }),
            namespace: dummies.declaration.namespace.base.decrypted(helpers.getDeclaration({
                downloadFolder,
                enable: true,
                intervalConf: { frequency: 'daily' },
                trace: false
            }))
        }, helpers.getDeclaration({
            downloadFolder,
            enable: true,
            intervalConf: { frequency: 'daily' },
            trace: false
        }));

        await processDeclaration(mainDeclaration);

        const requests = [
            {
                methods: ['DELETE', 'GET'], uri: ihURI
            },
            {
                methods: ['DELETE', 'GET'], uri: `/namespace/namespace${ihURI}`
            },
            {
                methods: ['DELETE', 'GET', 'POST'], uri: `${ihURI}/system`
            },
            {
                methods: ['DELETE', 'GET', 'POST'], uri: `/namespace/namespace${ihURI}/system`
            }
        ];

        for (const req of requests) {
            for (const method of req.methods) {
                const restOp = await sendRequest({ method, path: req.uri });
                assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND, `${method} ${req.uri}`);
                assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON, `${method} ${req.uri}`);
                assert.deepStrictEqual(restOp.body, {
                    code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                    error: `Bad URL: /mgmt/shared/telemetry${req.uri}`,
                    message: 'Not Found'
                }, `${method} ${req.uri}`);
            }
        }

        mainDeclaration.controls.debug = true;
        await processDeclaration(mainDeclaration);

        for (const req of requests) {
            for (const method of req.methods) {
                const restOp = await sendRequest({ method, path: req.uri });
                assert.notDeepEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND, `${method} ${req.uri}`);
                assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON, `${method} ${req.uri}`);
                assert.notDeepEqual(restOp.body, {
                    code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                    error: `Bad URL: /mgmt/shared/telemetry${req.uri}`,
                    message: 'Not Found'
                }, `${method} ${req.uri}`);
            }
        }
    });

    it('should not listen for requests when service destroyed', async () => {
        const mainDeclaration = Object.assign({
            controls: dummies.declaration.controls.full.decrypted({ debug: true }),
            namespace: dummies.declaration.namespace.base.decrypted(helpers.getDeclaration({
                downloadFolder,
                enable: true,
                intervalConf: { frequency: 'daily' },
                trace: false
            }))
        }, helpers.getDeclaration({
            downloadFolder,
            enable: true,
            intervalConf: { frequency: 'daily' },
            trace: false
        }));

        await processDeclaration(mainDeclaration);

        const requests = [
            {
                methods: ['GET', 'DELETE'], uri: ihURI
            },
            {
                methods: ['GET', 'DELETE'], uri: `/namespace/namespace${ihURI}`
            },
            {
                methods: ['GET', 'POST', 'DELETE'], uri: `${ihURI}/system`
            },
            {
                methods: ['GET', 'POST', 'DELETE'], uri: `/namespace/namespace${ihURI}/system`
            }
        ];

        for (const req of requests) {
            for (const method of req.methods) {
                const restOp = await sendRequest({ method, path: req.uri });
                assert.oneOf(restOp.statusCode, [restAPIUtils.HTTP_CODES.OK, restAPIUtils.HTTP_CODES.CREATED], `${method} ${req.uri}`);
                assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON, `${method} ${req.uri}`);
            }
        }

        await service.destroy();

        for (const req of requests) {
            for (const method of req.methods) {
                const restOp = await sendRequest({ method, path: req.uri });
                assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND, `${method} ${req.uri}`);
                assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON, `${method} ${req.uri}`);
                assert.deepStrictEqual(restOp.body, {
                    code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                    error: `Bad URL: /mgmt/shared/telemetry${req.uri}`,
                    message: 'Not Found'
                }, `${method} ${req.uri}`);
            }
        }
    });

    describe('configuration variations', () => {
        const combinations = testUtil.product(
            // interval
            testUtil.smokeTests.filter([
                {
                    name: 'daily',
                    value: { frequency: 'daily' }
                },
                testUtil.smokeTests.ignore({
                    name: 'weekly (day number)',
                    value: { frequency: 'weekly', dayNo: true }
                }),
                testUtil.smokeTests.ignore({
                    name: 'weekly (day name)',
                    value: { frequency: 'weekly', dayStr: true }
                }),
                testUtil.smokeTests.ignore({
                    name: 'monthly',
                    value: { frequency: 'monthly' }
                })
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
                testUtil.smokeTests.ignore({
                    name: 'all props and user and pass',
                    value: { full: true, auth: true }
                })
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
            ],
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
            ]
        );

        combinations.forEach(([intervalConf, proxyConf, systemAuthConf, systemConf, namespaceConf, enableConf]) => describe(`interval = ${intervalConf.name}, proxy = ${proxyConf.name}, system = ${systemConf.name}, systemAuth = ${systemAuthConf.name}, namespace = ${namespaceConf.name}, enable = ${enableConf.name}`,
            () => {
                if (systemConf.value && systemConf.value.host === remotehost
                    && !(systemAuthConf.value && systemAuthConf.value.passphrase)
                ) {
                    return;
                }

                const traceNamePrefix = namespaceConf.value || 'f5telemetry_default';
                const uriPrefix = `${namespaceConf.value ? `/namespace/${namespaceConf.value}` : ''}${ihURI}`;
                let expectedNumberOrActivePOllers;
                let expectedNAPNs;
                let mainDeclaration;

                function getDeclaration(enable = undefined) {
                    return helpers.getDeclaration({
                        downloadFolder,
                        enable: typeof enable === 'undefined' ? enableConf.value : enable,
                        intervalConf,
                        proxyConf,
                        systemAuthConf,
                        systemConf,
                        trace: false
                    });
                }

                function getTestSystem() {
                    const root = namespaceConf.value ? mainDeclaration.namespace : mainDeclaration;
                    return {
                        system: root.enabledSystem,
                        ihealthPoller: root.enabledPoller
                    };
                }

                beforeEach(async () => {
                    mainDeclaration = {
                        controls: dummies.declaration.controls.full.decrypted({ debug: true }),
                        namespace: dummies.declaration.namespace.base.decrypted()
                    };

                    [mainDeclaration, mainDeclaration.namespace].forEach((ns, idx) => {
                        ns.consumer = dummies.declaration.consumer.default.decrypted({});

                        const disabledPair = getDeclaration();
                        disabledPair.ihealthPoller.enable = false;
                        disabledPair.system.enable = false;
                        ns.disabledSystem = disabledPair.system;
                        ns.disabledPoller = disabledPair.ihealthPoller;
                        ns.disabledSystem.iHealthPoller = 'disabledPoller';

                        const enabledPair = getDeclaration();
                        enabledPair.ihealthPoller.enable = true;
                        enabledPair.system.enable = true;
                        ns.enabledSystem = enabledPair.system;
                        ns.enabledPoller = enabledPair.ihealthPoller;
                        ns.enabledSystem.iHealthPoller = 'enabledPoller';

                        const uniqueNameDisabledPair = getDeclaration();
                        uniqueNameDisabledPair.ihealthPoller.enable = false;
                        uniqueNameDisabledPair.system.enable = false;
                        ns[`disabledSystem${idx + 1}`] = uniqueNameDisabledPair.system;
                        ns[`disabledPoller${idx + 1}`] = uniqueNameDisabledPair.ihealthPoller;
                        ns[`disabledSystem${idx + 1}`].iHealthPoller = `disabledPoller${idx + 1}`;

                        const uniqueNameEnabledPair = getDeclaration();
                        uniqueNameEnabledPair.ihealthPoller.enable = true;
                        uniqueNameEnabledPair.system.enable = true;
                        ns[`enabledSystem${idx + 1}`] = uniqueNameEnabledPair.system;
                        ns[`enabledPoller${idx + 1}`] = uniqueNameEnabledPair.ihealthPoller;
                        ns[`enabledSystem${idx + 1}`].iHealthPoller = `enabledPoller${idx + 1}`;
                    });

                    expectedNumberOrActivePOllers = {
                        total: 4,
                        default: 2,
                        namespace: 2
                    };

                    expectedNAPNs = namespaceConf.value
                        ? expectedNumberOrActivePOllers.namespace
                        : expectedNumberOrActivePOllers.default;

                    expectedNumberOrActivePOllers.total = expectedNumberOrActivePOllers.default
                        + expectedNumberOrActivePOllers.namespace;

                    await processDeclaration(mainDeclaration);
                    assert.isAbove(expectedNAPNs, 0);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                    assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active pollers');
                });

                describe('GET /ihealthpoller/:system', () => {
                    it('should be able to get current state within provided namespace (no DEMO pollers)', async () => {
                        let restOp = await sendRequest({ method: 'GET', path: uriPrefix });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                        assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs);
                        assert.lengthOf(restOp.body.states, expectedNAPNs);

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}?all=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);

                        if (namespaceConf.value) {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs);
                            assert.lengthOf(restOp.body.states, expectedNAPNs);
                        } else {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOrActivePOllers.total);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                expectedNumberOrActivePOllers.total);
                            assert.lengthOf(restOp.body.states, expectedNumberOrActivePOllers.total);
                        }

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}?demo=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                        assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs);
                        assert.lengthOf(restOp.body.states, 0);

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}?demo=true&all=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        assert.lengthOf(restOp.body.states, 0);

                        if (namespaceConf.value) {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs);
                        } else {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOrActivePOllers.total);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                expectedNumberOrActivePOllers.total);
                        }

                        // enabledSystem and disabledSystem is in use by 2 namespaces
                        // so for the defualt ?all=true returns all instances

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/enabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                        assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 1);
                        assert.lengthOf(restOp.body.states, 1);

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/enabledSystem?demo=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                        assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 1);
                        assert.lengthOf(restOp.body.states, 0);

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/enabledSystem?demo=true&all=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        assert.lengthOf(restOp.body.states, 0);
                        if (namespaceConf.value) {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 1);
                        } else {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 2);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 2);
                        }

                        restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/enabledSystem?all=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                        if (namespaceConf.value) {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 1);
                            assert.lengthOf(restOp.body.states, 1);
                        } else {
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 2);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 2);
                            assert.lengthOf(restOp.body.states, 2);
                        }

                        const systemNames = [
                            'disabledSystem',
                            `disabledSystem${namespaceConf.value ? 2 : 1}`
                        ];
                        const queryParams = [
                            '',
                            'demo=true',
                            'all=true'
                        ];

                        for (const [systemName, firstParam, secondParam] of testUtil.product(
                            systemNames,
                            queryParams,
                            queryParams
                        )) {
                            if (firstParam === secondParam && firstParam) {
                                // skip dups;
                                continue;
                            }
                            const params = [firstParam, secondParam].filter((p) => p).join('&');

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${systemName}?${params}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 0);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 0);
                            assert.lengthOf(restOp.body.states, 0);
                        }

                        for (const [firstParam, secondParam] of testUtil.product(
                            queryParams,
                            queryParams
                        )) {
                            if (firstParam === secondParam && firstParam) {
                                // skip dups;
                                continue;
                            }
                            const params = [firstParam, secondParam].filter((p) => p).join('&');

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/enabledSystem${namespaceConf.value ? 2 : 1}?${params}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 0);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 1);
                            assert.lengthOf(restOp.body.states, params.includes('demo') ? 0 : 1);
                        }

                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have no DEMO pollers');
                        assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active pollers');
                    });

                    it('should return 404 when unable to find object by name', async () => {
                        let restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/nonExistingPoller` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                            error: `Bad URL: /mgmt/shared/telemetry${uriPrefix}/nonExistingPoller`,
                            message: 'Not Found'
                        });

                        restOp = await sendRequest({ method: 'GET', path: `/namespace/nonExistingNamespace/${ihURI}/nonExistingPoller` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                            error: `Bad URL: /mgmt/shared/telemetry/namespace/nonExistingNamespace/${ihURI}/nonExistingPoller`,
                            message: 'Not Found'
                        });
                    });
                });

                describe('POST /ihealthpoller', () => {
                    it('should not allow send POST without a system name', async () => {
                        const restOp = await sendRequest({ method: 'POST', path: uriPrefix });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.METHOD_NOT_ALLOWED);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.METHOD_NOT_ALLOWED,
                            error: 'Allowed methods: DELETE, GET',
                            message: 'Method Not Allowed'
                        });
                    });
                });

                describe('POST /ihealthpoller/:system', () => {
                    it('should return 404 when unable to find object by name', async () => {
                        const restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/nonExistingPoller` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                            error: `Bad URL: /mgmt/shared/telemetry${uriPrefix}/nonExistingPoller`,
                            message: 'Not Found'
                        });
                    });

                    it('should be able to start DEMO pollers', async () => {
                        const pollers = [
                            'enabledSystem',
                            'disabledSystem',
                            `enabledSystem${namespaceConf.value ? 2 : 1}`,
                            `disabledSystem${namespaceConf.value ? 2 : 1}`
                        ];

                        for (let i = 1; i <= pollers.length; i += 1) {
                            const pollerName = pollers[i - 1];

                            let restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.CREATED,
                                message: `DEMO poller "${traceNamePrefix}::${pollerName}::${pollerName.replace('System', 'Poller')}" created.`
                            });

                            assert.deepStrictEqual(service.numberOfDemoPollers, i, `should have ${i} DEMO poller(s)`);
                            assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active pollers');

                            restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.OK,
                                message: `DEMO poller "${traceNamePrefix}::${pollerName}::${pollerName.replace('System', 'Poller')}" exists already. Wait for results or delete it.`
                            });

                            assert.deepStrictEqual(service.numberOfDemoPollers, i, `should have ${i} DEMO poller(s)`);
                            assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active pollers');
                        }

                        for (let i = 1; i <= pollers.length; i += 1) {
                            const pollerName = pollers[i - 1];

                            let restOp = await sendRequest({ method: 'GET', path: `${ihURI}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 4);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOrActivePOllers.total);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                expectedNumberOrActivePOllers.total + 4);
                            assert.lengthOf(restOp.body.states, expectedNumberOrActivePOllers.total + 4);

                            restOp = await sendRequest({ method: 'GET', path: uriPrefix });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 4);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs + 4);
                            assert.lengthOf(restOp.body.states, expectedNAPNs + 4);

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 4);

                            if (namespaceConf.value) {
                                assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs + 4);
                                assert.lengthOf(restOp.body.states, expectedNAPNs + 4);
                            } else {
                                assert.deepStrictEqual(restOp.body.numberOfPollers,
                                    expectedNumberOrActivePOllers.total);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                    expectedNumberOrActivePOllers.total + 4);
                                assert.lengthOf(restOp.body.states, expectedNumberOrActivePOllers.total + 4);
                            }

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}?demo=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 4);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs + 4);
                            assert.lengthOf(restOp.body.states, 4);

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}?demo=true&all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 4);
                            assert.lengthOf(restOp.body.states, 4);

                            if (namespaceConf.value) {
                                assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNAPNs);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNAPNs + 4);
                            } else {
                                assert.deepStrictEqual(restOp.body.numberOfPollers,
                                    expectedNumberOrActivePOllers.total);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                    expectedNumberOrActivePOllers.total + 4);
                            }

                            const expectedNumberOfPollers = (pollerName.startsWith('disabled') ? 0 : 1);

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOfPollers);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNumberOfPollers + 1);
                            assert.lengthOf(restOp.body.states, expectedNumberOfPollers + 1);

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${pollerName}?demo=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOfPollers);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNumberOfPollers + 1);
                            assert.lengthOf(restOp.body.states, 1);

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${pollerName}?demo=true&all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            assert.lengthOf(restOp.body.states, 1);
                            if (namespaceConf.value) {
                                assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOfPollers);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNumberOfPollers + 1);
                            } else {
                                const factor = ['enabledSystem', 'disabledSystem'].includes(pollerName) ? 2 : 1;
                                assert.deepStrictEqual(restOp.body.numberOfPollers, factor * expectedNumberOfPollers);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                    factor * expectedNumberOfPollers + 1);
                            }

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${pollerName}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            if (namespaceConf.value) {
                                assert.deepStrictEqual(restOp.body.numberOfPollers, expectedNumberOfPollers);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal, expectedNumberOfPollers + 1);
                                assert.lengthOf(restOp.body.states, expectedNumberOfPollers + 1);
                            } else {
                                const factor = ['enabledSystem', 'disabledSystem'].includes(pollerName) ? 2 : 1;
                                assert.deepStrictEqual(restOp.body.numberOfPollers, factor * expectedNumberOfPollers);
                                assert.deepStrictEqual(restOp.body.numberOfPollersTotal,
                                    factor * expectedNumberOfPollers + 1);
                                assert.lengthOf(restOp.body.states, factor * expectedNumberOfPollers + 1);
                            }
                        }
                    });

                    if (namespaceConf.value) {
                        it('should start DEMO poller with shared name', async () => {
                            const pollerName = 'enabledSystem';

                            let restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');
                            assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active pollers');

                            restOp = await sendRequest({ method: 'POST', path: `${ihURI}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(service.numberOfDemoPollers, 2, 'should have 2 DEMO poller(s)');
                            assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active pollers');

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 2);
                            assert.lengthOf(restOp.body.states, 2);

                            restOp = await sendRequest({ method: 'GET', path: `${ihURI}/${pollerName}` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 2);
                            assert.lengthOf(restOp.body.states, 2);

                            restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/${pollerName}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 1);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 2);
                            assert.lengthOf(restOp.body.states, 2);

                            restOp = await sendRequest({ method: 'GET', path: `${ihURI}/${pollerName}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body.code, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.body.numberOfDemoPollers, 2);
                            assert.deepStrictEqual(restOp.body.numberOfPollers, 2);
                            assert.deepStrictEqual(restOp.body.numberOfPollersTotal, 4);
                            assert.lengthOf(restOp.body.states, 4);
                        });
                    }
                });

                describe('DELETE /ihealthpoller', () => {
                    it('should remove orphaned DEMO pollers', async () => {
                        let restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');
                        assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total, 'should have active poller(s)');

                        delete (namespaceConf.value ? mainDeclaration.namespace : mainDeclaration).enabledSystem;
                        await processDeclaration(mainDeclaration);

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                `"${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                            );
                            assert.notIncludeMatch(
                                coreStub.logger.messages.debug,
                                `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(service.numberOfPollers, expectedNumberOrActivePOllers.total - 1, 'should have active poller(s)');
                        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'DELETE', path: `${uriPrefix}/enabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'DELETE', path: `${uriPrefix}` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [],
                            numberOfDeletedDemoPollers: 0
                        });

                        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'DELETE', path: `${ihURI}?all=true` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [
                                `DEMO_${traceNamePrefix}::enabledSystem::enabledPoller`
                            ],
                            numberOfDeletedDemoPollers: 1
                        });

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have 0 DEMO poller(s)');
                    });

                    it('should remove all DEMO pollers within namespace', async () => {
                        let restOp = await sendRequest({ method: 'DELETE', path: uriPrefix });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [],
                            numberOfDeletedDemoPollers: 0
                        });

                        restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                        restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/disabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                        assert.deepStrictEqual(service.numberOfDemoPollers, 2, 'should have 2 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'DELETE', path: uriPrefix });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [
                                `DEMO_${traceNamePrefix}::enabledSystem::enabledPoller`,
                                `DEMO_${traceNamePrefix}::disabledSystem::disabledPoller`
                            ],
                            numberOfDeletedDemoPollers: 2
                        });

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                            );
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                `"DEMO_${traceNamePrefix}::disabledSystem::disabledPoller" destroyed`
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have 0 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'DELETE', path: uriPrefix });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [],
                            numberOfDeletedDemoPollers: 0
                        });
                    });

                    if (namespaceConf.value) {
                        it('should remove all DEMO pollers', async () => {
                            let restOp = await sendRequest({ method: 'DELETE', path: `${ihURI}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.OK,
                                deletedDemoPollers: [],
                                numberOfDeletedDemoPollers: 0
                            });

                            restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/disabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            restOp = await sendRequest({ method: 'POST', path: `${ihURI}/enabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            restOp = await sendRequest({ method: 'POST', path: `${ihURI}/disabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            assert.deepStrictEqual(service.numberOfDemoPollers, 4, 'should have 4 DEMO poller(s)');

                            restOp = await sendRequest({ method: 'DELETE', path: ihURI });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.OK,
                                deletedDemoPollers: [
                                    'DEMO_f5telemetry_default::enabledSystem::enabledPoller',
                                    'DEMO_f5telemetry_default::disabledSystem::disabledPoller'
                                ],
                                numberOfDeletedDemoPollers: 2
                            });

                            await testUtil.waitTill(() => {
                                assert.includeMatch(
                                    coreStub.logger.messages.debug,
                                    '"DEMO_f5telemetry_default::enabledSystem::enabledPoller" destroyed'
                                );
                                assert.includeMatch(
                                    coreStub.logger.messages.debug,
                                    '"DEMO_f5telemetry_default::disabledSystem::disabledPoller" destroyed'
                                );
                                return true;
                            }, true);

                            assert.deepStrictEqual(service.numberOfDemoPollers, 2, 'should have 2 DEMO poller(s)');

                            restOp = await sendRequest({ method: 'DELETE', path: `${ihURI}?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.OK,
                                deletedDemoPollers: [
                                    `DEMO_${traceNamePrefix}::enabledSystem::enabledPoller`,
                                    `DEMO_${traceNamePrefix}::disabledSystem::disabledPoller`
                                ],
                                numberOfDeletedDemoPollers: 2
                            });

                            await testUtil.waitTill(() => {
                                assert.includeMatch(
                                    coreStub.logger.messages.debug,
                                    `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                                );
                                assert.includeMatch(
                                    coreStub.logger.messages.debug,
                                    `"DEMO_${traceNamePrefix}::disabledSystem::disabledPoller" destroyed`
                                );
                                return true;
                            }, true);

                            assert.deepStrictEqual(service.numberOfDemoPollers, 0, 'should have 0 DEMO poller(s)');
                        });
                    }
                });

                describe('DELETE /ihealthpoller/:system', () => {
                    it('should return 404 when unable to find object by name', async () => {
                        const restOp = await sendRequest({ method: 'DELETE', path: `${uriPrefix}/nonExistingPoller` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                            error: `Bad URL: /mgmt/shared/telemetry${uriPrefix}/nonExistingPoller`,
                            message: 'Not Found'
                        });
                    });

                    it('should remove DEMO poller by system name within namespace', async () => {
                        let restOp = await sendRequest({ method: 'DELETE', path: uriPrefix });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [],
                            numberOfDeletedDemoPollers: 0
                        });

                        restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/disabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(service.numberOfDemoPollers, 2, 'should have 2 DEMO poller(s)');

                        restOp = await sendRequest({ method: 'DELETE', path: `${uriPrefix}/disabledSystem` });
                        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                        assert.deepStrictEqual(restOp.body, {
                            code: restAPIUtils.HTTP_CODES.OK,
                            deletedDemoPollers: [
                                `DEMO_${traceNamePrefix}::disabledSystem::disabledPoller`
                            ],
                            numberOfDeletedDemoPollers: 1
                        });

                        await testUtil.waitTill(() => {
                            assert.notIncludeMatch(
                                coreStub.logger.messages.debug,
                                `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                            );
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                `"DEMO_${traceNamePrefix}::disabledSystem::disabledPoller" destroyed`
                            );
                            return true;
                        }, true);

                        assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');
                    });

                    if (namespaceConf.value) {
                        it('should remove DEMO poller by system name within namespace', async () => {
                            let restOp = await sendRequest({ method: 'DELETE', path: uriPrefix });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.OK,
                                deletedDemoPollers: [],
                                numberOfDeletedDemoPollers: 0
                            });

                            restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/disabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            restOp = await sendRequest({ method: 'POST', path: `${ihURI}/enabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            restOp = await sendRequest({ method: 'POST', path: `${ihURI}/disabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

                            assert.deepStrictEqual(service.numberOfDemoPollers, 4, 'should have 4 DEMO poller(s)');

                            restOp = await sendRequest({ method: 'DELETE', path: `${ihURI}/disabledSystem?all=true` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                            assert.deepStrictEqual(restOp.body, {
                                code: restAPIUtils.HTTP_CODES.OK,
                                deletedDemoPollers: [
                                    `DEMO_${traceNamePrefix}::disabledSystem::disabledPoller`,
                                    'DEMO_f5telemetry_default::disabledSystem::disabledPoller'
                                ],
                                numberOfDeletedDemoPollers: 2
                            });

                            await testUtil.waitTill(() => {
                                assert.includeMatch(
                                    coreStub.logger.messages.debug,
                                    `"DEMO_${traceNamePrefix}::disabledSystem::disabledPoller" destroyed`
                                );
                                assert.includeMatch(
                                    coreStub.logger.messages.debug,
                                    '"DEMO_f5telemetry_default::disabledSystem::disabledPoller" destroyed'
                                );
                                return true;
                            }, true);

                            assert.deepStrictEqual(service.numberOfDemoPollers, 2, 'should have 2 DEMO poller(s)');
                        });
                    }
                });

                it('should fail task when unable to decrypt config', async () => {
                    coreStub.logger.removeAllMessages();

                    coreStub.deviceUtil.decrypt.rejects(new Error('expected decrypt error'));

                    declaration = getTestSystem();
                    createPollerMock(declaration);

                    await testUtil.waitTill(
                        () => Object.values(coreStub.storage.restWorker.savedData.ihealth).length >= 1,
                        true
                    );

                    const storageKeys = Object.keys(coreStub.storage.restWorker.savedData.ihealth);

                    const restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                    assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                    await testUtil.waitTill(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.error,
                            /DEMO.*iHealth Poller cycle failed due task error[\s\S]*expected decrypt error/gm
                        );
                        return true;
                    }, true);

                    assert.deepStrictEqual(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        storageKeys,
                        'should not write DEMO data to the storage'
                    );
                });

                it('should ignore config updates', async () => {
                    coreStub.logger.removeAllMessages();

                    const restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                    assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                    assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                    declaration = getTestSystem();
                    declaration.ihealthPoller.username = 'test_user_blabla';

                    await processDeclaration(mainDeclaration);

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*::enabledSystem::enabledPoller.*Reason - configuration updated/
                    );

                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                    );

                    assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                    coreStub.logger.removeAllMessages();
                    await processDeclaration(mainDeclaration);

                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /IHealthService.*Removing iHealth Poller.*::enabledSystem::enabledPoller.*Reason - configuration updated/
                    );

                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        `"DEMO_${traceNamePrefix}::enabledSystem::enabledPoller" destroyed`
                    );

                    assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');
                });

                it('should start and finish polling cycle once', async () => {
                    coreStub.logger.removeAllMessages();

                    declaration = getTestSystem();
                    createPollerMock(declaration);

                    await testUtil.waitTill(
                        () => Object.values(coreStub.storage.restWorker.savedData.ihealth).length >= 1,
                        true
                    );

                    const storageKeys = Object.keys(coreStub.storage.restWorker.savedData.ihealth);

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    let requestDone = false;
                    let restOp;
                    await Promise.all([
                        (async () => {
                            restOp = await sendRequest({ method: 'POST', path: `${uriPrefix}/enabledSystem` });
                            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.CREATED);
                            requestDone = true;
                        })(),
                        forwardClock(getTimeStep(), () => requestDone)
                    ]);

                    assert.deepStrictEqual(service.numberOfDemoPollers, 1, 'should have 1 DEMO poller(s)');

                    requestDone = false;
                    await Promise.all([
                        (async () => {
                            while (!requestDone) {
                                await testUtil.sleep(120 * 1000);
                                restOp = await sendRequest({ method: 'GET', path: `${uriPrefix}/enabledSystem?demo=true` });
                                assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
                                requestDone = restOp.body.states[0].terminated;
                            }
                            assert.deepStrictEqual(restOp.body.states[0].state.state.lastKnownState, 'DONE');
                        })(),
                        forwardClock(getTimeStep(), () => requestDone)
                    ]);

                    assert.deepStrictEqual(
                        Object.keys(coreStub.storage.restWorker.savedData.ihealth),
                        storageKeys,
                        'should not write DEMO data to the storage'
                    );
                });
            }));
    });
});
